from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User
# Register your models here.
class CustomUserAdmin(UserAdmin):
    # Isso adiciona o campo 'role' e 'pin' na tela de edição do usuário
    fieldsets = UserAdmin.fieldsets + (
        ('Informações de Perfil', {'fields': ('role', 'pin')}),
    )
    
    # Isso faz o 'role' aparecer na lista principal de usuários
    list_display = ['username', 'email', 'role', 'is_staff']
    list_filter = ['role', 'is_staff']
admin.site.register(User, CustomUserAdmin)
