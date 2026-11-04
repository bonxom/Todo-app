import { useState, useId } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Send,
  MessageCircle,
  X,
} from "lucide-react";

export default function InteractionCard(props) {
  const { interaction } = props;
  // Remount local draft state only when the question or saved answer changes.
  const stateKey = JSON.stringify([
    interaction.id,
    interaction.answer?.optionId,
    interaction.answer?.customAnswer,
    interaction.answer?.cancelled,
  ]);
  return <InteractionCardContent key={stateKey} {...props} />;
}

function InteractionCardContent({
  interaction,
  onAnswer,
  onCancel,
  disabled = false,
  sending = false,
  embedded = false,
  docked = false,
  onSwitchToMessage,
}) {
  const questionId = useId();
  const [optionId, setOptionId] = useState(interaction.answer?.optionId ?? "");
  const [customAnswer, setCustomAnswer] = useState(
    interaction.answer?.customAnswer ?? "",
  );
  const [showCustomAnswer, setShowCustomAnswer] = useState(
    Boolean(interaction.answer?.customAnswer),
  );
  const [showDetails, setShowDetails] = useState(false);

  const isResolved = interaction.status !== "pending";
  const effectiveAnswer = interaction.answer;
  const isBusy = disabled || sending;
  const isCancelled =
    interaction.status === "cancelled" ||
    effectiveAnswer?.optionId === "cancel";

  const confirmation = interaction.kind === "confirmation";
  const options = interaction.options || [];
  const visibleOptions = options.filter(
    (option) => !(confirmation && option.id === "cancel"),
  );

  const selectedOption = options.find(
    (opt) => opt.id === effectiveAnswer?.optionId,
  );
  const selectedOptionLabel =
    selectedOption?.label ?? effectiveAnswer?.optionId ?? "Selected";
  const isCustomAnswer = Boolean(effectiveAnswer?.customAnswer);
  const customAnswerText = effectiveAnswer?.customAnswer;

  const hasDetails = Boolean(interaction.details?.length);
  const hasMultipleOptions = visibleOptions.length > 1;

  const directOption =
    confirmation && visibleOptions.length === 1 ? visibleOptions[0] : null;

  const handleSubmit = (event) => {
    if (event) event.preventDefault();
    if (isBusy || isResolved) return;

    const trimmedCustom = showCustomAnswer ? customAnswer.trim() : "";
    const selectedId = directOption?.id ?? (showCustomAnswer ? "" : optionId);
    if (!trimmedCustom && !selectedId) return;

    const answer = trimmedCustom
      ? { customAnswer: trimmedCustom }
      : { optionId: selectedId };
    onAnswer?.(answer);
  };

  const handleCancel = () => {
    if (isBusy || isResolved) return;
    onCancel?.();
  };

  // --- RESOLVED VIEW (CODING AGENT COMPACT SUMMARY) ---
  if (isResolved) {
    return (
      <div
        role="status"
        className={
          embedded
            ? "space-y-2 py-0.5 text-sm"
            : "space-y-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 text-sm shadow-xs transition-all"
        }
      >
        <div className="flex items-start gap-2.5">
          <div
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
              isCancelled
                ? "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border border-[var(--color-line)]"
                : "bg-[var(--color-success-soft)] text-[var(--color-success)] dark:bg-[var(--color-success)]/20 border border-[var(--color-success)]/30"
            }`}
          >
            {isCancelled ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="font-medium text-[var(--color-text)] leading-snug break-words">
              {interaction.question}
            </p>

            <div className="text-xs sm:text-sm leading-relaxed text-[var(--color-text)]">
              {isCancelled ? (
                <span className="text-[var(--color-text-muted)] italic">
                  (Cancelled)
                </span>
              ) : isCustomAnswer ? (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[var(--color-text-muted)]">
                    Your answer:
                  </span>
                  <span className="font-medium text-[var(--color-text)] bg-[var(--color-surface-muted)] px-2 py-0.5 rounded border border-[var(--color-line)] break-words">
                    {customAnswerText}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[var(--color-text-muted)]">
                    {confirmation ? "Confirmed" : "You selected"}
                  </span>
                  <span className="font-semibold text-[var(--color-accent-strong)] dark:text-[var(--color-accent)] bg-[var(--color-accent-soft)] px-2 py-0.5 rounded border border-[var(--color-line)] break-words">
                    {selectedOptionLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible details / options if user wants to review original choices */}
        {(hasDetails || hasMultipleOptions) && (
          <div className="pt-1 border-t border-[var(--color-line)]/50 mt-2">
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="ui-focus-ring inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>Hide question details</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Show question details</span>
                </>
              )}
            </button>

            {showDetails && (
              <div className="mt-2 space-y-2.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)]/40 p-2.5 text-xs animate-in fade-in duration-150">
                {hasDetails && (
                  <dl className="space-y-1 font-mono text-[11px]">
                    {interaction.details.map((detail, index) => (
                      <div key={index} className="flex gap-2">
                        <dt className="text-[var(--color-text-muted)] shrink-0 font-medium">
                          {detail.label}:
                        </dt>
                        <dd className="text-[var(--color-text)] break-words">
                          {detail.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {hasMultipleOptions && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold font-mono block">
                      Options:
                    </span>
                    <div className="space-y-1">
                      {visibleOptions.map((opt) => {
                        const isThisChosen =
                          effectiveAnswer?.optionId === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-start gap-2 rounded p-1.5 text-xs transition-colors ${
                              isThisChosen
                                ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent-strong)] dark:text-[var(--color-accent)] border border-[var(--color-accent)]/30"
                                : "text-[var(--color-text-muted)] opacity-80"
                            }`}
                          >
                            <span className="shrink-0 mt-0.5 text-[10px]">
                              {isThisChosen ? "●" : "○"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="break-words">{opt.label}</span>
                              {opt.description && (
                                <p className="text-[11px] opacity-75 mt-0.5 leading-relaxed">
                                  {opt.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const canSubmit =
    !isBusy &&
    Boolean(
      directOption || (showCustomAnswer ? customAnswer.trim() : optionId),
    );

  return (
    <form
      aria-busy={sending}
      className={
        docked
          ? "ui-ask-card flex min-h-0 flex-col overflow-hidden text-sm"
          : "ui-ask-card flex min-h-0 flex-col rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-sm"
      }
      onSubmit={handleSubmit}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-2 text-xs">
        <div className="inline-flex items-center gap-1.5 text-[var(--color-accent-strong)]">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium">
            {confirmation ? "Confirm action" : "Let's clarify your request"}
          </span>
        </div>
        {onSwitchToMessage && (
          <button
            type="button"
            aria-label="Change request"
            disabled={isBusy}
            onClick={onSwitchToMessage}
            title="Send a new request instead of answering this question"
            className="ui-focus-ring rounded-lg px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
          >
            Change request →
          </button>
        )}
      </div>

      <h3 id={questionId} className="chat-ask-question">
        {interaction.question}
      </h3>

      {interaction.allowCustomAnswer && !confirmation && (
        <div
          className="mb-2 flex shrink-0 gap-1 rounded-lg bg-[var(--color-surface-muted)] p-1"
          aria-label="Answer method"
        >
          <button
            type="button"
            aria-pressed={!showCustomAnswer}
            disabled={isBusy}
            onClick={() => setShowCustomAnswer(false)}
            className={`ui-focus-ring flex-1 rounded-md px-2 py-2 text-xs font-medium ${!showCustomAnswer ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-xs" : "text-[var(--color-text-muted)]"}`}
          >
            Choose an option
          </button>
          <button
            type="button"
            aria-pressed={showCustomAnswer}
            disabled={isBusy}
            onClick={() => setShowCustomAnswer(true)}
            className={`ui-focus-ring flex-1 rounded-md px-2 py-2 text-xs font-medium ${showCustomAnswer ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-xs" : "text-[var(--color-text-muted)]"}`}
          >
            Other answer
          </button>
        </div>
      )}

      <div className="min-h-0 overflow-y-auto overscroll-contain py-2 pr-1 [scrollbar-width:thin]">
        <fieldset
          aria-labelledby={questionId}
          disabled={isBusy}
          className="min-w-0 space-y-3"
        >
          {hasDetails && (
            <dl className="space-y-1 rounded-lg bg-[var(--color-surface-muted)] p-3 text-xs">
              {interaction.details.map((detail, index) => (
                <div key={index} className="flex flex-wrap gap-x-2 gap-y-1">
                  <dt className="font-medium text-[var(--color-text-muted)]">
                    {detail.label}:
                  </dt>
                  <dd className="min-w-0 break-words text-[var(--color-text)]">
                    {detail.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {showCustomAnswer ? (
            <label className="block space-y-2">
              <span className="text-xs text-[var(--color-text-muted)]">
                Your answer
              </span>
              <textarea
                aria-label="Other answer"
                rows={3}
                autoFocus
                className="ui-input block w-full resize-none rounded-xl px-3 py-2 text-sm"
                placeholder="Tell the assistant what works for you…"
                value={customAnswer}
                maxLength={2000}
                onChange={(event) => {
                  setCustomAnswer(event.target.value);
                  setOptionId("");
                }}
              />
            </label>
          ) : (
            !directOption && (
              <div className="space-y-2">
                {visibleOptions.map((option) => {
                  const isSelected = optionId === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-[var(--color-accent)] ${isSelected ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-line)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]"}`}
                    >
                      <input
                        type="radio"
                        name={`interaction-${interaction.id}`}
                        value={option.id}
                        aria-label={option.label}
                        checked={isSelected}
                        onChange={() => setOptionId(option.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug break-words text-[var(--color-text)]">
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="mt-1 block text-xs leading-relaxed text-[var(--color-text-muted)]">
                            {option.description}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )
          )}
          {directOption?.description && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {directOption.description}
            </p>
          )}
        </fieldset>
      </div>
      <div className="mt-2 flex shrink-0 items-center justify-end gap-2 border-t border-[var(--color-line)] pt-3">
        <button
          className="ui-btn-secondary ui-focus-ring rounded-lg px-3 text-xs font-medium disabled:opacity-50"
          type="button"
          aria-label="Cancel"
          disabled={isBusy}
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          className="ui-btn-primary ui-focus-ring min-w-0 rounded-lg px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          aria-label={confirmation ? "Confirm" : "Send answer"}
          disabled={!canSubmit}
        >
          <Send className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="break-words leading-snug">
            {sending
              ? "Sending…"
              : (directOption?.label ??
                (confirmation ? "Confirm" : "Send answer"))}
          </span>
        </button>
      </div>
    </form>
  );
}
