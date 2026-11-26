import {
  isUiCompositionEnabled,
  isUiInteractiveEnabled,
} from "../../config/A2UI/composition.js";
import { AppError } from "../../error/AppError.js";
import { UI_ACTION_ERROR } from "../../error/definitions/A2UI/uiActionErrors.js";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import { conversationRepository } from "../../repositories/conversationRepository.js";
import { taskCommandRepository } from "../../repositories/taskCommandRepository.js";
import {
  UI_INTERACTIVE_CATALOG_ID,
  type UiActionBinding,
  type UiActionInput,
  type UiActionLocation,
  type UiActionName,
  type UiActionOutcome,
  type UiActionResult,
} from "../../types/A2UI/IUiAction.js";
import type { TaskCommandOutput } from "../../types/ITaskCommand.js";
import type { IUserDocument } from "../../types/IUser.js";
import { storedInteractiveSurfaceSchema } from "../../validations/A2UI/interactiveUiValidation.js";
import { taskDtoSchema } from "../../validations/taskDtoValidation.js";
import { TaskCommandError, taskCommandService } from "../taskCommandService.js";

type ActionHandler = (
  binding: UiActionBinding,
  location: UiActionLocation,
  input: UiActionInput,
  user: IUserDocument,
) => Promise<TaskCommandOutput>;

const ACTION_HANDLERS: Record<UiActionName, ActionHandler> = {
  "task.complete": (binding, location, input, user) =>
    taskCommandService.update(
      {
        taskId: binding.taskId,
        changes: { status: "completed" },
        idempotencyKey: `ui_${input.requestId}`,
      },
      {
        user,
        requestId: input.requestId,
        origin: {
          channel: "a2ui",
          conversationId: location.conversationId,
          turnId: location.turnId,
          surfaceId: location.surfaceId,
          actionId: binding.id,
        },
      },
    ),
};

const isTransactionUnavailable = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes(
    "Transaction numbers are only allowed on a replica set",
  ) ||
    error.message.includes("transactions are not supported"));

export const uiActionService = {
  async execute(
    location: UiActionLocation,
    input: UiActionInput,
    user: IUserDocument,
  ): Promise<UiActionResult> {
    if (user.role !== "USER") {
      throw new AppError(UI_ACTION_ERROR.USER_ACCOUNT_ONLY);
    }

    if (!isUiCompositionEnabled() || !isUiInteractiveEnabled()) {
      throw new AppError(UI_ACTION_ERROR.DISABLED);
    }

    const userId = String(user._id);
    const [conversation, turn] = await Promise.all([
      conversationRepository.get(userId, location.conversationId),
      chatTurnRepository.active(
        userId,
        location.conversationId,
        location.turnId,
      ),
    ]);

    if (!conversation || !turn) {
      throw new AppError(UI_ACTION_ERROR.NOT_FOUND);
    }

    if (turn.status !== "completed") {
      throw new AppError(UI_ACTION_ERROR.TURN_NOT_COMPLETED);
    }

    if (
      !turn.uiSurface ||
      turn.uiSurface.catalogId !== UI_INTERACTIVE_CATALOG_ID ||
      turn.uiSurface.surfaceId !== location.surfaceId
    ) {
      throw new AppError(UI_ACTION_ERROR.NOT_FOUND);
    }

    const parsedSurface = storedInteractiveSurfaceSchema.safeParse(
      turn.uiSurface,
    );
    if (!parsedSurface.success) {
      throw new AppError(UI_ACTION_ERROR.NOT_FOUND);
    }

    const binding = parsedSurface.data.actionBindings.find(
      (item) => item.id === input.actionId,
    );
    if (!binding) {
      throw new AppError(UI_ACTION_ERROR.NOT_FOUND);
    }

    const handler = Object.prototype.hasOwnProperty.call(
      ACTION_HANDLERS,
      binding.name,
    )
      ? ACTION_HANDLERS[binding.name]
      : undefined;
    if (!handler) {
      throw new AppError(UI_ACTION_ERROR.UNSUPPORTED_ACTION);
    }

    try {
      const output = await handler(binding, location, input, user);
      return {
        requestId: input.requestId,
        actionId: binding.id,
        outcome: "succeeded",
        task: output.task,
      };
    } catch (error) {
      if (error instanceof TaskCommandError) {
        if (error.code === "IDEMPOTENCY_CONFLICT") {
          throw new AppError(UI_ACTION_ERROR.REQUEST_CONFLICT, {
            cause: error,
          });
        }
        if (error.code === "FORBIDDEN") {
          throw new AppError(UI_ACTION_ERROR.USER_ACCOUNT_ONLY, {
            cause: error,
          });
        }
      }
      if (isTransactionUnavailable(error)) {
        throw new AppError(UI_ACTION_ERROR.TRANSACTION_UNAVAILABLE, {
          cause: error,
        });
      }
      throw error;
    }
  },

  async recentOutcomes(
    userId: string,
    conversationId: string,
  ): Promise<UiActionOutcome[]> {
    const receipts = await taskCommandRepository.findRecentByUiOrigin(
      userId,
      conversationId,
      3,
    );

    const outcomes: UiActionOutcome[] = [];
    for (const receipt of receipts) {
      if (
        receipt.origin?.channel !== "a2ui" ||
        receipt.origin.conversationId !== conversationId
      ) {
        continue;
      }
      const parsedTask = taskDtoSchema.safeParse(receipt.output?.task);
      if (!parsedTask.success) continue;

      const committedAt =
        receipt.createdAt instanceof Date
          ? receipt.createdAt.toISOString()
          : new Date(receipt.createdAt).toISOString();

      outcomes.push({
        requestId: receipt.requestId,
        actionId: receipt.origin.actionId,
        outcome: "succeeded",
        task: parsedTask.data,
        turnId: receipt.origin.turnId,
        surfaceId: receipt.origin.surfaceId,
        committedAt,
      });
    }
    return outcomes;
  },
};
