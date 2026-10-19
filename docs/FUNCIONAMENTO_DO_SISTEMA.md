# PRISMA — Como o sistema funciona

> Documento técnico de referência. Explica cada parte do sistema, com foco
> especial na **recuperação de senha** (seção 4), que é o fluxo mais delicado
> e o que mais mudou.
>
> Última atualização: **25 de agosto de 2026**.

---

## Sumário

1. [Visão geral e arquitetura](#1-visão-geral-e-arquitetura)
2. [Cadastro e confirmação de conta](#2-cadastro-e-confirmação-de-conta)
3. [Login e sessão](#3-login-e-sessão)
4. [Recuperação de senha — em detalhe](#4-recuperação-de-senha--em-detalhe)
5. [Autorização: quem pode ver o quê](#5-autorização-quem-pode-ver-o-quê)
6. [Currículos e PDF](#6-currículos-e-pdf)
7. [Vagas e candidaturas](#7-vagas-e-candidaturas)
8. [E-mails](#8-e-mails)
9. [Configuração e variáveis de ambiente](#9-configuração-e-variáveis-de-ambiente)
10. [Como rodar os testes](#10-como-rodar-os-testes)
11. [O que ainda não está resolvido](#11-o-que-ainda-não-está-resolvido)

---

## 1. Visão geral e arquitetura

O PRISMA tem duas metades que conversam por HTTP:

| Parte | Pasta | Tecnologia | Porta (dev) |
|---|---|---|---|
| API | `PRISMA_backend/` | Django 5.2 + Django REST Framework | `8000` |
| Interface | `Prisma_frontend/` | React 19 + Vite + TypeScript | `5173` |

O banco em desenvolvimento é SQLite (`db.sqlite3`). Não há estado de sessão
no servidor: a autenticação é por **JWT**, com uma camada de revogação
própria (seção 3).

### Os três perfis

| Papel (`User.role`) | Como a conta nasce | O que faz |
|---|---|---|
| `aluno` / `candidate` | Autocadastro pela tela | Cria currículo, vê vagas, candidata-se, acompanha candidaturas |
| `company` / `empresa` | Autocadastro pela tela | Publica vagas, vê candidatos das *suas* vagas, baixa currículos de quem se candidatou |
| `gestor` | **Provisionamento manual** (admin do Django / `createsuperuser`) | Vê tudo: currículos, vagas, empresas, relatórios; exporta currículos em lote; submete currículos para vagas |

> **`gestor` não tem autocadastro, de propósito.** O endpoint público de
> cadastro aceita apenas os papéis em `SELF_REGISTER_ROLES`
> (`users/views.py`). Qualquer outro valor enviado em `role` — inclusive
> `"gestor"` — é silenciosamente rebaixado para `candidate`.

### Apps do backend

```
users/      contas, perfis, autenticação, códigos de segurança, rotas do gestor
companies/  cadastro e perfil da empresa
jobs/       vagas e candidaturas (Application)
resumes/    currículos (Resume) e exportação em ZIP
pdf/        geração do PDF do currículo (WeasyPrint) + regra de acesso
core/       settings e roteamento raiz
```

---

## 2. Cadastro e confirmação de conta

### O fluxo

```
  Usuário preenche o formulário
            │
            ▼
  POST /api/users/register/
            │
            ├── valida o captcha (django-simple-captcha)
            ├── normaliza o e-mail (minúsculas) e recusa duplicado
            ├── valida a senha (mín. 10 caracteres + validadores do Django)
            ├── valida CPF/CNPJ por dígito verificador
            ├── cria User com status = 'pendente'
            ├── grava Profile / Company com TODOS os dados do formulário
            └── emite um SecurityCode de confirmação e o envia por e-mail
            │
            ▼
  Resposta 201 — SEM token nenhum
            │
            ▼
  Usuário abre o e-mail e vai para /confirmar-cadastro
            │
            ▼
  POST /api/users/confirm/  { email, pin: <código de 6 dígitos> }
            │
            ├── valida o código (uso único, 15 min, máx. 5 tentativas)
            ├── status: 'pendente' → 'ativo'
            └── devolve access token + grava o cookie de refresh
```

### Os dois números que o usuário recebe

O e-mail de boas-vindas traz **dois números de 6 dígitos**, e é importante
não confundi-los — a confusão entre eles era exatamente a falha de desenho
que este documento registra:

| | **Matrícula** (`User.pin`) | **Código de confirmação** (`SecurityCode`) |
|---|---|---|
| Para que serve | Entrar no sistema, no lugar do e-mail | Ativar a conta, uma única vez |
| Dura quanto | Para sempre | 15 minutos |
| Pode ser reusado | Sim, sempre | Não, uma vez só |
| Onde fica guardado | Em texto puro (é um identificador) | **Hash** (é um segredo) |
| Aparece na tela | Sim, no perfil do usuário | Não, nunca |

### Estados da conta (`User.status`)

| Estado | Significado | Consegue logar? |
|---|---|---|
| `pendente` | Cadastrou-se, não confirmou o e-mail | **Não** |
| `ativo` | Confirmada | Sim |
| `inativo` | Desativada pelo gestor | **Não** — e as sessões abertas também caem |

---

## 3. Login e sessão

### Login

`POST /api/users/login/` com `{ "username": <e-mail OU matrícula>, "password": ... }`

O campo chama-se `username` mas aceita as duas coisas: `EmailOrPinBackend`
(`users/backends.py`) procura o usuário por e-mail **ou** por PIN.

A resposta traz:

```json
{
  "access": "<JWT, validade 30 min>",
  "role": "aluno",
  "name": "Fulano de Tal",
  "id": 42,
  "email": "fulano@exemplo.com"
}
```

O **refresh token não vem no corpo**. Ele é gravado num cookie `httpOnly`
chamado `prisma_refresh`, que o JavaScript da página não consegue ler.

### Onde cada token vive

```
  ┌─────────────────── navegador ───────────────────┐
  │                                                  │
  │  access token   →  variável em memória           │  ← some ao fechar/recarregar
  │                    (services/authToken.ts)       │
  │                                                  │
  │  refresh token  →  cookie httpOnly               │  ← JavaScript não enxerga
  │                    (invisível para o JS)         │
  │                                                  │
  │  auth_user      →  localStorage                  │  ← nome/e-mail/papel, não é credencial
  │                                                  │
  └──────────────────────────────────────────────────┘
```

**Por que assim.** Antes, os dois tokens ficavam em `localStorage`. Qualquer
XSS na aplicação lia ambos com uma linha de JavaScript. O access token vale
30 minutos, o que já é ruim; o **refresh valia 1 dia** e permitia gerar
access tokens novos o tempo todo — um XSS de um segundo virava acesso
persistente à conta.

**Por que funciona em dev sem HTTPS.** Cookies **ignoram a porta** ao decidir
o que é "mesmo site". `localhost:5173` e `localhost:8000` são o mesmo site,
então `SameSite=Lax` basta — não é preciso `SameSite=None; Secure`.
⚠️ A pegadinha é `localhost` vs `127.0.0.1`, que são **hosts diferentes**:
por isso o `.env` do frontend aponta para `localhost:8000` e você deve abrir
o site em `http://localhost:5173`.

### Recarregar a página

Como o access token vive só em memória, um F5 o apaga. No boot, o
`AuthProvider` (`context/Authcontext.tsx`) chama
`POST /api/users/token/refresh/` — o navegador envia o cookie sozinho — e
recupera um access token novo. O usuário não percebe nada.

Se esse refresh falhar (cookie expirado ou revogado), a sessão é encerrada e
o usuário vai para `/login`.

### Revogação — o logout que funciona de verdade

`SIMPLE_JWT` não tem blacklist ligada, então nada invalidava um token já
emitido: logout, troca de senha e desativação de conta não surtiam efeito
nenhum sobre sessões abertas.

A solução está em `users/authentication.py`:

- `User.sessions_revoked_at` guarda o instante da última revogação;
- `RevocableJWTAuthentication` compara o `iat` (instante de emissão) de cada
  token com esse campo e recusa (401) qualquer token mais antigo;
- a mesma classe recusa tokens de conta que não esteja `ativo`.

Isso é acionado em três lugares:

| Ação | Efeito |
|---|---|
| `POST /api/users/logout/` | Revoga **todas** as sessões e apaga o cookie |
| Reset de senha concluído | Revoga todas as sessões |
| `status` deixa de ser `ativo` | Tokens existentes param de funcionar |

### A rota `/api/token/`

Existe por compatibilidade e aponta para **as mesmas views endurecidas** de
`/api/users/login/` e `/api/users/token/refresh/`.

> Ela usava as views genéricas do SimpleJWT, o que a tornava um **login
> paralelo sem travas**: não checava o status da conta (uma conta `pendente`
> logava normalmente por ali, anulando a confirmação de e-mail), não tinha
> rate limiting, e devolvia o refresh token no corpo.

---

## 4. Recuperação de senha — em detalhe

Esta é a seção que interessa mais. Ela responde três perguntas: **como
funciona**, **por que o desenho anterior não era bom o suficiente**, e
**como testar**.

### 4.1 Como funciona hoje

O fluxo tem dois passos, ambos públicos:

```
  PASSO 1 — pedir o código
  ────────────────────────
  POST /api/users/password-reset/   { "email": "fulano@exemplo.com" }

    ├── procura a conta pelo e-mail
    ├── SE existir:
    │     ├── invalida todos os códigos de reset anteriores dessa conta
    │     ├── sorteia um código de 6 dígitos (CSPRNG)
    │     ├── grava o HASH do código, com validade de 15 min
    │     └── envia o código por e-mail
    └── responde SEMPRE a mesma coisa, exista a conta ou não:
          { "message": "Se este e-mail estiver cadastrado,
                        as instruções foram enviadas." }


  PASSO 2 — usar o código
  ───────────────────────
  POST /api/users/password-reset-confirm/
       { "email": ..., "pin": "<código>", "new_password": "..." }

    ├── localiza o código ativo mais recente da conta
    ├── confere em tempo constante (comparação de hash)
    │     └── errou? incrementa o contador; 5 erros QUEIMAM o código
    ├── checa validade (15 min) e se já foi usado
    ├── aplica a política de senha (mín. 10 caracteres etc.)
    ├── marca o código como usado
    ├── troca a senha
    ├── REVOGA todas as sessões abertas da conta
    └── envia e-mail avisando da alteração
```

### 4.2 As cinco camadas de proteção

O código tem 6 dígitos — 1 milhão de combinações. Isso, sozinho, não é
muito. O que torna o fluxo seguro é a combinação de camadas:

| # | Camada | O que faz | Onde está |
|---|---|---|---|
| 1 | **Throttle por IP** | 5 tentativas/min por endereço de origem | `users/throttles.py` |
| 2 | **Throttle por conta alvo** | 5 tentativas/min por e-mail, **independentemente do IP** | `users/throttles.py` |
| 3 | **Contador por código** | 5 erros **queimam** o código permanentemente | `SecurityCode.attempts` |
| 4 | **Validade** | 15 minutos | `SecurityCode.expires_at` |
| 5 | **Uso único** | O código morre ao ser usado, e um pedido novo mata o anterior | `SecurityCode.used_at` |

**A camada 3 é a que realmente resolve.** As camadas 1 e 2 são por
requisição e podem ser contornadas por quem tem muitos IPs (proxy, VPN,
botnet). A camada 3, não: ela acompanha o *código*, não a origem. Um
atacante com mil máquinas ainda só tem 5 chutes por código emitido —
5 em 1 milhão, ou 0,0005% de chance por ciclo. E cada ciclo novo exige um
novo pedido, que dispara um e-mail de alerta para a vítima.

### 4.3 O que havia antes, e por que não servia

O desenho anterior usava o **`User.pin`** como código de recuperação. Cinco
problemas, do mais grave ao menos:

**① O "segredo" era exibido na tela.**
O PIN é a **matrícula** do usuário: aparece no perfil dele, é aceita como
credencial de login, e é um número que ele compartilha naturalmente. Quem
visse a matrícula de alguém — um colega olhando a tela, uma foto de tela num
grupo, um print num chamado de suporte — podia trocar a senha dessa pessoa.
Um token de recuperação não pode ser um dado que o sistema mostra.

**② Pedir um reset trocava a matrícula da vítima.**
`password_reset_request` fazia `user.pin = user.generate_unique_pin()`.
Qualquer pessoa, **sem estar autenticada**, podia trocar a matrícula de
qualquer usuário só sabendo o e-mail dele, quantas vezes quisesse. Isso é
negação de serviço no login por matrícula — e silenciosa, porque o usuário
só descobria ao tentar entrar.

**③ O código nunca expirava.**
Não havia campo de validade. Um e-mail de recuperação de seis meses atrás,
esquecido numa caixa de entrada, continuava valendo para sempre.

**④ Ficava em texto puro no banco.**
Um vazamento do `db.sqlite3` (que, aliás, não estava no `.gitignore`)
entregaria códigos válidos prontos para uso, junto de todos os e-mails.

**⑤ O reset desviava da política de senha.**
`set_password()` era chamado sem passar por `validate_password()`. Dava para
trocar a senha por `"1"` via API, mesmo com os validadores configurados.

### 4.4 O que mudou, item a item

| Antes | Agora |
|---|---|
| Código = `User.pin` (a matrícula, visível na tela) | Código próprio em `SecurityCode`, nunca exibido |
| Guardado em texto puro | Guardado como hash (mesmo algoritmo das senhas) |
| Nunca expirava | 15 minutos |
| Reusável indefinidamente | Uso único |
| Sem limite por código | 5 tentativas erradas queimam o código |
| Pedir reset trocava a matrícula da vítima | A matrícula **não é tocada** |
| Comparação com `==` | Comparação em tempo constante |
| Só throttle por IP | Throttle por IP **e** por conta alvo |
| Senha nova sem validação | Passa por `validate_password()` |
| Sessões abertas continuavam válidas | Todas as sessões são revogadas |

### 4.5 Como testar, na prática

#### a) Automatizado — a forma rápida (não precisa de servidor)

```bash
cd PRISMA_backend
python manage.py test users.tests.PasswordResetTests -v 2
```

São 11 testes que cobrem cada propriedade descrita acima. Os mais
interessantes:

| Teste | O que prova |
|---|---|
| `test_reset_does_not_change_user_pin` | Pedir reset não mexe na matrícula |
| `test_user_pin_is_not_accepted_as_reset_code` | A matrícula não vale como código |
| `test_code_is_stored_hashed` | O código não está em texto puro no banco |
| `test_expired_code_is_rejected` | A validade de 15 min é respeitada |
| `test_code_is_single_use` | O código morre depois de usado |
| `test_code_burns_after_max_attempts_regardless_of_ip` | Trocar de IP não ajuda o atacante |
| `test_reset_revokes_existing_sessions` | Trocar a senha derruba quem estava logado |
| `test_reset_response_does_not_reveal_account_existence` | Não dá para enumerar e-mails |

> **Como os testes leem um código que é guardado como hash?**
> Eles não leem: substituem o sorteio por um valor fixo
> (`patch.object(SecurityCode, "generate_code", return_value="424242")`),
> simulando "abrir o e-mail". O caminho do código no sistema continua sendo
> o real, hash incluído.

#### b) Automatizado — contra o servidor de verdade

```bash
# terminal 1
cd PRISMA_backend
python manage.py runserver localhost:8000

# terminal 2
cd tests
pytest test_seguranca_prisma.py -v
```

Cobre o acoplamento HTTP: cookies, cabeçalhos, códigos de status, e os
limites de tentativa disparando 429 de verdade.

#### c) Manual — passo a passo, com os olhos

Este é o roteiro para conferir você mesmo, sem confiar em teste nenhum.

**Preparação.** Suba backend e frontend e tenha uma conta ativa. Se não
tiver, crie o cenário pronto:

```bash
cd PRISMA_backend
python manage.py seed_testes
```

**Teste 1 — o caminho feliz**

1. Vá em `/esqueci-senha` e informe o e-mail.
2. Abra o e-mail. Ele traz um código de 6 dígitos e diz que vale 15 minutos.
3. Na tela seguinte, informe o código e a nova senha (mínimo 10 caracteres).
4. Espere: "Senha alterada com sucesso!" e um segundo e-mail de aviso.
5. Entre com a senha nova. Deve funcionar.

**Teste 2 — a matrícula não serve como código** *(o furo antigo)*

1. Entre na conta e anote a **matrícula** exibida no perfil.
2. Saia, vá em `/esqueci-senha`, peça o código.
3. Na tela de redefinição, digite a **matrícula** no lugar do código.
4. **Esperado:** "Código inválido, expirado ou e-mail incorreto."
   No desenho antigo, isso **trocava a senha**.

**Teste 3 — a matrícula não muda quando alguém pede seu reset**

1. Entre na conta e anote a matrícula.
2. Em outro navegador (ou anônimo), peça um reset para o seu e-mail.
3. Volte ao perfil e recarregue.
4. **Esperado:** a matrícula é a mesma. No desenho antigo, ela mudava — e
   qualquer estranho podia forçar isso repetidamente.

**Teste 4 — o código expira**

1. Peça um código e **não use**.
2. Espere 16 minutos.
3. Tente usá-lo. **Esperado:** recusado.

*(Para não esperar de verdade, encurte a validade: em
`users/models.py`, `SecurityCode.DEFAULT_TTL_MINUTES = 1`. Lembre de
desfazer.)*

**Teste 5 — o código serve uma vez só**

1. Peça um código e use-o para trocar a senha (sucesso).
2. Tente usar o **mesmo código** de novo. **Esperado:** recusado.

**Teste 6 — pedir de novo mata o código anterior**

1. Peça um código — anote-o (código **A**).
2. Peça outro sem usar o primeiro (código **B**).
3. Tente usar **A**. **Esperado:** recusado. Só **B** funciona.

**Teste 7 — as tentativas acabam**

1. Peça um código e anote-o.
2. Erre o código 5 vezes.
3. Agora tente com o código **certo**. **Esperado:** recusado — ele foi
   queimado. É preciso pedir um novo.

**Teste 8 — não dá para descobrir quais e-mails existem**

1. Peça reset para um e-mail cadastrado. Anote a resposta.
2. Peça para `naoexiste@qualquercoisa.com`. Anote a resposta.
3. **Esperado:** mensagem e código HTTP idênticos.

**Teste 9 — trocar a senha expulsa quem está logado**

1. Entre na conta no **navegador A** e deixe aberto.
2. No **navegador B** (anônimo), faça o reset de senha da mesma conta.
3. Volte ao navegador A e clique em qualquer coisa.
4. **Esperado:** cai para `/login`. Antes, o invasor continuaria dentro por
   até 30 minutos — justamente enquanto a vítima achava que tinha se
   protegido.

**Teste 10 — força bruta esbarra no limite**

1. Peça um código.
2. Erre 6 vezes seguidas, rápido.
3. **Esperado:** a partir da 6ª, HTTP **429 Too Many Requests**.

### 4.6 Resumo: a troca de PIN é boa o suficiente?

**O desenho antigo não era** — e o problema não era o tamanho do código, era
o acúmulo de funções: o mesmo número servia de identificador público, de
credencial de login e de token de recuperação. Um segredo que o sistema
exibe na tela não é um segredo.

**O desenho atual é adequado** para o contexto (sistema institucional de
currículos, com e-mail como canal de recuperação). Um código de 6 dígitos
com uso único, 15 minutos de validade e 5 tentativas por código dá ao
atacante uma chance de 5 em 1 milhão por ciclo — e cada ciclo avisa a
vítima por e-mail.

Se o projeto quiser subir mais um degrau, o caminho é o que a especificação
original descrevia: **link com token assinado** em vez de código digitado
(elimina a digitação e permite um token muito maior). Isso está registrado
na seção 11 como melhoria de conformidade, **não** como pendência de
segurança.

---

## 5. Autorização: quem pode ver o quê

A regra vale em três camadas, e só a última conta:

1. **Menu / interface** — esconde o que não interessa. Cosmético.
2. **`ProtectedRoute` (React)** — evita desenhar telas de outro papel.
   **Não é segurança**: quem controla o navegador controla isso.
3. **Backend** — a trava real. Revalida papel e propriedade a cada
   requisição, a partir do token.

### Matriz de acesso

| Recurso | Aluno | Empresa | Gestor |
|---|---|---|---|
| Próprio currículo | Ver / editar | — | — |
| Currículo de terceiros | **Não** | Só de quem se candidatou a uma vaga **dela** | Todos |
| PDF de currículo | Só o próprio | Só de candidatos **dela** | Todos |
| Vagas | Só as ativas (+ as que já se candidatou) | Só as **dela** | Todas |
| Candidatos de uma vaga | — | Só das vagas **dela** | — |
| Mudar status de candidatura | — | Só nas vagas **dela** | — |
| Exportar currículos em ZIP | **Não** | **Não** | Sim |
| Dashboard do gestor | **Não** | **Não** | Sim |

Cada linha desta tabela tem teste automatizado em
`PRISMA_backend/users/tests_authz.py` (38 casos).

### Onde cada trava mora

| Trava | Arquivo |
|---|---|
| Currículo por papel | `resumes/views.py` → `ResumeViewSet.get_queryset` |
| PDF do currículo | `pdf/views.py` → `_pode_acessar_curriculo` |
| Vaga por dono | `jobs/views.py` → `JobViewSet.get_queryset` |
| Candidatos / status | `jobs/views.py` → `candidates`, `update_status` |
| Rotas do gestor | `users/views.py` (checagem de `role`) e `IsGestor` |

---

## 6. Currículos e PDF

Um currículo por usuário (`Resume` tem `OneToOneField` com `User`). O grosso
dos dados fica em `Resume.content`, um **JSON livre** preenchido pelo
formulário do aluno; os campos usados nos filtros do gestor (`curso`,
`ano_ingresso`, `ano_conclusao`, `situacao`) são colunas de verdade.

### Geração do PDF

`GET /api/pdf/export/<id>/` → checa autorização → renderiza
`pdf/templates/pdf/resume_pdf.html` com WeasyPrint.

Duas notas:

- **XSS armazenado**: o `content` é texto livre do usuário renderizado como
  HTML. O template usa o autoescape padrão do Django e **não tem nenhum
  `|safe`** — é isso que impede que `<script>` no currículo vire markup.
  Coberto por `ResumeContentInjectionTests`.
- **Nome do arquivo**: o `username` (que é o e-mail digitado no cadastro) ia
  direto para o cabeçalho `Content-Disposition` entre aspas. Com aspas ou
  quebra de linha, dava injeção de cabeçalho; com `/` ou `..`, path traversal
  ao descompactar o ZIP do gestor. Hoje passa por `nome_arquivo_seguro()`.

### Exportação em lote (gestor)

`POST /api/resumes/gestor/export-zip/` com `{"resume_ids": [1, 2, 3]}`.

> ⚠️ Atenção: o diagnóstico anterior documentava esta rota como
> `/api/resumes/export-zip/`. O caminho correto é o acima
> (`resumes/urls.py`), e é o que o frontend usa.

> **Bug corrigido:** existiam duas funções gerando o PDF por caminhos
> diferentes. O download individual achatava o JSON corretamente, mas a
> exportação em lote passava `{'resume': resume}` a um template que não lê
> nenhuma variável com esse nome — **todo PDF dentro do ZIP saía em branco**.
> Hoje as duas rotas usam `montar_contexto()`.

---

## 7. Vagas e candidaturas

```
  Empresa cria vaga (Job)
        │
        ▼
  Aluno vê a vaga (só se is_active=True)
        │
        ▼
  POST /api/jobs/<id>/apply/    → cria Application (PENDENTE)
        │
        ├── Empresa acompanha em /api/jobs/<id>/candidates/
        ├── Empresa muda o status → dispara e-mail ao candidato
        └── Aluno acompanha em /api/jobs/my-applications/
```

Status possíveis: `PENDENTE`, `ANALISE`, `ENTREVISTA`, `APROVADO`,
`REPROVADO`.

**Detalhe do aluno:** ele só vê vagas ativas na *listagem*, mas continua
enxergando o **detalhe** de uma vaga já encerrada se tiver se candidatado a
ela — sem isso, uma vaga fechada depois da candidatura virava "vaga não
encontrada" para quem estava esperando resposta.

**Gestor submetendo currículos:** `POST /api/jobs/<id>/submit-resumes/` com
`{"resume_ids": [...]}` registra candidaturas em nome dos alunos.

---

## 8. E-mails

Todos os e-mails saem pelo **Resend**, via `users/emails.py`, sempre em
thread separada para não segurar a resposta HTTP.

| Quando | Conteúdo |
|---|---|
| Cadastro | Código de confirmação + matrícula |
| Pedido de reset | Código de recuperação |
| Senha alterada | Aviso de alteração |
| Novo login | Aviso de acesso |
| Status de candidatura mudou | Aviso ao candidato |

`EMAIL_BACKEND` continua apontando para o console no `settings.py`, mas é
apenas o padrão inerte do Django — **nada relevante passa por ele**.

> Os logs registram o destinatário **mascarado** (`fu***@exemplo.com`).
> Antes, cada envio imprimia o endereço completo: como todo cadastro, login
> e reset dispara um e-mail, o log do servidor virava uma lista de todos os
> e-mails da plataforma, num arquivo que costuma ter permissão bem mais
> frouxa que o banco.

---

## 9. Configuração e variáveis de ambiente

Copie `PRISMA_backend/.env.example` para `.env` e preencha.

| Variável | Padrão | Para que serve |
|---|---|---|
| `SECRET_KEY` | — | Chave do Django. **Obrigatória.** |
| `DEBUG` | `False` | Nunca `True` em produção |
| `ALLOWED_HOSTS` | *(vazio)* | Hosts liberados, separados por vírgula |
| `CORS_ALLOWED_ORIGINS` | `localhost:5173,127.0.0.1:5173` | Origens do frontend |
| `REFRESH_COOKIE_SAMESITE` | `Lax` | Só mude para `None` se front e back ficarem em **domínios** diferentes (exige HTTPS) |
| `RESEND_API_KEY` | — | Envio de e-mail |
| `CACHE_LOCATION` | *(vazio)* | Redis para o rate limiting em produção |
| `LOG_LEVEL` | `INFO` | Nível de log |

**Padrões seguros:** se `DEBUG` e `ALLOWED_HOSTS` não estiverem definidos, o
sistema assume o mais restritivo (`DEBUG=False`, nenhum host). Esquecer de
configurar falha para o lado seguro.

Com `DEBUG=False`, ligam automaticamente: `SECURE_SSL_REDIRECT`, HSTS,
cookies seguros, `X-Frame-Options: DENY` e `Referrer-Policy`.
`manage.py check --deploy` passa sem nenhum aviso.

> ⚠️ **Rate limiting em produção.** Os contadores ficam no cache do Django.
> Sem `CACHE_LOCATION`, usa-se `LocMemCache`, que é **por processo**: rodando
> com vários workers (gunicorn/uwsgi), cada um teria seu próprio contador e o
> limite efetivo viraria N × o configurado. **Configure um Redis
> compartilhado antes de subir com mais de um worker.**

### Frontend

`Prisma_frontend/.env`:

```
VITE_API_URL=http://localhost:8000/api/
```

Use `localhost`, **não** `127.0.0.1` — ver seção 3.

---

## 10. Como rodar os testes

### Testes unitários (rápidos, sem servidor)

```bash
cd PRISMA_backend
python manage.py test
```

**80 testes.** Não precisam de servidor nem de dados prévios.

| Módulo | Casos | Cobre |
|---|---|---|
| `users/tests.py` | 42 | Cadastro, confirmação, login, reset de senha, revogação de sessão, cookies, throttling, validadores de CPF/CNPJ |
| `users/tests_authz.py` | 38 | Autorização e IDOR: PDF, listagem de currículos, posse de vagas, rotas de gestor, escalada de papel, exposição de dados, injeção via `content` |

### Testes de integração (precisam dos servidores no ar)

```bash
# 1. prepare o cenário
cd PRISMA_backend
python manage.py seed_testes

# 2. suba o backend
python manage.py runserver localhost:8000

# 3. suba o frontend (outro terminal)
cd Prisma_frontend && npm run dev

# 4. rode a bateria (outro terminal)
cd tests
set PRISMA_ALUNO_A_SENHA=TesteSenha@123
set PRISMA_ALUNO_B_SENHA=TesteSenha@123
set PRISMA_EMPRESA_X_SENHA=TesteSenha@123
set PRISMA_GESTOR_USERNAME=gestor.teste@teste.com
set PRISMA_GESTOR_SENHA=TesteSenha@123
pytest -v
```

| Arquivo | Casos | Precisa de |
|---|---|---|
| `test_backend_prisma.py` | 17 | Backend |
| `test_seguranca_prisma.py` | 16 | Backend |
| `test_frontend_prisma.py` | 11 | Backend + frontend + Playwright |

`manage.py seed_testes` cria (de forma idempotente) Aluno A, Aluno B,
Empresa X com uma vaga **ativa**, o Gestor e os currículos. Ele também limpa
candidaturas antigas, para que os casos que exigem "ainda não há
candidatura" voltem ao estado inicial.

> **Sobre o rate limiting nos testes.** As rotas de login e reset agora
> recusam depois de N tentativas por minuto. Se você rodar a bateria inteira
> várias vezes seguidas, alguns casos vão pular com "Throttle atingido" —
> **isso é a proteção funcionando**, não um defeito. Espere um minuto.

### Verificações de produção

```bash
cd PRISMA_backend && python manage.py check --deploy   # sem avisos
cd Prisma_frontend && npm run lint && npm run build     # sem erros
```

---

## 11. O que ainda não está resolvido

Nada aqui é crítico. Em ordem de prioridade:

### Médio — SQLite em produção

Adequado para desenvolvimento. Antes de qualquer carga concorrente real,
migre para PostgreSQL. Com SQLite, escritas simultâneas travam o banco
inteiro.

### Médio — Rate limiting precisa de Redis com múltiplos workers

Ver o alerta na seção 9. Enquanto rodar com um único processo, o
`LocMemCache` dá conta.

### Baixo — Reset por link com token, em vez de código digitado

A especificação original descrevia um link com token de expiração; a
implementação usa código de 6 dígitos por e-mail. **É conformidade com o
documento, não segurança** — as cinco camadas da seção 4.2 cobrem o risco.
Um link permitiria um token muito maior e eliminaria a digitação.

### Baixo — E-mail não é único no banco

O cadastro impede duplicados e normaliza para minúsculas, e o backend de
login lida com duplicatas de forma determinística. Falta a restrição
`unique=True` no banco, que exigiria uma migração cuidadosa caso a base já
tenha duplicatas antigas.

### Baixo — `chunk` de 354 kB no build

Depois do fatiamento por biblioteca, o maior pedaço é o `recharts`
(354 kB), carregado apenas nos relatórios do gestor. Um `import()` dinâmico
por rota adiaria isso também para quem nunca abre relatórios.

---

## Apêndice — Mapa rápido de arquivos

### Backend

| Arquivo | O que faz |
|---|---|
| `users/models.py` | `User` (papel, status, matrícula), `SecurityCode`, `Profile` |
| `users/views.py` | Cadastro, confirmação, login, logout, reset de senha, rotas do gestor |
| `users/authentication.py` | JWT com revogação por usuário |
| `users/backends.py` | Login por e-mail **ou** matrícula |
| `users/cookies.py` | Cookie `httpOnly` do refresh token |
| `users/throttles.py` | Limites por IP e por conta alvo |
| `users/validators.py` | CPF e CNPJ por dígito verificador |
| `users/emails.py` | Envio via Resend, com destinatário mascarado no log |
| `users/management/commands/seed_testes.py` | Provisiona o cenário de testes |
| `pdf/views.py` | Geração do PDF e `_pode_acessar_curriculo` |
| `core/settings.py` | Configuração central |

### Frontend

| Arquivo | O que faz |
|---|---|
| `services/authToken.ts` | Access token em memória |
| `services/api.ts` | Axios com interceptors e renovação de sessão |
| `context/Authcontext.tsx` | Estado de autenticação, login, logout, refresh no boot |
| `components/ProtectedRoute.tsx` | Guarda de rota (experiência de uso, **não** segurança) |
| `pages/auth/password/` | Telas de recuperação de senha |
| `pages/auth/confirm/ConfirmAccount.tsx` | Confirmação de cadastro |
