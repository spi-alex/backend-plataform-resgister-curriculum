import threading
import uuid
from django.db.models import Count
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import MyTokenObtainPairSerializer, ProfileSerializer
# Importações dos seus modelos
from .models import Profile
from .throttles import (
    LoginRateThrottle,
    RegisterRateThrottle,
    PasswordResetRateThrottle,
    PasswordResetConfirmRateThrottle,
    ConfirmRegistrationRateThrottle,
)
from companies.models import Company
from jobs.models import Job, Application
from captcha.models import CaptchaStore
from resumes.models import Resume
from .emails import enviar_email_async

from rest_framework_simplejwt.views import TokenObtainPairView
User = get_user_model()


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
    except Exception:
        return Response({"error": "Erro na validação do Captcha."}, status=400)

    try:
        # 2. Definição da Role — MASS ASSIGNMENT CORRIGIDO: antes qualquer
        # string enviada em `role` era aceita sem checagem nenhuma, então um
        # POST direto na API com `role: "gestor"` criava uma conta de gestor
        # sem nenhuma validação. Agora só os papéis de autocadastro são
        # aceitos; qualquer outro valor (gestor, admin, ou lixo) cai no
        # default seguro 'candidate'.
        role_solicitada = data.get('role', 'candidate').lower()
        if role_solicitada not in SELF_REGISTER_ROLES:
            role_solicitada = 'candidate'

        # 3. Garantia de Username (Evita erro 500 se o React não enviar 'username')
        # Tenta pegar username, se não existir usa o email, se não gera um aleatório
        username_final = data.get('username') or data.get('email') or f"user_{uuid.uuid4().hex[:8]}"

        # 4. Criação do Usuário Base — status 'pendente' até confirmar o PIN
        # enviado por e-mail (passo 8 abaixo). Antes toda conta nascia
        # 'ativa' (valor default do model) e já recebia token de sessão na
        # resposta deste próprio cadastro, sem nenhuma confirmação de posse
        # do e-mail.
        user = User.objects.create_user(
            username=username_final,
            email=data.get('email'),
            password=data.get('password'),
            role=role_solicitada,
            status='pendente',
        )

        # 5. Tratamento de Nome (Diferencia Empresa de Pessoa Física)
        if role_solicitada in ['company', 'empresa']:
            user.first_name = data.get('company_name') or data.get('nome') or "Empresa PRISMA"
            user.last_name = ''
        else:
            perfil_raw = data.get('perfil', {})
            nome_completo = perfil_raw.get('nome') or data.get('nome') or "Usuário PRISMA"
            partes_nome = nome_completo.split(' ', 1)
            user.first_name = partes_nome[0]
            user.last_name = partes_nome[1] if len(partes_nome) > 1 else ''
        
        user.save()

        perfil_raw = data.get('perfil', {}) or {}

        # 6. Garante o Profile (o sinal post_save de users/signals.py já cria/
        # sincroniza automaticamente; update_or_create evita erro de duplicidade
        # caso o sinal já tenha criado o registro).
        #
        # Antes, só o campo `type` era preenchido aqui — CPF, telefone, data
        # de nascimento, instituição, curso, situação e endereço eram
        # coletados pelo formulário (StudentRegistration.tsx) e descartados
        # silenciosamente, porque nada os lia nem o model tinha coluna para
        # eles. Persistimos tudo agora.
        profile_defaults = {'type': user.role}
        if role_solicitada not in ['company', 'empresa']:
            profile_defaults.update({
                'cpf': perfil_raw.get('cpf') or None,
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

        Profile.objects.update_or_create(
            user=user,
            defaults=profile_defaults,
        )

        # 7. Lógica Específica para Empresa (Com trava de segurança para CNPJ)
        if role_solicitada in ['company', 'empresa']:
            from companies.models import Company

            cnpj_enviado = data.get('cnpj')

            # Validação: Se o CNPJ já existir, interrompe para não dar erro 500
            if cnpj_enviado and Company.objects.filter(cnpj=cnpj_enviado).exists():
                user.delete() # Remove o user criado para permitir tentar de novo com o mesmo e-mail
                return Response({"error": "Este CNPJ já está cadastrado no sistema."}, status=400)

            # Mesmo caso do Profile: área de atuação, dados do responsável e
            # endereço eram pedidos pelo documento de especificação e
            # descartados por falta de coluna. Agora persistimos o que o
            # formulário mandar dentro de `perfil`.
            Company.objects.create(
                owner=user,
                name=user.first_name,
                # Se não vier CNPJ, gera um temporário para não violar a unicidade do banco
                cnpj=cnpj_enviado or f"TEMP-{uuid.uuid4().hex[:10]}",
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

        # 8. Envio de E-mail Assíncrono com PIN — esse mesmo PIN agora também
        # é o que confirma a conta em `confirm_registration` (passo 9).
        assunto = 'Bem-vindo ao PRISMA — confirme seu cadastro'
        mensagem = (
            f"Olá {user.first_name}, seu PIN de acesso é: {user.pin}\n\n"
            f"Use esse PIN junto com seu e-mail na tela de confirmação de "
            f"cadastro para ativar sua conta."
        )

        def enviar_email_seguro():
            try:
                enviar_email_async(assunto, mensagem, user.email)
            except Exception as e:
                print(f"Erro no serviço de e-mail: {e}")

        threading.Thread(target=enviar_email_seguro).start()

        # 9. SEM emissão de token aqui — a conta nasce 'pendente' (passo 4) e
        # só passa a existir para login depois que `confirm_registration`
        # validar o PIN enviado por e-mail. Antes o próprio cadastro já
        # devolvia `access`/`refresh` JWT, ou seja, dava para logar sem
        # nunca confirmar posse do e-mail.
        return Response({
            "message": (
                f"Cadastro de {role_solicitada} recebido! Verifique seu "
                f"e-mail e confirme o PIN para ativar a conta antes de entrar."
            ),
        }, status=201)

    except Exception as e:
        # Se cair aqui, pelo menos retornamos a mensagem real do erro para debug
        return Response({"error": f"Erro interno: {str(e)}"}, status=500)
# ... (restante das suas funções gestor_dashboard, list_all_resumes, etc, permanecem iguais)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated]) # Só entra quem tem Token
def gestor_dashboard(request):
    #  (A Tranca) - request.user.role.lower() poderia fzr assim ao inves doq fiz na linha 48
    if request.user.role != 'gestor':  # Certifique-se de que o role seja comparado em minúsculas
        return Response({"error": "Acesso negado. Apenas gestores podem ver o dashboard."}, status=403)
    try:
    # 2. COLETA DE DADOS (A Contabilidade) - Totais Gerais
        total_alunos = User.objects.filter(role='aluno').count()
        total_empresas = Company.objects.count()
        total_curriculos = Resume.objects.count()  # Contagem de currículos cadastrados
        total_vagas = Job.objects.count()
        total_candidaturas = User.objects.filter(role='candidate').count()
        vagas_por_empresa = Company.objects.annotate(qtd_vagas = Count('jobs')).values('name', 'qtd_vagas')
        total_aplicacoes = Application.objects.count()
        # 3. RETORNO DOS DADOS
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
    except Exception as e:
        return Response({"error": f"Erro ao gerar relatório: {str(e)}"}, status=500)

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

    # Antes só devolvia name/cnpj/description/website — os campos
    # institucionais adicionados a Company (área de atuação, responsável,
    # endereço) existiam no banco mas não apareciam nesta listagem do
    # gestor, só no perfil da própria empresa.
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
        return Response({'error': 'Acesso negado. '} , status=403)

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

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_request(request):
    """
    Passo 1: Recebe o e-mail e envia o PIN que já existe no banco.
    """
    email = request.data.get('email', '').strip()
    user = User.objects.filter(email__iexact=email).first()
    
    # Resposta padrão para evitar enumeração de usuários
    resposta_padrao = {"message": "Se este e-mail estiver cadastrado, as instruções foram enviadas."}

    if user:
        # Opcional: Gerar um novo PIN toda vez que pedir reset para aumentar a segurança
        user.pin = user.generate_unique_pin()
        user.save()

        assunto = 'PRISMA - Recuperação de Senha'
        mensagem = (
            f"Olá {user.first_name or user.username},\n\n"
            f"Você solicitou a redefinição de sua senha.\n"
            f"Seu código PIN de verificação é: {user.pin}\n\n"
            f"Use este código no sistema para cadastrar uma nova senha."
        )

        threading.Thread(
            target=enviar_email_async,
            args=(assunto, mensagem, user.email)
        ).start()

    return Response(resposta_padrao, status=200)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetConfirmRateThrottle])
def password_reset_confirm_pin(request):
    """
    Passo 2: Recebe Email, PIN e Nova Senha.
    Valida se o PIN pertence àquele e-mail e altera a senha.

    Throttle dedicado aqui é o que mais importa dos dois: é o endpoint que
    de fato tenta o PIN de 6 dígitos (900 mil combinações) contra um e-mail
    conhecido — sem limite de tentativas, força-bruta era viável.
    """
    email = request.data.get('email', '').strip()
    pin_enviado = request.data.get('pin', '').strip()
    new_password = request.data.get('new_password')

    if not new_password:
        return Response({"error": "A nova senha é obrigatória."}, status=400)

    # Busca o usuário que combina e-mail e PIN
    user = User.objects.filter(email__iexact=email, pin=pin_enviado).first()

    if user:
        # 1. Altera a senha
        user.set_password(new_password)
        
        # 2. Gera um novo PIN após o sucesso (invalida o anterior)
        user.pin = user.generate_unique_pin()
        user.save()

        # 3. E-mail de confirmação (Segurança)
        assunto = 'PRISMA - Senha Alterada'
        mensagem = f"Olá {user.username}, sua senha foi alterada com sucesso via código PIN."
        
        threading.Thread(
            target=enviar_email_async,
            args=(assunto, mensagem, user.email)
        ).start()

        return Response({"message": "Senha alterada com sucesso!"}, status=200)

    return Response({"error": "Código PIN inválido ou e-mail incorreto."}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([ConfirmRegistrationRateThrottle])
def confirm_registration(request):
    """
    Confirma a posse do e-mail usando o mesmo PIN enviado no cadastro
    (register_user, passo 8) e promove a conta de 'pendente' para 'ativo'.
    Sem essa confirmação, `MyTokenObtainPairSerializer` recusa o login
    (ver serializers.py). Devolve tokens de sessão já na confirmação, para
    o usuário não precisar logar de novo logo em seguida.
    """
    email = request.data.get('email', '').strip()
    pin_enviado = request.data.get('pin', '').strip()

    user = User.objects.filter(email__iexact=email, pin=pin_enviado).first()
    if not user:
        return Response({"error": "E-mail ou PIN inválido."}, status=400)

    if user.status == 'inativo':
        return Response({"error": "Esta conta está inativa. Entre em contato com o suporte."}, status=400)

    if user.status != 'ativo':
        user.status = 'ativo'
        user.save(update_fields=['status'])

    refresh = RefreshToken.for_user(user)
    return Response({
        "message": "Cadastro confirmado com sucesso! Sua conta já está ativa.",
        "tokens": {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        },
    }, status=200)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    """
    Perfil do usuário logado: dados pessoais/acadêmicos/endereço coletados
    no cadastro (antes descartados) e agora consultáveis/editáveis aqui.
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