import json
import zipfile
import io
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from weasyprint import HTML
from rest_framework_simplejwt.authentication import JWTAuthentication
from resumes.models import Resume
from jobs.models import Application
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication, TokenAuthentication


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



# Função que gera apenas os BYTES (sem resposta HTTP)
def gerar_pdf_bytes(resume, request):
    html_string = render_to_string('pdf/resume_pdf.html', {'resume': resume})
    # O base_url é importante para carregar imagens/CSS
    html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
    return html.write_pdf()

def gerar_pdf_puro(resume, request):
    # Essa é a lógica que você já tinha, mas sem os decoradores de API
    html_string = render_to_string('pdf/resume_pdf.html', {'resume': resume})
    html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
    return html.write_pdf() # Retorna apenas os bytes


import json
from django.template.loader import render_to_string
from weasyprint import HTML
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

@api_view(['GET'])
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def export_resume_pdf(request, pk):
    # 1. Busca o currículo no banco
    resume = get_object_or_404(Resume, pk=pk)

    # 1.1 Trava de autorização (IDOR corrigido): só o dono, o gestor ou a
    # empresa que recebeu uma candidatura desse currículo podem baixar o PDF.
    if not _pode_acessar_curriculo(request.user, resume):
        raise PermissionDenied("Você não tem permissão para acessar este currículo.")

    # 2. Transforma a string JSON 'content' em um dicionário Python
    try:
        dados_formulario = json.loads(resume.content)
    except (json.JSONDecodeError, TypeError):
        dados_formulario = {}

    # 3. Prepara o contexto para o HTML
    # Usamos **dados_formulario para que o HTML acesse as variáveis diretamente
    context = {
        **dados_formulario,
        'user': resume.user,
        'title': resume.title
    }

    # 4. Renderiza o HTML e gera o PDF
    html_string = render_to_string('pdf/resume_pdf.html', context)
    
    # O base_url ajuda o WeasyPrint a achar caminhos de arquivos se necessário
    html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
    pdf_file = html.write_pdf()

    # 5. Retorna o arquivo PDF
    response = HttpResponse(pdf_file, content_type='application/pdf')
    nome_arquivo = f"curriculo_{resume.user.username}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{nome_arquivo}"'

    return response