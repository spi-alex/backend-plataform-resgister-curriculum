import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../../../services/api";
import type { Job } from "../../../../utils/job";
import { formatSalary } from "../../../../utils/job";

export default function StudentJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

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

    fetchJob();
  }, [id]);

  async function handleApply() {
    if (!id) return;

    setApplying(true);
    try {
      const response = await api.post(`jobs/${id}/apply/`);
      setApplied(true);
      alert(response.data.message || "Candidatura enviada com sucesso!");
    } catch (error: unknown) {
      const axiosError = error as { response?: { status: number; data?: { error?: string } } };

      // O backend recusa a candidatura se o aluno ainda não tem currículo
      if (axiosError.response?.status === 400) {
        const message = axiosError.response.data?.error;
        if (message?.toLowerCase().includes("currículo")) {
          if (window.confirm(`${message} Deseja criar seu currículo agora?`)) {
            navigate("/dashboard/aluno/curriculo");
          }
          return;
        }
        alert(message || "Não foi possível enviar sua candidatura.");
        return;
      }

      console.error("Erro ao se candidatar:", error);
      alert("Não foi possível enviar sua candidatura. Tente novamente.");
    } finally {
      setApplying(false);
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
        <button onClick={() => navigate("/dashboard/aluno/vagas")}>
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
        <span onClick={() => navigate("/dashboard/aluno/vagas")}>Vagas</span>
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
          {job.is_active && (
            <button
              className="jd-primary-btn"
              onClick={handleApply}
              disabled={applying || applied}
            >
              {applied ? "Candidatura enviada" : applying ? "Enviando..." : "Candidatar-se"}
            </button>
          )}

          <button
            className="jd-outline-btn"
            onClick={() => navigate("/dashboard/aluno/vagas")}
          >
            Voltar
          </button>
        </div>
      </section>

      {/* GRID */}
      <div className="jd-grid">
        {/* Coluna Esquerda */}
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

        {/* Coluna Direita */}
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
    </main>
  );
}
