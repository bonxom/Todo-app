# In-app Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuông và lịch sử thông báo deadline, nhắc trước 10 giờ và khi quá hạn, mỗi loại một lần cho mỗi deadline.

**Architecture:** MongoDB lưu lịch sử và khóa chống trùng. Worker độc lập tạo thông báo; Express chỉ đọc/đánh dấu đã đọc. React Query dùng API có xác thực và polling khi tab hiển thị.

**Tech Stack:** Node 22, TypeScript NodeNext, Express, Mongoose, Zod, React, TanStack Query, i18next, Vitest, Testing Library, Playwright; pnpm@11.21.0.

**Spec:** [2026-11-09-notifications.md](../specs/2026-11-09-notifications.md)

## Global Constraints

- `due_soon`: `dueDate - 10 giờ <= now < dueDate`.
- `overdue`: `now >= dueDate`.
- Mỗi khóa `(recipientId, taskId, type, dueAt)` chỉ có một bản ghi.
- Không thêm Redis hay message broker.
- Không đổi cách chuẩn hóa ngày của task trong tính năng này.
- API đọc không tự tạo thông báo.
- Chỉ format các file liên quan, không sửa secret hay thay đổi người dùng.
- Không bao gồm email, Web Push, thông báo hệ điều hành, realtime qua socket, nhắc lại sau, cấu hình thời gian nhắc, tổng hợp hằng ngày hoặc thông báo AI.
- Thực hiện Test → Code → Test → Lint → Format check → Build/type-check; ghi lại test đỏ đúng hành vi, không tính lỗi import/setup là bằng chứng TDD.

## Contract chung

DTO dùng `_id` như các entity hiện tại; ngày serialize ISO. List trả `ResponsePage<NotificationDto>` (`{ data, pageInfo }`), count trả `{ count }`, read trả DTO, read-all trả `{ modifiedCount }`, không thêm lớp envelope khác.

```ts
type NotificationType = "due_soon" | "overdue";
type NotificationFilter = "all" | "unread";
interface NotificationDto {
  _id: string;
  taskId: string;
  type: NotificationType;
  taskTitle: string;
  dueAt: string;
  readAt: string | null;
  createdAt: string;
}
interface NotificationListParams {
  pageNo: number;
  pageSize: number;
  filter: NotificationFilter;
}
```

Backend đặt domain types trong `backend/types/INotification.ts`; frontend đặt DTO trong `frontend/src/shared/types/notification.ts`. Không gửi recipientId cho client. Dùng thời điểm bắt đầu request làm cutoff read-all; lưu trên request-local `res.locals.notificationReadCutoff` trước middleware async.

## Task 1: Sinh thông báo đúng deadline và lưu chống trùng

**Files:**

- Create: `backend/types/INotification.ts`, `backend/models/Notification.ts`.
- Create: `backend/repositories/notificationRepository.ts`, `backend/repositories/notificationTaskRepository.ts`.
- Create: `backend/services/notificationGenerationService.ts`.
- Test: `backend/services/test/notificationGenerationService.test.ts`, `backend/repositories/test/notificationRepository.integration.test.ts`.

**Interfaces:** `classifyDeadline(status: string, dueAt: Date | null, now: Date): NotificationType | null`; `generateNotifications(now?: Date): Promise<{ scanned: number; inserted: number }>`; repository `insertOnce(input: NotificationInsert): Promise<boolean>`, `initIndexes(): Promise<void>`. `NotificationInsert` gồm recipientId/taskId (ObjectId), type, dueAt (Date), taskTitle. Task repository `findCandidateIds(now: Date, afterId?: string): Promise<string[]>` và `findCurrentCandidate(id: string): Promise<{ taskId: ObjectId; status: string; dueAt: Date | null; title: string; recipientIds: ObjectId[] } | null>`.

- [ ] Tạo test boundary trước, dùng stub trả null để xác nhận lỗi assertion, không lỗi import:

```ts
const due = new Date("2026-11-09T20:00:00Z");
it.each([
  ["2026-11-09T09:59:59.999Z", null],
  ["2026-11-09T10:00:00Z", "due_soon"],
  ["2026-11-09T19:59:59.999Z", "due_soon"],
  ["2026-11-09T20:00:00Z", "overdue"],
])("classifies %s", (time, expected) => {
  expect(classifyDeadline("pending", due, new Date(time))).toBe(expected);
});
```

- [ ] Chạy `pnpm test -- services/test/notificationGenerationService.test.ts` từ backend, ghi nhận các ca cần thông báo đang đỏ.
- [ ] Cài classifier và model với nullable readAt, timestamps; index unique đầy đủ 4 trường và hai index lịch sử theo spec. Tạo index trước khi worker bắt đầu, không dùng TTL.

```ts
if (!["pending", "in-progress"].includes(status) || !dueAt) return null;
const remaining = dueAt.getTime() - now.getTime();
if (!Number.isFinite(remaining)) return null;
return remaining <= 0 ? "overdue" : remaining <= 36_000_000 ? "due_soon" : null;
```

- [ ] Test generation bằng mock repository: một task có cùng chủ category/project chỉ insert một lần; hai chủ khác nhau tạo hai mục; không chủ bỏ qua; admin không được thêm vào tập người nhận. Kiểm tra lại bản task mới nhất trước insert để xử lý task bị hoàn thành/xóa/đổi deadline giữa scan và đọc.
- [ ] Cài scan theo `_id > afterId`, sort `_id: 1`, limit 200, trạng thái đang hoạt động và dueDate không null, `<= now + 10 giờ`. Populate/query chủ category và project trong repository; loại trùng ObjectId. Không dùng skip pagination cho scan. Không sửa taskService hoặc stats.
- [ ] Viết test MongoDB thật, theo guard loopback và database riêng của `taskProposalRepository.integration.test.ts`. Dùng `ORBIT_MCP_TEST_MONGO_URI`, database tên `orbit_notifications_test_<pid>_<timestamp>`; chỉ drop database tự tạo. Test 20 insert đồng thời và chạy lại:

```ts
await repository.initIndexes();
await Promise.all(
  Array.from({ length: 20 }, () => repository.insertOnce(input)),
);
expect(await Notification.countDocuments({ taskId: input.taskId })).toBe(1);
await repository.insertOnce({ ...input, type: "overdue" });
expect(await Notification.countDocuments({ taskId: input.taskId })).toBe(2);
```

- [ ] Cài `updateOne(key, { $setOnInsert: input }, { upsert: true })`; tránh cập nhật timestamps của bản ghi đã có bằng cấu hình timestamps phù hợp. Chỉ nuốt lỗi 11000 đúng index chống trùng, lỗi khác throw. Test readAt/createdAt không đổi khi quét lại.
- [ ] Bổ sung test task mới dưới 10 giờ, quá hạn chỉ một loại, restart, deadline mới/cũ, reopen, không deadline, completed/given-up, equal-instant offsets và date-only theo normalizeTaskDateInput. Chạy lại cả hai file test; integration thiếu MongoDB phải được báo skipped, không coi là đạt.
- [ ] Review diff và commit riêng phần generation cùng tests.

## Task 2: API đọc và đánh dấu theo đúng user

**Files:**

- Modify: `backend/repositories/notificationRepository.ts`, `backend/app.ts`.
- Create: `backend/services/notificationService.ts`, `backend/controllers/notificationController.ts`, `backend/routes/notificationRoute.ts`, `backend/validations/notificationValidation.ts`, `backend/error/definitions/notificationErrors.ts`.
- Test: `backend/test/notifications.test.ts`, `backend/services/test/notificationService.test.ts`; extend repository integration test.

**Interfaces:** service `list(userId: string, params: NotificationListParams)`, `unreadCount(userId: string)`, `markRead(userId: string, id: string, now: Date)`, `markAllRead(userId: string, cutoff: Date)`; output theo contract chung. Repository triển khai các thao tác tương ứng, luôn nhận recipientId.

- [ ] Test Supertest trên router + middleware lỗi hiện có, inject auth user như test app hiện tại. Trước khi cài logic, handlers trả 501 để test đỏ tại status/body:

```ts
expect((await request(app).get("/api/notifications?pageSize=101")).status).toBe(
  400,
);
expect((await request(app).patch("/api/notifications/bad/read")).status).toBe(
  400,
);
```

- [ ] Chạy `pnpm test -- test/notifications.test.ts services/test/notificationService.test.ts`; xác nhận fail đúng contract.
- [ ] Cài Zod query positive integer, pageNo mặc định 1, pageSize mặc định 20 tối đa 100, filter enum all/unread; validate params ObjectId. Reject body recipientId và body không rỗng ở PATCH. Dùng req.validatedQuery/validatedParams theo middleware hiện tại.
- [ ] Mount route `/api/notifications` sau ensureAppReady; protect mọi endpoint. Read-all trước `/:id/read`. Controller chỉ mapping HTTP, dùng AppError theo `backend/error/AppError.ts` hiện tại, không dùng đường dẫn lỗi cũ trong hướng dẫn dự án.
- [ ] Cài list/count bằng filter recipientId; sort `{ createdAt: -1, _id: -1 }`. MarkRead update chỉ `{ _id, recipientId, readAt: null }`, nếu không update thì đọc lại chính user để phân biệt đã đọc với 404. Mark-all dùng:

```ts
await Notification.updateMany(
  { recipientId, readAt: null, createdAt: { $lte: cutoff } },
  { $set: { readAt: cutoff } },
);
```

- [ ] Test user A không list/count/read/read-all dữ liệu B, kể cả role ADMIN; guest 401; invalid query 400; thiếu/khác chủ 404; idempotent read giữ timestamp đầu; read-all không đọc mục tạo sau cutoff. Test phân trang và lọc unread trên database thật.
- [ ] Chạy lại test task này và Task 1, review và commit API.

## Task 3: Worker chạy độc lập và hướng dẫn vận hành

**Files:**

- Create: `backend/scripts/generate-notifications.ts`, `backend/workers/notificationWorker.ts`, `backend/workers/notificationWorkerLoop.ts`, `backend/workers/test/notificationWorkerLoop.test.ts`, `docs/deployment/notifications.md`.
- Modify: `backend/package.json`, `docker-compose.yml`.

**Interfaces:** loop `runNotificationLoop(run: () => Promise<unknown>, signal: AbortSignal, intervalMs = 60_000): Promise<void>`; CLI one-shot gọi generateNotifications và exit khác 0 nếu lỗi. Worker entrypoint kết nối DB, initIndexes, bắt SIGTERM/SIGINT, chạy loop và disconnect trong finally.

- [ ] Viết fake-timer test: chạy ngay lần đầu, delay 60 giây sau lượt hoàn thành, không overlap, lỗi một lượt vẫn chạy lượt sau, abort ngắt thời gian chờ và không chạy lượt mới. Stub loop no-op để ca call-count đỏ.

```ts
const controller = new AbortController();
const run = vi.fn().mockResolvedValue(undefined);
const running = runNotificationLoop(run, controller.signal);
await vi.advanceTimersByTimeAsync(0);
expect(run).toHaveBeenCalledTimes(1);
controller.abort();
await running;
```

- [ ] Chạy `pnpm test -- workers/test/notificationWorkerLoop.test.ts`, sau đó cài loop với `node:timers/promises` abortable delay; chờ lượt đang chạy kết thúc khi abort, không nuốt lỗi khởi tạo DB/index.
- [ ] One-shot import dotenv/config, connectDB, initIndexes, generate, disconnect trong finally. Log chỉ số lượng và loại lỗi; không dump object lỗi có thể chứa URI/payload. Worker log failure, tiếp tục lần sau; one-shot lỗi đặt exitCode 1.
- [ ] Thêm scripts:

```json
{
  "notifications:generate": "tsx scripts/generate-notifications.ts",
  "notifications:worker": "tsx workers/notificationWorker.ts"
}
```

- [ ] Compose thêm notification-worker build context ./backend, env_file backend/.env, cùng extra_hosts backend, restart unless-stopped, init true, command `["pnpm", "run", "notifications:worker"]`, không expose port. Không sửa env thật. Không đổi dependency nên không cần tái sinh lockfile.
- [ ] Tài liệu ghi cách chạy local, Docker, scheduler one-shot mỗi phút, index init bắt buộc, restart/retry, catch-up cho task cũ, độ trễ và không chạy worker trong serverless HTTP lifecycle. Chạy lại worker tests; `docker compose config --quiet` nếu môi trường có env cần thiết (không xuất env ra log). Smoke DB disposable: chạy one-shot hai lần kiểm tra count không tăng, worker SIGTERM dừng sạch. Commit worker/docs.

## Task 4: API client, cache và polling frontend

**Files:**

- Create: `frontend/src/shared/types/notification.ts`, `frontend/src/shared/services/notificationService.ts`.
- Create: `frontend/src/features/notifications/api/notificationKeys.ts`, `notificationQueries.ts`, `notificationMutations.ts` trong cùng thư mục.
- Test: `frontend/src/features/notifications/api/test/notificationQueries.test.tsx`, `notificationMutations.test.tsx`; `frontend/src/shared/services/test/notificationService.test.ts`.
- Extend: `frontend/src/app/test/AuthCacheBoundary.test.tsx` (chỉ sửa implementation AuthCacheBoundary/sessionCache nếu regression phát hiện thiếu).

**Interfaces:** client `list(params, options?: RequestOptions)`, `unreadCount(options?)`, `markRead(id)`, `markAllRead()` theo contract. Hooks `useNotificationsQuery(params, enabled = true)`, `useUnreadCountQuery()`, `useMarkNotificationReadMutation()`, `useMarkAllNotificationsReadMutation()` tự lấy user/auth readiness từ store hiện có.

- [ ] Viết axios-mock-adapter test path, params, AbortSignal, response và lỗi 401/500; query tests renderHook cùng QueryClient riêng và auth store reset mỗi test. Stub client/hook trước để test đỏ tại dữ liệu hoặc số request.
- [ ] Chạy `pnpm test -- src/shared/services/test/notificationService.test.ts src/features/notifications/api/test` từ frontend.
- [ ] Cài client qua shared httpClient, không tạo axios instance mới. Query keys phân vùng user:

```ts
export const notificationKeys = {
  all: (userId: string) => ["notifications", userId] as const,
  list: (userId: string, params: NotificationListParams) =>
    ["notifications", userId, "list", params] as const,
  count: (userId: string) => ["notifications", userId, "count"] as const,
};
```

- [ ] Count query enabled khi auth ready và có user; interval 60_000, refetchIntervalInBackground false, refetchOnWindowFocus always. Dùng visibility/focus cơ chế Query hiện tại; test thực tế document.visibilityState để bổ sung listener nếu cần. List enabled khi bảng mở/trang lịch sử đang mount. Khi mở chuông phải refetch count và list dù cache còn mới.
- [ ] Mutation không optimistic ở bản đầu: chỉ invalidate prefix user sau thành công; thất bại giữ dữ liệu và trả error cho UI. Test read-all/read đồng bộ count và cả hai list filter.
- [ ] Test fake timers ở 59_999/60_000 ms, tab ẩn, focus, logout, đổi user khi request cũ đang pending; không hiển thị cache user trước và không poll khi auth chưa sẵn sàng. Chạy tests và commit client/hooks.

## Task 5: Chuông, lịch sử và mở task qua deep link

**Files:**

- Create: `frontend/src/features/notifications/components/NotificationBell.tsx`, `NotificationList.tsx` trong cùng thư mục.
- Create: `frontend/src/features/notifications/NotificationsPage.tsx`, `routes.tsx`, `notifications.css` trong cùng feature.
- Create: `frontend/src/features/tasks/components/TaskDeepLink.tsx`.
- Modify: `frontend/src/shared/components/Topbar.jsx`, `frontend/src/app/router.tsx`, `frontend/src/features/tasks/TodoPage.jsx`.
- Modify: `frontend/src/shared/i18n/locales/en/common.json`, `frontend/src/shared/i18n/locales/vi/common.json` (namespace notifications và tiêu đề navigation).
- Test: `frontend/src/features/notifications/test/NotificationBell.test.tsx`, `NotificationsPage.test.tsx`; `frontend/src/features/tasks/components/test/TaskDeepLink.test.tsx`.

**Interfaces:** NotificationList nhận `{ items: NotificationDto[], onOpen: (item: NotificationDto) => void, pendingId?: string }`; TaskDeepLink không props, đọc taskId từ search params, dùng useTaskQuery và TaskDetailButton hiện có. Bell và page dùng hooks Task 4.

- [ ] Áp dụng frontend-design cho visual decisions trong hệ thống Orbit hiện tại, không dựng lại layout. Viết UI tests trước: badge 0/1/100, empty/error/loading, open/focus/Escape, read failure, pagination/filter/read-all; stub component trả null để test thiếu accessible elements.

```tsx
await user.click(screen.getByRole("button", { name: /notifications/i }));
expect(screen.getByRole("dialog", { name: /notifications/i })).toBeVisible();
await user.keyboard("{Escape}");
expect(screen.getByRole("button", { name: /notifications/i })).toHaveFocus();
```

- [ ] Chạy `pnpm test -- src/features/notifications/test src/features/tasks/components/test/TaskDeepLink.test.tsx`; cài chuông vào topbar với icon Bell, dialog có nhãn, Escape/outside click và focus management. Danh sách 10 mục, không poll riêng từng dòng. Badge lỗi giữ dữ liệu cuối nếu có, hiển thị trạng thái lỗi thay vì giả 0.
- [ ] Cài page 20 mục, filter reset page 1, Pagination hiện có, empty/error/retry và read-all disabled trong khi đang mutation. Route notifications nằm dưới ProtectedGuard/MainLayout. Thêm title Topbar cho route này.
- [ ] Thao tác mở chờ markRead thành công rồi navigate; lỗi giữ nguyên và cho thử lại:

```ts
await markRead.mutateAsync(item._id);
navigate(`/dashboard?taskId=${encodeURIComponent(item.taskId)}`);
```

- [ ] TaskDeepLink đọc query param bằng useSearchParams, validate ObjectId trước fetch, gọi useTaskQuery theo ID độc lập danh sách/filter và hiển thị TaskDetailButton. Close xóa chỉ taskId bằng replace, giữ các params khác. 403/404 hiển thị “Task không còn khả dụng”; lỗi mạng/5xx có retry; ID không hợp lệ không fetch. Không render dữ liệu task ID cũ khi URL đổi.
- [ ] Test task ngoài page hiện tại vẫn mở, refresh deep link, close không tự mở lại, task deleted/forbidden, switch ID đang tải. Kiểm tra cache xác thực cùng task query hiện có.
- [ ] Bản dịch en/vi cho title, type, badge plural count, time, mark-read/all, filters, load/empty/error/retry/unavailable. Format ngày bằng Intl với locale hiện tại. CSS tận dụng tokens, rộng bảng giới hạn viewport, focus ring, dark mode, không dựa chỉ màu để phân biệt unread. Chạy tests task này và i18n resource tests; commit UI.

## Task 6: Browser verification và kiểm tra bắt buộc

**Files:** Create `frontend/e2e/notifications.spec.ts`, `frontend/e2e/notifications.fixture.ts`; update `docs/deployment/notifications.md` bằng kết quả vận hành và trạng thái check. Dùng fixture/dashboard auth patterns hiện có, chỉ mock API trong browser suite; không coi mock E2E là integration backend.

- [ ] Trước khi hoàn thiện UI, thêm E2E flow với mocked authenticated session và 21 notifications để pagination có ý nghĩa:

```ts
await page.goto("/dashboard");
await page.getByRole("button", { name: /notifications/i }).click();
await page.getByRole("link", { name: /view all/i }).click();
await expect(page).toHaveURL(/\/notifications/);
await page.getByRole("button", { name: /mark all as read/i }).click();
await expect(page.getByTestId("notification-badge")).toHaveCount(0);
```

- [ ] Chạy `pnpm run test:e2e -- e2e/notifications.spec.ts`; ghi nhận red trước khi cài phần UI tương ứng, green sau Task 5. Fixture phải trả read/count/list nhất quán theo mutation, không cố định unread count.
- [ ] Dùng webapp-testing cho browser verification: desktop 1440x900/mobile 390x844; en/vi; sáng/tối; keyboard Tab/Enter/Escape, dialog focus, đọc một/tất cả, task không khả dụng, list lỗi retry, reload, không tràn ngang. Lưu screenshot vào thư mục artifact test, không commit output generated.
- [ ] Chạy integration với MongoDB disposable có ORBIT_MCP_TEST_MONGO_URI đã thiết lập và smoke worker/API thật. Không dùng database của người dùng. Nếu không có Docker/Mongo thì ghi blocker cụ thể, không tính skipped là pass.
- [ ] Từ backend chạy lần lượt:

```sh
pnpm test
pnpm run lint
pnpm run format:check
pnpm run build
```

- [ ] Từ frontend chạy lần lượt:

```sh
pnpm test
pnpm run test:e2e -- e2e/notifications.spec.ts
pnpm run lint
pnpm run format:check
pnpm run build
```

- [ ] Nếu format toàn package báo file không liên quan, chỉ format file của feature; ghi lỗi baseline riêng. Sau sửa, chạy lại check ảnh hưởng. Không claim full verification khi check bắt buộc fail.
- [ ] Từ root chạy `git diff --check`; rà spec criteria 1–4/10 → Task 1, 5–6 → Task 2, 7–8 → Task 4–5, 9 → Task 6; vận hành → Task 3. Review authorization, unique index thực tế, shutdown, dữ liệu nhạy cảm và lỗi cache trước commit cuối.
- [ ] Commit scoped test/docs còn lại, báo chính xác lệnh/kết quả, skipped, rủi ro và cách bật worker. Không merge hoặc deploy tự động.

## Kết quả thực thi — 2026-11-09

Đã triển khai Tasks 1–6 trên `feat/noti`. Các checkbox phía trên được giữ làm checklist thiết kế ban đầu; bằng chứng thực thi và ngoại lệ nằm ở [báo cáo kiểm chứng](../../deployment/notifications-verification.md).

- Task 1: `0885d79`, generation và integration MongoDB thật, gồm concurrent upsert, batch >200, deadline/status/ownership.
- Task 2: `f42f918`, API có auth/validation và cutoff lấy từ requestContext trước readiness. Test trì hoãn readiness tái hiện lỗi trước sửa.
- Task 3: `99aaf37`, worker, one-shot, Compose và hướng dẫn vận hành. Smoke insert 1 rồi 0; SIGTERM exit 0.
- Task 4: `f46765f`, API client, query/mutation và tests cách ly user/polling. Tái sử dụng AuthCacheBoundary hiện có; regression suite của nó vẫn đạt.
- Task 5: `632bdae`, chuông/lịch sử/deep link/i18n/mobile. Test trang lịch sử nằm chung `NotificationBell.test.tsx` để dùng cùng fixtures. Giữ editor khi refetch để không mất bản nháp; reset bằng key theo task ID.
- Task 6: `f9d5246`, bảy ca browser en/vi, light/dark, mobile keyboard/layout và history/deep link. Review độc lập đã được xử lý bằng regression test đỏ → xanh.

Các ca bổ sung coverage được viết sau implementation cốt lõi; không khẳng định mọi dòng code đều có test đỏ riêng. Dùng `pnpm exec vitest run <paths>` cho focused tests vì `pnpm test -- <paths>` ở môi trường này đã chạy cả suite. Browser dùng Playwright TypeScript hiện có thay vì bổ sung harness Python. Worker dùng abortable native setTimeout để fake-timer test được shutdown. Các API client tests spy shared HTTP client thay vì thêm adapter.

Toàn bộ test, lint (không lỗi), build/type-check và format của file thay đổi đạt. Full-package format check **chưa đạt** do 16 file baseline không thay đổi; giữ nguyên phạm vi, không format lockfile hoặc file ngoài feature. Backend lint có 13 warning cũ; frontend suite có warning JSDOM navigation và build có warning chunk size/ErrorPage imports.

## Thực thi và điểm kiểm tra

Thực hiện tuần tự trong phiên bằng executing-plans; không cần subagent. Sau Task 1–3 kiểm tra backend và worker; sau Task 4–5 kiểm tra frontend; Task 6 là cổng hoàn tất. Trước code đọc workflow worktree/TDD liên quan, kiểm tra git status để bảo toàn thay đổi có sẵn. Mọi phát hiện buộc đổi hành vi người dùng phải cập nhật spec và plan cùng nhau.
