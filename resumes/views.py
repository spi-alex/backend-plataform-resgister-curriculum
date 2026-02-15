from rest_framework import viewsets, permissions, status
from rest_framework.response import Response 
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Resume
from .serializers import ResumeSerializer

class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Garante que o usuário só veja/edite o próprio currículo
        return Resume.objects.filter(user=self.request.user)

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
        if getattr(user, 'role', 'CANDIDATE') != 'CANDIDATE':
            raise PermissionDenied("Apenas candidatos podem criar currículos.")
            
        # Verifica duplicidade
        if Resume.objects.filter(user=user).exists():
            raise ValidationError({"error": "Você já possui um currículo cadastrado."})
            
        # Salva vinculando ao usuário
        serializer.save(user=user)