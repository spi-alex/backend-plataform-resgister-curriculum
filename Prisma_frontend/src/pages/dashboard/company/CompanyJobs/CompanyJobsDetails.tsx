import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../../../services/api";
import type { Job } from "../../../../utils/job";
import { formatSalary } from "../../../../utils/job";

export default function CompanyJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

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
        <button onClick={() => navigate("/dashboard/empresa/vagas")}>
          Voltar
        </button>
      </main>
    );
  }

  const salary = formatSalary(job.salary);

  return (
    <main className="jobdetails-container">
      {/* Navegação */}
      <nav className="jd-breadcrumb">
        <span onClick={() => navigate("/dashboard/empresa/vagas")}>
          Vagas
        </span>
        <span className="arrow">›</span>
        <span className="active">{job.title}</span>
      </nav>

      {/* Cabeçalho */}
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

        {/* Ações */}
        <div className="jd-hero-actions">
          <button
            className="jd-primary-btn"
            onClick={() =>
              navigate(`/dashboard/empresa/vagas/${job.id}/candidatos`)
            }
          >
            Ver candidatos
          </button>

          <button
            className="jd-secondary-btn"
            onClick={() => navigate(`/dashboard/empresa/vagas/editar/${job.id}`)}
          >
            Editar
          </button>

          <button
            className="jd-outline-btn"
            onClick={() => navigate("/dashboard/empresa/vagas")}
          >
            Voltar
          </button>
        </div>
      </section>

      {/* Conteúdo */}
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
