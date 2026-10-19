"""
Throttles das rotas sensíveis de autenticação.

Duas famílias, que se complementam:

1. **Por IP** (`AnonRateThrottle`) — as classes `*RateThrottle`. Barram o
   atacante ingênuo que dispara tudo da mesma origem.

2. **Por conta alvo** (`TargetAccountThrottle`) — as classes `*ByAccount`.
   Existem porque o throttle por IP tem um furo grande e conhecido: trocar de
   IP (proxy, VPN, botnet) zera o contador. Um ataque distribuído contra UMA
   conta específica passava reto pelo limite por IP. Aqui a chave do contador
   é o e-mail alvo, então o limite acompanha a vítima e não a origem.

A defesa real contra força-bruta do código de 6 dígitos, porém, não é
nenhuma das duas — é o contador de tentativas por código em
`SecurityCode.attempts` (5 erros queimam o código), que nenhum rodízio de IP
contorna. Os throttles aqui são a primeira camada, não a última.
"""
import hashlib

from rest_framework.throttling import (
    AnonRateThrottle,
    SimpleRateThrottle,
    UserRateThrottle,
)


# --- Camada 1: por IP de origem -------------------------------------------

class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'


class PasswordResetConfirmRateThrottle(AnonRateThrottle):
    scope = 'password_reset_confirm'


class ConfirmRegistrationRateThrottle(AnonRateThrottle):
    scope = 'confirm_registration'


class ChangePasswordRateThrottle(UserRateThrottle):
    """
    Troca de senha do usuário logado.

    `UserRateThrottle` (e não `AnonRateThrottle`) porque a rota exige
    autenticação: a chave é o id do usuário, não o IP. Isso limita o chute
    da senha ATUAL por quem pegou um token emprestado — um computador
    compartilhado deixado aberto, por exemplo.
    """

    scope = 'change_password'


# --- Camada 2: por conta alvo ---------------------------------------------

class TargetAccountThrottle(SimpleRateThrottle):
    """
    Limita por identificador da conta alvo (o e-mail no corpo da requisição),
    independentemente do IP de origem.

    O e-mail entra na chave de cache como hash — chave de cache não é lugar
    para PII em texto puro, ainda mais quando o cache pode ser um Redis
    compartilhado em produção.
    """

    #: Campo do corpo da requisição que identifica a conta alvo.
    target_field = 'email'

    def get_cache_key(self, request, view):
        alvo = str(request.data.get(self.target_field, '') or '').strip().lower()
        if not alvo:
            # Sem alvo identificável, deixamos a camada por IP resolver.
            return None

        digest = hashlib.sha256(alvo.encode('utf-8')).hexdigest()
        return self.cache_format % {'scope': self.scope, 'ident': digest}


class LoginByAccountThrottle(TargetAccountThrottle):
    scope = 'login_account'
    # O login manda o identificador em `username` (que aceita e-mail OU PIN).
    target_field = 'username'


class PasswordResetByAccountThrottle(TargetAccountThrottle):
    scope = 'password_reset_account'


class PasswordResetConfirmByAccountThrottle(TargetAccountThrottle):
    scope = 'password_reset_confirm_account'


class ConfirmRegistrationByAccountThrottle(TargetAccountThrottle):
    scope = 'confirm_registration_account'
