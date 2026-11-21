import LanguageSelect from "@/shared/components/LanguageSelect";
import { useTranslation } from "react-i18next";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { Link } from "react-router-dom";
import OrbitMark from "@/shared/components/OrbitMark";

const AuthLayout = ({ children, mode = "login" }) => {
  const { t } = useTranslation("account");
  const isRegister = mode === "register";

  return (
    <main className="auth-page-shell min-h-screen [background:var(--color-canvas)] text-[var(--color-text)] p-[clamp(1rem,3vw,2rem)] [@media(max-width:640px)]:p-[1rem]">
      <a
        className="skip-link fixed top-[0.75rem] left-[0.75rem] z-1000 [border:1px_solid_var(--color-line)]
        rounded-[var(--radius-md)] [background:var(--color-surface)] [box-shadow:var(--shadow-sm)]
        p-[0.625rem_0.875rem] [text-decoration:none] [transform:translateY(calc(-100%_-_1rem))]
        [transition:transform_160ms_ease] [&:focus-visible]:[outline:2px_solid_var(--ring-focus-outline)]
        [&:focus-visible]:outline-offset-[2px] [&:focus-visible]:[transform:translateY(0)]"
        href="#auth-form"
      >
        {t("skipToAccountForm")}
      </a>
      <div className="auth-page-container flex w-[min(100%,76rem)] min-h-[calc(100vh_-_clamp(2rem,6vw,4rem))] flex-col gap-[1rem] mx-auto [@media(max-width:640px)]:min-h-[calc(100vh_-_2rem)]">
        <div className="auth-page-header flex items-center justify-between gap-[1rem]">
          <Link
            to="/"
            className="auth-home-link inline-flex w-[fit-content] items-center gap-[0.75rem] [text-decoration:none]"
          >
            <span
              className="ui-shell-brand-mark grid w-[2.5rem] h-[2.5rem] place-items-center shrink-0"
              aria-hidden="true"
            >
              <OrbitMark />
            </span>
            <span>Orbit</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelect />
            <ThemeToggle />
          </div>
        </div>

        <section className="auth-shell grid flex-1 overflow-hidden grid-cols-[minmax(18rem,0.88fr)_minmax(22rem,1.12fr)] [@media(max-width:900px)]:grid-cols-[1fr] ui-section-card">
          <aside
            className="auth-aside flex min-w-[0] flex-col items-center justify-center gap-[clamp(1.5rem,4vw,2.75rem)]
            [border-right:1px_solid_var(--color-line)] [background:#ffffff00] p-[clamp(1.25rem,3vw,2rem)] text-center
            [&_h1]:m-[0] [&_h1]:text-[var(--color-text)] [&_h1]:text-[clamp(2rem,3.5vw,2.75rem)] [&_h1]:[font-weight:720]
            [&_h1]:[letter-spacing:-0.04em] [&_h1]:[line-height:0.98] [&_h1]:text-balance
            [@media(max-width:900px)]:[border-right:0]
            [@media(max-width:900px)]:[border-bottom:1px_solid_var(--color-line)]"
            aria-label={t("orbitWorkspaceSummary")}
          >
            <h1>
              {isRegister
                ? t("buildYourTaskWorkspace")
                : t("welcomeBackToYourWorkspace")}
            </h1>
            <video
              className="auth-aside-video block w-[min(100%,22rem)] max-h-[20rem] object-contain [@media(max-width:900px)]:w-[min(100%,18rem)] [@media(max-width:900px)]:max-h-[14rem]"
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
            >
              <source src="/robothihi1.mp4" type="video/mp4" />
            </video>
          </aside>

          <div
            className="auth-form-panel flex min-w-[0] items-center justify-center [background:var(--color-surface)] p-[clamp(1.25rem,4vw,2.5rem)] [@media(max-width:640px)]:p-[1rem]"
            id="auth-form"
          >
            {children}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;
