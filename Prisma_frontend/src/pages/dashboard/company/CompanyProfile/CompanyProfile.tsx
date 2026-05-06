import { useEffect, useState } from "react";
// Import ajustado para os 5 níveis que funcionaram no CandidateView
import api from "../../../../services/api";
import "./CompanyProfile.css";
import {
  Camera,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  AlertTriangle,
} from "lucide-react";

interface CompanyData {
  name: string;
  email: string;
  cnpj?: string;
  created_at: string;
  logo?: string;
}

export default function CompanyProfile() {
  const [profile, setProfile] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("@Prisma:token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login?reset=true";
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const response = await api.get("companies/me/");

        const data = response.data;
        setProfile({
          name: data.name || data.company_name || "Nome não encontrado",
          email: data.email || data.user?.email || "",
          cnpj: data.cnpj,
          created_at: data.created_at,
          logo: data.logo,
        });
      } catch (error: unknown) {
        console.error("Erro ao carregar perfil:", error);

        // Verificação de tipo segura para substituir o 'any'
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error
        ) {
          const axiosError = error as { response?: { status: number } };
          if (axiosError.response?.status === 401) {
            handleLogout();
          }
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading)
    return (
      <div className="loading-container">Carregando dados da empresa...</div>
    );

  return (
    <div className="company-profile">
      {/* HERO */}
      <section className="profile-hero">
        <div className="profile-image-wrapper">
          <img
            src={
              profile?.logo ||
              "https://images.unsplash.com/photo-1497366216548-37526070297c"
            }
            alt={profile?.name}
            className="profile-image"
          />
          <button className="profile-image-button" title="Alterar Logo">
            <Camera size={16} />
          </button>
        </div>

        <div className="profile-info">
          <div className="profile-title-row">
            <h2>{profile?.name}</h2>
            <span className="profile-badge">Empresa Parceira</span>
          </div>

          <p className="profile-email">{profile?.email}</p>
          <p className="profile-member-since">
            Membro desde{" "}
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString("pt-BR")
              : "---"}
          </p>
        </div>
      </section>

      {/* GRID */}
      <div className="profile-grid">
        {/* INFORMAÇÕES */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <Shield size={18} />
              Informações da Instituição
            </h3>
            <button className="profile-edit-btn">Editar Dados</button>
          </div>

          <div className="profile-card-content">
            <div className="profile-field">
              <span>Razão Social / Nome</span>
              <strong>{profile?.name}</strong>
            </div>

            <div className="profile-field">
              <span>CNPJ</span>
              <strong>{profile?.cnpj || "Não cadastrado"}</strong>
            </div>

            <div className="profile-field">
              <span>E-mail Corporativo</span>
              <strong>{profile?.email}</strong>
            </div>
          </div>
        </section>

        {/* SEGURANÇA */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <Shield size={18} />
              Segurança
            </h3>
          </div>
          <div className="profile-security">
            <button className="profile-security-btn">
              <div>
                <strong>Alterar senha de acesso</strong>
                <span>Recomendamos trocar a cada 90 dias</span>
              </div>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* NOTIFICAÇÕES */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <Bell size={18} />
              Preferências
            </h3>
          </div>
          <div className="profile-notifications">
            <label className="switch-label">
              <span>Receber novos currículos por e-mail</span>
              <input type="checkbox" defaultChecked />
            </label>
            <label className="switch-label">
              <span>Alertas de sistema</span>
              <input type="checkbox" defaultChecked />
            </label>
          </div>
        </section>

        {/* AJUDA */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <HelpCircle size={18} />
              Suporte Técnico
            </h3>
          </div>
          <div className="profile-help">
            <p>Precisa de ajuda com as vagas ou candidatos?</p>
            <button className="secondary-btn">Abrir Chamado</button>
          </div>
        </section>
      </div>

      {/* ZONA DE LOGOUT */}
      <section className="profile-danger">
        <div className="profile-danger-info">
          <AlertTriangle size={20} />
          <div>
            <strong>Sessão e Acesso</strong>
            <span>Desconecte-se com segurança do sistema PRISMA</span>
          </div>
        </div>

        <div className="profile-danger-actions">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Finalizar Sessão
          </button>
        </div>
      </section>
    </div>
  );
}
