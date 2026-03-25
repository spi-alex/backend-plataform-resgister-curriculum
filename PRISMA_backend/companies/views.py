from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsCompany 
from .models import Company
from .serializers import CompanySerializer

class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, IsCompany] 

    def get_queryset(self):
        # Admin vê todas as empresas, usuário vê apenas a sua
        if self.request.user.is_superuser:
            return Company.objects.all()
        # Ajustado de 'user' para 'owner' conforme o seu novo model
        return Company.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # Ajustado de 'user' para 'owner' conforme o seu novo model
        serializer.save(owner=self.request.user)