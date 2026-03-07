interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
}

export function IconButton({
  label,
  icon,
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`pidro-icon-button ${className}`}
      {...props}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
