from django.db.models import Count
from django.core.mail import send_mail
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from companies.models import Company
from jobs.models import Job, Application # <--- IMPORTANTE: Importe o modelo de vagas quando tiver ele criado
import uuid  #  gerar números únicos
from .models import User
from captcha.models import CaptchaStore 
from django.utils import timezone
from resumes.models import Resume
User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data
    
    
# --- VALIDAÇÃO DO CAPTCHA ---
    captcha_key = data.get('captcha_key') # Chave que o sistema gera
    captcha_value = data.get('captcha_value') # O que o usuário digitou

    if not captcha_key or not captcha_value:
        return Response({"error": "Captcha é obrigatório."}, status=400)
    
    try:
        # Verifica se o código digitado bate com a chave gerada
        captcha = CaptchaStore.objects.get(hashkey=captcha_key)
        print(f"VALOR NO BANCO: {captcha.response}")  # <--- ADICIONE ISSO
        print(f"VALOR ENVIADO: {captcha_value}")
        if captcha.response.lower() != captcha_value.lower():
            return Response({"error": "Captcha incorreto."}, status=400)
        # Opcional: apagar o captcha para ele não ser usado de novo
        captcha.delete()    
    except CaptchaStore.DoesNotExist:
        return Response({"error": "Captcha expirado ou chave inválida."}, status=400)
    # ----------------------------

    try:
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            role=data.get('role', 'candidate').lower()
        )

        if user.role == 'company':
            # GERA UM CNPJ FAKE ÚNICO (Para não dar erro no banco) TENHO QUE TROCAR QUANDO COLOCAR EM PRODUÇÃO
            cnpj_unico = str(uuid.uuid4().int)[:14] 
            
            Company.objects.create(
                owner=user,
                name=f"Empresa de {user.username}",
                cnpj=cnpj_unico,  # <--- AQUI MUDOU
                description="Cadastrado via API"
            )

        # --- NOVO: DISPARO DO E-MAIL DE BOAS-VINDAS ---
        assunto = 'Bem-vindo ao PRISMA - Sua Matrícula'
        mensagem = (
            f"Olá {user.username},\n\n"
            f"Seu cadastro foi realizado com sucesso!\n"
            f"Sua matrícula (PIN) para acesso é: {user.pin}\n\n"
            f"Guarde este número, ele será necessário para o seu login."
        )
        remetente = 'sistema@prisma.com'
        destinatario = [user.email]

        send_mail(assunto, mensagem, remetente, destinatario)
        # -----------------------------------------------

        refresh = RefreshToken.for_user(user)
        
        return Response({
            "message": "Usuário criado com sucesso! Verifique seu PIN no e-mail (terminal).",
            "pin_gerado": user.pin,
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
        }, status=201)

    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
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