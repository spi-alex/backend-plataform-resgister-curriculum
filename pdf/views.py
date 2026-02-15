from django.http import HttpResponse
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from weasyprint import HTML
from rest_framework_simplejwt.authentication import JWTAuthentication
from resumes.models import Resume
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication, TokenAuthentication

@api_view(['GET'])
# Agora o Django aceita tanto o Login do navegador quanto o Token do Postman
@authentication_classes([JWTAuthentication, SessionAuthentication])
@permission_classes([IsAuthenticated])
def export_resume_pdf(request, pk):
    resume = get_object_or_404(Resume, pk=pk)

    is_owner = (resume.user == request.user)
    is_admin = request.user.is_staff
    
    if not (is_owner or is_admin):
        raise PermissionDenied("Você não tem permissão para visualizar este currículo.")

    # Se seu arquivo está em pdf/templates/pdf/resume_pdf.html, use este caminho:
    html_string = render_to_string('pdf/resume_pdf.html', {'resume': resume})

    html = HTML(string=html_string, base_url=request.build_absolute_uri('/'))
    pdf_file = html.write_pdf()

    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="curriculo_{resume.user.username}.pdf"'

    return response