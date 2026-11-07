import LanguageSelect from "@/shared/components/LanguageSelect";
import { useTranslation } from "react-i18next";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { Link } from "react-router-dom";
import OrbitMark from "@/shared/components/OrbitMark";

const AuthLayout = ({ children, mode = "login" }) => {
  const { t } = useTranslation("account");
  const isRegister = mode === "register";

  return (
    <main className="auth-page-shell">
      <a className="skip-link" href="#auth-form">
        {t("skipToAccountForm")}
      </a>
      <div className="auth-page-container">
        <div className="auth-page-header">
          <Link to="/" className="auth-home-link">
            <span className="ui-shell-brand-mark" aria-hidden="true">
              <OrbitMark />
            </span>
            <span>Orbit</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelect />
            <ThemeToggle />
          </div>
        </div>

        <section className="auth-shell ui-section-card">
          <aside className="auth-aside" aria-label={t("orbitWorkspaceSummary")}>
            <h1>
              {isRegister
                ? t("buildYourTaskWorkspace")
                : t("welcomeBackToYourWorkspace")}
            </h1>
            <video
              className="auth-aside-video"
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
            >
              <source src="/robothihi1.mp4" type="video/mp4" />
            </video>
          </aside>

          <div className="auth-form-panel" id="auth-form">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;
