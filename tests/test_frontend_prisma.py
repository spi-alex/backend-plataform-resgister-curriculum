# -*- coding: utf-8 -*-
"""
PRISMA — Testes Automatizados de Frontend (navegador, via Playwright)
=======================================================================

Cobre os casos do guia que são especificamente visuais/de UI — coisas
que só dá pra confirmar olhando a tela renderizada, não só a resposta
da API (para esses, veja test_backend_prisma.py).

CASOS COBERTOS:
    TC-12  Login sem campos duplicados
    TC-13  Criar 1º currículo gera PDF + alerta correto
    TC-14  Editar currículo existente (alerta diferente, sem duplicar)
    TC-15  Botão de candidatura muda para "Candidatura enviada"
    TC-18  Logout limpa a sessão de verdade (botão Voltar não recupera acesso)
    TC-19  Cabeçalho mostra o nome real do aluno
    TC-20  Lista de "Minhas Candidaturas" aparece com título/data/status
    TC-22  Estado vazio de "Minhas Candidaturas" sem tela quebrada

--------------------------------------------------------------------
COMO USAR
--------------------------------------------------------------------
1) Suba o backend E o frontend antes de rodar:
       backend:  python manage.py runserver     (http://127.0.0.1:8000)
       frontend: npm run dev                     (http://localhost:5173)

2) Rode a Parte 0 do guia manualmente (contas de Aluno A, Aluno B e
   Empresa X já cadastradas com os valores sugeridos na tabela).

3) Instale as dependências:
       pip install pytest playwright
       playwright install chromium

4) Rode os testes (por padrão abre o navegador visível; use
   --headed=false ou configure headless no fixture se preferir):
       pytest test_frontend_prisma.py -v

--------------------------------------------------------------------
⚠ SOBRE OS SELETORES
--------------------------------------------------------------------
Como não tenho o HTML/JSX real das telas, os seletores abaixo usam
`get_by_text` / `get_by_role` com os textos EXATOS citados no guia
(ex.: "Baixar PDF Real", "Sair", "Candidatar-se"). Se algum texto do
seu frontend for um pouco diferente, é só ajustar a constante
correspondente lá em cima do arquivo (bloco CONFIG).
"""

import os
import re
import pytest
from playwright.sync_api import sync_playwright, expect

# ============================================================
# CONFIG
# ============================================================

FRONTEND_URL = os.environ.get("PRISMA_FRONTEND_URL", "http://localhost:5173")
HEADLESS = os.environ.get("PRISMA_HEADLESS", "true").lower() != "false"

ALUNO_A = {
    "email": os.environ.get("PRISMA_ALUNO_A_EMAIL", "aluno.a@teste.com"),
    "senha": os.environ.get("PRISMA_ALUNO_A_SENHA", "TesteSenha@123"),
    "nome_esperado": os.environ.get("PRISMA_ALUNO_A_NOME", "Ana Teste Aluno"),
}
EMPRESA_X = {
    "email": os.environ.get("PRISMA_EMPRESA_X_EMAIL", "empresa.x@teste.com"),
    "senha": os.environ.get("PRISMA_EMPRESA_X_SENHA", "TesteSenha@123"),
}

# Textos exatos citados no guia — ajuste se o seu frontend usar outros
TXT_ENTRAR = "Entrar"
TXT_SAIR = "Sair"
TXT_CANDIDATAR = "Candidatar-se"
TXT_CANDIDATURA_ENVIADA = "Candidatura enviada"
TXT_SALVAR_GERAR_PDF = "Salvar e Gerar PDF"
TXT_ALERTA_CRIACAO = "Currículo criado e PDF gerado com sucesso!"
TXT_ALERTA_EDICAO = "Currículo atualizado e PDF gerado com sucesso!"
TXT_MINHAS_CANDIDATURAS = "Minhas Candidaturas"
TXT_VAZIO_CANDIDATURAS = "Você ainda não se candidatou a nenhuma vaga."


# ============================================================
# FIXTURES
# ============================================================

@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=HEADLESS)
        yield b
        b.close()


@pytest.fixture
def page(browser):
    context = browser.new_context()
    pg = context.new_page()
    yield pg
    context.close()


def token_esta_no_localstorage(page):
    """
    Verifica se algum token de sessão vazou para o `localStorage`.

    Acrescentado em 25 ago 2026. O refresh token passou a viver num cookie
    `httpOnly` e o access token, só em memória (Prisma_frontend/src/services/
    authToken.ts) — justamente para que um XSS não consiga lê-los. Se uma
    mudança futura reintroduzir o token no `localStorage`, este helper
    detecta.

    Só `auth_user` (nome/e-mail/papel para desenhar a interface) pode ficar
    lá, e isso não é credencial: o backend revalida o papel a cada requisição.
    """
    return page.evaluate(
        "() => Object.keys(localStorage).filter("
        "k => /token|jwt|access|refresh/i.test(k))"
    )


def capturar_alertas(page):
    """
    Acumula o texto dos `alert()` nativos disparados pela aplicação.

    Necessário porque `alert()` NÃO é DOM: nenhum `get_by_text` o alcança, e
    o Playwright dispensa o diálogo automaticamente quando ninguém escuta.
    Os testes originais checavam a mensagem de sucesso com
    `expect(page.get_by_text(...)).to_be_visible()`, o que nunca poderia
    passar — dava sempre timeout.

    Devolve a lista (viva) de mensagens; leia depois da ação.
    """
    mensagens = []

    def _tratar(dialog):
        mensagens.append(dialog.message)
        dialog.accept()

    page.on("dialog", _tratar)
    return mensagens


def abrir_meu_curriculo(page):
    """
    Vai para a tela de currículo do aluno.

    Prefere o link do menu; se o texto não bater, navega pela URL direta —
    assim uma mudança de rótulo no menu não derruba os testes de currículo.
    """
    link = page.get_by_text("Meu Currículo", exact=False)
    if link.count() > 0:
        link.first.click()
    else:
        page.goto(f"{FRONTEND_URL}/dashboard/aluno/curriculo")
    page.wait_for_load_state("networkidle")


def fazer_login(page, email, senha):
    page.goto(f"{FRONTEND_URL}/login")
    # assume inputs padrão type=email/password; ajuste se usar outro seletor
    page.locator("input[type='email'], input[name='email']").first.fill(email)
    page.locator("input[type='password'], input[name='password']").first.fill(senha)
    page.get_by_role("button", name=re.compile(TXT_ENTRAR, re.I)).first.click()
    page.wait_for_load_state("networkidle")


# ============================================================
# TC-12 — Login sem campos duplicados
# ============================================================

def test_tc12_login_sem_campos_duplicados(page):
    page.goto(f"{FRONTEND_URL}/login")
    campos_email = page.locator("input[type='email'], input[name='email']")
    campos_senha = page.locator("input[type='password'], input[name='password']")
    botoes_entrar = page.get_by_role("button", name=re.compile(TXT_ENTRAR, re.I))

    assert campos_email.count() == 1, f"Esperava 1 campo de e-mail, achei {campos_email.count()}"
    assert campos_senha.count() == 1, f"Esperava 1 campo de senha, achei {campos_senha.count()}"
    assert botoes_entrar.count() == 1, f"Esperava 1 botão '{TXT_ENTRAR}', achei {botoes_entrar.count()}"


# ============================================================
# TC-13 / TC-14 — Criar e editar currículo
# ============================================================

def test_tc13_criar_primeiro_curriculo_gera_pdf(page):
    """
    PRÉ-CONDIÇÃO do guia: conta de aluno recém-criada, sem currículo ainda.
    Ajuste as credenciais via env var PRISMA_ALUNO_NOVO_* para rodar isso
    isoladamente com uma conta fresca.

    SELETORES CORRIGIDOS em 25 ago 2026 — os originais foram escritos sem
    acesso ao JSX das telas (o próprio cabeçalho do arquivo avisava isso) e
    não batiam com a interface real:
      - a navegação era `get_by_text("Criar Currículo")`; o menu do aluno diz
        "Meu Currículo" e leva à mesma tela, que cria ou edita conforme o caso;
      - o campo de nome é `name="fullName"`, não "nome_completo"/"nome";
      - o de curso é `name="course"`, não "formacao"/"curso";
      - o texto de sucesso vem de um `alert()` nativo, que NÃO é DOM: nenhum
        `get_by_text` jamais o encontraria. Capturamos pelo evento `dialog`.
    """
    email = os.environ.get("PRISMA_ALUNO_NOVO_EMAIL", ALUNO_A["email"])
    senha = os.environ.get("PRISMA_ALUNO_NOVO_SENHA", ALUNO_A["senha"])

    fazer_login(page, email, senha)
    abrir_meu_curriculo(page)

    page.locator("input[name='fullName']").first.fill("Ana Teste Aluno")
    curso_input = page.locator("input[name='course']").first
    if curso_input.count() > 0:
        curso_input.fill("Sistemas para Internet")

    mensagens = capturar_alertas(page)
    with page.expect_download(timeout=20000) as download_info:
        page.get_by_role("button", name=re.compile(TXT_SALVAR_GERAR_PDF, re.I)).click()

    assert download_info.value is not None, "Nenhum PDF foi baixado."

    page.wait_for_timeout(1500)
    assert any(
        TXT_ALERTA_CRIACAO in m or TXT_ALERTA_EDICAO in m for m in mensagens
    ), f"Nenhum alerta de sucesso apareceu. Alertas capturados: {mensagens}"


def test_tc14_editar_curriculo_existente(page):
    """Assume que o currículo já existe (o seed_testes cria um)."""
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])
    abrir_meu_curriculo(page)

    # O campo é name="phone" no formulário real, não "telefone".
    page.locator("input[name='phone']").first.fill("(86) 98888-0001")

    mensagens = capturar_alertas(page)
    with page.expect_download(timeout=20000):
        page.get_by_role("button", name=re.compile(TXT_SALVAR_GERAR_PDF, re.I)).click()

    page.wait_for_timeout(1500)
    assert any(TXT_ALERTA_EDICAO in m for m in mensagens), (
        f"Esperava o alerta de ATUALIZAÇÃO. Alertas capturados: {mensagens}"
    )


# ============================================================
# TC-15 — Candidatura muda o texto do botão
# ============================================================

def test_tc15_botao_candidatura_muda_apos_clicar(page):
    """
    SELETOR CORRIGIDO em 25 ago 2026: o teste clicava no texto fixo
    "Empresa Teste LTDA" para abrir uma vaga. Amarrar o teste ao nome de uma
    empresa específica o quebra sempre que o cenário de dados muda; agora ele
    abre a primeira vaga da listagem, seja ela de quem for.
    """
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])
    page.goto(f"{FRONTEND_URL}/dashboard/aluno/vagas")
    page.wait_for_load_state("networkidle")

    cards = page.locator("a[href*='/vagas/'], [class*='job-card'], [class*='vaga-card']")
    if cards.count() == 0:
        pytest.skip(
            "Nenhuma vaga ATIVA na listagem do aluno. Rode "
            "`python manage.py seed_testes` no backend para criar uma."
        )
    cards.first.click()
    page.wait_for_load_state("networkidle")

    botao = page.get_by_role("button", name=re.compile(TXT_CANDIDATAR, re.I))
    if botao.count() == 0:
        pytest.skip("Aluno A já se candidatou a essa vaga em um teste anterior.")

    botao.first.click()
    expect(
        page.get_by_role("button", name=re.compile(TXT_CANDIDATURA_ENVIADA, re.I))
    ).to_be_visible(timeout=10000)


# ============================================================
# TC-18 — Logout limpa a sessão de verdade
# ============================================================

def test_tc18_logout_limpa_sessao(page):
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])
    page.get_by_text(TXT_SAIR, exact=True).click()

    # `wait_for_url` e não `wait_for_load_state("networkidle")`: desde 25 ago
    # 2026 o logout é ASSÍNCRONO — ele chama `POST /api/users/logout/` para
    # REVOGAR a sessão no servidor e só então redireciona. "networkidle"
    # resolvia antes dessa ida e volta terminar, e o teste falhava ainda no
    # dashboard, dando a impressão de que o logout não funcionava.
    page.wait_for_url("**/login**", timeout=20000)
    assert "/login" in page.url, f"Esperava ir para /login após sair, mas URL é {page.url}"

    # Deixa a navegação do logout assentar antes de tentar outra. O logout
    # dispara `window.location.replace`, e um `goto` disparado enquanto essa
    # navegação ainda está em voo é cancelado pelo navegador — o `goto`
    # estourava timeout sem que houvesse nada errado com a aplicação.
    page.wait_for_load_state("load")
    page.wait_for_timeout(1500)

    # Voltar ao dashboard pela URL, e não com `page.go_back()`: o logout usa
    # `window.location.replace`, que SUBSTITUI a entrada de histórico, então
    # não existe "página anterior" para onde voltar — o `go_back` estourava
    # "Not attached to an active page". Navegar direto testa a mesma coisa e
    # é até mais rigoroso: é o que alguém com a URL na mão faria.
    page.goto(f"{FRONTEND_URL}/dashboard/aluno", wait_until="commit")
    page.wait_for_timeout(3000)

    assert "/login" in page.url, (
        f"Voltando ao dashboard pela URL, a página ficou em {page.url} — a "
        f"sessão precisa estar encerrada de verdade (token revogado no "
        f"servidor, não só apagado do navegador)."
    )


# ============================================================
# TC-19 — Cabeçalho mostra nome real
# ============================================================

def test_tc19_cabecalho_mostra_nome_real(page):
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])
    expect(page.get_by_text(ALUNO_A["nome_esperado"], exact=False)).to_be_visible(timeout=5000)
    # garante que NÃO aparece o texto genérico derivado do e-mail
    generico = page.get_by_text(re.compile(r"\baluno\b", re.I)).all_text_contents()
    assert not any(t.strip().lower() == "aluno" for t in generico), (
        "Cabeçalho ainda mostra o texto genérico 'aluno' em vez do nome cadastrado."
    )


# ============================================================
# TC-20 / TC-22 — Minhas Candidaturas (lista e estado vazio)
# ============================================================

def test_tc20_lista_de_candidaturas_aparece(page):
    """PRÉ-CONDIÇÃO: Aluno A já se candidatou a pelo menos uma vaga."""
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])
    page.get_by_text(TXT_MINHAS_CANDIDATURAS, exact=False).click()
    page.wait_for_load_state("networkidle")

    # espera pelo menos um card/linha de candidatura com o botão "Ver vaga"
    ver_vaga = page.get_by_text("Ver vaga", exact=False)
    expect(ver_vaga.first).to_be_visible(timeout=5000)

    ver_vaga.first.click()
    page.wait_for_load_state("networkidle")
    assert "vaga" in page.url.lower() or "job" in page.url.lower(), (
        f"Clicar em 'Ver vaga' não pareceu abrir o detalhe da vaga (URL: {page.url})"
    )


def test_tc22_estado_vazio_minhas_candidaturas(page):
    """Requer uma conta de aluno SEM nenhuma candidatura.
    Informe via env vars PRISMA_ALUNO_SEM_CANDIDATURA_EMAIL/SENHA,
    senão o teste é pulado."""
    email = os.environ.get("PRISMA_ALUNO_SEM_CANDIDATURA_EMAIL")
    senha = os.environ.get("PRISMA_ALUNO_SEM_CANDIDATURA_SENHA")
    if not email or not senha:
        pytest.skip(
            "Defina PRISMA_ALUNO_SEM_CANDIDATURA_EMAIL/SENHA com uma conta "
            "de aluno sem candidaturas para rodar o TC-22."
        )

    erros_console = []
    page.on("console", lambda msg: erros_console.append(msg.text) if msg.type == "error" else None)

    fazer_login(page, email, senha)
    page.get_by_text(TXT_MINHAS_CANDIDATURAS, exact=False).click()
    page.wait_for_load_state("networkidle")

    expect(page.get_by_text(TXT_VAZIO_CANDIDATURAS, exact=False)).to_be_visible(timeout=5000)
    expect(page.get_by_text("Ver vagas disponíveis", exact=False)).to_be_visible()
    assert not erros_console, f"Erros no console do navegador: {erros_console}"


# ============================================================
# Segurança de sessão no navegador (acrescentado em 25 ago 2026)
# ============================================================

def test_token_nao_fica_no_localstorage(page):
    """
    Depois de logar, nenhum token pode estar no `localStorage`.

    Era o achado que o diagnóstico tinha deixado para depois: access token E
    refresh token ficavam lá, legíveis por qualquer XSS. O refresh valia 1
    dia, então um XSS de um segundo virava acesso persistente à conta.
    """
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])

    vazados = token_esta_no_localstorage(page)
    assert vazados == [], (
        f"Estas chaves de localStorage parecem guardar credenciais: {vazados}. "
        f"O access token deve ficar só em memória e o refresh, no cookie "
        f"httpOnly (ver Prisma_frontend/src/services/authToken.ts)."
    )


def test_cookie_de_refresh_nao_e_legivel_por_javascript(page):
    """
    O cookie do refresh token é `httpOnly` — `document.cookie` não o enxerga.
    É essa propriedade que torna o XSS incapaz de roubar a sessão renovável.
    """
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])

    cookies_visiveis = page.evaluate("() => document.cookie")
    assert "prisma_refresh" not in cookies_visiveis, (
        f"O cookie de refresh apareceu em document.cookie — ou seja, perdeu o "
        f"HttpOnly: {cookies_visiveis[:200]}"
    )


def test_sessao_sobrevive_a_recarga_da_pagina(page):
    """
    Contrapartida de tirar o token do `localStorage`: como o access token
    agora mora em memória, ele some a cada F5. A sessão precisa ser
    restaurada pelo refresh silencioso que o `AuthProvider` dispara no boot,
    usando o cookie httpOnly.

    Se este teste falhar, o usuário é jogado para /login a cada recarga —
    o modo mais provável de a mudança quebrar na prática.
    """
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])
    url_apos_login = page.url
    assert "/login" not in url_apos_login, (
        f"Login não redirecionou para o dashboard (URL: {url_apos_login})."
    )

    page.reload()
    page.wait_for_load_state("networkidle")

    assert "/login" not in page.url, (
        f"Depois de recarregar a página, a aplicação voltou para {page.url}. "
        f"O refresh silencioso do boot (AuthProvider) não restaurou a sessão "
        f"a partir do cookie httpOnly."
    )
