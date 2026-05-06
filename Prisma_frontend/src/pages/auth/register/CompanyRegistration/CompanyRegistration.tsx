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
    email: "",
    telefone: "",
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;

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

    if (name === "telefone") {
      let v = value.replace(/\D/g, "").slice(0, 11);
      v = v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
      setForm({ ...form, telefone: v });
      return;
    }

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  async function handleSubmit() {
    // Validação simples que não usa o estado 'errors' para não travar o ESLint
    if (!form.razaoSocial || !form.email || !form.senha || !captchaValue) {
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
          telefone: form.telefone.replace(/\D/g, ""),
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
        setTimeout(() => {
          window.location.replace("/login");
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
          Cadastro realizado com sucesso! Redirecionando...
        </div>
      )}

      <div className="register-wrapper">
        <div className="register-header">
          <h1>Cadastro de Empresa</h1>
        </div>

        <section className="register-card">
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
