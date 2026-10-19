import "./Button.css";
type ButtonProps = {
  title: string;
  color?: string;
  disabled?: boolean;
  onClick?: () => void;
  /**
   * O padrão segue "button" para não mudar o comportamento de nenhuma tela
   * que já usava este componente. Passe "submit" quando o botão estiver
   * dentro de um `<form>`: é o que faz o Enter (e o botão "Ir" do teclado
   * do celular) enviar o formulário.
   */
  type?: "button" | "submit";
  /**
   * Rótulo para leitor de tela. Necessário quando `title` é só um ícone —
   * o botão 🔄 do captcha era anunciado como "arrows counterclockwise".
   */
  ariaLabel?: string;
};

export function Button({
  title,
  color,
  disabled = false,
  onClick,
  type = "button",
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      className="btn"
      style={{
        backgroundColor: color,
      }}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {title}
    </button>
  );
}
