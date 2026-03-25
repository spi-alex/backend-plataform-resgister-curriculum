import { Link } from "react-router-dom";
import "./SelectUserType.css";

export default function SelectUserType() {
  return (
    <div className="container">
      <h1>PRISMA</h1>

      <div className="box-container">
        <h2>Selecione o tipo de cadastro</h2>

        <Link to="/cadastro/estudante" className="card-select">
          Estudante / Egresso
        </Link>

        <Link to="/cadastro/empresa" className="card-select">
          Empresa
        </Link>
      </div>
    </div>
  );
}
