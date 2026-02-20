from django.db import models
from django.conf import settings

from django.contrib.auth.models import User

class Resume(models.Model):
    SITUACAO_CHOICES = [
        ('estudando', 'Estudando'),
        ('concluido', 'Concluído'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='resume'
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    curso = models.CharField(max_length=100, blank=True, null=True)
    ano_ingresso = models.PositiveIntegerField(blank=True, null=True)
    ano_conclusao = models.PositiveIntegerField(blank=True, null=True)
    situacao = models.CharField(
        max_length=20, 
        choices=SITUACAO_CHOICES, 
        default='estudando'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.user.username}"
