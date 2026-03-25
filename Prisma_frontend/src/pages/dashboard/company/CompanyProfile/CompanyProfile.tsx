import "./CompanyProfile.css";
import {
  Camera,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  AlertTriangle,
} from "lucide-react";

export default function CompanyProfile() {
  return (
    <div className="company-profile">

      {/* HERO */}
      <section className="profile-hero">
        <div className="profile-image-wrapper">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c"
            alt="Empresa"
            className="profile-image"
          />
          <button className="profile-image-button">
            <Camera size={16} />
          </button>
        </div>

        <div className="profile-info">
          <div className="profile-title-row">
            <h2>TechNova Solutions</h2>
            <span className="profile-badge">Premium</span>
          </div>

          <p className="profile-email">contact@technova.com</p>
          <p className="profile-member-since">
            Membro desde 15 de Janeiro, 2024
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
              Informações da Conta
            </h3>

            <button className="profile-edit-btn">
              Editar
            </button>
          </div>

          <div className="profile-card-content">
            <div className="profile-field">
              <span>Razão Social</span>
              <strong>TechNova Solutions Ltda.</strong>
            </div>

            <div className="profile-field">
              <span>CNPJ</span>
              <strong>12.345.678/0001-90</strong>
            </div>

            <div className="profile-field">
              <span>E-mail Administrativo</span>
              <strong>financeiro@technova.com</strong>
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
                <strong>Alterar senha</strong>
                <span>Última alteração há 3 meses</span>
              </div>
              →
            </button>

            <div className="profile-security-info">
              <Shield size={14} />
              Recomendamos a troca de senha a cada 90 dias.
            </div>
          </div>
        </section>

        {/* NOTIFICAÇÕES */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <Bell size={18} />
              Notificações
            </h3>
          </div>

          <div className="profile-notifications">
            <label>
              <span>Notificações por E-mail</span>
              <input type="checkbox" defaultChecked />
            </label>

            <label>
              <span>Notificações no Sistema</span>
              <input type="checkbox" defaultChecked />
            </label>

            <label>
              <span>Alertas de Candidaturas</span>
              <input type="checkbox" />
            </label>
          </div>
        </section>

        {/* AJUDA */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <HelpCircle size={18} />
              Ajuda & Suporte
            </h3>
          </div>

          <div className="profile-help">
            <button>Suporte</button>
            <button>Central de Ajuda</button>
            <button>Termos de Uso</button>
            <button>Privacidade</button>
          </div>
        </section>
      </div>

      {/* ZONA PERIGOSA */}
      <section className="profile-danger">
        <div className="profile-danger-info">
          <AlertTriangle size={20} />
          <div>
            <strong>Gerenciamento de Conta</strong>
            <span>Controle o acesso da empresa na plataforma</span>
          </div>
        </div>

        <div className="profile-danger-actions">
          <button className="logout-btn">
            <LogOut size={16} />
            Sair
          </button>

          <button className="deactivate-btn">
            Desativar Conta
          </button>
        </div>
      </section>

    </div>
  );
}