import {
  List,
  Search,
  Download,
  Users,
  GraduationCap,
  Building2,
  BriefcaseBusiness,
  Briefcase,
  FileText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../../../services/api";
import type { RawResume } from "../../../../utils/resume";
import { parseResume } from "../../../../utils/resume";
import KPIGrid from "../components/KPIs/KPIGrid";
import "./ManagerHome.css";

interface RelatorioGeral {
  total_alunos: number;
  total_empresas: number;
  total_vagas: number;
  total_curriculos: number;
}

interface Curriculum {
  id: number;
  name: string;
  email: string;
  course: string;
}

export default function ManagerHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [relatorio, setRelatorio] = useState<RelatorioGeral | null>(null);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [vagasAbertas, setVagasAbertas] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [dashboardRes, resumesRes, jobsRes] = await Promise.all([
          api.get("users/dashboard/"),
          api.get("users/gestor/resumes/"),
          api.get("users/gestor/jobs/"),
        ]);

        setRelatorio(dashboardRes.data.relatorio_geral);
        setVagasAbertas(
          jobsRes.data.filter((job: { is_active: boolean }) => job.is_active).length,
        );

        const parsed: Curriculum[] = (resumesRes.data as RawResume[])
          .map((raw) => {
            const resume = parseResume(raw);
            return {
              id: resume.id,
              name: resume.fullName || resume.username || "Sem nome",
              email: resume.email || "Sem e-mail",
              course: resume.curso || resume.area || "Não informado",
            };
          })
          // Mais recentes primeiro (o backend já ordena, mas garantimos aqui)
          .reverse()
          .slice(0, 3);

        setCurriculums(parsed);
      } catch (error) {
        console.error("Erro ao carregar dashboard do gestor:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const filteredCurriculums = curriculums.filter((cv) =>
    `${cv.name} ${cv.email} ${cv.course}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) {
    return <p>Carregando painel do gestor...</p>;
  }

  return (
    <>
      {/* KPIs */}
      <KPIGrid
        items={[
          {
            icon: <Users size={40} />,
            label: "Alunos cadastrados",
            value: relatorio?.total_alunos ?? 0,
          },
          {
            icon: <GraduationCap size={40} />,
            label: "Currículos",
            value: relatorio?.total_curriculos ?? 0,
          },
          {
            icon: <Building2 size={40} />,
            label: "Empresas",
            value: relatorio?.total_empresas ?? 0,
          },
          {
            icon: <FileText size={40} />,
            label: "Vagas cadastradas",
            value: relatorio?.total_vagas ?? 0,
          },
          {
            icon: <BriefcaseBusiness size={40} />,
            label: "Vagas abertas",
            value: vagasAbertas,
          },
          {
            icon: <Briefcase size={40} />,
            label: "Vagas encerradas",
            value: (relatorio?.total_vagas ?? 0) - vagasAbertas,
          },
        ]}
      />

      {/* BLOCO DE VAGAS */}
      <section className="vacancy-banner">
        <div className="vacancy-text">
          <h2>Gerencie as vagas</h2>
          <p>Acompanhe as vagas cadastradas pelas empresas parceiras.</p>
        </div>

        <div className="vacancy-actions">
          <button onClick={() => navigate("/dashboard/gestor/vagas")}>
            <List size={18} />
            <span>Ver vagas</span>
          </button>
        </div>
      </section>

      {/* CURRÍCULOS */}
      <section className="curriculums-box">
        <header className="curriculums-header">
          <h2>Currículos cadastrados recentemente</h2>
          <p>Visualize e acesse os currículos enviados por alunos e egressos</p>
        </header>

        <div className="manager-actions">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por nome, email ou curso"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="download-all-btn"
            onClick={() => navigate("/dashboard/gestor/curriculos")}
          >
            <Download size={16} />
            <span>Ver todos os currículos</span>
          </button>
        </div>

        <div className="curriculum-table-header">
          <span>Nome</span>
          <span>Curso</span>
          <span>Email</span>
          <span>Ação</span>
        </div>

        <div className="curriculum-list">
          {filteredCurriculums.length === 0 ? (
            <p className="empty">Nenhum currículo encontrado.</p>
          ) : (
            filteredCurriculums.map((cv) => (
              <div key={cv.id} className="curriculum-item">
                <span className="cv-name">{cv.name}</span>
                <span className="cv-course">{cv.course}</span>
                <span className="cv-email">{cv.email}</span>

                <button
                  onClick={() => navigate(`/dashboard/gestor/curriculo/${cv.id}`)}
                >
                  Abrir
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
