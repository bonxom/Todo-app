const Button = ({ 
  children, 
  type = 'button', 
  onClick, 
  disabled = false, 
  loading = false,
  fullWidth = false,
  size = 'md',
  variant = 'primary',
  className = '',
  icon
}) => {
  const baseStyles = 'auth-button';
  
  const sizeStyles = {
    sm: 'auth-button--sm',
    md: 'auth-button--md',
    lg: 'auth-button--lg'
  };
  
  const variantStyles = {
    primary: 'ui-btn-primary',
    secondary: 'ui-btn-secondary',
    danger: 'auth-button--danger',
    success: 'auth-button--success',
    purple: 'ui-btn-primary',
    ghost: 'ui-btn-tertiary',
    outline: 'ui-btn-secondary'
  };
  
  const widthStyle = fullWidth ? 'auth-button--full' : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
    >
      {loading ? (
        <span className="auth-button-spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="auth-button-icon">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
