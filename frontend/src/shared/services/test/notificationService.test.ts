import { afterEach, expect, it, vi } from "vitest";
import http from "../httpClient";
import { notificationService as service } from "../notificationService";
afterEach(() => vi.restoreAllMocks());
it("uses shared HTTP client and forwards pagination and cancellation", async () => {
  const data = {
    data: [],
    pageInfo: { pageNo: 2, pageSize: 20, totalCount: 0, totalPage: 0 },
  };
  const get = vi.spyOn(http, "get").mockResolvedValue({ data });
  const signal = new AbortController().signal;
  const params = { pageNo: 2, pageSize: 20, filter: "unread" as const };
  expect(await service.list(params, { signal })).toEqual(data);
  expect(get).toHaveBeenCalledWith("/api/notifications", { params, signal });
});
it("normalizes count and mutations without swallowing errors", async () => {
  vi.spyOn(http, "get").mockResolvedValue({ data: { count: 4 } });
  expect(await service.unreadCount()).toEqual({ count: 4 });
  const patch = vi
    .spyOn(http, "patch")
    .mockResolvedValue({ data: { modifiedCount: 2 } });
  expect(await service.markAllRead()).toEqual({ modifiedCount: 2 });
  expect(patch).toHaveBeenCalledWith("/api/notifications/read-all");
  await service.markRead("abc");
  expect(patch).toHaveBeenCalledWith("/api/notifications/abc/read");
  patch.mockRejectedValueOnce(new Error("offline"));
  await expect(service.markRead("abc")).rejects.toThrow("offline");
});
