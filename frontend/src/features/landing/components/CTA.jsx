import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  const { t } = useTranslation("account");
  return (
    <section className="landing-section landing-cta-section">
      <div className="cta-container ui-section-card ui-card-padding p-[clamp(1rem,2vw,1.5rem)]">
        <p className="ui-page-kicker m-[0] text-[var(--color-accent)] [font-weight:600] [line-height:1.2] uppercase">
          {t("ready")}
        </p>
        <h2 className="cta-title">{t("readyToGetOrganized")}</h2>
        <p className="cta-description">
          {t(
            "startWithTheSameCleanWorkspaceShownHereThenBuildYourCategoriesProjectsCalendarAndProgressViewsAsYourTaskListGrows",
          )}
        </p>
        <Link className="ui-btn-primary cta-button" to="/register">
          {t("createWorkspace")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default CTA;
