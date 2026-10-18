# Orbit MCP Phase 2 Implementation Plan

> **For agentic workers:** Use the repository's `.claude/skills/executing-plans/SKILL.md` to implement this plan task-by-task. Steps use checkbox syntax for tracking. Thực thi trực tiếp; không cần dispatch subagent để hoàn thành plan này.

**Goal:** Mở bốn MCP tool chỉ đọc dữ liệu người dùng Orbit qua endpoint local `/mcp`, có phân quyền, validation, DTO và kiểm thử client thật.

**Architecture:** MCP adapter trong Express backend gọi service; service giữ quyền và repository giữ truy vấn. Mỗi POST tạo server/transport/context riêng, stateless JSON. ADMIN bị từ chối tại MCP; thêm service read-by-ID theo quyền list và giữ REST hiện tại.

**Tech Stack:** Node 22, TypeScript NodeNext, Express 5, Mongoose, Zod 4, SDK `@modelcontextprotocol/sdk@1.32.1`, Vitest, supertest, MCP Inspector.

**Spec:** [Phase 2 design](../specs/2026-10-16-orbit-mcp-phase-2-design.md).

Ngày: 2026-10-16. Trạng thái: đã triển khai và nghiệm thu ngày 2026-10-16. Phase 1 là prerequisite đã hoàn thành.

## Global Constraints

- Node 22; pnpm trong backend/frontend riêng; TypeScript strict NodeNext, relative import `.js`.
- Pin SDK `1.32.1` exact; dùng Zod 4 hiện có; không root workspace, không chỉnh lockfile bằng tay.
- Không sửa `.env` thật, dữ liệu production, schema MongoDB, frontend hoặc semantics REST hiện tại.
- Chỉ local: `MCP_ENABLED=false` mặc định; khi true yêu cầu HOST=127.0.0.1, NODE_ENV=development/test và không VERCEL.
- Bốn read tools, không tool ghi/stats/OAuth/resources/prompts; không sửa role user để vượt qua admin bypass của service.
- Không token/query/result/raw exception trong logs hoặc tài liệu. Không commit credential.
- Các code block dưới là lõi triển khai và test trọng điểm; file test phải phủ đầy đủ case liệt kê cùng task, không chỉ chép một happy path.

## File map

| File                                                                                     | Trách nhiệm                                                      |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Modify `backend/package.json`, `backend/pnpm-lock.yaml`                                  | SDK exact, script test MCP integration và smoke                  |
| Create `backend/mcp/config.ts`                                                           | Parse flag/origins, kiểm tra điều kiện local, exported McpConfig |
| Create `backend/mcp/context.ts`                                                          | McpContext theo request, admin/no-exp guard sau protect          |
| Create `backend/mcp/schemas.ts`                                                          | Strict input, output schema và inferred DTO/input types          |
| Create `backend/mcp/dto.ts`                                                              | Whitelist document → DTO, date/reference normalization           |
| Create `backend/mcp/errors.ts`                                                           | Safe tool result/error mapping và HTTP error middleware riêng    |
| Create `backend/mcp/tools.ts`                                                            | Đăng ký bốn tools gọi service, paging project/category           |
| Create `backend/mcp/server.ts`                                                           | Factory McpServer với context                                    |
| Create `backend/mcp/router.ts`                                                           | HTTP guards/CORS/auth/parser/transport/cleanup                   |
| Modify `backend/services/taskService.ts`                                                 | Thêm getReadableById; không thay getById/update                  |
| Modify `backend/app.ts`, `backend/server.ts`                                             | Mount route sớm, readiness injection, startup config validation  |
| Modify `backend/.env.example`                                                            | Cấu hình MCP comment rõ local; không đổi HOST REST mặc định      |
| Create `backend/mcp/test/{config,schemas,dto,errors,tools,router,compatibility}.test.ts` | Unit/HTTP/SDK compatibility tests không cần Mongo                |
| Create `backend/services/test/taskService.getReadableById.test.ts`                       | Service query và not-found unit tests                            |
| Create `backend/mcp/test/mcp.integration.test.ts`                                        | SDK + listener loopback + MongoDB thật                           |
| Create `backend/scripts/mcp-smoke.ts`                                                    | Native client smoke trên backend local đã chạy                   |
| Create `docs/mcp/local-development.md`                                                   | Runbook và compatibility evidence                                |

Không cần tạo repository hoặc model mới. Không thêm dependency supertest/Vitest/Zod vì đã có.

## Task 1 — Khóa SDK baseline và cấu hình local

**Files:** package/lockfile, `mcp/config.ts`, `mcp/test/config.test.ts`, `mcp/test/compatibility.test.ts`.

**Interfaces:** `readMcpConfig(env: NodeJS.ProcessEnv): McpConfig`; `McpConfig = {enabled: boolean; allowedOrigins: readonly string[]; host: string; port: number}`. Hàm pure, không đọc secret hoặc kết nối DB; caller truyền process.env. Disabled vẫn validate cú pháp flag, không yêu cầu HOST/NODE_ENV local.

- [x] Xác nhận baseline trên registry, rồi cài exact từ backend:

```bash
pnpm view @modelcontextprotocol/sdk@1.32.1 version engines peerDependencies
pnpm add --save-exact @modelcontextprotocol/sdk@1.32.1
```

Nếu version không tồn tại/không tương thích, dừng phần dependent và ghi bằng chứng để sửa quyết định baseline; không chọn latest ngầm.

- [x] Viết test config trước implementation, chạy để thấy FAIL:

```typescript
expect(readMcpConfig({}).enabled).toBe(false);
expect(() => readMcpConfig({ MCP_ENABLED: "yes" })).toThrow();
expect(() =>
  readMcpConfig({
    MCP_ENABLED: "true",
    HOST: "0.0.0.0",
    NODE_ENV: "development",
  }),
).toThrow();
expect(
  readMcpConfig({ MCP_ENABLED: "true", HOST: "127.0.0.1", NODE_ENV: "test" })
    .enabled,
).toBe(true);
```

Thêm enabled + NODE_ENV unset/production, VERCEL, invalid port, origin wildcard/public/null/path/userinfo; valid empty origins và hai loopback origins. Kiểm tra URL origin chính xác, không dùng startsWith.

- [x] Implement config theo spec. PORT integer 1..65535, default 3001; test ephemeral listener truyền port thực qua config fixture, không lấy port0 từ env production.
- [x] Viết compatibility test minimal server/client bằng SDK InMemoryTransport: initialize, registerTool với strict Zod4 input và output, structuredContent, invalid argument, isError không success output. Test assertion ví dụ:

```typescript
expect((await client.listTools()).tools.map((t) => t.name)).toEqual([
  "compat_read",
]);
const result = await client.callTool({ name: "compat_read", arguments: {} });
expect(result.structuredContent).toEqual({ ok: true });
```

Trong fixture tạo `McpServer`, `Client`, `InMemoryTransport.createLinkedPair()`, nối server trước client, finally đóng cả hai. Tool test khai báo `inputSchema:z.strictObject({})`, `outputSchema:z.object({ok:z.boolean()})`. Chốt APIs từ installed typings, không lấy ví dụ v2 trộn vào v1.

- [x] Chạy `pnpm exec vitest run mcp/test/config.test.ts mcp/test/compatibility.test.ts` và `pnpm run build`; ghi SDK/version/protocol support vào runbook sau task 6. Chỉ chuyển task 2 sau baseline pass.

## Task 2 — Quyền đọc task theo ID dùng cùng access query

**Files:** modify `services/taskService.ts`, create `services/test/taskService.getReadableById.test.ts`.

**Interfaces:** `taskService.getReadableById(id: mongoose.Types.ObjectId | string, user: IUserDocument): Promise<ITaskDocument>`. Tiêu thụ `buildTaskAccessQuery`, `taskRepository.findPaginated` hiện có. Chỉ MCP gọi method mới.

- [x] Viết unit test spies category/project repositories trả fixture IDs; task repository trả zero hoặc một document. Assert query có AND access OR và `_id`, cùng skip0/limit1. Assert foreign/absent đều TASK_ERROR.NOT_FOUND.

```typescript
await expect(taskService.getReadableById(taskId, userA)).rejects.toMatchObject({
  code: TASK_ERROR.NOT_FOUND.code,
});
expect(findPaginatedSpy).toHaveBeenCalledWith(
  {
    $and: [
      {
        $or: [
          { categoryId: { $in: [categoryAId] } },
          { projectId: { $in: [projectAId] } },
        ],
      },
      { _id: taskId },
    ],
  },
  { skip: 0, limit: 1, sort: { _id: 1 } },
);
```

`userA`, task/category/project IDs là fixture ObjectIds; setup tương tự test `taskService.getAll.test.ts` hiện có, không cast fake user rồi dùng như fixture DB thật.

- [x] Run `pnpm exec vitest run services/test/taskService.getReadableById.test.ts`, xác nhận thiếu method gây FAIL.
- [x] Thêm method vào object taskService:

```typescript
async getReadableById(id: mongoose.Types.ObjectId | string, user: IUserDocument): Promise<ITaskDocument> {
  const access = await buildTaskAccessQuery(user);
  const { data } = await taskRepository.findPaginated(
    { $and: [access, { _id: id }] },
    { skip: 0, limit: 1, sort: { _id: 1 } },
  );
  if (!data[0]) throw new AppError(TASK_ERROR.NOT_FOUND);
  return data[0];
},
```

- [x] Run `pnpm exec vitest run services/test/taskService.getReadableById.test.ts services/test/taskService.getAll.test.ts services/test/taskService.test.ts`. Không thay verifyOwnership hoặc getById để làm test pass. Mongo cases P2-06 thực hiện ở task 6.

## Task 3 — Input/output, DTO và lỗi an toàn

**Files:** `mcp/schemas.ts`, `dto.ts`, `errors.ts`; tests tương ứng.

**Interfaces:** export `listTasksInputSchema`, `getTaskInputSchema`, `listPageInputSchema`; `taskDtoSchema`, `projectDtoSchema`, `categoryDtoSchema`; `taskPageOutputSchema`, `projectPageOutputSchema`, `categoryPageOutputSchema`, `getTaskOutputSchema`. Export inferred `TaskDto`, `ProjectDto`, `CategoryDto`, `ListTasksInput`, `ListPageInput`. `toTaskDto(task: ITaskDocument): TaskDto`, `toProjectDto(project: Record<string, unknown>): ProjectDto`, `toCategoryDto(category: ICategoryDocument): CategoryDto`. `toolSuccess(output: Record<string, unknown>): CallToolResult`, `toolFailure(error: unknown): CallToolResult`.

- [x] Viết schema tests trước: pageSize0/101, pageNo fraction/string, invalid status/ID/operator, unknown userId, datetime missing offset/one endpoint/reverse; hợp lệ offset tương đương UTC. Chạy RED `pnpm exec vitest run mcp/test/schemas.test.ts`.

```typescript
expect(listTasksInputSchema.safeParse({ userId: "attacker" }).success).toBe(
  false,
);
expect(listTasksInputSchema.safeParse({ pageSize: 101 }).success).toBe(false);
expect(listTasksInputSchema.parse({})).toMatchObject({
  pageNo: 1,
  pageSize: 20,
});
expect(
  listTasksInputSchema.safeParse({ startDate: "2026-10-16" }).success,
).toBe(false);
```

- [x] Implement strict schemas; shared paging shape dùng number.int.min.max.default; datetime `z.iso.datetime({offset:true})`; cross-field superRefine cả cặp và thứ tự. Enum sort chính xác trong spec; không dùng generic REST sort regex. Output schema mọi key required, nullable chỉ field spec cho phép.

```typescript
const idSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);
const pageShape = {
  pageNo: z.number().int().min(1).max(100000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
};
export const getTaskInputSchema = z.strictObject({ taskId: idSchema });
export const listPageInputSchema = z.strictObject(pageShape);
```

- [x] Viết DTO tests raw ObjectId, populated reference chứa owner email, null/missing refs, dates, invalid required dates. Assert exact keys và absence của sentinel secret trong JSON:

```typescript
const dto = toTaskDto(taskWithPopulatedOwners);
expect(dto.categoryId).toBe(categoryId.toString());
expect(JSON.stringify(dto)).not.toContain("private-owner@example.test");
expect(dto).not.toHaveProperty("userId");
expect(dto).not.toHaveProperty("__v");
```

- [x] Implement explicit property mapping, parse thành output schema trước trả. Không spread document/toObject vào DTO. Reference helper kiểm tra ObjectId trước object có `_id`; optional date null, required date invalid throw. Không JSON stringify document toàn bộ để normalize.
- [x] Viết lỗi tests AppError not-found/access-denied → cùng NOT_FOUND, invalid payload → INVALID_ARGUMENT; lỗi Mongo connectivity → SERVICE_UNAVAILABLE; `new Error('mongodb://secret')` → INTERNAL_ERROR không lộ chuỗi secret.
- [x] Implement result helpers; chỉ nhận diện DB connectivity qua class/name allowlist xác định (`MongoNetworkError`, `MongoServerSelectionError`, `MongooseServerSelectionError`), không match arbitrary message. Dùng literal messages spec; không return `error.message` cho unknown.

```typescript
export const toolSuccess = (
  output: Record<string, unknown>,
): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(output) }],
  structuredContent: output,
});
// toolFailure trả isError:true + text JSON {error:{code,message,retryable}};
// không structuredContent giả theo schema thành công.
```

- [x] Run `pnpm exec vitest run mcp/test/schemas.test.ts mcp/test/dto.test.ts mcp/test/errors.test.ts` và `pnpm run build`.

## Task 4 — Bốn tools và context theo request

**Files:** `mcp/context.ts`, `tools.ts`, `server.ts`, `mcp/test/tools.test.ts`.

**Interfaces:** `McpContext = Readonly<{user: IUserDocument; requestId: string}>`; `registerOrbitTools(server: McpServer, context: McpContext): void`; `createOrbitMcpServer(context: McpContext): McpServer`. Context được router tạo sau protect; factory không đọc req/process.env hoặc lưu mutable global.

- [x] Viết tests bằng linked SDK transports cho đúng bốn names, annotations/input/output schemas; mocked service nhận đúng user của closure và arguments đã parse. Assert không gọi service trên invalid arguments.
- [x] Implement factory và đăng ký tools qua registerTool. Tất cả callback có try/catch chuyển toolFailure; `outputSchema` dùng schemas task 3; validate DTO trước toolSuccess. Handler skeleton:

```typescript
async ({ taskId }: { taskId: string }) => {
  try {
    const task = await taskService.getReadableById(taskId, context.user);
    return toolSuccess({ task: toTaskDto(task) });
  } catch (error) {
    return toolFailure(error);
  }
};
```

`orbit_list_tasks`: getAll(context.user, parsedInput), giữ pageInfo và map toTaskDto. `orbit_list_projects/categories`: getAll(context.user), copy array, sort `_id.toString()` lexical tăng dần, slice `(pageNo-1)*pageSize` đến `pageNo*pageSize`, buildResponsePage; map DTO cho page. Không sort/mutate array gốc. Không thêm status/search chưa có contract cho hai list này.

- [x] Test hai server factories user A/B cùng chạy callTool bằng Promise.all, mocked services trả fixture riêng theo user; verify output không lẫn. Test service throw và output schema sai thành sanitized error; list empty/page2. Unit này bổ sung, không thay Mongo concurrency task 6.
- [x] Run `pnpm exec vitest run mcp/test/tools.test.ts` và `pnpm run build`.

## Task 5 — `/mcp`, startup guard, auth và lifecycle

**Files:** `mcp/router.ts`, `mcp/context.ts`, `mcp/errors.ts`, `app.ts`, `server.ts`, `.env.example`, `mcp/test/router.test.ts`.

**Interfaces:** `createMcpRouter(config: McpConfig, ensureReady: () => Promise<void>): Router`. Dependency injection readiness để HTTP unit test không kết nối DB. Reuse protect từ `middlewares/auth.ts`; không đổi middleware REST. `createMcpContext(req: Request): McpContext` kiểm tra req.user/role và exp đã xác thực, không dùng body arguments làm identity.

- [x] Viết supertest matrix P2-01/02/04/09 với test JWT_SECRET/refresh secret khác nhau; mock User.findById, không mock protect. Có token valid/expired/bad signature/refresh/no-exp/bad id/deleted user/admin. Spy factory xác nhận unauthorized không tạo server.
- [x] RED `pnpm exec vitest run mcp/test/router.test.ts`.
- [x] Implement guards từ spec bằng URL parsing exact host/origin và socket allowlist; reject forwarding headers. OPTIONS trước Bearer, các method khác qua auth; expose allowed response CORS headers trên cả success/error. Parser đặt sau guard/auth, body limit `100kb`.
- [x] Tạo request server/transport; cleanup once trên finish và close, fallback catch; await/handle close errors không để unhandled rejection. Lõi POST:

```typescript
const server = createOrbitMcpServer(createMcpContext(req));
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
  enableJsonResponse: true,
});
let closed = false;
const cleanup = async () => {
  if (closed) return;
  closed = true;
  await Promise.allSettled([transport.close(), server.close()]);
};
res.once("finish", () => {
  void cleanup();
});
res.once("close", () => {
  void cleanup();
});
try {
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
} catch (error) {
  await cleanup();
  next(error);
}
```

MCP error middleware không ghi response nếu headersSent; terminate response nếu cần. HTTP errors cố định `{error:{code,message}}`, auth 401 kèm WWW-Authenticate. SDK protocol errors giữ SDK shape, không wrap JSON-RPC bằng REST envelope. Kiểm tra `exp` của token sau protect bằng jwt.decode và Number.isFinite, không log token.

- [x] Di chuyển phần khai báo `ensureAppReady` lên trước mount để truyền function mà không gọi lúc import. Sau requestContext, mount path `/mcp` trước cors/morgan/json chung. Disabled responder 404 tại path này trước readiness, không instantiate MCP router/server khi flag false. Enabled router tự gọi readiness và error middleware riêng. Các REST mount/middleware thứ tự còn lại giữ nguyên.
- [x] `server.ts` gọi readMcpConfig trước connect/listen, app import cũng validate để Vercel không bypass. `.env.example` thêm MCP_ENABLED=false, MCP_ALLOWED_ORIGINS trống; comment bật local bằng env override NODE_ENV/HOST, không đổi config REST mặc định.
- [x] GREEN router tests, thêm test mount app với disabled/readiness spy, test REST health/auth regression hiện có. Test disconnect giữa handler bằng delayed service và đóng socket, đảm bảo cleanup once, request khác vẫn chạy.
- [x] Run `pnpm exec vitest run mcp/test` và `pnpm run build`. Tại bước này compatibility test phải kiểm tra success error result không bị outputSchema reject lần nữa.

## Task 6 — Mongo thật, native client và Inspector smoke

**Files:** `mcp/test/mcp.integration.test.ts`, `scripts/mcp-smoke.ts`, package scripts, `docs/mcp/local-development.md`.

**Interfaces:** test env `ORBIT_MCP_TEST_MONGO_URI` chỉ loopback; runtime smoke env `ORBIT_MCP_URL=http://127.0.0.1:3001/mcp`, `ORBIT_MCP_ACCESS_TOKEN`. Package scripts `test:mcp:integration = vitest run mcp/test/mcp.integration.test.ts`, `mcp:smoke = tsx scripts/mcp-smoke.ts`.

- [x] Fixture database `orbit_mcp_phase2_test_<pid>_<timestamp>`, Mongo URI loopback check trước connect và explicit dbName override. Tạo A/B/categoryOnly/projectOnly/empty/admin, categories/projects/tasks (cùng keyword, project-only, standalone, cross-owner, orphan/dangling), dùng insertMany/raw collections để tránh user signup hook không liên quan. Không dùng production env DB.
- [x] Chạy Express app với router trên loopback port0, lấy actual port và inject vào config trước request. SDK clients dùng StreamableHTTPClientTransport với Authorization header và Client. Handshake phải negotiate 2025-11-25; sau initialized, tools/list đúng4 và call đủ4. Không mock auth/services/repositories trong các test dữ liệu.

```typescript
const client = new Client({ name: "orbit-phase2-test", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
  requestInit: { headers: { Authorization: `Bearer ${tokenA}` } },
});
await client.connect(transport);
try {
  const result = await client.callTool({
    name: "orbit_list_tasks",
    arguments: { search: "report" },
  });
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toMatchObject({
    pageInfo: { totalCount: expectedCountA },
  });
} finally {
  await client.close();
}
```

- [x] Viết assertion task IDs/count cho A/B đồng thời; dùng test-only barrier middleware sau auth, trước transport để hai request tools/call cùng tới rồi giải phóng; không delay mù hoặc mock DB query. Lặp các tool list/get project/category, foreign/missing task cùng NOT_FOUND, category/project-only, cross-owner OR, no refs/dangling, empty user. Assert user stats/task/project/category counts và updatedAt không đổi sau toàn bộ calls.
- [x] Test raw HTTP headers/version/method/auth và 20 request lifecycle liên tiếp; test failure/disconnect với fixture delayed wrapper ở HTTP suite. Teardown tất cả SDK clients, HTTP listener, generated database, mongoose; drop DB chỉ khi prefix test match. Đóng Mongo cuối cùng. Suite default skip nếu thiếu URI, nhưng lệnh nghiệm thu bắt buộc env tồn tại và số test chạy >0.
- [x] Run Mongo disposable (nếu tên/port đã có thì dùng tên/port khác, không stop container không do task tạo):

```bash
docker run --detach --rm --name orbit-mcp-phase2-mongo -p 127.0.0.1:27028:27017 mongo:7
docker exec orbit-mcp-phase2-mongo mongosh --quiet --eval 'db.adminCommand({ping:1})'
# Từ backend:
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27028/ pnpm run test:mcp:integration
```

- [x] Implement native smoke: URL loopback only, token lấy env, kết nối/list tools/call ba list và nếu tasks có row thì get task đầu; nếu empty ghi rõ get tool chưa smoke và yêu cầu fixture có task để nghiệm thu. In tool names/pass-fail/count, không in data/token. finally client.close. Không lấy token qua command argument.
- [x] Runbook mô tả tạo tài khoản/fixture local, lấy access token bằng login hiện hữu, nhập qua prompt kín hoặc Inspector header field; expiry thì login lại và reconnect. Lệnh chạy backend:

```bash
MCP_ENABLED=true HOST=127.0.0.1 NODE_ENV=development pnpm run dev
# Terminal khác, backend directory; token được cấp qua environment an toàn:
pnpm run mcp:smoke
pnpm view @modelcontextprotocol/inspector version
```

Inspector baseline `2.11.0` đã xác minh tồn tại trên registry khi soạn plan; chạy `pnpm dlx @modelcontextprotocol/inspector@2.11.0` và ghi kết quả tương thích thực vào runbook. Chọn Streamable HTTP, URL `/mcp`, Authorization Bearer; thêm chính xác loopback Origin vào MCP_ALLOWED_ORIGINS nếu mode Inspector gửi Origin, restart server. Giữ auth của Inspector proxy theo default; không disable bảo vệ proxy.

- [x] Inspector: initialize, list tools, gọi cả bốn với user fixture; foreign task trả NOT_FOUND; token hết hạn bị401. Ghi exact SDK/Inspector/Node versions, protocol negotiated, ngày, các cases pass/fail; không screenshot chứa token. Nếu UI Inspector không truy cập được, ghi P2-11 chưa nghiệm thu, không tuyên bố phase2 complete chỉ dựa SDK tests.
- [x] Giữ container disposable tới hết regression task 7; database riêng của mỗi suite đã drop từ teardown. Nếu phải dừng sớm, tạo lại container trước chạy regression.

## Task 7 — Regression, đối chiếu spec và bàn giao

**Files:** runbook, roadmap, spec và plan này (trạng thái/nhật ký).

- [x] Chạy từ backend `pnpm run build && pnpm test`; chạy integration thật task6 với URI được set; chạy phase1 Mongo regression `ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27028/ pnpm exec vitest run services/test/taskService.getAll.integration.test.ts` trước khi stop container.
- [x] Sau các suite Mongo, dọn container do task tạo: `docker stop orbit-mcp-phase2-mongo`. Không xóa dữ liệu demo/user local khác.
- [x] Từ frontend chạy `pnpm run lint && pnpm run build`; chỉ báo warning đã có, không refactor frontend.
- [x] `git diff --check`; inspect thay đổi để xác nhận chỉ backend MCP/service read method/docs/lockfile, không `.env`, production URI, token hoặc file generated.
- [x] Kiểm tra coverage: P2-01/02/04/09 → task5; P2-03 → task1+6; P2-05/06/10 → task6; P2-07/08 → task3+4+6; P2-11 → task6. Không đánh dấu complete khi integration skip hoặc Inspector chưa chạy.
- [x] Cập nhật roadmap status phase2, spec status, checklist/nhật ký exact commands/result và giới hạn còn lại. Bàn giao phase3: OAuth remote, admin scope, nâng SDK/protocol, DB-level paging project/category trước production.

Các task 1–6 là đơn vị review độc lập sau mỗi chu kỳ test. Nếu tạo commit, chỉ stage file thuộc task đang hoàn tất, giữ nguyên thay đổi có sẵn của người dùng; không commit secret hoặc gom unrelated work.

## Kiểm tra khi soạn tài liệu

Ngày 2026-10-16: `pnpm view @modelcontextprotocol/sdk@1.32.1 version engines peerDependencies` xác nhận version 1.32.1, Node >=18 và Zod ^3.25 hoặc ^4.0; `pnpm view @modelcontextprotocol/inspector version` trả 2.11.0. Đây chỉ là kiểm tra registry, chưa cài SDK hoặc thực hiện handshake. Liên kết tài liệu nội bộ và `git diff --check` đã pass; không chạy build/test vì chỉ sửa Markdown.

## Nhật ký triển khai — 2026-10-16

- Hoàn thành task 1–7 trực tiếp trên nhánh `feat/mcp-server`, không tạo commit và không triển khai public.
- SDK 1.32.1 được pin exact. Node chạy nghiệm thu: 22.20.0; pnpm 11.21.0; Zod hiện có 4.3.5. Compatibility test xác nhận strict Zod4 input, structuredContent và isError không cần success output schema.
- Các test config, read-by-ID, schemas/DTO/errors, tool factory và HTTP router được chạy RED trước implementation rồi GREEN. Không thay `taskService.getById` hoặc mutation REST.
- `pnpm run build` pass. `ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27028/ pnpm test`: **18 suites, 142 tests pass, 0 skipped**, gồm 8 MCP integration và 7 phase1 regression trên MongoDB thật.
- `pnpm run test:mcp:integration` với URI disposable: 8/8 pass. Test concurrent có rendezvous sau JWT auth thật; không mock service/repository để chứng minh cách ly dữ liệu/count. Snapshot collections trước/sau xác nhận read tools không ghi dữ liệu.
- `pnpm run mcp:smoke`: bốn tools pass trên app thật với fixture local; negotiated protocol 2025-11-25.
- Inspector **2.11.0 Web UI** chạy với Chrome headless riêng, điều khiển bằng Playwright ngoài dependency repo: handshake, tools/list và cả bốn tools pass; UI trả NOT_FOUND cho task absent và foreign; token expired nhận HTTP401. Inspector tự thử OAuth discovery/registration sau401 và nhận404 — đúng phạm vi phase2 chưa có OAuth.
- Frontend `pnpm run lint && pnpm run build` pass. Cảnh báo có sẵn: ErrorPage.jsx vừa static vừa dynamic import, không được tách chunk.
- `pnpm install --frozen-lockfile --offline` pass. pnpm tái định dạng lockfile; so sánh YAML cho thấy **0 existing package records bị đổi**, thêm23 package records. Không chỉnh lockfile bằng tay.
- `git diff --check` pass. Không sửa `.env` thực. Thêm exception cuối `backend/.gitignore` vì `.env*` đã vô hiệu exception `.env.example` cũ; template chỉ chứa giá trị mẫu và nay được đưa vào thay đổi có thể review.
- Bổ sung guard hai JWT secrets khác nhau khi MCP bật: access/refresh token hiện không có claim phân biệt loại; guard đảm bảo refresh token không thể được chấp nhận do cấu hình dùng chung secret. Spec/runbook đã cập nhật.
- Disabled `/mcp` dùng Express responder404 nhẹ, không tạo MCP server/transport và không gọi readiness. Đây là cách thực thi yêu cầu route tắt nằm trước readiness.
- Dọn database disposable, server fixture, Inspector, browser profile và file token tạm; xác minh không còn database `orbit_mcp_phase2_test_*` trước khi stop container do task tạo.

Tài liệu vận hành: [Local development](../../mcp/local-development.md). Giới hạn còn lại đúng spec: chỉ local/USER, OAuth và SDK/protocol upgrade thuộc phase3; project/category pagination còn in-memory. Chưa triển khai phase3.
