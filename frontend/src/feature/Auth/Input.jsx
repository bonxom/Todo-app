import { useId } from 'react';

const Input = ({ 
  id,
  name,
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder = '', 
  fullWidth = false,
  className = '',
  icon,
  error,
  autoComplete,
  inputMode,
  spellCheck,
}) => {
  const generatedId = useId();
  const inputId = id || `${name || 'auth-input'}-${generatedId}`;
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
        {icon && (
          <div className="auth-input-icon" aria-hidden="true">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          spellCheck={spellCheck}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          className={`ui-input auth-input ${icon ? 'auth-input--with-icon' : ''} ${error ? 'auth-input--error' : ''} ${className}`}
        />
      </div>
      {error && (
        <p className="auth-error" id={errorId} aria-live="polite">{error}</p>
      )}
    </div>
  );
};

export default Input;
