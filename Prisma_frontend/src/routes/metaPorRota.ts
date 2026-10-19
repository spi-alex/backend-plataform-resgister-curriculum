import type { PageMeta } from "../hooks/usePageMeta";

/**
 * Título e description de cada rota, num só lugar.
 *
 * A alternativa era chamar `usePageMeta` dentro de cada uma das ~25 páginas.
 * Essa tabela evita espalhar a mesma chamada por 25 arquivos (e evita que
 * uma tela nova nasça sem título), ao custo de precisar de uma linha aqui
 * quando uma rota é criada. O fallback no fim cobre o esquecimento.
 *
 * As chaves são padrões de rota do react-router, não URLs — `:id` casa com
 * qualquer segmento.
 */

type MetaPorRota = Record<string, PageMeta>;

/** Área pública: indexável, description escrita para o resultado de busca. */
const PUBLICAS: MetaPorRota = {
  "/": {
    title: "Currículos e vagas para estudantes e egressos",
    description:
      "PRISMA é a plataforma institucional que conecta estudantes e egressos a empresas: cadastre seu currículo, encontre vagas e acompanhe suas candidaturas em um só lugar.",
  },
  "/login": {
    title: "Entrar",
    description:
      "Acesse sua conta PRISMA como estudante, empresa ou gestor para gerenciar currículos, vagas e candidaturas.",
  },
  "/cadastro": {
    title: "Criar conta",
    description:
      "Crie sua conta no PRISMA. Escolha o perfil de estudante/egresso para cadastrar seu currículo, ou de empresa para publicar vagas.",
  },
  "/cadastro/estudante": {
    title: "Cadastro de estudante",
    description:
      "Cadastre-se como estudante ou egresso no PRISMA e monte seu currículo para se candidatar às vagas publicadas pelas empresas parceiras.",
  },
  "/cadastro/empresa": {
    title: "Cadastro de empresa",
    description:
      "Cadastre sua empresa no PRISMA para publicar vagas e receber currículos de estudantes e egressos da instituição.",
  },
};

/**
 * Fluxos por e-mail/código. Ficam FORA de busca: a URL carrega (ou espera)
 * um código de uso único, e uma dessas páginas em cache de resultado de
 * busca não ajuda ninguém — só expõe o fluxo.
 */
const FLUXOS_SENSIVEIS: MetaPorRota = {
  "/esqueci-senha": {
    title: "Recuperar senha",
    description: "Receba um código por e-mail para redefinir sua senha do PRISMA.",
    noindex: true,
  },
  "/redefinir-senha": {
    title: "Redefinir senha",
    noindex: true,
  },
  "/alterar-senha": {
    title: "Alterar senha",
    noindex: true,
  },
  "/confirmar-cadastro": {
    title: "Confirmar cadastro",
    noindex: true,
  },
};

/**
 * Área logada. Tudo `noindex`: são telas atrás de autenticação e com dado
 * pessoal (CPF, endereço, currículo). Aqui o título serve para a ABA do
 * navegador — o gestor abre vários currículos em paralelo e precisa
 * distinguir as abas.
 */
const AUTENTICADAS: MetaPorRota = {
  "/dashboard/aluno": { title: "Início — Aluno", noindex: true },
  "/dashboard/aluno/curriculo": { title: "Meu currículo", noindex: true },
  "/dashboard/aluno/curriculo/view": { title: "Visualizar currículo", noindex: true },
  "/dashboard/aluno/vagas": { title: "Vagas disponíveis", noindex: true },
  "/dashboard/aluno/vagas/:id": { title: "Detalhes da vaga", noindex: true },
  "/dashboard/aluno/candidaturas": { title: "Minhas candidaturas", noindex: true },

  "/dashboard/gestor": { title: "Início — Gestor", noindex: true },
  "/dashboard/gestor/vagas": { title: "Vagas — Gestor", noindex: true },
  "/dashboard/gestor/vagas/:id": { title: "Detalhes da vaga — Gestor", noindex: true },
  "/dashboard/gestor/curriculos": { title: "Currículos", noindex: true },
  "/dashboard/gestor/curriculo/:id": { title: "Currículo do aluno", noindex: true },
  "/dashboard/gestor/curriculos/:id/preview": { title: "Prévia do currículo", noindex: true },
  "/dashboard/gestor/relatorios": { title: "Relatórios", noindex: true },

  "/dashboard/empresa": { title: "Início — Empresa", noindex: true },
  "/dashboard/empresa/vagas": { title: "Minhas vagas", noindex: true },
  "/dashboard/empresa/vagas/nova": { title: "Publicar vaga", noindex: true },
  "/dashboard/empresa/vagas/:id": { title: "Detalhes da vaga", noindex: true },
  "/dashboard/empresa/vagas/:id/candidatos": { title: "Candidatos da vaga", noindex: true },
  "/dashboard/empresa/vagas/:jobId/candidatos/:appId": {
    title: "Perfil do candidato",
    noindex: true,
  },
  "/dashboard/empresa/vagas/editar/:id": { title: "Editar vaga", noindex: true },
  "/dashboard/empresa/perfil": { title: "Perfil da empresa", noindex: true },
};

export const META_POR_ROTA: MetaPorRota = {
  ...PUBLICAS,
  ...FLUXOS_SENSIVEIS,
  ...AUTENTICADAS,
};

/**
 * Usado quando o pathname não casa com nenhuma entrada acima.
 *
 * Na prática isso é a 404: a rota curinga (`path="*"`) do AppRoutes é a
 * única que renderiza um pathname fora desta tabela. Uma rota nova que
 * alguém esqueceu de cadastrar aqui também cai neste caso — e o padrão
 * `noindex` é deliberado: é mais seguro deixar de indexar uma tela nova
 * do que indexar por acidente uma tela interna com dado de aluno.
 *
 * A página `NotFound` NÃO chama `usePageMeta` por conta própria justamente
 * para não haver dois efeitos disputando o `document.title`.
 */
export const META_PADRAO: PageMeta = {
  title: "Página não encontrada",
  description:
    "O endereço acessado não existe no PRISMA. Volte para a página inicial ou entre na sua conta.",
  noindex: true,
};
