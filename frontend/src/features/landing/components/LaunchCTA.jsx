import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const LaunchCTA = () => {
  const { t } = useTranslation("account");
  return (
    <section className="launch-cta">
      <div className="launch-cta__content">
        <p className="orbit-kicker">{t("getStarted")}</p>
        <h2>{t("startWithYourFirstTask")}</h2>
        <p>{t("createAnAccountToSaveYourTasksAndOrganizeYourProjects")}</p>
        <Link className="orbit-button orbit-button--primary" to="/register">
          {t("createAnAccount")}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default LaunchCTA;
