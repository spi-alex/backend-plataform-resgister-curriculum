# PRISMA - Sistema de Gestão de Egressos e Recrutamento 🚀

O PRISMA é uma plataforma robusta desenvolvida em Django Rest Framework (DRF) desenhada para conectar egressos de instituições de ensino a oportunidades reais no mercado de trabalho.

## 🛠️ Tecnologias Utilizadas

- **Backend:** Python 3.x / Django 5.x
- **API:** Django Rest Framework
- **Autenticação:** Simple JWT (JSON Web Tokens)
- **Banco de Dados:** SQLite (Desenvolvimento) / PostgreSQL (Sugestão Produção)
- **Relatórios:** WeasyPrint (Conversão HTML para PDF)
- **Notificações:** Django Signals & SMTP (E-mail)

## 📌 Principais Funcionalidades

### 🔐 Autenticação e Perfis

- Diferenciação de usuários entre **Candidatos** (Egressos) e **Empresas**.
- Registro automatizado: ao criar um usuário Empresa, o perfil corporativo é instanciado automaticamente.

### 💼 Gestão de Vagas e Candidaturas

- CRUD completo de vagas com filtros por salário, cargo e requisitos.
- **Funil de Recrutamento:** Movimentação de candidatos entre os status: `Pendente`, `Em Análise`, `Entrevista`, `Aprovado` e `Reprovado`.
- Notificações automáticas via e-mail para o candidato a cada mudança de status.

### 📊 Inteligência e Dashboard

- **Dashboard Corporativo:** Visão analítica para empresas com estatísticas de vagas ativas e volume de inscritos.
- **Busca de Talentos:** Filtro inteligente de busca textual dentro dos currículos (`icontains`).

### 📄 Exportação de Dados

- Geração de currículo em PDF no estilo **Minimalist Noir**, focado em tipografia e clareza.

## 🚀 Como Rodar o Projeto

1. Clone o repositório.
2. Crie um ambiente virtual: `python -m venv venv`
3. Instale as dependências: `pip install -r requirements.txt`
4. Execute as migrações: `python manage.py migrate`
5. Inicie o servidor: `python manage.py runserver`
