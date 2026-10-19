import json

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from weasyprint import HTML

from jobs.models import Application
from resumes.models import Resume
from users.authentication import RevocableJWTAuthentication


def nome_arquivo_seguro(resume):
    """
    Nome de arquivo saneado para o cabeçalho `Content-Disposition` e para
    entradas de ZIP.

    O nome vinha de `resume.user.username`, que no PRISMA é preenchido com o
    e-mail digitado no cadastro — ou seja, texto controlado pelo usuário indo
    direto para dentro de um cabeçalho HTTP entre aspas. Um `username` com
    aspas ou quebra de linha permitia injeção de cabeçalho de resposta; com
    `/` ou `..`, permitia escrever fora do diretório pretendido ao
    descompactar o ZIP do gestor (path traversal).

    Aqui só sobrevivem letras, números, ponto, hífen e sublinhado.
    """
    bruto = f"curriculo_{resume.user.username}_{resume.id}"
    limpo = ''.join(c if (c.isalnum() or c in '._-') else '_' for c in bruto)
    return f"{limpo[:120]}.pdf"


def _pode_acessar_curriculo(user, resume):
    """
    Regra única de autorização para qualquer rota que exponha o PDF de um
    currículo. Antes disso não havia checagem nenhuma além de estar logado
    (IsAuthenticated) — qualquer usuário autenticado podia baixar o
    currículo de qualquer outro trocando o `pk` na URL.

    Pode acessar:
    - o próprio dono do currículo;
    - o gestor (ou superusuário/staff);
    - uma empresa cujo dono é o `owner` de alguma vaga para a qual esse
      currículo tenha se candidatado (é assim que a tela de candidatos da
      empresa consome o mesmo pdf_url).
    """
    if not user or not user.is_authenticated:
        return False

    if resume.user_id == user.id:
        return True

    if user.is_staff or user.is_superuser or getattr(user, 'role', '') == 'gestor':
        return True

    return Application.objects.filter(
        resume=resume, job__company__owner=user
    ).exists()


def montar_contexto(resume):
    """
    Contexto do template do PDF a partir de um currículo.

    O grosso dos dados do currículo mora em `Resume.content`, um JSON livre
    gravado pelo formulário do aluno; o template
    (`pdf/templates/pdf/resume_pdf.html`) espera essas chaves ACHATADAS no
    topo do contexto (`fullName`, `email`, `phone`, `summary`, `education`,
    `experience`...).

    BUG CORRIGIDO: existiam duas funções distintas gerando o mesmo PDF por
    caminhos diferentes. O download individual achatava o JSON corretamente,
    mas `gerar_pdf_puro` — usada pela exportação em lote do gestor
    (`POST /api/resumes/export-zip/`) — passava apenas `{'resume': resume}`.
    Como o template não lê nenhuma variável chamada `resume`, **todo PDF
    dentro do ZIP do gestor saía em branco**. As duas rotas agora usam esta
    única função.
    """
    try:
        dados_formulario = json.loads(resume.content) if resume.content else {}
    except (json.JSONDecodeError, TypeError):
        dados_formulario = {}

    if not isinstance(dados_formulario, dict):
        dados_formulario = {}

    return {
        **dados_formulario,
        'photo': _foto_segura(dados_formulario.get('photo')),
        'user': resume.user,
        'title': resume.title,
    }


#: Prefixos aceitos no campo `photo`. A foto é gravada pelo formulário do
#: aluno como data URL JPEG reduzido (Prisma_frontend/src/utils/imagem.ts).
PREFIXOS_DE_FOTO = (
    'data:image/jpeg;base64,',
    'data:image/jpg;base64,',
    'data:image/png;base64,',
    'data:image/webp;base64,',
)

#: Teto do data URL aceito. A imagem sai do navegador com ~40KB; 3MB é folga
#: larga e ainda impede que um `content` gigante trave a renderização.
TAMANHO_MAXIMO_FOTO = 3 * 1024 * 1024


def _foto_segura(photo):
    """
    Devolve a foto apenas se ela for uma imagem EMBUTIDA (`data:image/...`).

    Isto não é só arrumação: `content` é JSON livre controlado pelo aluno, e
    o WeasyPrint recebe `base_url`, então ele BUSCA de verdade qualquer
    endereço que apareça em `src`. Sem esta trava, gravar
    `"photo": "http://169.254.169.254/latest/meta-data/"` (ou um
    `file:///...`) faria o servidor emitir essa requisição na hora de gerar
    o PDF — SSRF clássico, com a rede interna do servidor como alvo e o
    aluno sem precisar de nada além do formulário de currículo.

    Aceitando só `data:`, nenhum byte sai do servidor: a imagem já está
    dentro do próprio documento.

    Também cobre o histórico: até 10 set 2026 o formulário gravava aqui um
    endereço `blob:`, que só existia na aba do navegador que fez o upload.
    Esses currículos antigos caem no selo com a inicial do nome, como já
    caíam antes.
    """
    if not isinstance(photo, str):
        return None

    photo = photo.strip()
    if not photo.startswith(PREFIXOS_DE_FOTO):
        return None

    if len(photo) > TAMANHO_MAXIMO_FOTO:
        return None

    return photo


def gerar_pdf_puro(resume, request):
    """
    Gera os bytes do PDF de um currículo (sem resposta HTTP em volta).

    Nota de segurança: o template do WeasyPrint usa o autoescape padrão do
    Django e não há nenhum `|safe` — o conteúdo do currículo, que é texto
    livre digitado pelo aluno, é escapado antes de virar HTML. Sem isso,
    `content` seria um vetor de XSS armazenado com execução no renderizador
    de PDF.
    """
    html_string = render_to_string('pdf/resume_pdf.html', montar_contexto(resume))
    html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
    return html.write_pdf()


@api_view(['GET'])
# Precisa listar a classe explicitamente: o decorador SOBRESCREVE o
# DEFAULT_AUTHENTICATION_CLASSES do settings. Estava apontando para o
# `JWTAuthentication` cru do SimpleJWT, o que fazia esta rota — justamente a
# que entrega o PDF do currículo — ser a única da API a ignorar a revogação
# de sessão (users/authentication.py).
@authentication_classes([RevocableJWTAuthentication])
@permission_classes([IsAuthenticated])
def export_resume_pdf(request, pk):
    # 1. Busca o currículo no banco
    resume = get_object_or_404(Resume, pk=pk)

    # 2. Trava de autorização (IDOR corrigido): só o dono, o gestor ou a
    # empresa que recebeu uma candidatura desse currículo baixam o PDF.
    if not _pode_acessar_curriculo(request.user, resume):
        raise PermissionDenied("Você não tem permissão para acessar este currículo.")

    # 3. Renderiza e devolve
    pdf_file = gerar_pdf_puro(resume, request)

    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{nome_arquivo_seguro(resume)}"'
    return response
