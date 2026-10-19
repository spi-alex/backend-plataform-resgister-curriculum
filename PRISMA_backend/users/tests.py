"""
Testes de autenticação, cadastro e recuperação de senha.

Cobre a rodada de segurança de 25 ago 2026, que separou o código de uso único
(`SecurityCode`) da matrícula do usuário (`User.pin`), além do que já vinha
das rodadas anteriores (status de conta, whitelist de roles, throttling).

Os testes de autorização/IDOR ficam em `users/tests_authz.py`.
"""
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from captcha.models import CaptchaStore
from companies.models import Company
from users.cookies import REFRESH_COOKIE_NAME
from users.models import SecurityCode

User = get_user_model()

SENHA_VALIDA = "SenhaForte123!"

# Código fixo usado no lugar do sorteado, para o teste conseguir "ler o
# e-mail". O código real é guardado só como hash, então não há como recuperá-lo
# do banco — que é exatamente a propriedade que se quer garantir.
CODIGO_FIXO = "424242"


def make_captcha():
    """CaptchaStore válido direto no banco, sem depender da geração de imagem."""
    store = CaptchaStore.objects.create(
        hashkey="testhashkey0000000000000000000",
        response="abcde",
        challenge="abcde",
    )
    return store.hashkey, store.response


class BaseAuthTest(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def registrar(self, email="aluno@example.com", role="aluno", senha=SENHA_VALIDA, **extra):
        hashkey, response = make_captcha()
        payload = {
            "username": email,
            "email": email,
            "password": senha,
            "captcha_0": hashkey,
            "captcha_1": response,
            "role": role,
            "perfil": {"nome": "Aluno Teste"},
            **extra,
        }
        with patch("users.views.enviar_email_async"), \
             patch.object(SecurityCode, "generate_code", return_value=CODIGO_FIXO):
            return self.client.post("/api/users/register/", payload, format="json")

    def confirmar(self, email="aluno@example.com", codigo=CODIGO_FIXO):
        with patch("users.views.enviar_email_async"):
            return self.client.post(
                "/api/users/confirm/", {"email": email, "pin": codigo}, format="json"
            )

    def logar(self, email="aluno@example.com", senha=SENHA_VALIDA):
        with patch("users.views.enviar_email_async"):
            return self.client.post(
                "/api/users/login/", {"username": email, "password": senha}, format="json"
            )


class RegistrationAndLoginStatusTests(BaseAuthTest):
    """register -> 'pendente' -> login bloqueado -> confirm -> 'ativo' -> login ok."""

    def test_register_creates_pending_account_without_tokens(self):
        resp = self.registrar()
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertNotIn("access", resp.data)
        self.assertNotIn("refresh", resp.data)

        user = User.objects.get(email="aluno@example.com")
        self.assertEqual(user.status, "pendente")

    def test_pending_account_cannot_login(self):
        self.registrar()
        resp = self.logar()
        self.assertEqual(resp.status_code, 400)
        self.assertNotIn("access", resp.data)

    def test_confirm_activates_account_and_returns_access(self):
        self.registrar()
        resp = self.confirmar()
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIn("access", resp.data)

        user = User.objects.get(email="aluno@example.com")
        self.assertEqual(user.status, "ativo")

    def test_login_works_after_confirmation(self):
        self.registrar()
        self.confirmar()
        resp = self.logar()
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIn("access", resp.data)

    def test_confirm_rejects_wrong_code(self):
        self.registrar()
        resp = self.confirmar(codigo="000000")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(User.objects.get(email="aluno@example.com").status, "pendente")

    def test_confirm_code_is_single_use(self):
        """Confirmar duas vezes com o mesmo código: a segunda tem que falhar."""
        self.registrar()
        self.assertEqual(self.confirmar().status_code, 200)
        self.assertEqual(self.confirmar().status_code, 400)

    def test_self_register_role_whitelist_blocks_gestor(self):
        """`role` vinha direto de request.data: role='gestor' criava um gestor."""
        resp = self.registrar(email="tentativa@example.com", role="gestor")
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(User.objects.get(email="tentativa@example.com").role, "candidate")

    def test_duplicate_email_is_rejected_cleanly(self):
        self.registrar()
        resp = self.registrar()
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(User.objects.filter(email="aluno@example.com").count(), 1)

    def test_email_is_normalized_to_lowercase(self):
        """Sem normalizar, 'A@x.com' e 'a@x.com' viram contas distintas — e o
        reset de senha, que busca com iexact, passa a escolher uma ao acaso."""
        self.registrar(email="MAIUSCULA@Example.COM")
        self.assertTrue(User.objects.filter(email="maiuscula@example.com").exists())

    def test_weak_password_is_rejected_on_register(self):
        """Nenhuma rota chamava validate_password: qualquer senha passava."""
        resp = self.registrar(email="fraca@example.com", senha="123")
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(User.objects.filter(email="fraca@example.com").exists())

    def test_password_similar_to_email_is_rejected_on_register(self):
        """
        O `UserAttributeSimilarityValidator` está ligado no settings, mas
        começa com `if not user: return` — e o cadastro chamava
        `validate_password(password)` sem `user=`, desligando-o em silêncio.
        Dava para cadastrar com a senha praticamente igual ao e-mail, que é
        o primeiro palpite de um ataque contra uma conta específica.
        """
        resp = self.registrar(
            email="marialuiza@example.com", senha="marialuiza1"
        )
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertIn("parecida", str(resp.data))
        self.assertFalse(
            User.objects.filter(email="marialuiza@example.com").exists()
        )

    def test_password_similar_to_name_is_rejected_on_register(self):
        """
        A mesma checagem vale para o nome enviado em `perfil.nome` — daí ele
        entrar no `User` não salvo montado para a validação.

        "Nome + números" é o formato de senha fraca mais comum e é o que este
        teste cobre. Vale registrar o limite do validador do Django: ele
        compara com cada atributo SEPARADAMENTE ("Ricardo", "Almeida"), nunca
        com a concatenação, então "ricardoalmeida" passa. Cobrir esse caso
        exigiria um validador próprio; está fora do que esta correção se
        propôs a fazer.
        """
        hashkey, response = make_captcha()
        with patch("users.views.enviar_email_async"):
            resp = self.client.post("/api/users/register/", {
                "username": "contato@example.com",
                "email": "contato@example.com",
                "password": "ricardo123",
                "captcha_0": hashkey, "captcha_1": response,
                "role": "aluno",
                "perfil": {"nome": "Ricardo Almeida"},
            }, format="json")
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertIn("parecida", str(resp.data))

    def test_unrelated_strong_password_still_registers(self):
        """
        Contraprova do teste acima: a instância não salva usada na validação
        não pode passar a reprovar senha legítima.
        """
        resp = self.registrar(email="ok@example.com", senha=SENHA_VALIDA)
        self.assertEqual(resp.status_code, 201, resp.data)

    def test_invalid_cpf_is_rejected(self):
        """Antes a única validação de CPF era a máscara do formulário React."""
        hashkey, response = make_captcha()
        with patch("users.views.enviar_email_async"):
            resp = self.client.post("/api/users/register/", {
                "username": "cpf@example.com",
                "email": "cpf@example.com",
                "password": SENHA_VALIDA,
                "captcha_0": hashkey, "captcha_1": response,
                "role": "aluno",
                "perfil": {"nome": "Teste", "cpf": "111.111.111-11"},
            }, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("CPF", str(resp.data))

    def test_register_does_not_leak_internal_errors(self):
        """A view devolvia `str(e)` no corpo do 500, entregando detalhes
        internos (SQL, caminhos, nomes de campo) a quem provocasse um erro."""
        hashkey, response = make_captcha()
        with patch("users.views.User.objects.create_user", side_effect=Exception("segredo interno: coluna xyz")), \
             patch("users.views.enviar_email_async"):
            resp = self.client.post("/api/users/register/", {
                "username": "boom@example.com", "email": "boom@example.com",
                "password": SENHA_VALIDA,
                "captcha_0": hashkey, "captcha_1": response, "role": "aluno",
            }, format="json")
        self.assertEqual(resp.status_code, 500)
        self.assertNotIn("segredo interno", str(resp.data))


class PasswordResetTests(BaseAuthTest):
    """
    O fluxo de recuperação de senha, que era o ponto mais frágil do sistema.

    Desenho antigo: o "código" era o `User.pin` — a mesma matrícula exibida na
    tela de perfil e aceita como credencial de login —, gravado em texto puro,
    sem validade e sem limite de tentativas por código. Além disso, pedir um
    reset TROCAVA o PIN da vítima.
    """

    def setUp(self):
        super().setUp()
        self.registrar()
        self.confirmar()
        self.user = User.objects.get(email="aluno@example.com")
        cache.clear()

    def pedir_reset(self, email="aluno@example.com"):
        with patch("users.views.enviar_email_async"), \
             patch.object(SecurityCode, "generate_code", return_value=CODIGO_FIXO):
            return self.client.post("/api/users/password-reset/", {"email": email}, format="json")

    def confirmar_reset(self, codigo=CODIGO_FIXO, nova_senha="NovaSenha456!", email="aluno@example.com"):
        with patch("users.views.enviar_email_async"):
            return self.client.post("/api/users/password-reset-confirm/", {
                "email": email, "pin": codigo, "new_password": nova_senha,
            }, format="json")

    # --- comportamento correto do fluxo ---

    def test_full_reset_flow_changes_password(self):
        self.pedir_reset()
        resp = self.confirmar_reset()
        self.assertEqual(resp.status_code, 200, resp.data)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NovaSenha456!"))

    def test_reset_does_not_change_user_pin(self):
        """
        O achado mais direto do desenho antigo: `password_reset_request` fazia
        `user.pin = user.generate_unique_pin()`. Como o PIN é a matrícula e
        serve para entrar no sistema, qualquer pessoa que soubesse o e-mail de
        alguém podia, SEM AUTENTICAÇÃO, trocar a matrícula da vítima à
        vontade — negação de serviço no login por matrícula.
        """
        pin_antes = self.user.pin
        self.pedir_reset()
        self.user.refresh_from_db()
        self.assertEqual(self.user.pin, pin_antes)

    def test_user_pin_is_not_accepted_as_reset_code(self):
        """A matrícula não vale mais como código de reset."""
        self.pedir_reset()
        resp = self.confirmar_reset(codigo=self.user.pin)
        self.assertEqual(resp.status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("NovaSenha456!"))

    def test_reset_response_does_not_reveal_account_existence(self):
        """Resposta idêntica para e-mail cadastrado e não cadastrado."""
        existente = self.pedir_reset("aluno@example.com")
        cache.clear()
        inexistente = self.pedir_reset("ninguem@example.com")
        self.assertEqual(existente.status_code, inexistente.status_code)
        self.assertEqual(existente.data, inexistente.data)

    # --- propriedades de segurança do código ---

    def test_code_is_stored_hashed(self):
        """Vazamento do banco não pode entregar códigos utilizáveis."""
        self.pedir_reset()
        registro = SecurityCode.objects.filter(
            user=self.user, purpose=SecurityCode.PURPOSE_PASSWORD_RESET
        ).latest('created_at')
        self.assertNotEqual(registro.code_hash, CODIGO_FIXO)
        self.assertNotIn(CODIGO_FIXO, registro.code_hash)

    def test_code_is_single_use(self):
        self.pedir_reset()
        self.assertEqual(self.confirmar_reset().status_code, 200)
        cache.clear()
        segunda = self.confirmar_reset(nova_senha="OutraSenha789!")
        self.assertEqual(segunda.status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("OutraSenha789!"))

    def test_expired_code_is_rejected(self):
        """O PIN antigo nunca expirava: um e-mail de meses atrás servia."""
        self.pedir_reset()
        registro = SecurityCode.objects.filter(user=self.user).latest('created_at')
        registro.expires_at = timezone.now() - timedelta(minutes=1)
        registro.save(update_fields=['expires_at'])

        self.assertEqual(self.confirmar_reset().status_code, 400)

    def test_new_request_invalidates_previous_code(self):
        self.pedir_reset()
        primeiro = SecurityCode.objects.filter(user=self.user).latest('created_at')

        with patch("users.views.enviar_email_async"), \
             patch.object(SecurityCode, "generate_code", return_value="999999"):
            cache.clear()
            self.client.post("/api/users/password-reset/", {"email": self.user.email}, format="json")

        primeiro.refresh_from_db()
        self.assertIsNotNone(primeiro.used_at)
        cache.clear()
        self.assertEqual(self.confirmar_reset(codigo=CODIGO_FIXO).status_code, 400)

    def test_code_burns_after_max_attempts_regardless_of_ip(self):
        """
        Esta é a defesa que o throttle por IP não dava.

        O throttle conta por endereço de origem e zera quando o atacante troca
        de IP. O contador de tentativas por código, não: cinco erros queimam o
        código, e nem o código certo funciona depois disso.
        """
        self.pedir_reset()
        for _ in range(SecurityCode.MAX_ATTEMPTS):
            cache.clear()  # simula um IP novo a cada tentativa
            self.confirmar_reset(codigo="000000")

        cache.clear()
        resp = self.confirmar_reset(codigo=CODIGO_FIXO)
        self.assertEqual(resp.status_code, 400)
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("NovaSenha456!"))

    def test_weak_password_is_rejected_on_reset(self):
        """O reset era um desvio completo da política de senha."""
        self.pedir_reset()
        resp = self.confirmar_reset(nova_senha="123")
        self.assertEqual(resp.status_code, 400)

    def test_reset_revokes_existing_sessions(self):
        """
        Trocar a senha tem que derrubar as sessões abertas — é justamente o
        momento em que a vítima quer expulsar quem invadiu. Antes o access
        token do invasor seguia válido pelos 30 minutos inteiros.
        """
        login = self.logar()
        access = login.data["access"]

        autenticado = APIClient()
        autenticado.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(autenticado.get("/api/users/me/").status_code, 200)

        cache.clear()
        self.pedir_reset()
        cache.clear()
        self.assertEqual(self.confirmar_reset().status_code, 200)

        self.assertEqual(autenticado.get("/api/users/me/").status_code, 401)


class ChangePasswordTests(BaseAuthTest):
    """
    Troca de senha do usuário LOGADO (`POST /api/users/change-password/`).

    Antes esta rota não existia: a única forma de trocar de senha era o
    fluxo de recuperação por e-mail, desenhado para quem PERDEU o acesso.
    Quem já estava dentro do sistema precisava deslogar e pedir um código;
    quem tinha perdido a caixa de e-mail não conseguia trocar de jeito
    nenhum.
    """

    SENHA_NOVA = "OutraSenhaForte789!"

    def setUp(self):
        super().setUp()
        self.registrar()
        self.confirmar()
        self.user = User.objects.get(email="aluno@example.com")
        cache.clear()

    def cliente_logado(self):
        resp = self.logar()
        self.assertEqual(resp.status_code, 200, resp.data)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        return client

    def trocar(self, client, atual=SENHA_VALIDA, nova=None):
        with patch("users.views.enviar_email_async"):
            return client.post("/api/users/change-password/", {
                "current_password": atual,
                "new_password": nova if nova is not None else self.SENHA_NOVA,
            }, format="json")

    # --- comportamento correto ---

    def test_change_password_updates_credentials(self):
        resp = self.trocar(self.cliente_logado())
        self.assertEqual(resp.status_code, 200, resp.data)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.SENHA_NOVA))
        self.assertFalse(self.user.check_password(SENHA_VALIDA))

    def test_login_works_with_new_password_only(self):
        self.trocar(self.cliente_logado())
        cache.clear()

        # 401 (e não 400): senha errada é falha de credencial no
        # `TokenObtainPairSerializer`; 400 é o que a conta 'pendente' devolve.
        self.assertEqual(self.logar(senha=SENHA_VALIDA).status_code, 401)
        cache.clear()
        self.assertEqual(self.logar(senha=self.SENHA_NOVA).status_code, 200)

    # --- exigências de segurança ---

    def test_anonymous_cannot_change_password(self):
        """Sem esta trava a rota seria uma tomada de conta sem credencial."""
        with patch("users.views.enviar_email_async"):
            resp = self.client.post("/api/users/change-password/", {
                "current_password": SENHA_VALIDA,
                "new_password": self.SENHA_NOVA,
            }, format="json")
        self.assertEqual(resp.status_code, 401)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(SENHA_VALIDA))

    def test_wrong_current_password_is_rejected(self):
        """
        Exigir a senha atual é o que impede um token roubado (sessão deixada
        aberta num computador compartilhado) de virar sequestro definitivo
        da conta.
        """
        resp = self.trocar(self.cliente_logado(), atual="SenhaErrada123!")
        self.assertEqual(resp.status_code, 400)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(SENHA_VALIDA))

    def test_weak_new_password_is_rejected(self):
        resp = self.trocar(self.cliente_logado(), nova="123")
        self.assertEqual(resp.status_code, 400)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(SENHA_VALIDA))

    def test_new_password_similar_to_email_is_rejected(self):
        """Aqui o `user=` sai de graça — o usuário está autenticado."""
        resp = self.trocar(self.cliente_logado(), nova="alunoexample1")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("parecida", str(resp.data))

    def test_reusing_the_same_password_is_rejected(self):
        resp = self.trocar(self.cliente_logado(), nova=SENHA_VALIDA)
        self.assertEqual(resp.status_code, 400)

    def test_missing_fields_are_rejected(self):
        client = self.cliente_logado()
        with patch("users.views.enviar_email_async"):
            resp = client.post("/api/users/change-password/", {
                "new_password": self.SENHA_NOVA,
            }, format="json")
        self.assertEqual(resp.status_code, 400)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(SENHA_VALIDA))

    def test_change_revokes_all_sessions(self):
        """
        Mesma garantia do reset: um invasor com um access token da vítima não
        pode continuar dentro depois de ela trocar a senha — que é
        justamente o momento em que ela mais precisa disso.
        """
        invasor = self.cliente_logado()
        self.assertEqual(invasor.get("/api/users/me/").status_code, 200)

        dono = self.cliente_logado()
        self.assertEqual(self.trocar(dono).status_code, 200)

        self.assertEqual(invasor.get("/api/users/me/").status_code, 401)
        # Inclusive a sessão de quem trocou: a revogação é por marca de
        # tempo, então não há como poupar uma sem poupar as outras. O corpo
        # da resposta avisa o cliente para mandar o usuário logar de novo.
        self.assertEqual(dono.get("/api/users/me/").status_code, 401)

    def test_response_signals_session_ended_and_clears_cookie(self):
        client = self.cliente_logado()
        resp = self.trocar(client)
        self.assertTrue(resp.data.get("session_ended"))
        # Cookie de refresh apagado — senão o cliente tentaria renovar uma
        # sessão que acabou de ser revogada.
        self.assertEqual(resp.cookies[REFRESH_COOKIE_NAME].value, "")

    def test_change_password_is_rate_limited(self):
        """Limita o chute da senha atual por quem pegou um token emprestado."""
        client = self.cliente_logado()
        for _ in range(5):
            self.trocar(client, atual="SenhaErrada123!")
        resp = self.trocar(client, atual="SenhaErrada123!")
        self.assertEqual(resp.status_code, 429)


class SessionRevocationTests(BaseAuthTest):
    """Logout e desativação de conta invalidam tokens já emitidos."""

    def setUp(self):
        super().setUp()
        self.registrar()
        self.confirmar()
        self.user = User.objects.get(email="aluno@example.com")
        cache.clear()

    def test_logout_invalidates_access_token(self):
        access = self.logar().data["access"]
        cliente = APIClient()
        cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        self.assertEqual(cliente.get("/api/users/me/").status_code, 200)
        self.assertEqual(cliente.post("/api/users/logout/").status_code, 200)
        # Antes, "sair da conta" era só localStorage.clear() no navegador —
        # o token continuava válido no servidor até expirar.
        self.assertEqual(cliente.get("/api/users/me/").status_code, 401)

    def test_deactivated_account_cannot_use_existing_token(self):
        access = self.logar().data["access"]
        cliente = APIClient()
        cliente.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(cliente.get("/api/users/me/").status_code, 200)

        self.user.status = "inativo"
        self.user.save(update_fields=["status"])

        self.assertEqual(cliente.get("/api/users/me/").status_code, 401)

    def test_inactive_django_user_cannot_login(self):
        """`EmailOrPinBackend` pulava `user_can_authenticate()`: marcar o
        usuário como inativo no admin não impedia o login."""
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        cache.clear()
        self.assertEqual(self.logar().status_code, 401)


class RefreshCookieTests(BaseAuthTest):
    """O refresh token vive num cookie httpOnly, fora do alcance do JavaScript."""

    def setUp(self):
        super().setUp()
        self.registrar()
        self.confirmar()
        cache.clear()

    def test_login_sets_httponly_cookie_and_omits_refresh_from_body(self):
        resp = self.logar()
        self.assertEqual(resp.status_code, 200, resp.data)

        # O corpo não carrega mais o refresh: um XSS que leia a resposta do
        # login não consegue uma sessão renovável de 1 dia.
        self.assertNotIn("refresh", resp.data)

        cookie = resp.cookies.get(REFRESH_COOKIE_NAME)
        self.assertIsNotNone(cookie)
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")

    def test_refresh_works_from_cookie_alone(self):
        self.logar()  # o APIClient guarda o cookie
        resp = self.client.post("/api/users/token/refresh/", {}, format="json")
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIn("access", resp.data)

    def test_refresh_without_cookie_is_rejected(self):
        resp = APIClient().post("/api/users/token/refresh/", {}, format="json")
        self.assertEqual(resp.status_code, 401)

    def test_logout_clears_cookie(self):
        access = self.logar().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = self.client.post("/api/users/logout/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.cookies[REFRESH_COOKIE_NAME].value, "")


class LegacyTokenRouteTests(BaseAuthTest):
    """
    `/api/token/` (rota antiga, no core/urls.py) não pode ser um caminho
    paralelo de login sem as travas de `/api/users/login/`.

    Ela usava as views genéricas do SimpleJWT, então ignorava a checagem de
    status da conta, não tinha rate limiting e devolvia o refresh no corpo.
    """

    def test_legacy_token_route_rejects_pending_account(self):
        self.registrar()  # nasce 'pendente'
        resp = self.client.post(
            "/api/token/",
            {"username": "aluno@example.com", "password": SENHA_VALIDA},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertNotIn("access", resp.data)

    def test_legacy_token_route_uses_cookie_for_refresh(self):
        self.registrar()
        self.confirmar()
        cache.clear()
        resp = self.client.post(
            "/api/token/",
            {"username": "aluno@example.com", "password": SENHA_VALIDA},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertNotIn("refresh", resp.data)
        self.assertIsNotNone(resp.cookies.get(REFRESH_COOKIE_NAME))

    def test_legacy_token_route_is_rate_limited(self):
        last = None
        for _ in range(12):
            last = self.client.post(
                "/api/token/", {"username": "x@example.com", "password": "errada"},
                format="json",
            ).status_code
        self.assertEqual(last, 429)


class ThrottleTests(BaseAuthTest):
    """As rotas AllowAny sensíveis recusam (429) depois de N tentativas."""

    def test_register_endpoint_is_rate_limited(self):
        last = None
        for _ in range(6):
            last = self.client.post(
                "/api/users/register/", {"captcha_0": "x", "captcha_1": "y"}, format="json"
            ).status_code
        self.assertEqual(last, 429)

    def test_password_reset_confirm_is_rate_limited_by_ip(self):
        last = None
        for _ in range(6):
            last = self.client.post("/api/users/password-reset-confirm/", {
                "email": "ninguem@example.com", "pin": "000000", "new_password": "x",
            }, format="json").status_code
        self.assertEqual(last, 429)

    def test_password_reset_is_rate_limited_per_target_account(self):
        """
        Camada que o throttle por IP não cobre: um ataque distribuído contra
        UMA conta passava reto, porque cada IP tinha seu próprio contador.
        Aqui a chave do limite é o e-mail alvo.
        """
        from users.throttles import PasswordResetRateThrottle

        with patch.object(PasswordResetRateThrottle, 'allow_request', return_value=True):
            last = None
            for _ in range(6):
                last = self.client.post(
                    "/api/users/password-reset/", {"email": "alvo@example.com"}, format="json"
                ).status_code
        self.assertEqual(last, 429)


class GestorCompanyListingTests(TestCase):
    """gestor/companies/ devolve os campos institucionais de Company."""

    def setUp(self):
        cache.clear()
        self.gestor = User.objects.create_user(
            username="gestor@example.com", email="gestor@example.com",
            password=SENHA_VALIDA, role="gestor", status="ativo",
        )
        self.company_owner = User.objects.create_user(
            username="empresa@example.com", email="empresa@example.com",
            password=SENHA_VALIDA, role="company", status="ativo",
        )
        Company.objects.create(
            owner=self.company_owner, name="Empresa Teste",
            cnpj="00.000.000/0001-00", description="desc",
            area_atuacao="Tecnologia", responsavel_nome="Fulano",
        )
        self.client = APIClient()

    def test_listing_includes_institutional_fields(self):
        self.client.force_authenticate(user=self.gestor)
        resp = self.client.get("/api/users/gestor/companies/")
        self.assertEqual(resp.status_code, 200)
        row = resp.data[0]
        self.assertIn("area_atuacao", row)
        self.assertIn("responsavel_nome", row)
        self.assertEqual(row["area_atuacao"], "Tecnologia")


class DocumentValidatorTests(TestCase):
    """Dígito verificador de CPF/CNPJ, que só existia como máscara no front."""

    def test_valid_cpf_passes(self):
        from users.validators import validar_cpf
        self.assertEqual(validar_cpf("529.982.247-25"), "52998224725")

    def test_repeated_digits_cpf_fails(self):
        from django.core.exceptions import ValidationError
        from users.validators import validar_cpf
        for valor in ("111.111.111-11", "000.000.000-00"):
            with self.assertRaises(ValidationError):
                validar_cpf(valor)

    def test_wrong_check_digit_cpf_fails(self):
        from django.core.exceptions import ValidationError
        from users.validators import validar_cpf
        with self.assertRaises(ValidationError):
            validar_cpf("529.982.247-26")

    def test_valid_cnpj_passes(self):
        from users.validators import validar_cnpj
        self.assertEqual(validar_cnpj("11.222.333/0001-81"), "11222333000181")

    def test_wrong_check_digit_cnpj_fails(self):
        from django.core.exceptions import ValidationError
        from users.validators import validar_cnpj
        with self.assertRaises(ValidationError):
            validar_cnpj("11.222.333/0001-82")
