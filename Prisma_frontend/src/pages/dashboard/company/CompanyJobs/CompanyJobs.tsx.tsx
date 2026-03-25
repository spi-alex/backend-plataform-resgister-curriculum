import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  XCircle,
} from "lucide-react";

import "./CompanyJobs.css";

export default function CompanyJobs() {
  const navigate = useNavigate();

  return (
    <div className="company-jobs">

      {/* HEADER DA PÁGINA */}
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
              <th>Data Limite</th>
              <th></th>
            </tr>
          </thead>

          <tbody>

            <tr>
              <td>
                <strong>Desenvolvedor Full Stack Sênior</strong>
                <span>ID: #89210 • 24 candidatos</span>
              </td>
              <td>Tecnologia</td>
              <td>Remoto</td>
              <td>
                <span className="status active">Ativa</span>
              </td>
              <td>15/10/2023</td>
              <td className="actions">
                <button><Edit size={18} /></button>
                <button className="danger"><XCircle size={18} /></button>
              </td>
            </tr>

            <tr>
              <td>
                <strong>Analista de Growth Marketing</strong>
                <span>ID: #89195 • 12 candidatos</span>
              </td>
              <td>Marketing</td>
              <td>Híbrido</td>
              <td>
                <span className="status active">Ativa</span>
              </td>
              <td>22/10/2023</td>
              <td className="actions">
                <button><Edit size={18} /></button>
                <button className="danger"><XCircle size={18} /></button>
              </td>
            </tr>

            <tr className="disabled">
              <td>
                <strong>Gerente de Contas (Hunter)</strong>
                <span>ID: #88042 • Encerrada</span>
              </td>
              <td>Comercial</td>
              <td>Presencial</td>
              <td>
                <span className="status closed">Encerrada</span>
              </td>
              <td>01/09/2023</td>
              <td className="actions">
                <button><Edit size={18} /></button>
              </td>
            </tr>

          </tbody>
        </table>

        {/* PAGINAÇÃO */}
        <div className="pagination">
          <p>
            Mostrando <strong>1 - 3</strong> de <strong>12</strong> vagas
          </p>

          <div className="pagination-controls">
            <button><ChevronLeft size={18} /></button>
            <button className="active">1</button>
            <button>2</button>
            <button>3</button>
            <button><ChevronRight size={18} /></button>
          </div>
        </div>

      </div>

    </div>
  );
}