import { useNavigate } from "react-router-dom";
import {
  Rocket,
  X,
  Info,
  FileText,
  Settings
} from "lucide-react";

import "./CompanyCreateJob.css";

export default function CompanyJobCreate() {
  const navigate = useNavigate();

  return (
    <div className="company-job-create">

      {/* TÍTULO */}
      <div className="job-create-header">
        <div>
          <h1>Anunciar Nova Oportunidade</h1>
          <p>
            Preencha os campos abaixo com os detalhes da vaga para encontrar
            os melhores talentos no PRISMA.
          </p>
        </div>
      </div>

      <form className="job-create-form">

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
                placeholder="Ex: Desenvolvedor Frontend Sênior (React)"
              />
            </div>

            <div className="grid-2">

              <div className="form-group">
                <label>Área de Atuação</label>
                <select>
                  <option>Tecnologia e Software</option>
                  <option>Design e UX</option>
                  <option>Marketing e Vendas</option>
                  <option>Recursos Humanos</option>
                  <option>Financeiro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tipo de Contrato</label>
                <select>
                  <option>CLT (Efetivo)</option>
                  <option>PJ</option>
                  <option>Estágio</option>
                  <option>Temporário</option>
                </select>
              </div>

              <div className="form-group">
                <label>Modalidade</label>
                <div className="radio-group">
                  <label>
                    <input type="radio" name="modalidade" defaultChecked />
                    Remoto
                  </label>
                  <label>
                    <input type="radio" name="modalidade" />
                    Híbrido
                  </label>
                  <label>
                    <input type="radio" name="modalidade" />
                    Presencial
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Localização</label>
                <input type="text" placeholder="Ex: São Paulo, SP ou Remoto" />
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
              <textarea rows={4}></textarea>
            </div>

            <div className="form-group">
              <label>Requisitos *</label>
              <textarea rows={4}></textarea>
            </div>

            <div className="form-group">
              <label>Diferenciais</label>
              <textarea rows={3}></textarea>
            </div>
          </div>
        </div>

        {/* BLOCO 3 */}
        <div className="form-card">
          <div className="form-card-header">
            <Settings size={18} />
            <h3>3. Configurações</h3>
          </div>

          <div className="form-card-body grid-2">

            <div className="form-group">
              <label>Data Limite</label>
              <input type="date" />
            </div>

            <div className="form-group">
              <label>Status Inicial</label>
              <div className="status-group">
                <label>
                  <input type="radio" name="status" defaultChecked />
                  Ativa Agora
                </label>
                <label>
                  <input type="radio" name="status" />
                  Apenas Rascunho
                </label>
              </div>
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
            <button type="button" className="btn-outline">
              Salvar Rascunho
            </button>

            <button type="submit" className="btn-primary">
              <Rocket size={18} />
              Publicar Vaga
            </button>
          </div>

        </div>

      </form>
    </div>
  );
}