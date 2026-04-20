import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Download,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import { mockCurriculums } from "../Mocks/mockCurriculums";
import "./ManagerCurriculumView.css";

export default function ManagerCurriculumView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const curriculum = mockCurriculums.find(
    (cv) => String(cv.id) === String(id)
  );

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
          <button
            className="cv-btn-outline"
            onClick={() =>
              navigate(
                `/dashboard/gestor/curriculos/${curriculum.id}/preview`
              )
            }
          >
            <Download size={16} />
            Baixar PDF
          </button>

          <button className="cv-btn-primary">
            <Mail size={16} />
            Entrar em Contato
          </button>
        </div>
      </div>

      {/* PROFILE CARD */}
      <section className="cv-profile-card">
        <div className="cv-profile-left">
          <div className="cv-photo">
            <User size={48} />
          </div>

          <div>
            <h2>{curriculum.name}</h2>
            <p className="cv-course">
              {curriculum.education.course}
            </p>

            <div className="cv-meta">
              <span>
                <MapPin size={14} />
                {curriculum.city}
              </span>

              <span>
                <Phone size={14} />
                {curriculum.phone}
              </span>
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
            <p>
              <strong>{curriculum.education.course}</strong>
            </p>
            <p>{curriculum.education.institution}</p>
            <p className="cv-description">
              {curriculum.education.description}
            </p>
          </section>

          {/* Experiências */}
          <section className="cv-card">
            <h3>Experiências</h3>

            {curriculum.experiences.map((exp, index) => (
              <div key={index} className="cv-timeline-item">
                <h4>{exp.role}</h4>
                <span className="cv-period">{exp.period}</span>
                <p>{exp.company}</p>
                <p className="cv-description">
                  {exp.description}
                </p>
              </div>
            ))}
          </section>

          {/* Projetos Acadêmicos */}
          <section className="cv-card">
            <h3>Projetos Acadêmicos</h3>

            {curriculum.projects && curriculum.projects.length > 0 ? (
              curriculum.projects.map((project, index) => (
                <div key={index} className="cv-project-item">
                  <h4>{project.title}</h4>

                  {project.technologies && (
                    <span className="cv-project-tech">
                      {project.technologies}
                    </span>
                  )}

                  {project.description && (
                    <p className="cv-description">
                      {project.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="cv-empty">
                Nenhum projeto acadêmico cadastrado.
              </p>
            )}
          </section>
        </div>

        {/* RIGHT */}
        <div className="cv-side">
          {/* Habilidades */}
          <section className="cv-card">
            <h4>Habilidades</h4>
            <ul className="cv-tag-list">
              {curriculum.skills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))}
            </ul>
          </section>

          {/* Idiomas */}
          <section className="cv-card">
            <h4>Idiomas</h4>
            <ul className="cv-tag-list">
              {curriculum.languages.map((lang, index) => (
                <li key={index}>{lang}</li>
              ))}
            </ul>
          </section>

          {/* Cursos Extras */}
          <section className="cv-card">
            <h4>Cursos Extras</h4>
            <ul className="cv-list">
              {curriculum.extraCourses.map((course, index) => (
                <li key={index}>{course}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
