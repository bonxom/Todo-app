import { useTranslation } from "react-i18next";
import { CheckSquare, LayoutDashboard, PlusCircle } from "lucide-react";

const HowItWorks = () => {
  const { t } = useTranslation("account");
  const steps = [
    {
      number: "01",
      Icon: LayoutDashboard,
      title: t("openYourWorkspace"),
      description: t(
        "createAnAccountAndLandInTheSameDashboardUsedForEverydayPlanning",
      ),
    },
    {
      number: "02",
      Icon: PlusCircle,
      title: t("captureTheWork"),
      description: t(
        "addTasksWithProjectsCategoriesDatesAndTheDetailsYouNeedLater",
      ),
    },
    {
      number: "03",
      Icon: CheckSquare,
      title: t("reviewProgress"),
      description: t(
        "useCalendarAndStatisticsViewsToKeepYourNextActionsHonest",
      ),
    },
  ];

  return (
    <section className="landing-section" id="how-it-works">
      <div className="how-it-works-container">
        <header className="landing-section-header">
          <p className="ui-page-kicker">{t("workflow")}</p>
          <h2 className="how-it-works-title">
            {t("howItWorksCasedHowItWorks")}
          </h2>
          <p className="how-it-works-subtitle">
            {t("aShortPathFromAccountSetupToAWorkingTaskSystem")}
          </p>
        </header>
        <div className="steps-container">
          {steps.map((step) => {
            const StepIcon = step.Icon;

            return (
              <article key={step.number} className="step-card">
                <div className="step-number-row">
                  <span className="step-number ui-tabular">{step.number}</span>
                  <span className="step-icon">
                    <StepIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
