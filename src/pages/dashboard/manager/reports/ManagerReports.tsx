import "./ManagerReports.css";

import {
  Users,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
  Briefcase,
  FileText,
} from "lucide-react";

import KPIGrid from "../components/KPIs/KPIGrid";
import { ReportsFilters } from "./components/ReportsFilters/ReportsFilters";
import { ChartsSection } from "./components/ChartsSection/ChartsSection";
import { ReportsTable } from "./components/ReportsTable/ReportsTable";

export default function ManagerReports() {
  return (
    <div className="manager-reports">
      <header className="manager-reports-header">
        <h1>Relatórios Gerenciais</h1>
        <p>Acompanhe métricas e indicadores da plataforma</p>
      </header>

      {/* FILTROS */}
      <section className="manager-reports-filters">
        <ReportsFilters />
      </section>

      {/* KPIs – IGUAIS À HOME DO GESTOR */}
      <KPIGrid
  items={[
    {
      icon: <Users size={40} />,
      label: "Alunos cadastrados",
      value: 120,
    },
    {
      icon: <GraduationCap size={40} />,
      label: "Egressos",
      value: 40,
    },
    {
      icon: <Building2 size={40} />,
      label: "Empresas",
      value: 18,
    },
    {
      icon: <FileText size={40} />,
      label: "Currículos",
      value: 120,
    },
    {
      icon: <BriefcaseBusiness size={40} />,
      label: "Vagas cadastradas",
      value: 7,
    },
    {
      icon: <Briefcase size={40} />,
      label: "Vagas abertas",
      value: 3,
    },
  ]}
/>

      {/* GRÁFICOS */}
      <section className="manager-reports-charts">
        <ChartsSection />
      </section>

      {/* TABELA */}
      <section className="manager-reports-table">
        <ReportsTable />
      </section>
    </div>
  );
}
