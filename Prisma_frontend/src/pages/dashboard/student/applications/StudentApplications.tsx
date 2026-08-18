import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Inbox } from "lucide-react";
import api from "../../../../services/api";
import "./StudentApplications.css";

// Formato devolvido por GET /api/jobs/my-applications/ (ApplicationSerializer)
interface Application {
  id: number;
  job: number;
  job_title: string;
  status: "PENDENTE" | "ANALISE" | "ENTREVISTA" | "APROVADO" | "REPROVADO";
  status_label: string;
  applied_at: string;
}

const STATUS_CLASS: Record<Application["status"], string> = {
  PENDENTE: "status-pendente",
  ANALISE: "status-analise",
  ENTREVISTA: "status-entrevista",
  APROVADO: "status-aprovado",
  REPROVADO: "status-reprovado",
};

export default function StudentApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApplications() {
      try {
        setLoading(true);
        const response = await api.get("jobs/my-applications/");
        setApplications(response.data);
      } catch (error) {
        console.error("Erro ao carregar candidaturas:", error);
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, []);

  if (loading) {
    return (
      <main className="student-applications">
        <p>Carregando suas candidaturas...</p>
      </main>
    );
  }

  return (
    <main className="student-applications">
      <nav className="breadcrumbs">
        <span>Início</span> / <span>Minhas Candidaturas</span>
      </nav>

      <header className="page-header">
        <div>
          <h1>Minhas Candidaturas</h1>
          <p>Acompanhe o andamento dos seus processos seletivos.</p>
        </div>
      </header>

      {applications.length === 0 ? (
        <div className="applications-empty">
          <Inbox size={40} />
          <h2>Você ainda não se candidatou a nenhuma vaga.</h2>
          <p>Explore as oportunidades disponíveis e candidate-se pelo sistema.</p>
          <button
            className="primary-btn"
            onClick={() => navigate("/dashboard/aluno/vagas")}
          >
            Ver vagas disponíveis
          </button>
        </div>
      ) : (
        <ul className="applications-list">
          {applications.map((application) => (
            <li key={application.id} className="application-row">
              <div className="application-info">
                <Briefcase size={18} />
                <div>
                  <strong>{application.job_title}</strong>
                  <span>
                    Candidatura enviada em{" "}
                    {new Date(application.applied_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>

              <div className="application-actions">
                <span className={`status-badge ${STATUS_CLASS[application.status]}`}>
                  {application.status_label}
                </span>
                <button
                  className="link-btn"
                  onClick={() => navigate(`/dashboard/aluno/vagas/${application.job}`)}
                >
                  Ver vaga
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
