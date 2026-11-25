import type { Request, Response } from "express";
import { notificationService as service } from "../services/notificationService.js";
import type { NotificationListParams } from "../types/INotification.js";
import type {
  PushPreferences,
  PushSubscriptionKeys,
} from "../types/IPushSubscription.js";
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

export async function deleteAll(req: Request, res: Response) {
  res.json(
    await service.deleteAll(
      String(req.user!._id),
      res.locals.notificationReadCutoff,
    ),
  );
}

export async function getPushConfig(_req: Request, res: Response) {
  res.json(service.getPushConfig());
}

export async function getCurrentPushSubscription(req: Request, res: Response) {
  const { endpoint } = req.validatedQuery as { endpoint: string };
  res.json(
    await service.getCurrentPushSubscription(String(req.user!._id), endpoint),
  );
}

export async function upsertPushSubscription(req: Request, res: Response) {
  const body = req.validatedBody as {
    endpoint: string;
    keys: PushSubscriptionKeys;
    prefs?: Partial<PushPreferences>;
    userAgent?: string;
  };
  res.json(
    await service.upsertPushSubscription({
      userId: String(req.user!._id),
      endpoint: body.endpoint,
      keys: body.keys,
      prefs: body.prefs,
      userAgent: body.userAgent,
    }),
  );
}

export async function updatePushPreferences(req: Request, res: Response) {
  const body = req.validatedBody as {
    endpoint: string;
    prefs: Partial<PushPreferences>;
  };
  res.json(
    await service.updatePushPreferences(
      String(req.user!._id),
      body.endpoint,
      body.prefs,
    ),
  );
}

export async function deletePushSubscription(req: Request, res: Response) {
  const { endpoint } = req.validatedBody as { endpoint: string };
  res.json(
    await service.deletePushSubscription(String(req.user!._id), endpoint),
  );
}
