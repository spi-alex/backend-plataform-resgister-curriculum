import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../../../../services/api";
import type { ParsedResume } from "../../../../../utils/resume";
import { parseResume, downloadResumePdf } from "../../../../../utils/resume";
import "./CurriculumPrevie.css"

export default function CurriculumPreview() {
  const { id } = useParams();
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
    return <div className="preview-error">Carregando currículo...</div>;
  }

  if (!curriculum) {
    return (
      <div className="preview-error">
        Currículo não encontrado.
      </div>
    );
  }

  return (
    <div className="preview-container">

      {/* Botão baixar */}
      <div className="preview-actions">
        <button
          onClick={handleDownload}
          className="btn-download"
        >
          Baixar PDF
        </button>
      </div>

      {/* Página A4 */}
      <main className="a4-page">

        {/* Header */}
        <header className="header">
          <h1>{curriculum.fullName || curriculum.username}</h1>
          <p className="city">{curriculum.location}</p>

          <div className="contact-info">
            <p><strong>Email:</strong> {curriculum.email}</p>
            <p><strong>Telefone:</strong> {curriculum.phone}</p>
            <p><strong>Área:</strong> {curriculum.area}</p>
          </div>
        </header>

        {/* Formação Acadêmica */}
        <section className="section">
          <h2>Formação Acadêmica</h2>

          {curriculum.education && curriculum.education.length > 0 ? (
            curriculum.education.map((edu, index) => (
              <div key={index} className="block">
                <p className="title">{edu.course}</p>
                <p>{edu.institution}</p>
                {edu.description && <p className="description">{edu.description}</p>}
              </div>
            ))
          ) : (
            <p className="description">Nenhuma formação informada.</p>
          )}
        </section>

        {/* Experiência */}
        <section className="section">
          <h2>Experiência Profissional</h2>

          {curriculum.experiences && curriculum.experiences.length > 0 ? (
            curriculum.experiences.map((exp, index) => (
              <div key={index} className="block">
                <p className="title">
                  {exp.role} — {exp.company}
                </p>
                <p className="period">{exp.period}</p>
                {exp.description && <p className="description">{exp.description}</p>}
              </div>
            ))
          ) : (
            <p className="description">Nenhuma experiência cadastrada.</p>
          )}
        </section>

        {/* Projetos */}
        {curriculum.projects && curriculum.projects.length > 0 && (
          <section className="section">
            <h2>Projetos Acadêmicos</h2>

            {curriculum.projects.map((project, index) => (
              <div key={index} className="block">
                <p className="title">{project.title}</p>
                {project.description && <p className="description">{project.description}</p>}
              </div>
            ))}
          </section>
        )}

        {/* Habilidades */}
        <section className="section">
          <h2>Habilidades</h2>
          <p className="description" style={{ whiteSpace: "pre-line" }}>
            {curriculum.skills || "Nenhuma habilidade listada."}
          </p>
        </section>

        {/* Cursos */}
        <section className="section">
          <h2>Cursos Complementares</h2>
          <p className="description" style={{ whiteSpace: "pre-line" }}>
            {curriculum.courses || "Nenhum curso complementar listado."}
          </p>
        </section>

        {/* Idiomas */}
        <section className="section">
          <h2>Idiomas</h2>
          <p className="description" style={{ whiteSpace: "pre-line" }}>
            {curriculum.languages || "Nenhum idioma listado."}
          </p>
        </section>

        {/* Rodapé */}
        <footer className="footer">
          Documento gerado eletronicamente pelo Sistema PRISMA
        </footer>

      </main>
    </div>
  );
}
