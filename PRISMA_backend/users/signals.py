import logging
import threading

from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .emails import enviar_email_async
from .models import Profile

logger = logging.getLogger(__name__)

# IMPORTANTE: o projeto usa AUTH_USER_MODEL = 'users.User' (custom user).
# Os receivers abaixo usavam `django.contrib.auth.models.User` (o model
# padrão do Django). Como `sender` nunca batia com o model real, os dois
# sinais abaixo NUNCA disparavam para os usuários de verdade — o Profile só
# existia quando algo o criava explicitamente (ex.: register_user).
User = get_user_model()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'profile'):
        Profile.objects.create(user=instance, type=instance.role or 'candidate')


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # `Profile.type` é só um espelho de `User.role` (a fonte real da verdade
    # usada em login/permissões). Sincronizamos aqui para que editar o
    # usuário no Admin sempre reflita no Profile também — antes dava para
    # editar os dois separadamente e ficarem contraditórios.
    profile, _ = Profile.objects.get_or_create(user=instance, defaults={'type': instance.role})
    if profile.type != instance.role:
        profile.type = instance.role
        profile.save(update_fields=['type'])


@receiver(user_logged_in)
def notify_user_login(sender, request, user, **kwargs):
    # Usa `enviar_email_async` (Resend) e não o `send_mail()` nativo do
    # Django, que cairia no EMAIL_BACKEND de console — o aviso nunca saía
    # de verdade para o usuário.
    subject = 'Novo Login Detectado - PRISMA'
    message = (
        f'Olá {user.get_full_name() or user.username},\n\n'
        f'Um novo login foi realizado na sua conta em '
        f'{timezone.localtime():%d/%m/%Y às %H:%M}.\n'
        f'Se não foi você, troque sua senha imediatamente.'
    )

    def enviar():
        try:
            enviar_email_async(subject, message, user.email)
        except Exception:
            logger.exception('Falha ao enviar aviso de login')

    threading.Thread(target=enviar, daemon=True).start()
