import { useState } from "react";

export default function InteractionCard({ interaction, onAnswer, onCancel, disabled = false }) {
  const [optionId, setOptionId] = useState(interaction.answer?.optionId ?? "");
  const [customAnswer, setCustomAnswer] = useState(interaction.answer?.customAnswer ?? "");
  const resolved = interaction.status !== "pending";
  const confirmation = interaction.kind === "confirmation";
  return (
    <form className="space-y-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-sm"
      onSubmit={(event) => { event.preventDefault(); if (!disabled && !resolved) onAnswer(customAnswer.trim() ? { customAnswer: customAnswer.trim() } : { optionId }); }}>
      <fieldset disabled={disabled || resolved} className="space-y-3">
        <legend className="font-semibold">{interaction.question}</legend>
        {interaction.details?.length > 0 && <dl className="space-y-2 break-words">{interaction.details.map((detail, index) => (
          <div key={index}><dt className="font-medium">{detail.label}</dt><dd className="whitespace-pre-wrap">{detail.value}</dd></div>
        ))}</dl>}
        {interaction.options.filter((option) => !(confirmation && option.id === "cancel")).map((option) => (
          <label key={option.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--color-line)] p-2">
            <input type="radio" name={`interaction-${interaction.id}`} value={option.id} checked={optionId === option.id && !customAnswer}
              onChange={() => { setOptionId(option.id); setCustomAnswer(""); }} />
            <span>{option.label}{option.description && <span className="block text-xs text-[var(--color-text-muted)]">{option.description}</span>}</span>
          </label>
        ))}
        {interaction.allowCustomAnswer && !confirmation && <label className="block">Other answer
          <textarea className="ui-input mt-1 w-full" value={customAnswer} maxLength={2000}
            onChange={(event) => { setCustomAnswer(event.target.value); setOptionId(""); }} />
        </label>}
        {!resolved && <div className="flex gap-2">
          <button className="ui-btn-primary ui-focus-ring px-3 py-2" type="submit" disabled={!optionId && !customAnswer.trim()}>{confirmation ? "Confirm" : "Send answer"}</button>
          <button className="ui-btn-secondary ui-focus-ring px-3 py-2" type="button" onClick={onCancel}>Cancel</button>
        </div>}
      </fieldset>
      {resolved && <p role="status">{interaction.status === "cancelled" ? "Cancelled" : `Answered: ${interaction.answer?.customAnswer ?? interaction.options.find((option) => option.id === interaction.answer?.optionId)?.label ?? "Saved"}`}</p>}
    </form>
  );
}
