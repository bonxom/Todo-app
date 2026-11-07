import { useTranslation } from "react-i18next";
import { useState } from "react";
import { LogIn } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import PasswordInput from "./PasswordInput";

const LoginForm = ({ onSubmit, isLoading }) => {
  const { t } = useTranslation("account");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!credentials.email.trim()) {
      newErrors.email = { key: "emailIsRequired" };
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      newErrors.email = { key: "invalidEmailFormat" };
    }

    if (!credentials.password) {
      newErrors.password = { key: "passwordIsRequired" };
    } else if (credentials.password.length < 6) {
      newErrors.password = { key: "passwordMustBeAtLeast6Characters" };
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      const form = e.currentTarget;
      window.requestAnimationFrame(() => {
        form.querySelector('[aria-invalid="true"]')?.focus();
      });
      return;
    }

    onSubmit(credentials, setErrors);
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" noValidate>
      <Input
        label={t("email")}
        name="email"
        type="email"
        value={credentials.email}
        onChange={(e) => {
          setCredentials({ ...credentials, email: e.target.value });
          if (errors.email) setErrors({ ...errors, email: undefined });
        }}
        placeholder={t("emailPlaceholder")}
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        fullWidth
        error={errors.email?.key ? t(errors.email.key) : errors.email}
      />

      <PasswordInput
        label={t("password")}
        name="password"
        value={credentials.password}
        onChange={(e) => {
          setCredentials({ ...credentials, password: e.target.value });
          if (errors.password) setErrors({ ...errors, password: undefined });
        }}
        placeholder={t("enterYourPassword")}
        autoComplete="current-password"
        fullWidth
        error={errors.password?.key ? t(errors.password.key) : errors.password}
      />

      <div className="auth-form-row">
        <label className="auth-checkbox-label">
          <input type="checkbox" name="remember" />
          {t("rememberMe")}
        </label>
      </div>

      <Button
        type="submit"
        fullWidth
        size="lg"
        variant="primary"
        loading={isLoading}
        icon={<LogIn className="h-4 w-4" aria-hidden="true" />}
      >
        {isLoading ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
};

export default LoginForm;
