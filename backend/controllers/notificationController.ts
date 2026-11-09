import type { Request, Response } from "express";
import { notificationService as service } from "../services/notificationService.js";
import type { NotificationListParams } from "../types/INotification.js";
export async function listNotifications(req: Request, res: Response) {
  res.json(
    await service.list(
      String(req.user!._id),
      req.validatedQuery as unknown as NotificationListParams,
    ),
  );
}
export async function unreadCount(req: Request, res: Response) {
  res.json({ count: await service.unreadCount(String(req.user!._id)) });
}
export async function markRead(req: Request, res: Response) {
  res.json(
    await service.markRead(
      String(req.user!._id),
      req.validatedParams!.id,
      new Date(),
    ),
  );
}
export async function markAllRead(req: Request, res: Response) {
  res.json(
    await service.markAllRead(
      String(req.user!._id),
      res.locals.notificationReadCutoff,
    ),
  );
}
