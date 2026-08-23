import threading

from django.db.models.signals import post_save
from django.contrib.auth import get_user_model
from django.dispatch import receiver
from .models import Profile
from .emails import enviar_email_async
from django.contrib.auth.signals import user_logged_in
from django.utils import timezone

# IMPORTANTE: o projeto usa AUTH_USER_MODEL = 'users.User' (custom user).
# Os receivers abaixo usavam `django.contrib.auth.models.User` (o model
# padrão do Django, que este projeto nem tem instalado em INSTALLED_APPS
# como 'auth'-based). Como `sender` nunca batia com o model real, os dois
# sinais abaixo NUNCA disparavam para os usuários de verdade — o Profile só
# existia quando algo o criava explicitamente (ex.: register_user).
User = get_user_model()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'profile'):
        # Por padrão, criamos como 'candidate'.
        # Você pode alterar isso depois no Admin (editando o campo "role"
        # do usuário) ou via API.
        Profile.objects.create(user=instance, type=instance.role or 'candidate')

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # `Profile.type` é só um espelho de `User.role` (a fonte real da
    # verdade usada em login/permissões). Sincronizamos aqui para que
    # editar o usuário no Admin sempre reflita no Profile também — antes
    # dava para editar os dois separadamente e ficarem contraditórios
    # (ex.: role='company' mas profile.type='gestor').
    profile, _ = Profile.objects.get_or_create(user=instance, defaults={'type': instance.role})
    if profile.type != instance.role:
        profile.type = instance.role
        profile.save(update_fields=['type'])

print("SINAL CARREGADO COM SUCESSO!")

@receiver(user_logged_in)
def notify_user_login(sender, request, user, **kwargs):
    # Antes usava o send_mail() nativo do Django, que cai no EMAIL_BACKEND
    # de console (settings.py) — ou seja, o aviso nunca saía de verdade para
    # o usuário. Trocado para o mesmo caminho (Resend) usado pelo resto do
    # app, e disparado em thread separada para não travar a resposta do
    # login.
    subject = 'Novo Login Detectado - PRISMA'
    message = (
        f'Olá {user.username},\n\n'
        f'Um novo login foi realizado na sua conta em {timezone.now()}.\n'
        f'Se não foi você, mude sua senha imediatamente.'
    )

    def enviar():
        try:
            enviar_email_async(subject, message, user.email)
        except Exception as e:
            print(f"Erro ao enviar e-mail de login: {e}")

    threading.Thread(target=enviar).start()