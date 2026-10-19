import { useId } from "react";
import "./Input.css";

type InputProps = {
  label?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  /**
   * Valor de `autocomplete` do HTML (ex.: "email", "current-password",
   * "one-time-code"). Nenhuma tela passava isto, então:
   *
   *  - o gerenciador de senhas do navegador não reconhecia os campos de
   *    login e não oferecia preencher nem salvar a senha;
   *  - no celular, o código de 6 dígitos que chega por SMS/e-mail não era
   *    sugerido pelo teclado (isso depende de `autocomplete="one-time-code"`).
   */
  autoComplete?: string;
  /**
   * Teclado que o celular abre. `inputMode="numeric"` num campo de código
   * ou CPF abre o teclado numérico direto, em vez de o usuário ter de
   * trocar de teclado a cada campo.
   */
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  /** Ativa a validação nativa do navegador quando o input está num `<form>`. */
  required?: boolean;
};

export function Input({
  label,
  name,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  disabled = false,
  error,
  autoComplete,
  inputMode,
  maxLength,
  required = false,
}: InputProps) {
  // O `id` vinha de `name`, mas a maioria das telas chama <Input> SEM name
  // (ex.: os dois campos da tela de login). Nesse caso `id` ficava
  // undefined e o `htmlFor` do label não apontava para nada: clicar no
  // texto "Email" não focava o campo, e leitor de tela anunciava um input
  // sem rótulo. `useId` garante um id único mesmo sem `name`.
  const idGerado = useId();
  const inputId = name ?? idGerado;

  return (
    <div className="input-wrapper">
      {label && <label htmlFor={inputId}>{label}</label>}

      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-erro` : undefined}
        className={`input-field ${error ? 'input-error' : ''}`}
      />

      {/* `role="alert"` faz o leitor de tela anunciar o erro assim que ele
          aparece, em vez de o usuário só descobrir ao tabular de volta. */}
      {error && (
        <span className="error-text" id={`${inputId}-erro`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
