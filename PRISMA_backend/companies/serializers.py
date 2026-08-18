from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Company

User = get_user_model()

class CompanySerializer(serializers.ModelSerializer):
    # Campos derivados do usuário dono, usados na página de Perfil da Empresa
    email = serializers.ReadOnlyField(source='owner.email')
    created_at = serializers.ReadOnlyField(source='owner.date_joined')

    class Meta:
        model = Company
        fields = [
            'id', 'name', 'cnpj', 'description', 'website', 'email', 'created_at',
            'nome_fantasia', 'area_atuacao', 'telefone',
            'responsavel_nome', 'responsavel_cpf', 'responsavel_cargo', 'responsavel_telefone',
            'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado',
        ]
        read_only_fields = ['owner'] # O dono é preenchido via código

    def create(self, validated_data):
        # Define o dono como o usuário logado
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)
    
class CompanyRegisterSerializer(serializers.ModelSerializer):
    # Campos extras que o React vai enviar para a Empresa
    cnpj = serializers.CharField(max_length=18, required=True)
    company_name = serializers.CharField(max_length=255, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'cnpj', 'company_name']
        extra_kwargs = {'password': {'write_only': True}}