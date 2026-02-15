from rest_framework.permissions import BasePermission
from rest_framework import permissions


class IsCandidate(BasePermission): 
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.profile.type == 'candidate'
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