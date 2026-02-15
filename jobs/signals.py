from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from .models import Application

@receiver(pre_save, sender=Application)
def notificar_mudanca_status(sender, instance, **kwargs):
    # Só agimos se a aplicação já existir (tiver um ID)
    if instance.pk:
        try:
            # Buscamos como ela estava no banco antes de salvar
            obj_antigo = Application.objects.get(pk=instance.pk)
        except Application.DoesNotExist:
            return

        # Só envia o e-mail se o status mudou de fato
        if obj_antigo.status != instance.status:
            candidato_email = instance.resume.user.email
            vaga_nome = instance.job.title
            novo_status_label = instance.get_status_display()
            
            assunto = f"Atualização: Sua candidatura para {vaga_nome}"
            mensagem = f"""
Olá, {instance.resume.user.username}!

Boas notícias! O status da sua candidatura para a vaga "{vaga_nome}" foi atualizado.

Novo Status: {novo_status_label}

Acesse a plataforma para mais detalhes.
Atenciosamente,
Equipe de Recrutamento.
            """
            
            # O comando que "printa" o e-mail no console (devido ao settings.py)
            send_mail(
                assunto,
                mensagem,
                'noreply@sistemaegressos.com',
                [candidato_email],
                fail_silently=False,
            )
            print(f"✅ E-mail simulado enviado para: {candidato_email}")