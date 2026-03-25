import requests
from django.conf import settings
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    # Campo extra para receber o token do Google vindo do Front
    captcha_token = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'captcha_token']

    def validate_captcha_token(self, value):
        """
        Valida o token do captcha junto à API do Google.
        """
        # Se você estiver em modo de desenvolvimento e não quiser validar agora, 
        # pode apenas dar um 'return value'.
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': settings.RECAPTCHA_PRIVATE_KEY,
                'response': value
            }
        )
        result = response.json()

        if not result.get('success'):
            raise serializers.ValidationError("Falha na verificação do reCAPTCHA. Tente novamente.")
        
        return value

    def create(self, validated_data):
        # Removemos o captcha_token antes de criar o usuário, pois o modelo User não tem esse campo
        validated_data.pop('captcha_token', None)
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user
    """import requests
from django.conf import settings
from rest_framework import serializers
from django.contrib.auth import get_user_model
from captcha.models import CaptchaStore # Importe isso

User = get_user_model()

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    # Recebendo os campos do captcha de imagem (letrinhas)
    captcha_0 = serializers.CharField(write_only=True) # O hash
    captcha_1 = serializers.CharField(write_only=True) # O que o user digitou
    
    # Recebendo o objeto perfil que vem do React
    perfil = serializers.JSONField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'captcha_0', 'captcha_1', 'perfil']

    def validate(self, data):
        
        hashkey = data.get('captcha_0')
        response = data.get('captcha_1')
        
        try:
            captcha = CaptchaStore.objects.get(hashkey=hashkey)
            if captcha.response != response.lower():
                raise serializers.ValidationError({"captcha": "Código de verificação incorreto."})
            captcha.delete() # Deleta para não ser usado de novo
        except CaptchaStore.DoesNotExist:
            raise serializers.ValidationError({"captcha": "Captcha expirado ou inválido."})
            
        return data

    def create(self, validated_data):
        # Removemos os dados que não são do modelo User
        validated_data.pop('captcha_0')
        validated_data.pop('captcha_1')
        perfil_data = validated_data.pop('perfil')
        
        # Cria o usuário
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # AQUI VOCÊ CONECTA COM O PERFIL
        # Se você tiver um model 'PerfilAluno', você cria ele aqui usando o 'user'
        # Exemplo: PerfilAluno.objects.create(user=user, **perfil_data)
        
        return user"""