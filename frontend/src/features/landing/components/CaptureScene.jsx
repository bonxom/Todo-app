import { useTranslation } from "react-i18next";
import { Inbox, Plus } from "lucide-react";

const CaptureScene = () => {
  const { t } = useTranslation("account");
  return (
    <div className="capture-scene" aria-hidden="true">
      <div className="capture-scene__inbox">
        <div className="capture-scene__header">
          <Inbox size={16} />
          <span>{t("inbox")}</span>
          <b>04</b>
        </div>
        <div className="capture-scene__add">
          <Plus size={14} />
          <span>{t("captureTheNextAction")}</span>
        </div>
        <div className="capture-scene__task capture-scene__task--one">
          <i />
          {t("replyToDesignNotes")}
        </div>
        <div className="capture-scene__task capture-scene__task--two">
          <i />
          {t("outlineSprintScope")}
        </div>
        <div className="capture-scene__task capture-scene__task--three">
          <i />
          {t("bookReviewTime")}
        </div>
      </div>
    </div>
  );
};

export default CaptureScene;
