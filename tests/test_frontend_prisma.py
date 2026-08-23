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
    "senha": os.environ.get("PRISMA_ALUNO_A_SENHA", "Teste@123"),
    "nome_esperado": os.environ.get("PRISMA_ALUNO_A_NOME", "Ana Teste Aluno"),
}
EMPRESA_X = {
    "email": os.environ.get("PRISMA_EMPRESA_X_EMAIL", "empresa.x@teste.com"),
    "senha": os.environ.get("PRISMA_EMPRESA_X_SENHA", "Teste@123"),
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
    """PRÉ-CONDIÇÃO do guia: conta de aluno recém-criada, sem currículo
    ainda. Ajuste as credenciais via env var PRISMA_ALUNO_NOVO_* se
    quiser rodar isso isoladamente com uma conta fresca."""
    email = os.environ.get("PRISMA_ALUNO_NOVO_EMAIL", ALUNO_A["email"])
    senha = os.environ.get("PRISMA_ALUNO_NOVO_SENHA", ALUNO_A["senha"])

    fazer_login(page, email, senha)
    page.get_by_text("Criar Currículo", exact=False).click()

    page.locator("input[name='nome_completo'], input[name='nome']").first.fill("Ana Teste Aluno")
    # preenche pelo menos uma formação acadêmica, se o formulário pedir
    formacao_input = page.locator("input[name*='formacao'], input[name*='curso']").first
    if formacao_input.count() > 0:
        formacao_input.fill("Sistemas para Internet")

    with page.expect_download(timeout=15000) as download_info:
        page.get_by_role("button", name=re.compile(TXT_SALVAR_GERAR_PDF, re.I)).click()

    assert download_info.value is not None, "Nenhum PDF foi baixado."
    expect(page.get_by_text(TXT_ALERTA_CRIACAO, exact=False)).to_be_visible(timeout=5000)


def test_tc14_editar_curriculo_existente(page):
    """Assume que TC-13 já rodou e o currículo existe."""
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])
    page.get_by_text("Meu Currículo", exact=False).click()

    telefone_input = page.locator("input[name='telefone']").first
    telefone_input.fill("(86) 98888-0001")

    with page.expect_download(timeout=15000):
        page.get_by_role("button", name=re.compile(TXT_SALVAR_GERAR_PDF, re.I)).click()

    expect(page.get_by_text(TXT_ALERTA_EDICAO, exact=False)).to_be_visible(timeout=5000)


# ============================================================
# TC-15 — Candidatura muda o texto do botão
# ============================================================

def test_tc15_botao_candidatura_muda_apos_clicar(page):
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])
    page.get_by_text("Vagas", exact=True).click()
    page.get_by_text("Empresa Teste LTDA", exact=False).first.click()  # abre a 1ª vaga da Empresa X, ajuste se preciso

    botao = page.get_by_role("button", name=re.compile(TXT_CANDIDATAR, re.I))
    if botao.count() == 0:
        pytest.skip("Aluno A provavelmente já se candidatou a essa vaga em um teste anterior.")

    botao.first.click()
    expect(page.get_by_text(TXT_CANDIDATURA_ENVIADA, exact=False)).to_be_visible(timeout=5000)


# ============================================================
# TC-18 — Logout limpa a sessão de verdade
# ============================================================

def test_tc18_logout_limpa_sessao(page):
    fazer_login(page, ALUNO_A["email"], ALUNO_A["senha"])
    page.get_by_text(TXT_SAIR, exact=True).click()
    page.wait_for_load_state("networkidle")

    assert "/login" in page.url, f"Esperava ir para /login após sair, mas URL é {page.url}"

    page.go_back()
    page.wait_for_load_state("networkidle")

    assert "/login" in page.url, (
        f"Depois do botão Voltar, a URL é {page.url} — o dashboard não deveria "
        f"estar acessível. Sessão pode não ter sido limpa de verdade (token no localStorage)."
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
