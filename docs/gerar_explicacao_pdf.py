# -*- coding: utf-8 -*-
"""
Gera `PRISMA_explicacao_simples.pdf` a partir do HTML ao lado.

Para que serve: o PDF é o documento que explica, em linguagem simples, o
que foi arrumado no site antes de publicar. O conteúdo de verdade mora no
HTML — edite lá e rode este script para gerar o PDF de novo.

    pip install playwright && playwright install chromium
    cd docs
    python gerar_explicacao_pdf.py

Uso o Chromium do Playwright em vez de uma biblioteca de PDF porque assim o
PDF sai com a MESMA renderização de um navegador: as cores de fundo das
caixas, os cantos arredondados e o SVG da marca saem iguais ao que se vê na
tela, sem precisar redesenhar nada.
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

AQUI = Path(__file__).resolve().parent
ORIGEM = AQUI / "PRISMA_explicacao_simples.html"
DESTINO = AQUI / "PRISMA_explicacao_simples.pdf"

# Rodapé com número de página. O Chromium substitui as classes especiais
# pageNumber/totalPages na hora de imprimir.
RODAPE = """
<div style="width:100%;font-family:'Segoe UI',Arial,sans-serif;font-size:8pt;
            color:#5c6357;padding:0 16mm;display:flex;
            justify-content:space-between;border-top:1px solid #dfe6db;
            padding-top:4px;">
  <span>PRISMA — o que foi arrumado antes de publicar</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>
"""

with sync_playwright() as pw:
    navegador = pw.chromium.launch()
    page = navegador.new_page()
    page.goto(ORIGEM.as_uri(), wait_until="networkidle")

    # `print` para o Chromium aplicar as regras @page/page-break do CSS.
    page.emulate_media(media="print")

    page.pdf(
        path=str(DESTINO),
        format="A4",
        print_background=True,
        display_header_footer=True,
        header_template="<div></div>",  # sem cabeçalho, só rodapé
        footer_template=RODAPE,
        # O `margin` daqui SOBRESCREVE o `@page { margin }` do CSS — passar
        # 0mm nas laterais deixaria o texto encostado na borda do papel.
        # Estes são os valores reais do documento.
        margin={
            "top": "16mm",
            "bottom": "18mm",
            "left": "17mm",
            "right": "17mm",
        },
    )
    navegador.close()

print(f"{DESTINO}  ->  {DESTINO.stat().st_size / 1024:.1f} kB")
