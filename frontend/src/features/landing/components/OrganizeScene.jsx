import { useTranslation } from "react-i18next";
import { CalendarDays, FolderKanban, Layers3, Tag } from "lucide-react";

const OrganizeScene = () => {
  const { t } = useTranslation("account");
  return (
    <div className="organize-scene" aria-hidden="true">
      <div className="organize-scene__module organize-scene__module--category">
        <Tag size={17} />
        <span>{t("work")}</span>
        <small>{t("category")}</small>
      </div>
      <div className="organize-scene__module organize-scene__module--project">
        <FolderKanban size={17} />
        <span>{t("orbitLaunch")}</span>
        <small>{t("project")}</small>
      </div>
      <div className="organize-scene__module organize-scene__module--calendar">
        <CalendarDays size={17} />
        <span>{t("thursday")}</span>
        <small>{t("calendar")}</small>
      </div>
      <div className="organize-scene__module organize-scene__module--priority">
        <Layers3 size={17} />
        <span>{t("highPriority")}</span>
        <small>{t("priority")}</small>
      </div>
    </div>
  );
};

export default OrganizeScene;
