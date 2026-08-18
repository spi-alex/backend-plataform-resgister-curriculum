import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Download,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import api from "../../../../../services/api";
import type { ParsedResume } from "../../../../../utils/resume";
import { parseResume, downloadResumePdf } from "../../../../../utils/resume";
import "./ManagerCurriculumView.css";

export default function ManagerCurriculumView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [curriculum, setCurriculum] = useState<ParsedResume | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchResume() {
      try {
        setLoading(true);
        const response = await api.get(`/resumes/${id}/`);
        setCurriculum(parseResume(response.data));
      } catch (error) {
        console.error("Erro ao buscar currículo:", error);
        setCurriculum(null);
      } finally {
        setLoading(false);
      }
    }

    fetchResume();
  }, [id]);

  async function handleDownload() {
    if (!curriculum) return;
    try {
      await downloadResumePdf(curriculum.id, `curriculo_${curriculum.fullName || "aluno"}.pdf`);
    } catch {
      alert("Não foi possível baixar o PDF.");
    }
  }

  if (loading) {
    return (
      <main className="cv-container">
        <p>Carregando currículo...</p>
      </main>
    );
  }

  if (!curriculum) {
    return (
      <main className="cv-container">
        <p>Currículo não encontrado.</p>
        <button onClick={() => navigate("/dashboard/gestor/curriculos")}>
          Voltar
        </button>
      </main>
    );
  }

  return (
    <main className="cv-container">
      {/* HEADER */}
      <div className="cv-header">
        <button
          className="cv-back"
          onClick={() => navigate("/dashboard/gestor/curriculos")}
        >
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="cv-actions">
          <button className="cv-btn-outline" onClick={handleDownload}>
            <Download size={16} />
            Baixar PDF
          </button>

          {curriculum.email && (
            <a className="cv-btn-primary" href={`mailto:${curriculum.email}`}>
              <Mail size={16} />
              Entrar em Contato
            </a>
          )}
        </div>
      </div>

      {/* PROFILE CARD */}
      <section className="cv-profile-card">
        <div className="cv-profile-left">
          <div className="cv-photo">
            {curriculum.photo ? (
              <img
                src={curriculum.photo}
                alt="Foto de perfil"
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <User size={48} />
            )}
          </div>

          <div>
            <h2>{curriculum.fullName || curriculum.username || "Nome não informado"}</h2>
            <p className="cv-course">{curriculum.curso || curriculum.area || "Curso não informado"}</p>

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
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <div className="cv-grid">
        {/* LEFT */}
        <div className="cv-main">
          {/* Formação */}
          <section className="cv-card">
            <h3>Formação</h3>
            {curriculum.education && curriculum.education.length > 0 ? (
              curriculum.education.map((edu, index) => (
                <div key={index} style={{ marginBottom: "12px" }}>
                  <p><strong>{edu.course}</strong></p>
                  <p>{edu.institution}</p>
                  {edu.description && <p className="cv-description">{edu.description}</p>}
                </div>
              ))
            ) : (
              <p className="cv-empty">Nenhuma formação acadêmica informada.</p>
            )}
          </section>

          {/* Experiências */}
          <section className="cv-card">
            <h3>Experiências</h3>
            {curriculum.experiences && curriculum.experiences.length > 0 ? (
              curriculum.experiences.map((exp, index) => (
                <div key={index} className="cv-timeline-item">
                  <h4>{exp.role}</h4>
                  <span className="cv-period">{exp.period}</span>
                  <p>{exp.company}</p>
                  {exp.description && <p className="cv-description">{exp.description}</p>}
                </div>
              ))
            ) : (
              <p className="cv-empty">Nenhuma experiência cadastrada.</p>
            )}
          </section>

          {/* Projetos Acadêmicos */}
          <section className="cv-card">
            <h3>Projetos Acadêmicos</h3>
            {curriculum.projects && curriculum.projects.length > 0 ? (
              curriculum.projects.map((project, index) => (
                <div key={index} className="cv-project-item">
                  <h4>{project.title}</h4>
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

        {/* RIGHT */}
        <div className="cv-side">
          <section className="cv-card">
            <h4>Habilidades</h4>
            <p className="cv-description" style={{ whiteSpace: "pre-line" }}>
              {curriculum.skills || "Nenhuma habilidade listada."}
            </p>
          </section>

          <section className="cv-card">
            <h4>Idiomas</h4>
            <p className="cv-description" style={{ whiteSpace: "pre-line" }}>
              {curriculum.languages || "Nenhum idioma listado."}
            </p>
          </section>

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
