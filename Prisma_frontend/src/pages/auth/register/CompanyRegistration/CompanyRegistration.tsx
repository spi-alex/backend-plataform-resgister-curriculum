import api from "../../../../services/api";
import { useState, useEffect } from "react";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import { PasswordInput } from "../../../../components/PasswordInput/PasswordInput";
import "./CompanyRegistration.css";

export default function CompanyRegistration() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [captchaValue, setCaptchaValue] = useState("");
  const [captchaData, setCaptchaData] = useState({
    image_url: "",
    hashkey: "",
  });

  const [form, setForm] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    areaAtuacao: "",
    email: "",
    telefone: "",
    responsavelNome: "",
    responsavelCpf: "",
    responsavelCargo: "",
    responsavelTelefone: "",
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    senha: "",
    confirmarSenha: "",
    termos: false,
  });

  const fetchCaptcha = async () => {
    try {
      const response = await api.get("http://127.0.0.1:8000/captcha/refresh/", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (response?.data) {
        setCaptchaData({
          image_url: `http://127.0.0.1:8000${response.data.image_url}`,
          hashkey: response.data.key,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar captcha:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCaptcha();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "cnpj") {
      let v = value.replace(/\D/g, "").slice(0, 14);
      v = v
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
      setForm({ ...form, cnpj: v });
      return;
    }

    if (name === "telefone" || name === "responsavelTelefone") {
      let v = value.replace(/\D/g, "").slice(0, 11);
      v = v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
      setForm({ ...form, [name]: v });
      return;
    }

    if (name === "responsavelCpf") {
      let v = value.replace(/\D/g, "").slice(0, 11);
      v = v
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
      setForm({ ...form, responsavelCpf: v });
      return;
    }

    if (name === "cep") {
      let v = value.replace(/\D/g, "").slice(0, 8);
      v = v.replace(/^(\d{5})(\d)/, "$1-$2");
      setForm({ ...form, cep: v });
      return;
    }

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  async function handleSubmit() {
    // Validação simples que não usa o estado 'errors' para não travar o ESLint
    if (
      !form.razaoSocial ||
      !form.email ||
      !form.senha ||
      !captchaValue ||
      !form.areaAtuacao ||
      !form.responsavelNome ||
      !form.responsavelCpf ||
      !form.cep ||
      !form.rua ||
      !form.numero ||
      !form.cidade ||
      !form.estado
    ) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (form.senha !== form.confirmarSenha) {
      alert("As senhas não coincidem.");
      return;
    }
    if (!form.termos) {
      alert("Você precisa aceitar os termos de uso.");
      return;
    }

    try {
      // 1. Limpeza forçada do localStorage antes de enviar
      // Isso remove tokens de sessões anteriores que possam estar causando o 401
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      const payload = {
        username: form.email,
        email: form.email,
        password: form.senha,
        captcha_0: captchaData.hashkey,
        captcha_1: captchaValue,
        role: "company",
        // Note que seu backend espera 'company_name' e 'cnpj' direto no corpo
        // ou dentro de 'perfil'. Como ajustamos o backend para ler 'company_name'
        // do root, vamos garantir que esses campos subam:
        company_name: form.razaoSocial,
        cnpj: form.cnpj.replace(/\D/g, ""),
        perfil: {
          razao_social: form.razaoSocial,
          nome_fantasia: form.nomeFantasia,
          cnpj: form.cnpj.replace(/\D/g, ""),
          area_atuacao: form.areaAtuacao,
          telefone: form.telefone.replace(/\D/g, ""),
          responsavel_nome: form.responsavelNome,
          responsavel_cpf: form.responsavelCpf.replace(/\D/g, ""),
          responsavel_cargo: form.responsavelCargo,
          responsavel_telefone: form.responsavelTelefone.replace(/\D/g, ""),
          cep: form.cep.replace(/\D/g, ""),
          rua: form.rua,
          numero: form.numero,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          user_type: "company",
        },
      };

      // 2. Chamada usando headers limpos explicitamente
      const response = await api.post("users/register/", payload, {
        headers: {
          Authorization: "", // Garante que nenhum token seja enviado aqui
        },
      });

      if (response.status === 201 || response.status === 200) {
        setShowSuccessMessage(true);
        // A conta nasce 'pendente' agora (precisa confirmar o PIN enviado
        // por e-mail antes de conseguir logar) — leva para a tela de
        // confirmação em vez do login direto.
        setTimeout(() => {
          window.location.replace("/confirmar-cadastro");
        }, 1500);
      }
    } catch (error: unknown) {
      // Tipagem correta para evitar o 'any'
      const apiError = error as {
        response?: { data?: { error?: string; detail?: string } };
      };
      const serverData = apiError.response?.data;

      console.error("Erro do servidor:", serverData);

      const errorMsg = JSON.stringify(serverData || {});

      if (errorMsg.includes("cnpj")) {
        alert("Este CNPJ já está cadastrado no sistema.");
      } else if (errorMsg.includes("email") || errorMsg.includes("username")) {
        alert("Este e-mail já está cadastrado.");
      } else if (errorMsg.includes("Captcha")) {
        alert("Código da imagem incorreto. Tente novamente.");
      } else {
        alert("Erro no cadastro. Verifique se os dados estão corretos.");
      }

      // Atualiza o captcha se der erro
      fetchCaptcha();
      setCaptchaValue("");
    }
  }

  return (
    <div className="register-page">
      {showSuccessMessage && (
        <div className="success-banner">
          Cadastro recebido! Verifique seu e-mail para confirmar o PIN e
          ativar sua conta.
        </div>
      )}

      <div className="register-wrapper">
        <div className="register-header">
          <h1>Cadastro de Empresa</h1>
        </div>

        <section className="register-card">
          <h2>Dados da Empresa</h2>
          <div className="form-grid">
            <Input
              label="Razão Social"
              name="razaoSocial"
              value={form.razaoSocial}
              onChange={handleChange}
            />
            <Input
              label="Nome Fantasia"
              name="nomeFantasia"
              value={form.nomeFantasia}
              onChange={handleChange}
            />
            <Input
              label="CNPJ"
              name="cnpj"
              placeholder="00.000.000/0000-00"
              value={form.cnpj}
              onChange={handleChange}
            />
            <Input
              label="Área de atuação"
              name="areaAtuacao"
              value={form.areaAtuacao}
              onChange={handleChange}
            />
            <Input
              label="Email Corporativo"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
            <Input
              label="Telefone"
              name="telefone"
              placeholder="(99) 99999-9999"
              value={form.telefone}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="register-card">
          <h2>Responsável pelo Cadastro</h2>
          <div className="form-grid">
            <Input
              label="Nome do responsável"
              name="responsavelNome"
              value={form.responsavelNome}
              onChange={handleChange}
            />
            <Input
              label="CPF do responsável"
              name="responsavelCpf"
              placeholder="000.000.000-00"
              value={form.responsavelCpf}
              onChange={handleChange}
            />
            <Input
              label="Cargo"
              name="responsavelCargo"
              value={form.responsavelCargo}
              onChange={handleChange}
            />
            <Input
              label="Telefone do responsável"
              name="responsavelTelefone"
              placeholder="(99) 99999-9999"
              value={form.responsavelTelefone}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="register-card">
          <h2>Endereço</h2>
          <div className="form-grid">
            <Input
              label="CEP"
              name="cep"
              placeholder="00000-000"
              value={form.cep}
              onChange={handleChange}
            />
            <Input
              label="Rua"
              name="rua"
              value={form.rua}
              onChange={handleChange}
            />
            <Input
              label="Número"
              name="numero"
              value={form.numero}
              onChange={handleChange}
            />
            <Input
              label="Bairro"
              name="bairro"
              value={form.bairro}
              onChange={handleChange}
            />
            <Input
              label="Cidade"
              name="cidade"
              value={form.cidade}
              onChange={handleChange}
            />
            <Input
              label="Estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="register-card">
          <div className="form-grid">
            <PasswordInput
              label="Senha"
              name="senha"
              value={form.senha}
              onChange={handleChange}
            />
            <PasswordInput
              label="Confirmar senha"
              name="confirmarSenha"
              value={form.confirmarSenha}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="register-card">
          <div
            className="captcha-container"
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            {captchaData.image_url && (
              <img
                src={captchaData.image_url}
                alt="captcha"
                style={{ height: "40px", borderRadius: "4px" }}
              />
            )}
            <Input
              label="Código"
              name="captchaValue"
              value={captchaValue}
              onChange={(e) => setCaptchaValue(e.target.value)}
            />
            <Button title="🔄" onClick={fetchCaptcha} />
          </div>
        </section>

        <div className="terms-container">
          <label className="terms-label">
            <input
              type="checkbox"
              name="termos"
              checked={form.termos}
              onChange={handleChange}
            />
            Aceito os termos de uso
          </label>
        </div>

        <div className="form-actions">
          <Button title="Confirmar cadastro" onClick={handleSubmit} />
        </div>
      </div>
    </div>
  );
}
