import "./Profile.css";
import {
  Camera,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";


export default function Profile() {
  const tipo = localStorage.getItem("userTipo");


  const isEmpresa = tipo === "empresa";
  const isAluno = tipo === "aluno";
  const isGestor = tipo === "gestor";


  const navigate = useNavigate();


  const fileInputRef = useRef(null);


  const [showModal, setShowModal] = useState(false);


  const [user, setUser] = useState({
    nome: "",
    email: "",
    foto: "",
  });


  const handleSelectImage = () => {
    fileInputRef.current.click();
  };


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;


    const imageUrl = URL.createObjectURL(file);


    setUser((prev) => ({
      ...prev,
      foto: imageUrl,
    }));
  };


  const handleLogout = () => {
    localStorage.removeItem("userTipo");
    navigate("/");
  };


  const handleDeactivate = () => {
    setShowModal(true);
  };


  const confirmDeactivate = () => {
    localStorage.removeItem("userTipo");
    setShowModal(false);
    navigate("/");
  };


  return (
    <div className="company-profile">
      <section className="profile-hero">
        <div className="profile-image-wrapper">
          <img
            src={
              user.foto ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png"
            }
            alt="Perfil"
            className="profile-image"
          />


          <button
            className="profile-image-button"
            onClick={handleSelectImage}
          >
            <Camera size={16} />
          </button>


          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            style={{ display: "none" }}
          />
        </div>


        <div className="profile-info">
          <div className="profile-title-row">
            <h2>{user.nome || "Nome"}</h2>
          </div>


          <p className="profile-email">
            {user.email || "email@exemplo.com"}
          </p>


          <p className="profile-member-since">
            Membro desde —
          </p>
        </div>
      </section>


      <div className="profile-grid">
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
            {isEmpresa && (
              <>
                <div className="profile-field">
                  <span>Razão Social</span>
                  <strong>{user.nome || "—"}</strong>
                </div>
                <div className="profile-field">
                  <span>CNPJ</span>
                  <strong>—</strong>
                </div>
                <div className="profile-field">
                  <span>E-mail Administrativo</span>
                  <strong>{user.email || "—"}</strong>
                </div>
              </>
            )}


            {isAluno && (
              <>
                <div className="profile-field">
                  <span>Nome</span>
                  <strong>{user.nome || "—"}</strong>
                </div>
                <div className="profile-field">
                  <span>Curso</span>
                  <strong>—</strong>
                </div>
                <div className="profile-field">
                  <span>E-mail</span>
                  <strong>{user.email || "—"}</strong>
                </div>
              </>
            )}


            {isGestor && (
              <>
                <div className="profile-field">
                  <span>Nome</span>
                  <strong>{user.nome || "—"}</strong>
                </div>
                <div className="profile-field">
                  <span>Departamento</span>
                  <strong>—</strong>
                </div>
                <div className="profile-field">
                  <span>E-mail</span>
                  <strong>{user.email || "—"}</strong>
                </div>
              </>
            )}
          </div>
        </section>


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
                <span>Última alteração —</span>
              </div>
              →
            </button>


            <div className="profile-security-info">
              <Shield size={14} />
              Recomendado alterar periodicamente
            </div>
          </div>
        </section>


        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <Bell size={18} />
              Notificações
            </h3>
          </div>


          <div className="profile-notifications">
            <label>
              <span>E-mail</span>
              <input type="checkbox" />
            </label>
            <label>
              <span>Sistema</span>
              <input type="checkbox" />
            </label>
            <label>
              <span>Alertas</span>
              <input type="checkbox" />
            </label>
          </div>
        </section>


        <section className="profile-card">
          <div className="profile-card-header">
            <h3>
              <HelpCircle size={18} />
              Ajuda
            </h3>
          </div>


          <div className="profile-help">
            <button>Suporte</button>
            <button>Central</button>
            <button>Termos</button>
            <button>Privacidade</button>
          </div>
        </section>
      </div>


      <section className="profile-danger">
        <div className="profile-danger-info">
          <AlertTriangle size={20} />
          <div>
            <strong>Gerenciamento de Conta</strong>
            <span>Controle de acesso à conta</span>
          </div>
        </div>


        <div className="profile-danger-actions">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Sair
          </button>


          <button className="deactivate-btn" onClick={handleDeactivate}>
            Desativar Conta
          </button>
        </div>
      </section>


      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Desativar conta</h3>
            <p>Tem certeza que deseja desativar sua conta?</p>


            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button
                className="confirm"
                onClick={confirmDeactivate}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

