import {
  Plus,
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
import { useState } from "react";

import KPIGrid from "../components/KPIs/KPIGrid";
import "./ManagerHome.css";

interface Curriculum {
  id: number;
  name: string;
  email: string;
  course: string;
}

export default function ManagerHome() {
  const [search, setSearch] = useState("");

  const curriculums: Curriculum[] = [
    { id: 1, name: "João Silva", email: "joao@email.com", course: "Engenharia" },
    {
      id: 2,
      name: "Maria Oliveira",
      email: "maria@email.com",
      course: "Administração",
    },
    {
      id: 3,
      name: "Lucas Pereira",
      email: "lucas@email.com",
      course: "Sistemas de Informação",
    },
  ];

  const filteredCurriculums = curriculums.filter((cv) =>
    `${cv.name} ${cv.email} ${cv.course}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <>
   {/* KPIs */}
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
      value: curriculums.length,
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

      {/* BLOCO DE VAGAS */}
      <section className="vacancy-banner">
        <div className="vacancy-text">
          <h2>Gerencie suas vagas</h2>
          <p>Crie, edite e acompanhe vagas disponíveis para alunos e egressos.</p>
        </div>

        <div className="vacancy-actions">
          <button onClick={() => alert("Cadastro de vaga – em breve")}>
            <Plus size={18} />
            <span>Cadastrar vaga</span>
          </button>

          <button onClick={() => alert("Lista de vagas – em breve")}>
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
            onClick={() =>
              alert("Download de todos os currículos (.zip) – em breve")
            }
          >
            <Download size={16} />
            <span>Baixar todos (.zip)</span>
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
                  onClick={() =>
                    window.open(
                      `/dashboard/gestor/curriculo/${cv.id}`,
                      "_blank"
                    )
                  }
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
