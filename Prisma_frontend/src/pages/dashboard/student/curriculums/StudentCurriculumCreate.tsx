import { useState, ChangeEvent } from "react";
import api from "../../../../services/api";
import "./StudentCurriculumCreate.css";

// Interfaces para o TypeScript
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

interface FormData {
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

export default function StudentCurriculumCreate() {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    location: "",
    area: "",
    email: "",
    phone: "",
    photo: null,
    education: [{ course: "", institution: "", description: "" }],
    experiences: [{ role: "", company: "", period: "", description: "" }],
    projects: [
      {
        title: "",
        startYear: "",
        endYear: "",
        institution: "",
        advisor: "",
        description: "",
      },
    ],
    skills: "",
    courses: "",
    languages: "",
  });

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setFormData({ ...formData, photo: imageUrl });
    }
  }

  // --- Funções Auxiliares de Adição/Remoção ---
  function addExperience() {
    setFormData({
      ...formData,
      experiences: [
        ...formData.experiences,
        { role: "", company: "", period: "", description: "" },
      ],
    });
  }
  function removeExperience(index: number) {
    setFormData({
      ...formData,
      experiences: formData.experiences.filter((_, i) => i !== index),
    });
  }
  function handleExperienceChange(
    index: number,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    const updated = [...formData.experiences];

    updated[index][name as keyof Experience] = value;
    setFormData({ ...formData, experiences: updated });
  }

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
          description: "",
        },
      ],
    });
  }
  function removeProject(index: number) {
    setFormData({
      ...formData,
      projects: formData.projects.filter((_, i) => i !== index),
    });
  }
  function handleProjectChange(
    index: number,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    const updated = [...formData.projects];

    updated[index][name as keyof Project] = value;
    setFormData({ ...formData, projects: updated });
  }

  function addEducation() {
    setFormData({
      ...formData,
      education: [
        ...formData.education,
        { course: "", institution: "", description: "" },
      ],
    });
  }
  function removeEducation(index: number) {
    setFormData({
      ...formData,
      education: formData.education.filter((_, i) => i !== index),
    });
  }
  function handleEducationChange(
    index: number,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    const updated = [...formData.education];

    updated[index][name as keyof Education] = value;
    setFormData({ ...formData, education: updated });
  }

  // ---------- GERAÇÃO DO HTML E ENVIO PARA O BACKEND ----------

  async function handleSaveCurriculum() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      let resumeId: number | null = null;

      // 1. Tenta buscar currículo existente
      try {
        const listResponse = await api.get("/resumes/", config);
        if (listResponse.data && listResponse.data.length > 0) {
          resumeId = listResponse.data[0].id;
        }
      } catch {
        // Se der erro na busca, apenas prosseguimos para tentar criar
        console.log("Sem currículo prévio encontrado.");
      }

      // 2. Se não existir, CRIA e pega o ID da resposta na hora
      if (!resumeId) {
        const payload = {
          title: formData.fullName || "Meu Currículo",
          content: JSON.stringify(formData),
        };
        const saveResponse = await api.post("/resumes/", payload, config);
        resumeId = saveResponse.data.id;
      }

      // 3. Verificação de segurança
      if (!resumeId) {
        alert("Erro ao identificar o currículo.");
        return;
      }

      // 4. Delay de segurança (500ms) para garantir que o banco persistiu o dado
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 5. Exportação do PDF usando o ID garantido
      const response = await api.get(`/pdf/export/${resumeId}/`, {
        ...config,
        responseType: "blob",
      });

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `curriculo_${formData.fullName || "aluno"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert("PDF gerado com sucesso!");
    } catch (error: unknown) {
      // Cast do erro para evitar 'any' e satisfazer o ESLint
      const err = error as { response?: { status?: number; data?: unknown } };

      if (err.response?.status === 401) {
        alert("Sessão expirada. Por favor, faça login novamente.");
      } else if (err.response?.status === 404) {
        alert(
          "Currículo ainda processando. Tente clicar novamente em instantes.",
        );
      } else {
        alert("Erro na comunicação com o servidor.");
      }
    }
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
        <input
          name="fullName"
          placeholder="Nome completo"
          onChange={handleChange}
        />
        <input
          name="location"
          placeholder="Cidade / Estado"
          onChange={handleChange}
        />
        <input
          name="area"
          placeholder="Área de atuação"
          onChange={handleChange}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
        />
        <input name="phone" placeholder="Telefone" onChange={handleChange} />
      </section>

      {/* FORMAÇÃO */}
      <section className="card">
        <h3>Formação Acadêmica</h3>
        {formData.education.map((edu, index) => (
          <div key={index} className="box-card">
            <input
              name="course"
              placeholder="Curso"
              value={edu.course}
              onChange={(e) => handleEducationChange(index, e)}
            />
            <input
              name="institution"
              placeholder="Instituição"
              value={edu.institution}
              onChange={(e) => handleEducationChange(index, e)}
            />
            <textarea
              name="description"
              placeholder="Descrição"
              value={edu.description}
              onChange={(e) => handleEducationChange(index, e)}
            />
            {formData.education.length > 1 && (
              <button
                type="button"
                onClick={() => removeEducation(index)}
                className="remove-btn"
              >
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
            <input
              name="role"
              placeholder="Cargo"
              value={exp.role}
              onChange={(e) => handleExperienceChange(index, e)}
            />
            <input
              name="company"
              placeholder="Empresa"
              value={exp.company}
              onChange={(e) => handleExperienceChange(index, e)}
            />
            <input
              name="period"
              placeholder="Período"
              value={exp.period}
              onChange={(e) => handleExperienceChange(index, e)}
            />
            <textarea
              name="description"
              placeholder="Descrição"
              value={exp.description}
              onChange={(e) => handleExperienceChange(index, e)}
            />
            {formData.experiences.length > 1 && (
              <button
                type="button"
                onClick={() => removeExperience(index)}
                className="remove-btn"
              >
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
            <input
              name="title"
              placeholder="Nome do Projeto"
              value={project.title}
              onChange={(e) => handleProjectChange(index, e)}
            />
            <input
              name="startYear"
              placeholder="Ano Início"
              value={project.startYear}
              onChange={(e) => handleProjectChange(index, e)}
            />
            <input
              name="endYear"
              placeholder="Ano Conclusão"
              value={project.endYear}
              onChange={(e) => handleProjectChange(index, e)}
            />
            <input
              name="institution"
              placeholder="Instituição"
              value={project.institution}
              onChange={(e) => handleProjectChange(index, e)}
            />
            <input
              name="advisor"
              placeholder="Orientador"
              value={project.advisor}
              onChange={(e) => handleProjectChange(index, e)}
            />
            <textarea
              name="description"
              placeholder="Descrição"
              value={project.description}
              onChange={(e) => handleProjectChange(index, e)}
            />
            {formData.projects.length > 1 && (
              <button
                type="button"
                onClick={() => removeProject(index)}
                className="remove-btn"
              >
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
        <button
          type="button"
          className="save-btn"
          onClick={handleSaveCurriculum}
        >
          Salvar e Gerar PDF
        </button>
      </div>
    </div>
  );
}
