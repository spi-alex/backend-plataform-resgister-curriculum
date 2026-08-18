import {
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  Building2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../../../services/api";
import KPIGrid from "../components/KPIs/KPIGrid";
import "./ManagerJobs.css";

interface GestorJob {
  id: number;
  company: number;
  company__name: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  total_candidaturas: number;
}

export default function ManagerJobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<GestorJob[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        const response = await api.get("users/gestor/jobs/");
        setJobs(response.data);
      } catch (error) {
        console.error("Erro ao carregar vagas do gestor:", error);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  const empresasUnicas = useMemo(
    () => [...new Set(jobs.map((j) => j.company__name))],
    [jobs],
  );

  const empresasComContagem = useMemo(() => {
    const counts = new Map<string, number>();
    jobs.forEach((job) => {
      counts.set(job.company__name, (counts.get(job.company__name) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const term = search.toLowerCase();
      const matchesSearch =
        search === "" ||
        job.title.toLowerCase().includes(term) ||
        job.company__name.toLowerCase().includes(term);
      const matchesEmpresa = empresa === "" || job.company__name === empresa;
      const matchesStatus =
        statusFilter === "" ||
        (statusFilter === "aberta" ? job.is_active : !job.is_active);
      return matchesSearch && matchesEmpresa && matchesStatus;
    });
  }, [jobs, search, empresa, statusFilter]);

  const totalVagas = jobs.length;
  const vagasAbertas = jobs.filter((j) => j.is_active).length;
  const vagasEncerradas = totalVagas - vagasAbertas;
  const totalCandidatos = jobs.reduce((sum, j) => sum + (j.total_candidaturas || 0), 0);

  if (loading) {
    return <p>Carregando vagas...</p>;
  }

  return (
    <main className="manager-jobs">
      {/* BREADCRUMBS */}
      <nav className="breadcrumbs">
        <span>Início</span> / <span>Vagas</span>
      </nav>

      {/* HEADER */}
      <header className="page-header">
        <div>
          <h1>Vagas Cadastradas</h1>
          <p>
            Visualize, filtre e gerencie as vagas cadastradas pelas empresas
            parceiras do PRISMA.
          </p>
        </div>
      </header>

      {/* KPIs*/}
      <KPIGrid
        items={[
          { icon: <Briefcase size={40} />, label: "Total de vagas", value: totalVagas },
          { icon: <CheckCircle size={40} />, label: "Vagas abertas", value: vagasAbertas },
          { icon: <XCircle size={40} />, label: "Vagas encerradas", value: vagasEncerradas },
          { icon: <Users size={40} />, label: "Candidatos", value: totalCandidatos },
        ]}
      />

      {/* FILTROS */}
      <section className="filters-box">
        <div className="filters">
          <input
            type="text"
            placeholder="Buscar por vaga ou empresa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
            <option value="">Empresa</option>
            {empresasUnicas.map((emp) => (
              <option key={emp}>{emp}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Status</option>
            <option value="aberta">Abertas</option>
            <option value="encerrada">Encerradas</option>
          </select>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL */}
      <section className="jobs-content">
        {/* GRID DE VAGAS */}
        <div className="jobs-grid">
          {filteredJobs.length === 0 ? (
            <p className="empty">Nenhuma vaga encontrada.</p>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="job-card">
                <div className="job-header">
                  <div>
                    <span className="company">{job.company__name}</span>
                    <h3>{job.title}</h3>
                  </div>
                  <span className={`status ${job.is_active ? "open" : "closed"}`}>
                    {job.is_active ? "Aberta" : "Encerrada"}
                  </span>
                </div>

                <div className="job-info">
                  <div>
                    <Building2 size={16} />
                    <span>{job.company__name}</span>
                  </div>
                  <div>
                    <Users size={16} />
                    <span>{job.total_candidaturas} candidato(s)</span>
                  </div>
                </div>

                <button
                  className="view-btn"
                  onClick={() => navigate(`/dashboard/gestor/vagas/${job.id}`)}
                >
                  Ver detalhes
                </button>
              </div>
            ))
          )}
        </div>

        {/* SIDEBAR DE EMPRESAS */}
        <aside className="companies-panel">
          <header>
            <h3>
              <Building2 size={18} /> Empresas parceiras
            </h3>
          </header>

          <ul>
            {empresasComContagem.map(([nome, total]) => (
              <li key={nome}>
                <strong>{nome}</strong>
                <span>{total} vaga(s)</span>
              </li>
            ))}
          </ul>

          <div className="monthly-summary">
            <h4>Resumo geral</h4>
            <div>
              <div>
                <strong>{totalVagas}</strong>
                <span>Total de vagas</span>
              </div>
              <div>
                <strong>{totalCandidatos}</strong>
                <span>Candidatos</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
