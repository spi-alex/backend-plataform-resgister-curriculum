from django.db import models
from django.conf import settings # <--- Melhor prática do Django

class Company(models.Model):
    # Mudamos de 'user' para 'owner' para ficar claro que é o dono
    # Mudamos para OneToOneField para garantir 1 Empresa por Usuário
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='company'
    ) 
    name = models.CharField(max_length=255)
    cnpj = models.CharField(max_length=18, unique=True)
    description = models.TextField()
    website = models.URLField(blank=True)

    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name