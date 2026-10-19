from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

User = get_user_model()


class EmailOrPinBackend(ModelBackend):
    """
    Permite entrar com e-mail OU matrícula (PIN) no mesmo campo, como pede a
    especificação de integração.

    Três correções sobre a versão anterior:

    1. **`is_active` voltou a ser respeitado.** A implementação antiga
       sobrescrevia `authenticate` e chamava só `check_password`, pulando o
       `user_can_authenticate()` que o `ModelBackend` faz. Resultado: marcar
       um usuário como inativo no admin não impedia o login dele.
    2. **`MultipleObjectsReturned` não derruba mais a requisição.** O
       `.get()` com `Q(email=...) | Q(pin=...)` estourava 500 sempre que
       duas contas dividissem o mesmo e-mail (o model do Django não exige
       e-mail único) ou quando o texto digitado casasse com o e-mail de uma
       conta e a matrícula de outra.
    3. **Ataque de temporização amenizado**: quando não há usuário,
       executamos um hash descartável, para o tempo de resposta de "usuário
       inexistente" não ser visivelmente menor que o de "senha errada".
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        if username is None or password is None:
            return None

        identificador = str(username).strip()

        # `first()` em vez de `get()`: nunca levanta MultipleObjectsReturned.
        # A ordenação por id deixa o resultado determinístico quando há
        # duplicidade (cenário que o cadastro agora impede de criar, mas que
        # pode existir em bases antigas).
        user = (
            User.objects
            .filter(Q(email__iexact=identificador) | Q(pin=identificador))
            .order_by('id')
            .first()
        )

        if user is None:
            User().set_password(password)  # equaliza o tempo de resposta
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
