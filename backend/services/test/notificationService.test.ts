import { expect, it, vi } from "vitest";
import { notificationRepository } from "../../repositories/notificationRepository.js";
import { notificationService } from "../notificationService.js";
it("does not expose existence of notifications outside the recipient", async () => {
  const mark = vi
    .spyOn(notificationRepository, "markRead")
    .mockResolvedValue(null);
  await expect(
    notificationService.markRead("alice", "foreign", new Date()),
  ).rejects.toMatchObject({ statusCode: 404 });
  mark.mockRestore();
});
