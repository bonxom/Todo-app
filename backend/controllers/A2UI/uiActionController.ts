import type { Request, Response } from "express";
import { uiActionService } from "../../services/A2UI/uiActionService.js";
import type {
  UiActionBody,
  UiActionParams,
} from "../../validations/A2UI/uiActionValidation.js";

export const handleUiAction = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { conversationId, turnId, surfaceId } =
    req.validatedParams as UiActionParams;
  const body = req.validatedBody as UiActionBody;

  const result = await uiActionService.execute(
    { conversationId, turnId, surfaceId },
    body,
    req.user!,
  );

  res.status(200).json(result);
};
