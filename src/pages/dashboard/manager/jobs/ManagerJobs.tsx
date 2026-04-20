import {
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  Building2,
  GraduationCap,
  MapPin,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import KPIGrid from "../components/KPIs/KPIGrid";
import { jobsMock } from "../jobs/Mocks/JobsMock"
import "./ManagerJobs.css";


export default function ManagerJobs() {
  const navigate = useNavigate();


  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [nivel, setNivel] = useState("");
  const [area, setArea] = useState("");


  const jobs = jobsMock;


  // FILTROS 
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      return (
        (search === "" ||
          job.titulo.toLowerCase().includes(search.toLowerCase()) ||
          job.empresa.toLowerCase().includes(search.toLowerCase())) &&
        (empresa === "" || job.empresa === empresa) &&
        (nivel === "" || job.nivel === nivel) &&
        (area === "" || job.area === area)
      );
    });
  }, [search, empresa, nivel, area]);


  // KPIs DINÂMICOS
  const totalVagas = jobs.length;
  const abertas = jobs.filter((j) => j.status === "aberta").length;
  const encerradas = jobs.filter((j) => j.status === "encerrada").length;
  const totalCandidatos = jobs.reduce(
    (acc, j) => acc + j.candidatos,
    0
  );


  // Valores únicos para selects
  const empresasUnicas = [...new Set(jobs.map((j) => j.empresa))];
  const niveisUnicos = [...new Set(jobs.map((j) => j.nivel))];
  const areasUnicas = [...new Set(jobs.map((j) => j.area))];


  // Contagem de vagas por empresa (sidebar)
  const empresasMap = jobs.reduce((acc: Record<string, number>, job) => {
    acc[job.empresa] = (acc[job.empresa] || 0) + 1;
    return acc;
  }, {});


  return (
    <main className="manager-jobs">
      <nav className="breadcrumbs">
        <span>Início</span> / <span>Vagas</span>
      </nav>


      <header className="page-header">
        <div>
          <h1>Vagas Cadastradas</h1>
          <p>
            Visualize, filtre e gerencie as vagas cadastradas pelas empresas.
          </p>
        </div>
      </header>


      <KPIGrid
        items={[
          { icon: <Briefcase size={40} />, label: "Total de vagas", value: totalVagas },
          { icon: <CheckCircle size={40} />, label: "Vagas abertas", value: abertas },
          { icon: <XCircle size={40} />, label: "Vagas encerradas", value: encerradas },
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


          <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="">Nível</option>
            {niveisUnicos.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>


          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Área</option>
            {areasUnicas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
      </section>


      {/* CONTEÚDO */}
      <section className="jobs-content">
        <div className="jobs-grid">
          {filteredJobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <div>
                  <span className="company">{job.empresa}</span>
                  <h3>{job.titulo}</h3>
                </div>
                <span className={`status ${job.status}`}>
                  {job.status === "aberta" ? "Aberta" : "Encerrada"}
                </span>
              </div>


              <div className="job-info">
                <div>
                  <GraduationCap size={16} />
                  <span>{job.nivel}</span>
                </div>


                <div>
                  <Briefcase size={16} />
                  <span>{job.area}</span>
                </div>


                <div>
                  <MapPin size={16} />
                  <span>{job.local}</span>
                </div>
              </div>


              <button
                className="view-btn"
                onClick={() => navigate(`/dashboard/gestor/vagas/${job.id}`)}
              >
                Ver detalhes
              </button>
            </div>
          ))}
        </div>


        {/* SIDEBAR */}
        <aside className="companies-panel">
          <header>
            <h3>
              <Building2 size={18} /> Empresas parceiras
            </h3>
          </header>


          <ul>
            {Object.entries(empresasMap).map(([empresa, qtd]) => (
              <li key={empresa}>
                <strong>{empresa}</strong>
                <span>{qtd} vagas</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}

