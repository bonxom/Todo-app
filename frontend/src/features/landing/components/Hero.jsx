import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import OrbitScene from "./OrbitScene";

const Hero = () => {
  const { t } = useTranslation("account");
  return (
    <section className="orbit-hero">
      <div className="orbit-hero__content">
        <p className="orbit-kicker">{t("tasksProjectsCalendar")}</p>
        <h1 className="orbit-hero__title">{t("knowWhatNeedsDoing")}</h1>
        <p className="orbit-hero__description">
          {t("keepYourTasksProjectDeadlinesAndScheduleInOnePlace")}
        </p>
        <div className="orbit-hero__actions">
          <Link className="orbit-button orbit-button--primary" to="/register">
            {t("createYourWorkspace")}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link className="orbit-button orbit-button--secondary" to="/login">
            {t("signInCasedSignin")}
          </Link>
        </div>
        <div className="orbit-hero__proof" aria-label={t("productHighlights")}>
          <span>
            <Sparkles size={15} aria-hidden="true" />
            {t("aiTaskAssist")}
          </span>
          <span>
            <CalendarDays size={15} aria-hidden="true" />
            {t("calendarPlanning")}
          </span>
          <span>{t("completionTracking")}</span>
        </div>
      </div>
      <OrbitScene />
    </section>
  );
};

export default Hero;
