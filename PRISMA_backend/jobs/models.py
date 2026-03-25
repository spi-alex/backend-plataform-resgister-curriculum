from django.db import models
from companies.models import Company
from resumes.models import Resume 

class Job(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='jobs')
    title = models.CharField(max_length=255)
    description = models.TextField()
    requirements = models.TextField()
    salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.company.name}"

class Application(models.Model):
    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('ANALISE', 'Em Análise'),
        ('ENTREVISTA', 'Entrevista'),
        ('APROVADO', 'Aprovado'),
        ('REPROVADO', 'Reprovado'),
    ]

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name='applications')
    # Novo campo de Status
    status = models.CharField(
        max_length=15, 
        choices=STATUS_CHOICES, 
        default='PENDENTE'
    )
    applied_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('job', 'resume') 
        ordering = ['-applied_at']

    def __str__(self):
        # Melhorei o str para você ver o status no Admin do Django
        return f"{self.resume.user.username} -> {self.job.title} ({self.get_status_display()})"