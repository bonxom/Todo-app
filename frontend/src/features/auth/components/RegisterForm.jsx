import { useTranslation } from "react-i18next";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import PasswordInput from "./PasswordInput";

const RegisterForm = ({ onSubmit, isLoading }) => {
  const { t } = useTranslation("account");
  const [credentials, setCredentials] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!credentials.name.trim()) {
      newErrors.name = { key: "nameIsRequired" };
    }

    if (!credentials.dob) {
      newErrors.dob = { key: "dateOfBirthIsRequired" };
    }

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

    if (credentials.confirmPassword !== credentials.password) {
      newErrors.confirmPassword = { key: "passwordsDoNotMatch" };
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
        label={t("fullName")}
        name="name"
        value={credentials.name}
        onChange={(e) => {
          setCredentials({ ...credentials, name: e.target.value });
          if (errors.name) setErrors({ ...errors, name: undefined });
        }}
        placeholder={t("namePlaceholder")}
        autoComplete="name"
        fullWidth
        error={errors.name?.key ? t(errors.name.key) : errors.name}
      />

      <Input
        label={t("dateOfBirth")}
        name="dob"
        type="date"
        value={credentials.dob}
        onChange={(e) => {
          setCredentials({ ...credentials, dob: e.target.value });
          if (errors.dob) setErrors({ ...errors, dob: undefined });
        }}
        autoComplete="bday"
        fullWidth
        error={errors.dob?.key ? t(errors.dob.key) : errors.dob}
      />

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
        placeholder={t("atLeast6Characters")}
        autoComplete="new-password"
        fullWidth
        error={errors.password?.key ? t(errors.password.key) : errors.password}
      />

      <PasswordInput
        label={t("confirmPassword")}
        name="confirmPassword"
        value={credentials.confirmPassword || ""}
        onChange={(e) => {
          setCredentials({ ...credentials, confirmPassword: e.target.value });
          if (errors.confirmPassword)
            setErrors({ ...errors, confirmPassword: undefined });
        }}
        placeholder={t("reenterYourPassword")}
        autoComplete="new-password"
        fullWidth
        error={
          errors.confirmPassword?.key
            ? t(errors.confirmPassword.key)
            : errors.confirmPassword
        }
      />

      <Button
        type="submit"
        fullWidth
        size="lg"
        variant="primary"
        loading={isLoading}
        icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
      >
        {isLoading ? t("creatingAccount") : t("createAccount")}
      </Button>
    </form>
  );
};

export default RegisterForm;
