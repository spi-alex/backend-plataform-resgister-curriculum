from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailOrPinBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Tenta encontrar o usuário pelo E-mail OU pelo PIN
            user = User.objects.get(Q(email=username) | Q(pin=username))
        except User.DoesNotExist:
            return None

        # Se encontrou o usuário, verifica se a senha está correta
        if user.check_password(password):
            return user
        return None