import './Button.css'
type ButtonProps = {
    title: string;
    color?: string;
    disabled?: boolean;
    onClick?: () => void;

}

export function Button({ title, color, disabled = false, onClick }: ButtonProps) {
    return (
        <button
            className="btn"
            style={{
                backgroundColor: color,
            }}
            disabled={disabled}
            onClick={onClick}
        >
            {title}
        </button>
    );

}