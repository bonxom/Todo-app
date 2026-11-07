import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import OrbitMark from "@/shared/components/OrbitMark";

const Footer = () => {
  const { t } = useTranslation("account");
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__brand">
          <div>
            <OrbitMark />
            <strong>Orbit</strong>
          </div>
          <p>
            {t(
              "aFocusedTaskWorkspaceForListsProjectsCalendarsAndSteadyProgress",
            )}
          </p>
        </div>
        <div className="landing-footer__section">
          <h3>Orbit</h3>
          <a href="#capture">{t("capture")}</a>
          <a href="#organize">{t("organize")}</a>
          <a href="#focus">{t("focus")}</a>
        </div>
        <div className="landing-footer__section">
          <h3>{t("account")}</h3>
          <Link to="/login">{t("signInCasedSignin")}</Link>
          <Link to="/register">{t("createWorkspaceCasedCreateworksp")}</Link>
        </div>
      </div>
      <p className="landing-footer__bottom">
        © {year} {t("orbitAllRightsReserved")}
      </p>
    </footer>
  );
};

export default Footer;
