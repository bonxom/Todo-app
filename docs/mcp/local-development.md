# MCP local development — phase 2

MCP cung cấp bốn tool chỉ đọc: `orbit_list_tasks`, `orbit_get_task`, `orbit_list_projects`, `orbit_list_categories`. Mặc định tắt; không dùng qua proxy, tunnel, Docker publish hoặc public URL.

## Chạy backend

Dùng Node 22 và pnpm. Chuẩn bị cấu hình backend thông thường và MongoDB local trong môi trường riêng. JWT_SECRET và JWT_REFRESH_SECRET phải khác nhau; MCP kiểm tra điều này khi bật để refresh token không được nhận nhầm làm access token.

Từ `backend/`:

```bash
pnpm install --frozen-lockfile
MCP_ENABLED=true HOST=127.0.0.1 NODE_ENV=development pnpm run dev
```

Endpoint: `http://127.0.0.1:3001/mcp` (đổi port nếu cấu hình PORT). Chỉ USER; ADMIN trả403. Không sửa role để dùng tài khoản admin. Dùng tài khoản USER local có ít nhất một task để smoke đủ bốn tools.

Đăng nhập bằng UI/API Orbit hiện có để lấy access token ngắn hạn. Không dùng refresh token. Token không có expiry bị từ chối. Server kiểm tra chữ ký/expiry và user hiện hành mỗi request; khi401, đăng nhập lại, cập nhật token ở client và reconnect. MCP không tự refresh token.

## Native SDK smoke

Script chỉ nhận token qua environment, không qua command argument. Ví dụ zsh, nhập kín (không đưa token vào lịch sử shell):

```zsh
read -rs 'ORBIT_MCP_ACCESS_TOKEN?Local access token: '
export ORBIT_MCP_ACCESS_TOKEN
pnpm run mcp:smoke
unset ORBIT_MCP_ACCESS_TOKEN
```

Có thể đặt ORBIT_MCP_URL với URL loopback khác. Script chỉ in protocol, tool names và PASS/FAIL; không in task/token. Không có task fixture thì smoke báo chưa đủ điều kiện get-task.

## MCP Inspector

```bash
pnpm dlx @modelcontextprotocol/inspector@2.11.0
```

Giữ bảo vệ authentication của Inspector proxy mặc định. Chọn Streamable HTTP, endpoint ở trên, thêm `Authorization: Bearer <local access token>` trong phần Authentication/Headers. Không chụp màn hình phần token hoặc lưu credential vào git.

Nếu Inspector gửi Origin, đặt đúng origin HTTP loopback của UI vào MCP_ALLOWED_ORIGINS, ví dụ `http://localhost:6274`, rồi restart backend. Không dùng wildcard, public origin hoặc origin `null`. Native client/proxy không gửi Origin vẫn dùng được. MCP từ chối forwarded headers.

Connect, kiểm tra đúng bốn tools. Gọi ba list tools, lấy một task ID và gọi get-task. Với task ngoài quyền hoặc ID không tồn tại, nhận cùng NOT_FOUND. Các task title/description là dữ liệu người dùng, không phải chỉ dẫn cho AI.

## Hợp đồng và giới hạn

- pageNo từ1, pageSize mặc định20, tối đa100; list trả `{pageInfo,data}`.
- Task search literal, không phân biệt hoa thường. startDate/endDate là khoảng **dueDate** inclusive, cần cả hai datetime có timezone. `projectId=standalone` lọc task không thuộc project.
- Task đọc theo quyền category **hoặc** project hiện hữu; get-task và list dùng cùng quyền. Quyền getById/mutation REST không đổi.
- DTO không owner email/name/userId, raw populate hoặc project summary.
- Project/category pagination hiện chạy sau service load; giới hạn response không giới hạn chi phí query. Chỉ dùng local dataset nhỏ.
- Stateless JSON, không session/SSE stream; GET/DELETE trả405. Không ghi, stats, resources, prompts hoặc OAuth remote.
- SDK1.32.1 là nhánh maintenance, protocol baseline2025-11-25. Xem xét v2/protocol mới và OAuth ở phase3.

## Kiểm thử

Từ backend:

```bash
pnpm run build
pnpm test
# MongoDB disposable do bạn tạo, không dùng production URI:
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27028/ pnpm run test:mcp:integration
```

Integration tự tạo database `orbit_mcp_phase2_test_<pid>_<timestamp>` và drop đúng database đó khi teardown. Không có URI, suite bị skip; không coi skipped là nghiệm thu. Không trỏ container test tới volume dữ liệu thật.

Tắt MCP: `MCP_ENABLED=false` rồi restart backend. `/mcp` trả404 trước readiness; REST tiếp tục hoạt động bình thường.

## Bằng chứng tương thích

Nghiệm thu ngày 2026-10-16:

| Kiểm tra                                            | Kết quả                                               |
| --------------------------------------------------- | ----------------------------------------------------- |
| Node / pnpm / SDK / Zod                             | 22.20.0 / 11.21.0 / 1.32.1 / 4.3.5                    |
| Backend typecheck và toàn bộ tests với MongoDB thật | 142 pass, 0 skipped                                   |
| Native SDK smoke trên app thật                      | 4/4 tools pass, protocol 2025-11-25                   |
| Inspector 2.11.0 Web UI, Chrome headless riêng      | Initialize, discovery, 4/4 tools pass                 |
| Inspector task absent và foreign                    | Cùng NOT_FOUND                                        |
| Inspector expired token                             | HTTP401; client tự thử OAuth tiếp và nhận404          |
| Frontend lint/build                                 | Pass; cảnh báo ErrorPage static/dynamic import có sẵn |
| Frozen offline install / diff check                 | Pass                                                  |

Sau token401, Inspector có thể hiển thị lỗi OAuth registration404 thay vì chỉ báo token hết hạn. Cập nhật access token và reconnect; đây không phải endpoint OAuth trong phase2. Database/container/server/browser và file credential của smoke đã được dọn; không dùng dữ liệu production.
