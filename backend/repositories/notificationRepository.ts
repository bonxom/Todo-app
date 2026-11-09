import Notification from "../models/Notification.js";
import type { NotificationInsert } from "../types/INotification.js";
export const notificationRepository = {
  async list(
    recipientId: string,
    params: import("../types/INotification.js").NotificationListParams,
  ) {
    const filter = {
      recipientId,
      ...(params.filter === "unread" ? { readAt: null } : {}),
    };
    const [data, totalCount] = await Promise.all([
      Notification.find(filter)
        .select("-recipientId -updatedAt -__v")
        .sort({ createdAt: -1, _id: -1 })
        .skip((params.pageNo - 1) * params.pageSize)
        .limit(params.pageSize)
        .lean(),
      Notification.countDocuments(filter),
    ]);
    return {
      data,
      pageInfo: {
        pageNo: params.pageNo,
        pageSize: params.pageSize,
        totalCount,
        totalPage: Math.ceil(totalCount / params.pageSize),
      },
    };
  },
  async unreadCount(recipientId: string) {
    return Notification.countDocuments({ recipientId, readAt: null });
  },
  async markRead(recipientId: string, id: string, now: Date) {
    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipientId, readAt: null },
      { $set: { readAt: now } },
      { new: true },
    )
      .select("-recipientId -updatedAt -__v")
      .lean();
    return (
      updated ??
      Notification.findOne({ _id: id, recipientId })
        .select("-recipientId -updatedAt -__v")
        .lean()
    );
  },
  async markAllRead(recipientId: string, cutoff: Date) {
    const result = await Notification.updateMany(
      { recipientId, readAt: null, createdAt: { $lte: cutoff } },
      { $set: { readAt: cutoff } },
    );
    return result.modifiedCount;
  },
  async initIndexes() {
    await Notification.createIndexes();
  },
  async insertOnce(input: NotificationInsert): Promise<boolean> {
    const { recipientId, taskId, type, dueAt } = input;
    const now = new Date();
    try {
      const result = await Notification.updateOne(
        { recipientId, taskId, type, dueAt },
        {
          $setOnInsert: {
            ...input,
            readAt: null,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true, timestamps: false },
      );
      return result.upsertedCount === 1;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000 &&
        "keyPattern" in error &&
        JSON.stringify(error.keyPattern) ===
          JSON.stringify({ recipientId: 1, taskId: 1, type: 1, dueAt: 1 })
      )
        return false;
      throw error;
    }
  },
};
