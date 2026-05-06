import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../../../services/api";
import {
  Rocket,
  X,
  Info,
  FileText
} from "lucide-react";

import "./CompanyCreateJob.css";

export default function CompanyJobUpdate() {
  const navigate = useNavigate();
  const { id } = useParams(); // Pega o ID da vaga da URL
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    salary: "",
    is_active: true,
  });

  // 1. BUSCAR DADOS ATUAIS DA VAGA
  useEffect(() => {
    async function loadJob() {
      try {
        const response = await api.get(`jobs/${id}/`);
        setFormData({
          title: response.data.title,
          description: response.data.description,
          requirements: response.data.requirements,
          salary: response.data.salary || "",
          is_active: response.data.is_active,
        });
      } catch {
        console.error("Erro ao carregar vaga");
        navigate("/dashboard/empresa/vagas");
      } finally {
        setFetching(false);
      }
    }
    loadJob();
  }, [id, navigate]);

  // 2. ENVIAR ATUALIZAÇÃO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.patch(`jobs/${id}/`, formData);
      alert("Vaga atualizada com sucesso!");
      navigate("/dashboard/empresa/vagas");
    } catch {
      alert("Erro ao atualizar vaga.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="loading">Carregando dados da vaga...</div>;

  return (
    <div className="company-job-create">
      <div className="job-create-header">
        <div>
          <h1>Editar Oportunidade</h1>
          <p>Atualize as informações da vaga #{id} para manter os candidatos informados.</p>
        </div>
      </div>

      <form className="job-create-form" onSubmit={handleSubmit}>
        {/* BLOCO 1 */}
        <div className="form-card">
          <div className="form-card-header">
            <Info size={18} />
            <h3>1. Informações Básicas</h3>
          </div>

          <div className="form-card-body">
            <div className="form-group">
              <label>Título da Vaga *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Salário (Opcional)</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Status da Vaga</label>
                <select
                  value={formData.is_active ? "true" : "false"}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "true" })}
                >
                  <option value="true">Ativa (Recebendo candidaturas)</option>
                  <option value="false">Encerrada / Rascunho</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* BLOCO 2 */}
        <div className="form-card">
          <div className="form-card-header">
            <FileText size={18} />
            <h3>2. Detalhes da Vaga</h3>
          </div>

          <div className="form-card-body">
            <div className="form-group">
              <label>Responsabilidades *</label>
              <textarea
                rows={4}
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Requisitos *</label>
              <textarea
                rows={4}
                required
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* BOTÕES */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/dashboard/empresa/vagas")}
          >
            <X size={18} />
            Cancelar
          </button>

          <div className="right-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              <Rocket size={18} />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}