import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { View, FileText, ChevronLeft, ChevronRight } from "lucide-react";

import api from "../../../../../services/api";
import type { RawResume } from "../../../../../utils/resume";
import { parseResume, downloadResumePdf } from "../../../../../utils/resume";
import "./ManagerCurriculumList.css";

const ITEMS_PER_PAGE = 10;

interface CurriculumRow {
  id: number;
  name: string;
  course: string;
  institution: string;
  email: string;
}

function getPaginationPages(
  current: number,
  total: number,
  visible = 4
): (number | string)[] {
  const pages: (number | string)[] = [];

  if (total <= visible) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  let start = current - (visible - 1);
  if (start < 1) start = 1;
  if (start + visible - 1 > total) start = total - visible + 1;

  for (let i = start; i < start + visible; i++) {
    pages.push(i);
  }

  if (start + visible - 1 < total) {
    pages.push("...");
    pages.push(total);
  }

  return pages;
}

export default function ManagerCurriculumList() {
  const navigate = useNavigate();

  const [curriculums, setCurriculums] = useState<CurriculumRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadResumes() {
      try {
        setLoading(true);
        const response = await api.get("users/gestor/resumes/");
        const rows: CurriculumRow[] = (response.data as RawResume[]).map((raw) => {
          const resume = parseResume(raw);
          const institution = resume.education?.[0]?.institution || "Não informado";
          return {
            id: resume.id,
            name: resume.fullName || resume.username || "Sem nome",
            course: resume.curso || resume.area || "Não informado",
            institution,
            email: resume.email || "Sem e-mail",
          };
        });
        setCurriculums(rows);
      } catch (error) {
        console.error("Erro ao carregar currículos:", error);
      } finally {
        setLoading(false);
      }
    }

    loadResumes();
  }, []);

  const filteredCurriculums = useMemo(() => {
    return curriculums.filter((cv) => {
      const matchesSearch = `${cv.name} ${cv.course} ${cv.institution} ${cv.email}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCourse = courseFilter ? cv.course === courseFilter : true;

      return matchesSearch && matchesCourse;
    });
  }, [curriculums, search, courseFilter]);

  const totalPages = Math.ceil(filteredCurriculums.length / ITEMS_PER_PAGE);

  const paginatedCurriculums = filteredCurriculums.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  async function handleDownload(cv: CurriculumRow) {
    try {
      await downloadResumePdf(cv.id, `curriculo_${cv.name}.pdf`);
    } catch {
      alert("Não foi possível baixar este currículo.");
    }
  }

  async function handleExportList() {
    if (filteredCurriculums.length === 0) {
      alert("Nenhum currículo para exportar com os filtros atuais.");
      return;
    }

    setExporting(true);
    try {
      const response = await api.post(
        "resumes/gestor/export-zip/",
        { resume_ids: filteredCurriculums.map((cv) => cv.id) },
        { responseType: "blob" },
      );

      const zipBlob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "curriculos_exportados.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar currículos:", error);
      alert("Não foi possível exportar os currículos selecionados.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <p>Carregando currículos...</p>;
  }

  return (
    <main className="manager-curriculum-list">

      <nav className="breadcrumbs">
        <span onClick={() => navigate("/dashboard/gestor")}>
          Início
        </span>
        <span> / </span>
        <span>Currículos</span>
      </nav>

      <header className="page-header">
        <div>
          <h1>Currículos Cadastrados</h1>
          <p>Lista geral de currículos disponíveis no sistema.</p>
        </div>

        <button className="export-btn" onClick={handleExportList} disabled={exporting}>
          <FileText size={18} />
          <span>{exporting ? "Exportando..." : "Exportar lista (.zip)"}</span>
        </button>
      </header>

      <section className="filters">
        <input
          type="text"
          placeholder="Buscar por nome, curso, instituição ou e-mail..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <select
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">Filtrar por Curso</option>
          {[...new Set(curriculums.map((cv) => cv.course))].map(
            (course) => (
              <option key={course} value={course}>
                {course}
              </option>
            )
          )}
        </select>
      </section>

      <section className="table-section">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Curso</th>
              <th>Instituição</th>
              <th>E-mail</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCurriculums.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  Nenhum currículo encontrado.
                </td>
              </tr>
            ) : (
              paginatedCurriculums.map((cv) => (
                <tr key={cv.id}>
                  <td>{cv.name}</td>
                  <td>{cv.course}</td>
                  <td>{cv.institution}</td>
                  <td>{cv.email}</td>
                  <td className="actions">

                    {/* VISUALIZAR */}
                    <button
                      title="Visualizar"
                      onClick={() =>
                        navigate(`/dashboard/gestor/curriculo/${cv.id}`)
                      }
                    >
                      <View size={18} />
                    </button>

                    {/* DOWNLOAD PDF */}
                    <button title="Download PDF" onClick={() => handleDownload(cv)}>
                      <FileText size={18} />
                    </button>

                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() =>
              setCurrentPage((prev) => prev - 1)
            }
          >
            <ChevronLeft size={18} />
          </button>

          {getPaginationPages(currentPage, totalPages).map(
            (page, index) =>
              page === "..." ? (
                <span key={`dots-${index}`} className="dots">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  className={
                    page === currentPage ? "active" : ""
                  }
                  onClick={() =>
                    setCurrentPage(page as number)
                  }
                >
                  {page}
                </button>
              )
          )}

          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => prev + 1)
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </main>
  );
}
