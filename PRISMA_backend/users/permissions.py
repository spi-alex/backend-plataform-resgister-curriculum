from rest_framework.permissions import BasePermission
from rest_framework import permissions


# 1. Permite Candidatos ou Alunos (Para Criar e Ver)
class IsCandidateOrStudent(BasePermission): 
    def has_permission(self, request, view):
        # Verifica se está logado e se o tipo é candidate ou aluno
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.type in ['candidate', 'aluno']
        )
    

    # 2. Permite apenas o dono do objeto (Para Editar e Deletar)
class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        # O 'obj' aqui é o currículo específico. 
        # Verificamos se o dono do currículo é o mesmo usuário que está logado.
        return obj.user == request.user
    
class IsCompany(permissions.BasePermission):
    def has_permission(self, request, view):
        # 1. Se não estiver logado, tchau.
        if not request.user.is_authenticated:
            return False
            
        # 2. Se for Superusuário (Admin), ele pode tudo.
        if request.user.is_superuser:
            return True

        # 3. Para usuários comuns, verifica se é uma Empresa.
        return bool(
            hasattr(request.user, 'profile') and 
            request.user.profile.user_type == 'company'
        )