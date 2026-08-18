from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
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

    # --- PERFIL DA EMPRESA LOGADA ---
    # O frontend consome sempre a empresa do usuário autenticado, sem
    # precisar saber o ID dela. GET retorna os dados, PATCH atualiza.
    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        company = Company.objects.filter(owner=request.user).first()
        if not company:
            return Response(
                {"error": "Nenhuma empresa encontrada para este usuário."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == 'PATCH':
            serializer = self.get_serializer(company, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = self.get_serializer(company)
        return Response(serializer.data)
