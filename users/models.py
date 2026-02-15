from django.db import models
from django.contrib.auth.models import AbstractUser
import random

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('COMPANY', 'Empresa'),
        ('CANDIDATE', 'Candidato'),
        ('GESTOR', 'Gestor'),  # Novo
        ('ALUNO', 'Aluno'),    # Novo
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CANDIDATE')
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
    TYPES = (('candidate', 'Candidato'), ('company', 'Empresa'))
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    type = models.CharField(max_length=10, choices=TYPES)
    
'''from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import User

class User(AbstractUser):
    # Opções de papéis
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('COMPANY', 'Empresa'),
        ('CANDIDATE', 'Candidato'),
    )
    
    # O CAMPO QUE ESTAVA FALTANDO OU COM NOME ERRADO:
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CANDIDATE')
   # pin = models.CharField(max_length=10, unique=True, null=True, blank=True)
class Profile(models.Model):
    TYPES = (('candidate', 'Candidato'), ('company', 'Empresa'))
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    type = models.CharField(max_length=10, choices=TYPES) 
'''
  