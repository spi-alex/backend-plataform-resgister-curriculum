// =======================
// NOMES
// =======================
export const names = [
  "Ana Paula Ribeiro",
  "Carlos Henrique Silva",
  "Lucas Almeida",
  "Marcos Vinícius Rocha",
  "João Pedro Nascimento",
  "Rafael Mendes",
  "Diego Santos",
  "Felipe Aragão",
  "Bruno Ferreira",
  "Renata Oliveira",
  "Camila Torres",
  "Juliana Costa",
  "Patrícia Azevedo",
  "Fernanda Lopes",
  "Beatriz Farias",
  "Eduardo Pacheco",
  "André Luiz Martins",
  "Gustavo Barros",
  "Thiago Moreira",
  "Rodrigo Nunes",
  "Paulo Nogueira",
  "Matheus Rangel",
  "Victor Hugo Lima",
  "Igor Teixeira",
  "Caio Freitas",
  "Leandro Batista",
  "Sérgio Cardoso",
  "Alexandre Falcão",
  "Daniel Guimarães",
  "Vinícius Moraes",
  "Aline Rocha",
  "Natália Pimentel",
  "Larissa Menezes",
  "Priscila Fontes",
  "Tatiane Reis",
  "Vanessa Queiroz",
  "Bianca Duarte",
  "Sabrina Neves",
  "Letícia Amaral",
  "Caroline Pinheiro"
];

// =======================
// ÁREAS
// =======================
export const areas = [
  "Administração",
  "Tecnologia",
  "Edificações",
  "Mecânica",
  "Eletroeletrônica",
  "Logística",
  "Segurança do Trabalho",
  "Energias Renováveis"
];

// =======================
// CURSOS POR ÁREA
// =======================
export const coursesByArea: Record<string, string[]> = {
  Administração: [
    "Administração",
    "Gestão Financeira",
    "Gestão de Recursos Humanos",
    "Gestão Pública",
    "Processos Gerenciais"
  ],
  Tecnologia: [
    "Engenharia de Software",
    "Ciência da Computação",
    "Análise e Desenvolvimento de Sistemas",
    "Sistemas de Informação",
    "Redes de Computadores",
    "Tecnologia da Informação"
  ],
  Edificações: [
    "Técnico em Edificações",
    "Construção Civil",
    "Tecnologia em Edificações"
  ],
  Mecânica: [
    "Técnico em Mecânica",
    "Engenharia Mecânica",
    "Manutenção Industrial"
  ],
  Eletroeletrônica: [
    "Técnico em Eletroeletrônica",
    "Engenharia Elétrica",
    "Automação Industrial"
  ],
  Logística: [
    "Logística",
    "Gestão de Logística",
    "Logística Empresarial"
  ],
  "Segurança do Trabalho": [
    "Técnico em Segurança do Trabalho",
    "Gestão em Segurança do Trabalho"
  ],
  "Energias Renováveis": [
    "Energias Renováveis",
    "Sistemas Fotovoltaicos",
    "Tecnologia em Energias Renováveis"
  ]
};

// =======================
// INSTITUIÇÕES
// =======================
export const institutions = [
  "IFMA",
  "IFPI",
  "IFCE",
  "UFMA",
  "UFPI",
  "UEMA",
  "UNIVASF",
  "Faculdade Estácio",
  "Faculdade Pitágoras",
  "Centro Universitário UNINASSAU"
];

// =======================
// HABILIDADES POR ÁREA
// =======================
export const skillsByArea: Record<string, string[]> = {
  Administração: [
    "Gestão de Pessoas",
    "Planejamento Estratégico",
    "Organização",
    "Comunicação",
    "Pacote Office"
  ],
  Tecnologia: [
    "JavaScript",
    "TypeScript",
    "React",
    "Git",
    "Lógica de Programação",
    "Banco de Dados"
  ],
  Edificações: [
    "AutoCAD",
    "Leitura de Projetos",
    "Orçamento de Obras",
    "Topografia"
  ],
  Mecânica: [
    "Manutenção Preventiva",
    "Desenho Técnico",
    "Metrologia",
    "Soldagem"
  ],
  Eletroeletrônica: [
    "Automação",
    "CLP",
    "Instalações Elétricas",
    "Eletrônica Analógica"
  ],
  Logística: [
    "Controle de Estoque",
    "Gestão da Cadeia de Suprimentos",
    "Planejamento Logístico"
  ],
  "Segurança do Trabalho": [
    "Normas Regulamentadoras",
    "Análise de Riscos",
    "Prevenção de Acidentes"
  ],
  "Energias Renováveis": [
    "Instalação Fotovoltaica",
    "Eficiência Energética",
    "Sustentabilidade"
  ]
};

// =======================
// CIDADES
// =======================
export const cities = [
  "Timon - MA",
  "Caxias - MA",
  "Teresina - PI",
  "São Luís - MA",
  "Parnaíba - PI",
  "Imperatriz - MA",
  "Codó - MA",
  "Bacabal - MA",
  "Chapadinha - MA",
  "Floriano - PI",
  "Pedro II - PI",
  "Picos - PI",
  "Barreirinhas - MA",
  "Açailândia - MA"
];

// =======================
// DESCRIÇÕES DE FORMAÇÃO
// =======================
export const educationDescriptions = [
  "Formação com foco em fundamentos técnicos e aplicação prática na área.",
  "Curso voltado para o desenvolvimento de competências profissionais.",
  "Capacitação técnica direcionada para atuação no mercado de trabalho.",
  "Graduação com ênfase em projetos acadêmicos e atividades práticas.",
  "Formação orientada para resolução de problemas e crescimento profissional."
];

// =======================
// CURSOS EXTRAS
// =======================
export const extraCourses = [
  "Excel Básico",
  "Excel Avançado",
  "Introdução à Gestão de Projetos",
  "Fundamentos de Liderança",
  "Noções de Empreendedorismo",
  "Comunicação Empresarial",
  "Atendimento ao Cliente",
  "Metodologias Ágeis",
  "Noções de LGPD",
  "Planejamento Estratégico"
];

// =======================
// IDIOMAS
// =======================
export const languages = [
  "Português",
  "Inglês (Básico)",
  "Inglês (Intermediário)",
  "Espanhol (Básico)",
  "Espanhol (Intermediário)"
];

// =======================
// EXPERIÊNCIAS
// =======================
export const experiencesTemplates = [
  {
    company: "Empresa Júnior",
    role: "Auxiliar Administrativo",
    period: "2022 - 2023",
    description: "Apoio em rotinas administrativas e organização de processos."
  },
  {
    company: "Projeto Acadêmico",
    role: "Estagiário",
    period: "2023 - 2024",
    description: "Atuação em projetos práticos relacionados à área de formação."
  },
  {
    company: "Instituição de Ensino",
    role: "Bolsista",
    period: "2021 - 2022",
    description: "Participação em projetos institucionais e suporte técnico."
  },
  {
    company: "Empresa Parceira",
    role: "Assistente",
    period: "2020 - 2021",
    description: "Suporte a equipes internas e acompanhamento de demandas."
  }
];

// =======================
// PROJETOS ACADÊMICOS
// =======================
export const projectTemplates = [
  {
    title: "Sistema de Gestão Acadêmica",
    description:
      "Desenvolvimento de sistema web para gerenciamento de alunos e disciplinas.",
    technologies: "React, Node.js, MySQL"
  },
  {
    title: "Aplicativo de Controle Financeiro",
    description:
      "Aplicação mobile para organização de despesas pessoais.",
    technologies: "React Native, Firebase"
  },
  {
    title: "Projeto de Eficiência Energética",
    description:
      "Estudo e implementação de melhorias para redução de consumo energético.",
    technologies: "AutoCAD, Excel"
  },
  {
    title: "Plano de Negócios Empresarial",
    description:
      "Desenvolvimento de planejamento estratégico para empresa fictícia.",
    technologies: "Canvas, Excel"
  }
];

// =======================
// TELEFONES
// =======================
export const phonePrefixes = ["981", "982", "983", "984", "985", "986"];

export function generatePhone() {
  const prefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
  const mid = Math.floor(100 + Math.random() * 900);
  const end = Math.floor(1000 + Math.random() * 9000);

  return `(99) 9${prefix}-${mid}${end}`;
}
