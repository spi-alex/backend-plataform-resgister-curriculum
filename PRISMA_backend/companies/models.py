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
    name = models.CharField(max_length=255)  # usado hoje como razão social
    cnpj = models.CharField(max_length=18, unique=True)
    description = models.TextField()
    website = models.URLField(blank=True)

    # --- Dados institucionais ---
    # Coletados (ou a coletar) no cadastro de empresa e antes descartados
    # pelo backend — ver CompanyRegistration.tsx e register_user().
    nome_fantasia = models.CharField(max_length=255, blank=True, null=True)
    area_atuacao = models.CharField(max_length=150, blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)

    # --- Dados do responsável pelo cadastro ---
    responsavel_nome = models.CharField(max_length=255, blank=True, null=True)
    responsavel_cpf = models.CharField(max_length=14, blank=True, null=True)
    responsavel_cargo = models.CharField(max_length=100, blank=True, null=True)
    responsavel_telefone = models.CharField(max_length=20, blank=True, null=True)

    # --- Endereço ---
    cep = models.CharField(max_length=9, blank=True, null=True)
    rua = models.CharField(max_length=255, blank=True, null=True)
    numero = models.CharField(max_length=20, blank=True, null=True)
    bairro = models.CharField(max_length=100, blank=True, null=True)
    cidade = models.CharField(max_length=100, blank=True, null=True)
    estado = models.CharField(max_length=2, blank=True, null=True)

    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"

    def __str__(self):
        return self.name