from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Profile # Importe o Profile também

class CustomUserAdmin(UserAdmin):
    # 1. LISTAGEM: O que aparece na tabela principal
    # Adicionamos 'first_name' e 'last_name' para você ver o nome real na lista
    list_display = ['username', 'first_name', 'last_name', 'email', 'role', 'is_staff']
    
    # 2. FILTROS: Facilita encontrar usuários por tipo ou status
    list_filter = ['role', 'is_staff', 'is_superuser', 'is_active']
    
    # 3. PESQUISA: Permite digitar o nome real na barra de busca
    search_fields = ['username', 'first_name', 'last_name', 'email']
    
    # 4. ORDENAÇÃO: Mostra os mais recentes primeiro
    ordering = ['-date_joined']

    # 5. EDIÇÃO: Campos que aparecem ao clicar no usuário
    fieldsets = UserAdmin.fieldsets + (
        ('Informações de Sistema PRISMA', {'fields': ('role', 'pin')}),
    )

# Registra o novo Admin customizado
admin.site.register(User, CustomUserAdmin)

# DICA EXTRA: Registrar o Profile para você conseguir ver os vínculos se precisar
@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'type']
    search_fields = ['user__username', 'user__first_name']  