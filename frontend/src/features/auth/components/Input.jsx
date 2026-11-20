import { useId } from "react";

const Input = ({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  fullWidth = false,
  className = "",
  icon,
  error,
  autoComplete,
  inputMode,
  spellCheck,
}) => {
  const generatedId = useId();
  const inputId = id || `${name || "auth-input"}-${generatedId}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const widthStyle = fullWidth ? "auth-field--full w-full" : "";

  return (
    <div className={`auth-field w-full ${widthStyle}`}>
      {label && (
        <label
          className="auth-label block mb-[0.5rem] text-[var(--color-text)] text-[0.875rem] [font-weight:650] [line-height:1.3]"
          htmlFor={inputId}
        >
          {label}
        </label>
      )}
      <div className="auth-input-wrap relative">
        {icon && (
          <div
            className="auth-input-icon absolute top-[50%] left-[0.875rem] z-1 inline-flex text-[var(--color-text-muted)] [transform:translateY(-50%)]"
            aria-hidden="true"
          >
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
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId}
          className={`ui-input auth-input ${icon ? "auth-input--with-icon pl-[2.75rem]" : ""} ${error ? "auth-input--error border-[var(--color-danger)] [background:color-mix(_in_srgb,var(--color-danger-soft)_46%,var(--color-surface)_)] [&:focus-visible]:border-[var(--color-danger)] [&:focus-visible]:[box-shadow:0_0_0_3px_rgba(178,85,71,0.16)]" : ""} ${className}`}
        />
      </div>
      {error && (
        <p
          className="auth-error m-[0.375rem_0_0] text-[var(--color-danger)] text-[0.8125rem] [font-weight:600] [line-height:1.45]"
          id={errorId}
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
