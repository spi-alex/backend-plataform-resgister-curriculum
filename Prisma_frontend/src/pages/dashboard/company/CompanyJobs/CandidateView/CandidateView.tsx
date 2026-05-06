import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { View, User, ChevronLeft, ChevronRight } from "lucide-react";
// Tente com 5 níveis. Se o VS Code ainda sublinhar, tente 4 ou 6.
import api from "../../../../../services/api";

const ITEMS_PER_PAGE = 10;

// Resolve o erro "Unexpected any" definindo o que vem do seu Serializer Django
interface ResumeDetails {
  full_name: string;
  contact_email: string;
  course: string;
  institution: string;
}

interface CandidateData {
  id: number;
  resume_id: number;
  resume_details: ResumeDetails;
  status: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  course: string;
  institution: string;
  application_id: number;
}

export default function CompanyJobCandidates() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobTitle, setJobTitle] = useState("Carregando...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchCandidates() {
      try {
        setLoading(true);
        // Bate no seu @action do Django
        const response = await api.get(`jobs/${id}/candidates/`);
        setJobTitle(response.data.vaga);

        const mapped: Candidate[] = response.data.candidatos.map(
          (app: CandidateData) => ({
            id: String(app.resume_id),
            application_id: app.id,
            name: app.resume_details?.full_name || "Sem Nome",
            email: app.resume_details?.contact_email || "Sem Email",
            course: app.resume_details?.course || "Não informado",
            institution: app.resume_details?.institution || "IFMA",
          }),
        );

        setCandidates(mapped);
      } catch (error) {
        console.error("Erro ao buscar candidatos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCandidates();
  }, [id]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((cv) => {
      const matchesSearch =
        `${cv.name} ${cv.course} ${cv.institution} ${cv.email}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesCourse = courseFilter ? cv.course === courseFilter : true;
      return matchesSearch && matchesCourse;
    });
  }, [search, courseFilter, candidates]);

  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE);

  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  if (loading) return <div className="loading">Carregando candidatos...</div>;

  return (
    <main className="manager-curriculum-list">
      <nav className="breadcrumbs">
        <span
          onClick={() => navigate("/dashboard/empresa/vagas")}
          style={{ cursor: "pointer" }}
        >
          Vagas
        </span>
        <span> / </span>
        <span>Candidatos</span>
      </nav>

      <header className="page-header">
        <div>
          <h1>Candidatos da Vaga</h1>
          <p>{jobTitle}</p>
        </div>
      </header>

      <section className="filters">
        <input
          type="text"
          placeholder="Buscar..."
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
          <option value="">Todos os Cursos</option>
          {[...new Set(candidates.map((cv) => cv.course))].map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
      </section>

      <section className="table-section">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Curso</th>
              <th>E-mail</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCandidates.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">
                  Nenhum candidato encontrado.
                </td>
              </tr>
            ) : (
              paginatedCandidates.map((cv) => (
                <tr key={cv.application_id}>
                  <td>{cv.name}</td>
                  <td>{cv.course}</td>
                  <td>{cv.email}</td>
                  <td className="actions">
                    <button
                      title="Ver Currículo"
                      onClick={() =>
                        navigate(`/dashboard/empresa/curriculo/${cv.id}`)
                      }
                    >
                      <User size={18} />
                    </button>
                    <button
                      title="Gerenciar"
                      onClick={() =>
                        navigate(
                          `/dashboard/empresa/vagas/${id}/candidatos/${cv.application_id}`,
                        )
                      }
                    >
                      <View size={18} />
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
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </main>
  );
}
