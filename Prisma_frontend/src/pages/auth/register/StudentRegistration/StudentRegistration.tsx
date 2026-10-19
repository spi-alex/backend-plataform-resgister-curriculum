import api, { BACKEND_ORIGIN } from "../../../../services/api";
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../../../../components/Input/Input";
import { Button } from "../../../../components/Button/Button";
import { PasswordInput } from "../../../../components/PasswordInput/PasswordInput";
import { mensagemErroApi } from "../../../../utils/apiError";
import { validarSenha, DICA_SENHA } from "../../../../utils/senha";
import "./StudentRegistration.css";

export default function StudentRegistration() {
  const navigate = useNavigate();

  // Estado para controlar a exibição da mensagem sem travar a execução
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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
  const [captchaData, setCaptchaData] = useState({
    image_url: "",
    hashkey: "",
  });
  const [captchaValue, setCaptchaValue] = useState("");

  const fetchCaptcha = useCallback(async () => {
    try {
      const response = await api.get(`${BACKEND_ORIGIN}/captcha/refresh/`, {
        baseURL: "",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (response.data) {
        setCaptchaData({
          image_url: response.data.image_url,
          hashkey: response.data.key,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar captcha:", error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) {
        await fetchCaptcha();
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [fetchCaptcha]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target;
    const isCheckbox = type === "checkbox";
    const checked = (e.target as HTMLInputElement).checked;

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
      v = v.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
      setForm({ ...form, telefone: v });
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
      [name]: isCheckbox ? checked : value,
    });
  }

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!form.nome) newErrors.nome = "Nome obrigatório";
    if (!form.cpf || form.cpf.length !== 14) newErrors.cpf = "CPF inválido";
    if (!form.email) newErrors.email = "Email obrigatório";
    if (!form.telefone || form.telefone.length < 14)
      newErrors.telefone = "Telefone inválido";
    if (!form.instituicao) newErrors.instituicao = "Instituição obrigatória";
    if (!form.curso) newErrors.curso = "Curso obrigatório";
    if (!form.situacao) newErrors.situacao = "Informe se é aluno ou egresso";
    if (!form.anoInicio) newErrors.anoInicio = "Ano de início obrigatório";
    if (!form.cep || form.cep.length !== 9) newErrors.cep = "CEP inválido";
    if (!form.rua) newErrors.rua = "Rua obrigatória";
    if (!form.numero) newErrors.numero = "Número obrigatório";
    if (!form.cidade) newErrors.cidade = "Cidade obrigatória";
    if (!form.estado) newErrors.estado = "Estado obrigatória";
    // Mesma política do backend (utils/senha.ts). Antes daqui só saía
    // "Senha obrigatória": uma senha de 6 caracteres passava na validação
    // do formulário e só era recusada pela API — cujo motivo a tela não
    // mostrava, deixando o cadastro impossível de concluir.
    const erroSenha = validarSenha(form.senha);
    if (erroSenha) newErrors.senha = erroSenha;
    if (form.senha !== form.confirmarSenha)
      newErrors.confirmarSenha = "As senhas não coincidem";
    if (!form.termos) newErrors.termos = "Você precisa aceitar os termos";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e?: React.FormEvent) {
    // Agora é o `onSubmit` do <form>: sem preventDefault o navegador
    // recarrega a página e todos os campos preenchidos são perdidos.
    e?.preventDefault();

    if (!validate()) return;

    try {
      const payload = {
        username: form.email,
        email: form.email,
        password: form.senha,
        captcha_0: captchaData.hashkey,
        captcha_1: captchaValue,
        role: form.situacao === "aluno" ? "aluno" : "candidate",
        perfil: {
          nome: form.nome,
          cpf: form.cpf.replace(/\D/g, ""),
          telefone: form.telefone.replace(/\D/g, ""),
          nascimento: form.nascimento,
          instituicao: form.instituicao,
          curso: form.curso,
          situacao: form.situacao,
          ano_inicio: form.anoInicio,
          previsao_conclusao: form.previsaoConclusao || null,
          ano_conclusao: form.anoConclusao || null,
          cep: form.cep.replace(/\D/g, ""),
          rua: form.rua,
          numero: form.numero,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          user_type: "student",
        },
      };

      await api.post("users/register/", payload);

      // Ativa a mensagem visual em vez do alert bloqueante
      setShowSuccessMessage(true);

      // A conta nasce 'pendente' agora (precisa confirmar o PIN enviado por
      // e-mail antes de conseguir logar) — leva para a tela de confirmação
      // em vez do login direto.
      setTimeout(() => {
        navigate("/confirmar-cadastro", { state: { email: form.email } });
      }, 2000);
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      // A mensagem do backend é exibida como veio. O texto fixo que havia
      // aqui falava de captcha/dados duplicados mesmo quando a recusa era
      // da política de senha ("Esta senha é muito curta...", "Esta senha é
      // muito comum."), e o usuário não tinha como descobrir o motivo.
      alert(
        mensagemErroApi(
          error,
          "Erro ao cadastrar. Verifique o código da imagem ou se os dados já existem.",
        ),
      );
      await fetchCaptcha();
      setCaptchaValue("");
    }
  }

  return (
    <div className="register-page register-student">
      {/* Banner de sucesso renderizado condicionalmente */}
      {showSuccessMessage && (
        <div className="success-banner">
          Cadastro recebido! Verifique seu e-mail para confirmar o PIN e
          ativar sua conta.
        </div>
      )}

      <div className="register-wrapper">
        <div className="register-header">
          <h1>Cadastro de Aluno / Egresso</h1>
          <p>Preencha os dados para criar sua conta no PRISMA</p>
        </div>

        {/* Os ~20 campos ficavam soltos em <section>s, e o "Confirmar
            cadastro" disparava por onClick. Sem um <form> de verdade:
              - Enter em qualquer campo não fazia nada (num formulário
                longo assim, é o reflexo natural de quem acabou de digitar
                o último campo);
              - no celular o teclado nunca mostrava o botão de confirmar;
              - o navegador não reconhecia o conjunto como cadastro, então
                não oferecia salvar a senha nova no gerenciador.
            O botão 🔄 do captcha continua type="button" (padrão do
            componente Button), então não envia o formulário. */}
        <form onSubmit={handleSubmit} noValidate>
        <section className="register-card">
          <h2>Dados Pessoais</h2>
          <div className="form-grid">
            <Input
              label="Nome completo"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              error={errors.nome}
            />
            <Input
              label="CPF"
              name="cpf"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={handleChange}
              error={errors.cpf}
            />
            <Input
              label="Data de nascimento"
              type="date"
              name="nascimento"
              value={form.nascimento}
              onChange={handleChange}
            />
            <Input
              label="Email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
            />
            <Input
              label="Telefone"
              name="telefone"
              placeholder="(99) 99999-9999"
              value={form.telefone}
              onChange={handleChange}
              error={errors.telefone}
            />
          </div>
        </section>

        <section className="register-card">
          <h2>Dados Acadêmicos</h2>
          <div className="form-grid">
            <Input
              label="Instituição"
              name="instituicao"
              value={form.instituicao}
              onChange={handleChange}
              error={errors.instituicao}
            />
            <Input
              label="Curso"
              name="curso"
              value={form.curso}
              onChange={handleChange}
              error={errors.curso}
            />
            <div className="select-group">
              <label>Situação acadêmica</label>
              <select
                name="situacao"
                value={form.situacao}
                onChange={handleChange}
              >
                <option value="">Selecione</option>
                <option value="aluno">Aluno</option>
                <option value="egresso">Egresso</option>
              </select>
              {errors.situacao && (
                <span className="error">{errors.situacao}</span>
              )}
            </div>
            <Input
              label="Ano de início"
              name="anoInicio"
              value={form.anoInicio}
              onChange={handleChange}
              error={errors.anoInicio}
            />
            {form.situacao === "aluno" && (
              <Input
                label="Previsão de conclusão"
                name="previsaoConclusao"
                value={form.previsaoConclusao}
                onChange={handleChange}
                error={errors.previsaoConclusao}
              />
            )}
            {form.situacao === "egresso" && (
              <Input
                label="Ano de conclusão"
                name="anoConclusao"
                value={form.anoConclusao}
                onChange={handleChange}
                error={errors.anoConclusao}
              />
            )}
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
              error={errors.cep}
            />
            <Input
              label="Rua"
              name="rua"
              value={form.rua}
              onChange={handleChange}
              error={errors.rua}
            />
            <Input
              label="Número"
              name="numero"
              value={form.numero}
              onChange={handleChange}
              error={errors.numero}
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
              error={errors.cidade}
            />
            <Input
              label="Estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
              error={errors.estado}
            />
          </div>
        </section>

        <section className="register-card">
          <h2>Segurança</h2>
          <div className="form-grid">
            <PasswordInput
              label="Senha"
              name="senha"
              value={form.senha}
              onChange={handleChange}
              /* Faz o navegador oferecer GERAR uma senha forte,
                 em vez de tentar preencher a senha antiga. */
              autoComplete="new-password"
              error={errors.senha}
            />
            <PasswordInput
              label="Confirmar senha"
              name="confirmarSenha"
              value={form.confirmarSenha}
              onChange={handleChange}
              /* Faz o navegador oferecer GERAR uma senha forte,
                 em vez de tentar preencher a senha antiga. */
              autoComplete="new-password"
              error={errors.confirmarSenha}
            />
          </div>
          {/* A regra é do backend; dizê-la antes evita o cadastro ser
              recusado depois de o formulário inteiro estar preenchido. */}
          <small className="dica-senha">{DICA_SENHA}</small>
        </section>

        <section className="register-card">
          <h2>Verificação de Segurança</h2>
          <div className="captcha-container">
            {captchaData.image_url && (
              <img
                src={`${BACKEND_ORIGIN}${captchaData.image_url}`}
                alt="captcha"
              />
            )}
            <Input
              label="Código da imagem"
              name="captchaValue"
              value={captchaValue}
              onChange={(e) => setCaptchaValue(e.target.value)}
            />
            <Button
              title="🔄"
              ariaLabel="Gerar outra imagem de verificação"
              onClick={fetchCaptcha}
            />
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
            Li e aceito os termos de uso
          </label>
          {errors.termos && <span className="error">{errors.termos}</span>}
        </div>

        <div className="form-actions cadastro-button">
          <Button title="Confirmar cadastro" type="submit" />
        </div>
        </form>
      </div>
    </div>
  );
}
