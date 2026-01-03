const Button = ({ 
  children, 
  type = 'button', 
  onClick, 
  disabled = false, 
  fullWidth = false,
  size = 'md',
  variant = 'primary',
  className = '',
  icon
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-[0.98]';
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm gap-1.5',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-3.5 text-lg gap-2.5'
  };
  
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-blue-200',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500 shadow-gray-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-red-200',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 shadow-green-200',
    purple: 'bg-gradient-to-r from-pink-400 to-purple-600 hover:from-pink-500 hover:to-purple-700 text-white focus:ring-purple-500 shadow-purple-300',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 focus:ring-gray-400 shadow-none',
    outline: 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 focus:ring-gray-400'
  };
  
  const widthStyle = fullWidth ? 'w-full' : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
