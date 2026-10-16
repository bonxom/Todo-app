# Orbit MCP Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Bảo toàn quyền đọc task khi kết hợp search, project và các filter khác trong `getAll`.

**Architecture:** Giữ query quyền và query filter tách biệt, kết hợp bằng `$and` trước khi gọi repository. Chứng minh bằng unit test và integration test với MongoDB disposable; REST và MCP tương lai cùng hưởng bản sửa service.

**Tech Stack:** TypeScript strict/NodeNext, Mongoose hiện có, Vitest hiện có, pnpm, MongoDB 7 disposable qua Docker.

**Spec:** [2026-10-16-orbit-mcp-phase-1-design.md](../specs/2026-10-16-orbit-mcp-phase-1-design.md)

Trạng thái: hoàn thành ngày 2026-10-16; unit, integration MongoDB và các kiểm tra build/lint đã pass. Phạm vi phase 1 chưa tạo MCP server.

## Global Constraints

- Dùng pnpm trong từng package; không tạo root workspace hoặc package-lock.json.
- Giữ TypeScript strict và import tương đối với đuôi `.js`.
- Không thêm dependency runtime hoặc thay đổi schema MongoDB.
- Không đọc/ghi dữ liệu production trong test; integration dùng MongoDB disposable riêng.
- Không sửa `.env` thực hoặc log token/secret.

## File map và interfaces

| File | Thao tác | Trách nhiệm |
| --- | --- | --- |
| `backend/services/taskService.ts` | Sửa riêng `getAll` | Ghép quyền và filter |
| `backend/services/test/taskService.getAll.test.ts` | Tạo | Query composition, options, ngày không hợp lệ |
| `backend/services/test/taskService.getAll.integration.test.ts` | Tạo | Quyền A/B và count trên MongoDB thật |

Không cần sửa repository, routes, controller, frontend hoặc lockfile.

Interface dùng chung:

```typescript
taskService.getAll(
  user: IUserDocument,
  queryParams: Record<string, unknown>,
): Promise<ResponsePage<ITaskDocument>>

taskRepository.findPaginated(
  query: Record<string, unknown>,
  paging: { skip: number; limit: number; sort: Record<string, 1 | -1> },
): Promise<{ data: ITaskDocument[]; totalCount: number }>
```

## Task 1: Tái hiện và sửa việc filter ghi đè quyền

**Files:** tạo unit test nêu trên; sửa `backend/services/taskService.ts`.

**Consumes:** `buildTaskAccessQuery` nội bộ, các repository hiện có và signature `getAll`.

**Produces:** `getAll` giữ nguyên public interface, query filter không thể thay query quyền.

- [x] Kiểm tra worktree và baseline trước khi sửa:

```bash
git status --short
cd backend
pnpm run build
pnpm test
```

Ghi nhận lỗi có sẵn nếu có; không tuyên bố chúng do bản sửa mới.

- [x] Tạo `backend/services/test/taskService.getAll.test.ts` với nội dung sau:

```typescript
import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { categoryRepository } from "../../repositories/categoryRepository.js";
import { projectRepository } from "../../repositories/projectRepository.js";
import { taskRepository } from "../../repositories/taskRepository.js";
import { COMMON_ERROR } from "../../error/definitions/commonErrors.js";
import type { IUserDocument } from "../../types/IUser.js";
import { taskService } from "../taskService.js";

describe("taskService.getAll query boundaries", () => {
  const categoryId = new mongoose.Types.ObjectId();
  const projectId = new mongoose.Types.ObjectId();
  const foreignProjectId = new mongoose.Types.ObjectId();
  const user = {
    _id: new mongoose.Types.ObjectId(), role: "USER",
  } as IUserDocument;

  beforeEach(() => {
    vi.spyOn(categoryRepository, "findByUser")
      .mockResolvedValue([{ _id: categoryId }] as never);
    vi.spyOn(projectRepository, "findByUser")
      .mockResolvedValue([{ _id: projectId }] as never);
    vi.spyOn(taskRepository, "findPaginated")
      .mockResolvedValue({ data: [], totalCount: 0 });
  });
  afterEach(() => vi.restoreAllMocks());

  it("preserves access OR when search introduces its own OR", async () => {
    await taskService.getAll(user, { search: "report" });
    expect(taskRepository.findPaginated).toHaveBeenCalledWith({
      $and: [
        { $or: [
          { categoryId: { $in: [categoryId] } },
          { projectId: { $in: [projectId] } },
        ] },
        { $or: [{ title: /report/i }, { description: /report/i }] },
      ],
    }, { skip: 0, limit: 20, sort: { dueDate: 1, createdAt: -1 } });
  });

  it.each([foreignProjectId.toString(), "standalone"])(
    "preserves project-only access when filtering %s", async (filter) => {
      vi.mocked(categoryRepository.findByUser).mockResolvedValue([]);
      await taskService.getAll(user, { projectId: filter });
      expect(taskRepository.findPaginated).toHaveBeenCalledWith({
        $and: [
          { projectId: { $in: [projectId] } },
          { projectId: filter === "standalone" ? null : filter },
        ],
      }, expect.any(Object));
    },
  );

  it("keeps paging shape, skip, limit and explicit sort", async () => {
    const result = await taskService.getAll(user, {
      pageNo: 2, pageSize: 1, sort: "title:asc",
    });
    expect(taskRepository.findPaginated).toHaveBeenCalledWith(
      expect.any(Object), { skip: 1, limit: 1, sort: { title: 1 } },
    );
    expect(result).toEqual({
      data: [],
      pageInfo: { pageNo: 2, pageSize: 1, totalCount: 0, totalPage: 0 },
    });
  });

  it.each([
    { startDate: "2026-10-01" },
    { endDate: "2026-10-31" },
    { startDate: "invalid", endDate: "2026-10-31" },
    { startDate: "2026-10-31", endDate: "2026-10-01" },
  ])("rejects invalid ranges without querying tasks: %o", async (query) => {
    await expect(taskService.getAll(user, query)).rejects.toMatchObject({
      code: COMMON_ERROR.INVALID_PAYLOAD.code,
    });
    expect(taskRepository.findPaginated).not.toHaveBeenCalled();
  });
});
```

- [x] Chạy test trước bản sửa:

```bash
cd backend
pnpm exec vitest run services/test/taskService.getAll.test.ts
```

Kỳ vọng ba case đầu thất bại do query quyền bị ghi đè; paging và validation ngày đã pass. Nếu lỗi là import/setup thì sửa harness trước khi kết luận đã tái hiện bug.

- [x] Trong `getAll`, đổi phần dựng query theo đoạn dưới; giữ nguyên phần pagination và lời gọi repository phía sau:

```typescript
const accessQuery = await buildTaskAccessQuery(user);
const filters: Record<string, unknown> = {};
const dateRange = parseDateRangeQuery(queryParams);
if (dateRange.error) throw new AppError(COMMON_ERROR.INVALID_PAYLOAD);
if (dateRange.filter) Object.assign(filters, dateRange.filter);

if (typeof queryParams.search === "string" && queryParams.search.trim()) {
  const escaped = queryParams.search
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const searchRegex = new RegExp(escaped, "i");
  filters.$or = [{ title: searchRegex }, { description: searchRegex }];
}
if (queryParams.status && typeof queryParams.status === "string") {
  filters.status = queryParams.status;
}
if (queryParams.projectId && typeof queryParams.projectId === "string") {
  filters.projectId =
    queryParams.projectId === "standalone" ? null : queryParams.projectId;
}
const query: Record<string, unknown> = Object.keys(filters).length === 0
  ? accessQuery
  : { $and: [accessQuery, filters] };
```

- [x] Chạy unit test mới, suite service hiện có và typecheck:

```bash
cd backend
pnpm exec vitest run services/test/taskService.getAll.test.ts services/test/taskService.test.ts
pnpm run build
```

Kỳ vọng pass; không thay đổi expected tests cũ chỉ để che regression.

## Task 2: Chứng minh cách ly dữ liệu bằng MongoDB thật

**Files:** tạo `backend/services/test/taskService.getAll.integration.test.ts`.

**Consumes:** `getAll` đã sửa ở task 1; Mongoose models/repositories thật.

**Produces:** test dữ liệu và count trên MongoDB; không thêm thư viện giả lập MongoDB.

- [x] Tạo file integration test với nội dung dưới. `ORBIT_MCP_TEST_MONGO_URI` phải trỏ tới container disposable; test tự tạo database có tên riêng, không dùng `MONGO_URI` của ứng dụng:

```typescript
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Task from "../../models/Task.js";
import Category from "../../models/Category.js";
import Project from "../../models/Project.js";
import "../../models/User.js";
import type { IUserDocument } from "../../types/IUser.js";
import { taskService } from "../taskService.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_mcp_phase1_test_${process.pid}_${Date.now()}`;
const makeUser = (role = "USER") => ({
  _id: new mongoose.Types.ObjectId(), role,
}) as IUserDocument;

describe.skipIf(!uri)("getAll MongoDB authorization", () => {
  const a = makeUser();
  const b = makeUser();
  const categoryOnly = makeUser();
  const projectOnly = makeUser();
  const empty = makeUser();
  const admin = makeUser("ADMIN");
  const ca = new mongoose.Types.ObjectId();
  const cb = new mongoose.Types.ObjectId();
  const cc = new mongoose.Types.ObjectId();
  const pa = new mongoose.Types.ObjectId();
  const pb = new mongoose.Types.ObjectId();
  const pp = new mongoose.Types.ObjectId();
  const at = new Date("2026-10-16T12:00:00.000Z");

  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\//.test(uri)) {
      throw new Error("Use an explicit loopback disposable MongoDB URI");
    }
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    // Insert through collections to avoid signup hooks; IDs are fixture-only.
    await mongoose.connection.collection("users").insertMany(
      [a, b, categoryOnly, projectOnly, empty, admin].map((user, index) => ({
        _id: user._id, role: user.role, name: `Fixture ${index}`,
        email: `fixture-${index}@example.invalid`,
      })),
    );
    await Category.collection.insertMany([
      { _id: ca, userId: a._id, name: "A" },
      { _id: cb, userId: b._id, name: "B" },
      { _id: cc, userId: categoryOnly._id, name: "Category only" },
    ]);
    await Project.collection.insertMany([
      { _id: pa, userId: a._id, name: "A", status: "active" },
      { _id: pb, userId: b._id, name: "B", status: "active" },
      { _id: pp, userId: projectOnly._id, name: "Project only", status: "active" },
    ]);
    await Task.create([
      { title: "A report", categoryId: ca, projectId: pa, dueDate: at },
      { title: "A standalone report", categoryId: ca },
      { title: "A project report", projectId: pa, dueDate: at },
      { title: "B report", categoryId: cb, projectId: pb, dueDate: at },
      { title: "B standalone report", categoryId: cb },
      { title: "C report", categoryId: cc },
      { title: "P report", projectId: pp },
      { title: "Literal", description: "A+B", categoryId: ca },
      { title: "Regex decoy", description: "aaab", categoryId: ca },
      { title: "Completed report", categoryId: ca, projectId: pa,
        status: "completed", dueDate: at },
    ]);
  }, 30000);

  afterAll(async () => {
    try {
      if (mongoose.connection.name === dbName && mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
      }
    } finally {
      await mongoose.disconnect();
    }
  });

  async function expectTitles(
    user: IUserDocument, filters: Record<string, unknown>, titles: string[],
  ) {
    const result = await taskService.getAll(user, filters);
    expect(result.data.map((task) => task.title).sort()).toEqual([...titles].sort());
    expect(result.pageInfo.totalCount).toBe(titles.length);
  }

  it("A1/A5: search preserves both access branches", async () => {
    await expectTitles(a, { search: "report" }, [
      "A report", "A standalone report", "A project report", "Completed report",
    ]);
  });
  it("A2/A3: project-only user cannot override ownership", async () => {
    await expectTitles(projectOnly, { projectId: pb.toString() }, []);
    await expectTitles(projectOnly, { projectId: "standalone" }, []);
    await expectTitles(projectOnly, { projectId: pp.toString() }, ["P report"]);
  });
  it("A4: category-only and empty users stay isolated", async () => {
    await expectTitles(categoryOnly, { search: "report" }, ["C report"]);
    await expectTitles(empty, {}, []);
    await expectTitles(empty, { search: "report", projectId: pb.toString() }, []);
  });
  it("A6: combines filters including inclusive date bounds", async () => {
    await expectTitles(a, {
      search: "report", status: "pending", projectId: pa.toString(),
      startDate: at.toISOString(), endDate: at.toISOString(),
    }, ["A report", "A project report"]);
    await expectTitles(a, { search: "report", projectId: "standalone" }, [
      "A standalone report",
    ]);
  });
  it("A7: treats search literally, trims and searches description", async () => {
    await expectTitles(a, { search: " a+b " }, ["Literal"]);
    const unfiltered = await taskService.getAll(a, {});
    const whitespace = await taskService.getAll(a, { search: "   " });
    expect(whitespace.data.map((t) => t._id.toString()).sort())
      .toEqual(unfiltered.data.map((t) => t._id.toString()).sort());
    expect(whitespace.pageInfo.totalCount).toBe(6);
  });
  it("A8: admin keeps global access but honors filters", async () => {
    expect((await taskService.getAll(admin, {})).pageInfo.totalCount).toBe(10);
    await expectTitles(admin, { search: "report", projectId: pb.toString() }, [
      "B report",
    ]);
  });
  it("A9: count and pagination apply after authorization", async () => {
    const result = await taskService.getAll(a, {
      search: "report", pageNo: 2, pageSize: 1, sort: "title:asc",
    });
    expect(result.data.map((t) => t.title)).toEqual(["A report"]);
    expect(result.pageInfo).toEqual({
      pageNo: 2, pageSize: 1, totalCount: 4, totalPage: 4,
    });
    expect((await taskService.getAll(a, {})).pageInfo.totalCount).toBe(6);
  });
});
```

- [x] Khởi chạy MongoDB riêng (không mount volume, bind loopback). Nếu tên container hoặc port bị chiếm, chọn tên/port khác và cập nhật URI; không xóa container có sẵn:

```bash
docker run --detach --rm --name orbit-mcp-phase1-mongo -p 127.0.0.1:27028:27017 mongo:7
docker exec orbit-mcp-phase1-mongo mongosh --quiet --eval 'db.adminCommand({ping:1})'
```

Kỳ vọng ping trả `ok: 1`; nếu chưa ready thì chạy lại ping trước khi chạy test.

- [x] Chạy integration test thật:

```bash
cd backend
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27028/ pnpm exec vitest run services/test/taskService.getAll.integration.test.ts
```

Kỳ vọng tất cả case chạy và pass, không skipped. Trước bản sửa, A1 và A2/A3 sẽ trả thêm task/count ngoài quyền; có thể xác minh red bằng worktree tạm nếu cần, không reset worktree đang có thay đổi.

- [x] Dừng đúng container đã tạo sau khi kiểm thử (kể cả khi test lỗi):

```bash
docker stop orbit-mcp-phase1-mongo
```

Lệnh này chỉ áp dụng container disposable do bước trên tạo thành công. Không dùng lệnh drop database đối với cấu hình ứng dụng.

## Task 3: Kiểm chứng toàn bộ và bàn giao phase 2

**Files:** rà soát ba file trong file map; cập nhật checkbox/kết quả trong plan này khi thực thi.

**Consumes:** bản sửa và test ở task 1–2.

**Produces:** diff có thể review, bảng kết quả test, danh sách giới hạn còn lại.

- [x] Chạy backend checks:

```bash
cd backend
pnpm run build
pnpm test
```

Integration test sẽ skip khi không có biến test URI; kết quả này chỉ hợp lệ cho full suite nếu đã có lần integration chạy thực thành công ở task 2.

- [x] Chạy kiểm tra frontend theo quy ước repo:

```bash
cd frontend
pnpm run lint
pnpm run build
```

- [x] Rà soát diff và whitespace:

```bash
git diff --check
git diff -- backend/services/taskService.ts
git status --short
```

Mở cả hai test file mới vì `git diff` mặc định không hiển thị file untracked. Không có thay đổi route, response shape, secret hoặc dependency. Kiểm tra escape regex trong code thực và kế hoạch trùng nhau.

- [x] Đối chiếu nghiệm thu: A1/A5, A2/A3, A4, A6, A7, A8, A9 thuộc integration; A9 options/response và A10 thuộc unit. Ghi exact command, pass/fail/skipped và lỗi nền nếu có.
- [x] Bàn giao phase 2: service đã giữ query quyền khi lọc; ownership của task có category/project khác chủ, chính sách admin MCP và validation tại tool vẫn cần được xử lý trong thiết kế phase 2.

Không đánh dấu phase 1 hoàn thành nếu chưa chạy MongoDB integration. Không thêm endpoint MCP như một phần của task này.

## Self-review của tài liệu

- Spec A1–A10 đều có mapping sang test cụ thể.
- Code dự kiến giữ chữ ký `getAll`, dùng repository hiện hữu, không phát sinh interface phụ chưa định nghĩa.
- Phase 1 độc lập với lựa chọn client, SDK và OAuth provider của các phase sau.
- Các command trong tài liệu là hướng dẫn thực thi; việc soạn plan không có nghĩa là chúng đã được chạy.


## Nhật ký thực thi — 2026-10-16

- Làm việc trên nhánh `feat/mcp-server`; giữ nguyên các tài liệu untracked đã có.
- Baseline backend: `pnpm run build` pass, `pnpm test` 60/60 pass.
- Trước sửa: `pnpm exec vitest run services/test/taskService.getAll.test.ts` có 3 fail đúng lỗi phân quyền, 5 pass.
- Sau sửa: `pnpm exec vitest run services/test/taskService.getAll.test.ts services/test/taskService.test.ts` có 14/14 pass.
- Typecheck phát hiện đoạn test mẫu dùng `id` không thuộc `ITaskDocument`; đã đổi thành `_id.toString()` trong test và plan. Typecheck sau sửa pass.
- `pnpm test` sau sửa: 68 pass, 7 integration skipped khi không cung cấp URI test.
- Frontend: `pnpm run lint` và `pnpm run build` pass. Build có cảnh báo `ErrorPage.jsx` được import vừa static vừa dynamic; không sửa ngoài phạm vi.
- Rà soát độc lập: không phát hiện vấn đề đáng kể trong diff và coverage.
- Integration bổ sung kiểm tra khoảng ngày không chứa fixture trả tập rỗng.
- `docker exec orbit-mcp-phase1-mongo mongosh --quiet --eval 'db.adminCommand({ping:1})'`: `{ ok: 1 }`.
- `ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27028/ pnpm exec vitest run services/test/taskService.getAll.integration.test.ts`: 7/7 pass, không skipped; MongoDB 7 thật chạy trong container disposable.
- `docker stop orbit-mcp-phase1-mongo`: thành công; container `--rm` đã được dọn. Test đã drop đúng database có tên riêng trước khi disconnect.
- `git diff --check`: pass. Không đổi dependency, API, schema hoặc frontend.
- Tổng nghiệm thu: 68 backend test pass trong full suite và 7 integration test pass riêng, bao phủ A1–A10. Phase 1 hoàn thành; phase 2 chưa triển khai.
