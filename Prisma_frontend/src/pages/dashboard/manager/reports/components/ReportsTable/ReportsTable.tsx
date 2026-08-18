import "./ReportsTable.css";

export interface ReportsTableRow {
  id: number;
  name: string;
  course: string;
  situacao: string;
}

interface ReportsTableProps {
  rows: ReportsTableRow[];
}

const SITUACAO_LABEL: Record<string, string> = {
  estudando: "Estudando",
  concluido: "Concluído",
};

export function ReportsTable({ rows }: ReportsTableProps) {
  return (
    <section className="reports-table">
      <h2 className="table-title">Detalhamento dos Currículos</h2>

      <table>
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Curso</th>
            <th>Situação</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3}>Nenhum currículo encontrado.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.course}</td>
                <td>{SITUACAO_LABEL[row.situacao] || row.situacao || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
