import { notificationRepository as repo } from "../repositories/notificationRepository.js";
import { AppError } from "../error/AppError.js";
import { NOTIFICATION_ERROR } from "../error/definitions/notificationErrors.js";
export const notificationService = {
  list: repo.list,
  unreadCount: repo.unreadCount,
  async markRead(userId: string, id: string, now: Date) {
    const item = await repo.markRead(userId, id, now);
    if (!item) throw new AppError(NOTIFICATION_ERROR.NOT_FOUND);
    return item;
  },
  async markAllRead(userId: string, cutoff: Date) {
    return { modifiedCount: await repo.markAllRead(userId, cutoff) };
  },
};
