import api from "../services/api";

// Formato do JSON livre salvo no campo `content` do currículo (preenchido
// pelo formulário do aluno em StudentCurriculumCreate.tsx).
export interface ResumeEducation {
  course: string;
  institution: string;
  description?: string;
}

export interface ResumeExperience {
  role: string;
  company: string;
  period: string;
  description?: string;
}

export interface ResumeProject {
  title: string;
  startYear?: string;
  endYear?: string;
  institution?: string;
  advisor?: string;
  description?: string;
}

export interface ParsedResumeContent {
  fullName?: string;
  location?: string;
  area?: string;
  email?: string;
  phone?: string;
  photo?: string | null;
  education?: ResumeEducation[];
  experiences?: ResumeExperience[];
  projects?: ResumeProject[];
  skills?: string;
  courses?: string;
  languages?: string;
}

// Registro cru retornado pelo backend (ResumeViewSet / gestor/resumes/)
export interface RawResume {
  id: number;
  user?: number;
  user__username?: string;
  user__email?: string;
  title: string;
  content: string;
  curso?: string | null;
  ano_ingresso?: number | null;
  ano_conclusao?: number | null;
  situacao?: string;
  created_at: string;
}

export interface ParsedResume extends ParsedResumeContent {
  id: number;
  username?: string;
  curso?: string | null;
  situacao?: string;
  created_at: string;
}

// O campo `content` vem como string JSON; se estiver corrompido/ausente,
// devolve um objeto vazio em vez de quebrar a tela.
export function parseResumeContent(content: string): ParsedResumeContent {
  try {
    return content ? JSON.parse(content) : {};
  } catch {
    return {};
  }
}

export function parseResume(raw: RawResume): ParsedResume {
  const parsed = parseResumeContent(raw.content);
  return {
    ...parsed,
    id: raw.id,
    username: raw.user__username,
    curso: raw.curso ?? undefined,
    situacao: raw.situacao,
    created_at: raw.created_at,
    email: parsed.email || raw.user__email,
  };
}

// Baixa o PDF real gerado pelo backend (WeasyPrint) e dispara o download
// no navegador. Usado tanto pelo aluno quanto pelo gestor/empresa.
export async function downloadResumePdf(resumeId: number, fileName: string) {
  const response = await api.get(`/pdf/export/${resumeId}/`, {
    responseType: "blob",
  });

  const pdfBlob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(pdfBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
