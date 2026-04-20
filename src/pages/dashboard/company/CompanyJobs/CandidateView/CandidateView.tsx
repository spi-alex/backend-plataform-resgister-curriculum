import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { View, FileText, ChevronLeft, ChevronRight } from "lucide-react";


import { mockCurriculums } from "../../../manager/Curriculums/Mocks/mockCurriculums"
import { jobsMock } from "../../../manager/jobs/Mocks/JobsMock";



const ITEMS_PER_PAGE = 10;

type Candidate = {
  id: string;
  name: string;
  email: string;
  course: string;
  institution: string;
};


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


export default function CompanyJobCandidates() {
  const navigate = useNavigate();
  const { id } = useParams();


  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);


  const [candidates, setCandidates] = useState<Candidate[]>([]);


  const job = jobsMock.find((j) => j.id === id);


  useEffect(() => {
    if (!id) return;


    const simulatedCandidates: Candidate[] = mockCurriculums.map((cv) => ({
      id: cv.id,
      name: cv.name,
      email: cv.email,
      course: cv.course,
      institution: cv.institution,
    }));


    setCandidates(simulatedCandidates);


    /*
    async function fetchCandidates() {
      try {
        const response = await api.get(`/jobs/${id}/candidates`);
        setCandidates(response.data);
      } catch (error) {
        console.error(error);
      }
    }


    fetchCandidates();
    */
  }, [id]);


  const filteredCandidates = useMemo(() => {
    return candidates.filter((cv) => {
      const matchesSearch = `${cv.name} ${cv.course} ${cv.institution} ${cv.email}`
        .toLowerCase()
        .includes(search.toLowerCase());


      const matchesCourse = courseFilter
        ? cv.course === courseFilter
        : true;


      return matchesSearch && matchesCourse;
    });
  }, [search, courseFilter, candidates]);


  const totalPages = Math.ceil(
    filteredCandidates.length / ITEMS_PER_PAGE
  );


  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


  return (
    <main className="manager-curriculum-list">


      <nav className="breadcrumbs">
        <span onClick={() => navigate("/dashboard/empresa/vagas")}>
          Vagas
        </span>
        <span> / </span>
        <span>Candidatos</span>
      </nav>


      <header className="page-header">
        <div>
          <h1>Candidatos da Vaga</h1>
          <p>
            {job
              ? `Candidatos para: ${job.titulo}`
              : "Lista de candidatos"}
          </p>
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
          {[...new Set(candidates.map((cv) => cv.course))].map(
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
            {paginatedCandidates.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  Nenhum candidato encontrado.
                </td>
              </tr>
            ) : (
              paginatedCandidates.map((cv) => (
                <tr key={cv.id}>
                  <td>{cv.name}</td>
                  <td>{cv.course}</td>
                  <td>{cv.institution}</td>
                  <td>{cv.email}</td>
                  <td className="actions">


                    <button
                      title="Visualizar"
                      onClick={() =>
                        navigate(`/dashboard/empresa/curriculo/${cv.id}`)
                      }
                    >
                      <View size={18} />
                    </button>


                    <button
                      title="Download PDF"
                      onClick={() =>
                        navigate(`/dashboard/empresa/curriculos/${cv.id}/preview`)
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

