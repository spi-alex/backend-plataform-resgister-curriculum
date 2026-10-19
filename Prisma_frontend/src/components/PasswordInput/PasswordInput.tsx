import { useState } from "react";
import "./PasswordInput.css";

interface PasswordInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  /**
   * "current-password" na tela de login, "new-password" no cadastro e na
   * redefinição. Sem isto o gerenciador de senhas do navegador não
   * oferecia salvar/preencher a senha — e, no cadastro, não sugeria uma
   * senha forte (o app exige 10 caracteres, ver AUTH_PASSWORD_VALIDATORS).
   */
  autoComplete?: "current-password" | "new-password";
  required?: boolean;
}

export function PasswordInput({
  label,
  name,
  value,
  onChange,
  error,
  autoComplete,
  required = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-field">
      <label htmlFor={name}>{label}</label>

      <div className="password-wrapper">
        <input
          id={name}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-erro` : undefined}
        />

        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
        >
          👁
        </button>
      </div>

      {error && (
        <small id={`${name}-erro`} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
