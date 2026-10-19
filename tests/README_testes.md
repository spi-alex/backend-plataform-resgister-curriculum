# PRISMA — Testes Automatizados

> Atualizado em **25 ago 2026**, junto com a rodada de correções de
> segurança. Se você conhecia a versão anterior deste arquivo, leia a
> seção "O que mudou" no fim.

O projeto tem **duas** baterias, com propósitos diferentes:

## A) Testes unitários — no backend, sem servidor

```bash
cd PRISMA_backend
python manage.py test
```

**80 testes.** Rodam em segundos, não precisam de servidor no ar, nem de
dados prévios, nem de navegador. **Comece sempre por aqui.**

| Módulo | Casos | Cobre |
|---|---|---|
| `users/tests.py` | 42 | Cadastro, confirmação de conta, login, recuperação de senha, revogação de sessão, cookie httpOnly, rate limiting, validadores de CPF/CNPJ |
| `users/tests_authz.py` | 38 | Autorização e IDOR: PDF de currículo, listagem por papel, posse de vagas, rotas de gestor, escalada de privilégio, exposição de dados, injeção via `content` |

## B) Testes de integração — nesta pasta, com os servidores no ar

| Arquivo | Casos | Precisa de |
|---|---|---|
| `test_backend_prisma.py` | 17 | Backend rodando |
| `test_seguranca_prisma.py` | 16 | Backend rodando |
| `test_frontend_prisma.py` | 11 | Backend + frontend + Playwright |
| `checklist_publicacao.py` | 18 | Backend + frontend + Playwright |

Cobrem o que os unitários não alcançam: o acoplamento HTTP real (cookies,
cabeçalhos, status) e o comportamento no navegador.

### `checklist_publicacao.py` — pré-publicação

Roda como script (não é pytest):

```bash
cd tests
python checklist_publicacao.py
```

Não testa regra de negócio. Verifica o que quebra **ao publicar**: rolagem
horizontal no celular (viewport 360 px), envio de formulário por Enter,
tela 404, favicon, OG image, títulos/descriptions por rota e links
internos. Sai com código 1 em caso de falha.

O relatório completo dessa rodada, com o que foi corrigido e o que ainda
depende de domínio/hospedagem, está em `docs/CHECKLIST_PUBLICACAO.md`.

### Cobertura por parte do Guia de Testes

| Parte do guia | Casos | Onde está |
|---|---|---|
| 1 — Segurança (IDOR) | TC-01 a TC-05 | `test_backend_prisma.py` |
| 2 — Persistência de cadastro | TC-06 a TC-08 | `test_backend_prisma.py` |
| 3 — Gestor submete currículo | TC-09 a TC-11 | `test_backend_prisma.py` |
| 4 — Bugs do aluno | TC-12 a TC-19 | frontend e backend |
| 5 — Minhas Candidaturas | TC-20 a TC-23 | frontend e backend |
| **6 — Sessão e senha** *(novo)* | — | `test_seguranca_prisma.py` |

---

## Preparação

### 1. Instale as dependências

```bash
pip install pytest requests playwright
playwright install chromium
```

### 2. Monte o cenário — **um comando**

```bash
cd PRISMA_backend
python manage.py seed_testes
```

Isso cria (ou atualiza, sem duplicar):

- **Aluno A** e **Aluno B**, com currículo, contas **ativas**
- **Empresa X**, com CNPJ válido e **uma vaga ativa**
- **Gestor**

e limpa candidaturas antigas, para os casos que exigem "ainda não há
candidatura" (TC-03) voltarem ao estado inicial.

> Antes, a "Parte 0" precisava ser feita à mão pela interface — o que ficou
> impraticável depois que o cadastro passou a exigir confirmação por e-mail.
> O comando recusa rodar com `DEBUG=False`.

### 3. Suba os servidores

```bash
# terminal 1
cd PRISMA_backend && python manage.py runserver localhost:8000

# terminal 2
cd Prisma_frontend && npm run dev
```

> Use **`localhost`**, não `127.0.0.1`. O cookie do refresh token é
> `SameSite=Lax`; cookies ignoram a porta ao decidir o que é "mesmo site",
> mas `localhost` e `127.0.0.1` são **hosts diferentes**. Misturar os dois
> faz a sessão morrer a cada recarga.

### 4. Configure as variáveis e rode

**Windows (PowerShell):**
```powershell
cd tests
$env:PRISMA_ALUNO_A_SENHA="TesteSenha@123"
$env:PRISMA_ALUNO_B_SENHA="TesteSenha@123"
$env:PRISMA_EMPRESA_X_SENHA="TesteSenha@123"
$env:PRISMA_GESTOR_USERNAME="gestor.teste@teste.com"
$env:PRISMA_GESTOR_SENHA="TesteSenha@123"
pytest -v
```

**Linux / macOS:**
```bash
cd tests
export PRISMA_ALUNO_A_SENHA="TesteSenha@123"
export PRISMA_ALUNO_B_SENHA="TesteSenha@123"
export PRISMA_EMPRESA_X_SENHA="TesteSenha@123"
export PRISMA_GESTOR_USERNAME="gestor.teste@teste.com"
export PRISMA_GESTOR_SENHA="TesteSenha@123"
pytest -v
```

Para rodar só uma parte:

```bash
pytest test_seguranca_prisma.py -v      # sessão e senha
pytest test_backend_prisma.py -v        # o guia original
pytest test_frontend_prisma.py -v       # navegador
```

---

## Variáveis de ambiente

| Variável | Padrão | Observação |
|---|---|---|
| `PRISMA_BASE_URL` | `http://localhost:8000` | API |
| `PRISMA_FRONTEND_URL` | `http://localhost:5173` | Interface |
| `PRISMA_ALUNO_A_EMAIL` / `_SENHA` | `aluno.a@teste.com` / `TesteSenha@123` | |
| `PRISMA_ALUNO_B_EMAIL` / `_SENHA` | `aluno.b@teste.com` / `TesteSenha@123` | |
| `PRISMA_EMPRESA_X_EMAIL` / `_SENHA` | `empresa.x@teste.com` / `TesteSenha@123` | |
| `PRISMA_GESTOR_USERNAME` / `_SENHA` | — | **Obrigatório** |
| `PRISMA_HEADLESS` | `true` | `false` abre o navegador visível |

---

## Resultados esperados

Com o cenário recém-semeado e os servidores no ar:

```
test_backend_prisma.py     17 passed
test_seguranca_prisma.py   15 passed, 1 skipped
test_frontend_prisma.py     9 passed, 2 skipped
```

Os `skipped` são precondições de dados, não falhas. As mensagens dizem
exatamente o que fazer.

---

## Quando algo pula ou falha

### "Throttle atingido (429)"

**É a proteção funcionando.** Login e reset recusam depois de N tentativas
por minuto. Rodar a bateria várias vezes seguidas esgota o limite.
**Espere um minuto.**

### "A conta está PENDENTE de confirmação"

O cadastro não ativa mais a conta sozinho. Rode `manage.py seed_testes`, ou
marque `status='ativo'` no admin do Django.

### "Nenhuma vaga ATIVA na plataforma"

O aluno só enxerga vagas com `is_active=True`, e o TC-16 **encerra** a vaga
como parte do que ele testa. Rode `manage.py seed_testes` de novo para
reativá-la.

### "A Empresa X JÁ tem uma candidatura do Aluno A"

O TC-03 cria uma candidatura e não a desfaz. Rode `manage.py seed_testes`
para limpar. *(A mesma verificação, em forma idempotente, está em
`users/tests_authz.py::PdfIdorTests`.)*

### Login falha com 401

A senha das contas não bate. Rode `manage.py seed_testes`, que redefine
todas para o mesmo valor.

---

## O que mudou em 25 ago 2026

A rodada de segurança alterou coisas que quebravam a bateria antiga:

| Mudança | Efeito nos testes |
|---|---|
| **Conta nasce `pendente`** | O cadastro não devolve mais token; é preciso confirmar. `seed_testes` já cria contas ativas. |
| **Senha mínima de 10 caracteres** | `Teste@123` (9) passou a ser recusada. O padrão virou `TesteSenha@123`. |
| **Refresh em cookie `httpOnly`** | Não vem mais no corpo do login. Quem renova sessão usa `requests.Session()`. |
| **Rate limiting** | O helper `login()` deixou de varrer combinações de rota × campo — quatro tentativas por login estouravam o limite. |
| **`/api/token/` endurecida** | Deixou de ser um caminho paralelo sem travas. |
| **Logout assíncrono** | Chama o servidor para revogar antes de redirecionar. TC-18 usa `wait_for_url`, não `networkidle`. |

E corrigiram-se problemas dos próprios testes:

- **TC-03 não era idempotente** — criava uma candidatura e nunca a desfazia,
  então a segunda execução falhava com `assert 200 == 403`. Parecia um furo
  de autorização; era resíduo. Agora vira `skip` explicativo.
- **TC-13/TC-14 checavam `alert()` com `get_by_text`** — `alert()` não é DOM,
  então isso nunca poderia passar. Agora capturam o evento `dialog`.
- **Seletores não batiam com o JSX real** — `input[name='nome_completo']` em
  vez de `fullName`, `telefone` em vez de `phone`, e o nome de uma empresa
  fixo no código para abrir uma vaga.
- **TC-18 usava `go_back()`** — o logout usa `location.replace`, que não
  deixa entrada de histórico. Agora navega pela URL, o que é mais rigoroso.
