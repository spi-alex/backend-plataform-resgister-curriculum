import "./ManagerReports.css";

import {
  Users,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
  Briefcase,
  FileText,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import api from "../../../../services/api";
import type { RawResume } from "../../../../utils/resume";
import { parseResume } from "../../../../utils/resume";
import KPIGrid from "../components/KPIs/KPIGrid";
import { ReportsFilters } from "./components/ReportsFilters/ReportsFilters";
import type { AreaCount, CompanyJobCount } from "./components/ChartsSection/ChartsSection";
import { ChartsSection } from "./components/ChartsSection/ChartsSection";
import type { ReportsTableRow } from "./components/ReportsTable/ReportsTable";
import { ReportsTable } from "./components/ReportsTable/ReportsTable";

interface RelatorioGeral {
  total_alunos: number;
  total_empresas: number;
  total_vagas: number;
  total_curriculos: number;
}

export default function ManagerReports() {
  const [loading, setLoading] = useState(true);
  const [relatorio, setRelatorio] = useState<RelatorioGeral | null>(null);
  const [vagasPorEmpresa, setVagasPorEmpresa] = useState<CompanyJobCount[]>([]);
  const [vagasAbertas, setVagasAbertas] = useState(0);
  const [rows, setRows] = useState<ReportsTableRow[]>([]);
  const [areaOf, setAreaOf] = useState<Record<number, string>>({});

  const [courseFilter, setCourseFilter] = useState("");
  const [situacaoFilter, setSituacaoFilter] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [dashboardRes, resumesRes, jobsRes] = await Promise.all([
          api.get("users/dashboard/"),
          api.get("users/gestor/resumes/"),
          api.get("users/gestor/jobs/"),
        ]);

        setRelatorio(dashboardRes.data.relatorio_geral);
        setVagasPorEmpresa(dashboardRes.data.detalhamento?.vagas_por_empresa ?? []);
        setVagasAbertas(
          jobsRes.data.filter((job: { is_active: boolean }) => job.is_active).length,
        );

        const areaMap: Record<number, string> = {};
        const tableRows: ReportsTableRow[] = (resumesRes.data as RawResume[]).map((raw) => {
          const resume = parseResume(raw);
          const area = resume.area || resume.curso || "Não informado";
          areaMap[resume.id] = area;
          return {
            id: resume.id,
            name: resume.fullName || resume.username || "Sem nome",
            course: resume.curso || area,
            situacao: resume.situacao || "estudando",
          };
        });

        setAreaOf(areaMap);
        setRows(tableRows);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const courses = useMemo(
    () => [...new Set(rows.map((r) => r.course))].sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesCourse = courseFilter ? row.course === courseFilter : true;
      const matchesSituacao = situacaoFilter ? row.situacao === situacaoFilter : true;
      return matchesCourse && matchesSituacao;
    });
  }, [rows, courseFilter, situacaoFilter]);

  const curriculumsByArea: AreaCount[] = useMemo(() => {
    const counts = new Map<string, number>();
    filteredRows.forEach((row) => {
      const area = areaOf[row.id] || row.course;
      counts.set(area, (counts.get(area) ?? 0) + 1);
    });
    return [...counts.entries()].map(([area, total]) => ({ area, total }));
  }, [filteredRows, areaOf]);

  if (loading) {
    return <p>Carregando relatórios...</p>;
  }

  return (
    <div className="manager-reports">
      <header className="manager-reports-header">
        <h1>Relatórios Gerenciais</h1>
        <p>Acompanhe métricas e indicadores da plataforma</p>
      </header>

      {/* FILTROS */}
      <section className="manager-reports-filters">
        <ReportsFilters
          courses={courses}
          course={courseFilter}
          onCourseChange={setCourseFilter}
          situacao={situacaoFilter}
          onSituacaoChange={setSituacaoFilter}
        />
      </section>

      {/* KPIs */}
      <KPIGrid
        items={[
          { icon: <Users size={40} />, label: "Alunos cadastrados", value: relatorio?.total_alunos ?? 0 },
          { icon: <GraduationCap size={40} />, label: "Currículos", value: relatorio?.total_curriculos ?? 0 },
          { icon: <Building2 size={40} />, label: "Empresas", value: relatorio?.total_empresas ?? 0 },
          { icon: <FileText size={40} />, label: "Vagas cadastradas", value: relatorio?.total_vagas ?? 0 },
          { icon: <BriefcaseBusiness size={40} />, label: "Vagas abertas", value: vagasAbertas },
          { icon: <Briefcase size={40} />, label: "Vagas encerradas", value: (relatorio?.total_vagas ?? 0) - vagasAbertas },
        ]}
      />

      {/* GRÁFICOS */}
      <section className="manager-reports-charts">
        <ChartsSection curriculumsByArea={curriculumsByArea} vagasPorEmpresa={vagasPorEmpresa} />
      </section>

      {/* TABELA */}
      <section className="manager-reports-table">
        <ReportsTable rows={filteredRows} />
      </section>
    </div>
  );
}
