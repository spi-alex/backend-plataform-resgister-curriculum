import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../../../../../services/api";
import type { Job } from "../../../../../utils/job";
import { formatSalary } from "../../../../../utils/job";
import type { RawResume } from "../../../../../utils/resume";
import { parseResume } from "../../../../../utils/resume";
import "./JobsDetails.css";

interface ResumeOption {
  id: number;
  name: string;
  course: string;
  email: string;
}

export default function ManagerJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Submeter currículos para a vaga (seções 4.3 / 5.6.2 do documento) ---
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function fetchJob() {
      try {
        setLoading(true);
        const response = await api.get(`jobs/${id}/`);
        setJob(response.data);
      } catch (error) {
        console.error("Erro ao buscar vaga:", error);
        setJob(null);
      } finally {
        setLoading(false);
      }
    }

    async function fetchResumes() {
      try {
        const response = await api.get("users/gestor/resumes/");
        const options: ResumeOption[] = (response.data as RawResume[]).map((raw) => {
          const parsed = parseResume(raw);
          return {
            id: parsed.id,
            name: parsed.fullName || parsed.username || "Sem nome",
            course: parsed.curso || parsed.area || "Não informado",
            email: parsed.email || "Sem e-mail",
          };
        });
        setResumes(options);
      } catch (error) {
        console.error("Erro ao carregar currículos:", error);
      }
    }

    fetchJob();
    fetchResumes();
  }, [id]);

  const filteredResumes = useMemo(() => {
    const term = search.toLowerCase();
    return resumes.filter((r) =>
      `${r.name} ${r.course} ${r.email}`.toLowerCase().includes(term),
    );
  }, [resumes, search]);

  function toggleResume(resumeId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(resumeId)) next.delete(resumeId);
      else next.add(resumeId);
      return next;
    });
  }

  async function handleSubmitResumes() {
    if (!id || selectedIds.size === 0) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await api.post(`jobs/${id}/submit-resumes/`, {
        resume_ids: Array.from(selectedIds),
      });
      setFeedback(response.data.message || "Currículos submetidos com sucesso.");
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Erro ao submeter currículos:", error);
      setFeedback("Não foi possível submeter os currículos selecionados.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="jobdetails-container">
        <h2>Carregando vaga...</h2>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="jobdetails-container">
        <h2>Vaga não encontrada</h2>
        <button onClick={() => navigate("/dashboard/gestor/vagas")}>
          Voltar
        </button>
      </main>
    );
  }

  const salary = formatSalary(job.salary);

  return (
    <main className="jobdetails-container">
      {/* Breadcrumb */}
      <nav className="jd-breadcrumb">
        <span onClick={() => navigate("/dashboard/gestor/vagas")}>Vagas</span>
        <span className="arrow">›</span>
        <span className="active">{job.title}</span>
      </nav>

      {/* Hero Card */}
      <section className="jd-hero">
        <div className="jd-hero-left">
          <div className="jd-badges">
            <span className={`jd-status ${job.is_active ? "aberta" : "encerrada"}`}>
              {job.is_active ? "Ativa" : "Encerrada"}
            </span>
          </div>

          <h1>{job.title}</h1>

          <p className="jd-subtitle">{job.company_name}</p>
        </div>

        <div className="jd-hero-right">
          <span className="jd-deadline-label">Publicada em</span>
          <span className="jd-deadline-date">{job.created_at}</span>
        </div>

        <div className="jd-hero-actions">
          <button
            className="jd-outline-btn"
            onClick={() => navigate("/dashboard/gestor/vagas")}
          >
            Voltar
          </button>
        </div>
      </section>

      {/* GRID */}
      <div className="jd-grid">
        <div className="jd-left">
          <div className="jd-card">
            <h3>Descrição</h3>
            <p>{job.description}</p>
          </div>

          <div className="jd-card">
            <h3>Requisitos</h3>
            <p>{job.requirements}</p>
          </div>
        </div>

        <div className="jd-right">
          <div className="jd-card">
            <h3>Informações Básicas</h3>
            <div className="jd-info-block">
              <span>Empresa</span>
              <strong>{job.company_name}</strong>
            </div>
            {salary && (
              <div className="jd-info-block">
                <span>Salário</span>
                <strong>{salary}</strong>
              </div>
            )}
            {job.contact_email && (
              <div className="jd-info-block">
                <span>Contato</span>
                <strong>{job.contact_email}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUBMETER CURRÍCULOS PARA A VAGA */}
      <section className="jd-card jd-submit-resumes">
        <h3>Submeter currículos para esta vaga</h3>
        <p className="jd-submit-hint">
          Selecione um ou mais currículos já cadastrados na plataforma para
          encaminhá-los como candidatura a esta vaga.
        </p>

        <input
          type="text"
          className="jd-submit-search"
          placeholder="Buscar por nome, curso ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="jd-submit-list">
          {filteredResumes.length === 0 ? (
            <p className="jd-submit-empty">Nenhum currículo encontrado.</p>
          ) : (
            filteredResumes.map((resume) => (
              <label key={resume.id} className="jd-submit-row">
                <input
                  type="checkbox"
                  checked={selectedIds.has(resume.id)}
                  onChange={() => toggleResume(resume.id)}
                />
                <div>
                  <strong>{resume.name}</strong>
                  <span>{resume.course} &middot; {resume.email}</span>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="jd-submit-actions">
          <span className="jd-submit-count">
            {selectedIds.size} currículo(s) selecionado(s)
          </span>
          <button
            className="jd-submit-btn"
            disabled={selectedIds.size === 0 || submitting}
            onClick={handleSubmitResumes}
          >
            {submitting ? "Enviando..." : "Submeter para a vaga"}
          </button>
        </div>

        {feedback && <p className="jd-submit-feedback">{feedback}</p>}
      </section>
    </main>
  );
}
