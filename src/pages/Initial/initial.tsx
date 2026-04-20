import { Link } from "react-router-dom";
import "./initial.css";

export default function Firstlook() {
  return (
    <div className="container">
      <h1>PRISMA</h1>

      <div className="box-container">
        <h2>Selecione seu tipo de usuário</h2>

        <Link
          to="/login"
          state={{ userType: "student" }}
          className="card-select"
        >
          Estudante / Egresso
        </Link>

        <Link
          to="/login"
          state={{ userType: "company" }}
          className="card-select"
        >
          Empresa
        </Link>

        <Link
          to="/login"
          state={{ userType: "manager" }}
          className="card-select"
        >
          Gestor
        </Link>

        <p className="register-link">
          Ainda não tem cadastro?{" "}
          <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}