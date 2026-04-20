import { useParams, useNavigate } from "react-router-dom";
import { jobsMock } from "../../manager/jobs/Mocks/JobsMock";


export default function StudentJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const job = jobsMock.find((j) => j.id === id);

  // Ação de candidatura
  const handleApply = () => {
    alert("Candidatura realizada");
  };

  if (!job) {
    return (
      <main className="jobdetails-container">
        <h2>Vaga não encontrada</h2>
        <button onClick={() => navigate("/dashboard/aluno/vagas")}>
          Voltar
        </button>
      </main>
    );
  }

  return (
    <main className="jobdetails-container">
      
      {/* Breadcrumb */}
      <nav className="jd-breadcrumb">
        <span onClick={() => navigate("/dashboard/aluno/vagas")}>
          Vagas
        </span>
        <span className="arrow">›</span>
        <span className="active">{job.titulo}</span>
      </nav>

      {/* Hero Card */}
      <section className="jd-hero">
        <div className="jd-hero-left">
          <div className="jd-badges">
            <span className={`jd-status ${job.status}`}>
              {job.status === "aberta" ? "Ativa" : "Encerrada"}
            </span>
            <span className="jd-contract">{job.tipoContrato}</span>
          </div>

          <h1>{job.titulo}</h1>

          <p className="jd-subtitle">
            {job.empresa} • {job.local}
          </p>
        </div>

        <div className="jd-hero-right">
          <span className="jd-deadline-label">Publicada em</span>
          <span className="jd-deadline-date">
            {job.dataPublicacao}
          </span>
        </div>

        <div className="jd-hero-actions">
          {job.status === "aberta" && (
            <button
              className="jd-primary-btn"
              onClick={handleApply}
            >
              Candidatar-se
            </button>
          )}

          <button
            className="jd-outline-btn"
            onClick={() => navigate("/dashboard/aluno/vagas")}
          >
            Voltar
          </button>
        </div>
      </section>

      {/* GRID */}
      <div className="jd-grid">
        
        {/* Coluna Esquerda */}
        <div className="jd-left">

          <div className="jd-card">
            <h3>Descrição</h3>
            <p>{job.descricao}</p>
          </div>

          <div className="jd-card">
            <h3>Informações da Vaga</h3>
            <ul>
              <li><strong>Nível:</strong> {job.nivel}</li>
              <li><strong>Área:</strong> {job.area}</li>
              <li><strong>Contrato:</strong> {job.tipoContrato}</li>
              {job.salario && (
                <li><strong>Salário:</strong> {job.salario}</li>
              )}
            </ul>
          </div>

          

        </div>

        {/* Coluna Direita */}
        <div className="jd-right">

          <div className="jd-card">
            <h3>Informações Básicas</h3>
            <div className="jd-info-block">
              <span>Área</span>
              <strong>{job.area}</strong>
            </div>
            <div className="jd-info-block">
              <span>Contrato</span>
              <strong>{job.tipoContrato}</strong>
            </div>
            <div className="jd-info-block">
              <span>Localização</span>
              <strong>{job.local}</strong>
            </div>
          </div>

          <div className="jd-card">
            <h3>Adicionais</h3>
            <div className="jd-info-row">
              <span>Candidatos</span>
              <strong>{job.candidatos}</strong>
            </div>
            <div className="jd-info-row">
              <span>Empresa</span>
              <strong>{job.empresa}</strong>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
