# -*- coding: utf-8 -*-
"""
Checklist pré-publicação do PRISMA — parte executável no navegador.
=====================================================================

Cobre os itens da lista "antes de subir seu site" que só dá para verificar
com a página REALMENTE renderizada — não olhando o código:

   1  Abrir no celular   viewport 360x740 com touch; falha se a página
                         criar rolagem HORIZONTAL (scrollWidth > clientWidth)
   2  Testar formulário  preenche e aperta ENTER, sem clicar no botão:
                         confirma que o POST sai e que o erro aparece na tela
   4  Página 404         URL inexistente mostra a tela 404 E preserva a URL
   9  Favicon            responde 200 e não é o vite.svg padrão
  10  OG Image           meta og:image existe e o arquivo responde
  16  Títulos            cada rota tem um <title> diferente
  17  Meta descriptions  toda rota pública tem description
  18  Clicar nos links   navega todo link interno das rotas públicas

Não substitui `manage.py test` (80 testes de regra de negócio e
autorização) nem `manage.py check --deploy`. É a camada de cima.

--------------------------------------------------------------------
COMO RODAR
--------------------------------------------------------------------
1) Suba os dois servidores:
       cd PRISMA_backend && python manage.py runserver 8000
       cd Prisma_frontend && npm run dev

2) Instale as dependências (uma vez):
       pip install playwright
       playwright install chromium

3) Rode:
       cd tests
       python checklist_publicacao.py

Sai com código 1 se houver qualquer FALHA — dá para usar em CI.

Screenshots (`mobile-*.png`, `pagina-404.png`, `login-erro.png`) e o
`checklist-navegador.json` são gravados no diretório de execução.

NOTA sobre o AVISO de console: o teste faz um login com credencial
inválida de propósito, e o 401 resultante aparece como erro de console.
Isso é esperado — não é defeito do app.
"""
import json
import sys

from playwright.sync_api import sync_playwright

FRONT = "http://localhost:5173"

# Larguras de aparelhos reais. 360 é o mais comum no Brasil (linha Galaxy A).
CELULAR = {"width": 360, "height": 740}
DESKTOP = {"width": 1366, "height": 768}

ROTAS_PUBLICAS = [
    "/",
    "/login",
    "/cadastro",
    "/cadastro/estudante",
    "/cadastro/empresa",
    "/esqueci-senha",
    "/redefinir-senha",
    "/confirmar-cadastro",
]

resultados = []


def registra(item, status, detalhe):
    resultados.append({"item": item, "status": status, "detalhe": detalhe})
    marca = {"OK": "[ OK ]", "FALHA": "[FALHA]", "AVISO": "[AVISO]"}[status]
    print(f"{marca} {item}: {detalhe}", flush=True)


def erros_de_console(page):
    """Coleta erros de console e requisições falhadas da página."""
    erros = []
    page.on(
        "console",
        lambda m: erros.append(f"console.{m.type}: {m.text}")
        if m.type == "error"
        else None,
    )
    page.on("pageerror", lambda e: erros.append(f"pageerror: {e}"))
    page.on(
        "requestfailed",
        lambda r: erros.append(f"requestfailed: {r.url} ({r.failure})"),
    )
    return erros


with sync_playwright() as pw:
    navegador = pw.chromium.launch()

    # ============================================================
    # 1) MOBILE — scroll horizontal em cada rota pública
    # ============================================================
    ctx = navegador.new_context(
        viewport=CELULAR,
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
        user_agent=(
            "Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"
        ),
    )
    page = ctx.new_page()

    for rota in ROTAS_PUBLICAS:
        page.goto(FRONT + rota, wait_until="networkidle")
        page.wait_for_timeout(400)
        medidas = page.evaluate(
            "() => ({ scroll: document.documentElement.scrollWidth,"
            " client: document.documentElement.clientWidth })"
        )
        excesso = medidas["scroll"] - medidas["client"]
        # 1 px de folga: subpixel de borda/arredondamento não é bug.
        if excesso > 1:
            registra(
                "1 Mobile 360px",
                "FALHA",
                f"{rota} tem rolagem horizontal: conteudo {medidas['scroll']}px "
                f"numa tela de {medidas['client']}px (excesso {excesso}px)",
            )
        else:
            registra("1 Mobile 360px", "OK", f"{rota} cabe em 360px sem rolagem lateral")

    page.goto(FRONT + "/", wait_until="networkidle")
    page.screenshot(path="mobile-home.png")
    page.goto(FRONT + "/login", wait_until="networkidle")
    page.screenshot(path="mobile-login.png")
    ctx.close()

    # ============================================================
    # 2) FORMULÁRIO — Enter envia e o POST chega no backend?
    # ============================================================
    ctx = navegador.new_context(viewport=DESKTOP)
    page = ctx.new_page()
    erros = erros_de_console(page)

    posts = []
    page.on(
        "request",
        lambda r: posts.append((r.method, r.url)) if r.method == "POST" else None,
    )

    page.goto(FRONT + "/login", wait_until="networkidle")
    n_forms = page.locator("form").count()
    if n_forms == 0:
        registra("2 Formulario/login", "FALHA", "a tela de login nao tem <form>")
    else:
        # Preenche e aperta Enter — sem clicar no botão. É o teste do <form>.
        page.get_by_label("Email").fill("checklist@exemplo.test")
        page.get_by_label("Senha").fill("senha-de-teste-1234")
        page.get_by_label("Senha").press("Enter")
        # O login do backend leva ~3-4 s (hash de senha + contador de
        # throttle), então esperar menos gera falso negativo na checagem da
        # mensagem de erro logo abaixo.
        page.wait_for_timeout(6000)

        login_posts = [u for m, u in posts if "login" in u or "token" in u]
        if login_posts:
            registra(
                "2 Formulario/login",
                "OK",
                f"Enter enviou o formulario: POST {login_posts[0]}",
            )
        else:
            registra(
                "2 Formulario/login",
                "FALHA",
                f"Enter nao disparou nenhum POST (POSTs vistos: {posts})",
            )

        # Credencial inválida deve mostrar mensagem, não tela em branco.
        texto = page.inner_text("body")
        page.screenshot(path="login-erro.png")
        if "inválid" in texto.lower() or "invalid" in texto.lower() or "erro" in texto.lower():
            registra(
                "2 Formulario/erro",
                "OK",
                "credencial invalida exibe mensagem de erro na tela",
            )
        else:
            registra(
                "2 Formulario/erro",
                "AVISO",
                "nao encontrei mensagem de erro visivel apos login invalido",
            )

    # autocomplete nos campos de senha (gerenciador de senhas / teclado)
    page.goto(FRONT + "/login", wait_until="networkidle")
    ac = page.eval_on_selector_all(
        "input", "els => els.map(e => [e.type, e.autocomplete])"
    )
    if any(a == "current-password" for _, a in ac):
        registra("2 Formulario/autocomplete", "OK", f"campos com autocomplete: {ac}")
    else:
        registra("2 Formulario/autocomplete", "AVISO", f"autocomplete ausente: {ac}")

    # ============================================================
    # 4) PÁGINA 404
    # ============================================================
    page.goto(FRONT + "/pagina-que-nao-existe-123", wait_until="networkidle")
    page.wait_for_timeout(500)
    corpo = page.inner_text("body")
    url_final = page.url
    page.screenshot(path="pagina-404.png")

    if "404" in corpo and "não encontrada" in corpo.lower():
        if url_final.endswith("/pagina-que-nao-existe-123"):
            registra(
                "4 Pagina 404",
                "OK",
                "mostra tela 404 e PRESERVA a URL errada (nao redireciona)",
            )
        else:
            registra("4 Pagina 404", "AVISO", f"mostra 404 mas mudou a URL para {url_final}")
    else:
        registra("4 Pagina 404", "FALHA", f"sem tela de 404; URL final={url_final}")

    # ============================================================
    # 9) FAVICON
    # ============================================================
    icone = page.evaluate(
        "() => { const l = document.querySelector('link[rel~=\"icon\"]');"
        " return l ? l.getAttribute('href') : null; }"
    )
    resp = page.request.get(FRONT + (icone or "/favicon.ico"))
    if icone and "vite" not in icone and resp.ok:
        registra("9 Favicon", "OK", f"{icone} responde {resp.status} ({len(resp.body())} bytes)")
    else:
        registra("9 Favicon", "FALHA", f"href={icone} status={resp.status}")

    # ============================================================
    # 10) OG IMAGE
    # ============================================================
    og = page.evaluate(
        "() => Object.fromEntries([...document.querySelectorAll('meta[property^=\"og:\"]')]"
        ".map(m => [m.getAttribute('property'), m.content]))"
    )
    if og.get("og:image"):
        # A URL é absoluta com o domínio de produção; testa o arquivo local.
        r = page.request.get(FRONT + "/og-image.png")
        registra(
            "10 OG Image",
            "OK" if r.ok else "FALHA",
            f"og:image={og['og:image']} | arquivo local /og-image.png -> {r.status} "
            f"({len(r.body())} bytes)",
        )
    else:
        registra("10 OG Image", "FALHA", "nenhuma meta og:image no <head>")

    # ============================================================
    # 16/17) TÍTULOS E META DESCRIPTIONS POR ROTA
    # ============================================================
    metas = {}
    for rota in ROTAS_PUBLICAS + ["/pagina-que-nao-existe-123"]:
        page.goto(FRONT + rota, wait_until="networkidle")
        page.wait_for_timeout(350)
        metas[rota] = {
            "title": page.title(),
            "description": page.evaluate(
                "() => { const m = document.querySelector('meta[name=\"description\"]');"
                " return m ? m.content : null; }"
            ),
            "robots": page.evaluate(
                "() => { const m = document.querySelector('meta[name=\"robots\"]');"
                " return m ? m.content : null; }"
            ),
        }

    titulos = [v["title"] for v in metas.values()]
    if len(set(titulos)) == len(titulos):
        registra("16 Titulos", "OK", f"{len(titulos)} rotas, {len(set(titulos))} titulos distintos")
    else:
        repetidos = [t for t in set(titulos) if titulos.count(t) > 1]
        registra("16 Titulos", "AVISO", f"titulos repetidos: {repetidos}")

    sem_desc = [r for r, v in metas.items() if not v["description"]]
    if sem_desc:
        registra("17 Meta descriptions", "AVISO", f"rotas sem description: {sem_desc}")
    else:
        registra(
            "17 Meta descriptions",
            "OK",
            f"todas as {len(metas)} rotas publicas tem description",
        )

    # ============================================================
    # 18) CLICAR NOS LINKS
    # ============================================================
    total_links = 0
    quebrados = []
    for rota in ROTAS_PUBLICAS:
        page.goto(FRONT + rota, wait_until="networkidle")
        page.wait_for_timeout(300)
        hrefs = page.eval_on_selector_all(
            "a[href]",
            "els => els.map(e => e.getAttribute('href'))",
        )
        for href in set(hrefs):
            if not href or href.startswith(("mailto:", "tel:", "http", "#")):
                continue
            total_links += 1
            p2 = ctx.new_page()
            p2.goto(FRONT + href, wait_until="networkidle")
            p2.wait_for_timeout(400)
            texto = p2.inner_text("body")
            if "404" in texto and "não encontrada" in texto.lower():
                quebrados.append(f"{rota} -> {href}")
            p2.close()

    if quebrados:
        registra("18 Links", "FALHA", f"links que caem em 404: {quebrados}")
    else:
        registra(
            "18 Links",
            "OK",
            f"{total_links} links internos testados nas {len(ROTAS_PUBLICAS)} rotas "
            "publicas, nenhum cai em 404",
        )

    if erros:
        registra("Console", "AVISO", f"{len(erros)} erro(s): {erros[:6]}")
    else:
        registra("Console", "OK", "nenhum erro de console/JS nas rotas publicas")

    ctx.close()
    navegador.close()

print("\n================ RESUMO ================")
for s in ("FALHA", "AVISO", "OK"):
    n = sum(1 for r in resultados if r["status"] == s)
    print(f"{s}: {n}")

with open("checklist-navegador.json", "w", encoding="utf-8") as f:
    json.dump({"resultados": resultados, "metas": metas}, f, ensure_ascii=False, indent=2)

sys.exit(1 if any(r["status"] == "FALHA" for r in resultados) else 0)
