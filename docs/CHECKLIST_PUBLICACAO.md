# PRISMA — Checklist de publicação

> Rodado em **6 de setembro de 2026**, na branch `teste-integracao-front`.
> Cobre os itens da lista "antes de subir seu site".
>
> Este arquivo tem duas partes:
>
> 1. **O que foi verificado e corrigido** — com a evidência de cada item.
> 2. **O que só você pode fazer** — os itens que dependem de domínio,
>    conta de hospedagem ou dados institucionais.

---

## Como reproduzir a verificação

A parte automatizável roda no navegador, com os dois servidores no ar:

```bash
# Terminal 1 — backend
cd PRISMA_backend
python manage.py runserver 8000

# Terminal 2 — frontend
cd Prisma_frontend
npm run dev

# Terminal 3 — checagens
cd PRISMA_backend
python manage.py check --deploy          # segurança do Django
python manage.py test                    # 80 testes unitários
cd ../Prisma_frontend
npm run lint && npm run build            # tipos, lint e tamanho do bundle
```

O roteiro de navegador está em `tests/checklist_publicacao.py` (18
verificações: viewport de celular, envio de formulário por Enter, 404,
favicon, OG image, títulos/descriptions e links):

```bash
pip install playwright && playwright install chromium
cd tests
python checklist_publicacao.py     # sai com código 1 se houver falha
```

Ele grava screenshots (`mobile-home.png`, `pagina-404.png`, …) e
`checklist-navegador.json` no diretório de execução — os dois estão no
`.gitignore`.

Um `[AVISO] Console` com um 401 é **esperado**: o roteiro faz um login com
credencial inválida de propósito para checar se a mensagem de erro aparece
na tela.

---

## Parte 1 — verificado e corrigido

### 1. Abrir no celular ✅

Testado em viewport **360 × 740** (Galaxy A, o aparelho mais comum no
Brasil), com `is_mobile` e touch, nas 8 rotas públicas. O critério foi
`scrollWidth > clientWidth`, isto é: **a página cria barra de rolagem
horizontal?** — o sintoma clássico de layout quebrado no celular.

Três bugs reais encontrados e corrigidos:

| Onde | O que acontecia | Correção |
|---|---|---|
| `pages/Initial/initial.css` | `width: 420px` fixo no box da home, **sem nenhuma media query no arquivo**. Em 360 px a primeira tela do site já abria cortada, com rolagem lateral. | `width: 100%` + `max-width: 420px`, padding lateral no container e alvo de toque de 44 px nos botões |
| `pages/auth/login/Login.css` | `height: 420px` fixo no card. Quando a mensagem de erro aparecia (ex.: "conta pendente de confirmação"), o conteúdo vazava para fora do card. Os três links do rodapé do card ficavam colados: lia-se "CadastrarEsqueci minha senha". | `min-height`; `flex-wrap` + `gap` nos links; card institucional escondido abaixo de 480 px (empurrava o formulário para fora da dobra) |
| `pages/auth/register/*/…css` | A linha do captcha (imagem + campo + botão 🔄) era um flex **inline no JSX sem `flex-wrap`**: ~400 px numa tela de 360 px, o botão 🔄 fora da viewport | `.captcha-container` movido para CSS com `flex-wrap: wrap` |

Também corrigido: `CurriculumPrevie.css` tinha `width: 210mm` (~794 px) na
prévia do currículo. O tamanho de folha A4 só importa na **impressão** — na
tela virava rolagem horizontal. Agora a tela usa `max-width` e um bloco
`@media print` devolve os 210 mm exatos para o PDF.

**Resultado final: 0 px de excesso horizontal nas 8 rotas públicas.**

### 2. Testar formulário ✅

Aqui estava o problema mais sério de usabilidade: **nenhuma das 6 telas de
autenticação usava `<form>`**. Os campos ficavam soltos em `<div>`s e o
botão disparava por `onClick`. Consequências concretas:

- **Enter não enviava.** O usuário digitava a senha, apertava Enter e nada
  acontecia.
- **No celular, o teclado nunca mostrava o botão de confirmar** — o
  "Ir"/"Go" só aparece quando o campo está dentro de um `<form>`.
- **O gerenciador de senhas do navegador não reconhecia os campos**, então
  não oferecia salvar nem preencher a senha. No cadastro, não sugeria gerar
  uma senha forte — apesar de o backend exigir 10 caracteres.

Corrigido em Login, Confirmar cadastro, Esqueci senha, Redefinir senha,
Cadastro de aluno e Cadastro de empresa: `<form onSubmit={…}>` com
`preventDefault`, botão `type="submit"` e `autoComplete` correto em cada
campo (`username`, `current-password`, `new-password`, `one-time-code`).
Nos campos de código, `inputMode="numeric"` faz o celular abrir o teclado
numérico direto.

Verificado no navegador: preencher e apertar **Enter** dispara
`POST /api/users/login/`, e credencial inválida exibe
"Email ou senha inválidos." na tela.

De brinde, dois problemas de acessibilidade no componente `Input`: o `id`
vinha de `name`, mas a maioria das telas não passava `name` — então o
`htmlFor` do label não apontava para nada (clicar em "Email" não focava o
campo, e leitor de tela anunciava um input sem rótulo). Agora usa `useId`
como fallback. O botão 🔄 do captcha, que era anunciado como "arrows
counterclockwise", ganhou `aria-label`.

**80/80 testes unitários do backend passando** — cobrem a validação
server-side de cadastro, confirmação, login e reset de senha.

### 3. Clicar no WhatsApp ⚠️ (não havia nada para clicar)

O projeto **não tinha nenhum link de WhatsApp** — nem quebrado, nem certo.
Criei a estrutura no rodapé (`SiteFooter`), que monta um link
`https://wa.me/…` a partir do número configurado em
`src/components/Layout/SiteFooter/dadosInstitucionais.ts`.

O comportamento padrão é **não mostrar o link** (`whatsapp: null`), de
propósito: link de WhatsApp quebrado é um dos erros mais comuns em site
recém-publicado. A função `linkWhatsApp()` também valida o formato (só
dígitos, mínimo 12 — `55` + DDD + número), porque o `wa.me` rejeita número
com espaço, parêntese ou `+`.

**Falta você preencher o número** — veja a Parte 2.

### 4. Página 404 ✅

A rota curinga era `<Route path="*" element={<Navigate to="/" replace />} />`:
**toda URL errada jogava o visitante na home sem dizer nada.** Dois
problemas:

- Um link de e-mail com typo (o link de confirmação de cadastro chegando
  quebrado) largava a pessoa na tela de escolha de perfil, e ela não tinha
  como saber que o link estava errado — só que "não funcionou".
- Com `replace`, o histórico era reescrito, e o Google via a home
  respondendo 200 para toda URL inexistente. Isso é um **soft 404**, que
  polui o índice.

Agora existe `pages/NotFound/`: mostra o endereço que falhou, oferece as
saídas certas (home, login) e — para o caso mais provável — aponta para
"confirmar cadastro" e "esqueci minha senha", onde se pede um código novo.
A URL errada é **preservada** (não redireciona), e a página é `noindex`.

### 6 e 19. HTTPS e configurações de segurança ✅

**Backend:** `python manage.py check --deploy` com `DEBUG=False` retorna
**"System check identified no issues"**. Confirmei que o check é sensível
rodando com `DEBUG=True`, que aponta 5 avisos — ou seja, o resultado limpo
é real, não silenciamento. O bloco `if not DEBUG` em `core/settings.py` já
liga `SECURE_SSL_REDIRECT`, HSTS, cookies `Secure`, `nosniff`,
`Referrer-Policy` e `X-Frame-Options: DENY`.

**Frontend:** o Django não cobre o HTML e os assets — eles são servidos por
outro servidor e não passam pelo `SecurityMiddleware`. Criei
`public/_headers` (formato Netlify / Cloudflare Pages) com:

- `Content-Security-Policy` restritiva — `default-src 'none'` e liberação
  item por item. Vale notar: `style-src` precisa de `'unsafe-inline'`
  porque várias telas usam o atributo `style=` do React;
- `Strict-Transport-Security` de 1 ano;
- `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` (câmera, microfone e geolocalização desligados —
  o app não usa nenhum);
- cache imutável em `/assets/*` (nomes com hash) e `must-revalidate` no
  `index.html`, para o deploy novo não ficar preso em cache.

**Também criei `public/_redirects`** com o fallback de SPA. Isso é
**obrigatório**: o projeto usa `BrowserRouter`, e sem a regra
`/* /index.html 200`, abrir `https://seu-dominio/login` direto (link colado
no WhatsApp, favorito, F5) devolve o 404 **da hospedagem**, não a tela 404
do PRISMA.

### 7. PageSpeed ✅ (−59% no primeiro carregamento)

Não consigo rodar o PageSpeed Insights porque ele precisa de uma URL
pública. Mas a causa raiz de nota baixa era mensurável localmente e foi
corrigida.

**O problema:** `AppRoutes.tsx` importava estaticamente todas as ~25 telas.
Como é a raiz da aplicação, o bundler colocava tudo no carregamento
inicial: **quem abria a tela de login baixava os três dashboards, incluindo
o `recharts` (354 kB), usado só nos relatórios do gestor.** Um aluno nunca
renderiza um gráfico.

**A correção:** `React.lazy` por rota. As telas públicas (home, login,
escolha de perfil) seguem estáticas de propósito — são a porta de entrada,
e deixá-las sob lazy só adicionaria uma ida-e-volta de rede antes do
primeiro conteúdo aparecer.

| | Antes | Depois |
|---|---|---|
| Primeiro carregamento (bruto) | 789 kB | **288 kB** |
| Primeiro carregamento (gzip) | 231 kB | **95 kB** (−59%) |
| Chunk da aplicação | 200 kB | **22 kB** |

O chunk da aplicação caiu de 200 kB para 22 kB por causa de um segundo
ajuste, em `vite.config.ts`: `manualChunks` listava `'react-dom'`, mas
`main.tsx` importa `react-dom/client`. O Rollup tratava os dois como
módulos diferentes e o corpo do react-dom acabava **dentro** do chunk da
aplicação — justamente o que muda a cada deploy, invalidando ~140 kB de
biblioteca estável em toda publicação. Adicionando `'react-dom/client'` à
lista, o react-dom fica no chunk cacheável.

### 8. Comprimir imagens ✅

O projeto **não tem nenhuma imagem de produto** — nem foto, nem ilustração,
nem logo em bitmap. As duas únicas imagens do build são as que criei:

| Arquivo | Tamanho |
|---|---|
| `favicon.svg` | 0,6 kB |
| `og-image.png` | 14,8 kB (era 33,4 kB) |

A OG image caiu 56% com quantização para paleta de 128 cores — a imagem é
fundo chapado mais texto, então não há perda visível. (De todo modo ela só
é baixada por crawler de rede social, nunca no carregamento da página.)

A imagem do captcha vem do backend em tempo real e não passa pelo build.

### 9. Favicon ✅

O `<link rel="icon">` apontava para **`/vite.svg`** — o logo padrão do
Vite. A aba do navegador e o atalho na tela inicial do celular mostravam a
marca da ferramenta de build, não a do projeto.

Criei `public/favicon.svg` com a marca do PRISMA na paleta do app (prisma
triangular, raio branco entrando, espectro saindo), removi o `vite.svg` e
adicionei `apple-touch-icon` e `theme-color`. Verificado: responde 200.

### 10. OG Image ✅

Não existia nenhuma tag Open Graph — **um link do PRISMA colado no
WhatsApp aparecia como texto cru, sem título nem imagem.**

Criei `public/og-image.png` (1200 × 630, a proporção que WhatsApp,
LinkedIn e Facebook esperam) e o conjunto completo de tags: `og:type`,
`og:site_name`, `og:locale`, `og:url`, `og:title`, `og:description`,
`og:image` com `width`/`height`/`alt`, mais `twitter:card`
(`summary_large_image`).

Importante: `og:image` e `og:url` **precisam ser URL absoluta** — crawler
de rede social ignora caminho relativo e o link fica sem preview. Por isso
elas usam o placeholder de domínio (veja Parte 2).

### 11. Sitemap.xml ✅

Criado `public/sitemap.xml` com as 5 rotas públicas. As telas de
`/dashboard/` ficam **de fora de propósito**: exigem login e não têm
conteúdo indexável.

### 13. Cookies ✅ (não precisa de banner)

Auditei o que o app grava no navegador:

- **`refresh_token`** — cookie `httpOnly`, gravado pelo backend
  (`users/cookies.py`), estritamente necessário para manter a sessão;
- **`localStorage`** — o objeto do usuário logado (nome, e-mail, papel);
- **Nenhum cookie de rastreamento, analytics ou publicidade.**

Cookie estritamente necessário é **dispensado de banner de consentimento**.
O que a LGPD exige nesse cenário é informação clara e canal do encarregado
— e isso está no rodapé novo.

⚠️ **Isso muda se você instalar o Google Analytics.** Aí passa a ser
obrigatório um banner que colete consentimento **antes** de o script
carregar. Não é o caso hoje.

### 14. Dados no rodapé ⚠️ (estrutura pronta, dados faltando)

O app **não tinha rodapé nenhum**. Uma tela que pede CPF sem dizer de quem
é o site tem exatamente o padrão visual de uma página de phishing.

Criei `SiteFooter`, montado nas rotas públicas (esconde-se sozinho em
`/dashboard/*`, onde cada dashboard tem seu próprio layout). Traz três
blocos: instituição (nome, CNPJ, endereço), contato (e-mail, telefone,
WhatsApp) e privacidade (finalidade do tratamento, e-mail do encarregado
LGPD, aviso de cookies).

Base legal de por que isso não é enfeite: **LGPD art. 41** (indicar o
encarregado e um canal de contato) e **Marco Civil art. 7º** (informação
clara sobre coleta e uso). O PRISMA guarda CPF, endereço e currículo
completo de aluno.

**Os dados são placeholder** (`[PREENCHER: …]`) — veja a Parte 2. Em
desenvolvimento o rodapé mostra um aviso vermelho enquanto houver
placeholder; o bloco é removido no build de produção pelo tree-shaking
(`import.meta.env.DEV`).

### 15. Robots.txt ✅

Criado `public/robots.txt`. Libera a área pública e bloqueia `/dashboard/`
e os fluxos por código (`/confirmar-cadastro`, `/redefinir-senha`,
`/esqueci-senha`).

Registrando o que isso **não** é: robots.txt não é controle de acesso. Quem
protege `/dashboard/` é o `ProtectedRoute` no front e a checagem de
permissão na API. O arquivo só evita que essas URLs entrem em índice de
busca.

### 16 e 17. Títulos e meta descriptions ✅

O `index.html` tinha `<title>`, mas **nenhuma `description`** — sem ela o
Google inventa o resumo a partir do primeiro texto da página, que aqui é
"Selecione seu tipo de usuário".

Pior: o PRISMA é uma SPA. O mesmo `index.html` é servido para **toda** URL,
então as ~25 rotas compartilhavam um único título. A aba do navegador dizia
"PRISMA — Currículos e vagas…" mesmo em "Minhas Candidaturas"; com várias
abas abertas (uso normal do gestor, que compara currículos) era impossível
saber qual era qual. Para busca, `/login` e `/cadastro` apareciam como
páginas duplicadas.

Criei `hooks/usePageMeta.ts` + a tabela `routes/metaPorRota.ts`, aplicados
por `<RouteMeta />` — um só componente montado no `AppRoutes`, em vez de
espalhar a mesma chamada por 25 arquivos. Cada rota tem título próprio;
as públicas têm description escrita para o resultado de busca; a área
logada e os fluxos por código são `noindex`. O `canonical` também acompanha
a URL atual (antes toda rota se declarava canônica como a home).

Sem biblioteca nova — `react-helmet` seria um pacote no bundle para
resolver três linhas de DOM.

Verificado: **9 rotas, 9 títulos distintos, todas com description.**

Também corrigido: `<html lang="en">` num site 100% em português. Leitor de
tela lia os textos com fonemas de inglês e o Google classificava o idioma
errado. Agora é `pt-BR`.

### 18. Clicar nos links ✅

Duas verificações:

1. **Estática:** extraí todos os `to=`, `href=` e `navigate()` do código e
   cruzei com a tabela de rotas. Os 24 destinos existem — nenhum link
   morto.
2. **No navegador:** naveguei os 10 links internos das 8 rotas públicas.
   Nenhum cai em 404, e **nenhum erro de console/JS** nas rotas públicas.

**Encontrei um bloqueador de deploy sem relação com links quebrados, mas
que só apareceria em produção:** as duas telas de cadastro tinham
`http://127.0.0.1:8000` **fixo no código-fonte** para buscar e exibir a
imagem do captcha. Em produção isso quebra o cadastro por completo:

- `127.0.0.1` é a máquina de quem está navegando, não o servidor — a
  imagem simplesmente não carrega;
- o esquema é `http://` — uma página servida por HTTPS tem esse pedido
  **bloqueado pelo navegador** como conteúdo misto, sem nem chegar à rede.

Corrigido: `services/api.ts` agora exporta `BACKEND_ORIGIN`, derivado de
`VITE_API_URL` (a mesma variável que o axios já usa), então a URL acompanha
o ambiente automaticamente.

---

## Parte 2 — o que só você pode fazer

Estes cinco itens dependem de domínio, conta de hospedagem ou dados que eu
não tenho. Estão em ordem de dependência.

### 5. Domínio próprio ⬜

Registre o domínio, depois rode **um comando** para propagá-lo pelos 15
lugares onde ele aparece (4 arquivos):

```bash
cd Prisma_frontend
npm run definir-dominio prisma.seudominio.br api.prisma.seudominio.br
```

(Se front e API ficarem no mesmo domínio, passe só o primeiro argumento.)

Fiz esse script porque trocar na mão quase garante esquecer um lugar — e
cada esquecimento falha de um jeito silencioso e diferente:

| Esquecido | Sintoma |
|---|---|
| `og:image` | link compartilhado sai sem imagem |
| `canonical` | o Google indexa o domínio errado |
| `sitemap.xml` | o Search Console rejeita o arquivo inteiro |
| CSP em `_headers` | **o login para de funcionar** — o navegador bloqueia a chamada para a API |

Depois ajuste as variáveis de ambiente (o script imprime a lista):

```bash
# Prisma_frontend/.env
VITE_API_URL=https://api.prisma.seudominio.br/api/

# PRISMA_backend/.env
DEBUG=False
ALLOWED_HOSTS=api.prisma.seudominio.br
CORS_ALLOWED_ORIGINS=https://prisma.seudominio.br
```

⚠️ **Se front e API ficarem em domínios diferentes**, o cookie de refresh
precisa de `REFRESH_COOKIE_SAMESITE=None` — e `None` só funciona com HTTPS.
Com front e API no mesmo domínio, mantenha `Lax`. Errar isso derruba a
sessão a cada F5.

### 6. HTTPS ⬜ (a parte do servidor)

O código já está pronto (item 6 da Parte 1). Falta emitir o certificado —
Let's Encrypt via Certbot, ou o certificado automático do host (Netlify,
Vercel, Cloudflare Pages já fazem isso sozinhos).

Depois de publicar, confirme em <https://www.ssllabs.com/ssltest/> —
a meta é nota **A**.

Se o host não for Netlify/Cloudflare Pages, `_headers` e `_redirects` são
ignorados e você precisa do equivalente. Para **nginx**:

```nginx
# Fallback de SPA — sem isto, /login direto devolve 404 do nginx
location / {
    try_files $uri $uri/ /index.html;
}

# Assets com hash: cache imutável
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Para **Vercel**, crie `Prisma_frontend/vercel.json` com `rewrites`
(`/(.*)` → `/index.html`) e `headers`. Copie os valores de `public/_headers`.

### 7. PageSpeed ⬜ (a medição)

Com o site no ar: <https://pagespeed.web.dev/>. Rode na aba **Mobile**, que
é a que conta para o ranking do Google.

Dois pontos para olhar com atenção, porque não dependem do código:

- **Compressão no servidor.** Os 288 kB do primeiro carregamento só viram
  95 kB se o host servir gzip ou brotli. Netlify/Vercel/Cloudflare fazem
  por padrão; nginx precisa de `gzip on` (ou `brotli on`) explícito.
- **Hospedagem.** O TTFB é o que sobra depois de todo o resto estar
  otimizado. Prefira CDN com nó no Brasil.

### 12. Google Analytics ⬜ (decisão sua)

Não instalei, de propósito — precisa do seu ID de medição (`G-XXXXXXXXXX`)
e, mais importante, **muda a situação legal do item 13**.

O PRISMA hoje não tem cookie de rastreamento. Ao adicionar o GA você passa
a precisar de um **banner de consentimento que bloqueie o script até o
usuário aceitar** — não só um aviso informativo. Num sistema que já guarda
CPF e currículo de aluno, vale decidir isso conscientemente:

- **Se o objetivo é saber quantas pessoas usam o sistema**, o backend já
  tem os dados (cadastros, logins, candidaturas) sem cookie nenhum e sem
  mandar dado de aluno para um terceiro.
- **Se o objetivo é medir a divulgação** (de onde vêm os visitantes que
  chegam à home), o GA faz sentido — e aí me diga que eu instalo junto com
  o banner de consentimento funcionando.

### 14. Dados no rodapé ⬜ (preencher)

Edite **um arquivo**:
`Prisma_frontend/src/components/Layout/SiteFooter/dadosInstitucionais.ts`

| Campo | O que colocar |
|---|---|
| `instituicao` | nome da mantenedora, como no registro |
| `cnpj` | CNPJ (ou `null`) |
| `endereco` | rua, número, bairro, cidade/UF (ou `null`) |
| `emailSuporte` | e-mail de suporte ao usuário |
| `emailEncarregadoLgpd` | canal do encarregado — **exigido pela LGPD art. 41** |
| `telefone` | telefone (ou `null` para esconder) |
| `whatsapp` | número internacional só com dígitos, ex.: `"5585999998888"` (ou `null`) — **item 3 da lista** |

Enquanto houver `[PREENCHER: …]`, o rodapé mostra um aviso vermelho em
desenvolvimento. Depois de preencher, confira no celular que o link do
WhatsApp abre a conversa certa.

---

## Resumo

| # | Item | Situação |
|---|---|---|
| 1 | Abrir no celular | ✅ 4 bugs de layout corrigidos; 0 px de excesso em 8 rotas |
| 2 | Testar formulário | ✅ 6 telas passaram a usar `<form>`; Enter envia |
| 3 | Clicar no WhatsApp | ⚠️ estrutura criada — falta o número |
| 4 | Página 404 | ✅ tela real, no lugar do redirect silencioso |
| 5 | Domínio próprio | ⬜ seu — `npm run definir-dominio` |
| 6 | HTTPS | ✅ código pronto / ⬜ certificado no servidor |
| 7 | PageSpeed | ✅ −59% no 1º carregamento / ⬜ medir no ar |
| 8 | Comprimir imagens | ✅ nada a comprimir; OG image −56% |
| 9 | Favicon | ✅ era o logo do Vite |
| 10 | OG Image | ✅ criada + tags completas |
| 11 | Sitemap.xml | ✅ criado |
| 12 | Google Analytics | ⬜ decisão sua (impacta o item 13) |
| 13 | Cookies | ✅ só cookie necessário — sem banner obrigatório |
| 14 | Dados no rodapé | ⚠️ rodapé criado — falta preencher |
| 15 | Robots.txt | ✅ criado |
| 16 | Títulos e descrições | ✅ 9 rotas, 9 títulos distintos |
| 17 | Meta descriptions | ✅ todas as rotas públicas |
| 18 | Clicar nos links | ✅ 24 destinos conferidos; captcha desamarrado do `127.0.0.1` |
| 19 | Configurações de segurança | ✅ `check --deploy` limpo + CSP/HSTS no host |

> Nota: a lista se chama "20 itens", mas enumera 19 — não ficou nenhum item
> de fora. A numeração acima segue a ordem em que você mandou.

**7 itens estavam quebrados ou ausentes de um jeito que só apareceria
depois de publicar** (2, 4, 9, 10, 11, 15, 18) e **4 dependem de dados ou
contas que só você tem** (3, 5, 12, 14).

**Bloqueador que valia a rodada toda:** o `http://127.0.0.1:8000` fixo no
captcha do cadastro. Com HTTPS em produção, o navegador bloquearia o
pedido como conteúdo misto e **ninguém conseguiria criar conta** — sem
nenhuma mensagem de erro útil na tela.
