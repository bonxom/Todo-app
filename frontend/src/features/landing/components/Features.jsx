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
          <p className="ui-page-kicker m-[0] text-[var(--color-accent)] [font-weight:600] [line-height:1.2] uppercase">
            {t("features")}
          </p>
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
              <article
                key={feature.title}
                className="feature-card [border:1px_solid_var(--color-line)] rounded-[12px] [background:var(--color-surface)]
                overflow-hidden [transition:transform_0.3s,border-color_0.3s,box-shadow_0.3s]
                [&:hover]:border-[var(--color-accent)] [&:hover]:[box-shadow:var(--shadow-sm)] [&_h3]:[font-weight:550]
                [&_h3]:[letter-spacing:-0.6px] [&_h3]:m-[0_0_13px] [&_>_p]:[line-height:1.85]
                [&_>_p]:text-[var(--color-text-muted)] [&_>_p]:m-[0]
                [&.is-revealed_.chart-bars_i]:animate-[orbit-bar-grow_0.9s_both]
                [@media(max-width:800px)]:grid-cols-[1fr_1fr] [@media(max-width:800px)]:gap-x-[30px]"
              >
                <div
                  className="feature-icon flex items-center justify-between text-[var(--color-accent)]
                  [&_>_span]:[font:10px_var(--font-mono)] [&_>_span]:text-[var(--color-text-muted)]
                  [@media(max-width:800px)]:col-1"
                >
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
