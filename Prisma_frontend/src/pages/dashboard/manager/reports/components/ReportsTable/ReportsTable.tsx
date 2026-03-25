import "./ReportsTable.css";

export function ReportsTable() {
  return (
    <section className="reports-table">
      <h2 className="table-title">Detalhamento dos Currículos</h2>

      <table>
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Curso</th>
            <th>Status</th>
            <th>Nota</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Maria Silva</td>
            <td>Administração</td>
            <td>Aprovado</td>
            <td>8.5</td>
          </tr>

          <tr>
            <td>João Santos</td>
            <td>TI</td>
            <td>Em análise</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
