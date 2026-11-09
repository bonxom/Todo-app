import { notificationRepository } from "../repositories/notificationRepository.js";
import { notificationTaskRepository } from "../repositories/notificationTaskRepository.js";
import type { NotificationType } from "../types/INotification.js";
export const classifyDeadline = (
  status: string,
  dueAt: Date | null,
  now: Date,
): NotificationType | null => {
  if (!["pending", "in-progress"].includes(status) || !dueAt) return null;
  const remaining = dueAt.getTime() - now.getTime();
  if (!Number.isFinite(remaining)) return null;
  return remaining <= 0
    ? "overdue"
    : remaining <= 36_000_000
      ? "due_soon"
      : null;
};
export async function generateNotifications(now = new Date()) {
  let afterId: string | undefined;
  let scanned = 0;
  let inserted = 0;
  for (;;) {
    const ids = await notificationTaskRepository.findCandidateIds(now, afterId);
    if (!ids.length) break;
    for (const id of ids) {
      scanned++;
      const task = await notificationTaskRepository.findCurrentCandidate(id);
      if (!task) continue;
      const type = classifyDeadline(task.status, task.dueAt, now);
      if (!type || !task.dueAt) continue;
      for (const recipientId of task.recipientIds) {
        if (
          await notificationRepository.insertOnce({
            recipientId,
            taskId: task.taskId,
            type,
            dueAt: task.dueAt,
            taskTitle: task.title,
          })
        )
          inserted++;
      }
    }
    afterId = ids.at(-1);
  }
  return { scanned, inserted };
}
