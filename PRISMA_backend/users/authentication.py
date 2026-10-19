"""
Autenticação JWT com revogação por usuário.

O projeto roda o SimpleJWT com `CHECK_REVOCATION: False` e sem o app de
blacklist — o que significava, na prática, que **nada revogava um token**.
Um access token capturado continuava válido pelos 30 minutos inteiros mesmo
depois de o dono trocar a senha, fazer logout, ou o gestor desativar a conta.
Era o item "Validade e revogação de JWT" da bateria de testes.

A checagem aqui é barata (uma comparação de timestamp com um campo que já vem
no `select` do usuário) e cobre os três casos de uma vez:

- **logout**       -> `POST /api/users/logout/` chama `user.revoke_sessions()`
- **troca/reset de senha** -> as views de senha chamam `revoke_sessions()`
- **conta desativada**     -> `status` deixa de ser 'ativo'

Qualquer token cujo `iat` (instante de emissão) seja anterior a
`user.sessions_revoked_at` é recusado com 401, e o frontend cai no fluxo
normal de sessão expirada.
"""
from datetime import datetime, timezone as dt_timezone

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class RevocableJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        # Conta que não está ativa não autentica, mesmo com token válido na
        # mão. Sem isto, desativar uma conta ('inativo') só barrava logins
        # novos — quem já estava logado seguia usando o sistema.
        status = getattr(user, 'status', 'ativo')
        if status and status != 'ativo':
            raise AuthenticationFailed(
                'Esta conta não está ativa.', code='account_not_active'
            )

        revoked_at = getattr(user, 'sessions_revoked_at', None)
        if revoked_at is None:
            return user

        issued_at = validated_token.get('iat')
        if issued_at is None:
            # Token sem `iat` não tem como ser datado — tratamos como
            # anterior à revogação (falha para o lado seguro).
            raise AuthenticationFailed('Sessão expirada.', code='token_revoked')

        issued_dt = datetime.fromtimestamp(int(issued_at), tz=dt_timezone.utc)
        if issued_dt < revoked_at:
            raise AuthenticationFailed('Sessão expirada.', code='token_revoked')

        return user
