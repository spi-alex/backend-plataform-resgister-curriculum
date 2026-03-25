import json
import zipfile
import io
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from requests import Response
from weasyprint import HTML
from rest_framework_simplejwt.authentication import JWTAuthentication
from resumes.models import Resume
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication, TokenAuthentication



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
'''
@api_view(['GET'])
# Agora o Django aceita tanto o Login do navegador quanto o Token do Postman
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def export_resume_pdf(request, pk):
    resume = get_object_or_404(Resume, pk=pk)


    dados_do_formulario = json.loads(resume.content)

    is_owner = (resume.user == request.user)
    is_admin = request.user.is_staff
    
    if not (is_owner or is_admin):
        raise PermissionDenied("Você não tem permissão para visualizar este currículo.")

    # Se seu arquivo está em pdf/templates/pdf/resume_pdf.html, use este caminho:
    html_string = render_to_string('pdf/resume_pdf.html', {
         
        'resume': resume
    })

    html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
    pdf_file = html.write_pdf()

    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="curriculo_{resume.user.username}.pdf"'

    return response



'''




'''
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_resume_zip(request):
    # 1. Validação de Segurança para o Gestor
    if request.user.role.lower() != 'gestor':
        return Response({"error": "Apenas gestores podem baixar em lote."}, status=403)

    # 2. Receber IDs do Frontend: {"resume_ids": [1, 2, 3]}
    resume_ids = request.data.get('resume_ids', [])
    if not resume_ids:
        return Response({"error": "Selecione ao menos um currículo."}, status=400)

    # 3. Criar o "pacote" virtual na memória RAM
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        resumes = Resume.objects.filter(id__in=resume_ids)
        
        for resume in resumes:
            # Reutilizamos a lógica do WeasyPrint
            pdf_bytes = gerar_pdf_bytes(resume, request)
            
            # Nome do arquivo dentro do ZIP
            filename = f"curriculo_{resume.user.username}_{resume.id}.pdf"
            
            # Adicionamos o PDF ao arquivo ZIP
            zip_file.writestr(filename, pdf_bytes)

    # 4. Preparar o arquivo para o download
    zip_buffer.seek(0)
    response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
    response['Content-Disposition'] = 'attachment; filename="lote_curriculos.zip"'
    
    return response
'''