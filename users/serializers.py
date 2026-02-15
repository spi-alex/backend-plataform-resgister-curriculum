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