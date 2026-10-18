# Orbit MCP phase 2 — MCP chỉ đọc trên local

Ngày: 2026-10-16. Trạng thái: đã triển khai và nghiệm thu ngày 2026-10-16; xem nhật ký trong implementation plan.

[Roadmap](../plans/2026-10-16-orbit-mcp-roadmap.md) · [Implementation plan](../plans/2026-10-16-orbit-mcp-phase-2.md)

## Mục tiêu và phạm vi

AI client có thể khám phá và gọi bốn tool đọc dữ liệu của người dùng Orbit đã xác thực: `orbit_list_tasks`, `orbit_get_task`, `orbit_list_projects`, `orbit_list_categories`. Điều kiện đầu vào là phase 1 đã hoàn thành: `getAll` kết hợp quyền và filter bằng AND, có kiểm thử MongoDB thật.

Đây là subsystem mới trong backend Express hiện có. Không thêm frontend, OAuth, tool ghi, stats, resources, prompts, subscriptions, legacy HTTP+SSE hoặc deployment public. Dùng access token Orbit qua Authorization cho thử nghiệm local, không tuyên bố tương thích luồng OAuth MCP. Không nhận refresh token, không tự refresh token trong server MCP.

## Các quyết định

| Lựa chọn | Quyết định và lý do |
| --- | --- |
| Adapter cùng backend hoặc process riêng gọi REST | Cùng backend, gọi service trực tiếp; tránh nhân đôi nghiệp vụ và HTTP nội bộ |
| Streamable HTTP stateless hoặc session | Stateless, JSON response; mỗi POST có server/transport/context riêng; không cần kho session |
| Admin đọc toàn hệ thống, giả lập USER, hoặc từ chối | Từ chối ADMIN bằng HTTP 403 trong phase 2; không sửa role hoặc document để giả lập user |
| `getById` hiện tại hoặc read method thống nhất quyền | Thêm `taskService.getReadableById` dùng `buildTaskAccessQuery`; giữ `getById` và quyền mutation REST hiện tại |
| Pagination project/category tại DB hoặc sau service | Paginate sau service cho local MVP; ghi rõ giới hạn bộ nhớ và aggregation bên dưới |

Client nghiệm thu: MCP Inspector `2.11.0` qua Streamable HTTP và SDK Client trong integration test. Chưa cam kết mọi ứng dụng AI hỗ trợ custom Bearer header. Inspector dùng token test ngắn hạn; không đưa token vào URL, tài liệu, git hoặc command argument.

Baseline có chủ đích: `@modelcontextprotocol/sdk@1.32.1`, protocol nghiệm thu `2025-11-25`, Zod 4 hiện có. Nhánh SDK v1 là maintenance và không hỗ trợ protocol 2026-07-28; v2 là stable hiện hành theo README chính thức đã đọc. Chọn baseline này để giữ hợp đồng roadmap và API đã khảo sát, không gọi nó là phiên bản mới nhất. Registry đã xác nhận version 1.32.1 và peer Zod 4 khi soạn tài liệu. Task đầu tiên phải kiểm tra lại package phát hành và handshake trên Node 22/Express 5/Zod 4. Không tự thay bằng latest khi gặp lỗi; cập nhật spec nếu baseline không dùng được. Đánh giá nâng SDK/protocol khi thiết kế phase 3.

## Hiện trạng code ảnh hưởng thiết kế

- `app.ts` hiện đặt CORS, JSON parser và readiness trước routes. `/mcp` cần middleware riêng, đặt trước CORS/parser chung để Origin bị từ chối đúng HTTP 403 và không bị preflight chung nuốt mất.
- `server.ts` mặc định bind `0.0.0.0`; chỉ bật MCP khi cấu hình explicit loopback.
- `middlewares/auth.ts::protect` kiểm tra chữ ký/expiry với JWT_SECRET, lấy user hiện hành từ DB và đặt `req.user`.
- Task không có owner trực tiếp. List cho quyền theo category OR project. `getById` hiện dùng ownership khác; không thay đổi các caller REST/mutation trong phase này.
- Repository populate owner name/email. Không serialize nguyên document, kể cả project trả về plain object kèm summary.
- `projectService.getAll` aggregate summary nhưng không ghi DB; `statService.getStats` có ghi nên không đưa vào tool.
- Project/category service trả toàn bộ danh sách. Pagination MCP giới hạn response nhưng chưa giới hạn chi phí đọc/aggregate; chấp nhận chỉ cho local test dataset, cần xử lý trước production.

## Cấu hình và ranh giới HTTP

Biến mới: `MCP_ENABLED=false` mặc định; chỉ chấp nhận chuỗi `true`/`false`. `MCP_ALLOWED_ORIGINS` mặc định rỗng, khi đặt là danh sách origin HTTP loopback chính xác, phân cách dấu phẩy, ví dụ `http://localhost:6274` cho Inspector nếu request có Origin. Không wildcard, không `null`, không public domain, không path/query/fragment hoặc userinfo. Không dùng chung allowlist web.

Khi bật: yêu cầu `NODE_ENV=development` hoặc `test`, `HOST=127.0.0.1`, không có `VERCEL`; JWT_SECRET và JWT_REFRESH_SECRET phải khác nhau khi cả hai được cấu hình để phân biệt access/refresh token. Cấu hình sai làm startup fail trước listen và cũng bị kiểm tra tại mount khi import app. Khi tắt, không tạo MCP server/transport; Express router chỉ đặt responder 404 riêng cho `/mcp` trước readiness để request trả 404 và không gọi readiness/DB cho route này. Không thay default HOST của REST khi MCP tắt.

Chuỗi xử lý riêng: enabled check → Host/socket/forwarded-header/Origin guard → OPTIONS → readiness → Bearer auth → role guard → JSON parser 100 KiB → transport → MCP error middleware. Chỉ chấp nhận socket loopback (kể cả `::1`, `::ffff:127.0.0.1`), Host `127.0.0.1` hoặc `localhost` với port cấu hình; bỏ qua mọi suy luận từ proxy và từ chối `Forwarded`, `X-Forwarded-For`, `X-Forwarded-Host`, `X-Forwarded-Proto`. Không expose qua tunnel/proxy trong phase 2.

Origin vắng mặt được chấp nhận cho native client; có mặt phải trùng allowlist, nếu không trả 403. OPTIONS không cần Bearer, nhưng vẫn kiểm tra network/Origin; trả 204 với methods POST, GET, DELETE, OPTIONS và allowed headers Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id. Echo đúng origin đã cho phép, `Vary: Origin`, không cookie credentials. Các response MCP không cache (`Cache-Control: no-store`).

| Request sau các guard | Kết quả |
| --- | --- |
| POST initialize, notification, tools/list, tools/call | SDK xử lý JSON-RPC; notification hợp lệ 202; request hợp lệ JSON response |
| GET hoặc DELETE có auth hợp lệ | 405, `Allow: POST, OPTIONS`; không SSE session |
| Method khác | 405 sau guard/auth; HEAD không vô tình chạy GET handler |
| Token thiếu/sai/hết hạn/user đã xóa | 401, `WWW-Authenticate: Bearer`; không tạo server/tool context |
| ADMIN | 403 trên mọi protocol operation |
| JSON sai hoặc payload quá lớn | 400 hoặc 413; không trả stack/body đầu vào |
| Protocol/header/media không hợp lệ | SDK quyết định response chuẩn; kiểm thử version không hỗ trợ, Accept thiếu, Content-Type sai |
| Readiness thất bại | 503 đã sanitize, không chạy tool |

Tái sử dụng `protect` trong MCP router, thêm kiểm tra token đã xác thực phải có `exp` hữu hạn trong tương lai (JWT decode chỉ sau protect, không dùng decode để xác thực). Chỉ Bearer header, không token query/body. Context đóng trong closure của từng request; không cache user/token hoặc dùng mutable singleton server. Token hết hạn giữa các request bị từ chối ở request kế tiếp; request đang thực thi dùng identity đã xác thực lúc nhận.

Tạo `McpServer({name: 'orbit-mcp-server', version: '0.1.0'})`, đăng ký bốn tool và nối `StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true})`. Đăng ký cleanup trước `handleRequest`; finish/close/error đều cleanup idempotent, không unhandled rejection. Không đóng transport trước khi response hoàn tất, không log token/raw arguments/result.

## Quyền đọc và service

`taskService.getReadableById(id, user): Promise<ITaskDocument>` xây `{ $and: [await buildTaskAccessQuery(user), {_id: id}] }`, gọi `taskRepository.findPaginated(query, {skip: 0, limit: 1, sort: {_id: 1}})`. Không có row trả `TASK_ERROR.NOT_FOUND`. Dùng repository hiện có để query quyền trong DB; không fetch toàn bộ list rồi tìm ID. Không đổi `getById`, `verifyOwnership`, mutation hoặc quy tắc OR đã nghiệm thu.

Task category B/project A vẫn đọc được bởi A theo quy tắc OR hiện hành; task không có cả category/project không thuộc user nào. Test rõ cross-owner, dangling/null reference và admin REST vẫn giữ nguyên. MCP từ chối admin trước service. Đây là đồng nhất hai read tool MCP, không phải audit lại mô hình ownership toàn ứng dụng.

Project/category gọi `getAll(user)` rồi sắp xếp `_id` tăng dần, tính count và slice page. Quyền vẫn nằm trong service. Handler không import model/repository. Task DTO chỉ chứa reference ID, không chứa tên/email của category/project owner khác.

## Hợp đồng tool

Input đều strict object: field lạ, `userId`, `role`, object chứa Mongo operator bị từ chối trước gọi service. Number JSON thực, không coerce chuỗi. ObjectId là 24 ký tự hex. Schema và description dùng tiếng Anh để client dễ khám phá; tài liệu hướng dẫn dùng tiếng Việt.

| Tool | Input | Output thành công |
| --- | --- | --- |
| `orbit_list_tasks` | pageNo, pageSize, search, status, projectId, startDate, endDate, sort | `{pageInfo, data: TaskDto[]}` |
| `orbit_get_task` | `{taskId: ObjectId}` | `{task: TaskDto}` |
| `orbit_list_projects` | pageNo, pageSize | `{pageInfo, data: ProjectDto[]}` |
| `orbit_list_categories` | pageNo, pageSize | `{pageInfo, data: CategoryDto[]}` |

- pageNo integer 1..100000, default 1; pageSize integer 1..100, default 20. pageInfo giữ `{pageNo,pageSize,totalCount,totalPage}`; rỗng totalCount/totalPage bằng 0, trang vượt giới hạn trả data rỗng và count thực.
- search tối đa 200 ký tự, trim, tìm literal title/description không phân biệt hoa thường như service; search trắng không filter.
- status: `pending | in-progress | completed | given-up`.
- projectId: ObjectId hoặc `standalone`; không nhận null/chuỗi rỗng.
- startDate/endDate phải đi cùng nhau, RFC3339 datetime có `Z` hoặc offset, start ≤ end. Đây là khoảng **dueDate** inclusive; không phải lọc field startDate. Không nhận date-only hoặc giờ thiếu timezone, không đổi sang timezone máy chủ. Task không dueDate không khớp khoảng.
- sort enum: `dueDate:asc`, `dueDate:desc`, `createdAt:asc`, `createdAt:desc`, `title:asc`, `title:desc`; default bỏ trống để giữ `{dueDate:1,createdAt:-1}` của service. Không nhận raw Mongo field/path. Paging không phải snapshot; thứ tự đồng hạng có thể thay đổi khi dữ liệu đổi.

DTO whitelist (tất cả key bên dưới luôn có):

```typescript
type TaskDto = {
  id: string; title: string; description: string | null;
  status: 'pending' | 'in-progress' | 'completed' | 'given-up';
  priority: 'Low' | 'Medium' | 'High';
  categoryId: string | null; projectId: string | null;
  startDate: string | null; dueDate: string | null; completedAt: string | null;
  createdAt: string; updatedAt: string;
};
type ProjectDto = {
  id: string; name: string; description: string | null;
  color: string; status: 'active' | 'completed';
};
type CategoryDto = { id: string; name: string; description: string | null };
```

Date hợp lệ chuyển ISO UTC; date optional thiếu/null thành null. Date bắt buộc bị hỏng hoặc enum ngoài contract trả INTERNAL_ERROR, không âm thầm sửa dữ liệu. Reference populated lấy `_id`, reference ObjectId lấy string, missing/null thành null. Không `_id`, `__v`, userId, email, password, summary, virtual `isOverDue`, hoặc raw populate. Không cắt nội dung im lặng.

Mỗi tool có inputSchema/outputSchema, mô tả filter/paging/quyền, annotations `readOnlyHint:true`, `destructiveHint:false`, `idempotentHint:true`, `openWorldHint:false`. Output hợp lệ có `structuredContent` và một text content JSON cùng dữ liệu. Dữ liệu title/description là nội dung người dùng, không được mô tả như chỉ dẫn cho AI.

## Lỗi

Lỗi auth/transport nằm ở HTTP/protocol, không trả envelope REST từ error handler chung. Unknown tool/protocol message do SDK xử lý. Invalid arguments trả lỗi validation theo SDK baseline, không gọi service; chốt mã/shape thực bằng test compatibility.

Lỗi lúc thực thi tool có `isError:true` và text JSON `{error:{code,message,retryable}}`; không structuredContent thành công giả. `NOT_FOUND` gộp absent/không có quyền: “Task not found or not accessible.”, retryable false. Domain INVALID_PAYLOAD thành INVALID_ARGUMENT, false. DB unavailable thành SERVICE_UNAVAILABLE, true; mọi exception còn lại INTERNAL_ERROR, true với message cố định. Không trả stack, cause, query, DB URI, raw exception hoặc tên/email user. Logger chỉ ghi requestId/tool/error code, không raw payload. Output schema chỉ áp dụng kết quả thành công; phải test SDK chấp nhận error result không theo success schema.

## Ma trận nghiệm thu

| ID | Kiểm chứng bắt buộc |
| --- | --- |
| P2-01 | Disabled 404; enabled+HOST/public NODE_ENV/VERCEL sai fail startup; REST không đổi khi disabled |
| P2-02 | Origin/Host/socket/forwarded guard, native không Origin, preflight và CORS actual response |
| P2-03 | initialize → initialized → tools/list → tools/call trên SDK client thật; đúng 4 tools, protocol 2025-11-25, không session ID |
| P2-04 | Thiếu/sai/hết hạn/no-exp/refresh token/user xóa → 401; admin → 403; JWT_SECRET và JWT_REFRESH_SECRET fixture khác nhau |
| P2-05 | Hai client A/B gọi đồng thời có barrier để overlap; dữ liệu và totalCount chỉ trong quyền, không lẫn context |
| P2-06 | getReadableById trên Mongo thật: own category, own project, cross-owner OR, foreign, orphan, dangling reference; REST getById/mutation không đổi |
| P2-07 | Strict schema, ID/operator injection, paging giới hạn, ngày/offset, search literal, status/project/sort và trang rỗng |
| P2-08 | DTO cả populated/raw/null; schema output; không owner email/name/summary; error sanitize cả text/structuredContent |
| P2-09 | GET/DELETE/HEAD 405; JSON hỏng, oversized body, unsupported protocol, Accept/Content-Type sai; cleanup success/error/disconnect |
| P2-10 | Project/category paging/count/không lẫn user; tool không ghi dữ liệu hoặc gọi stats mutation |
| P2-11 | Inspector smoke cả bốn tools; ghi exact Inspector version và protocol negotiated, không ghi credential |

Unit test kiểm tra schema/DTO/error/config, HTTP test dùng supertest, integration dùng SDK Client qua listener ephemeral trên loopback và MongoDB disposable. Không coi test mocked hoặc suite skipped là bằng chứng cách ly DB. Database tên riêng `orbit_mcp_phase2_test_<pid>_<timestamp>`, chỉ nhận URI loopback; teardown drop đúng DB test và đóng client/server/transport/Mongoose trong finally.

## Điều kiện hoàn thành và ràng buộc

- Node 22; pnpm trong backend/frontend riêng; TypeScript strict NodeNext, relative import `.js`.
- Pin SDK `1.32.1` exact; dùng Zod 4 hiện có; không root workspace, không chỉnh lockfile bằng tay.
- Không sửa `.env` thật, dữ liệu production, schema MongoDB, frontend hoặc semantics REST hiện tại.
- P2-01..P2-11 pass; backend build/test và Mongo integration thật pass; frontend lint/build kiểm tra regression theo quy ước repo.
- README local có cấu hình, token expiry/reconnect, Inspector và rollback bằng `MCP_ENABLED=false` + restart; không proxy `/mcp` trong Docker/nginx/Vercel.
- Phase 3 chỉ bắt đầu sau ghi nhận compatibility thực, test không lẫn user và bàn giao giới hạn v1/2025-11-25 + pagination in-memory + admin bị từ chối.

## Nguồn tham chiếu

Các quyết định cấu hình, tool, DTO và giới hạn là thiết kế riêng cho Orbit. Đã đọc ngày 2026-10-16:

- [MCP transport 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports): HTTP methods, Origin, loopback và version negotiation.
- [MCP tools 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/tools): schemas, structured output, annotations và lỗi tool.
- [SDK v1 README](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/README.md): maintenance baseline và giới hạn protocol.
- [SDK v1 package](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/package.json): version 1.32.1, Zod 4 compatibility; xác minh registry khi thực thi.
- [Stateless server example](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/src/examples/server/simpleStatelessStreamableHttp.ts): lifecycle server/transport theo request.

## Kết quả nghiệm thu

P2-01..P2-11 đã kiểm chứng: 142 backend tests pass khi bật Mongo integration, native SDK smoke và Inspector 2.11.0 Web UI gọi đủ bốn tools. Token expired trả401; Inspector thử OAuth tiếp và nhận404 do phase2 chưa cung cấp OAuth. Chi tiết và lệnh nằm trong implementation plan và [runbook](../../mcp/local-development.md).
