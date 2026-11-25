import { notificationRepository as repo } from "../repositories/notificationRepository.js";
import { pushSubscriptionRepository as pushRepo } from "../repositories/pushSubscriptionRepository.js";
import { getPublicPushConfig } from "../config/webPush.js";
import { AppError } from "../error/AppError.js";
import { NOTIFICATION_ERROR } from "../error/definitions/notificationErrors.js";
import type {
  PushPreferences,
  PushSubscriptionStatus,
  PushSubscriptionUpsertInput,
} from "../types/IPushSubscription.js";

export const notificationService = {
  async deleteAll(userId: string, cutoff: Date) {
    return { deletedCount: await repo.deleteAll(userId, cutoff) };
  },
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
  getPushConfig() {
    return getPublicPushConfig();
  },
  async getCurrentPushSubscription(
    userId: string,
    endpoint: string,
  ): Promise<PushSubscriptionStatus> {
    const found = await pushRepo.findByUserAndEndpoint(userId, endpoint);
    if (!found) {
      return { subscribed: false, prefs: null };
    }
    return { subscribed: true, prefs: found.prefs };
  },
  async upsertPushSubscription(input: PushSubscriptionUpsertInput) {
    if (!getPublicPushConfig().supported) {
      throw new AppError(NOTIFICATION_ERROR.PUSH_NOT_CONFIGURED);
    }
    return pushRepo.upsert(input);
  },
  async updatePushPreferences(
    userId: string,
    endpoint: string,
    prefs: Partial<PushPreferences>,
  ) {
    const updated = await pushRepo.updatePrefs(userId, endpoint, prefs);
    if (!updated) {
      throw new AppError(NOTIFICATION_ERROR.PUSH_SUBSCRIPTION_NOT_FOUND);
    }
    return updated;
  },
  async deletePushSubscription(userId: string, endpoint: string) {
    const removed = await pushRepo.deleteByUserAndEndpoint(userId, endpoint);
    return { removed };
  },
};
