"""
Provisiona o cenário da "Parte 0" do Guia de Testes, de forma idempotente.

A bateria de integração em `tests/` (que roda contra o servidor no ar) supõe
um conjunto de contas e dados que, até aqui, precisavam ser criados à mão pela
interface — um processo demorado, fácil de errar, e que ficou mais chato ainda
depois que o cadastro passou a exigir confirmação de e-mail.

Este comando monta tudo de uma vez:

    Aluno A    -> currículo, conta ativa
    Aluno B    -> currículo, conta ativa
    Empresa X  -> empresa cadastrada + 1 vaga ATIVA
    Gestor     -> conta de gestor

Rodar duas vezes não duplica nada: as contas são localizadas por e-mail e
atualizadas. As candidaturas criadas por execuções anteriores dos testes são
limpas, para os casos que dependem de "ainda não há candidatura" (TC-03)
voltarem ao estado inicial.

    python manage.py seed_testes
    python manage.py seed_testes --senha "OutraSenha@123"

ATENÇÃO: é um comando de DESENVOLVIMENTO. Ele recusa rodar com DEBUG=False
para não haver risco de criar contas de senha conhecida em produção.
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from companies.models import Company
from jobs.models import Application, Job
from resumes.models import Resume
from users.models import Profile

User = get_user_model()

SENHA_PADRAO = "TesteSenha@123"

# O JSON de `Resume.content` é consumido por dois lugares com formatos
# ligeiramente diferentes, e o seed preenche os dois para o cenário ser
# realista:
#   - o template do PDF (pdf/templates/pdf/resume_pdf.html) lê `city`,
#     `state`, `summary` e a lista `experience` (singular);
#   - o formulário do aluno (StudentCurriculumCreate.tsx) lê `location`,
#     `area` e a lista `experiences` (plural), além de `projects`, `skills`,
#     `courses` e `languages`.
CONTEUDO_CURRICULO = """{{
  "fullName": "{nome}",
  "email": "{email}",
  "phone": "(98) 90000-0000",
  "location": "São Luís / MA",
  "area": "{curso}",
  "city": "São Luís",
  "state": "MA",
  "photo": null,
  "summary": "Currículo de teste gerado por manage.py seed_testes.",
  "education": [{{
    "institution": "IFMA",
    "course": "{curso}",
    "year": "2024",
    "description": "Formação de teste."
  }}],
  "experience": [{{
    "company": "Empresa Anterior",
    "role": "Estagiário",
    "startDate": "2023",
    "endDate": "2024",
    "description": "Atividades de teste."
  }}],
  "experiences": [{{
    "company": "Empresa Anterior",
    "role": "Estagiário",
    "period": "2023 - 2024",
    "description": "Atividades de teste."
  }}],
  "projects": [{{
    "title": "Projeto de Teste",
    "startYear": "2023",
    "endYear": "2024",
    "institution": "IFMA",
    "advisor": "Orientador Teste",
    "description": "Projeto usado pela bateria de testes."
  }}],
  "skills": "Python, JavaScript",
  "courses": "Curso de teste",
  "languages": "Português, Inglês"
}}"""


class Command(BaseCommand):
    help = "Cria/atualiza as contas e dados que a bateria de testes de integração espera."

    def add_arguments(self, parser):
        parser.add_argument(
            '--senha',
            default=SENHA_PADRAO,
            help=f'Senha aplicada a todas as contas de teste (padrão: {SENHA_PADRAO}). '
                 f'Precisa passar na política de senha (mínimo 10 caracteres).',
        )
        parser.add_argument(
            '--manter-candidaturas',
            action='store_true',
            help='Não apaga as candidaturas existentes das contas de teste. '
                 'Sem isto, elas são limpas para o TC-03 poder rodar do zero.',
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                "Recusando rodar com DEBUG=False. Este comando cria contas com "
                "senha conhecida e é só para ambiente de desenvolvimento."
            )

        senha = options['senha']
        if len(senha) < 10:
            raise CommandError(
                "A senha precisa ter pelo menos 10 caracteres (política em "
                "AUTH_PASSWORD_VALIDATORS)."
            )

        with transaction.atomic():
            aluno_a = self._conta("aluno.a@teste.com", "Aluno A", "aluno", senha)
            aluno_b = self._conta("aluno.b@teste.com", "Aluno B", "aluno", senha)
            empresa_owner = self._conta("empresa.x@teste.com", "Empresa X", "company", senha)
            gestor = self._conta("gestor.teste@teste.com", "Gestor Teste", "gestor", senha)

            self._curriculo(aluno_a, "Sistemas de Informação")
            self._curriculo(aluno_b, "Direito")

            empresa = self._empresa(empresa_owner)
            vaga = self._vaga(empresa)

            if not options['manter_candidaturas']:
                apagadas = Application.objects.filter(
                    resume__user__in=[aluno_a, aluno_b]
                ).delete()[0]
                if apagadas:
                    self.stdout.write(
                        f"  candidaturas antigas removidas: {apagadas} "
                        f"(para o TC-03 poder rodar do estado inicial)"
                    )

        self.stdout.write(self.style.SUCCESS("\nCenário de testes pronto."))
        self.stdout.write(
            "\nRode a bateria de integração assim (com o servidor no ar):\n\n"
            "    cd tests\n"
            f'    set PRISMA_ALUNO_A_SENHA={senha}\n'
            f'    set PRISMA_ALUNO_B_SENHA={senha}\n'
            f'    set PRISMA_EMPRESA_X_SENHA={senha}\n'
            f'    set PRISMA_GESTOR_USERNAME={gestor.email}\n'
            f'    set PRISMA_GESTOR_SENHA={senha}\n'
            "    pytest -v\n\n"
            f"Vaga ativa criada/confirmada: #{vaga.id} — {vaga.title}\n"
        )

    # --- helpers -----------------------------------------------------------

    def _conta(self, email, nome, role, senha):
        partes = nome.split(' ', 1)
        user, criado = User.objects.get_or_create(
            email=email,
            defaults={'username': email, 'role': role},
        )
        user.username = user.username or email
        user.first_name = partes[0]
        user.last_name = partes[1] if len(partes) > 1 else ''
        user.role = role
        # As contas de teste já nascem ATIVAS: o fluxo de confirmação por
        # e-mail é testado à parte (users/tests.py), e exigi-lo aqui só
        # tornaria a preparação do ambiente impossível de automatizar.
        user.status = 'ativo'
        user.is_active = True
        if role == 'gestor':
            user.is_staff = True
        user.set_password(senha)
        user.save()

        Profile.objects.update_or_create(
            user=user,
            defaults={
                'type': role,
                'instituicao': 'IFMA',
                'curso': 'Sistemas de Informação' if role == 'aluno' else None,
                'situacao_academica': 'aluno' if role == 'aluno' else None,
                'cidade': 'São Luís',
                'estado': 'MA',
            },
        )

        acao = 'criada' if criado else 'atualizada'
        self.stdout.write(f"  conta {acao}: {email} (role={role})")
        return user

    def _curriculo(self, user, curso):
        resume, criado = Resume.objects.update_or_create(
            user=user,
            defaults={
                'title': f"Currículo de {user.get_full_name()}",
                'content': CONTEUDO_CURRICULO.format(
                    nome=user.get_full_name(), email=user.email, curso=curso,
                ),
                'curso': curso,
                'ano_ingresso': 2021,
                'ano_conclusao': 2025,
                'situacao': 'estudando',
            },
        )
        self.stdout.write(
            f"  currículo {'criado' if criado else 'atualizado'}: #{resume.id} ({user.email})"
        )
        return resume

    def _empresa(self, owner):
        empresa, criada = Company.objects.update_or_create(
            owner=owner,
            defaults={
                'name': 'Empresa X Teste LTDA',
                'cnpj': '11.222.333/0001-81',  # CNPJ com dígito verificador válido
                'description': 'Empresa criada por manage.py seed_testes.',
                'website': 'https://exemplo.test',
                'nome_fantasia': 'Empresa X',
                'area_atuacao': 'Tecnologia',
                'telefone': '(98) 3000-0000',
                'responsavel_nome': 'Responsável Teste',
                'responsavel_cpf': '529.982.247-25',  # CPF válido
                'responsavel_cargo': 'Gerente de RH',
                'cidade': 'São Luís',
                'estado': 'MA',
            },
        )
        self.stdout.write(f"  empresa {'criada' if criada else 'atualizada'}: {empresa.name}")
        return empresa

    def _vaga(self, empresa):
        vaga, criada = Job.objects.update_or_create(
            company=empresa,
            title='Vaga de Teste — Desenvolvedor',
            defaults={
                'description': 'Vaga criada por manage.py seed_testes.',
                'requirements': 'Nenhum requisito real; é uma vaga de teste.',
                'salary': 2500,
                # ATIVA de propósito: o aluno só enxerga vagas com
                # is_active=True, e vários casos da bateria (TC-03, TC-09,
                # TC-15) precisam de pelo menos uma vaga visível para ele.
                'is_active': True,
            },
        )
        self.stdout.write(f"  vaga {'criada' if criada else 'atualizada'}: #{vaga.id} (ativa)")
        return vaga
