import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { View, FileText, ChevronLeft, ChevronRight } from "lucide-react";

import { mockCurriculums } from "../Mocks/mockCurriculums";
import "./ManagerCurriculumList.css";

const ITEMS_PER_PAGE = 10;

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

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCurriculums = useMemo(() => {
    return mockCurriculums.filter((cv) => {
      const matchesSearch = `${cv.name} ${cv.course} ${cv.institution} ${cv.email}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCourse = courseFilter
        ? cv.course === courseFilter
        : true;

      return matchesSearch && matchesCourse;
    });
  }, [search, courseFilter]);

  const totalPages = Math.ceil(
    filteredCurriculums.length / ITEMS_PER_PAGE
  );

  const paginatedCurriculums = filteredCurriculums.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

        <button className="export-btn">
          <FileText size={18} />
          <span>Exportar lista</span>
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
          {[...new Set(mockCurriculums.map((cv) => cv.course))].map(
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

                    {/* DOWNLOAD / PREVIEW PDF */}
                    <button
                      title="Download PDF"
                      onClick={() =>
                        navigate(`/dashboard/gestor/curriculos/${cv.id}/preview`)
                      }
                    >
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
