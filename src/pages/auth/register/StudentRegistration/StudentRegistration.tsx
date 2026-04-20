import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import { PasswordInput } from "../../../../components/PasswordInput/PasswordInput";
import "./StudentRegistration.css";

export default function StudentRegistration() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    nascimento: "",
    email: "",
    telefone: "",
    instituicao: "",
    curso: "",
    situacao: "",
    anoInicio: "",
    previsaoConclusao: "",
    anoConclusao: "",
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

    if (name === "cpf") {
      let v = value.replace(/\D/g, "").slice(0, 11);
      v = v
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");

      setForm({ ...form, cpf: v });
      return;
    }

    if (name === "telefone") {
      let v = value.replace(/\D/g, "").slice(0, 11);
      v = v
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");

      setForm({ ...form, telefone: v });
      return;
    }

    if (name === "cep") {
      let v = value.replace(/\D/g, "").slice(0, 8);
      v = v.replace(/^(\d{5})(\d)/, "$1-$2");

      setForm({ ...form, cep: v });
      return;
    }

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

    if (!form.nome) newErrors.nome = "Nome obrigatório";

    if (!form.cpf) newErrors.cpf = "CPF obrigatório";
    else if (form.cpf.length !== 14)
      newErrors.cpf = "CPF inválido";

    if (!form.email) newErrors.email = "Email obrigatório";

    if (!form.telefone) newErrors.telefone = "Telefone obrigatório";
    else if (form.telefone.length < 14)
      newErrors.telefone = "Telefone inválido";

    if (!form.instituicao)
      newErrors.instituicao = "Instituição obrigatória";

    if (!form.curso) newErrors.curso = "Curso obrigatório";

    if (!form.situacao)
      newErrors.situacao = "Informe se é aluno ou egresso";

    if (!form.anoInicio)
      newErrors.anoInicio = "Ano de início obrigatório";

    if (form.situacao === "aluno" && !form.previsaoConclusao)
      newErrors.previsaoConclusao = "Previsão obrigatória";

    if (form.situacao === "egresso" && !form.anoConclusao)
      newErrors.anoConclusao = "Ano obrigatório";

    if (!form.cep) newErrors.cep = "CEP obrigatório";
    else if (form.cep.length !== 9)
      newErrors.cep = "CEP inválido";

    if (!form.rua) newErrors.rua = "Rua obrigatória";
    if (!form.numero) newErrors.numero = "Número obrigatório";
    if (!form.cidade) newErrors.cidade = "Cidade obrigatória";
    if (!form.estado) newErrors.estado = "Estado obrigatório";

    if (!form.senha) newErrors.senha = "Senha obrigatória";
    if (form.senha !== form.confirmarSenha)
      newErrors.confirmarSenha = "As senhas não coincidem";

    if (!form.termos)
      newErrors.termos = "Você precisa aceitar os termos";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    console.log(form);
    navigate("/login");
  }

  return (
    <div className="register-page">
      <div className="register-wrapper">

        <div className="register-header">
          <h1>Cadastro de Aluno / Egresso</h1>
          <p>Preencha os dados para criar sua conta no PRISMA</p>
        </div>

        <section className="register-card">
          <h2>Dados Pessoais</h2>
          <div className="form-grid">
            <Input label="Nome completo" name="nome" value={form.nome} onChange={handleChange} error={errors.nome} />
            <Input label="CPF" name="cpf" placeholder="000.000.000-00" value={form.cpf} onChange={handleChange} error={errors.cpf} />
            <Input label="Data de nascimento" type="date" name="nascimento" value={form.nascimento} onChange={handleChange} />
            <Input label="Email" type="email" name="email" value={form.email} onChange={handleChange} error={errors.email} />
            <Input label="Telefone" name="telefone" placeholder="(99) 99999-9999" value={form.telefone} onChange={handleChange} error={errors.telefone} />
          </div>
        </section>

        <section className="register-card">
          <h2>Dados Acadêmicos</h2>
          <div className="form-grid">
            <Input label="Instituição" name="instituicao" value={form.instituicao} onChange={handleChange} error={errors.instituicao} />
            <Input label="Curso" name="curso" value={form.curso} onChange={handleChange} error={errors.curso} />

            <div className="select-group">
              <label>Situação acadêmica</label>
              <select name="situacao" value={form.situacao} onChange={handleChange}>
                <option value="">Selecione</option>
                <option value="aluno">Aluno</option>
                <option value="egresso">Egresso</option>
              </select>
              {errors.situacao && <span className="error">{errors.situacao}</span>}
            </div>

            <Input label="Ano de início" name="anoInicio" value={form.anoInicio} onChange={handleChange} error={errors.anoInicio} />

            {form.situacao === "aluno" && (
              <Input label="Previsão de conclusão" name="previsaoConclusao" value={form.previsaoConclusao} onChange={handleChange} error={errors.previsaoConclusao} />
            )}

            {form.situacao === "egresso" && (
              <Input label="Ano de conclusão" name="anoConclusao" value={form.anoConclusao} onChange={handleChange} error={errors.anoConclusao} />
            )}
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