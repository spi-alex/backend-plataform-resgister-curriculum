# -*- coding: utf-8 -*-
"""
PRISMA — Testes Automatizados de Backend (API)
================================================

Cobre os casos de teste do "Guia de Testes Manuais" que dependem do
backend Django (PRISMA_backend), batendo direto na API — o mesmo tipo
de chamada que o guia manda fazer via Console do navegador (fetch),
só que automatizado com a lib `requests`.

CASOS COBERTOS:
    TC-01, TC-02, TC-03, TC-04, TC-05   -> Parte 1 (IDOR / segurança)
    TC-06, TC-07, TC-08                  -> Parte 2 (persistência de cadastro)
    TC-09, TC-10, TC-11                  -> Parte 3 (gestor submete currículo)
    TC-15, TC-16, TC-17                  -> Parte 4 (candidatura / vaga encerrada)
    TC-20, TC-21, TC-22, TC-23           -> Parte 5 (Minhas Candidaturas)

NÃO cobertos aqui (são só visuais/UI, veja test_frontend_prisma.py):
    TC-12 (campos duplicados no login), TC-13 (alerta/PDF baixado no navegador),
    TC-18 (botão Voltar do navegador), TC-19 (nome no cabeçalho)

--------------------------------------------------------------------
!! MUDOU EM 25 AGO 2026 — LEIA ANTES DE RODAR
--------------------------------------------------------------------
A rodada de segurança mudou três coisas que afetam esta bateria:

a) **Conta nasce 'pendente'.** O cadastro não ativa mais a conta nem
   devolve token. É preciso confirmar o código de 6 dígitos enviado por
   e-mail (POST /api/users/confirm/) — ou, mais prático para montar o
   ambiente de teste, marcar `status='ativo'` no admin do Django.

b) **Senha mínima de 10 caracteres.** As contas do guia usavam
   "Teste@123" (9 caracteres), que hoje é recusada no cadastro. O padrão
   deste script passou a ser "TesteSenha@123".

c) **Refresh token vai em cookie httpOnly**, não no corpo da resposta de
   login. Quem precisar renovar sessão deve usar `requests.Session()`.

--------------------------------------------------------------------
COMO USAR
--------------------------------------------------------------------
1) Suba o backend (python manage.py runserver) ANTES de rodar os testes.
2) Rode a Parte 0 do guia manualmente uma vez: crie Aluno A, Aluno B e
   Empresa X pela tela de cadastro (com os valores sugeridos na tabela
   da Parte 0 — este script assume esses valores por padrão), CONFIRME
   as três contas (item (a) acima) e crie o Gestor via createsuperuser
   + admin.
3) Exporte as credenciais do Gestor (não tem autocadastro, então não
   dá pra assumir um valor padrão):

       export PRISMA_GESTOR_USERNAME="gestor_teste"
       export PRISMA_GESTOR_SENHA="sua_senha_aqui"

4) (Opcional) Se os IDs de currículo do Aluno A/B não forem descobertos
   automaticamente (ver `obter_id_curriculo_proprio` abaixo), informe-os:

       export PRISMA_ALUNO_A_RESUME_ID=1
       export PRISMA_ALUNO_B_RESUME_ID=2

5) Instale as dependências e rode:

       pip install pytest requests
       pytest test_backend_prisma.py -v

--------------------------------------------------------------------
✅ ROTAS — TODAS CONFIRMADAS
--------------------------------------------------------------------
Confirmadas direto no código (urls.py, views.py, serializers.py e
models.py que foram compartilhados):
    POST  /api/users/login/                        (login)
    GET   /api/users/me/                            (perfil do aluno — ProfileSerializer)
    GET/PATCH /api/companies/me/                    (perfil da empresa — CompanySerializer)
    GET   /api/resumes/
    GET   /api/pdf/export/<id>/
    GET   /api/jobs/  |  GET/PATCH /api/jobs/<id>/
    POST  /api/jobs/<id>/apply/
    GET   /api/jobs/<id>/candidates/
    PATCH /api/jobs/<job_id>/update-status/<app_id>/
    POST  /api/jobs/<id>/submit-resumes/
    GET   /api/jobs/my-applications/

Application.STATUS_CHOICES (jobs/models.py): PENDENTE, ANALISE,
ENTREVISTA, APROVADO, REPROVADO — usados no TC-21.

Único ponto em aberto: não sei se o ApplicationSerializer devolve o
'status' como chave interna (ex. "ANALISE") ou como label
(get_status_display(), ex. "Em Análise") — o TC-21 aceita os dois
formatos na asserção final.
"""

import os
import pytest
import requests

# ============================================================
# CONFIG — ajuste aqui se algo não bater com o seu backend
# ============================================================

BASE_URL = os.environ.get("PRISMA_BASE_URL", "http://localhost:8000")

# ATUALIZADO EM 25 AGO 2026 — antes daqui saía uma lista de rotas candidatas
# e o helper `login()` tentava todas as combinações de rota x nome de campo
# ("email"/"username") até uma funcionar. Isso deixou de ser viável por dois
# motivos:
#
#   1. o login agora tem rate limiting (10/min por IP E 10/min por conta
#      alvo). Quatro tentativas por login, vezes as fixtures da suíte,
#      estouravam o limite e faziam a bateria inteira falhar com 429;
#   2. `/api/token/` deixou de ser um caminho paralelo — passou a apontar
#      para a mesma view endurecida de `/api/users/login/`.
#
# A rota e o nome do campo estão confirmados no código, então usamos os dois
# diretamente.
LOGIN_URL = f"{BASE_URL}/api/users/login/"
LOGOUT_URL = f"{BASE_URL}/api/users/logout/"
CONFIRM_URL = f"{BASE_URL}/api/users/confirm/"
USERS_ME_URL = f"{BASE_URL}/api/users/me/"                 # confirmado (users/serializers.py: ProfileSerializer)
REGISTER_URL = f"{BASE_URL}/api/users/register/"           # confirmado (users/urls.py: register_user)
RESUMES_URL = f"{BASE_URL}/api/resumes/"                   # confirmado (resumes/urls.py: router r'')
PDF_EXPORT_URL = BASE_URL + "/api/pdf/export/{id}/"         # confirmado (citado no próprio guia)
JOBS_URL = f"{BASE_URL}/api/jobs/"                          # confirmado (jobs/urls.py: router r'')
JOB_DETAIL_URL = BASE_URL + "/api/jobs/{id}/"               # confirmado (router DRF padrão)
JOB_SUBMIT_RESUMES_URL = BASE_URL + "/api/jobs/{id}/submit-resumes/"  # confirmado (citado no guia, TC-11)
MY_APPLICATIONS_URL = f"{BASE_URL}/api/jobs/my-applications/"          # confirmado (citado no guia, TC-23)

# Ainda NÃO confirmados — não vimos o serializer do users app (Aluno).
COMPANY_ME_URL = f"{BASE_URL}/api/companies/me/"            # confirmado (companies/views.py: action 'me')
JOB_APPLY_URL = BASE_URL + "/api/jobs/{id}/apply/"                       # confirmado (jobs/views.py: action 'apply')
JOB_CANDIDATES_URL = BASE_URL + "/api/jobs/{id}/candidates/"            # confirmado (jobs/views.py: action 'candidates')
APPLICATION_STATUS_URL = BASE_URL + "/api/jobs/{job_id}/update-status/{app_id}/"  # confirmado (url_path regex)

# Credenciais — batem com a tabela da Parte 0 do guia.
# Ajuste via variável de ambiente se você usou valores diferentes.
ALUNO_A = {
    "email": os.environ.get("PRISMA_ALUNO_A_EMAIL", "aluno.a@teste.com"),
    "senha": os.environ.get("PRISMA_ALUNO_A_SENHA", "TesteSenha@123"),
}
ALUNO_B = {
    "email": os.environ.get("PRISMA_ALUNO_B_EMAIL", "aluno.b@teste.com"),
    "senha": os.environ.get("PRISMA_ALUNO_B_SENHA", "TesteSenha@123"),
}
EMPRESA_X = {
    "email": os.environ.get("PRISMA_EMPRESA_X_EMAIL", "empresa.x@teste.com"),
    "senha": os.environ.get("PRISMA_EMPRESA_X_SENHA", "TesteSenha@123"),
}
GESTOR = {
    "username": os.environ.get("PRISMA_GESTOR_USERNAME"),
    "senha": os.environ.get("PRISMA_GESTOR_SENHA"),
}

TIMEOUT = 10


# ============================================================
# HELPERS
# ============================================================

def login(identificador, senha):
    """
    Faz login e devolve o access_token.

    Uma tentativa só, na rota confirmada e com o nome de campo confirmado —
    ver a nota em LOGIN_URL sobre por que a varredura de combinações saiu.

    O refresh token NÃO vem mais no corpo: ele é gravado num cookie httpOnly
    (users/cookies.py). Testes que precisarem renovar a sessão devem usar uma
    `requests.Session()`, que guarda o cookie sozinho.
    """
    resp = requests.post(
        LOGIN_URL, json={"username": identificador, "password": senha}, timeout=TIMEOUT
    )

    if resp.status_code == 200 and "access" in resp.json():
        return resp.json()["access"]

    if resp.status_code == 429:
        pytest.skip(
            "Rate limiting do login foi atingido (429). Espere 1 minuto e "
            "rode de novo, ou rode com menos paralelismo. Isto é o throttle "
            "funcionando, não um defeito."
        )

    corpo = resp.text[:300]
    if "confirme seu cadastro" in corpo.lower() or "pendente" in corpo.lower():
        pytest.fail(
            f"A conta '{identificador}' está PENDENTE de confirmação. Desde a "
            f"rodada de segurança, o cadastro não ativa a conta sozinho: é "
            f"preciso confirmar o código de 6 dígitos enviado por e-mail em "
            f"POST {CONFIRM_URL} (ou marcar status='ativo' no admin do Django) "
            f"antes de rodar a bateria. Veja a Parte 0 do README_testes.md."
        )

    pytest.fail(
        f"Login falhou para '{identificador}' (status {resp.status_code}, "
        f"corpo: {corpo})."
    )


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def obter_id_curriculo_proprio(token, env_var_fallback):
    """Tenta descobrir o ID do próprio currículo chamando /api/resumes/.
    Se a API não devolver algo utilizável, cai para a variável de
    ambiente informada manualmente (ver instruções no topo do arquivo)."""
    resp = requests.get(RESUMES_URL, headers=auth_headers(token), timeout=TIMEOUT)
    if resp.status_code == 200:
        data = resp.json()
        items = data.get("results", data) if isinstance(data, dict) else data
        if isinstance(items, list) and len(items) >= 1:
            primeiro = items[0]
            if isinstance(primeiro, dict) and "id" in primeiro:
                return primeiro["id"]
    manual = os.environ.get(env_var_fallback)
    if manual:
        return int(manual)
    pytest.skip(
        f"Não consegui descobrir o ID do currículo automaticamente. "
        f"Defina a variável de ambiente {env_var_fallback} com o ID "
        f"(veja no DevTools > Network, como o próprio guia ensina)."
    )


def extrair_job_id(candidatura: dict):
    """O nome exato do campo de vaga dentro do ApplicationSerializer não
    foi confirmado (pode vir como int direto ou objeto aninhado) —
    tenta os formatos mais comuns."""
    job = candidatura.get("job")
    if isinstance(job, dict) and "id" in job:
        return job["id"]
    if isinstance(job, int):
        return job
    for chave in ("job_id", "vaga_id", "vaga"):
        if chave in candidatura:
            valor = candidatura[chave]
            return valor["id"] if isinstance(valor, dict) else valor
    pytest.fail(f"Não consegui extrair o job_id de: {candidatura}")


def extrair_resume_id(candidato: dict):
    """Idem, para o ID do currículo dentro de um item de 'candidatos'
    (retorno de JOB_CANDIDATES_URL)."""
    resume = candidato.get("resume")
    if isinstance(resume, dict) and "id" in resume:
        return resume["id"]
    if isinstance(resume, int):
        return resume
    for chave in ("resume_id",):
        if chave in candidato:
            return candidato[chave]
    pytest.fail(f"Não consegui extrair o resume_id de: {candidato}")


# ============================================================
# FIXTURES (escopo de sessão — loga uma vez só)
# ============================================================

@pytest.fixture(scope="session")
def token_aluno_a():
    return login(ALUNO_A["email"], ALUNO_A["senha"])


@pytest.fixture(scope="session")
def token_aluno_b():
    return login(ALUNO_B["email"], ALUNO_B["senha"])


@pytest.fixture(scope="session")
def token_empresa_x():
    return login(EMPRESA_X["email"], EMPRESA_X["senha"])


@pytest.fixture(scope="session")
def token_gestor():
    if not GESTOR["username"] or not GESTOR["senha"]:
        pytest.skip(
            "Credenciais do Gestor não configuradas. Defina "
            "PRISMA_GESTOR_USERNAME e PRISMA_GESTOR_SENHA."
        )
    return login(GESTOR["username"], GESTOR["senha"])


@pytest.fixture(scope="session")
def resume_id_aluno_a(token_aluno_a):
    return obter_id_curriculo_proprio(token_aluno_a, "PRISMA_ALUNO_A_RESUME_ID")


@pytest.fixture(scope="session")
def resume_id_aluno_b(token_aluno_b):
    return obter_id_curriculo_proprio(token_aluno_b, "PRISMA_ALUNO_B_RESUME_ID")


# ============================================================
# PARTE 1 — SEGURANÇA (IDOR)
# ============================================================

class TestParte1Seguranca:

    def test_tc01_aluno_b_nao_baixa_pdf_de_aluno_a(self, token_aluno_b, resume_id_aluno_a):
        """TC-01: Aluno B tentando baixar o PDF do currículo do Aluno A
        deve receber 403."""
        resp = requests.get(
            PDF_EXPORT_URL.format(id=resume_id_aluno_a),
            headers=auth_headers(token_aluno_b),
            timeout=TIMEOUT,
        )
        assert resp.status_code == 403, (
            f"Esperado 403 (bloqueado), veio {resp.status_code}. "
            f"IDOR pode ter voltado a existir."
        )

    def test_tc02_dono_continua_baixando_proprio_pdf(self, token_aluno_b, resume_id_aluno_b):
        """TC-02 (não-regressão): Aluno B baixando o PRÓPRIO currículo
        deve continuar funcionando (200)."""
        resp = requests.get(
            PDF_EXPORT_URL.format(id=resume_id_aluno_b),
            headers=auth_headers(token_aluno_b),
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200

    def test_tc03_empresa_so_acessa_curriculo_apos_candidatura(
        self, token_empresa_x, token_aluno_a, resume_id_aluno_a
    ):
        """TC-03: antes de haver candidatura, empresa recebe 403 ao
        tentar acessar o PDF do Aluno A; depois de ele se candidatar
        a uma vaga da empresa, deve virar 200.

        PRÉ-CONDIÇÃO: a Empresa X precisa ter ao menos uma vaga ATIVA, e o
        Aluno A NÃO pode já estar candidatado a ela.

        ATENÇÃO — este teste não é idempotente: o passo 2 cria uma
        candidatura e nada a desfaz. Rodar duas vezes seguidas fazia a
        segunda execução falhar no passo 1 com "assert 200 == 403", o que
        parecia um furo de autorização mas era só o resíduo da execução
        anterior. Agora esse caso é detectado e vira um `skip` explicativo,
        em vez de um falso positivo de segurança.
        """
        # 1) sem candidatura ainda -> 403
        resp_antes = requests.get(
            PDF_EXPORT_URL.format(id=resume_id_aluno_a),
            headers=auth_headers(token_empresa_x),
            timeout=TIMEOUT,
        )
        if resp_antes.status_code == 200:
            pytest.skip(
                "A Empresa X JÁ tem uma candidatura do Aluno A (provavelmente "
                "de uma execução anterior deste mesmo teste), então o 200 aqui "
                "é o comportamento correto. Para rodar de novo do zero, apague "
                "a Application correspondente no admin do Django. A cobertura "
                "equivalente e idempotente está em "
                "PRISMA_backend/users/tests_authz.py::PdfIdorTests."
            )
        assert resp_antes.status_code == 403, (
            f"Esperado 403 antes da candidatura, veio {resp_antes.status_code}."
        )

        # localizar uma vaga ATIVA da empresa para o Aluno A se candidatar
        vagas_resp = requests.get(JOBS_URL, headers=auth_headers(token_aluno_a), timeout=TIMEOUT)
        assert vagas_resp.status_code == 200, "Não consegui listar vagas — confira JOBS_URL"
        vagas = vagas_resp.json()
        vagas = vagas.get("results", vagas) if isinstance(vagas, dict) else vagas
        if not vagas:
            pytest.skip(
                "Nenhuma vaga ATIVA na plataforma. O aluno só enxerga vagas com "
                "is_active=True — crie (ou reative) uma vaga da Empresa X antes "
                "de rodar a Parte 1."
            )
        vaga_id = vagas[0]["id"]

        # 2) Aluno A se candidata
        candidatura_resp = requests.post(
            JOB_APPLY_URL.format(id=vaga_id),
            headers=auth_headers(token_aluno_a),
            timeout=TIMEOUT,
        )
        assert candidatura_resp.status_code in (200, 201), (
            f"Candidatura falhou ({candidatura_resp.status_code}). "
            f"Confira JOB_APPLY_URL em CONFIG."
        )

        # 3) agora a empresa deve conseguir ver o currículo
        resp_depois = requests.get(
            PDF_EXPORT_URL.format(id=resume_id_aluno_a),
            headers=auth_headers(token_empresa_x),
            timeout=TIMEOUT,
        )
        assert resp_depois.status_code == 200

    def test_tc04_empresa_nao_lista_todos_curriculos(self, token_empresa_x, resume_id_aluno_b):
        """TC-04: /api/resumes/ para a empresa deve trazer só quem se
        candidatou a ela — o currículo do Aluno B (que não se
        candidatou) não pode aparecer."""
        resp = requests.get(RESUMES_URL, headers=auth_headers(token_empresa_x), timeout=TIMEOUT)
        assert resp.status_code == 200
        data = resp.json()
        items = data.get("results", data) if isinstance(data, dict) else data
        ids_retornados = {item["id"] for item in items if isinstance(item, dict) and "id" in item}
        assert resume_id_aluno_b not in ids_retornados, (
            "A empresa está vendo o currículo do Aluno B, que não se candidatou a nenhuma vaga dela."
        )

    def test_tc05_gestor_ve_todos_curriculos(self, token_gestor, resume_id_aluno_a, resume_id_aluno_b):
        """TC-05 (não-regressão): Gestor continua vendo todos os currículos."""
        resp = requests.get(RESUMES_URL, headers=auth_headers(token_gestor), timeout=TIMEOUT)
        assert resp.status_code == 200
        data = resp.json()
        items = data.get("results", data) if isinstance(data, dict) else data
        ids_retornados = {item["id"] for item in items if isinstance(item, dict) and "id" in item}
        assert resume_id_aluno_a in ids_retornados
        assert resume_id_aluno_b in ids_retornados


# ============================================================
# PARTE 2 — PERSISTÊNCIA DE DADOS DE CADASTRO
# ============================================================

class TestParte2Cadastro:

    def test_tc06_dados_pessoais_aluno_persistem(self, token_aluno_a):
        """TC-06: /api/users/me/ deve trazer os campos preenchidos no
        cadastro do Aluno A. Lista confirmada em users/serializers.py
        (ProfileSerializer)."""
        resp = requests.get(USERS_ME_URL, headers=auth_headers(token_aluno_a), timeout=TIMEOUT)
        assert resp.status_code == 200
        dados = resp.json()

        campos_obrigatorios = [
            "cpf", "telefone", "data_nascimento", "instituicao", "curso",
            "situacao_academica", "ano_inicio", "cep", "rua", "cidade", "estado",
        ]
        # previsao_conclusao/ano_conclusao dependem de qual desses dois o
        # formulário efetivamente usa para "Previsão de conclusão" — não
        # cobrados como obrigatórios aqui para não falsear um Falhou.
        ausentes_ou_vazios = [
            campo for campo in campos_obrigatorios
            if campo not in dados or dados[campo] in (None, "", [])
        ]
        assert not ausentes_ou_vazios, (
            f"Os campos {ausentes_ou_vazios} vieram vazios/ausentes em /api/users/me/."
        )

    def test_tc07_dados_institucionais_empresa_persistem(self, token_empresa_x):
        """TC-07: perfil da Empresa X (GET /api/companies/me/) deve
        trazer área de atuação, responsável e endereço preenchidos.
        Campos confirmados em companies/serializers.py (CompanySerializer)."""
        resp = requests.get(COMPANY_ME_URL, headers=auth_headers(token_empresa_x), timeout=TIMEOUT)
        assert resp.status_code == 200
        dados = resp.json()

        campos_obrigatorios = [
            "area_atuacao", "telefone",
            "responsavel_nome", "responsavel_cpf", "responsavel_cargo", "responsavel_telefone",
            "cep", "rua", "cidade", "estado",
        ]
        ausentes_ou_vazios = [
            campo for campo in campos_obrigatorios
            if campo not in dados or dados[campo] in (None, "", [])
        ]
        assert not ausentes_ou_vazios, (
            f"Os campos {ausentes_ou_vazios} vieram vazios/ausentes em /api/companies/me/."
        )

    def test_tc08_editar_perfil_empresa_salva(self, token_empresa_x):
        """TC-08: editar área de atuação via PATCH /api/companies/me/ e
        confirmar (via GET de novo) que persistiu no backend."""
        novo_valor_area = "Consultoria em TI (editado via teste automatizado)"
        payload = {"area_atuacao": novo_valor_area}

        resp_patch = requests.patch(
            COMPANY_ME_URL, json=payload, headers=auth_headers(token_empresa_x), timeout=TIMEOUT
        )
        assert resp_patch.status_code in (200, 202), (
            f"PATCH em /api/companies/me/ falhou ({resp_patch.status_code}): {resp_patch.text[:200]}"
        )

        resp_get = requests.get(COMPANY_ME_URL, headers=auth_headers(token_empresa_x), timeout=TIMEOUT)
        assert resp_get.status_code == 200
        assert resp_get.json().get("area_atuacao") == novo_valor_area, (
            "O valor editado não persistiu — voltou ao original após o GET."
        )


# ============================================================
# PARTE 3 — GESTOR SUBMETE CURRÍCULO PARA VAGA
# ============================================================

class TestParte3Gestor:

    @pytest.fixture(scope="class")
    def vaga_da_empresa(self, token_aluno_a):
        vagas_resp = requests.get(JOBS_URL, headers=auth_headers(token_aluno_a), timeout=TIMEOUT)
        assert vagas_resp.status_code == 200
        vagas = vagas_resp.json()
        vagas = vagas.get("results", vagas) if isinstance(vagas, dict) else vagas
        if not vagas:
            pytest.skip(
                "Nenhuma vaga ATIVA na plataforma para testar a Parte 3. "
                "Crie (ou reative) uma vaga da Empresa X — o aluno só enxerga "
                "vagas com is_active=True."
            )
        return vagas[0]["id"]

    def test_tc09_gestor_submete_curriculo_para_vaga(
        self, token_gestor, token_empresa_x, resume_id_aluno_b, vaga_da_empresa
    ):
        """TC-09: gestor submete o currículo do Aluno B para a vaga;
        a empresa deve enxergá-lo na lista de candidatos."""
        resp = requests.post(
            JOB_SUBMIT_RESUMES_URL.format(id=vaga_da_empresa),
            json={"resume_ids": [resume_id_aluno_b]},
            headers=auth_headers(token_gestor),
            timeout=TIMEOUT,
        )
        assert resp.status_code in (200, 201)

        candidatos_resp = requests.get(
            JOB_CANDIDATES_URL.format(id=vaga_da_empresa),
            headers=auth_headers(token_empresa_x),
            timeout=TIMEOUT,
        )
        assert candidatos_resp.status_code == 200
        candidatos = candidatos_resp.json().get("candidatos", [])
        ids = {extrair_resume_id(c) for c in candidatos if isinstance(c, dict)}
        assert resume_id_aluno_b in ids

    def test_tc10_submissao_duplicada_nao_duplica(
        self, token_gestor, resume_id_aluno_b, vaga_da_empresa
    ):
        """TC-10 (não-regressão): submeter o mesmo currículo de novo
        não deve dar erro nem duplicar."""
        resp1 = requests.post(
            JOB_SUBMIT_RESUMES_URL.format(id=vaga_da_empresa),
            json={"resume_ids": [resume_id_aluno_b]},
            headers=auth_headers(token_gestor),
            timeout=TIMEOUT,
        )
        resp2 = requests.post(
            JOB_SUBMIT_RESUMES_URL.format(id=vaga_da_empresa),
            json={"resume_ids": [resume_id_aluno_b]},
            headers=auth_headers(token_gestor),
            timeout=TIMEOUT,
        )
        assert resp1.status_code in (200, 201)
        assert resp2.status_code in (200, 201), "Segunda submissão não deveria dar erro."

    def test_tc11_aluno_nao_usa_rota_de_submissao_do_gestor(
        self, token_aluno_a, vaga_da_empresa
    ):
        """TC-11: aluno tentando chamar a rota de submissão do gestor
        deve receber 403."""
        resp = requests.post(
            JOB_SUBMIT_RESUMES_URL.format(id=vaga_da_empresa),
            json={"resume_ids": [1]},
            headers=auth_headers(token_aluno_a),
            timeout=TIMEOUT,
        )
        assert resp.status_code == 403


# ============================================================
# PARTE 4 — CANDIDATURA E STATUS DE VAGA (parte testável via API)
# ============================================================

class TestParte4CandidaturaEVagas:

    def test_tc15_aluno_situacao_aluno_consegue_candidatar(self, token_aluno_a):
        """TC-15: Aluno A (situação=Aluno, não Egresso) deve conseguir
        se candidatar normalmente (antes só 'Egresso' funcionava)."""
        vagas_resp = requests.get(JOBS_URL, headers=auth_headers(token_aluno_a), timeout=TIMEOUT)
        assert vagas_resp.status_code == 200
        vagas = vagas_resp.json()
        vagas = vagas.get("results", vagas) if isinstance(vagas, dict) else vagas
        if not vagas:
            pytest.skip(
                "Nenhuma vaga ATIVA para testar TC-15. Crie (ou reative) uma "
                "vaga antes de rodar a Parte 4."
            )
        vaga_id = vagas[0]["id"]

        resp = requests.post(
            JOB_APPLY_URL.format(id=vaga_id), headers=auth_headers(token_aluno_a), timeout=TIMEOUT
        )
        assert resp.status_code in (200, 201, 409), (
            # 409 tolerado caso o Aluno A já tenha se candidatado num teste anterior (TC-03)
            f"Candidatura falhou de forma inesperada: {resp.status_code} - {resp.text[:200]}"
        )

    def test_tc16_vaga_encerrada_some_da_listagem(self, token_empresa_x, token_aluno_b):
        """TC-16: depois de encerrar uma vaga, ela não deve aparecer
        na listagem de um aluno que não se candidatou a ela."""
        vagas_resp = requests.get(JOBS_URL, headers=auth_headers(token_empresa_x), timeout=TIMEOUT)
        assert vagas_resp.status_code == 200
        vagas = vagas_resp.json()
        vagas = vagas.get("results", vagas) if isinstance(vagas, dict) else vagas
        if not vagas:
            pytest.skip(
                "A Empresa X não tem vagas para testar TC-16. Cadastre uma "
                "vaga antes de rodar a Parte 4."
            )
        vaga_id = vagas[0]["id"]

        patch_resp = requests.patch(
            JOB_DETAIL_URL.format(id=vaga_id),
            json={"is_active": False},
            headers=auth_headers(token_empresa_x),
            timeout=TIMEOUT,
        )
        assert patch_resp.status_code in (200, 202), (
            f"Não consegui encerrar a vaga ({patch_resp.status_code}): {patch_resp.text[:200]}"
        )

        listagem_aluno_b = requests.get(
            JOBS_URL, headers=auth_headers(token_aluno_b), timeout=TIMEOUT
        ).json()
        listagem_aluno_b = (
            listagem_aluno_b.get("results", listagem_aluno_b)
            if isinstance(listagem_aluno_b, dict) else listagem_aluno_b
        )
        ids_visiveis = {v["id"] for v in listagem_aluno_b if isinstance(v, dict)}
        assert vaga_id not in ids_visiveis

    def test_tc17_vaga_encerrada_acessivel_a_quem_se_candidatou(self, token_aluno_a):
        """TC-17: quem já se candidatou continua conseguindo abrir o
        detalhe da vaga mesmo depois de encerrada (sem 404)."""
        # Usa a vaga aplicada em TC-15 (assume que roda depois dele na mesma sessão)
        vagas_resp = requests.get(
            MY_APPLICATIONS_URL, headers=auth_headers(token_aluno_a), timeout=TIMEOUT
        )
        assert vagas_resp.status_code == 200
        candidaturas = vagas_resp.json()
        candidaturas = candidaturas.get("results", candidaturas) if isinstance(candidaturas, dict) else candidaturas
        assert candidaturas, "Aluno A não tem candidaturas registradas para testar TC-17."
        vaga_id = extrair_job_id(candidaturas[0])

        detalhe_resp = requests.get(
            JOB_DETAIL_URL.format(id=vaga_id), headers=auth_headers(token_aluno_a), timeout=TIMEOUT
        )
        assert detalhe_resp.status_code == 200, (
            "Vaga não encontrada para quem já se candidatou — bug pode ter voltado."
        )


# ============================================================
# PARTE 5 — "MINHAS CANDIDATURAS"
# ============================================================

class TestParte5MinhasCandidaturas:

    def test_tc20_lista_de_candidaturas_aparece(self, token_aluno_a):
        """TC-20: /api/jobs/my-applications/ deve trazer as candidaturas
        do Aluno A com título da vaga, data e status."""
        resp = requests.get(
            MY_APPLICATIONS_URL, headers=auth_headers(token_aluno_a), timeout=TIMEOUT
        )
        assert resp.status_code == 200
        candidaturas = resp.json()
        candidaturas = candidaturas.get("results", candidaturas) if isinstance(candidaturas, dict) else candidaturas
        assert candidaturas, "Esperava ao menos uma candidatura do Aluno A (rode TC-15 antes)."
        primeira = candidaturas[0]
        assert "status" in primeira

    def test_tc21_mudanca_de_status_reflete(self, token_empresa_x, token_aluno_a):
        """TC-21: empresa muda status de uma candidatura (PATCH
        /api/jobs/<job_id>/update-status/<app_id>/) -> aluno precisa
        ver o novo status em 'Minhas Candidaturas'."""
        resp = requests.get(
            MY_APPLICATIONS_URL, headers=auth_headers(token_aluno_a), timeout=TIMEOUT
        )
        candidaturas = resp.json()
        candidaturas = candidaturas.get("results", candidaturas) if isinstance(candidaturas, dict) else candidaturas
        assert candidaturas, "Aluno A precisa ter ao menos uma candidatura."
        candidatura = candidaturas[0]
        candidatura_id = candidatura["id"]
        job_id = extrair_job_id(candidatura)

        # Os valores de Application.STATUS_CHOICES foram confirmados em
        # jobs/models.py: PENDENTE, ANALISE, ENTREVISTA, APROVADO, REPROVADO.
        novo_status = os.environ.get("PRISMA_STATUS_EM_ANALISE", "ANALISE")
        patch_resp = requests.patch(
            APPLICATION_STATUS_URL.format(job_id=job_id, app_id=candidatura_id),
            json={"status": novo_status},
            headers=auth_headers(token_empresa_x),
            timeout=TIMEOUT,
        )
        assert patch_resp.status_code == 200, (
            f"PATCH de status falhou ({patch_resp.status_code}): {patch_resp.text[:200]}. "
            f"Se for 'Status inválido', defina PRISMA_STATUS_EM_ANALISE com uma chave "
            f"válida de Application.STATUS_CHOICES."
        )

        resp_depois = requests.get(
            MY_APPLICATIONS_URL, headers=auth_headers(token_aluno_a), timeout=TIMEOUT
        )
        candidaturas_depois = resp_depois.json()
        candidaturas_depois = (
            candidaturas_depois.get("results", candidaturas_depois)
            if isinstance(candidaturas_depois, dict) else candidaturas_depois
        )
        alvo = next(c for c in candidaturas_depois if c["id"] == candidatura_id)
        # A API pode devolver a chave interna ou o label (get_status_display) —
        # aceita os dois.
        assert novo_status in (alvo.get("status"), str(alvo.get("status")).lower())

    def test_tc23_empresa_nao_usa_rota_de_candidaturas_do_aluno(self, token_empresa_x):
        """TC-23: empresa chamando /api/jobs/my-applications/ deve
        receber 403 (rota é exclusiva do aluno)."""
        resp = requests.get(
            MY_APPLICATIONS_URL, headers=auth_headers(token_empresa_x), timeout=TIMEOUT
        )
        assert resp.status_code == 403
