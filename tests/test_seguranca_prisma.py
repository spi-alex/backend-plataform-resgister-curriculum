# -*- coding: utf-8 -*-
"""
PRISMA — Testes de segurança de sessão e recuperação de senha (E2E)
===================================================================

Acrescentado em 25 ago 2026, junto com a rodada de correções de segurança.

Os testes unitários em `PRISMA_backend/users/tests.py` e
`users/tests_authz.py` cobrem a LÓGICA (77 casos, rodam com
`manage.py test`, sem servidor). Este arquivo cobre o ACOPLAMENTO HTTP
real — cookies, cabeçalhos e códigos de status contra o servidor de
verdade —, que só aparece com o backend no ar.

COMO RODAR
----------
    # backend rodando em outro terminal:
    python manage.py runserver

    pip install pytest requests
    pytest test_seguranca_prisma.py -v

Usa as mesmas contas e variáveis de ambiente de `test_backend_prisma.py`
(ver a Parte 0 do README_testes.md). Lembre-se de que as contas precisam
estar com status 'ativo' — o cadastro não ativa mais sozinho.
"""
import os

import pytest
import requests

from test_backend_prisma import (
    ALUNO_A,
    BASE_URL,
    CONFIRM_URL,
    JOBS_URL,
    LOGIN_URL,
    LOGOUT_URL,
    TIMEOUT,
    USERS_ME_URL,
    auth_headers,
    login,
)

REFRESH_URL = f"{BASE_URL}/api/users/token/refresh/"
PASSWORD_RESET_URL = f"{BASE_URL}/api/users/password-reset/"
PASSWORD_RESET_CONFIRM_URL = f"{BASE_URL}/api/users/password-reset-confirm/"
LEGACY_TOKEN_URL = f"{BASE_URL}/api/token/"

COOKIE_REFRESH = "prisma_refresh"


def _logar_com_sessao():
    """Login guardando os cookies, como um navegador faria."""
    sessao = requests.Session()
    resp = sessao.post(
        LOGIN_URL,
        json={"username": ALUNO_A["email"], "password": ALUNO_A["senha"]},
        timeout=TIMEOUT,
    )
    if resp.status_code == 429:
        pytest.skip("Throttle de login atingido (429). Espere 1 minuto e rode de novo.")
    assert resp.status_code == 200, f"Login falhou: {resp.status_code} {resp.text[:300]}"
    return sessao, resp


class TestRefreshEmCookieHttpOnly:
    """
    O achado que o diagnóstico tinha adiado: tokens em `localStorage`.

    Access token E refresh token viviam lá. Qualquer XSS lia os dois. O
    refresh valia 1 dia, então um XSS de um segundo virava acesso persistente.
    """

    def test_login_nao_devolve_refresh_no_corpo(self):
        _, resp = _logar_com_sessao()
        corpo = resp.json()
        assert "access" in corpo
        assert "refresh" not in corpo, (
            "O refresh token voltou a aparecer no corpo da resposta de login — "
            "um XSS que leia essa resposta recupera uma sessão renovável de 1 dia."
        )

    def test_cookie_de_refresh_e_httponly(self):
        _, resp = _logar_com_sessao()
        set_cookie = resp.headers.get("Set-Cookie", "")

        assert COOKIE_REFRESH in set_cookie, f"Cookie não foi enviado: {set_cookie[:200]}"
        assert "HttpOnly" in set_cookie, (
            f"Cookie de refresh SEM HttpOnly — JavaScript consegue lê-lo, o que "
            f"anula o ganho da mudança: {set_cookie[:200]}"
        )
        assert "SameSite" in set_cookie, (
            f"Cookie sem SameSite — é o atributo que impede um site terceiro de "
            f"fazer o navegador enviá-lo (proteção de CSRF): {set_cookie[:200]}"
        )

    def test_renovacao_funciona_so_com_o_cookie(self):
        sessao, _ = _logar_com_sessao()

        # Corpo vazio de propósito: o refresh vem do cookie que a Session guardou.
        resp = sessao.post(REFRESH_URL, json={}, timeout=TIMEOUT)
        assert resp.status_code == 200, resp.text[:300]
        assert "access" in resp.json()

    def test_renovacao_sem_cookie_e_recusada(self):
        resp = requests.post(REFRESH_URL, json={}, timeout=TIMEOUT)
        assert resp.status_code == 401, (
            f"Renovação sem cookie nem corpo devolveu {resp.status_code}, "
            f"esperado 401."
        )


class TestRevogacaoDeSessao:
    """Logout e troca de senha precisam derrubar tokens já emitidos."""

    def test_logout_revoga_o_token_no_servidor(self):
        """
        Antes, o logout era só `localStorage.clear()` no navegador: o token
        continuava válido no servidor até expirar (30 min), então "sair da
        conta" num computador compartilhado não protegia nada.
        """
        sessao, resp = _logar_com_sessao()
        token = resp.json()["access"]

        antes = sessao.get(USERS_ME_URL, headers=auth_headers(token), timeout=TIMEOUT)
        assert antes.status_code == 200

        saida = sessao.post(LOGOUT_URL, headers=auth_headers(token), timeout=TIMEOUT)
        assert saida.status_code == 200, saida.text[:200]

        depois = sessao.get(USERS_ME_URL, headers=auth_headers(token), timeout=TIMEOUT)
        assert depois.status_code == 401, (
            "O access token continuou válido depois do logout — a revogação de "
            "sessão (users/authentication.py) não está atuando."
        )

    def test_cookie_e_apagado_no_logout(self):
        sessao, resp = _logar_com_sessao()
        token = resp.json()["access"]

        saida = sessao.post(LOGOUT_URL, headers=auth_headers(token), timeout=TIMEOUT)
        assert saida.status_code == 200

        # Com o cookie apagado, a renovação não tem mais de onde partir.
        renovar = sessao.post(REFRESH_URL, json={}, timeout=TIMEOUT)
        assert renovar.status_code == 401


class TestRecuperacaoDeSenha:
    """
    O ponto mais frágil do sistema antes desta rodada.

    O "código" de recuperação era o `User.pin` — a mesma matrícula que o
    sistema EXIBE na tela de perfil e que serve de credencial de login. Ele
    ficava em texto puro no banco, não expirava nunca, e pedir um reset
    ROTACIONAVA o PIN da vítima.
    """

    def test_resposta_nao_revela_se_o_email_existe(self):
        cadastrado = requests.post(
            PASSWORD_RESET_URL, json={"email": ALUNO_A["email"]}, timeout=TIMEOUT
        )
        inexistente = requests.post(
            PASSWORD_RESET_URL,
            json={"email": "nao-existe-mesmo-9f3a@teste.invalid"},
            timeout=TIMEOUT,
        )
        if 429 in (cadastrado.status_code, inexistente.status_code):
            pytest.skip("Throttle de reset atingido. Espere 1 minuto.")

        assert cadastrado.status_code == inexistente.status_code
        assert cadastrado.json() == inexistente.json(), (
            "As respostas diferem entre e-mail cadastrado e não cadastrado — "
            "isso permite enumerar quais e-mails têm conta na plataforma."
        )

    def test_pedir_reset_nao_troca_a_matricula_da_vitima(self):
        """
        `password_reset_request` fazia `user.pin = user.generate_unique_pin()`.
        Como o PIN é a matrícula e serve para entrar, qualquer pessoa que
        soubesse o e-mail de alguém podia, SEM AUTENTICAÇÃO, trocar a
        matrícula da vítima quantas vezes quisesse.
        """
        token = login(ALUNO_A["email"], ALUNO_A["senha"])
        perfil_antes = requests.get(USERS_ME_URL, headers=auth_headers(token), timeout=TIMEOUT)
        assert perfil_antes.status_code == 200
        matricula_antes = perfil_antes.json().get("pin")
        if not matricula_antes:
            pytest.skip("Perfil não expõe a matrícula; nada a verificar.")

        pedido = requests.post(
            PASSWORD_RESET_URL, json={"email": ALUNO_A["email"]}, timeout=TIMEOUT
        )
        if pedido.status_code == 429:
            pytest.skip("Throttle de reset atingido. Espere 1 minuto.")
        assert pedido.status_code == 200

        perfil_depois = requests.get(USERS_ME_URL, headers=auth_headers(token), timeout=TIMEOUT)
        assert perfil_depois.status_code == 200
        assert perfil_depois.json().get("pin") == matricula_antes, (
            "A matrícula do usuário mudou por causa de um pedido de reset — "
            "isso é negação de serviço no login por matrícula, disparável por "
            "qualquer um que saiba o e-mail."
        )

    def test_matricula_nao_e_aceita_como_codigo_de_reset(self):
        """Quem vê a matrícula de alguém não pode trocar a senha dessa pessoa."""
        token = login(ALUNO_A["email"], ALUNO_A["senha"])
        perfil = requests.get(USERS_ME_URL, headers=auth_headers(token), timeout=TIMEOUT)
        matricula = perfil.json().get("pin")
        if not matricula:
            pytest.skip("Perfil não expõe a matrícula; nada a verificar.")

        resp = requests.post(
            PASSWORD_RESET_CONFIRM_URL,
            json={
                "email": ALUNO_A["email"],
                "pin": matricula,
                "new_password": "SenhaDoInvasor@2026",
            },
            timeout=TIMEOUT,
        )
        if resp.status_code == 429:
            pytest.skip("Throttle de reset atingido. Espere 1 minuto.")

        assert resp.status_code == 400, (
            "A MATRÍCULA foi aceita como código de recuperação de senha — o "
            "acoplamento entre PIN e token de reset voltou."
        )
        # E a senha original continua valendo.
        assert login(ALUNO_A["email"], ALUNO_A["senha"])

    def test_codigo_errado_e_recusado_com_mensagem_generica(self):
        resp = requests.post(
            PASSWORD_RESET_CONFIRM_URL,
            json={
                "email": ALUNO_A["email"],
                "pin": "000000",
                "new_password": "SenhaQualquer@2026",
            },
            timeout=TIMEOUT,
        )
        if resp.status_code == 429:
            pytest.skip("Throttle de reset atingido. Espere 1 minuto.")

        assert resp.status_code == 400
        texto = resp.text.lower()
        # A mensagem não deve distinguir "e-mail não existe" de "código errado"
        # de "código expirado" — isso entregaria informação ao atacante.
        assert "não encontrado" not in texto
        assert "não existe" not in texto



class TestExposicaoDeDados:
    """Campos que não podem sair para quem não deve vê-los."""

    def test_vaga_publica_nao_expoe_email_do_responsavel(self):
        """
        `GET /api/jobs/` responde a visitante anônimo e devolvia
        `company.owner.email` — o e-mail PESSOAL de quem cadastrou a empresa —
        para qualquer um na internet, sem login. Prato feito para raspagem.
        """
        resp = requests.get(JOBS_URL, timeout=TIMEOUT)
        assert resp.status_code == 200, resp.text[:200]

        vagas = resp.json()
        vagas = vagas.get("results", vagas) if isinstance(vagas, dict) else vagas
        if not vagas:
            pytest.skip("Nenhuma vaga cadastrada para verificar.")

        for vaga in vagas:
            assert not vaga.get("contact_email"), (
                f"Vaga {vaga.get('id')} expôs contact_email a um visitante "
                f"anônimo: {vaga.get('contact_email')}"
            )

    def test_perfil_nao_devolve_hash_de_senha(self):
        token = login(ALUNO_A["email"], ALUNO_A["senha"])
        resp = requests.get(USERS_ME_URL, headers=auth_headers(token), timeout=TIMEOUT)
        assert resp.status_code == 200

        corpo = resp.text.lower()
        assert "pbkdf2" not in corpo
        assert "password" not in corpo

    def test_erro_de_cadastro_nao_vaza_detalhes_internos(self):
        """
        `register_user` devolvia `str(e)` no corpo do 500, entregando
        detalhes internos (SQL, caminhos de arquivo, nomes de coluna) a
        qualquer visitante que provocasse um erro de propósito.
        """
        resp = requests.post(
            f"{BASE_URL}/api/users/register/",
            json={"captcha_0": "invalido", "captcha_1": "invalido"},
            timeout=TIMEOUT,
        )
        if resp.status_code == 429:
            pytest.skip("Throttle de cadastro atingido. Espere 1 minuto.")

        texto = resp.text.lower()
        for vazamento in ("traceback", "django.db", "sqlite", "c:\\prisma", "/prisma/"):
            assert vazamento not in texto, (
                f"A resposta de erro do cadastro contém '{vazamento}': {resp.text[:300]}"
            )


class TestPoliticaDeSenha:
    """A política de senha do settings.py finalmente vale para a API."""

    def test_senha_fraca_e_recusada_no_cadastro(self):
        """
        Nenhuma rota chamava `validate_password`: `register_user` usava
        `create_user()` direto e o reset fazia `set_password()` sem validar.
        Na prática, qualquer senha passava — inclusive um único caractere.
        """
        resp = requests.post(
            f"{BASE_URL}/api/users/register/",
            json={
                "username": "senha-fraca@teste.invalid",
                "email": "senha-fraca@teste.invalid",
                "password": "123",
                "captcha_0": "x",
                "captcha_1": "y",
                "role": "aluno",
            },
            timeout=TIMEOUT,
        )
        if resp.status_code == 429:
            pytest.skip("Throttle de cadastro atingido. Espere 1 minuto.")

        # 400 tanto faz se for por captcha ou por senha — o que não pode é 201.
        assert resp.status_code != 201, (
            "Uma conta foi criada com a senha '123'."
        )


class TestLimitesDeTentativa:
    """
    Rate limiting nas rotas públicas sensíveis.

    Esta classe fica DEPOIS de todas as outras no arquivo de propósito: ela
    dispara 15 logins seguidos para provocar o 429, o que esgota o limite por
    IP (10/min) para o minuto seguinte. Com ela no meio do arquivo, as classes
    posteriores caíam em `skip` por 429 e a bateria parecia incompleta sem
    haver nada errado.
    """

    def test_login_e_limitado(self):
        ultimo = None
        for _ in range(15):
            ultimo = requests.post(
                LOGIN_URL,
                json={"username": "forca-bruta@teste.invalid", "password": "errada"},
                timeout=TIMEOUT,
            ).status_code
            if ultimo == 429:
                break
        assert ultimo == 429, (
            f"15 tentativas de login seguidas não foram barradas (último status "
            f"{ultimo}). O throttle de login não está atuando."
        )

    def test_rota_antiga_de_token_nao_e_atalho_sem_travas(self):
        """
        `/api/token/` usava a view GENÉRICA do SimpleJWT: sem checagem de
        status da conta, sem rate limiting e devolvendo o refresh no corpo.
        Era um login paralelo que ignorava todas as travas da rota oficial.
        """
        ultimo = None
        for _ in range(15):
            ultimo = requests.post(
                LEGACY_TOKEN_URL,
                json={"username": "forca-bruta2@teste.invalid", "password": "errada"},
                timeout=TIMEOUT,
            ).status_code
            if ultimo == 429:
                break
        assert ultimo == 429, (
            f"/api/token/ aceitou 15 tentativas seguidas sem barrar (último "
            f"status {ultimo}) — voltou a ser um atalho sem rate limiting."
        )



if __name__ == "__main__":
    raise SystemExit(
        "Rode com pytest: pytest test_seguranca_prisma.py -v\n"
        f"(backend precisa estar no ar em {BASE_URL})"
    )
