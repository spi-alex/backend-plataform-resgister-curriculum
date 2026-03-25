from django.contrib import admin
from .models import Company

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'cnpj', 'owner') 
    
    # Se tiver search_fields, ajuste também:
    search_fields = ('name', 'cnpj', 'owner__username')