import "./ReportsFilters.css";

export function ReportsFilters() {
  return (
    <section className="reports-filters">
      <select>
        <option>Todos os cursos</option>
        <option>Administração</option>
        <option>TI</option>
        <option>Edificações</option>
      </select>

      <select>
        <option>Todos os status</option>
        <option>Aprovado</option>
        <option>Em análise</option>
        <option>Reprovado</option>
      </select>
    </section>
  );
}
