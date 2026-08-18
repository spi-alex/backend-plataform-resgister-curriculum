import { Briefcase, Building2, Wallet } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../services/api";
import type { Job } from "../../../../utils/job";
import { formatSalary } from "../../../../utils/job";

export default function StudentJobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState<boolean | null>(null);

  const [search, setSearch] = useState("");
  const [empresa, setEmpresa] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // A visualização de vagas depende de já existir currículo cadastrado
        const resumesResponse = await api.get("/resumes/");
        const possuiCurriculo = resumesResponse.data && resumesResponse.data.length > 0;
        setHasResume(possuiCurriculo);

        if (possuiCurriculo) {
          const jobsResponse = await api.get("jobs/");
          setJobs(jobsResponse.data.filter((job: Job) => job.is_active));
        }
      } catch (error) {
        console.error("Erro ao carregar vagas:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const term = search.toLowerCase();
      return (
        (search === "" ||
          job.title.toLowerCase().includes(term) ||
          job.company_name.toLowerCase().includes(term)) &&
        (empresa === "" || job.company_name === empresa)
      );
    });
  }, [search, empresa, jobs]);

  const empresasUnicas = [...new Set(jobs.map((j) => j.company_name))];

  if (loading) {
    return (
      <main className="student-jobs">
        <p>Carregando vagas...</p>
      </main>
    );
  }

  if (!hasResume) {
    return (
      <main className="student-jobs">
        <div className="empty-card">
          <h2>Você ainda não possui currículo cadastrado.</h2>
          <p>
            É necessário criar seu currículo antes de visualizar e se
            candidatar às vagas disponíveis.
          </p>
          <button
            className="primary-btn"
            onClick={() => navigate("/dashboard/aluno/curriculo")}
          >
            Criar Currículo
          </button>
        </div>
      </main>
    );
  }

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
        </div>
      </section>

      <section className="jobs-content">
        <div className="jobs-grid">
          {filteredJobs.length === 0 ? (
            <p className="empty">Nenhuma vaga encontrada no momento.</p>
          ) : (
            filteredJobs.map((job) => {
              const salary = formatSalary(job.salary);
              return (
                <div key={job.id} className="job-card">
                  <div className="job-header">
                    <div>
                      <span className="company">{job.company_name}</span>
                      <h3>{job.title}</h3>
                    </div>
                    <span className="status aberta">Aberta</span>
                  </div>

                  <div className="job-info">
                    <div>
                      <Building2 size={16} />
                      <span>{job.company_name}</span>
                    </div>

                    {salary && (
                      <div>
                        <Wallet size={16} />
                        <span>{salary}</span>
                      </div>
                    )}

                    <div>
                      <Briefcase size={16} />
                      <span>Publicada em {job.created_at}</span>
                    </div>
                  </div>

                  <button
                    className="view-btn"
                    onClick={() => navigate(`/dashboard/aluno/vagas/${job.id}`)}
                  >
                    Ver detalhes
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
