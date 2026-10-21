import type { AgentInteraction, AgentMode } from "../types/IAgent.js";
import type { InteractionSelection } from "../types/IChatTurn.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

// Invoked inside the claim transaction. A selection consumes a menu once;
// ordinary text supersedes it and grants no write approval.
export function prepareInteractionSelection(
  pending: AgentInteraction | undefined,
  selection: InteractionSelection | undefined,
  requestId: string,
  mode: AgentMode,
): AgentInteraction | undefined {
  if (!pending) {
    if (selection) throw new AppError(AI_ERROR.INTERACTION_CONFLICT);
    return undefined;
  }
  if (
    selection &&
    (selection.interactionId !== pending.id || pending.status !== "pending")
  ) {
    throw new AppError(AI_ERROR.INTERACTION_CONFLICT);
  }
  if (selection && mode !== "ask") throw new AppError(AI_ERROR.ANSWER_INVALID);
  if (
    selection &&
    !selection.cancel &&
    (Boolean(selection.optionId) === Boolean(selection.customAnswer) ||
      (selection.optionId &&
        !pending.options.some((o) => o.id === selection.optionId)) ||
      (selection.customAnswer &&
        (!pending.allowCustomAnswer || pending.kind !== "clarification")))
  )
    throw new AppError(AI_ERROR.ANSWER_INVALID);
  const cancelled =
    !selection ||
    selection.cancel ||
    (pending.kind === "confirmation" && selection.optionId === "cancel");
  return {
    ...pending,
    status: cancelled ? "cancelled" : "answered",
    answerRequestId: requestId,
    answerAction: cancelled ? "cancel" : "answer",
    answer: cancelled
      ? { optionId: "cancel" }
      : {
          ...(selection?.optionId ? { optionId: selection.optionId } : {}),
          ...(selection?.customAnswer
            ? { customAnswer: selection.customAnswer }
            : {}),
        },
  };
}
