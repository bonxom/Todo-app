import { createMcpContext } from "../mcp/context.js";
import type { NextFunction, Request, Response } from "express";
import { conversationService } from "../services/conversationService.js";
import { chatStreamRepository } from "../repositories/chatStreamRepository.js";
import { chatRunService } from "../services/chatRunService.js";
import { chatEventStreamService } from "../services/chatEventStreamService.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";
import type { StartChatTurnBody } from "../validations/chatStreamValidation.js";

export const startChatTurn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const conversationId = String(req.params.conversationId);
    const body = req.validatedBody as StartChatTurnBody;

    const { snapshot } = await conversationService.startStreamTurn(
      {
        conversationId,
        requestId: body.requestId,
        userInput: body.userInput,
        mode: body.mode,
        intent: body.intent,
        selection: body.selection,
        attachmentIds: body.attachmentIds,
        timeZone: body.timeZone,
      },
      createMcpContext(req, ["tasks:write"]),
    );

    const isPending =
      snapshot.status === "processing" || snapshot.status === "stopping";
    const statusCode = isPending ? 202 : 200;

    res.status(statusCode).json({ data: snapshot });
  } catch (err) {
    next(err);
  }
};

export const getChatTurn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = String(req.user!._id);
    const conversationId = String(req.params.conversationId);
    const turnId = String(req.params.turnId);

    const snapshot = await chatStreamRepository.getSnapshot(
      userId,
      conversationId,
      turnId,
    );

    res.status(200).json({ data: snapshot });
  } catch (err) {
    next(err);
  }
};

export const cancelChatTurn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = String(req.user!._id);
    const conversationId = String(req.params.conversationId);
    const turnId = String(req.params.turnId);

    const snapshot = await chatRunService.cancel(
      userId,
      conversationId,
      turnId,
    );

    const statusCode = snapshot.status === "stopping" ? 202 : 200;
    res.status(statusCode).json({ data: snapshot });
  } catch (err) {
    next(err);
  }
};

export const streamChatEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = String(req.user!._id);
    const conversationId = String(req.params.conversationId);
    const turnId = String(req.params.turnId);

    const rawAfter = req.query.after;
    const lastEventIdHeader = req.header("last-event-id");

    let cursor = 0;
    if (rawAfter !== undefined) {
      if (
        typeof rawAfter !== "string" ||
        !/^\d+$/.test(rawAfter) ||
        !Number.isSafeInteger(Number(rawAfter))
      ) {
        throw new AppError(AI_ERROR.CHAT_CURSOR_INVALID);
      }
      cursor = Number(rawAfter);
    } else if (lastEventIdHeader !== undefined && lastEventIdHeader !== "") {
      if (
        !/^\d+$/.test(lastEventIdHeader) ||
        !Number.isSafeInteger(Number(lastEventIdHeader))
      ) {
        throw new AppError(AI_ERROR.CHAT_CURSOR_INVALID);
      }
      cursor = Number(lastEventIdHeader);
    }

    // Verify snapshot and cursor BEFORE sending headers
    const snapshot = await chatStreamRepository.getSnapshot(
      userId,
      conversationId,
      turnId,
    );

    if (
      cursor < 0 ||
      (snapshot.lastEventSeq !== undefined && cursor > snapshot.lastEventSeq)
    ) {
      throw new AppError(AI_ERROR.CHAT_CURSOR_INVALID);
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-store, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const abortController = new AbortController();
    req.on("close", () => {
      abortController.abort();
    });

    try {
      await chatEventStreamService.streamEvents({
        userId,
        conversationId,
        turnId,
        after: cursor,
        signal: abortController.signal,
        write: (frame) => res.write(frame),
        drain: () =>
          new Promise<void>((resolve) => {
            res.once("drain", resolve);
          }),
        getBufferedBytes: () => (res as any).writableLength ?? 0,
      });
    } catch (streamErr) {
      // Stream error after headers sent: do not write JSON error
      console.warn("SSE stream interrupted:", streamErr);
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  } catch (err) {
    next(err);
  }
};
