import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../../services/api";
import "./CompanyProfile.css";
import {
  Camera,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  AlertTriangle,
  Save,
  X,
} from "lucide-react";

interface CompanyData {
  name: string;
  email: string;
  cnpj?: string;
  created_at: string;
  logo?: string;
  nome_fantasia?: string;
  area_atuacao?: string;
  telefone?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_cargo?: string;
  responsavel_telefone?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

const fieldInputStyle: CSSProperties = {
  width: "100%",
  padding: "8px",
  marginTop: "4px",
  borderRadius: "4px",
  border: "1px solid #ccc",
};

// Evita repetir o par "span + input ou strong" para cada campo do
// formulário — usado tanto nos dados institucionais quanto no
// responsável e no endereço, que antes nem existiam nessa tela.
function ProfileField({
  label,
  value,
  editing,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="profile-field">
      <span>{label}</span>
      {editing ? (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={fieldInputStyle}
        />
      ) : (
        <strong>{value || "Não cadastrado"}</strong>
      )}
    </div>
  );
}

export default function CompanyProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para gerenciar o modo de edição dos dados
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    nome_fantasia: "",
    area_atuacao: "",
    telefone: "",
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_cargo: "",
    responsavel_telefone: "",
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

  const handleLogout = () => {
    localStorage.removeItem("@Prisma:token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login?reset=true";
  };

  // 1. CARREGAR PERFIL DO BACK-END
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const response = await api.get("companies/me/");
        const data = response.data;

        const mappedData: CompanyData = {
          name: data.name || data.company_name || "Nome não encontrado",
          email: data.email || data.user?.email || "",
          cnpj: data.cnpj || "",
          created_at: data.created_at,
          logo: data.logo,
          nome_fantasia: data.nome_fantasia || "",
          area_atuacao: data.area_atuacao || "",
          telefone: data.telefone || "",
          responsavel_nome: data.responsavel_nome || "",
          responsavel_cpf: data.responsavel_cpf || "",
          responsavel_cargo: data.responsavel_cargo || "",
          responsavel_telefone: data.responsavel_telefone || "",
          cep: data.cep || "",
          rua: data.rua || "",
          numero: data.numero || "",
          bairro: data.bairro || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
        };

        setProfile(mappedData);
        setFormData({
          name: mappedData.name,
          cnpj: mappedData.cnpj || "",
          nome_fantasia: mappedData.nome_fantasia || "",
          area_atuacao: mappedData.area_atuacao || "",
          telefone: mappedData.telefone || "",
          responsavel_nome: mappedData.responsavel_nome || "",
          responsavel_cpf: mappedData.responsavel_cpf || "",
          responsavel_cargo: mappedData.responsavel_cargo || "",
          responsavel_telefone: mappedData.responsavel_telefone || "",
          cep: mappedData.cep || "",
          rua: mappedData.rua || "",
          numero: mappedData.numero || "",
          bairro: mappedData.bairro || "",
          cidade: mappedData.cidade || "",
          estado: mappedData.estado || "",
        });
      } catch (error: unknown) {
        console.error("Erro ao carregar perfil:", error);
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

  // 2. ENVIAR ATUALIZAÇÃO DO PERFIL
  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      alert("O nome da instituição não pode ficar em branco.");
      return;
    }

    setEditLoading(true);
    try {
      // Faz o patch enviando os dados novos para o Django
      const response = await api.patch("companies/me/", formData);
      const data = response.data;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: data.name || data.company_name || formData.name,
              cnpj: data.cnpj || formData.cnpj,
              nome_fantasia: data.nome_fantasia ?? formData.nome_fantasia,
              area_atuacao: data.area_atuacao ?? formData.area_atuacao,
              telefone: data.telefone ?? formData.telefone,
              responsavel_nome: data.responsavel_nome ?? formData.responsavel_nome,
              responsavel_cpf: data.responsavel_cpf ?? formData.responsavel_cpf,
              responsavel_cargo: data.responsavel_cargo ?? formData.responsavel_cargo,
              responsavel_telefone: data.responsavel_telefone ?? formData.responsavel_telefone,
              cep: data.cep ?? formData.cep,
              rua: data.rua ?? formData.rua,
              numero: data.numero ?? formData.numero,
              bairro: data.bairro ?? formData.bairro,
              cidade: data.cidade ?? formData.cidade,
              estado: data.estado ?? formData.estado,
            }
          : null,
      );

      setIsEditing(false);
      alert("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      alert("Não foi possível salvar as alterações.");
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">Carregando dados da empresa...</div>
    );
  }

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
        {/* INFORMAÇÕES DA INSTITUIÇÃO (EDITÁVEL) */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <Shield size={18} />
              Informações da Instituição
            </h3>

            {!isEditing ? (
              <button
                className="profile-edit-btn"
                onClick={() => setIsEditing(true)}
              >
                Editar Dados
              </button>
            ) : (
              <div
                className="profile-edit-actions"
                style={{ display: "flex", gap: "8px" }}
              >
                <button
                  className="profile-save-btn"
                  onClick={handleSaveProfile}
                  disabled={editLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "var(--primary-color)",
                    color: "#fff",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <Save size={14} />
                  {editLoading ? "Salvando..." : "Salvar"}
                </button>
                <button
                  className="profile-cancel-btn"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: profile?.name || "",
                      cnpj: profile?.cnpj || "",
                      nome_fantasia: profile?.nome_fantasia || "",
                      area_atuacao: profile?.area_atuacao || "",
                      telefone: profile?.telefone || "",
                      responsavel_nome: profile?.responsavel_nome || "",
                      responsavel_cpf: profile?.responsavel_cpf || "",
                      responsavel_cargo: profile?.responsavel_cargo || "",
                      responsavel_telefone: profile?.responsavel_telefone || "",
                      cep: profile?.cep || "",
                      rua: profile?.rua || "",
                      numero: profile?.numero || "",
                      bairro: profile?.bairro || "",
                      cidade: profile?.cidade || "",
                      estado: profile?.estado || "",
                    });
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#f3f4f6",
                    border: "1px solid #d1d5db",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="profile-card-content">
            <ProfileField
              label="Razão Social / Nome"
              value={formData.name}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, name: v })}
            />
            <ProfileField
              label="Nome Fantasia"
              value={formData.nome_fantasia}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, nome_fantasia: v })}
            />
            <ProfileField
              label="CNPJ"
              value={formData.cnpj}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, cnpj: v })}
            />
            <ProfileField
              label="Área de atuação"
              value={formData.area_atuacao}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, area_atuacao: v })}
            />
            <ProfileField
              label="Telefone"
              value={formData.telefone}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, telefone: v })}
              placeholder="(99) 99999-9999"
            />

            <div className="profile-field">
              <span>E-mail Corporativo</span>
              {/* O e-mail geralmente fica travado por ser a identidade da conta do usuário */}
              <strong style={{ color: "#666" }}>{profile?.email}</strong>
            </div>
          </div>
        </section>

        {/* RESPONSÁVEL PELO CADASTRO */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <Shield size={18} />
              Responsável pelo Cadastro
            </h3>
          </div>
          <div className="profile-card-content">
            <ProfileField
              label="Nome do responsável"
              value={formData.responsavel_nome}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, responsavel_nome: v })}
            />
            <ProfileField
              label="CPF do responsável"
              value={formData.responsavel_cpf}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, responsavel_cpf: v })}
              placeholder="000.000.000-00"
            />
            <ProfileField
              label="Cargo"
              value={formData.responsavel_cargo}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, responsavel_cargo: v })}
            />
            <ProfileField
              label="Telefone do responsável"
              value={formData.responsavel_telefone}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, responsavel_telefone: v })}
              placeholder="(99) 99999-9999"
            />
          </div>
        </section>

        {/* ENDEREÇO */}
        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <Shield size={18} />
              Endereço
            </h3>
          </div>
          <div className="profile-card-content">
            <ProfileField
              label="CEP"
              value={formData.cep}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, cep: v })}
              placeholder="00000-000"
            />
            <ProfileField
              label="Rua"
              value={formData.rua}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, rua: v })}
            />
            <ProfileField
              label="Número"
              value={formData.numero}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, numero: v })}
            />
            <ProfileField
              label="Bairro"
              value={formData.bairro}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, bairro: v })}
            />
            <ProfileField
              label="Cidade"
              value={formData.cidade}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, cidade: v })}
            />
            <ProfileField
              label="Estado"
              value={formData.estado}
              editing={isEditing}
              onChange={(v) => setFormData({ ...formData, estado: v })}
            />
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
            <button
              className="profile-security-btn"
              onClick={() => navigate("/esqueci-senha")}
            >
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
