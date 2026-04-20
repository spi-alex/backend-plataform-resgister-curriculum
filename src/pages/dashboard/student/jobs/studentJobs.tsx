import {
  Briefcase,
  GraduationCap,
  MapPin,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jobsMock } from "../../manager/jobs/Mocks/JobsMock";

export default function StudentJobs() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [nivel, setNivel] = useState("");
  const [area, setArea] = useState("");

  const jobs = jobsMock.filter((j) => j.status === "aberta");

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
  }, [search, empresa, nivel, area, jobs]);

  const empresasUnicas = [...new Set(jobs.map((j) => j.empresa))];
  const niveisUnicos = [...new Set(jobs.map((j) => j.nivel))];
  const areasUnicas = [...new Set(jobs.map((j) => j.area))];

  return (
    <main className="student-jobs">
      <nav className="breadcrumbs">
        <span>Início</span> / <span>Vagas</span>
      </nav>

      <header className="page-header">
        <div>
          <h1>Vagas Disponíveis</h1>
          <p>
            Encontre oportunidades de emprego e candidate-se diretamente pelo sistema.
          </p>
        </div>
      </header>

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
                onClick={() => {
                  console.log("Clicou na vaga:", job.id); // 👈 DEBUG
                  navigate(`/dashboard/aluno/vagas/${job.id}`);
                }}
              >
                Ver detalhes
              </button>
            </div>
          ))}
        </div>
      </section>
      
    </main>
  );
}
