import { useTranslation } from "react-i18next";
import {
  BarChart3,
  CalendarCheck,
  FolderTree,
  ListChecks,
  Search,
  WandSparkles,
} from "lucide-react";

const Features = () => {
  const { t } = useTranslation("account");
  const features = [
    {
      Icon: ListChecks,
      title: t("taskCommandCenter"),
      description: t(
        "createEditFilterAndCompleteTasksFromAFocusedWorkspaceBuiltForDailyUse",
      ),
    },
    {
      Icon: FolderTree,
      title: t("categoriesProjects"),
      description: t(
        "groupRelatedWorkByThemeOrOutcomeSoEveryListStaysEasyToScan",
      ),
    },
    {
      Icon: CalendarCheck,
      title: t("calendarPlanning"),
      description: t(
        "seeDueWorkInContextAndKeepWeeklyCommitmentsVisibleBeforeTheyDrift",
      ),
    },
    {
      Icon: BarChart3,
      title: t("progressTracking"),
      description: t(
        "trackCompletionsActiveWorkAndStatusPatternsWithTheSameVisualLanguageAsTheApp",
      ),
    },
    {
      Icon: Search,
      title: t("quickSearch"),
      description: t(
        "findTheRightTaskQuicklyWithCompactSearchAndFilteringControls",
      ),
    },
    {
      Icon: WandSparkles,
      title: t("aiTaskAssist"),
      description: t(
        "useAssistantSupportWhenAProjectNeedsToBecomeAClearSetOfNextActions",
      ),
    },
  ];

  return (
    <section className="landing-section landing-section--muted" id="features">
      <div className="features-container">
        <header className="landing-section-header">
          <p className="ui-page-kicker">{t("features")}</p>
          <h2 className="features-title">
            {t("everythingYouNeedToStayProductive")}
          </h2>
          <p className="features-subtitle">
            {t(
              "thePublicPagesNowIntroduceTheSameFocusedWorkspaceUsersSeeAfterSigningIn",
            )}
          </p>
        </header>
        <div className="features-grid">
          {features.map((feature) => {
            const FeatureIcon = feature.Icon;

            return (
              <article key={feature.title} className="feature-card">
                <div className="feature-icon">
                  <FeatureIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
