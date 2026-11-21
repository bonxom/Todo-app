const Button = ({
  children,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  size = "md",
  variant = "primary",
  className = "",
  icon,
}) => {
  const baseStyles =
    "auth-button gap-[0.5rem] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.68] [&:disabled]:[transform:none]";

  const sizeStyles = {
    sm: "auth-button--sm",
    md: "auth-button--md",
    lg: "auth-button--lg",
  };

  const variantStyles = {
    primary: "ui-btn-primary",
    secondary: "ui-btn-secondary",
    danger: "auth-button--danger",
    success: "auth-button--success",
    purple: "ui-btn-primary",
    ghost: "ui-btn-tertiary",
    outline: "ui-btn-secondary",
  };

  const widthStyle = fullWidth ? "auth-button--full w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
    >
      {loading ? (
        <span
          className="auth-button-spinner w-[1rem] h-[1rem] [border:2px_solid_rgba(255,255,255,0.48)] [border-top-color:#fff] rounded-[999px] animate-[auth-spin_700ms_linear_infinite]"
          aria-hidden="true"
        />
      ) : icon ? (
        <span className="auth-button-icon inline-flex">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
