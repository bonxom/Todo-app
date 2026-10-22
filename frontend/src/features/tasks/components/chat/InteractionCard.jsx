import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Send, Terminal, X } from "lucide-react";

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
  embedded = false,
  docked = false,
  onSwitchToMessage,
}) {
  const [optionId, setOptionId] = useState(interaction.answer?.optionId ?? "");
  const [customAnswer, setCustomAnswer] = useState(
    interaction.answer?.customAnswer ?? "",
  );
  const [localSubmission, setLocalSubmission] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const isServerResolved = interaction.status !== "pending";
  const effectiveAnswer = localSubmission || interaction.answer;
  const isCancelled =
    Boolean(localSubmission?.cancelled) ||
    interaction.status === "cancelled" ||
    effectiveAnswer?.optionId === "cancel";
  const isResolved = isServerResolved || Boolean(localSubmission);

  const confirmation = interaction.kind === "confirmation";
  const options = interaction.options || [];
  const visibleOptions = options.filter(
    (option) => !(confirmation && option.id === "cancel"),
  );

  const selectedOption = options.find(
    (opt) => opt.id === effectiveAnswer?.optionId,
  );
  const selectedOptionLabel =
    selectedOption?.label ?? effectiveAnswer?.optionId ?? "Đã chọn";
  const isCustomAnswer = Boolean(effectiveAnswer?.customAnswer);
  const customAnswerText = effectiveAnswer?.customAnswer;

  const hasDetails = Boolean(interaction.details?.length);
  const hasMultipleOptions = visibleOptions.length > 1;

  const handleSubmit = (event) => {
    if (event) event.preventDefault();
    if (disabled || isResolved) return;

    const trimmedCustom = customAnswer.trim();
    if (!trimmedCustom && !optionId) return;

    const answer = trimmedCustom
      ? { customAnswer: trimmedCustom }
      : { optionId };

    setLocalSubmission(answer);
    onAnswer?.(answer);
  };

  const handleCancel = () => {
    if (disabled || isResolved) return;
    setLocalSubmission({ cancelled: true });
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
                  (Đã hủy)
                </span>
              ) : isCustomAnswer ? (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[var(--color-text-muted)]">
                    Bạn đã trả lời:
                  </span>
                  <span className="font-medium text-[var(--color-text)] bg-[var(--color-surface-muted)] px-2 py-0.5 rounded border border-[var(--color-line)] break-words">
                    {customAnswerText}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[var(--color-text-muted)]">
                    {confirmation ? "Bạn đã xác nhận" : "Bạn đã chọn"}
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
                  <span>Ẩn chi tiết câu hỏi</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Xem chi tiết câu hỏi</span>
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
                      Các lựa chọn:
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

  // --- PENDING VIEW (CODING AGENT INTERACTIVE CARD) ---
  const canSubmit = !disabled && (Boolean(optionId) || Boolean(customAnswer.trim()));

  return (
    <form
      className={
        docked
          ? `flex min-h-0 flex-col overflow-hidden text-sm ${
              disabled ? "opacity-75" : ""
            }`
          : `space-y-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-sm shadow-sm transition-all ${
              disabled ? "opacity-75" : ""
            }`
      }
      onSubmit={handleSubmit}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] pb-2.5 text-xs">
        <div className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-[var(--color-accent-strong)] dark:text-[var(--color-accent)]">
          <Terminal className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">
            {confirmation ? "Xác nhận hành động" : "Câu hỏi từ Agent"}
          </span>
          <span className="rounded-full bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)] font-normal">
            ({visibleOptions.length} lựa chọn)
          </span>
        </div>
        {onSwitchToMessage && (
          <button
            type="button"
            onClick={onSwitchToMessage}
            className="ui-focus-ring shrink-0 rounded-lg px-2 py-1.5 text-xs text-[var(--color-accent-strong)] hover:bg-[var(--color-surface-muted)] transition-colors cursor-pointer"
          >
            Nhắn tin →
          </button>
        )}
      </div>

      <div className={docked ? "min-h-0 overflow-y-auto overscroll-contain py-3 pr-1 [scrollbar-width:thin]" : ""}>
      <fieldset disabled={disabled} className="min-w-0 space-y-3">
        <legend className="mb-2 w-full text-sm font-medium text-[var(--color-text)] leading-relaxed break-words">
          {interaction.question}
        </legend>

        {/* Details list if any */}
        {hasDetails && (
          <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)]/50 p-2.5 text-xs font-mono">
            {interaction.details.map((detail, index) => (
              <div key={index} className="flex gap-2 py-0.5">
                <span className="font-medium text-[var(--color-text-muted)] shrink-0">
                  {detail.label}:
                </span>
                <span className="text-[var(--color-text)] break-words">
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Options list */}
        <div className="space-y-2">
          {visibleOptions.map((option) => {
            const isSelected = optionId === option.id && !customAnswer;
            return (
              <label
                key={option.id}
                onDoubleClick={() => {
                  if (!disabled) {
                    setOptionId(option.id);
                    setCustomAnswer("");
                    setLocalSubmission({ optionId: option.id });
                    onAnswer?.({ optionId: option.id });
                  }
                }}
                className={`group relative flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 text-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-[var(--color-accent)] ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/40 ring-1 ring-[var(--color-accent)] shadow-xs"
                    : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/60 hover:bg-[var(--color-surface-muted)]/40"
                }`}
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <input
                    type="radio"
                    id={`interaction-${interaction.id}-${option.id}`}
                    name={`interaction-${interaction.id}`}
                    value={option.id}
                    aria-label={option.label}
                    checked={isSelected}
                    onChange={() => {
                      setOptionId(option.id);
                      setCustomAnswer("");
                    }}
                    className="h-4 w-4 accent-[var(--color-accent)] cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-text)] leading-snug break-words">
                      {option.label}
                    </span>
                  </div>
                  {option.description && (
                    <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-normal break-words">
                      {option.description}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {/* Other answer */}
        {interaction.allowCustomAnswer && !confirmation && (
          <div className="pt-1">
            <label className="block space-y-1.5">
              <span className="block text-xs font-medium text-[var(--color-text-muted)]">
                Other answer
              </span>
              <textarea
                aria-label="Other answer"
                rows={1}
                style={{
                  height: "2.5rem",
                  minHeight: "2.5rem",
                  padding: "0.5rem 0.75rem",
                  lineHeight: "1.375rem",
                  resize: "none",
                  overflowY: "auto",
                }}
                className="ui-input w-full text-xs font-sans rounded-lg resize-none p-2.5 transition-all focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                placeholder="Lựa chọn khác..."
                value={customAnswer}
                maxLength={2000}
                onChange={(event) => {
                  setCustomAnswer(event.target.value);
                  setOptionId("");
                }}
              />
            </label>
          </div>
        )}

      </fieldset>
      </div>
        {/* Keep actions visible while the question and options scroll. */}
        <div className="flex shrink-0 items-center justify-between gap-2 pt-2.5 border-t border-[var(--color-line)]">
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="ui-btn-secondary ui-focus-ring px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
              type="button"
              disabled={disabled}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              className="ui-btn-primary ui-focus-ring px-3.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              type="submit"
              disabled={!canSubmit}
            >
              <Send className="h-3 w-3" />
              <span>{confirmation ? "Confirm" : "Send answer"}</span>
            </button>
          </div>
        </div>
    </form>
  );
}
