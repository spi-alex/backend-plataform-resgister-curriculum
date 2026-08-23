"""
Throttles dedicados para as rotas sensíveis de autenticação (login, cadastro,
reset de senha e confirmação de conta). Antes nenhuma delas tinha limite de
tentativas — o PIN de reset/confirmação tem só 6 dígitos numéricos (900 mil
combinações), então sem throttle era força-bruta viável para quem já sabia
o e-mail alvo.

Usamos `AnonRateThrottle` (limita por IP) com uma `scope` fixa por classe em
vez de `ScopedRateThrottle`, porque as views afetadas são function-based
views (`@api_view`) e não têm como carregar `throttle_scope` dinamicamente
como uma view baseada em classe faria.
"""
from rest_framework.throttling import AnonRateThrottle


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
