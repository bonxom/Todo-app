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
  const [userInput, setUserInput] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [error, setError] = useState("");
  const mutation = useGenerateTasksMutation();
  const isLoading = mutation.isPending;
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!userInput.trim() && selectedTopics.length === 0) {
      setError("Describe your plan or choose a topic to get started.");
      return;
    }
    const dateStr = selectedDate ? formatDateTime(selectedDate) : "today";
    const request = `In date ${dateStr}, I want: ${userInput.trim()}${selectedTopics.length ? `, ${selectedTopics.join(", ")}` : ""}`;
    try {
      const response = await mutation.mutateAsync({ userRequirement: request });
      if (!response.success || !response.data) {
        setError(
          "We couldn't create a plan yet. Try adding a little more detail.",
        );
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
          "Couldn't generate tasks. Your plan is still here — please try again.",
        ),
      );
    }
  };
  return (
    <FormDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Tasks"
      kind="generate"
      busy={isLoading}
      closeLabel="Close task generation modal"
    >
      <form className="workspace-form" onSubmit={handleSubmit}>
        <div className="workspace-generate-date">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <span>PLANNING FOR</span>
            <strong>
              {(selectedDate || new Date()).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </strong>
          </div>
        </div>
        <div>
          <label htmlFor="calendar-task-request" className="block">
            What do you want to accomplish?
          </label>
          <textarea
            id="calendar-task-request"
            className="ui-input"
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            placeholder="Tell us about your day. A goal, a few ideas, or a project you'd like to move forward…"
            rows={4}
            disabled={isLoading}
          />
          <p className="workspace-form-hint mt-2">
            A little context helps: your goal, available time, or where to
            start.
          </p>
        </div>
        <fieldset disabled={isLoading}>
          <legend>
            Need a starting point?{" "}
            <span className="workspace-form-hint">Pick a topic</span>
          </legend>
          <div className="workspace-topic-list">
            {topics.map((topic) => (
              <button
                type="button"
                key={topic}
                aria-pressed={selectedTopics.includes(topic)}
                onClick={() =>
                  setSelectedTopics((previous) =>
                    previous.includes(topic)
                      ? previous.filter((value) => value !== topic)
                      : [...previous, topic],
                  )
                }
              >
                {topic}
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
            <LoaderCircle size={16} className="animate-spin" /> Putting your
            plan together…
          </p>
        )}
        <div className="workspace-form-actions">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="ui-btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="ui-btn-primary">
            <Sparkles size={15} aria-hidden="true" />
            {isLoading ? "Generating…" : "Generate Tasks"}
          </button>
        </div>
      </form>
    </FormDialog>
  );
};
export default DetailRequestModal;
