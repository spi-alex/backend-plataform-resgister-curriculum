import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Download,
  Mail,
  GraduationCap,
} from "lucide-react";

import api from "../../../../../services/api";
import { downloadResumePdf } from "../../../../../utils/resume";

interface ResumeDetails {
  full_name: string;
  contact_email: string;
  course: string;
  institution: string | null;
}

interface Candidate {
  id: number; // id da candidatura (Application)
  resume_id: number;
  status: string;
  status_label: string;
  resume_details: ResumeDetails;
}

const STATUS_ACTIONS: Record<string, string> = {
  approve: "APROVADO",
  reject: "REPROVADO",
};

export default function CompanyCurriculumView() {
  const { jobId, appId } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!jobId || !appId) return;

    async function fetchCandidate() {
      try {
        setLoading(true);
        // Não existe endpoint de detalhe único de candidatura, então
        // reaproveitamos a listagem de candidatos da vaga e filtramos.
        const response = await api.get(`jobs/${jobId}/candidates/`);
        setJobTitle(response.data.vaga);

        const found = response.data.candidatos.find(
          (app: Candidate) => String(app.id) === String(appId),
        );
        setCandidate(found ?? null);
      } catch (error) {
        console.error("Erro ao buscar candidato:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCandidate();
  }, [jobId, appId]);

  async function updateStatus(action: "approve" | "reject") {
    if (!jobId || !appId || !candidate) return;

    const label = action === "approve" ? "Aprovar" : "Reprovar";
    if (!window.confirm(`${label} este candidato?`)) return;

    setUpdating(true);
    try {
      const response = await api.patch(
        `jobs/${jobId}/update-status/${appId}/`,
        { status: STATUS_ACTIONS[action] },
      );
      setCandidate((prev) =>
        prev
          ? {
              ...prev,
              status: STATUS_ACTIONS[action],
              status_label: response.data.novo_status,
            }
          : prev,
      );
      alert(response.data.message || "Status atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Não foi possível atualizar o status do candidato.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDownload() {
    if (!candidate) return;
    try {
      await downloadResumePdf(
        candidate.resume_id,
        `curriculo_${candidate.resume_details.full_name}.pdf`,
      );
    } catch {
      alert("Não foi possível baixar o currículo.");
    }
  }

  if (loading) {
    return (
      <main className="cv-container">
        <p>Carregando candidato...</p>
      </main>
    );
  }

  if (!candidate) {
    return (
      <main className="cv-container">
        <p>Candidato não encontrado.</p>
        <button onClick={() => navigate(-1)}>Voltar</button>
      </main>
    );
  }

  const { resume_details } = candidate;

  return (
    <main className="cv-container">
      {/* HEADER */}
      <div className="cv-header">
        <button className="cv-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Voltar
        </button>

        <div className="cv-actions">
          <button className="cv-btn-outline" onClick={handleDownload}>
            <Download size={16} />
            Baixar PDF
          </button>

          <a className="cv-btn-primary" href={`mailto:${resume_details.contact_email}`}>
            <Mail size={16} />
            Entrar em Contato
          </a>
        </div>
      </div>

      {/* STATUS ATUAL */}
      <p className="cv-course">
        Vaga: <strong>{jobTitle}</strong> — Status atual:{" "}
        <strong>{candidate.status_label || candidate.status}</strong>
      </p>

      {/* BOTÕES DE DECISÃO */}
      <div className="cv-decision-actions">
        <button
          className="cv-btn-approve"
          disabled={updating}
          onClick={() => updateStatus("approve")}
        >
          Aprovar
        </button>

        <button
          className="cv-btn-reject"
          disabled={updating}
          onClick={() => updateStatus("reject")}
        >
          Reprovar
        </button>
      </div>

      {/* PROFILE CARD */}
      <section className="cv-profile-card">
        <div className="cv-profile-left">
          <div className="cv-photo">
            <User size={48} />
          </div>

          <div>
            <h2>{resume_details.full_name}</h2>
            <p className="cv-course">
              <GraduationCap size={14} /> {resume_details.course || "Curso não informado"}
            </p>

            <div className="cv-meta">
              <span>
                <Mail size={14} />
                {resume_details.contact_email}
              </span>

              {resume_details.institution && (
                <span>{resume_details.institution}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <p className="cv-empty">
        Para ver o currículo completo (formação, experiências e habilidades),
        baixe o PDF acima.
      </p>
    </main>
  );
}
