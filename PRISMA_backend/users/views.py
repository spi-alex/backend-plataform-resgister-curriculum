import logging
import threading
import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from captcha.models import CaptchaStore
from companies.models import Company
from jobs.models import Application, Job
from resumes.models import Resume

from .cookies import clear_refresh_cookie, get_refresh_token, set_refresh_cookie
from .emails import enviar_email_async
from .models import Profile, SecurityCode
from .serializers import MyTokenObtainPairSerializer, ProfileSerializer
from .throttles import (
    ChangePasswordRateThrottle,
    ConfirmRegistrationByAccountThrottle,
    ConfirmRegistrationRateThrottle,
    LoginByAccountThrottle,
    LoginRateThrottle,
    PasswordResetByAccountThrottle,
    PasswordResetConfirmByAccountThrottle,
    PasswordResetConfirmRateThrottle,
    PasswordResetRateThrottle,
    RegisterRateThrottle,
)
from .validators import validar_cnpj, validar_cpf

User = get_user_model()
logger = logging.getLogger(__name__)


def _to_int(value):
    """Converte para int com segurança; devolve None se vazio/ inválido."""
    try:
        return int(value) if value not in (None, '', 'null') else None
    except (TypeError, ValueError):
        return None


def _to_date(value):
    """Converte string 'YYYY-MM-DD' para date; devolve None se vazio/inválida."""
    if not value:
        return None
    try:
        from datetime import datetime
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        return None


def _enviar_em_thread(assunto, mensagem, destinatario):
    """
    Dispara o e-mail sem segurar a resposta HTTP.

    O `try/except` de dentro é o que impede um erro do provedor de e-mail de
    matar a thread em silêncio no meio de um fluxo de segurança.
    """
    def _worker():
        try:
            enviar_email_async(assunto, mensagem, destinatario)
        except Exception:
            logger.exception('Falha ao enviar e-mail transacional')

    threading.Thread(target=_worker, daemon=True).start()


# Papéis que qualquer visitante pode se autoatribuir neste endpoint público.
# 'gestor' e 'admin' ficam de fora de propósito — são provisionados
# manualmente (fixture/admin), como a especificação de integração descreve.
SELF_REGISTER_ROLES = {'candidate', 'aluno', 'company', 'empresa'}


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register_user(request):
    data = request.data

    # 1. Validação do Captcha
    captcha_key = data.get('captcha_0')
    captcha_value = data.get('captcha_1')
    try:
        captcha = CaptchaStore.objects.get(hashkey=captcha_key)
        if captcha.response.lower() != str(captcha_value).lower():
            return Response({"error": "Captcha incorreto."}, status=400)
        captcha.delete()
    except CaptchaStore.DoesNotExist:
        return Response({"error": "Erro na validação do Captcha."}, status=400)

    # 2. Definição da Role — MASS ASSIGNMENT CORRIGIDO: antes qualquer
    # string enviada em `role` era aceita sem checagem nenhuma, então um
    # POST direto na API com `role: "gestor"` criava uma conta de gestor
    # sem nenhuma validação. Agora só os papéis de autocadastro são
    # aceitos; qualquer outro valor (gestor, admin, ou lixo) cai no
    # default seguro 'candidate'.
    role_solicitada = str(data.get('role', 'candidate') or 'candidate').lower()
    if role_solicitada not in SELF_REGISTER_ROLES:
        role_solicitada = 'candidate'

    is_empresa = role_solicitada in ('company', 'empresa')

    # 3. E-mail normalizado e obrigatório. Normalizar para minúsculas evita
    # duas contas "iguais" com grafias diferentes — o que quebraria o reset
    # de senha, que busca com `email__iexact` e pega uma delas ao acaso.
    email = str(data.get('email', '') or '').strip().lower()
    if not email:
        return Response({"error": "E-mail é obrigatório."}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        # Nota de projeto: aqui a resposta REVELA que o e-mail já existe.
        # É uma escolha consciente e é o comportamento padrão de praticamente
        # todo cadastro com captcha — sem isso não há como dizer ao usuário
        # legítimo por que o cadastro dele falhou. O fluxo que NÃO pode
        # vazar essa informação é o de recuperação de senha, e lá a resposta
        # é sempre a mesma (ver `password_reset_request`).
        return Response({"error": "Este e-mail já está cadastrado."}, status=400)

    perfil_raw = data.get('perfil', {}) or {}

    # 4. Senha: agora passa pelos validadores do Django (tamanho mínimo,
    # senha comum, só números, semelhança com dados do usuário). Antes
    # `create_user` era chamado direto e aceitava QUALQUER senha — inclusive
    # "1", já que nenhuma rota da API chamava `validate_password`.
    #
    # O `user=` não é decorativo: o `UserAttributeSimilarityValidator` do
    # settings começa com `if not user: return` (password_validation.py),
    # então chamar `validate_password(password)` sozinho o desliga em
    # silêncio. Era o caso aqui — o cadastro aceitava senha praticamente
    # igual ao e-mail, que é o primeiro palpite de qualquer ataque contra
    # uma conta específica, ainda mais porque no PRISMA o `username` É o
    # e-mail e o login aceita os dois.
    #
    # O usuário ainda não existe neste ponto, então montamos uma instância
    # NÃO salva só para a validação — é o idioma padrão do Django para
    # validar senha antes de criar a conta.
    password = data.get('password') or ''
    nome_para_validacao = (
        data.get('company_name') if is_empresa
        else (perfil_raw.get('nome') or data.get('nome'))
    ) or ''
    partes_validacao = str(nome_para_validacao).split(' ', 1)
    try:
        validate_password(
            password,
            user=User(
                username=data.get('username') or email,
                email=email,
                first_name=partes_validacao[0],
                last_name=partes_validacao[1] if len(partes_validacao) > 1 else '',
            ),
        )
    except DjangoValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)

    # 5. CPF/CNPJ com dígito verificador conferido no backend (antes a única
    # validação era a máscara do formulário React).
    cnpj_normalizado = None
    cpf_normalizado = None
    try:
        if is_empresa:
            if data.get('cnpj'):
                cnpj_normalizado = validar_cnpj(data.get('cnpj'))
            if perfil_raw.get('responsavel_cpf'):
                validar_cpf(perfil_raw.get('responsavel_cpf'))
        elif perfil_raw.get('cpf'):
            cpf_normalizado = validar_cpf(perfil_raw.get('cpf'))
    except DjangoValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)

    if is_empresa and cnpj_normalizado and Company.objects.filter(cnpj=cnpj_normalizado).exists():
        return Response({"error": "Este CNPJ já está cadastrado no sistema."}, status=400)

    try:
        # 6. Criação do Usuário Base — status 'pendente' até confirmar o
        # código enviado por e-mail. Antes toda conta nascia 'ativa' (valor
        # default do model) e já recebia token de sessão na resposta deste
        # próprio cadastro, sem nenhuma confirmação de posse do e-mail.
        #
        # A transação garante que um erro no meio (empresa, perfil) não
        # deixe um usuário órfão no banco — antes havia um `user.delete()`
        # manual só para o caso do CNPJ duplicado, e nenhum tratamento para
        # os demais.
        with transaction.atomic():
            username_final = data.get('username') or email or f"user_{uuid.uuid4().hex[:8]}"

            user = User.objects.create_user(
                username=username_final,
                email=email,
                password=password,
                role=role_solicitada,
                status='pendente',
            )

            # 7. Tratamento de Nome (Diferencia Empresa de Pessoa Física)
            if is_empresa:
                user.first_name = data.get('company_name') or data.get('nome') or "Empresa PRISMA"
                user.last_name = ''
            else:
                nome_completo = perfil_raw.get('nome') or data.get('nome') or "Usuário PRISMA"
                partes_nome = nome_completo.split(' ', 1)
                user.first_name = partes_nome[0]
                user.last_name = partes_nome[1] if len(partes_nome) > 1 else ''

            user.save()

            # 8. Garante o Profile (o sinal post_save de users/signals.py já
            # cria/sincroniza automaticamente; update_or_create evita erro de
            # duplicidade caso o sinal já tenha criado o registro).
            #
            # Antes, só o campo `type` era preenchido aqui — CPF, telefone,
            # data de nascimento, instituição, curso, situação e endereço
            # eram coletados pelo formulário (StudentRegistration.tsx) e
            # descartados silenciosamente.
            profile_defaults = {'type': user.role}
            if not is_empresa:
                profile_defaults.update({
                    'cpf': cpf_normalizado,
                    'telefone': perfil_raw.get('telefone') or None,
                    'data_nascimento': _to_date(perfil_raw.get('nascimento')),
                    'instituicao': perfil_raw.get('instituicao') or None,
                    'curso': perfil_raw.get('curso') or None,
                    'situacao_academica': perfil_raw.get('situacao') or None,
                    'ano_inicio': _to_int(perfil_raw.get('ano_inicio')),
                    'previsao_conclusao': perfil_raw.get('previsao_conclusao') or None,
                    'ano_conclusao': _to_int(perfil_raw.get('ano_conclusao')),
                    'cep': perfil_raw.get('cep') or None,
                    'rua': perfil_raw.get('rua') or None,
                    'numero': perfil_raw.get('numero') or None,
                    'bairro': perfil_raw.get('bairro') or None,
                    'cidade': perfil_raw.get('cidade') or None,
                    'estado': perfil_raw.get('estado') or None,
                })

            Profile.objects.update_or_create(user=user, defaults=profile_defaults)

            # 9. Lógica Específica para Empresa. Mesmo caso do Profile: área
            # de atuação, dados do responsável e endereço eram pedidos pelo
            # documento de especificação e descartados por falta de coluna.
            if is_empresa:
                Company.objects.create(
                    owner=user,
                    name=user.first_name,
                    # Sem CNPJ, gera um temporário para não violar a unicidade
                    cnpj=cnpj_normalizado or f"TEMP-{uuid.uuid4().hex[:10]}",
                    description=data.get('description', ''),
                    website=data.get('website', ''),
                    nome_fantasia=perfil_raw.get('nome_fantasia') or None,
                    area_atuacao=perfil_raw.get('area_atuacao') or None,
                    telefone=perfil_raw.get('telefone') or None,
                    responsavel_nome=perfil_raw.get('responsavel_nome') or None,
                    responsavel_cpf=perfil_raw.get('responsavel_cpf') or None,
                    responsavel_cargo=perfil_raw.get('responsavel_cargo') or None,
                    responsavel_telefone=perfil_raw.get('responsavel_telefone') or None,
                    cep=perfil_raw.get('cep') or None,
                    rua=perfil_raw.get('rua') or None,
                    numero=perfil_raw.get('numero') or None,
                    bairro=perfil_raw.get('bairro') or None,
                    cidade=perfil_raw.get('cidade') or None,
                    estado=perfil_raw.get('estado') or None,
                )

            # 10. Código de confirmação de cadastro — de uso único, com
            # validade, guardado em hash. NÃO é mais o `user.pin`: aquele
            # número é a matrícula que o próprio sistema exibe no perfil,
            # nunca expirava, e servia ao mesmo tempo de credencial de login
            # e de token de confirmação. Ver users/models.py::SecurityCode.
            _, codigo = SecurityCode.issue(user, SecurityCode.PURPOSE_EMAIL_CONFIRM)

    except Exception:
        # A mensagem real vai para o log do servidor, não para o cliente.
        # Antes esta view devolvia `str(e)` no corpo do 500, entregando
        # detalhes internos (SQL, caminhos de arquivo, nomes de campo) a
        # qualquer visitante que provocasse um erro de propósito.
        logger.exception('Falha inesperada no cadastro de usuário')
        return Response(
            {"error": "Não foi possível concluir o cadastro. Tente novamente."},
            status=500,
        )

    # 11. E-mail com o código de confirmação e com a matrícula (PIN). São
    # coisas diferentes e o texto deixa isso explícito: a matrícula é
    # permanente e serve para entrar; o código expira em 15 minutos e serve
    # só para ativar a conta.
    assunto = 'Bem-vindo ao PRISMA — confirme seu cadastro'
    mensagem = (
        f"Olá {user.first_name},\n\n"
        f"Seu código de confirmação de cadastro é: {codigo}\n"
        f"Ele vale por {SecurityCode.DEFAULT_TTL_MINUTES} minutos e só pode ser usado uma vez.\n\n"
        f"Sua matrícula de acesso é: {user.pin}\n"
        f"Guarde-a: você pode usá-la no lugar do e-mail para entrar no sistema.\n\n"
        f"Se você não fez este cadastro, ignore este e-mail."
    )
    _enviar_em_thread(assunto, mensagem, user.email)

    # 12. SEM emissão de token aqui — a conta nasce 'pendente' e só passa a
    # existir para login depois que `confirm_registration` validar o código
    # enviado por e-mail.
    return Response({
        "message": (
            f"Cadastro de {role_solicitada} recebido! Verifique seu e-mail e "
            f"confirme o código para ativar a conta antes de entrar."
        ),
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gestor_dashboard(request):
    if request.user.role != 'gestor':
        return Response({"error": "Acesso negado. Apenas gestores podem ver o dashboard."}, status=403)
    try:
        total_alunos = User.objects.filter(role='aluno').count()
        total_empresas = Company.objects.count()
        total_curriculos = Resume.objects.count()
        total_vagas = Job.objects.count()
        total_candidaturas = User.objects.filter(role='candidate').count()
        vagas_por_empresa = Company.objects.annotate(qtd_vagas=Count('jobs')).values('name', 'qtd_vagas')
        total_aplicacoes = Application.objects.count()
        return Response({
            "relatorio_geral": {
                "total_alunos": total_alunos,
                "total_empresas": total_empresas,
                "total_vagas": total_vagas,
                "total_candidaturas": total_candidaturas,
                "total_curriculos": total_curriculos,
                "total_aplicacoes": total_aplicacoes
            },
            "detalhamento": {
                "vagas_por_empresa": list(vagas_por_empresa)
            },
            "status_sistema": "Operacional - Dados atualizados via API"
        })
    except Exception:
        logger.exception('Falha ao gerar relatório do gestor')
        return Response({"error": "Erro ao gerar relatório."}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_resumes(request):
    # Trava de segurança: apenas gestor
    if request.user.role.lower() != 'gestor':
        return Response({"error": "Acesso negado."}, status=403)

    # Busca todos os currículos. 'content' é o JSON livre preenchido pelo
    # aluno (nome, telefone, formação etc); os demais campos ficam no
    # próprio model Resume e são usados para os filtros do gestor.
    resumes = Resume.objects.all().values(
        'id', 'user__username', 'user__email', 'title', 'content',
        'curso', 'ano_ingresso', 'ano_conclusao', 'situacao', 'created_at',
    )
    return Response(resumes)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_companies(request):
    if request.user.role.lower() != 'gestor':
        return Response({"error": "Acesso negado."}, status=403)

    companies = Company.objects.all().values(
        'id', 'name', 'cnpj', 'description', 'website',
        'nome_fantasia', 'area_atuacao', 'telefone',
        'responsavel_nome', 'responsavel_cpf', 'responsavel_cargo', 'responsavel_telefone',
        'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado',
    )
    return Response(companies)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_jobs(request):
    if request.user.role.lower() != 'gestor':
        return Response({'error': 'Acesso negado.'}, status=403)

    jobss = Job.objects.all().values(
        'id',
        'company',
        'company__name',
        'title',
        'description',
        'requirements',
        'salary',
        'is_active',
        'created_at',
        'updated_at',
    ).annotate(total_candidaturas=Count('applications'))

    return Response(jobss)


# ---------------------------------------------------------------------------
# RECUPERAÇÃO DE SENHA
#
# Fluxo em dois passos, ambos públicos (AllowAny):
#
#   1. `password_reset_request`  — recebe o e-mail, emite um SecurityCode
#      de uso único e o envia por e-mail. Resposta SEMPRE igual, exista ou
#      não a conta (não vaza quais e-mails estão cadastrados).
#   2. `password_reset_confirm_pin` — recebe e-mail + código + nova senha,
#      valida o código, aplica a política de senha e revoga as sessões.
#
# O que mudou em 25 ago 2026 (o desenho antigo tinha três furos):
#
#   - o "código" era o `user.pin`, o MESMO número exibido ao usuário como
#     matrícula e aceito como credencial de login;
#   - ele nunca expirava e ficava em texto puro no banco;
#   - pedir reset ROTACIONAVA o PIN da vítima, então qualquer pessoa podia,
#     sem autenticação, trocar a matrícula de qualquer usuário só sabendo o
#     e-mail dele (negação de serviço no login por matrícula).
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle, PasswordResetByAccountThrottle])
def password_reset_request(request):
    """Passo 1: recebe o e-mail e envia um código de uso único."""
    email = str(request.data.get('email', '') or '').strip().lower()
    user = User.objects.filter(email__iexact=email).first()

    # Resposta padrão para evitar enumeração de usuários — idêntica exista
    # ou não a conta, e sem diferença de status HTTP.
    resposta_padrao = {"message": "Se este e-mail estiver cadastrado, as instruções foram enviadas."}

    if user:
        # NOTA: `user.pin` NÃO é mais tocado aqui. Antes esta linha era
        # `user.pin = user.generate_unique_pin()`, o que trocava a matrícula
        # da vítima a cada pedido de reset feito por terceiros.
        _, codigo = SecurityCode.issue(user, SecurityCode.PURPOSE_PASSWORD_RESET)

        assunto = 'PRISMA - Recuperação de Senha'
        mensagem = (
            f"Olá {user.first_name or user.username},\n\n"
            f"Você solicitou a redefinição da sua senha.\n"
            f"Seu código de verificação é: {codigo}\n\n"
            f"Ele vale por {SecurityCode.DEFAULT_TTL_MINUTES} minutos, só pode ser usado uma vez "
            f"e é invalidado se você pedir um código novo.\n\n"
            f"Se não foi você que pediu, ignore este e-mail — sua senha e sua "
            f"matrícula continuam as mesmas."
        )
        _enviar_em_thread(assunto, mensagem, user.email)

    return Response(resposta_padrao, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetConfirmRateThrottle, PasswordResetConfirmByAccountThrottle])
def password_reset_confirm_pin(request):
    """
    Passo 2: recebe e-mail, código e nova senha.

    Camadas que protegem este endpoint, da mais externa para a mais interna:

    1. throttle por IP (5/min) — barra o atacante de origem única;
    2. throttle por conta alvo (5/min) — sobrevive à troca de IP;
    3. `SecurityCode.attempts` (5 erros queimam o código) — é o limite que
       de fato encerra a força-bruta, porque acompanha o código e não a
       origem da requisição;
    4. validade de 15 minutos e uso único;
    5. comparação do código em tempo constante (hash).
    """
    email = str(request.data.get('email', '') or '').strip().lower()
    codigo = str(request.data.get('pin', '') or '').strip()
    new_password = request.data.get('new_password')

    # Mensagem única para qualquer falha de validação do par e-mail/código —
    # não distingue "e-mail não existe" de "código errado" de "código
    # expirado", para não entregar essa informação ao atacante.
    erro_generico = {"error": "Código inválido, expirado ou e-mail incorreto. Solicite um novo código."}

    if not new_password:
        return Response({"error": "A nova senha é obrigatória."}, status=400)

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response(erro_generico, status=400)

    if not SecurityCode.validate(user, SecurityCode.PURPOSE_PASSWORD_RESET, codigo):
        return Response(erro_generico, status=400)

    # Política de senha aplicada também aqui. Antes o reset era um desvio
    # completo dos validadores: dava para trocar a senha por "1" via API
    # mesmo com os validadores configurados no settings.
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)

    codigo_ativo = (
        SecurityCode.objects
        .filter(user=user, purpose=SecurityCode.PURPOSE_PASSWORD_RESET, used_at__isnull=True)
        .order_by('-created_at')
        .first()
    )
    if codigo_ativo:
        codigo_ativo.consume()

    user.set_password(new_password)
    user.save()

    # Trocar a senha derruba as sessões abertas. Sem isto, um invasor que já
    # tivesse um access token da vítima continuaria dentro por até 30 min
    # depois de ela "se proteger" trocando a senha — que é exatamente o
    # momento em que ela mais precisa que isso não aconteça.
    user.revoke_sessions()

    assunto = 'PRISMA - Senha Alterada'
    mensagem = (
        f"Olá {user.first_name or user.username}, sua senha foi alterada com sucesso.\n\n"
        f"Todas as sessões abertas foram encerradas.\n"
        f"Se não foi você, entre em contato com o suporte imediatamente."
    )
    _enviar_em_thread(assunto, mensagem, user.email)

    return Response({"message": "Senha alterada com sucesso!"}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([ChangePasswordRateThrottle])
def change_password(request):
    """
    Troca de senha do usuário LOGADO, confirmando a senha atual.

    Por que existir: até aqui a única forma de trocar de senha no PRISMA era
    o fluxo de recuperação — desenhado para quem PERDEU o acesso. Quem
    estava dentro do sistema e queria trocar a senha (desconfiança de que
    alguém viu, política da instituição, ou vontade própria) tinha que
    deslogar, clicar em "esqueci minha senha", abrir o e-mail e digitar um
    código de 6 dígitos. E quem tivesse perdido o acesso à caixa de e-mail
    simplesmente não conseguia trocar — a rota por e-mail era um ponto único
    de falha para uma operação básica de conta.

    A senha ATUAL é exigida de propósito: sem ela, um token roubado (uma
    sessão deixada aberta num computador compartilhado) bastaria para
    sequestrar a conta em definitivo, trocando a senha e derrubando o dono.

    Assim como no reset, trocar a senha revoga TODAS as sessões — inclusive
    a de quem fez a troca. É a mesma escolha do `password_reset_confirm_pin`
    e ela é deliberada: a revogação aqui é por marca de tempo
    (`sessions_revoked_at` vs. `iat` do token, ver users/authentication.py),
    então não há como poupar a sessão atual sem abrir uma janela para as
    outras. O cliente é avisado no corpo da resposta e manda o usuário
    entrar de novo com a senha nova.
    """
    user = request.user
    current_password = request.data.get('current_password') or ''
    new_password = request.data.get('new_password') or ''

    if not current_password or not new_password:
        return Response(
            {"error": "Informe a senha atual e a nova senha."}, status=400
        )

    # `check_password` do Django compara com o hash em tempo constante.
    if not user.check_password(current_password):
        return Response({"error": "Senha atual incorreta."}, status=400)

    if current_password == new_password:
        return Response(
            {"error": "A nova senha precisa ser diferente da senha atual."},
            status=400,
        )

    # Mesma política do cadastro e do reset — aqui o `user=` sai de graça,
    # já que o usuário existe e está autenticado.
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)

    user.set_password(new_password)
    user.save()
    user.revoke_sessions()

    assunto = 'PRISMA - Senha Alterada'
    mensagem = (
        f"Olá {user.first_name or user.username}, sua senha foi alterada com sucesso.\n\n"
        f"Todas as sessões abertas foram encerradas.\n"
        f"Se não foi você, entre em contato com o suporte imediatamente."
    )
    _enviar_em_thread(assunto, mensagem, user.email)

    response = Response(
        {
            "message": "Senha alterada com sucesso! Entre novamente com a nova senha.",
            # Sinaliza ao frontend que o token em mãos já não vale — ele
            # limpa o estado de sessão e leva para o login sem esperar o
            # primeiro 401.
            "session_ended": True,
        },
        status=200,
    )
    # O refresh mora em cookie httpOnly (users/cookies.py); deixá-lo para
    # trás faria o cliente tentar renovar uma sessão que acabou de ser
    # revogada.
    return clear_refresh_cookie(response)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ConfirmRegistrationRateThrottle, ConfirmRegistrationByAccountThrottle])
def confirm_registration(request):
    """
    Confirma a posse do e-mail com o código enviado no cadastro e promove a
    conta de 'pendente' para 'ativo'. Sem essa confirmação,
    `MyTokenObtainPairSerializer` recusa o login.

    Devolve tokens de sessão já na confirmação para o usuário não precisar
    logar de novo em seguida — o refresh vai no cookie httpOnly, como no
    login (ver users/cookies.py).
    """
    email = str(request.data.get('email', '') or '').strip().lower()
    codigo = str(request.data.get('pin', '') or '').strip()

    erro_generico = {"error": "Código inválido, expirado ou e-mail incorreto."}

    user = User.objects.filter(email__iexact=email).first()
    if not user:
        return Response(erro_generico, status=400)

    if user.status == 'inativo':
        return Response({"error": "Esta conta está inativa. Entre em contato com o suporte."}, status=400)

    if not SecurityCode.validate(user, SecurityCode.PURPOSE_EMAIL_CONFIRM, codigo):
        return Response(erro_generico, status=400)

    codigo_ativo = (
        SecurityCode.objects
        .filter(user=user, purpose=SecurityCode.PURPOSE_EMAIL_CONFIRM, used_at__isnull=True)
        .order_by('-created_at')
        .first()
    )
    if codigo_ativo:
        codigo_ativo.consume()

    if user.status != 'ativo':
        user.status = 'ativo'
        user.save(update_fields=['status'])

    refresh = RefreshToken.for_user(user)
    response = Response({
        "message": "Cadastro confirmado com sucesso! Sua conta já está ativa.",
        "access": str(refresh.access_token),
        "role": user.role,
        "name": f"{user.first_name} {user.last_name}".strip() or user.username,
        "id": user.id,
        "email": user.email,
    }, status=200)
    return set_refresh_cookie(response, refresh)


class MyTokenObtainPairView(TokenObtainPairView):
    """
    Login. O access token sai no corpo (curto, 30 min, guardado só em
    memória pelo frontend); o refresh vai para um cookie httpOnly e **não
    aparece mais no corpo da resposta** — era o que permitia a um XSS
    roubar uma sessão renovável por 1 dia inteiro.
    """
    serializer_class = MyTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle, LoginByAccountThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        refresh_token = response.data.pop('refresh', None)
        if refresh_token:
            set_refresh_cookie(response, refresh_token)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """
    Renova o access token lendo o refresh do cookie httpOnly.

    Aceita o corpo `{"refresh": ...}` como alternativa, para clientes que não
    são navegador (scripts, a suíte de integração em `tests/`).
    """

    def post(self, request, *args, **kwargs):
        refresh_token = get_refresh_token(request)
        if not refresh_token:
            return Response({"detail": "Sessão não encontrada."}, status=401)

        serializer = self.get_serializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken):
            response = Response({"detail": "Sessão expirada."}, status=401)
            return clear_refresh_cookie(response)

        data = dict(serializer.validated_data)
        novo_refresh = data.pop('refresh', None)

        response = Response(data, status=200)
        if novo_refresh:
            set_refresh_cookie(response, novo_refresh)
        return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout de verdade: revoga toda sessão do usuário e limpa o cookie.

    Antes o logout era só `localStorage.clear()` no navegador — o token
    continuava válido no servidor até expirar. Quem tivesse copiado o token
    seguia autenticado, e "sair da conta" não protegia nada num computador
    compartilhado.
    """
    request.user.revoke_sessions()
    response = Response({"message": "Sessão encerrada."}, status=200)
    return clear_refresh_cookie(response)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    """
    Perfil do usuário logado: dados pessoais/acadêmicos/endereço coletados
    no cadastro e agora consultáveis/editáveis aqui.
    Cada usuário só acessa o próprio perfil — não recebe nenhum `pk` na URL.
    """
    profile, _ = Profile.objects.get_or_create(
        user=request.user, defaults={'type': request.user.role}
    )

    if request.method == 'PATCH':
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    serializer = ProfileSerializer(profile)
    return Response(serializer.data)
