import zipfile
import io
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response 
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Resume
from .serializers import ResumeSerializer
from pdf.views import gerar_pdf_puro
from pdf.views import gerar_pdf_bytes
class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Garante que o usuário só veja/edite o próprio currículo
        if getattr(user, 'role', 'candidate') in ['candidate', 'aluno']:
            return Resume.objects.filter(user=user)
        
        # 2. Se for Gestor (ou outro), ele vê todos e pode FILTRAR
        queryset = Resume.objects.all()

        # PEGAR PARÂMETROS DA URL (Ex: ?curso=Direito)
        curso = self.request.query_params.get('curso')
        situacao = self.request.query_params.get('situacao')
        ano_ingresso = self.request.query_params.get('ano_ingresso')
        ano_conclusao = self.request.query_params.get('ano_conclusao')

        # APLICAR FILTROS (Se o parâmetro existir na URL)
        if curso:
            # icontains busca parte do nome e ignora maiúsculas/minúsculas
            queryset = queryset.filter(curso__icontains=curso)
        
        if situacao:
            queryset = queryset.filter(situacao=situacao)
            
        if ano_ingresso:
            queryset = queryset.filter(ano_ingresso=ano_ingresso)
            
        if ano_conclusao:
            queryset = queryset.filter(ano_conclusao=ano_conclusao)

        return queryset

    # --- MÉTODO CREATE CUSTOMIZADO (Com a sua mensagem) ---
    def create(self, request, *args, **kwargs):
        # 1. Valida os dados
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. Chama o salvamento customizado (perform_create)
        self.perform_create(serializer)
        
        # 3. Prepara os headers de sucesso
        headers = self.get_success_headers(serializer.data)
        
        # 4. Retorno personalizado com mensagem + dados (incluindo o pdf_url)
        return Response({
            "message": "Currículo criado com sucesso! Boa sorte!",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED, headers=headers)

    # --- LÓGICA DE SEGURANÇA E VÍNCULO DO USUÁRIO ---
    def perform_create(self, serializer):
        user = self.request.user

        # Verifica Role
        # --- ALTERAÇÃO AQUI: Permitir candidato OU aluno ---
        if user.role not in ['candidate', 'aluno']:
            raise PermissionDenied("Apenas candidatos ou alunos podem criar currículos.")
            
        # Verifica duplicidade
        if Resume.objects.filter(user=user).exists():
            raise ValidationError({"error": "Você já possui um currículo cadastrado."})
            
        # Salva vinculando ao usuário
        serializer.save(user=user)
@api_view(['POST']) # Usamos POST para poder enviar uma lista de IDs no corpo
@permission_classes([IsAuthenticated])
def export_resumes_zip(request):
    if request.user.role.lower() != 'gestor':
        return Response({"error": "Acesso negado."}, status=403)

    # O Frontend deve enviar algo como: {"resume_ids": [1, 5, 10]}
    resume_ids = request.data.get('resume_ids', [])
    
    if not resume_ids:
        return Response({"error": "Nenhum currículo selecionado."}, status=400)

    # Cria um buffer na memória para o arquivo ZIP
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        resumes = Resume.objects.filter(id__in=resume_ids)
        print(resumes)
        for resume in resumes:
            # 1. Gerar o PDF para este currículo específico
            # Substitua pela sua função real de PDF. Ela deve retornar bytes.
            pdf_content = gerar_pdf_puro(resume, request)
            
            # 2. Nome do arquivo dentro do ZIP (ex: curriculo_joao.pdf)
            filename = f"curriculo_{resume.user.username}_{resume.id}.pdf"
            
            # 3. Adiciona o PDF ao ZIP
            zip_file.writestr(filename, pdf_content)

    # Prepara a resposta para download
    zip_buffer.seek(0)
    response = HttpResponse(zip_buffer.read(), content_type='application/zip')
    response['Content-Disposition'] = 'attachment; filename="curriculos_exportados.zip"'
    
    return response