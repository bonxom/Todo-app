import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "./components/AuthLayout";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import { useLoginMutation, useRegisterMutation } from "./api/authMutations";
import "@/styles/auth.css";

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
      navigate("/dashboard", { replace: true });
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
      navigate("/dashboard", { replace: true });
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
    navigate(newMode === "login" ? "/login" : "/register", { replace: true });
  };

  return (
    <AuthLayout mode={mode}>
      <div className="auth-card">
        <div className="auth-card-header">
          <div>
            <p className="ui-page-kicker">{t("account")}</p>
            <h2>{mode === "login" ? t("signIn") : t("createWorkspace")}</h2>
            <p>
              {mode === "login"
                ? t("continueToYourTasksProjectsCalendarAndStatistics")
                : t("setUpYourAccountAndStartOrganizingTasksInOneWorkspace")}
            </p>
          </div>

          <div
            className="auth-mode-toggle"
            role="group"
            aria-label={t("authenticationMode")}
          >
            <button
              type="button"
              className="auth-mode-button"
              data-active={mode === "login"}
              aria-pressed={mode === "login"}
              onClick={() => switchMode("login")}
            >
              {t("signIn")}
            </button>
            <button
              type="button"
              className="auth-mode-button"
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
