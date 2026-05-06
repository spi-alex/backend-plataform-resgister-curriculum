import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../../../services/api";
import {
  Briefcase,
  CheckCircle,
  Users,
  Send,
  ChevronRight,
  Plus,
} from "lucide-react";

import "./CompanyHome.css";

interface DashboardData {
  estatisticas: {
    total_vagas: number;
    vagas_ativas: number;
    total_candidaturas: number;
  };
  funil_de_recrutamento: Record<string, number>;
}

interface Job {
  id: number;
  title: string;
  is_active: boolean;
  created_at: string;
}

export default function CompanyHome() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Busca estatísticas e vagas ao mesmo tempo
        const [dashRes, jobsRes] = await Promise.all([
          api.get("jobs/dashboard/"),
          api.get("jobs/"),
        ]);

        setData(dashRes.data);
        // Pega apenas as 3 últimas vagas para a home
        setRecentJobs(jobsRes.data.slice(0, 3));
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="loading">Carregando dashboard...</div>;

  return (
    <div className="company-dashboard-home">
      {/* ===== RESUMO ===== */}
      <section className="dashboard-section">
        <h2 className="section-title">
          <CheckCircle size={20} />
          Resumo de Performance
        </h2>

        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon green">
              <Briefcase size={28} />
            </div>
            <div>
              <p className="kpi-label">Vagas Ativas</p>
              <h3>{data?.estatisticas.vagas_ativas || 0}</h3>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon gray">
              <Briefcase size={28} />
            </div>
            <div>
              <p className="kpi-label">Total de Vagas</p>
              <h3>{data?.estatisticas.total_vagas || 0}</h3>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon green">
              <Users size={28} />
            </div>
            <div>
              <p className="kpi-label">Total Candidatos</p>
              <h3>{data?.estatisticas.total_candidaturas || 0}</h3>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FUNIL DE RECRUTAMENTO (No lugar de encaminhamentos estáticos) ===== */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">
            <Send size={20} />
            Status das Candidaturas
          </h2>
        </div>

        <div className="forwards-grid">
          {data &&
            Object.entries(data.funil_de_recrutamento).map(([status, qtd]) => (
              <div key={status} className="forward-card">
                <div>
                  <h4>{status}</h4>
                  <p>{qtd} candidatos neste estágio</p>
                </div>
                <span className="badge">Atualizado</span>
              </div>
            ))}
        </div>
      </section>

      {/* ===== TABELA VAGAS RECENTES ===== */}
      <section className="dashboard-section table-section">
        <div className="table-header">
          <h2>Vagas Recentes</h2>
          <button
            className="primary-button"
            onClick={() => navigate("/dashboard/empresa/vagas/nova")}
          >
            <Plus size={18} />
            Nova Vaga
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Status</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td>
                    <span
                      className={`status ${job.is_active ? "active" : "closed"}`}
                    >
                      {job.is_active ? "Ativa" : "Encerrada"}
                    </span>
                  </td>
                  <td>
                    {new Date(job.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td>
                    <button
                      className="manage-btn"
                      onClick={() => navigate(`/dashboard/empresa/vagas`)}
                    >
                      Gerenciar <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {recentJobs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: "center", padding: "20px" }}
                  >
                    Nenhuma vaga publicada recentemente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
