import { Check, Loader2 } from "lucide-react";
import {
  createBinderlessComponentImplementation,
  useSignalValue,
} from "@a2ui/react/v0_9";
import type { UiActionState } from "@/shared/types/A2UI/uiAction";
import { presentationComponents } from "./presentationComponents";
import { buttonPropertiesSchema } from "./interactiveSchema";

export const buttonComponent = createBinderlessComponentImplementation(
  {
    name: "Button",
    schema: buttonPropertiesSchema,
  },
  ({ context }) => {
    const props = buttonPropertiesSchema.parse(
      context.componentModel.properties,
    );
    const model = context.dataContext.dataModel;
    const signal = model.getSignal<UiActionState>(props.actionState.path);
    const state = useSignalValue(signal) ?? {
      status: "loading" as const,
      disabled: true,
    };

    const isDisabled = state.disabled || state.status !== "ready";
    const isPending = state.status === "pending";
    const isSucceeded = state.status === "succeeded";

    return (
      <div className="a2ui-button-group flex flex-col items-start gap-1">
        <button
          type="button"
          disabled={isDisabled}
          aria-busy={isPending}
          onClick={() => {
            if (isDisabled) return;
            const resolved = context.dataContext.resolveAction(props.action, {
              userActivation: true,
            });
            void context.dispatchAction(resolved as Record<string, unknown>);
          }}
          className={`a2ui-button inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-[filter,transform,opacity,background-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))] ${
            isSucceeded
              ? "border-[color-mix(in_srgb,var(--color-success,#2f7d5a)_45%,transparent)] bg-[var(--color-success-soft,#eaf5ef)] text-[var(--color-success,#2f7d5a)]"
              : "border-[color-mix(in_srgb,var(--v2-glass-border,rgb(255_255_255_/_50%))_45%,transparent)] bg-[linear-gradient(155deg,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_86%,#ffffff),var(--v2-accent,var(--color-accent,#456b8c))_58%,color-mix(in_srgb,var(--v2-accent,var(--color-accent,#456b8c))_88%,#000000))] !text-[var(--v2-accent-ink,var(--color-primary-text,#ffffff))] shadow-[inset_0_1px_0_rgb(255_255_255_/_46%),0_6px_16px_-8px_var(--v2-accent,var(--color-accent,#456b8c))]"
          } ${
            isDisabled
              ? "cursor-not-allowed opacity-55"
              : "cursor-pointer hover:brightness-[1.06] active:translate-y-[1px]"
          }`}
        >
          {isPending && (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          )}
          {isSucceeded && <Check size={15} aria-hidden="true" />}
          <span>{props.label}</span>
        </button>
        {state.reason && state.status === "unavailable" && (
          <p className="m-0 text-xs text-[var(--color-text-muted,#57606a)]">
            {state.reason}
          </p>
        )}
      </div>
    );
  },
);

export const interactiveComponents = [
  ...presentationComponents,
  buttonComponent,
];
