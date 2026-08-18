import "./ReportsFilters.css";

interface ReportsFiltersProps {
  courses: string[];
  course: string;
  onCourseChange: (course: string) => void;
  situacao: string;
  onSituacaoChange: (situacao: string) => void;
}

export function ReportsFilters({
  courses,
  course,
  onCourseChange,
  situacao,
  onSituacaoChange,
}: ReportsFiltersProps) {
  return (
    <section className="reports-filters">
      <select value={course} onChange={(e) => onCourseChange(e.target.value)}>
        <option value="">Todos os cursos</option>
        {courses.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select value={situacao} onChange={(e) => onSituacaoChange(e.target.value)}>
        <option value="">Todas as situações</option>
        <option value="estudando">Estudando</option>
        <option value="concluido">Concluído</option>
      </select>
    </section>
  );
}
