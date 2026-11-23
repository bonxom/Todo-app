import { useTranslation } from "react-i18next";
import { useState, useId, useLayoutEffect, useRef } from "react";
import { Check, ChevronDown, ChevronUp, Send, X } from "lucide-react";

function AnswerOption({
  name,
  value,
  label,
  description,
  checked,
  onChange,
  onClick,
  onKeyDown,
}) {
  const labelId = useId();
  const descriptionId = `${labelId}-description`;

  return (
    <label
      className={`flex min-h-11 cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-[var(--color-accent)] has-disabled:cursor-default ${checked ? "bg-[var(--color-accent-soft)]" : "hover:bg-[var(--color-surface-muted)]"}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        checked={checked}
        onChange={onChange}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
      />
      <span className="min-w-0 flex-1">
        <span
          id={labelId}
          className="block font-medium leading-snug wrap-anywhere text-[var(--color-text)]"
        >
          {label}
        </span>
        {description && (
          <span
            id={descriptionId}
            className="mt-0.5 block text-xs leading-normal wrap-anywhere text-[var(--color-text-muted)]"
          >
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

function focusAnswerInput(input) {
  input?.focus({ preventScroll: true });
  input?.scrollIntoView?.({ block: "nearest" });
}

function ClarificationSummary({ interaction, children }) {
  const { t } = useTranslation("agent");
  const { answer, options = [] } = interaction;
  const cancelled = interaction.status === "cancelled";
  const customAnswer = answer?.customAnswer;
  const selectedOption = options.find(
    (option) => option.id === answer?.optionId,
  );
  const answerText = customAnswer ?? selectedOption?.label ?? answer?.optionId;
  const label = cancelled
    ? t("cancelledLabel")
    : t(customAnswer ? "yourAnswer" : "youSelected");

  return (
    <details className="group w-fit min-w-0 max-w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-sm text-[var(--color-text)]">
      <summary className="ui-focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 hover:bg-[var(--color-surface-muted)] [&::-webkit-details-marker]:hidden">
        {cancelled ? (
          <X
            className="size-4 shrink-0 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
        ) : (
          <Check
            className="size-4 shrink-0 text-[var(--color-success)]"
            aria-hidden="true"
          />
        )}
        <span role="status" className="flex min-w-0 items-baseline gap-2">
          <span
            className={
              cancelled || !answerText
                ? "shrink-0 text-xs text-[var(--color-text-muted)]"
                : "sr-only"
            }
          >
            {label}
          </span>
          {!cancelled && answerText && (
            <span className="truncate font-semibold group-open:whitespace-pre-wrap group-open:wrap-anywhere">
              {answerText}
            </span>
          )}
        </span>
        <ChevronDown
          className="ml-auto size-4 shrink-0 text-[var(--color-text-muted)] group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-3 border-t border-[var(--color-line)] px-3 py-3">
        <p className="font-medium leading-snug wrap-anywhere">
          {interaction.question}
        </p>
        {options.length > 0 && (
          <ul className="divide-y divide-[var(--color-line)]">
            {options.map((option) => (
              <li key={option.id} className="py-2 wrap-anywhere">
                <div className="flex items-start gap-2">
                  {option === selectedOption && !cancelled && (
                    <>
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{t("selected")}</span>
                    </>
                  )}
                  <span className="font-medium">{option.label}</span>
                </div>
                {option.description && (
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {option.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </details>
  );
}

export default function InteractionCard(props) {
  const { interaction, children } = props;
  if (
    interaction.kind === "clarification" &&
    interaction.status !== "pending"
  ) {
    return (
      <ClarificationSummary key={interaction.id} interaction={interaction}>
        {children}
      </ClarificationSummary>
    );
  }
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
  const { t } = useTranslation("agent");

  const questionId = useId();
  const customInputId = useId();
  const customTextareaRef = useRef(null);
  const focusCustomOnMount = useRef(false);

  const initialMode = interaction.answer?.customAnswer
    ? "custom"
    : interaction.answer?.optionId
      ? "option"
      : "";

  const [selectedMode, setSelectedMode] = useState(initialMode);
  const [optionId, setOptionId] = useState(interaction.answer?.optionId ?? "");
  const [customAnswer, setCustomAnswer] = useState(
    interaction.answer?.customAnswer ?? "",
  );
  const [showDetails, setShowDetails] = useState(false);
  const customSelected = selectedMode === "custom";

  useLayoutEffect(() => {
    if (!customSelected || !focusCustomOnMount.current) return;
    focusCustomOnMount.current = false;
    focusAnswerInput(customTextareaRef.current);
  }, [customSelected]);

  const isResolved = interaction.status !== "pending";
  const effectiveAnswer = interaction.answer;
  const isBusy = disabled || sending;
  const confirmation = interaction.kind === "confirmation";
  const isCancelled =
    interaction.status === "cancelled" ||
    (confirmation && effectiveAnswer?.optionId === "cancel");

  const options = interaction.options || [];
  const visibleOptions = options.filter(
    (option) => !(confirmation && option.id === "cancel"),
  );

  const selectedOption = options.find(
    (opt) => opt.id === effectiveAnswer?.optionId,
  );
  const selectedOptionLabel =
    selectedOption?.label ?? effectiveAnswer?.optionId ?? t("selected");
  const isCustomAnswer = Boolean(effectiveAnswer?.customAnswer);
  const customAnswerText = effectiveAnswer?.customAnswer;

  const hasDetails = Boolean(interaction.details?.length);
  const hasMultipleOptions = visibleOptions.length > 1;

  const directOption =
    confirmation && visibleOptions.length === 1 ? visibleOptions[0] : null;

  const handleSubmit = (event) => {
    if (event) event.preventDefault();
    if (isBusy || isResolved) return;

    if (directOption) {
      onAnswer?.({ optionId: directOption.id });
      return;
    }

    if (customSelected) {
      const trimmed = customAnswer.trim();
      if (!trimmed) return;
      onAnswer?.({ customAnswer: trimmed });
    } else if (selectedMode === "option" && optionId) {
      onAnswer?.({ optionId });
    }
  };

  const handleCancel = () => {
    if (isBusy || isResolved) return;
    onCancel?.();
  };

  const activateCustom = () => {
    if (customSelected) {
      focusAnswerInput(customTextareaRef.current);
      return;
    }
    focusCustomOnMount.current = true;
    setSelectedMode("custom");
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
                  {t("cancelledLabel")}
                </span>
              ) : isCustomAnswer ? (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[var(--color-text-muted)]">
                    {t("yourAnswer")}
                  </span>
                  <span className="font-medium text-[var(--color-text)] bg-[var(--color-surface-muted)] px-2 py-0.5 rounded border border-[var(--color-line)] break-words">
                    {customAnswerText}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[var(--color-text-muted)]">
                    {confirmation ? t("confirmed") : t("youSelected")}
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
                  <span>{t("hideQuestionDetails")}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>{t("showQuestionDetails")}</span>
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
                      {t("options")}
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
      directOption ||
      (customSelected
        ? customAnswer.trim()
        : selectedMode === "option" && optionId),
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-py-2 py-1 [scrollbar-width:thin]">
        <h3
          id={questionId}
          className="mb-2.5 text-sm font-semibold leading-snug wrap-anywhere text-[var(--color-text)]"
        >
          {interaction.question}
        </h3>

        {hasDetails && (
          <dl className="mb-3 space-y-1 rounded-lg bg-[var(--color-surface-muted)] p-3 text-xs">
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

        {directOption ? (
          directOption.description && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {directOption.description}
            </p>
          )
        ) : (
          <fieldset
            role="radiogroup"
            aria-labelledby={questionId}
            disabled={isBusy}
            className="min-w-0 divide-y divide-[var(--color-line)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]"
          >
            {visibleOptions.map((option) => (
              <AnswerOption
                key={option.id}
                name={questionId}
                value={option.id}
                label={option.label}
                description={option.description}
                checked={selectedMode === "option" && optionId === option.id}
                onChange={() => {
                  setOptionId(option.id);
                  setSelectedMode("option");
                }}
              />
            ))}
            {interaction.allowCustomAnswer && !confirmation && (
              <AnswerOption
                name={questionId}
                label={t("writeOwnAnswer")}
                checked={customSelected}
                onChange={() => setSelectedMode("custom")}
                onClick={(event) => {
                  // Native arrow navigation also dispatches a click, without a pointer.
                  if (event.detail > 0) activateCustom();
                }}
                onKeyDown={(event) => {
                  if (event.key !== " ") return;
                  event.preventDefault();
                  activateCustom();
                }}
              />
            )}
          </fieldset>
        )}

        {customSelected && (
          <div className="mt-2 space-y-1">
            <label
              htmlFor={customInputId}
              className="block text-xs text-[var(--color-text-muted)]"
            >
              {t("yourAnswerLabel")}
            </label>
            <textarea
              id={customInputId}
              ref={customTextareaRef}
              rows={2}
              className="ui-input ui-focus-ring block min-h-[68px]! w-full resize-none! rounded-lg px-3 py-2 text-base sm:text-sm"
              placeholder={t("tellTheAssistantWhatWorksForYou")}
              disabled={isBusy}
              value={customAnswer}
              maxLength={2000}
              onChange={(event) => setCustomAnswer(event.target.value)}
            />
          </div>
        )}
      </div>

      <div className="mt-1.5 flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t border-[var(--color-line)] pt-2">
        {onSwitchToMessage && (
          <button
            type="button"
            disabled={isBusy}
            onClick={onSwitchToMessage}
            className="ui-focus-ring mr-auto min-h-11 cursor-pointer rounded-md px-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:cursor-default disabled:opacity-60"
          >
            {t("changeRequest")}
          </button>
        )}
        {onCancel && (confirmation || !onSwitchToMessage) && (
          <button
            className="ui-btn-secondary ui-focus-ring min-h-11 rounded-lg px-3 text-xs font-medium disabled:opacity-50"
            type="button"
            disabled={isBusy}
            onClick={handleCancel}
          >
            {t("cancel")}
          </button>
        )}
        <button
          className="ui-btn-primary ui-focus-ring flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          aria-label={confirmation ? t("confirmLabel") : t("sendAnswer")}
          disabled={!canSubmit}
        >
          <Send className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="leading-snug wrap-anywhere">
            {sending
              ? t("sending")
              : (directOption?.label ??
                (confirmation ? t("confirmLabel") : t("sendAnswer")))}
          </span>
        </button>
      </div>
    </form>
  );
}
