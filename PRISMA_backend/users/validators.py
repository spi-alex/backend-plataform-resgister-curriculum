"""
Validação de CPF e CNPJ por dígito verificador, no backend.

Até aqui a única validação desses campos era a máscara do formulário React —
ou seja, nenhuma validação de verdade: um POST direto na API com
`"cpf": "111.111.111-11"` (ou qualquer sequência de 11 dígitos) era aceito e
gravado. Isso é o item "CNPJ/CPF sem validação de dígito verificador no
backend" da bateria de testes do diagnóstico.

As funções abaixo aceitam o valor com ou sem máscara e devolvem o valor
normalizado (só dígitos) ou levantam `ValidationError`.
"""
from django.core.exceptions import ValidationError


def _so_digitos(valor):
    return ''.join(c for c in str(valor or '') if c.isdigit())


def _digito_verificador(digitos, pesos):
    soma = sum(int(d) * p for d, p in zip(digitos, pesos))
    resto = soma % 11
    return 0 if resto < 2 else 11 - resto


def validar_cpf(valor):
    """
    Devolve o CPF só com dígitos, ou levanta ValidationError.

    Rejeita tamanho errado, sequências repetidas (`00000000000`,
    `11111111111`, ...) — que passam na conta dos dígitos verificadores mas
    nunca são CPFs reais — e dígitos verificadores incorretos.
    """
    cpf = _so_digitos(valor)

    if len(cpf) != 11:
        raise ValidationError('CPF deve ter 11 dígitos.')

    if cpf == cpf[0] * 11:
        raise ValidationError('CPF inválido.')

    dv1 = _digito_verificador(cpf[:9], range(10, 1, -1))
    dv2 = _digito_verificador(cpf[:10], range(11, 1, -1))

    if cpf[9] != str(dv1) or cpf[10] != str(dv2):
        raise ValidationError('CPF inválido (dígito verificador não confere).')

    return cpf


def validar_cnpj(valor):
    """Devolve o CNPJ só com dígitos, ou levanta ValidationError."""
    cnpj = _so_digitos(valor)

    if len(cnpj) != 14:
        raise ValidationError('CNPJ deve ter 14 dígitos.')

    if cnpj == cnpj[0] * 14:
        raise ValidationError('CNPJ inválido.')

    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    pesos2 = [6] + pesos1

    dv1 = _digito_verificador(cnpj[:12], pesos1)
    dv2 = _digito_verificador(cnpj[:13], pesos2)

    if cnpj[12] != str(dv1) or cnpj[13] != str(dv2):
        raise ValidationError('CNPJ inválido (dígito verificador não confere).')

    return cnpj
