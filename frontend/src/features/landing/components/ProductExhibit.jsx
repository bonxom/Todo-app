import { useTranslation } from "react-i18next";
import { Check, CircleDot, Clock3 } from "lucide-react";
import { useInView } from "../hooks/useInView";

const ProductExhibit = () => {
  const { t } = useTranslation("account");
  const { ref, isVisible } = useInView({ threshold: 0.25 });

  return (
    <section id="focus" className="product-exhibit">
      <div
        ref={ref}
        className="product-exhibit__inner"
        data-visible={isVisible}
      >
        <header className="product-exhibit__copy">
          <p className="orbit-kicker">{t("focusSection")}</p>
          <h2>{t("seeWhatsDoneAndWhatsNext")}</h2>
          <p>
            {t(
              "reviewCompletedTasksCheckUpcomingDeadlinesAndPlanYourNextSession",
            )}
          </p>
        </header>
        <div
          className="product-exhibit__panel"
          aria-label={t("orbitLaunchFocusDashboardPreview")}
        >
          <div className="product-exhibit__panel-top">
            <div>
              <span>{t("projectOrbitLaunch")}</span>
              <strong>{t("launchChecklist")}</strong>
            </div>
            <span className="product-exhibit__live">
              <i />
              {t("onTrack")}
            </span>
          </div>
          <div className="product-exhibit__metrics">
            <div className="product-exhibit__ring" aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="48" />
                <circle
                  className="product-exhibit__ring-progress"
                  cx="60"
                  cy="60"
                  r="48"
                />
              </svg>
            </div>
            <div>
              <span>{t("projectCompletion")}</span>
              <strong>68%</strong>
              <small>{t("weeklyGrowth")}</small>
            </div>
            <div className="product-exhibit__next">
              <span>{t("nextFocusBlock")}</span>
              <strong>14:30</strong>
              <small>{t("launchReview")}</small>
            </div>
          </div>
          <div className="product-exhibit__body">
            <div className="product-exhibit__tasks">
              <span className="product-exhibit__label">{t("focusTasks")}</span>
              <p>
                <Check size={15} />
                {t("reviewCategoryPlan")}
                <small>{t("done")}</small>
              </p>
              <p>
                <CircleDot size={15} />
                {t("prepareLaunchChecklist")}
                <small>{t("now")}</small>
              </p>
              <p>
                <Clock3 size={15} />
                {t("scheduleWeeklyReview")}
                <small>{t("next")}</small>
              </p>
            </div>
            <div className="product-exhibit__timeline">
              <span className="product-exhibit__label">{t("timeline")}</span>
              <div>
                <i />
                <span>09:00</span>
                <b>{t("scopeAligned")}</b>
              </div>
              <div>
                <i />
                <span>12:00</span>
                <b>{t("reviewComplete")}</b>
              </div>
              <div>
                <i />
                <span>14:30</span>
                <b>{t("launchReview")}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductExhibit;
