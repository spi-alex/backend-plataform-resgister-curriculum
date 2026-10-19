import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../services/api";
import "./StudentHome.css";
import { FileText, UserSearch, Plus } from "lucide-react";

export default function StudentHome() {
  const navigate = useNavigate();
  const [hasCurriculum, setHasCurriculum] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkCurriculum() {
      // O cabeçalho Authorization é montado pelo interceptor de `api`
      // (services/api.ts) a partir do token em memória. Antes esta função
      // lia `localStorage.getItem("access_token")` e montava o header à
      // mão — duplicando a lógica e prendendo o token ao localStorage.
      try {
        const response = await api.get("/resumes/");

        // Se o array vier com itens, o usuário já tem currículo cadastrado
        if (response.data && response.data.length > 0) {
          setHasCurriculum(true);
        } else {
          setHasCurriculum(false);
        }
      } catch (error) {
        console.error("Erro ao verificar currículo:", error);
        setHasCurriculum(false);
      } finally {
        setLoading(false);
      }
    }

    checkCurriculum();
  }, []);

  // Navegação usando caminhos baseados na estrutura do seu sistema de rotas
  const handleCreateCurriculum = () => {
    navigate("/dashboard/aluno/curriculo");
  };

  const handleViewCurriculum = () => {
    // CORREÇÃO: Caso a rota absoluta quebre a sessão, você pode usar o caminho exato
    // Certifique-se de que no seu arquivo de rotas (Ex: App.tsx) o path seja exatamente este.
    navigate("/dashboard/aluno/curriculo/view");
  };

  if (loading) {
    return (
      <div
        className="student-home"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <p>Carregando dados do painel...</p>
      </div>
    );
  }

  return (
    <div className="student-home">
      <div className="home-header">
        <h1>Dashboard</h1>
        <p>Gerencie seu currículo e acompanhe suas oportunidades.</p>
      </div>

      {hasCurriculum ? (
        /* ESTADO: JÁ POSSUI CURRÍCULO */
        <div className="empty-card">
          <div className="empty-icon">
            <div className="icon-circle" style={{ backgroundColor: "#e8f5e9" }}>
              <FileText size={28} color="#2e7d32" />
            </div>
          </div>
          <h2>Seu currículo está ativo!</h2>
          <p>
            Você já possui um currículo cadastrado. Você pode visualizá-lo,
            baixar o PDF ou atualizar suas informações a qualquer momento.
          </p>
          <div className="empty-actions">
            <button className="primary-btn" onClick={handleViewCurriculum}>
              Visualizar Currículo
            </button>
            <button className="secondary-link" onClick={handleCreateCurriculum}>
              Editar Informações
            </button>
          </div>
        </div>
      ) : (
        /* ESTADO: NÃO POSSUI */
        <div className="empty-card">
          <div className="empty-icon">
            <div className="icon-circle">
              <UserSearch size={28} />
            </div>
            <div className="icon-add">
              <Plus size={16} />
            </div>
          </div>

          <h2>Você ainda não possui currículo cadastrado.</h2>

          <p>
            Crie seu currículo agora para aumentar suas chances de conseguir uma
            oportunidade no mercado de trabalho e ser visto pelo gestor.
          </p>

          <div className="empty-actions">
            <button className="primary-btn" onClick={handleCreateCurriculum}>
              Criar Currículo
            </button>
            <button className="secondary-link">
              Saiba por que manter seu currículo atualizado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
