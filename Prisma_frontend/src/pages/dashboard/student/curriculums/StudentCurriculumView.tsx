import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Download,
  MapPin,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import api from "../../../../services/api";
import { downloadResumePdf } from "../../../../utils/resume";
import "../../../../styles/curriculumView.css";

interface Education {
  course: string;
  institution: string;
  description: string;
}

interface Experience {
  role: string;
  company: string;
  period: string;
  description: string;
}

interface Project {
  title: string;
  startYear: string;
  endYear: string;
  institution: string;
  advisor: string;
  description: string;
}

interface RealCurriculumData {
  dbId: number; // ID do registro no banco para o PDF
  fullName: string;
  location: string;
  area: string;
  email: string;
  phone: string;
  photo: string | null;
  education: Education[];
  experiences: Experience[];
  projects: Project[];
  skills: string;
  courses: string;
  languages: string;
}

export default function StudentCurriculumView() {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState<RealCurriculumData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRealCurriculum() {
      // Authorization sai do interceptor de `api` (services/api.ts).
      try {
        const response = await api.get("/resumes/");

        if (response.data && response.data.length > 0) {
          const firstResume = response.data[0];
          // Converte o campo 'content' (string JSON do Django) de volta para objeto
          const parsedContent = JSON.parse(firstResume.content);

          setCurriculum({
            ...parsedContent,
            dbId: firstResume.id, // Guarda o ID do banco
          });
        }
      } catch (error) {
        console.error("Erro ao buscar currículo real do Django:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRealCurriculum();
  }, []);

  // Reaproveita `downloadResumePdf` (utils/resume.ts), que é o mesmo
  // download usado pelo gestor e pela empresa. A cópia manual que existia
  // aqui repetia blob/anchor/revokeObjectURL linha por linha.
  async function handleDownloadPDF() {
    if (!curriculum?.dbId) return;

    try {
      await downloadResumePdf(
        curriculum.dbId,
        `curriculo_${curriculum.fullName || "aluno"}.pdf`,
      );
    } catch (error) {
      console.error("Erro ao baixar o PDF:", error);
      alert("Erro ao gerar/baixar o PDF do servidor.");
    }
  }

  if (loading) {
    return (
      <main className="cv-container">
        <div className="cv-state">
          {/* `animate-spin` é do Tailwind, que este projeto não usa: o ícone
              ficava parado. `cv-spinner` traz os keyframes de verdade. */}
          <Loader2 className="cv-spinner" size={32} />
          <p>Carregando seu currículo...</p>
        </div>
      </main>
    );
  }

  if (!curriculum) {
    return (
      <main className="cv-container">
        <div className="cv-state">
          <p>Você ainda não possui um currículo cadastrado no sistema.</p>
          <button
            className="cv-btn-primary"
            onClick={() => navigate("/dashboard/aluno/curriculo")}
          >
            Criar meu currículo
          </button>
          <button
            className="cv-back"
            onClick={() => navigate("/dashboard/aluno")}
          >
            <ArrowLeft size={18} />
            Voltar para o Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="cv-container">
      <div className="cv-header">
        <button
          className="cv-back"
          onClick={() => navigate("/dashboard/aluno")}
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="cv-actions">
          <button className="cv-btn-outline" onClick={handleDownloadPDF}>
            <Download size={16} />
            Baixar PDF Real
          </button>
        </div>
      </div>

      {/* CARD DE PERFIL PRINCIPAL */}
      <section className="cv-profile-card">
        <div className="cv-profile-left">
          <div className="cv-photo">
            {curriculum.photo ? (
              <img src={curriculum.photo} alt="Foto de perfil" />
            ) : (
              <User size={48} />
            )}
          </div>

          <div>
            <h2>{curriculum.fullName || "Nome não informado"}</h2>
            <p className="cv-course">
              {curriculum.area || "Área de atuação não informada"}
            </p>

            <div className="cv-meta">
              {curriculum.location && (
                <span>
                  <MapPin size={14} />
                  {curriculum.location}
                </span>
              )}

              {curriculum.phone && (
                <span>
                  <Phone size={14} />
                  {curriculum.phone}
                </span>
              )}

              {curriculum.email && (
                <span>
                  <Mail size={14} />
                  {curriculum.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CORPO DO CURRÍCULO */}
      <div className="cv-grid">
        <div className="cv-main">
          {/* FORMAÇÃO ACADÊMICA */}
          <section className="cv-card">
            <h3>Formação</h3>
            {curriculum.education && curriculum.education.length > 0 ? (
              curriculum.education.map((edu, index) => (
                <div key={index} className="cv-timeline-item">
                  <h4>{edu.course}</h4>
                  <p>
                    <strong>{edu.institution}</strong>
                  </p>
                  {edu.description && (
                    <p className="cv-description">{edu.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="cv-empty">Nenhuma formação acadêmica informada.</p>
            )}
          </section>

          {/* EXPERIÊNCIAS PROFISSIONAIS */}
          <section className="cv-card">
            <h3>Experiências</h3>
            {curriculum.experiences && curriculum.experiences.length > 0 ? (
              curriculum.experiences.map((exp, index) => (
                <div key={index} className="cv-timeline-item">
                  <h4>{exp.role}</h4>
                  <span className="cv-period">{exp.period}</span>
                  <p>
                    <strong>{exp.company}</strong>
                  </p>
                  {exp.description && (
                    <p className="cv-description">{exp.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="cv-empty">Nenhuma experiência cadastrada.</p>
            )}
          </section>

          {/* PROJETOS ACADÊMICOS */}
          <section className="cv-card">
            <h3>Projetos Acadêmicos</h3>
            {curriculum.projects && curriculum.projects.length > 0 ? (
              curriculum.projects.map((project, index) => (
                <div key={index} className="cv-project-item">
                  <h4>{project.title}</h4>
                  <span className="cv-period">
                    {project.startYear} - {project.endYear || "Atual"}
                  </span>
                  <p>
                    <strong>Instituição:</strong> {project.institution}
                  </p>
                  {project.advisor && (
                    <p>
                      <strong>Orientador:</strong> {project.advisor}
                    </p>
                  )}
                  {project.description && (
                    <p className="cv-description">{project.description}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="cv-empty">Nenhum projeto acadêmico cadastrado.</p>
            )}
          </section>
        </div>

        {/* COLUNA LATERAL (SIDEBAR DO CURRÍCULO) */}
        <div className="cv-side">
          {/* HABILIDADES (Tratando como string separada por vírgula ou quebras de linha) */}
          <section className="cv-card">
            <h4>Habilidades</h4>
            <p className="cv-description" style={{ whiteSpace: "pre-line" }}>
              {curriculum.skills || "Nenhuma habilidade listada."}
            </p>
          </section>

          {/* IDIOMAS */}
          <section className="cv-card">
            <h4>Idiomas</h4>
            <p className="cv-description" style={{ whiteSpace: "pre-line" }}>
              {curriculum.languages || "Nenhum idioma listado."}
            </p>
          </section>

          {/* CURSOS EXTRAS */}
          <section className="cv-card">
            <h4>Cursos Extras</h4>
            <p className="cv-description" style={{ whiteSpace: "pre-line" }}>
              {curriculum.courses || "Nenhum curso extra listado."}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
