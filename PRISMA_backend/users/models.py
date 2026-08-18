from django.db import models
from django.contrib.auth.models import AbstractUser
import random

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('company', 'Empresa'),
        ('candidate', 'Candidato'),
        ('gestor', 'Gestor'),  
        ('aluno', 'Aluno'),    
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='candidate')
    pin = models.CharField(max_length=10, unique=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        # Lógica para gerar PIN automático apenas na criação (se não existir)
        if not self.pin:
            self.pin = self.generate_unique_pin()
        super().save(*args, **kwargs)

    def generate_unique_pin(self):
        # Gera um número aleatório de 6 dígitos e verifica se já existe
        while True:
            new_pin = str(random.randint(100000, 999999))
            if not User.objects.filter(pin=new_pin).exists():
                return new_pin

class Profile(models.Model):
    TYPES = (('candidate', 'Candidato'), ('company', 'Empresa'), ('gestor', 'Gestor'), ('aluno', 'Aluno'))
    SITUACAO_ACADEMICA_CHOICES = (('aluno', 'Aluno'), ('egresso', 'Egresso'))

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    type = models.CharField(max_length=10, choices=TYPES)

    # --- Dados pessoais (cadastro de aluno/egresso) ---
    # Estes campos já são coletados pelo formulário de cadastro
    # (StudentRegistration.tsx -> payload.perfil) mas até aqui o backend
    # descartava tudo, salvando só nome/e-mail/senha. Ver register_user().
    cpf = models.CharField(max_length=14, blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    data_nascimento = models.DateField(blank=True, null=True)

    # --- Dados acadêmicos ---
    instituicao = models.CharField(max_length=255, blank=True, null=True)
    curso = models.CharField(max_length=150, blank=True, null=True)
    situacao_academica = models.CharField(
        max_length=10, choices=SITUACAO_ACADEMICA_CHOICES, blank=True, null=True
    )
    ano_inicio = models.PositiveIntegerField(blank=True, null=True)
    previsao_conclusao = models.CharField(max_length=20, blank=True, null=True)
    ano_conclusao = models.PositiveIntegerField(blank=True, null=True)

    # --- Endereço ---
    cep = models.CharField(max_length=9, blank=True, null=True)
    rua = models.CharField(max_length=255, blank=True, null=True)
    numero = models.CharField(max_length=20, blank=True, null=True)
    bairro = models.CharField(max_length=100, blank=True, null=True)
    cidade = models.CharField(max_length=100, blank=True, null=True)
    estado = models.CharField(max_length=2, blank=True, null=True)
