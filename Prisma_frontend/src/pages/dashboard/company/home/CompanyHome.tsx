import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CheckCircle,
  Users,
  Send,
  ChevronRight,
  Plus,
} from "lucide-react";

import "./CompanyHome.css";

export default function CompanyHome() {
  const navigate = useNavigate();

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
              <h3>12</h3>
              <span className="kpi-highlight">+2 este mês</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon gray">
              <Briefcase size={28} />
            </div>
            <div>
              <p className="kpi-label">Vagas Encerradas</p>
              <h3>45</h3>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon green">
              <Users size={28} />
            </div>
            <div>
              <p className="kpi-label">Total Candidatos</p>
              <h3>1.284</h3>
              <span className="kpi-highlight">+14% engajamento</span>
            </div>
          </div>

        </div>
      </section>

      {/* ===== ENCAMINHAMENTOS ===== */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">
            <Send size={20} />
            Encaminhamentos Recentes
          </h2>

          <button className="link-button" onClick={() => navigate("/dashboard/empresa/vagas")}>
            Ver todos 
          </button>
        </div>

        <div className="forwards-grid">

          <div className="forward-card">
            <div>
              <h4>Desenvolvedor Frontend</h4>
              <p>8 currículos encaminhados</p>
            </div>
            <span className="badge">Ontem</span>
          </div>

          <div className="forward-card">
            <div>
              <h4>Product Designer Senior</h4>
              <p>15 currículos encaminhados</p>
            </div>
            <span className="badge">Hoje</span>
          </div>

          <div className="forward-card">
            <div>
              <h4>Analista Financeiro</h4>
              <p>3 currículos encaminhados</p>
            </div>
            <span className="badge">há 2 dias</span>
          </div>

        </div>
      </section>

      {/* ===== TABELA VAGAS ===== */}
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
                <th>Área</th>
                <th>Status</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>

              <tr>
                <td>SDR - Sales Development</td>
                <td>Vendas</td>
                <td><span className="status active">Ativa</span></td>
                <td>12 Out, 2023</td>
                <td>
                  <button className="manage-btn">
                    Gerenciar <ChevronRight size={16} />
                  </button>
                </td>
              </tr>

              <tr>
                <td>QA Automation Junior</td>
                <td>Tecnologia</td>
                <td><span className="status active">Ativa</span></td>
                <td>10 Out, 2023</td>
                <td>
                  <button className="manage-btn">
                    Gerenciar <ChevronRight size={16} />
                  </button>
                </td>
              </tr>

              <tr>
                <td>Gerente de Marketing</td>
                <td>Marketing</td>
                <td><span className="status closed">Encerrada</span></td>
                <td>05 Out, 2023</td>
                <td>
                  <button className="manage-btn">
                    Gerenciar <ChevronRight size={16} />
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

      </section>

    </div>
  );
}