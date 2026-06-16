import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = ({ 
  id,
  name,
  label, 
  value, 
  onChange, 
  placeholder = '••••••••', 
  fullWidth = false,
  className = '',
  error,
  autoComplete = 'current-password',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = id || `${name || 'auth-password'}-${generatedId}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const widthStyle = fullWidth ? 'auth-field--full' : '';
  
  return (
    <div className={`auth-field ${widthStyle}`}>
      {label && (
        <label className="auth-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="auth-input-wrap">
        <input
          id={inputId}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={`ui-input auth-input auth-input--password ${error ? 'auth-input--error' : ''} ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="auth-password-toggle"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {error && (
        <p className="auth-error" id={errorId} aria-live="polite">{error}</p>
      )}
    </div>
  );
};

export default PasswordInput;
