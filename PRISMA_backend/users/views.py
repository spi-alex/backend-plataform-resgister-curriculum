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

# Importações dos seus modelos
from .models import Profile
from companies.models import Company
from jobs.models import Job, Application
from captcha.models import CaptchaStore 
from resumes.models import Resume
from .emails import enviar_email_async

User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data
    
    # 1. Validação do Captcha (Obrigatória antes de salvar qualquer dado)
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
        # 2. Captura do Nome Real (Garantindo que não seja o e-mail)
        # Verificamos dentro do objeto 'perfil' que o seu React envia
        perfil_raw = data.get('perfil', {})
        nome_completo = perfil_raw.get('nome') or data.get('nome') or "Usuário PRISMA"
        
        # 3. Criação do Usuário
        # O Django exige um username único; se você usa o e-mail como username, ele aparecerá na primeira coluna
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            role=data.get('role', 'candidate').lower()
        )

        # 4. FORÇANDO O NOME NO BANCO (O que resolve o seu problema visual)
        # O Admin do Django usa first_name e last_name por padrão
        partes_nome = nome_completo.split(' ', 1)
        user.first_name = partes_nome[0]
        user.last_name = partes_nome[1] if len(partes_nome) > 1 else ''
        user.save() # Importante salvar novamente após alterar os campos

        # 5. Criação do Profile vinculado (Conforme seu modelo OneToOne)
        Profile.objects.create(
            user=user,
            type=user.role
        )

        # 6. Envio de E-mail Assíncrono (Evita o delay de 5 segundos)
        # O try/except interno evita que o erro do Resend quebre o cadastro [cite: 8, 9]
        assunto = 'Bem-vindo ao PRISMA'
        mensagem = f"Olá {user.first_name}, seu PIN de acesso é: {user.pin}"
        
        def enviar_email_seguro():
            try:
                enviar_email_async(assunto, mensagem, user.email)
            except Exception as e:
                print(f"Erro no serviço de e-mail (Resend): {e}")

        threading.Thread(target=enviar_email_seguro).start()

        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "Usuário criado com sucesso!",
            "tokens": {"refresh": str(refresh), "access": str(refresh.access_token)}
        }, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

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
@permission_classes([AllowAny]) # Qualquer um pode pedir o reset
def password_reset_request(request):
    email_sujo = request.data.get('email', '')
    email = email_sujo.strip()
    user = User.objects.filter(email__iexact=email).first()
    
    # Resposta padrão por segurança (evita que hackers saibam quais e-mails existem)
    resposta_padrao = {"message": "Se este e-mail estiver cadastrado, as instruções foram enviadas."}

    if user:
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # O link para o seu Frontend (ajuste o domínio se necessário)
        link_recuperacao = f"http://localhost:5173/password-reset-confirm/{uid}/{token}/"

        assunto = 'PRISMA - Recuperação de Senha'
        mensagem = (
            f"Olá {user.username},\n\n"
            f"Recebemos um pedido para redefinir a sua senha.\n"
            f"Clique no link abaixo para prosseguir:\n\n"
            f"{link_recuperacao}\n\n"
            f"Se não solicitou isto, ignore este e-mail."
        )

        # --- AQUI ESTÁ A MÁGICA ---
        threading.Thread(
            target=enviar_email_async,
            args=(assunto, mensagem, user.email)
        ).start()
        # --------------------------

    return Response(resposta_padrao, status=200)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        new_password = request.data.get('new_password')
        if not new_password:
            return Response({"error": "Nova senha é obrigatória."}, status=400)
            
        # 1. Altera a senha
        user.set_password(new_password)
        user.save()

        # 2. --- NOVO: E-MAIL DE CONFIRMAÇÃO DE ALTERAÇÃO ---
        assunto = 'PRISMA - Senha Alterada com Sucesso'
        mensagem = (
            f"Olá {user.username},\n\n"
            f"Este é um aviso de segurança para confirmar que a sua senha no sistema PRISMA foi alterada recentemente.\n\n"
            f"Se foi você quem realizou esta alteração, pode ignorar este e-mail.\n"
            f"Caso você NÃO tenha solicitado isso, entre em contato com o suporte imediatamente."
        )
        remetente = settings.EMAIL_HOST_USER # Usando a sua config oficial
        destinatario = [user.email]

        try:
            send_mail(assunto, mensagem, remetente, destinatario)
        except Exception as e:
            # Logamos o erro mas não travamos a resposta, pois a senha JÁ foi trocada
            print(f"Erro ao enviar e-mail de confirmação: {e}")
        # --------------------------------------------------

        return Response({"message": "Senha alterada com sucesso! Um e-mail de confirmação foi enviado."}, status=200)
    
    return Response({"error": "O link de recuperação é inválido ou expirou."}, status=400)