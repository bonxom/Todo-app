import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "./components/AuthLayout";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import { useLoginMutation, useRegisterMutation } from "./api/authMutations";
import { resolveEntryTarget } from "@/shared/navigation/entryTarget";

const AuthPage = () => {
  const { t } = useTranslation("account");
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();

  const initialMode = location.pathname === "/register" ? "register" : "login";
  const [mode, setMode] = useState(initialMode);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const newMode = location.pathname === "/register" ? "register" : "login";
    setMode(newMode);
  }, [location.pathname]);

  // Submit Handlers
  const handleLoginSubmit = async (credentials, setErrors) => {
    try {
      setIsLoading(true);
      await loginMutation.mutateAsync(credentials);
      const target = resolveEntryTarget(location.state?.returnTo);
      navigate(target, { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error?.message || {
        key: "loginFailedPleaseTryAgain",
      };
      setErrors({ password: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (credentials, setErrors) => {
    try {
      setIsLoading(true);
      await registerMutation.mutateAsync({
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
        dob: credentials.dob,
      });
      const target = resolveEntryTarget(location.state?.returnTo);
      navigate(target, { replace: true });
    } catch (error) {
      const errorMessage = error?.message || {
        key: "registrationFailedPleaseTryAgain",
      };
      setErrors({ email: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    navigate(newMode === "login" ? "/login" : "/register", {
      replace: true,
      state: location.state,
    });
  };

  return (
    <AuthLayout mode={mode}>
      <div className="auth-card flex w-[min(100%,28rem)] flex-col gap-[1.5rem]">
        <div
          className="auth-card-header [&_h2]:m-[0] [&_h2]:text-[var(--color-text)] [&_h2]:text-[clamp(1.625rem,2.4vw,2rem)]
          [&_h2]:[font-weight:650] [&_h2]:[letter-spacing:-0.02em] [&_h2]:[line-height:1.1] flex flex-col gap-[1rem]"
        >
          <div>
            <p className="ui-page-kicker m-[0] text-[var(--color-accent)] [font-weight:600] [line-height:1.2] uppercase">
              {t("account")}
            </p>
            <h2>{mode === "login" ? t("signIn") : t("createWorkspace")}</h2>
            <p>
              {mode === "login"
                ? t("continueToYourTasksProjectsCalendarAndStatistics")
                : t("setUpYourAccountAndStartOrganizingTasksInOneWorkspace")}
            </p>
          </div>

          <div
            className="auth-mode-toggle grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[0.375rem] [border:1px_solid_var(--color-line)]
              rounded-[var(--radius-lg)] [background:var(--color-surface-muted)] p-[0.375rem]"
            role="group"
            aria-label={t("authenticationMode")}
          >
            <button
              type="button"
              className="auth-mode-button min-h-[2.5rem] [border:1px_solid_transparent] rounded-[var(--radius-md)]
                [background:transparent]
                [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease]
                [&[data-active=true]]:border-[color-mix(in_srgb,var(--color-accent)_16%,var(--color-line))]
                [&[data-active=true]]:[background:var(--color-surface)] [&[data-active=true]]:[box-shadow:var(--shadow-xs)]"
              data-active={mode === "login"}
              aria-pressed={mode === "login"}
              onClick={() => switchMode("login")}
            >
              {t("signIn")}
            </button>
            <button
              type="button"
              className="auth-mode-button min-h-[2.5rem] [border:1px_solid_transparent] rounded-[var(--radius-md)]
                [background:transparent]
                [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease]
                [&[data-active=true]]:border-[color-mix(in_srgb,var(--color-accent)_16%,var(--color-line))]
                [&[data-active=true]]:[background:var(--color-surface)] [&[data-active=true]]:[box-shadow:var(--shadow-xs)]"
              data-active={mode === "register"}
              aria-pressed={mode === "register"}
              onClick={() => switchMode("register")}
            >
              {t("signUp")}
            </button>
          </div>
        </div>

        {mode === "login" ? (
          <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
        ) : (
          <RegisterForm onSubmit={handleRegisterSubmit} isLoading={isLoading} />
        )}
      </div>
    </AuthLayout>
  );
};

export default AuthPage;
