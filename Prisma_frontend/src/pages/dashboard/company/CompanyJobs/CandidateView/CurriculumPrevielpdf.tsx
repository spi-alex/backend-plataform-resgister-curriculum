import { useParams } from "react-router-dom";
import { mockCurriculums } from "../../../manager/Curriculums/Mocks/mockCurriculums";



export default function CurriculumPreviewCompany() {
  const { id } = useParams();


  const curriculum = mockCurriculums.find(
    (c) => String(c.id) === String(id)
  );


  function handleDownload() {
    if (!id) return;


    // Chamada para backend (quando existir)
    // Exemplo padrão:
    window.open(`/api/curriculums/${id}/download`, "_blank");


    /*
    Alternativa com fetch:


    fetch(`/api/curriculums/${id}/download`)
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "curriculo.pdf";
        a.click();
        window.URL.revokeObjectURL(url);
      });
    */
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


      <div className="preview-actions">
        <button
          onClick={handleDownload}
          className="btn-download"
        >
          Baixar PDF
        </button>
      </div>


      <main className="a4-page">


        <header className="header">
          <h1>{curriculum.name}</h1>
          <p className="city">{curriculum.city}</p>


          <div className="contact-info">
            <p><strong>Email:</strong> {curriculum.email}</p>
            <p><strong>Telefone:</strong> {curriculum.phone}</p>
            <p><strong>Área:</strong> {curriculum.area}</p>
          </div>
        </header>


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


        <section className="section">
          <h2>Habilidades</h2>
          <ul>
            {curriculum.skills.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>
        </section>


        <section className="section">
          <h2>Cursos Complementares</h2>
          <ul>
            {curriculum.extraCourses.map((course, index) => (
              <li key={index}>{course}</li>
            ))}
          </ul>
        </section>


        <section className="section">
          <h2>Idiomas</h2>
          <ul>
            {curriculum.languages.map((language, index) => (
              <li key={index}>{language}</li>
            ))}
          </ul>
        </section>


        <footer className="footer">
          Documento gerado eletronicamente pelo Sistema PRISMA
        </footer>


      </main>
    </div>
  );
}
