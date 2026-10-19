"""
Refresh token em cookie `httpOnly` — o achado que o diagnóstico tinha deixado
deliberadamente para depois.

## O problema

Access token E refresh token viviam em `localStorage`. Qualquer XSS na
aplicação lia os dois com uma linha de JavaScript. O access token expira em
30 min, o que já é ruim; o **refresh** valia 1 dia e permitia gerar access
tokens novos indefinidamente dentro desse período — ou seja, um XSS de um
segundo virava acesso persistente à conta.

## A correção, e por que ela cabe aqui

O motivo registrado para adiar era CORS/CSRF entre `localhost:5173` (front) e
`localhost:8000` (back) sem HTTPS: um cookie cross-site precisaria de
`SameSite=None; Secure`, e `Secure` exige HTTPS.

A premissa estava errada num ponto específico: **cookies ignoram a porta ao
decidir o que é "mesmo site"**. `localhost:5173` e `localhost:8000` são o
MESMO site para efeito de `SameSite`. Um cookie `SameSite=Lax` funciona em
dev, sem HTTPS, sem `SameSite=None`. (A pegadinha real é `localhost` vs
`127.0.0.1`, que são hosts diferentes — por isso o `.env` do frontend passou
a apontar para `localhost:8000`, e não para `127.0.0.1:8000`.)

## O desenho adotado

- **Refresh token**: cookie `httpOnly`, invisível para JavaScript. Não sai
  mais no corpo da resposta de login.
- **Access token**: guardado só em memória no frontend (variável de módulo),
  nunca em `localStorage`. Fecha a aba, some. No boot da aplicação, um
  refresh silencioso usando o cookie restaura a sessão.
- **CSRF**: o cookie é `SameSite=Lax`, então um site terceiro não consegue
  fazer o navegador enviá-lo numa requisição de fundo. Além disso as rotas
  que o consomem são POST e a API é consumida por `fetch`/XHR com
  `Content-Type: application/json`, que o navegador só permite cross-origin
  depois de um preflight CORS — e a lista de origens permitidas é fechada.

O corpo continua sendo aceito como fonte do refresh token (`{"refresh": ...}`)
para clientes que não são navegador — a suíte de testes de integração em
`tests/` e qualquer script usam esse caminho.
"""
from django.conf import settings

#: Nome do cookie que carrega o refresh token.
REFRESH_COOKIE_NAME = 'prisma_refresh'


def _cookie_kwargs():
    """
    Atributos do cookie, derivados do ambiente.

    `Secure` acompanha `DEBUG`: em dev (HTTP puro) sai desligado, senão o
    navegador descartaria o cookie; em produção (`DEBUG=False`) entra ligado.
    `SameSite` é configurável porque um deploy com front e back em domínios
    diferentes precisa de `None` (que exige `Secure`, o que produção já tem).
    """
    return {
        'httponly': True,
        'secure': not settings.DEBUG,
        'samesite': getattr(settings, 'REFRESH_COOKIE_SAMESITE', 'Lax'),
        # Caminho estreito: o cookie só é enviado para as rotas de usuário
        # (login, refresh, logout), não para toda a API.
        'path': '/api/users/',
    }


def set_refresh_cookie(response, refresh_token):
    """Grava o refresh token no cookie httpOnly."""
    max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        str(refresh_token),
        max_age=max_age,
        **_cookie_kwargs(),
    )
    return response


def clear_refresh_cookie(response):
    """Remove o cookie (logout)."""
    kwargs = _cookie_kwargs()
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=kwargs['path'],
        samesite=kwargs['samesite'],
    )
    return response


def get_refresh_token(request):
    """
    Lê o refresh token do cookie; se não houver, aceita o corpo da requisição.

    A ordem importa: o cookie vem primeiro para que um navegador com sessão
    válida nunca dependa de o JavaScript ter guardado o token em algum lugar.
    O fallback pelo corpo mantém clientes não-navegador (scripts, testes de
    integração) funcionando sem mudança.
    """
    from_cookie = request.COOKIES.get(REFRESH_COOKIE_NAME)
    if from_cookie:
        return from_cookie
    return request.data.get('refresh')
