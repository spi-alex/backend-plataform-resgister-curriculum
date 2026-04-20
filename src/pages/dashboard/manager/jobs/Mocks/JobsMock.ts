export interface Job {
  id: string;
  titulo: string;
  empresa: string;
  descricao: string;
  nivel: string;
  area: string;
  local: string;
  tipoContrato: string;
  salario?: string;
  status: "aberta" | "encerrada";
  candidatos: number;
  dataPublicacao: string;
}

export const jobsMock: Job[] = [
  {
    id: "1",
    titulo: "Desenvolvedor Full Stack",
    empresa: "Tech Solutions",
    descricao: "Atuar no desenvolvimento de sistemas web.",
    nivel: "Graduação",
    area: "Tecnologia",
    local: "Teresina",
    tipoContrato: "CLT",
    salario: "R$ 4.000 - R$ 6.000",
    status: "aberta",
    candidatos: 32,
    dataPublicacao: "2026-02-10",
  },
  {
    id: "2",
    titulo: "Assistente Administrativo",
    empresa: "Admin Corp",
    descricao: "Organização de documentos e apoio administrativo.",
    nivel: "Técnico",
    area: "Administração",
    local: "Timon",
    tipoContrato: "Estágio",
    status: "encerrada",
    candidatos: 18,
    dataPublicacao: "2026-01-25",
  },
];
