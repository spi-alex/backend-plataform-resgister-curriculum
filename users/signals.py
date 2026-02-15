from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import Profile
from django.contrib.auth.signals import user_logged_in
from django.core.mail import send_mail
from django.dispatch import receiver
from django.utils import timezone

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # Por padrão, criamos como 'candidate'. 
        # Você pode alterar isso depois no Admin ou via API.
        Profile.objects.create(user=instance, type='candidate')

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # O hasattr verifica se o perfil existe antes de tentar salvar
    if hasattr(instance, 'profile'):
        instance.profile.save()
    else:
        # Se não existir, ele cria um agora
        from .models import Profile
        Profile.objects.get_or_create(user=instance)
print("SINAL CARREGADO COM SUCESSO!")

@receiver(user_logged_in)
def notify_user_login(sender, request, user, **kwargs):
    subject = 'Novo Login Detectado - PRISMA'
    message = f'Olá {user.username},\n\nUm novo login foi realizado na sua conta em {timezone.now()}.\nSe não foi você, mude sua senha imediatamente.'
    from_email = 'security@prisma.com'
    recipient_list = [user.email]
    print(f"DEBUG: E-mail de login enviado para {user.email}")
    try:
        send_mail(subject, message, from_email, recipient_list)
        print(f"DEBUG: E-mail de login enviado para {user.email}")
    except Exception as e:
        print(f"Erro ao enviar e-mail: {e}")