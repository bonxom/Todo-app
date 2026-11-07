import { useTranslation } from "react-i18next";
import { Plus, FolderPlus, Layers } from "lucide-react";

const ActionButtons = ({ onAddTask, onAddCategory, onAddProject }) => {
  const { t } = useTranslation("workspace");

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onAddTask}
        className="ui-btn-primary ui-btn-opposite-corners flex-1 sm:flex-none"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>{t("addTaskCasedAddTask")}</span>
      </button>

      <button
        type="button"
        onClick={onAddCategory}
        className="ui-btn-secondary ui-btn-opposite-corners flex-1 sm:flex-none"
      >
        <Layers className="h-4 w-4" aria-hidden="true" />
        <span>{t("addCategory")}</span>
      </button>

      <button
        type="button"
        onClick={onAddProject}
        className="ui-btn-secondary ui-btn-opposite-corners flex-1 sm:flex-none"
      >
        <FolderPlus className="h-4 w-4" aria-hidden="true" />
        <span>{t("addProject")}</span>
      </button>
    </div>
  );
};

export default ActionButtons;
