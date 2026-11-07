import { useTranslation } from "react-i18next";
import { Check, CircleDot, Search } from "lucide-react";

const OrbitScene = () => {
  const { t } = useTranslation("account");
  return (
    <div className="orbit-scene" aria-label={t("taskWorkspacePreview")}>
      <div className="orbit-scene__deck-wrap">
        <div className="orbit-scene__deck">
          <div className="orbit-scene__topbar">
            <span className="orbit-scene__window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>{t("orbitWorkspace")}</span>
            <Search size={14} aria-hidden="true" />
          </div>
          <div className="orbit-scene__dashboard">
            <aside className="orbit-scene__sidebar" aria-hidden="true">
              <span className="is-active" />
              <span />
              <span />
              <span />
            </aside>
            <div className="orbit-scene__main">
              <div className="orbit-scene__headline-row">
                <div>
                  <span className="orbit-scene__eyebrow">{t("yourTasks")}</span>
                  <strong>{t("today")}</strong>
                </div>
                <span className="orbit-scene__status">{t("3Active")}</span>
              </div>
              <div className="orbit-scene__progress-card">
                <div>
                  <span>{t("projectCompletion")}</span>
                  <strong>68%</strong>
                </div>
                <div className="orbit-scene__progress-track" aria-hidden="true">
                  <span />
                </div>
              </div>
              <div className="orbit-scene__tasks">
                <div>
                  <Check size={14} aria-hidden="true" />
                  <span>{t("reviewCategoryPlan")}</span>
                  <small>{t("done")}</small>
                </div>
                <div>
                  <CircleDot size={14} aria-hidden="true" />
                  <span>{t("prepareLaunchChecklist")}</span>
                  <small>{t("now")}</small>
                </div>
                <div>
                  <CircleDot size={14} aria-hidden="true" />
                  <span>{t("scheduleWeeklyReview")}</span>
                  <small>{t("next")}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrbitScene;
