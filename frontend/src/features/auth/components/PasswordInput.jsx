import { useTranslation } from "react-i18next";
import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const PasswordInput = ({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = "••••••••",
  fullWidth = false,
  className = "",
  error,
  autoComplete = "current-password",
}) => {
  const { t } = useTranslation("account");
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const inputId = id || `${name || "auth-password"}-${generatedId}`;
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
        <input
          id={inputId}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId}
          className={`ui-input auth-input auth-input--password ${error ? "auth-input--error border-[var(--color-danger)] [background:color-mix(_in_srgb,var(--color-danger-soft)_46%,var(--color-surface)_)] [&:focus-visible]:border-[var(--color-danger)] [&:focus-visible]:[box-shadow:0_0_0_3px_rgba(178,85,71,0.16)]" : ""} ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="auth-password-toggle absolute top-[50%] right-[0.375rem] inline-flex w-[2.25rem] h-[2.25rem] items-center
            justify-center [border:1px_solid_transparent] rounded-[var(--radius-md)] [background:transparent]
            [transform:translateY(-50%)] [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease]
            [&:hover]:[background:var(--color-surface-muted)]"
          aria-label={showPassword ? t("hidePassword") : t("showPassword")}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
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

export default PasswordInput;
