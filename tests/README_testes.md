# PRISMA — Testes Automatizados

Dois arquivos, gerados a partir do "Guia de Testes Manuais":

- **`test_backend_prisma.py`** — testa a API do Django direto (equivale ao
  `fetch(...)` que o guia manda rodar no Console do navegador).
- **`test_frontend_prisma.py`** — testa o que só dá pra ver na tela
  renderizada (React), usando um navegador controlado por Playwright.

## Cobertura

| Parte do guia | Casos | Onde está |
|---|---|---|
| 1 — Segurança (IDOR) | TC-01 a TC-05 | backend |
| 2 — Persistência de cadastro | TC-06 a TC-08 | backend |
| 3 — Gestor submete currículo | TC-09 a TC-11 | backend |
| 4 — Bugs do aluno | TC-12, TC-19 | frontend |
| 4 — Bugs do aluno | TC-13, TC-14, TC-15, TC-16, TC-17, TC-18 | TC-13/14/15/18 no frontend; TC-15/16/17 (parte de API) também no backend |
| 5 — Minhas Candidaturas | TC-20 a TC-23 | TC-20, TC-22 no frontend; TC-20, TC-21, TC-23 no backend |

## 1. Preparação (só uma vez — igual à Parte 0 do guia)

Suba backend e frontend, e crie manualmente pela própria tela do sistema:
Aluno A, Aluno B, Empresa X (com os valores sugeridos na tabela da Parte 0)
e o Gestor (via `createsuperuser` + admin, como não tem autocadastro).

## 2. Instalar dependências

```bash
pip install pytest requests playwright
playwright install chromium
```

## 3. Configurar variáveis de ambiente

Só é obrigatório o Gestor (não tem valor padrão possível, já que a conta
é provisionada manualmente):

```bash
export PRISMA_GESTOR_USERNAME="gestor_teste"
export PRISMA_GESTOR_SENHA="sua_senha_aqui"
```

Opcionais (se você usou valores diferentes dos sugeridos no guia, ou quer
apontar para outro ambiente):

```bash
export PRISMA_BASE_URL="http://127.0.0.1:8000"
export PRISMA_FRONTEND_URL="http://localhost:5173"
export PRISMA_ALUNO_A_EMAIL="aluno.a@teste.com"
export PRISMA_ALUNO_A_SENHA="Teste@123"
export PRISMA_ALUNO_B_EMAIL="aluno.b@teste.com"
export PRISMA_ALUNO_B_SENHA="Teste@123"
export PRISMA_EMPRESA_X_EMAIL="empresa.x@teste.com"
export PRISMA_EMPRESA_X_SENHA="Teste@123"

# só se o backend não conseguir descobrir sozinho o ID do currículo:
export PRISMA_ALUNO_A_RESUME_ID=1
export PRISMA_ALUNO_B_RESUME_ID=2

# só para rodar o TC-22 (estado vazio) — conta de aluno sem candidaturas:
export PRISMA_ALUNO_SEM_CANDIDATURA_EMAIL="aluno.c@teste.com"
export PRISMA_ALUNO_SEM_CANDIDATURA_SENHA="Teste@123"

# só se "ANALISE" não bater com o que o ApplicationSerializer espera
# (ver jobs/models.py — Application.STATUS_CHOICES) — usado no TC-21:
export PRISMA_STATUS_EM_ANALISE="ANALISE"
```

## 4. Rodar

```bash
# backend (não precisa de navegador)
pytest test_backend_prisma.py -v

# frontend (abre/usa o Chromium)
pytest test_frontend_prisma.py -v
```

## ✅ Status das rotas

Todas as rotas usadas nos testes de backend já foram confirmadas direto
no código (`urls.py`, `views.py`, `serializers.py`, `models.py`). Não
deveria ser necessário nenhum ajuste de rota — só rode.

O `test_frontend_prisma.py` continua com seletores baseados nos textos
do guia (`name` de inputs, botões por texto, etc.), já que não vimos o
JSX das telas. Se algum seletor não bater com o componente real, ajuste
no bloco `CONFIG` do arquivo.
