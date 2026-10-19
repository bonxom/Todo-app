import type { Request, Response } from "express";
import { createMcpContext } from "../mcp/context.js";
import { conversationService } from "../services/conversationService.js";
import { aiService } from "../services/aiService.js";

export const generateTasksWithRequirement = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body = req.validatedBody as Record<string, unknown>;
  const tasks = await aiService.generateTasks(
    body.userRequirement as string,
    req.user!._id,
  );
  res.status(201).json({
    success: true,
    message: "3 tasks generated successfully",
    data: tasks,
  });
};

export const responseToUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body = req.validatedBody as Record<string, unknown>;
  const content = await aiService.chatResponse(body.userInput as string);
  res.status(200).json({
    success: true,
    message: "Response generated successfully",
    data: content,
  });
};

export const chatWithMcp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const body = req.validatedBody as Record<string, unknown>;
  const result = await conversationService.send({
    userInput: body.userInput as string,
    conversationId: body.conversationId as string,
    requestId: body.requestId as string,
    mode: body.mode as "auto" | "ask",
  }, createMcpContext(req, ["tasks:write"]));
  res.status(200).json({ success: result.status !== "failed", message: "Chat response", ...result });
};

export const createConversation = async (req: Request, res: Response): Promise<void> => {
  const id = req.validatedBody!.conversationId as string;
  const conversation = await conversationService.create(String(req.user!._id), id);
  res.status(201).json({ conversationId: conversation._id });
};

export const getConversation = async (req: Request, res: Response): Promise<void> => {
  const conversation = await conversationService.get(String(req.user!._id),
    req.validatedParams?.conversationId, req.validatedQuery?.before as number | undefined);
  res.json({ data: conversation });
};

export const answerInteraction = async (req: Request, res: Response): Promise<void> => {
  const result = await conversationService.answer(
    req.validatedParams!.conversationId!, req.validatedParams!.interactionId!,
    req.validatedBody as { requestId: string; optionId?: string; customAnswer?: string },
    createMcpContext(req, ["tasks:write"]),
  );
  res.json({ success: result.status !== "failed", message: "Chat response", ...result });
};

export const cancelInteraction = async (req: Request, res: Response): Promise<void> => {
  const result = await conversationService.answer(
    req.validatedParams!.conversationId!, req.validatedParams!.interactionId!,
    req.validatedBody as { requestId: string }, createMcpContext(req, ["tasks:write"]), true,
  );
  res.json({ success: result.status !== "failed", message: "Chat response", ...result });
};
