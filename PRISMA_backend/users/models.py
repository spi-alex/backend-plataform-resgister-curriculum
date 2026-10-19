import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('company', 'Empresa'),
        ('candidate', 'Candidato'),
        ('gestor', 'Gestor'),
        ('aluno', 'Aluno'),
    )

    # Status da conta pedido pela especificação de integração (ativo /
    # pendente / inativo). Antes não existia — toda conta nascia ativa e
    # logava na hora, sem confirmação de e-mail. Default 'ativo' preserva o
    # comportamento atual para contas já existentes e para quem é
    # provisionado manualmente (gestor/admin via fixture ou createsuperuser);
    # `register_user` sobrescreve para 'pendente' no autocadastro de
    # aluno/empresa, e `confirm_registration` promove para 'ativo' quando o
    # código enviado por e-mail é confirmado.
    STATUS_CHOICES = (
        ('pendente', 'Pendente'),
        ('ativo', 'Ativo'),
        ('inativo', 'Inativo'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='candidate')

    # `pin` é a MATRÍCULA do usuário: um identificador de 6 dígitos que ele
    # pode digitar no lugar do e-mail para entrar (ver EmailOrPinBackend) e
    # que aparece no próprio perfil dele.
    #
    # IMPORTANTE: até a rodada de 25 ago 2026 este mesmo campo era usado
    # TAMBÉM como token de recuperação de senha e de confirmação de cadastro.
    # Era o pior tipo de acúmulo de função: o "token secreto" do reset era o
    # mesmo número que o próprio sistema exibe na tela de perfil como
    # matrícula, nunca expirava, e pedir um reset rotacionava (silenciosamente)
    # a matrícula da vítima. Hoje o PIN é SÓ identificador de login — os
    # códigos de uso único vivem em `SecurityCode`.
    pin = models.CharField(max_length=10, unique=True, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ativo')

    # Marca temporal usada para revogar JWTs já emitidos (logout, troca de
    # senha, reset de senha). O SimpleJWT roda com CHECK_REVOCATION=False e
    # sem blacklist, então sem isto um access token roubado continuava válido
    # por até 30 min mesmo depois da vítima trocar a senha. Ver
    # users/authentication.py: qualquer token com `iat` anterior a este
    # instante é recusado.
    sessions_revoked_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Gera a matrícula automática apenas na criação (se ainda não existir)
        if not self.pin:
            self.pin = self.generate_unique_pin()
        super().save(*args, **kwargs)

    def generate_unique_pin(self):
        """
        Matrícula de 6 dígitos, única entre os usuários.

        Usa `secrets` (CSPRNG) e não `random` (Mersenne Twister, previsível a
        partir de saídas observadas). O PIN não é mais um segredo de reset,
        mas continua sendo aceito como identificador de login — então vale
        não deixá-lo previsível.
        """
        while True:
            new_pin = str(secrets.randbelow(900000) + 100000)
            if not User.objects.filter(pin=new_pin).exists():
                return new_pin

    def revoke_sessions(self):
        """Invalida todo JWT emitido até agora para este usuário."""
        self.sessions_revoked_at = timezone.now()
        self.save(update_fields=['sessions_revoked_at'])


class SecurityCode(models.Model):
    """
    Código numérico de uso único enviado por e-mail, para recuperação de senha
    e confirmação de cadastro.

    Substitui o uso do `User.pin` nesses dois fluxos. Diferenças que importam:

    - **Guardado com hash** (mesmo algoritmo das senhas). Um vazamento do
      banco não entrega códigos válidos; antes o PIN ficava em texto puro.
    - **Expira** (`expires_at`, 15 min por padrão). O PIN não expirava nunca:
      um e-mail de reset de seis meses atrás continuava válido para sempre.
    - **Uso único** (`used_at`), com todos os códigos anteriores do mesmo
      propósito invalidados a cada novo pedido.
    - **Contador de tentativas por código** (`attempts`, máx. 5). Este é o
      limite que o throttle por IP não conseguia dar: o throttle é por
      endereço de origem e some quando o atacante troca de IP; o contador
      abaixo é por código/conta e não tem como ser contornado assim.
    - **Comparação em tempo constante** via `check_password`.
    """

    PURPOSE_PASSWORD_RESET = 'password_reset'
    PURPOSE_EMAIL_CONFIRM = 'email_confirm'
    PURPOSE_CHOICES = (
        (PURPOSE_PASSWORD_RESET, 'Recuperação de senha'),
        (PURPOSE_EMAIL_CONFIRM, 'Confirmação de cadastro'),
    )

    # Tentativas erradas aceitas para o MESMO código antes de queimá-lo.
    MAX_ATTEMPTS = 5
    # Validade padrão. Curta o suficiente para reduzir muito a janela de
    # força-bruta, longa o suficiente para o e-mail chegar e ser lido.
    DEFAULT_TTL_MINUTES = 15

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='security_codes'
    )
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    code_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        indexes = [models.Index(fields=['user', 'purpose', 'used_at'])]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_purpose_display()} de {self.user} ({self.created_at:%d/%m/%Y %H:%M})"

    # --- criação -----------------------------------------------------------

    @staticmethod
    def generate_code():
        """Código numérico de 6 dígitos gerado por CSPRNG."""
        return f"{secrets.randbelow(1000000):06d}"

    @classmethod
    def issue(cls, user, purpose, ttl_minutes=None):
        """
        Emite um código novo e invalida os anteriores do mesmo propósito.

        Devolve `(instancia, codigo_em_texto_puro)`. O texto puro só existe
        aqui e no e-mail — nunca é gravado no banco nem devolvido pela API.
        """
        cls.objects.filter(user=user, purpose=purpose, used_at__isnull=True).update(
            used_at=timezone.now()
        )

        code = cls.generate_code()
        ttl = ttl_minutes if ttl_minutes is not None else cls.DEFAULT_TTL_MINUTES
        instance = cls.objects.create(
            user=user,
            purpose=purpose,
            code_hash=make_password(code),
            expires_at=timezone.now() + timedelta(minutes=ttl),
        )
        return instance, code

    # --- consumo -----------------------------------------------------------

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def is_usable(self):
        return self.used_at is None and not self.is_expired and self.attempts < self.MAX_ATTEMPTS

    def consume(self):
        """Marca como usado; um código só serve uma vez."""
        self.used_at = timezone.now()
        self.save(update_fields=['used_at'])

    @classmethod
    def validate(cls, user, purpose, code):
        """
        Confere `code` contra o código ativo mais recente de `user`/`purpose`.

        Devolve True apenas quando o código bate, está dentro da validade,
        ainda não foi usado e o limite de tentativas não estourou. Toda
        tentativa errada incrementa `attempts` — cinco erros queimam o
        código e obrigam a pedir um novo, mesmo que o atacante troque de IP.
        """
        if not code:
            return False

        candidate = (
            cls.objects.filter(user=user, purpose=purpose, used_at__isnull=True)
            .order_by('-created_at')
            .first()
        )
        if candidate is None or not candidate.is_usable:
            return False

        if check_password(str(code), candidate.code_hash):
            return True

        candidate.attempts += 1
        # Estourou o limite: queima o código para não deixar o atacante
        # continuar tentando de outro IP com o mesmo código na mão.
        if candidate.attempts >= cls.MAX_ATTEMPTS:
            candidate.used_at = timezone.now()
        candidate.save(update_fields=['attempts', 'used_at'])
        return False


class Profile(models.Model):
    TYPES = (('candidate', 'Candidato'), ('company', 'Empresa'), ('gestor', 'Gestor'), ('aluno', 'Aluno'))
    SITUACAO_ACADEMICA_CHOICES = (('aluno', 'Aluno'), ('egresso', 'Egresso'))

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    type = models.CharField(max_length=10, choices=TYPES)

    # --- Dados pessoais (cadastro de aluno/egresso) ---
    # Estes campos já são coletados pelo formulário de cadastro
    # (StudentRegistration.tsx -> payload.perfil) mas até aqui o backend
    # descartava tudo, salvando só nome/e-mail/senha. Ver register_user().
    cpf = models.CharField(max_length=14, blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    data_nascimento = models.DateField(blank=True, null=True)

    # --- Dados acadêmicos ---
    instituicao = models.CharField(max_length=255, blank=True, null=True)
    curso = models.CharField(max_length=150, blank=True, null=True)
    situacao_academica = models.CharField(
        max_length=10, choices=SITUACAO_ACADEMICA_CHOICES, blank=True, null=True
    )
    ano_inicio = models.PositiveIntegerField(blank=True, null=True)
    previsao_conclusao = models.CharField(max_length=20, blank=True, null=True)
    ano_conclusao = models.PositiveIntegerField(blank=True, null=True)

    # --- Endereço ---
    cep = models.CharField(max_length=9, blank=True, null=True)
    rua = models.CharField(max_length=255, blank=True, null=True)
    numero = models.CharField(max_length=20, blank=True, null=True)
    bairro = models.CharField(max_length=100, blank=True, null=True)
    cidade = models.CharField(max_length=100, blank=True, null=True)
    estado = models.CharField(max_length=2, blank=True, null=True)
