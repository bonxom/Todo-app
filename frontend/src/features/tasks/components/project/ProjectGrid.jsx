import { useTranslation } from "react-i18next";
import ProjectCard from "./ProjectCard";

const ProjectGrid = ({
  items,
  onTaskUpdated,
  onProjectUpdated,
  onCreateProject,
}) => {
  const { t } = useTranslation("workspace");

  if (items.length === 0) {
    return (
      <section className="ui-section-card border-dashed px-6 py-14 text-center">
        <p className="text-lg font-semibold text-[color:var(--color-text)]">
          {t("noProjectsToShow")}
        </p>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          {t("createAProjectToTrackMultiStepWorkWithItsOwnProgressAndTaskList")}
        </p>
        <button
          type="button"
          onClick={onCreateProject}
          className="ui-btn-primary ui-btn-opposite-corners mt-6"
        >
          {t("addProject")}
        </button>
      </section>
    );
  }

  return (
    <div className="category-grid">
      {items.map((item) => (
        <ProjectCard
          key={item._id}
          project={item}
          tasks={item.tasks}
          onTaskUpdated={onTaskUpdated}
          onProjectUpdated={onProjectUpdated}
        />
      ))}
      <button
        type="button"
        className="category-create-card"
        onClick={onCreateProject}
      >
        <span aria-hidden="true">+</span>
        <strong>{t("makeRoomForABiggerPlan")}</strong>
        <p>{t("bringYourNextProjectToLife")}</p>
        <b>{t("addProject")}</b>
      </button>
    </div>
  );
};

export default ProjectGrid;
