import { workspaceKey } from "@/features/tasks/utils/workspaceTranslation";
import { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { CalendarDays, LoaderCircle, Sparkles } from "lucide-react";
import FormDialog from "@/shared/components/FormDialog";
import { useGenerateTasksMutation } from "@/features/tasks/api/aiMutations";
import { formatDateTime } from "@/shared/utils/dateTime";
import { getApiErrorMessage } from "@/shared/services/apiError";

const topics = [
  "Cooking",
  "Work-out",
  "Game",
  "Learning",
  "Coding",
  "Reading",
  "Shopping",
  "Meeting",
];
const DetailRequestModal = ({
  isOpen,
  onClose,
  selectedDate,
  onTasksGenerated,
}) => {
  const { t } = useTranslation("workspace");

  const [userInput, setUserInput] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [error, setError] = useState("");
  const mutation = useGenerateTasksMutation();
  const isLoading = mutation.isPending;
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!userInput.trim() && selectedTopics.length === 0) {
      setError(t("describeYourPlanOrChooseATopicToGetStarted"));
      return;
    }
    const dateStr = selectedDate ? formatDateTime(selectedDate) : "today";
    const request = `In date ${dateStr}, I want: ${userInput.trim()}${selectedTopics.length ? `, ${selectedTopics.join(", ")}` : ""}`;
    try {
      const response = await mutation.mutateAsync({ userRequirement: request });
      if (!response.success || !response.data) {
        setError(t("weCouldnTCreateAPlanYetTryAddingALittleMoreDetail"));
        return;
      }
      onTasksGenerated?.();
      setUserInput("");
      setSelectedTopics([]);
      onClose();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          t("couldnTGenerateTasksYourPlanIsStillHerePleaseTryAgain"),
        ),
      );
    }
  };
  return (
    <FormDialog
      isOpen={isOpen}
      onClose={onClose}
      title={t("generateTasks")}
      kind="generate"
      busy={isLoading}
      closeLabel="Close task generation modal"
    >
      <form className="workspace-form" onSubmit={handleSubmit}>
        <div className="workspace-generate-date">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <span>{t("planningFor")}</span>
            <strong>
              {(selectedDate || new Date()).toLocaleDateString(getLocale(), {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </strong>
          </div>
        </div>
        <div>
          <label htmlFor="calendar-task-request" className="block">
            {t("whatDoYouWantToAccomplish")}
          </label>
          <textarea
            id="calendar-task-request"
            className="ui-input"
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            placeholder={t(
              "tellUsAboutYourDayAGoalAFewIdeasOrAProjectYouDLikeToMoveForward",
            )}
            rows={4}
            disabled={isLoading}
          />
          <p className="workspace-form-hint mt-2">
            {t("aLittleContextHelpsYourGoalAvailableTimeOrWhereToStart")}
          </p>
        </div>
        <fieldset disabled={isLoading}>
          <legend>
            {t("needAStartingPoint")}{" "}
            <span className="workspace-form-hint">{t("pickATopic")}</span>
          </legend>
          <div className="workspace-topic-list">
            {topics.map((topic) => (
              <button
                type="button"
                key={t(workspaceKey(topic), { defaultValue: topic })}
                aria-pressed={selectedTopics.includes(topic)}
                onClick={() =>
                  setSelectedTopics((previous) =>
                    previous.includes(topic)
                      ? previous.filter((value) => value !== topic)
                      : [...previous, topic],
                  )
                }
              >
                {t(workspaceKey(topic), { defaultValue: topic })}
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="workspace-form-error" role="alert">
            {error}
          </p>
        )}
        {isLoading && (
          <p className="workspace-generating" role="status">
            <LoaderCircle size={16} className="animate-spin" />{" "}
            {t("puttingYourPlanTogether")}
          </p>
        )}
        <div className="workspace-form-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="ui-btn-secondary"
          >
            {t("cancel")}
          </button>
          <button type="submit" disabled={isLoading} className="ui-btn-primary">
            <Sparkles size={15} aria-hidden="true" />
            {isLoading ? t("generating") : t("generateTasks")}
          </button>
        </div>
      </form>
    </FormDialog>
  );
};
export default DetailRequestModal;
