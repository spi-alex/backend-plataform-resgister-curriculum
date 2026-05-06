import threading
import uuid
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.db.models import Count
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import MyTokenObtainPairSerializer
# Importações dos seus modelos
from .models import Profile
from companies.models import Company
from jobs.models import Job, Application
from captcha.models import CaptchaStore 
from resumes.models import Resume
from .emails import enviar_email_async

from rest_framework_simplejwt.views import TokenObtainPairView
User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
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
        # 2. Definição da Role
        role_solicitada = data.get('role', 'candidate').lower()
        
        # 3. Garantia de Username (Evita erro 500 se o React não enviar 'username')
        # Tenta pegar username, se não existir usa o email, se não gera um aleatório
        username_final = data.get('username') or data.get('email') or f"user_{uuid.uuid4().hex[:8]}"

        # 4. Criação do Usuário Base
        user = User.objects.create_user(
            username=username_final,
            email=data.get('email'),
            password=data.get('password'),
            role=role_solicitada
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

        # 6. Criação Automática do Profile
        Profile.objects.create(
            user=user,
            type=user.role
        )

        # 7. Lógica Específica para Empresa (Com trava de segurança para CNPJ)
        if role_solicitada in ['company', 'empresa']:
            from companies.models import Company 
            
            cnpj_enviado = data.get('cnpj')
            
            # Validação: Se o CNPJ já existir, interrompe para não dar erro 500
            if cnpj_enviado and Company.objects.filter(cnpj=cnpj_enviado).exists():
                user.delete() # Remove o user criado para permitir tentar de novo com o mesmo e-mail
                return Response({"error": "Este CNPJ já está cadastrado no sistema."}, status=400)

            Company.objects.create(
                owner=user,
                name=user.first_name,
                # Se não vier CNPJ, gera um temporário para não violar a unicidade do banco
                cnpj=cnpj_enviado or f"TEMP-{uuid.uuid4().hex[:10]}",
                description=data.get('description', ''),
                website=data.get('website', '')
            )

        # 8. Envio de E-mail Assíncrono com PIN
        assunto = 'Bem-vindo ao PRISMA'
        mensagem = f"Olá {user.first_name}, seu PIN de acesso é: {user.pin}"
        
        def enviar_email_seguro():
            try:
                enviar_email_async(assunto, mensagem, user.email)
            except Exception as e:
                print(f"Erro no serviço de e-mail: {e}")

        threading.Thread(target=enviar_email_seguro).start()

        # 9. Geração de Tokens JWT
        refresh = RefreshToken.for_user(user)
        return Response({
            "message": f"Cadastro de {role_solicitada} realizado com sucesso!",
            "tokens": {
                "refresh": str(refresh), 
                "access": str(refresh.access_token)
            }
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
    
    # Busca todos os currículos (ajuste o nome do modelo se necessário)
    resumes = Resume.objects.all().values('id', 'user__username', 'title', 'content', 'created_at')
    return Response(resumes)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_companies(request):
    if request.user.role.lower() != 'gestor':
        return Response({"error": "Acesso negado."}, status=403)
        
    # Busca todas as empresas
    companies = Company.objects.all().values('id', 'name', 'cnpj', 'description','website')
    return Response(companies)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_all_jobs(request):
    if request.user.role.lower() != 'gestor':
        return Response({'error': 'Acesso negado. '} , status=403)
    
    jobss = Job.objects.all().values(
        'company',  
        'title',
        'description',
        'requirements', 
        'salary',
        'is_active', 
        'created_at', 
        'updated_at',
    )

    return Response(jobss)

@api_view(['POST'])
@permission_classes([AllowAny])
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
def password_reset_confirm_pin(request):
    """
    Passo 2: Recebe Email, PIN e Nova Senha.
    Valida se o PIN pertence àquele e-mail e altera a senha.
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

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer