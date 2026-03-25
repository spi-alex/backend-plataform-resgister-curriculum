import { useNavigate } from "react-router-dom";
import "./StudentHome.css";

export default function StudentHome() {
  const navigate = useNavigate();

  const handleCreateCurriculum = () => {
    navigate("/dashboard/aluno/curriculo");
  };

  return (
    <div className="student-home">
      <div className="home-header">
        <h1>Dashboard</h1>
        <p>Gerencie seu currículo e acompanhe suas oportunidades.</p>
      </div>

      <div className="empty-card">
        <div className="empty-icon">
          <div className="icon-circle">
            <span className="material-symbols-outlined">
              person_search
            </span>
          </div>
          <div className="icon-add">
            <span className="material-symbols-outlined">
              add
            </span>
          </div>
        </div>

        <h2>Você ainda não possui currículo cadastrado.</h2>

        <p>
          Crie seu currículo agora para aumentar suas chances de conseguir
          uma oportunidade no mercado de trabalho e ser visto pelo gestor.
        </p>

        <div className="empty-actions">
          <button
            className="primary-btn"
            onClick={handleCreateCurriculum}
          >
            Criar Currículo
          </button>

          <button className="secondary-link">
            Saiba por que manter seu currículo atualizado
          </button>
        </div>
      </div>
    </div>
  );
}