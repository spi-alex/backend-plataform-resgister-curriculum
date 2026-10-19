"""
Testes de autorização e IDOR.

Cobre os itens da seção "Autorização & IDOR" da bateria de testes do
diagnóstico que estavam marcados como "validar com teste automatizado, não só
leitura de código" — ou seja, comportamentos que a correção introduziu mas que
nunca tinham sido exercitados de fato.

O cenário montado no `setUp` é o mesmo do Guia de Testes manual:

    Aluno A  -> currículo A -> candidatou-se à vaga da Empresa X
    Aluno B  -> currículo B -> nenhuma candidatura
    Empresa X -> vaga X
    Empresa Y -> vaga Y (nenhuma relação com ninguém acima)
    Gestor
"""
import json

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from companies.models import Company
from jobs.models import Application, Job
from resumes.models import Resume

User = get_user_model()
SENHA = "SenhaForte123!"


class AuthorizationScenario(TestCase):
    def setUp(self):
        cache.clear()

        def novo(username, role):
            return User.objects.create_user(
                username=username, email=f"{username}@example.com",
                password=SENHA, role=role, status="ativo",
            )

        self.aluno_a = novo("aluno_a", "aluno")
        self.aluno_b = novo("aluno_b", "aluno")
        self.dono_x = novo("empresa_x", "company")
        self.dono_y = novo("empresa_y", "company")
        self.gestor = novo("gestor", "gestor")

        self.empresa_x = Company.objects.create(
            owner=self.dono_x, name="Empresa X", cnpj="11.222.333/0001-81", description="x",
        )
        self.empresa_y = Company.objects.create(
            owner=self.dono_y, name="Empresa Y", cnpj="11.444.777/0001-61", description="y",
        )

        self.curriculo_a = Resume.objects.create(
            user=self.aluno_a, title="Currículo A",
            content=json.dumps({"fullName": "Aluno A", "email": "aluno_a@example.com"}),
            curso="Sistemas",
        )
        self.curriculo_b = Resume.objects.create(
            user=self.aluno_b, title="Currículo B",
            content=json.dumps({"fullName": "Aluno B", "email": "aluno_b@example.com"}),
            curso="Direito",
        )

        self.vaga_x = Job.objects.create(
            company=self.empresa_x, title="Vaga X", description="d", requirements="r",
        )
        self.vaga_y = Job.objects.create(
            company=self.empresa_y, title="Vaga Y", description="d", requirements="r",
        )

        self.candidatura = Application.objects.create(job=self.vaga_x, resume=self.curriculo_a)

    def como(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client


class PdfIdorTests(AuthorizationScenario):
    """Download de PDF de currículo — `GET /api/pdf/export/<id>/`."""

    def test_owner_can_download_own_resume(self):
        resp = self.como(self.aluno_a).get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "application/pdf")

    def test_student_cannot_download_another_students_resume(self):
        """O IDOR original: trocar o `pk` na URL baixava o currículo alheio."""
        resp = self.como(self.aluno_a).get(f"/api/pdf/export/{self.curriculo_b.id}/")
        self.assertEqual(resp.status_code, 403)

    def test_company_can_download_resume_of_its_own_candidate(self):
        resp = self.como(self.dono_x).get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertEqual(resp.status_code, 200)

    def test_company_cannot_download_resume_of_non_candidate(self):
        """Aluno B nunca se candidatou a nada da Empresa X."""
        resp = self.como(self.dono_x).get(f"/api/pdf/export/{self.curriculo_b.id}/")
        self.assertEqual(resp.status_code, 403)

    def test_unrelated_company_cannot_download_any_resume(self):
        resp = self.como(self.dono_y).get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertEqual(resp.status_code, 403)

    def test_gestor_can_download_any_resume(self):
        resp = self.como(self.gestor).get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertEqual(resp.status_code, 200)

    def test_anonymous_cannot_download(self):
        resp = APIClient().get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertIn(resp.status_code, (401, 403))

    def test_filename_header_is_sanitized(self):
        """
        `username` é o e-mail digitado no cadastro — texto do usuário indo
        para dentro de um cabeçalho HTTP entre aspas. Sem saneamento, aspas
        ou quebra de linha permitiam injeção de cabeçalho.
        """
        self.aluno_a.username = 'mal"\r\nX-Injetado: 1'
        self.aluno_a.save(update_fields=["username"])

        resp = self.como(self.aluno_a).get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("X-Injetado", resp)
        self.assertNotIn('"', resp["Content-Disposition"].replace('filename="', "").rstrip('"'))


class ResumeListingTests(AuthorizationScenario):
    """`GET /api/resumes/` — quem enxerga o quê."""

    def test_student_sees_only_own_resume(self):
        resp = self.como(self.aluno_a).get("/api/resumes/")
        ids = {r["id"] for r in resp.data}
        self.assertEqual(ids, {self.curriculo_a.id})

    def test_company_sees_only_resumes_of_its_candidates(self):
        """
        O bug era o ramo "senão" devolvendo `Resume.objects.all()` para
        qualquer papel diferente de aluno — uma empresa logada listava o
        currículo de toda a plataforma.
        """
        resp = self.como(self.dono_x).get("/api/resumes/")
        ids = {r["id"] for r in resp.data}
        self.assertEqual(ids, {self.curriculo_a.id})
        self.assertNotIn(self.curriculo_b.id, ids)

    def test_company_without_applications_sees_nothing(self):
        resp = self.como(self.dono_y).get("/api/resumes/")
        self.assertEqual(len(resp.data), 0)

    def test_gestor_sees_all_resumes(self):
        resp = self.como(self.gestor).get("/api/resumes/")
        ids = {r["id"] for r in resp.data}
        self.assertEqual(ids, {self.curriculo_a.id, self.curriculo_b.id})

    def test_student_cannot_retrieve_another_resume_by_id(self):
        resp = self.como(self.aluno_a).get(f"/api/resumes/{self.curriculo_b.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_student_cannot_patch_another_resume(self):
        resp = self.como(self.aluno_a).patch(
            f"/api/resumes/{self.curriculo_b.id}/", {"title": "invadido"}, format="json"
        )
        self.assertEqual(resp.status_code, 404)
        self.curriculo_b.refresh_from_db()
        self.assertEqual(self.curriculo_b.title, "Currículo B")


class JobOwnershipTests(AuthorizationScenario):
    """Uma empresa não mexe na vaga da outra."""

    def test_company_cannot_patch_another_companys_job(self):
        resp = self.como(self.dono_y).patch(
            f"/api/jobs/{self.vaga_x.id}/", {"title": "sequestrada"}, format="json"
        )
        self.assertIn(resp.status_code, (403, 404))
        self.vaga_x.refresh_from_db()
        self.assertEqual(self.vaga_x.title, "Vaga X")

    def test_company_cannot_delete_another_companys_job(self):
        resp = self.como(self.dono_y).delete(f"/api/jobs/{self.vaga_x.id}/")
        self.assertIn(resp.status_code, (403, 404))
        self.assertTrue(Job.objects.filter(id=self.vaga_x.id).exists())

    def test_company_cannot_list_candidates_of_another_companys_job(self):
        resp = self.como(self.dono_y).get(f"/api/jobs/{self.vaga_x.id}/candidates/")
        self.assertIn(resp.status_code, (403, 404))

    def test_company_sees_own_candidates(self):
        resp = self.como(self.dono_x).get(f"/api/jobs/{self.vaga_x.id}/candidates/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["total_encontrado"], 1)

    def test_company_cannot_change_status_of_foreign_application(self):
        resp = self.como(self.dono_y).patch(
            f"/api/jobs/{self.vaga_x.id}/update-status/{self.candidatura.id}/",
            {"status": "APROVADO"}, format="json",
        )
        self.assertIn(resp.status_code, (403, 404))
        self.candidatura.refresh_from_db()
        self.assertEqual(self.candidatura.status, "PENDENTE")

    def test_student_cannot_create_job(self):
        resp = self.como(self.aluno_a).post("/api/jobs/", {
            "title": "vaga falsa", "description": "d", "requirements": "r",
        }, format="json")
        self.assertIn(resp.status_code, (403, 404))

    def test_anonymous_post_to_jobs_does_not_500(self):
        """
        `IsCompany` fazia `print(request.user.email)`; `AnonymousUser` não tem
        `.email`, então um POST sem login estourava AttributeError -> 500 em
        vez de devolver 401/403.
        """
        resp = APIClient().post("/api/jobs/", {"title": "x"}, format="json")
        self.assertIn(resp.status_code, (401, 403))


class GestorOnlyEndpointTests(AuthorizationScenario):
    """Rotas de gestor recusam quem não é gestor."""

    def test_zip_export_rejects_student(self):
        resp = self.como(self.aluno_a).post(
            "/api/resumes/gestor/export-zip/", {"resume_ids": [self.curriculo_b.id]}, format="json"
        )
        self.assertEqual(resp.status_code, 403)

    def test_zip_export_rejects_company(self):
        resp = self.como(self.dono_x).post(
            "/api/resumes/gestor/export-zip/", {"resume_ids": [self.curriculo_a.id]}, format="json"
        )
        self.assertEqual(resp.status_code, 403)

    def test_zip_export_works_for_gestor_and_is_not_empty(self):
        """
        Regressão do bug do contexto: `gerar_pdf_puro` passava
        `{'resume': resume}` a um template que espera as chaves achatadas do
        JSON — todo PDF do ZIP saía em branco.
        """
        resp = self.como(self.gestor).post(
            "/api/resumes/gestor/export-zip/", {"resume_ids": [self.curriculo_a.id]}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp["Content-Type"], "application/zip")

        import io
        import zipfile
        with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
            nomes = z.namelist()
            self.assertEqual(len(nomes), 1)
            conteudo = z.read(nomes[0])
        # Um PDF com o nome do aluno pesa bem mais que um PDF em branco.
        self.assertGreater(len(conteudo), 1000)

    def test_gestor_dashboard_rejects_student(self):
        self.assertEqual(self.como(self.aluno_a).get("/api/users/dashboard/").status_code, 403)

    def test_gestor_resume_listing_rejects_company(self):
        self.assertEqual(self.como(self.dono_x).get("/api/users/gestor/resumes/").status_code, 403)

    def test_submit_resumes_rejects_company(self):
        resp = self.como(self.dono_x).post(
            f"/api/jobs/{self.vaga_x.id}/submit-resumes/",
            {"resume_ids": [self.curriculo_b.id]}, format="json",
        )
        self.assertIn(resp.status_code, (403, 404))


class RoleEscalationTests(AuthorizationScenario):
    """Nenhum endpoint de autoedição permite virar gestor."""

    def test_profile_patch_cannot_change_role(self):
        cliente = self.como(self.aluno_a)
        resp = cliente.patch("/api/users/me/", {"role": "gestor", "cidade": "Fortaleza"}, format="json")
        self.assertEqual(resp.status_code, 200)

        self.aluno_a.refresh_from_db()
        self.assertEqual(self.aluno_a.role, "aluno")
        # E o campo legítimo do PATCH foi aplicado normalmente.
        self.assertEqual(self.aluno_a.profile.cidade, "Fortaleza")

    def test_profile_patch_cannot_change_pin(self):
        pin_antes = self.aluno_a.pin
        self.como(self.aluno_a).patch("/api/users/me/", {"pin": "123456"}, format="json")
        self.aluno_a.refresh_from_db()
        self.assertEqual(self.aluno_a.pin, pin_antes)

    def test_promoted_student_still_blocked_on_gestor_routes(self):
        """Sanidade: a trava do gestor olha `role`, não algo do cliente."""
        self.assertEqual(self.como(self.aluno_b).get("/api/users/gestor/jobs/").status_code, 403)


class DataExposureTests(AuthorizationScenario):
    """Campos que não podem sair para quem não deve vê-los."""

    def test_job_listing_hides_contact_email_from_anonymous(self):
        """
        `GET /api/jobs/` responde a visitante anônimo, e o serializer
        devolvia `company.owner.email` — o e-mail pessoal de quem cadastrou
        a empresa — para qualquer um na internet.
        """
        resp = APIClient().get("/api/jobs/")
        self.assertEqual(resp.status_code, 200)
        for vaga in resp.data:
            self.assertIsNone(vaga.get("contact_email"))

    def test_job_listing_shows_contact_email_to_authenticated_user(self):
        resp = self.como(self.aluno_a).get("/api/jobs/")
        emails = [v.get("contact_email") for v in resp.data]
        self.assertIn(self.dono_x.email, emails)

    def test_profile_never_exposes_password_hash(self):
        resp = self.como(self.aluno_a).get("/api/users/me/")
        corpo = str(resp.data)
        self.assertNotIn("pbkdf2", corpo)
        self.assertNotIn("password", corpo)

    def test_student_profile_does_not_leak_another_users_pin(self):
        """A rota não recebe `pk`: só existe "o meu perfil"."""
        meu = self.como(self.aluno_a).get("/api/users/me/").data
        self.assertEqual(meu["pin"], self.aluno_a.pin)
        self.assertNotEqual(meu["pin"], self.aluno_b.pin)

    def test_security_codes_are_never_serialized(self):
        from users.models import SecurityCode
        SecurityCode.issue(self.aluno_a, SecurityCode.PURPOSE_PASSWORD_RESET)
        corpo = str(self.como(self.aluno_a).get("/api/users/me/").data)
        self.assertNotIn("code_hash", corpo)
        self.assertNotIn("security_code", corpo.lower())


class ResumeContentInjectionTests(AuthorizationScenario):
    """XSS armazenado via o campo `content` do currículo (JSON livre)."""

    def test_html_in_resume_content_is_escaped_in_pdf(self):
        payload = {
            "fullName": "<script>alert(1)</script>",
            "summary": "<img src=x onerror=alert(1)>",
            "email": "x@example.com",
        }
        self.curriculo_a.content = json.dumps(payload)
        self.curriculo_a.save(update_fields=["content"])

        resp = self.como(self.aluno_a).get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertEqual(resp.status_code, 200)
        # O PDF é gerado sem erro; o autoescape do Django impede que a tag
        # vire markup no HTML intermediário (nenhum `|safe` no template).
        from pdf.views import montar_contexto
        from django.template.loader import render_to_string
        html = render_to_string('pdf/resume_pdf.html', montar_contexto(self.curriculo_a))
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)

    def test_malformed_json_content_does_not_break_pdf(self):
        self.curriculo_a.content = "isto não é json {{{"
        self.curriculo_a.save(update_fields=["content"])
        resp = self.como(self.aluno_a).get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertEqual(resp.status_code, 200)

    def test_non_dict_json_content_does_not_break_pdf(self):
        """`json.loads("[1,2]")` devolve lista; `**lista` estouraria TypeError."""
        self.curriculo_a.content = "[1, 2, 3]"
        self.curriculo_a.save(update_fields=["content"])
        resp = self.como(self.aluno_a).get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertEqual(resp.status_code, 200)


class ResumePhotoTests(AuthorizationScenario):
    """
    A foto do candidato no PDF.

    O formulário grava `photo` como data URL JPEG reduzido
    (Prisma_frontend/src/utils/imagem.ts). Como `content` é JSON livre
    controlado pelo aluno e o WeasyPrint recebe `base_url`, qualquer
    endereço que chegue ao `src` seria BUSCADO pelo servidor na hora de
    gerar o PDF — daí a lista de prefixos aceitos em `_foto_segura`.
    """

    # data URL mínimo válido: GIF 1x1 transparente, rotulado como PNG só
    # para o teste não depender de gerar um JPEG.
    FOTO_VALIDA = (
        "data:image/png;base64,"
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )

    def _com_foto(self, valor):
        self.curriculo_a.content = json.dumps({"fullName": "Aluno A", "photo": valor})
        self.curriculo_a.save(update_fields=["content"])
        from pdf.views import montar_contexto
        return montar_contexto(self.curriculo_a)["photo"]

    def test_data_url_photo_reaches_the_template(self):
        self.assertEqual(self._com_foto(self.FOTO_VALIDA), self.FOTO_VALIDA)

        from django.template.loader import render_to_string
        from pdf.views import montar_contexto
        html = render_to_string(
            "pdf/resume_pdf.html", montar_contexto(self.curriculo_a)
        )
        self.assertIn("data:image/png;base64,", html)
        # A <div> do selo não pode ser emitida; o NOME `photo-placeholder`
        # continua aparecendo no bloco <style>, então a asserção precisa ser
        # sobre o elemento e não sobre a string solta.
        self.assertNotIn('<div class="photo-placeholder">', html)

    def test_photo_is_rendered_in_the_generated_pdf(self):
        self.curriculo_a.content = json.dumps(
            {"fullName": "Aluno A", "photo": self.FOTO_VALIDA}
        )
        self.curriculo_a.save(update_fields=["content"])

        resp = self.como(self.aluno_a).get(f"/api/pdf/export/{self.curriculo_a.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.content.startswith(b"%PDF"))

    def test_remote_url_photo_is_dropped(self):
        """
        SSRF: sem esta trava, o servidor emitiria a requisição para o
        endereço que o aluno digitou — inclusive para a rede interna.
        """
        for endereco in (
            "http://169.254.169.254/latest/meta-data/",
            "https://exemplo.invalido/foto.jpg",
            "file:///etc/passwd",
            "//exemplo.invalido/foto.jpg",
        ):
            with self.subTest(endereco=endereco):
                self.assertIsNone(self._com_foto(endereco))

    def test_non_image_data_url_is_dropped(self):
        self.assertIsNone(self._com_foto("data:text/html;base64,PHNjcmlwdD4="))

    def test_legacy_blob_photo_is_dropped(self):
        """
        Até 10 set 2026 o formulário gravava um endereço `blob:`, que só
        existia na aba do navegador — nunca foi a imagem. Esses currículos
        antigos caem no selo com a inicial do nome.
        """
        self.assertIsNone(self._com_foto("blob:http://localhost:5173/abc-123"))

    def test_oversized_photo_is_dropped(self):
        gigante = "data:image/png;base64," + ("A" * (4 * 1024 * 1024))
        self.assertIsNone(self._com_foto(gigante))

    def test_missing_or_invalid_photo_falls_back_to_initial(self):
        for valor in (None, "", 123, {"nao": "string"}):
            with self.subTest(valor=valor):
                self.assertIsNone(self._com_foto(valor))
