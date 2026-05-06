import { useNavigate } from "react-router-dom";
import { Plus, Edit, XCircle } from "lucide-react"; // Removido Search e Chevrons
import { useState, useEffect } from "react";
import api from "../../../../services/api";
import "./CompanyJobs.css";

interface Job {
  id: number;
  title: string;
  is_active: boolean;
  created_at: string;
}

export default function CompanyJobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. BUSCAR VAGAS DO BACKEND
  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await api.get("jobs/");
        setJobs(response.data);
      } catch {
        console.error("Erro ao carregar vagas");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  // 2. FUNÇÃO DE DELETAR
  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir esta vaga?")) return;

    try {
      await api.delete(`jobs/${id}/`);
      setJobs((prevJobs) => prevJobs.filter((job) => job.id !== id));
      alert("Vaga removida com sucesso!");
    } catch {
      alert("Erro ao excluir vaga no servidor.");
    }
  };

  if (loading) return <div className="loading">Carregando vagas...</div>;

  return (
    <div className="company-jobs">
      {/* HEADER */}
      <div className="jobs-top">
        <div>
          <h1>Minhas Vagas</h1>
          <p>
            Gerencie e acompanhe todos os processos seletivos da sua empresa.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => navigate("/dashboard/empresa/vagas/nova")}
        >
          <Plus size={18} />
          Nova Vaga
        </button>
      </div>

      {/* TABELA */}
      <div className="jobs-table-container">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Status</th>
              <th>Data de Criação</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {jobs.length > 0 ? (
              jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>{job.title}</strong>
                    <span>ID: #{job.id}</span>
                  </td>

                  <td>
                    <span
                      className={`status ${job.is_active ? "aberta" : "encerrada"}`}
                    >
                      {job.is_active ? "Ativa" : "Inativa"}
                    </span>
                  </td>

                  <td>{job.created_at}</td>

                  <td className="actions">
                    <button
                      onClick={() =>
                        navigate(`/dashboard/empresa/vagas/${job.id}`)
                      }
                    >
                      Ver candidatos
                    </button>

                    <button
                      onClick={() =>
                        navigate(`/dashboard/empresa/vagas/editar/${job.id}`)
                      }
                    >
                      <Edit size={18} />
                    </button>

                    <button
                      className="danger"
                      onClick={() => handleDelete(job.id)}
                    >
                      <XCircle size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#666",
                  }}
                >
                  Nenhuma vaga encontrada. Comece publicando uma nova!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
