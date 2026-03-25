from rest_framework import serializers
from .models import Company

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'cnpj', 'description', 'website']
        read_only_fields = ['owner'] # O dono é preenchido via código

    def create(self, validated_data):
        # Define o dono como o usuário logado
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)