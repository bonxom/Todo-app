import LanguageSelect from "@/shared/components/LanguageSelect";
import { useTranslation } from "react-i18next";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { Link } from "react-router-dom";
import OrbitMark from "@/shared/components/OrbitMark";

const Navbar = ({ heroPassed = false }) => {
  const { t } = useTranslation("account");
  return (
    <nav
      className="landing-navbar sticky top-[0] z-30 [border-bottom:1px_solid_var(--color-line)] [background:color-mix(in_srgb,var(--color-canvas)_90%,transparent)] [backdrop-filter:blur(20px)]"
      aria-label={t("landingNavigation")}
      data-scrolled={heroPassed}
    >
      <div className="landing-navbar__inner">
        <Link to="/" className="landing-brand" aria-label={t("orbitHome")}>
          <OrbitMark />
          <span>Orbit</span>
        </Link>
        <div className="landing-navbar__links">
          <a href="#capture">{t("capture")}</a>
          <a href="#organize">{t("organize")}</a>
          <a href="#focus">{t("focus")}</a>
        </div>
        <div className="landing-navbar__actions">
          <LanguageSelect />
          <ThemeToggle />
          <Link to="/login">{t("signInCasedSignin")}</Link>
          <Link className="landing-navbar__start" to="/register">
            {t("startFree")}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
