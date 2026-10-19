import { useState, useEffect, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../services/api";
import { arquivoParaDataUrl, ErroDeImagem } from "../../../../utils/imagem";
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

const FORM_VAZIO: FormData = {
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
};

/**
 * Junta o que veio do banco com o formulário vazio.
 *
 * BUG CORRIGIDO: antes o retorno da API era jogado direto no estado
 * (`setFormData(existingData)`). `Resume.content` é um JSON LIVRE — nada no
 * backend garante que ele tenha todas as chaves que este formulário espera.
 * Bastava faltar `projects` (ou `education`, ou `experiences`) para o
 * `.map()` correspondente rodar sobre `undefined`, e a tela inteira quebrava
 * com "Cannot read properties of undefined (reading 'map')" — tela branca,
 * sem mensagem, sem recuperação possível a não ser apagar o currículo.
 *
 * Acontece com qualquer currículo salvo por uma versão anterior do
 * formulário, ou gravado pela API fora da tela.
 */
function normalizarCurriculo(bruto: unknown): FormData {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
    return FORM_VAZIO;
  }

  const dados = bruto as Partial<FormData>;
  const lista = <T,>(valor: unknown, padrao: T[]): T[] =>
    Array.isArray(valor) && valor.length > 0 ? (valor as T[]) : padrao;
  const texto = (valor: unknown): string =>
    typeof valor === "string" ? valor : "";

  return {
    fullName: texto(dados.fullName),
    location: texto(dados.location),
    area: texto(dados.area),
    email: texto(dados.email),
    phone: texto(dados.phone),
    photo: typeof dados.photo === "string" ? dados.photo : null,
    education: lista<Education>(dados.education, FORM_VAZIO.education),
    // Tolera o singular "experience": é a chave que o template do PDF no
    // backend usa (pdf/templates/pdf/resume_pdf.html), então currículos
    // criados por fora da tela costumam vir assim.
    experiences: lista<Experience>(
      dados.experiences ?? (dados as { experience?: unknown }).experience,
      FORM_VAZIO.experiences,
    ),
    projects: lista<Project>(dados.projects, FORM_VAZIO.projects),
    skills: texto(dados.skills),
    courses: texto(dados.courses),
    languages: texto(dados.languages),
  };
}

export default function StudentCurriculumCreate() {
  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<FormData>(FORM_VAZIO);
  const [erroFoto, setErroFoto] = useState("");

  // CARREGA DADOS EXISTENTES SE HOUVER
  useEffect(() => {
    async function loadExistingCurriculum() {
      // Authorization sai do interceptor de `api` (services/api.ts), que lê
      // o token da memória — ele não vive mais em localStorage.
      try {
        const response = await api.get("/resumes/");
        if (response.data && response.data.length > 0) {
          // Deserializa o JSON que está salvo na coluna content do Django e
          // completa o que estiver faltando (ver normalizarCurriculo).
          const existingData = JSON.parse(response.data[0].content);
          setFormData(normalizarCurriculo(existingData));
        }
      } catch (error) {
        // `JSON.parse` de um content corrompido também cai aqui — o
        // formulário continua utilizável, em branco, em vez de quebrar.
        console.error("Erro ao carregar currículo existente:", error);
      } finally {
        setLoadingData(false);
      }
    }

    loadExistingCurriculum();
  }, []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  // A foto vira um data URL JPEG reduzido (utils/imagem.ts) em vez do
  // `URL.createObjectURL(file)` que havia aqui. Aquele endereço `blob:` só
  // valia dentro desta aba: sumia num F5 e não significava nada para o
  // servidor, então a foto NUNCA era salva de fato — nem aparecia no PDF.
  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErroFoto("");
    try {
      const dataUrl = await arquivoParaDataUrl(file);
      setFormData((anterior) => ({ ...anterior, photo: dataUrl }));
    } catch (erro) {
      setErroFoto(
        erro instanceof ErroDeImagem
          ? erro.message
          : "Não foi possível carregar a imagem.",
      );
      // Limpa o input para o mesmo arquivo poder ser escolhido de novo
      // depois de o usuário corrigir o problema.
      e.target.value = "";
    }
  }

  function removerFoto() {
    setErroFoto("");
    setFormData((anterior) => ({ ...anterior, photo: null }));
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

  // ---------- SALVAR OU ATUALIZAR NO BACKEND ----------
  async function handleSaveCurriculum() {
    // Authorization sai do interceptor de `api` (services/api.ts).
    try {
      let resumeId: number | null = null;

      try {
        const listResponse = await api.get("/resumes/");
        if (listResponse.data && listResponse.data.length > 0) {
          resumeId = listResponse.data[0].id;
        }
      } catch {
        console.log("Sem currículo prévio encontrado.");
      }

      const payload = {
        title: formData.fullName || "Meu Currículo",
        content: JSON.stringify(formData),
      };

      const isNewResume = !resumeId;

      if (isNewResume) {
        // Criar Novo
        // BUG CORRIGIDO: o POST de criação (resumes/views.py) não devolve o
        // currículo direto — devolve { message, data: {...} }. Lendo
        // "saveResponse.data.id" (sem o "data" do meio) sempre dava
        // undefined, e a geração do PDF logo após criar o 1º currículo
        // falhava com "Erro ao identificar o currículo" para todo aluno.
        const saveResponse = await api.post("/resumes/", payload);
        resumeId = saveResponse.data?.data?.id ?? saveResponse.data?.id ?? null;
      } else {
        // Atualizar Existente (o PUT já devolve o objeto direto, sem wrapper)
        await api.put(`/resumes/${resumeId}/`, payload);
      }

      if (!resumeId) {
        alert("Erro ao identificar o currículo.");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Exportação do PDF
      const response = await api.get(`/pdf/export/${resumeId}/`, {
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

      alert(
        isNewResume
          ? "Currículo criado e PDF gerado com sucesso!"
          : "Currículo atualizado e PDF gerado com sucesso!",
      );
      navigate("/dashboard/aluno");
    } catch {
      alert("Erro na comunicação com o servidor ao salvar.");
    }
  }

  if (loadingData) {
    return (
      <div className="student-curriculum">Carregando suas informações...</div>
    );
  }

  return (
    <div className="student-curriculum">
      <header className="page-header">
        <h2>Gerenciar Currículo</h2>
      </header>

      {/* FOTO */}
      <section className="card">
        <h3>Foto</h3>
        <input type="file" accept="image/*" onChange={handlePhotoUpload} />
        <small className="campo-ajuda">
          JPG, PNG ou WEBP de até 8MB. A imagem é reduzida automaticamente
          antes de ser salva e aparece no PDF do currículo.
        </small>
        {erroFoto && <p className="error">{erroFoto}</p>}
        {formData.photo && (
          <div className="photo-preview">
            <img src={formData.photo} alt="Preview" />
            <button type="button" className="foto-remover" onClick={removerFoto}>
              Remover foto
            </button>
          </div>
        )}
      </section>

      {/* INFORMAÇÕES PESSOAIS */}
      <section className="card">
        <h3>Informações Pessoais</h3>
        <input
          name="fullName"
          value={formData.fullName}
          placeholder="Nome completo"
          onChange={handleChange}
        />
        <input
          name="location"
          value={formData.location}
          placeholder="Cidade / Estado"
          onChange={handleChange}
        />
        <input
          name="area"
          value={formData.area}
          placeholder="Área de atuação"
          onChange={handleChange}
        />
        <input
          name="email"
          value={formData.email}
          type="email"
          placeholder="Email"
          onChange={handleChange}
        />
        <input
          name="phone"
          value={formData.phone}
          placeholder="Telefone"
          onChange={handleChange}
        />
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
        <textarea
          name="skills"
          value={formData.skills}
          onChange={handleChange}
        />
      </section>

      <section className="card">
        <h3>Cursos Complementares</h3>
        <textarea
          name="courses"
          value={formData.courses}
          onChange={handleChange}
        />
      </section>

      <section className="card">
        <h3>Idiomas</h3>
        <textarea
          name="languages"
          value={formData.languages}
          onChange={handleChange}
        />
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
