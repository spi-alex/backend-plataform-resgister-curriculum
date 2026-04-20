import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  XCircle,
} from "lucide-react";


import { useState } from "react";
import { jobsMock } from "../../manager/jobs/Mocks/JobsMock";


import "./CompanyJobs.css";


export default function CompanyJobs() {
  const navigate = useNavigate();


// Estado das vagas
  const [jobs, setJobs] = useState(jobsMock);


  // Função de deletar (pronta para integração backend)
  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm(
      "Tem certeza que deseja excluir esta vaga?"
    );


    if (!confirmDelete) return;


    try {
      //  FUTURO BACKEND
      // await api.delete(`/jobs/${id}`);


      //  MOCK 
      const updatedJobs = jobs.filter((job) => job.id !== id);
      setJobs(updatedJobs);


      alert("Vaga removida com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar vaga:", error);
      alert("Erro ao excluir vaga");
    }
  };


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


      {/* FILTROS */}
      <div className="jobs-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por cargo, ID ou palavra-chave..."
          />
        </div>


        <div className="filter-group">
          <select>
            <option>Área: Todas</option>
            <option>Tecnologia</option>
            <option>Marketing</option>
            <option>Vendas</option>
          </select>


          <select>
            <option>Status: Ativa</option>
            <option>Encerrada</option>
            <option>Rascunho</option>
          </select>


          <select>
            <option>Modalidade: Todas</option>
            <option>Remoto</option>
            <option>Híbrido</option>
            <option>Presencial</option>
          </select>
        </div>
      </div>


      {/* TABELA */}
      <div className="jobs-table-container">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Área</th>
              <th>Modalidade</th>
              <th>Status</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>


          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <strong>{job.titulo}</strong>
                  <span>
                    ID: #{job.id} • {job.candidatos} candidatos
                  </span>
                </td>


                <td>{job.area}</td>
                <td>{job.local}</td>


                <td>
                  <span className={`status ${job.status}`}>
                    {job.status === "aberta" ? "Ativa" : "Encerrada"}
                  </span>
                </td>


                <td>{job.dataPublicacao}</td>


                <td className="actions">
                  {/* VER VAGA */}
                  <button
                    onClick={() =>
                      navigate(`/dashboard/empresa/vagas/${job.id}`)
                    }
                  >
                    Ver vaga
                  </button>


                  {/* EDITAR */}
                  <button>
                    <Edit size={18} />
                  </button>


                  {/* DELETAR */}
                  <button
                    className="danger"
                    onClick={() => handleDelete(job.id)}
                  >
                    <XCircle size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>


        {/* PAGINAÇÃO */}
        <div className="pagination">
          <p>
            Mostrando <strong>1 - {jobs.length}</strong> de{" "}
            <strong>{jobs.length}</strong> vagas
          </p>


          <div className="pagination-controls">
            <button>
              <ChevronLeft size={18} />
            </button>
            <button className="active">1</button>
            <button>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

