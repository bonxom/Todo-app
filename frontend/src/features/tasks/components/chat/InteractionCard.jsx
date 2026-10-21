import { useState, useEffect } from "react";
import { Check, ChevronDown, ChevronUp, Send, Terminal, X } from "lucide-react";

export default function InteractionCard({
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

  // Reset local state when interaction changes
  useEffect(() => {
    setOptionId(interaction.answer?.optionId ?? "");
    setCustomAnswer(interaction.answer?.customAnswer ?? "");
    setLocalSubmission(null);
    setShowDetails(false);
  }, [interaction.id, interaction.answer]);

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
          ? `space-y-3 max-h-[55vh] overflow-y-auto pr-0.5 text-sm transition-all ${
              disabled ? "opacity-75" : ""
            }`
          : `space-y-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-sm shadow-sm transition-all ${
              disabled ? "opacity-75" : ""
            }`
      }
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] pb-2 text-xs">
        <div className="inline-flex items-center gap-1.5 font-mono text-[var(--color-accent-strong)] dark:text-[var(--color-accent)]">
          <Terminal className="h-3.5 w-3.5" />
          <span className="font-semibold uppercase tracking-wider">
            {confirmation ? "Xác nhận hành động" : "Câu hỏi từ Agent"}
          </span>
          <span className="text-[var(--color-text-muted)] font-normal">
            ({visibleOptions.length} lựa chọn)
          </span>
        </div>
        {onSwitchToMessage && (
          <button
            type="button"
            onClick={onSwitchToMessage}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors underline cursor-pointer"
          >
            Nhắn tin →
          </button>
        )}
      </div>

      <fieldset disabled={disabled} className="space-y-3">
        <legend className="font-semibold text-sm sm:text-base text-[var(--color-text)] leading-snug break-words">
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
          {visibleOptions.map((option, index) => {
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
                className={`group relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-all duration-150 ${
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
                    <p className="mt-1 text-xs text-[var(--color-text-muted)] leading-relaxed break-words">
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
                className="ui-input w-full text-xs font-sans rounded-lg resize-none min-h-[64px] p-2.5 transition-all focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                placeholder="Nhập câu trả lời cụ thể của bạn nếu các lựa chọn trên không phù hợp..."
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

        {/* Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-line)]/60">
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="ui-btn-secondary ui-focus-ring px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
              type="button"
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
      </fieldset>
    </form>
  );
}
