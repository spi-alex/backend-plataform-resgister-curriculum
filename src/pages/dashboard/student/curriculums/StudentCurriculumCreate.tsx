import { useState } from "react";
import "./StudentCurriculumCreate.css";

export default function StudentCurriculumCreate() {
  const [formData, setFormData] = useState({
    fullName: "",
    location: "",
    area: "",
    email: "",
    phone: "",
    photo: null,

    education: [
      {
        course: "",
        institution: "",
        description: ""
      }
    ],

    experiences: [
      {
        role: "",
        company: "",
        period: "",
        description: ""
      }
    ],

    projects: [
      {
        title: "",
        startYear: "",
        endYear: "",
        institution: "",
        advisor: "",
        description: ""
      }
    ],

    skills: "",
    courses: "",
    languages: ""
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData({ ...formData, photo: imageUrl });
    }
  }

  // ---------- EXPERIÊNCIAS ----------
  function addExperience() {
    setFormData({
      ...formData,
      experiences: [
        ...formData.experiences,
        { role: "", company: "", period: "", description: "" }
      ]
    });
  }

  function removeExperience(index) {
    const updated = formData.experiences.filter((_, i) => i !== index);
    setFormData({ ...formData, experiences: updated });
  }

  function handleExperienceChange(index, e) {
    const { name, value } = e.target;
    const updated = [...formData.experiences];
    updated[index][name] = value;
    setFormData({ ...formData, experiences: updated });
  }

  // ---------- PROJETOS ----------
  function addProject() {
    setFormData({
      ...formData,
      projects: [
        ...formData.projects,
        {
          title: "",
          startYear: "",
          endYear: "",
          institution: "",
          advisor: "",
          description: ""
        }
      ]
    });
  }

  function removeProject(index) {
    const updated = formData.projects.filter((_, i) => i !== index);
    setFormData({ ...formData, projects: updated });
  }

  function handleProjectChange(index, e) {
    const { name, value } = e.target;
    const updated = [...formData.projects];
    updated[index][name] = value;
    setFormData({ ...formData, projects: updated });
  }

  // ---------- FORMAÇÃO ----------
  function addEducation() {
    setFormData({
      ...formData,
      education: [
        ...formData.education,
        { course: "", institution: "", description: "" }
      ]
    });
  }

  function removeEducation(index) {
    const updated = formData.education.filter((_, i) => i !== index);
    setFormData({ ...formData, education: updated });
  }

  function handleEducationChange(index, e) {
    const { name, value } = e.target;
    const updated = [...formData.education];
    updated[index][name] = value;
    setFormData({ ...formData, education: updated });
  }

  return (
    <div className="student-curriculum">
      <header className="page-header">
        <h2>Criar Currículo</h2>
      </header>

      {/* FOTO */}
      <section className="card">
        <h3>Foto</h3>
        <input type="file" accept="image/*" onChange={handlePhotoUpload} />
        {formData.photo && (
          <div className="photo-preview">
            <img src={formData.photo} alt="Preview" />
          </div>
        )}
      </section>

      {/* INFORMAÇÕES PESSOAIS */}
      <section className="card">
        <h3>Informações Pessoais</h3>
        <input name="fullName" placeholder="Nome completo" onChange={handleChange} />
        <input name="location" placeholder="Cidade / Estado" onChange={handleChange} />
        <input name="area" placeholder="Área de atuação" onChange={handleChange} />
        <input name="email" type="email" placeholder="Email" onChange={handleChange} />
        <input name="phone" placeholder="Telefone" onChange={handleChange} />
      </section>

      {/* FORMAÇÃO */}
      <section className="card">
        <h3>Formação Acadêmica</h3>
        {formData.education.map((edu, index) => (
          <div key={index} className="box-card">
            <input name="course" placeholder="Curso" onChange={(e) => handleEducationChange(index, e)} />
            <input name="institution" placeholder="Instituição" onChange={(e) => handleEducationChange(index, e)} />
            <textarea name="description" placeholder="Descrição" onChange={(e) => handleEducationChange(index, e)} />
            {formData.education.length > 1 && (
              <button type="button" onClick={() => removeEducation(index)} className="remove-btn">
                Remover
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addEducation} className="add-btn">
          + Adicionar Formação
        </button>
      </section>

      {/* EXPERIÊNCIA */}
      <section className="card">
        <h3>Experiência Profissional</h3>
        {formData.experiences.map((exp, index) => (
          <div key={index} className="box-card">
            <input name="role" placeholder="Cargo" onChange={(e) => handleExperienceChange(index, e)} />
            <input name="company" placeholder="Empresa" onChange={(e) => handleExperienceChange(index, e)} />
            <input name="period" placeholder="Período" onChange={(e) => handleExperienceChange(index, e)} />
            <textarea name="description" placeholder="Descrição" onChange={(e) => handleExperienceChange(index, e)} />
            {formData.experiences.length > 1 && (
              <button type="button" onClick={() => removeExperience(index)} className="remove-btn">
                Remover
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addExperience} className="add-btn">
          + Adicionar Experiência
        </button>
      </section>

      {/* PROJETOS */}
      <section className="card">
        <h3>Projetos</h3>
        {formData.projects.map((project, index) => (
          <div key={index} className="box-card">
            <input name="title" placeholder="Nome do Projeto" onChange={(e) => handleProjectChange(index, e)} />
            <input name="startYear" placeholder="Ano Início" onChange={(e) => handleProjectChange(index, e)} />
            <input name="endYear" placeholder="Ano Conclusão" onChange={(e) => handleProjectChange(index, e)} />
            <input name="institution" placeholder="Instituição" onChange={(e) => handleProjectChange(index, e)} />
            <input name="advisor" placeholder="Orientador" onChange={(e) => handleProjectChange(index, e)} />
            <textarea name="description" placeholder="Descrição" onChange={(e) => handleProjectChange(index, e)} />
            {formData.projects.length > 1 && (
              <button type="button" onClick={() => removeProject(index)} className="remove-btn">
                Remover
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addProject} className="add-btn">
          + Adicionar Projeto
        </button>
      </section>

      {/* CAMPOS SIMPLES */}
      <section className="card">
        <h3>Habilidades</h3>
        <textarea name="skills" onChange={handleChange} />
      </section>

      <section className="card">
        <h3>Cursos Complementares</h3>
        <textarea name="courses" onChange={handleChange} />
      </section>

      <section className="card">
        <h3>Idiomas</h3>
        <textarea name="languages" onChange={handleChange} />
      </section>

      <div className="footer-action">
        <button className="save-btn">Salvar Currículo</button>
      </div>
    </div>
  );
}
