from django.core.mail import send_mail
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from companies.models import Company
import uuid  # <--- IMPORTANTE: Importe isso para gerar números únicos
from .models import User
from captcha.models import CaptchaStore # <--- IMPORTANTE
from django.utils import timezone
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
            role=data.get('role', 'CANDIDATE')
        )

        if user.role == 'COMPANY':
            # GERA UM CNPJ FAKE ÚNICO (Para não dar erro no banco)
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
    
    