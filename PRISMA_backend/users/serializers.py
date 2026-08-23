from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Profile

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    """
    Dados pessoais/acadêmicos/endereço do aluno-egresso (ou institucionais
    equivalentes), coletados no cadastro e agora persistidos de verdade.
    Usado pelo endpoint `GET/PATCH /api/users/me/`.
    """
    name = serializers.SerializerMethodField()
    email = serializers.ReadOnlyField(source='user.email')
    pin = serializers.ReadOnlyField(source='user.pin')
    role = serializers.ReadOnlyField(source='user.role')

    class Meta:
        model = Profile
        fields = [
            'name', 'email', 'pin', 'role',
            'cpf', 'telefone', 'data_nascimento',
            'instituicao', 'curso', 'situacao_academica',
            'ano_inicio', 'previsao_conclusao', 'ano_conclusao',
            'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado',
        ]

    def get_name(self, obj):
        full_name = obj.user.get_full_name()
        return full_name if full_name else obj.user.username

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # O validate retorna o que vai no corpo da resposta (JSON). Chamamos
        # o super() PRIMEIRO — ele já confirma e-mail/PIN + senha via
        # EmailOrPinBackend — para só então checar o status da conta. Fazer
        # nessa ordem evita vazar "essa conta está pendente" para quem nem
        # acertou a senha; a mensagem de credencial inválida do SimpleJWT
        # continua genérica para esse caso.
        data = super().validate(attrs)

        if self.user.status == 'pendente':
            raise serializers.ValidationError(
                {"error": "Confirme seu cadastro antes de entrar. Verifique o PIN enviado por e-mail e use a tela de confirmação de cadastro."}
            )
        if self.user.status == 'inativo':
            raise serializers.ValidationError(
                {"error": "Esta conta está inativa. Entre em contato com o suporte."}
            )

        # Adiciona os dados do usuário na resposta do JSON para o React
        data['role'] = self.user.role
        data['name'] = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username
        data['id'] = self.user.id
        data['email'] = self.user.email

        return data

    @classmethod
    def get_token(cls, user):
        # Isso aqui mantém os dados dentro do Token (criptografado)
        token = super().get_token(user)
        token['role'] = user.role
        return token