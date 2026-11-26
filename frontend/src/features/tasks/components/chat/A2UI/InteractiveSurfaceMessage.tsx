import { useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { AgentSessionContext } from "@/features/agent/agentSessionContext";
import { A2uiHost } from "@/shared/A2UI/A2uiHost";
import { interactiveRegistry } from "@/shared/A2UI/interactiveCatalog";
import type {
  UiActionBinding,
  UiActionLocation,
  UiActionOutcome,
} from "@/shared/types/A2UI/uiAction";
import type { UiSurfaceEnvelope } from "@/shared/types/A2UI/uiSurface";
import { useUiAction } from "../../../hooks/A2UI/useUiAction";
import MarkdownText from "../MarkdownText";

export interface InteractiveSurfaceMessageProps {
  surface: UiSurfaceEnvelope;
  location: UiActionLocation;
  bindings: UiActionBinding[];
  outcomes?: UiActionOutcome[];
  disabled?: boolean;
}

export function InteractiveSurfaceMessage({
  surface,
  location,
  bindings,
  outcomes,
  disabled,
}: InteractiveSurfaceMessageProps) {
  const { t } = useTranslation("agent");
  const session = useContext(AgentSessionContext);

  const { states, statusMessage, errorMessage, dispatch, retry } = useUiAction({
    location,
    bindings,
    outcomes,
    disabled,
    onCommitted: () => {
      if (session?.chat.conversationId === location.conversationId) {
        void session.chat.reload?.();
      }
    },
  });

  const dataPatches = useMemo(() => {
    const patches: Record<string, unknown> = {};
    for (const binding of bindings.slice(0, 10)) {
      if (states[binding.id]) {
        patches[`/actionState/${binding.key}`] = states[binding.id];
      }
    }
    return patches;
  }, [bindings, states]);

  if (!bindings.length || !location.conversationId || !location.turnId) {
    return <MarkdownText text={surface.text} />;
  }

  const uncertainBindings = bindings
    .slice(0, 10)
    .filter((b) => states[b.id]?.status === "uncertain");

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <A2uiHost
        payload={surface.a2ui}
        registry={interactiveRegistry}
        dataPatches={dataPatches}
        fallback={<MarkdownText text={surface.text} />}
        onAction={async (action) => {
          if (action.name !== "dispatch") {
            throw new Error("Unsupported interactive action");
          }
          const actionId =
            action.context && typeof action.context.actionId === "string"
              ? action.context.actionId
              : undefined;
          if (!actionId) {
            throw new Error("Missing actionId in dispatch context");
          }
          await dispatch(actionId);
        }}
      />

      <div
        role="status"
        aria-live="polite"
        className={
          statusMessage
            ? "flex items-center gap-1.5 text-xs font-medium text-[var(--color-success,#2f7d5a)]"
            : "sr-only"
        }
      >
        {statusMessage && (
          <>
            <CheckCircle2 size={14} className="shrink-0" aria-hidden="true" />
            <span>{statusMessage}</span>
          </>
        )}
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="m-0 flex items-start gap-1.5 rounded-[10px] bg-[var(--color-danger-soft,#f9ecea)] px-2.5 py-2 text-[0.77rem] font-medium text-[var(--color-danger,#b25547)]"
        >
          <AlertCircle
            size={14}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span>{errorMessage}</span>
        </p>
      )}

      {uncertainBindings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {uncertainBindings.map((binding) => (
            <button
              key={binding.id}
              type="button"
              onClick={() => void retry(binding.id)}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--v2-glass-border,rgb(255_255_255_/_50%))_45%,transparent)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_86%,#ffffff),var(--v2-accent,var(--color-accent,#456b8c))_58%,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_88%,#000000))] px-4 py-2 text-xs font-semibold !text-[var(--v2-accent-ink,var(--color-primary-text,#ffffff))] shadow-[inset_0_1px_0_rgb(255_255_255_/_46%),0_6px_16px_-8px_var(--v2-accent,var(--color-accent,#456b8c))] transition-[filter,transform,opacity] duration-150 hover:brightness-[1.06] active:translate-y-[1px]"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>{t("uiActionRetry")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
