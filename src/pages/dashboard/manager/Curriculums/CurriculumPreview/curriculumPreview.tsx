import { useParams } from "react-router-dom";
import { mockCurriculums } from "../Mocks/mockCurriculums";
import "./CurriculumPrevie.css"

export default function CurriculumPreview() {
  const { id } = useParams();

  const curriculum = mockCurriculums.find(
    (c) => c.id === Number(id)
  );

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
          onClick={() => window.print()}
          className="btn-download"
        >
          Baixar PDF
        </button>
      </div>

      {/* Página A4 */}
      <main className="a4-page">

        {/* Header */}
        <header className="header">
          <h1>{curriculum.name}</h1>
          <p className="city">{curriculum.city}</p>

          <div className="contact-info">
            <p><strong>Email:</strong> {curriculum.email}</p>
            <p><strong>Telefone:</strong> {curriculum.phone}</p>
            <p><strong>Área:</strong> {curriculum.area}</p>
          </div>
        </header>

        {/* Formação Acadêmica */}
        <section className="section">
          <h2>Formação Acadêmica</h2>

          <p className="title">
            {curriculum.education.course}
          </p>
          <p>{curriculum.education.institution}</p>
          <p className="description">
            {curriculum.education.description}
          </p>
        </section>

        {/* Experiência */}
        <section className="section">
          <h2>Experiência Profissional</h2>

          {curriculum.experiences.map((exp, index) => (
            <div key={index} className="block">
              <p className="title">
                {exp.role} — {exp.company}
              </p>
              <p className="period">{exp.period}</p>
              <p className="description">
                {exp.description}
              </p>
            </div>
          ))}
        </section>

        {/* Projetos */}
        {curriculum.projects.length > 0 && (
          <section className="section">
            <h2>Projetos Acadêmicos</h2>

            {curriculum.projects.map((project, index) => (
              <div key={index} className="block">
                <p className="title">{project.title}</p>
                <p className="description">
                  {project.description}
                </p>
                <p className="period">
                  <strong>Tecnologias:</strong> {project.technologies}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* Habilidades */}
        <section className="section">
          <h2>Habilidades</h2>
          <ul>
            {curriculum.skills.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>
        </section>

        {/* Cursos */}
        <section className="section">
          <h2>Cursos Complementares</h2>
          <ul>
            {curriculum.extraCourses.map((course, index) => (
              <li key={index}>{course}</li>
            ))}
          </ul>
        </section>

        {/* Idiomas */}
        <section className="section">
          <h2>Idiomas</h2>
          <ul>
            {curriculum.languages.map((language, index) => (
              <li key={index}>{language}</li>
            ))}
          </ul>
        </section>

        {/* Rodapé */}
        <footer className="footer">
          Documento gerado eletronicamente pelo Sistema PRISMA
        </footer>

      </main>
    </div>
  );
}
