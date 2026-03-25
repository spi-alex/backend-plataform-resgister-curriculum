import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import { PasswordInput } from "../../../../components/PasswordInput/PasswordInput";
import "./CompanyRegistration.css";

export default function CompanyRegistration() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    areaAtuacao: "",
    email: "",
    telefone: "",
    responsavelNome: "",
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;

    // ======================
    // MÁSCARA CNPJ
    // ======================
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

    // ======================
    // MÁSCARA TELEFONE
    // ======================
    if (name === "telefone" || name === "responsavelTelefone") {
      let v = value.replace(/\D/g, "").slice(0, 11);
      v = v
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");

      setForm({ ...form, [name]: v });
      return;
    }

    // ======================
    // MÁSCARA CEP
    // ======================
    if (name === "cep") {
      let v = value.replace(/\D/g, "").slice(0, 8);
      v = v.replace(/^(\d{5})(\d)/, "$1-$2");

      setForm({ ...form, cep: v });
      return;
    }

    // ======================
    // CHECKBOX
    // ======================
    if (type === "checkbox") {
      setForm({
        ...form,
        [name]: (e.target as HTMLInputElement).checked,
      });
      return;
    }

    setForm({ ...form, [name]: value });
  }

  function validate() {
    const newErrors: Record<string, string> = {};

    if (!form.razaoSocial)
      newErrors.razaoSocial = "Razão social obrigatória";

    if (!form.nomeFantasia)
      newErrors.nomeFantasia = "Nome fantasia obrigatório";

    if (!form.cnpj)
      newErrors.cnpj = "CNPJ obrigatório";
    else if (form.cnpj.length !== 18)
      newErrors.cnpj = "CNPJ inválido";

    if (!form.areaAtuacao)
      newErrors.areaAtuacao = "Área obrigatória";

    if (!form.email)
      newErrors.email = "Email obrigatório";

    if (!form.telefone)
      newErrors.telefone = "Telefone obrigatório";
    else if (form.telefone.length < 14)
      newErrors.telefone = "Telefone inválido";

    if (!form.responsavelNome)
      newErrors.responsavelNome = "Nome do responsável obrigatório";

    if (!form.responsavelCargo)
      newErrors.responsavelCargo = "Cargo obrigatório";

    if (!form.cep)
      newErrors.cep = "CEP obrigatório";
    else if (form.cep.length !== 9)
      newErrors.cep = "CEP inválido";

    if (!form.rua)
      newErrors.rua = "Rua obrigatória";

    if (!form.numero)
      newErrors.numero = "Número obrigatório";

    if (!form.cidade)
      newErrors.cidade = "Cidade obrigatória";

    if (!form.estado)
      newErrors.estado = "Estado obrigatório";

    if (!form.senha)
      newErrors.senha = "Senha obrigatória";

    if (form.senha !== form.confirmarSenha)
      newErrors.confirmarSenha = "As senhas não coincidem";

    if (!form.termos)
      newErrors.termos = "Você precisa aceitar os termos";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    console.log("Cadastro empresa:", form);
    navigate("/login");
  }

  return (
    <div className="register-page">
      <div className="register-wrapper">

        <div className="register-header">
          <h1>Cadastro de Empresa</h1>
          <p>Preencha os dados para cadastrar sua empresa</p>
        </div>

        <section className="register-card">
          <h2>Dados da empresa</h2>
          <div className="form-grid">
            <Input label="Razão social" name="razaoSocial" value={form.razaoSocial} onChange={handleChange} error={errors.razaoSocial} />
            <Input label="Nome fantasia" name="nomeFantasia" value={form.nomeFantasia} onChange={handleChange} error={errors.nomeFantasia} />
            <Input label="CNPJ" name="cnpj" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={handleChange} error={errors.cnpj} />
            <Input label="Área de atuação" name="areaAtuacao" value={form.areaAtuacao} onChange={handleChange} error={errors.areaAtuacao} />
            <Input label="Email" name="email" value={form.email} onChange={handleChange} error={errors.email} />
            <Input label="Telefone" name="telefone" placeholder="(99) 99999-9999" value={form.telefone} onChange={handleChange} error={errors.telefone} />
          </div>
        </section>

        <section className="register-card">
          <h2>Responsável</h2>
          <div className="form-grid">
            <Input label="Nome do responsável" name="responsavelNome" value={form.responsavelNome} onChange={handleChange} error={errors.responsavelNome} />
            <Input label="Cargo" name="responsavelCargo" value={form.responsavelCargo} onChange={handleChange} error={errors.responsavelCargo} />
            <Input label="Telefone" name="responsavelTelefone" placeholder="(99) 99999-9999" value={form.responsavelTelefone} onChange={handleChange} />
          </div>
        </section>

        <section className="register-card">
          <h2>Endereço</h2>
          <div className="form-grid">
            <Input label="CEP" name="cep" placeholder="00000-000" value={form.cep} onChange={handleChange} error={errors.cep} />
            <Input label="Rua" name="rua" value={form.rua} onChange={handleChange} error={errors.rua} />
            <Input label="Número" name="numero" value={form.numero} onChange={handleChange} error={errors.numero} />
            <Input label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} />
            <Input label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} error={errors.cidade} />
            <Input label="Estado" name="estado" value={form.estado} onChange={handleChange} error={errors.estado} />
          </div>
        </section>

        <section className="register-card">
          <h2>Segurança</h2>
          <div className="form-grid">
            <PasswordInput label="Senha" name="senha" value={form.senha} onChange={handleChange} error={errors.senha} />
            <PasswordInput label="Confirmar senha" name="confirmarSenha" value={form.confirmarSenha} onChange={handleChange} error={errors.confirmarSenha} />
          </div>
        </section>

        <div className="terms-container">
          <label className="terms-label">
            <input type="checkbox" name="termos" checked={form.termos} onChange={handleChange} />
            Li e aceito os termos de uso e política de privacidade
          </label>
          {errors.termos && <span className="error">{errors.termos}</span>}
        </div>

        <div className="form-actions cadastro-button">
          <Button title="Confirmar cadastro" onClick={handleSubmit} />
        </div>

      </div>
    </div>
  );
}