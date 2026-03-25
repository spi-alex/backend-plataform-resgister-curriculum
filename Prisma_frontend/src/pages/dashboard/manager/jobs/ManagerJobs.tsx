import {
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  Building2,
  GraduationCap,
  MapPin,
} from "lucide-react";

import KPIGrid from "../components/KPIs/KPIGrid";

import "./ManagerJobs.css";

export default function ManagerJobs() {
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
    {
      icon: <Briefcase size={40} />,
      label: "Total de vagas",
      value: 12,
    },
    {
      icon: <CheckCircle size={40} />,
      label: "Vagas abertas",
      value: 7,
    },
    {
      icon: <XCircle size={40} />,
      label: "Vagas encerradas",
      value: 5,
    },
    {
      icon: <Users size={40} />,
      label: "Candidatos",
      value: 128,
    },
  ]}
/>

      {/* FILTROS */}
      <section className="filters-box">
        <div className="filters">
          <input type="text" placeholder="Buscar por vaga ou empresa" />

          <select>
            <option value="">Empresa</option>
            <option>Tech Solutions</option>
            <option>Admin Corp</option>
            <option>Build It S.A.</option>
          </select>

          <select>
            <option value="">Nível</option>
            <option>Técnico</option>
            <option>Graduação</option>
            <option>Especialização</option>
          </select>

          <select>
            <option value="">Área</option>
            <option>Administração</option>
            <option>Tecnologia</option>
            <option>Edificações</option>
          </select>

          <button className="filter-btn">Filtrar</button>
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL */}
      <section className="jobs-content">
        {/* GRID DE VAGAS */}
        <div className="jobs-grid">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="job-card">
              <div className="job-header">
                <div>
                  <span className="company">Tech Solutions</span>
                  <h3>Desenvolvedor Full Stack</h3>
                </div>
                <span className="status open">Aberta</span>
              </div>

              <div className="job-info">
                <div>
                  <GraduationCap size={16} />
                  <span>Graduação</span>
                </div>
                <div>
                  <Briefcase size={16} />
                  <span>Tecnologia</span>
                </div>
                <div>
                  <MapPin size={16} />
                  <span>Teresina</span>
                </div>
              </div>

              <button className="view-btn">Ver detalhes</button>
            </div>
          ))}
        </div>

        {/* SIDEBAR DE EMPRESAS */}
        <aside className="companies-panel">
          <header>
            <h3>
              <Building2 size={18} /> Empresas parceiras
            </h3>
          </header>

          <ul>
            <li>
              <strong>Tech Solutions</strong>
              <span>8 vagas</span>
            </li>
            <li>
              <strong>Admin Corp</strong>
              <span>3 vagas</span>
            </li>
            <li>
              <strong>Build It S.A.</strong>
              <span>1 vaga</span>
            </li>
          </ul>

          <div className="monthly-summary">
            <h4>Resumo do mês</h4>
            <div>
              <div>
                <strong>42</strong>
                <span>Novas vagas</span>
              </div>
              <div>
                <strong>128</strong>
                <span>Candidatos</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
