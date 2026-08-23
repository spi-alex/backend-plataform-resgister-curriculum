"""
Cobertura para a rodada de correções de segurança de 21 ago 2026:
- status de conta (pendente -> ativo) bloqueando login antes da confirmação
  do PIN de cadastro;
- whitelist de roles no autocadastro (mass assignment corrigido);
- rate limiting nas rotas AllowAny sensíveis (login, cadastro, reset e
  confirmação de conta);
- listagem de empresas do gestor devolvendo os campos institucionais novos.

O projeto não tinha nenhum teste automatizado até aqui — os arquivos
`tests.py` de cada app só tinham o boilerplate do `startapp`. Este é o
primeiro conjunto real, focado no que foi corrigido nesta rodada.
"""
from unittest.mock import patch

from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from captcha.models import CaptchaStore
from companies.models import Company

User = get_user_model()


def make_captcha():
    """Cria um CaptchaStore válido diretamente no banco, sem depender da
    geração de imagem — o suficiente para passar a validação de
    `register_user`."""
    store = CaptchaStore.objects.create(
        hashkey="testhashkey0000000000000000000",
        response="abcde",
        challenge="abcde",
    )
    return store.hashkey, store.response


class RegistrationAndLoginStatusTests(TestCase):
    """register_user -> status 'pendente' -> login bloqueado -> confirm_registration -> ativo -> login ok."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def _register(self, email="aluno@example.com", role="aluno", **extra_perfil):
        hashkey, response = make_captcha()
        payload = {
            "username": email,
            "email": email,
            "password": "SenhaForte123",
            "captcha_0": hashkey,
            "captcha_1": response,
            "role": role,
            "perfil": {"nome": "Aluno Teste", **extra_perfil},
        }
        with patch("users.views.enviar_email_async"):
            return self.client.post("/api/users/register/", payload, format="json")

    def test_register_creates_pending_account_without_tokens(self):
        resp = self._register()
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertNotIn("tokens", resp.data)

        user = User.objects.get(email="aluno@example.com")
        self.assertEqual(user.status, "pendente")

    def test_pending_account_cannot_login(self):
        self._register()
        resp = self.client.post(
            "/api/users/login/",
            {"username": "aluno@example.com", "password": "SenhaForte123"},
            format="json",
        )
        # ValidationError levantado no serializer -> 400, não 401. O corpo
        # carrega a mensagem pedindo para confirmar o cadastro.
        self.assertEqual(resp.status_code, 400)
        self.assertNotIn("access", resp.data)

    def test_confirm_activates_account_and_returns_tokens(self):
        self._register()
        user = User.objects.get(email="aluno@example.com")

        with patch("users.views.enviar_email_async"):
            resp = self.client.post(
                "/api/users/confirm/",
                {"email": user.email, "pin": user.pin},
                format="json",
            )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIn("tokens", resp.data)

        user.refresh_from_db()
        self.assertEqual(user.status, "ativo")

    def test_login_works_after_confirmation(self):
        self._register()
        user = User.objects.get(email="aluno@example.com")
        with patch("users.views.enviar_email_async"):
            self.client.post(
                "/api/users/confirm/", {"email": user.email, "pin": user.pin}, format="json"
            )

        resp = self.client.post(
            "/api/users/login/",
            {"username": "aluno@example.com", "password": "SenhaForte123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertIn("access", resp.data)

    def test_confirm_rejects_wrong_pin(self):
        self._register()
        resp = self.client.post(
            "/api/users/confirm/",
            {"email": "aluno@example.com", "pin": "000000"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        user = User.objects.get(email="aluno@example.com")
        self.assertEqual(user.status, "pendente")

    def test_self_register_role_whitelist_blocks_gestor(self):
        """Antes desta correção, `role` vinha direto de request.data sem
        checagem — um POST com role='gestor' criava uma conta de gestor."""
        resp = self._register(email="tentativa@example.com", role="gestor")
        self.assertEqual(resp.status_code, 201, resp.data)

        user = User.objects.get(email="tentativa@example.com")
        self.assertEqual(user.role, "candidate")
        self.assertNotEqual(user.role, "gestor")


class ThrottleTests(TestCase):
    """As rotas AllowAny sensíveis agora recusam (429) depois de N tentativas por IP."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_register_endpoint_is_rate_limited(self):
        # DEFAULT_THROTTLE_RATES['register'] = '5/min' — a 6ª tentativa no
        # mesmo IP deve ser recusada antes mesmo de validar o captcha.
        last_status = None
        for _ in range(6):
            last_status = self.client.post(
                "/api/users/register/",
                {"captcha_0": "x", "captcha_1": "y"},
                format="json",
            ).status_code
        self.assertEqual(last_status, 429)

    def test_password_reset_confirm_is_rate_limited(self):
        # DEFAULT_THROTTLE_RATES['password_reset_confirm'] = '5/min' — é o
        # endpoint que efetivamente tenta o PIN de 6 dígitos.
        last_status = None
        for _ in range(6):
            last_status = self.client.post(
                "/api/users/password-reset-confirm/",
                {"email": "ninguem@example.com", "pin": "000000", "new_password": "x"},
                format="json",
            ).status_code
        self.assertEqual(last_status, 429)


class GestorCompanyListingTests(TestCase):
    """gestor/companies/ agora devolve os campos institucionais novos de Company."""

    def setUp(self):
        cache.clear()
        self.gestor = User.objects.create_user(
            username="gestor@example.com", email="gestor@example.com",
            password="SenhaForte123", role="gestor", status="ativo",
        )
        self.company_owner = User.objects.create_user(
            username="empresa@example.com", email="empresa@example.com",
            password="SenhaForte123", role="company", status="ativo",
        )
        Company.objects.create(
            owner=self.company_owner,
            name="Empresa Teste",
            cnpj="00.000.000/0001-00",
            description="desc",
            area_atuacao="Tecnologia",
            responsavel_nome="Fulano",
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
