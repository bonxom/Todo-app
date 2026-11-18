# Kiểm chứng streaming chat sau review và sửa lỗi

Ngày: 2026-11-18. Worktree: `/home/bonxom/.codex/worktrees/1579/TodoApp`, nhánh `feat/stream-chat-statistic`.

Báo cáo này thay thế kết luận nghiệm thu trước đó. Bộ test mock từng tầng không phát hiện lỗi tại ranh giới runner/finalizer; không thể dùng kết quả của chúng để khẳng định toàn bộ acceptance criteria đã được kiểm chứng.

## Lỗi đã tái hiện và sửa

1. Lượt hoàn tất hoặc provider lỗi không phát `turn.finished`: luồng streaming dùng finalizer riêng, ghi canonical result, terminal event và release slot/lock trong cùng transaction. Runner không gọi finalizer thành công thêm lần nữa.
2. Dừng/timeout bị biến thành completed/failed: lỗi execution truyền lên runner; giữ cancelled/timed_out/interrupted đúng nguyên nhân và giữ partial text đã persist.
3. Streaming mất write tools: controller dùng `createMcpContext(req, ["tasks:write"])` như API cũ.
4. Callback terminal nhận snapshot cũ: reducer ref cập nhật đồng bộ trước khi thông báo session; lấy lại menu/proposal/history và invalidate cache sau terminal.
5. Cursor bị hụt nhưng không replay: abort subscriber cũ và reconnect từ cursor cuối; retry không dùng closure của conversation cũ. Kết quả cancel/reconnect đến trễ bị chặn theo generation.
6. MCP `isError` bị báo succeeded: kiểm tra kết quả thực tế; internal skill tools cũng phát finished để không để spinner chạy mãi.
7. Nhãn terminal biến mất sau reload: history có `turnStatus`; partial response và nhãn được render ở chính message. `finalResult` giữ public menu/proposal/surface nhất quán giữa terminal event và snapshot, không trả internal tool arguments trong interaction.
8. Review bổ sung phát hiện hai race: deadline vượt qua trong transaction tạo proposal phải rollback draft; cancel trả snapshot đã terminal phải đi qua completion notification/cache invalidation.
9. API mới giữ timezone trình duyệt như API chat cũ, tránh đổi nghĩa ngày tương đối sang UTC ngoài ý muốn.

Các regression test đã được chạy đỏ trước khi sửa và chạy lại xanh. Hai integration suite mới giữ service/controller/runner/repository/SDK thật, chỉ thay provider bên ngoài bằng HTTP fixture deterministic hoặc thay agent boundary trong test lifecycle để ép lỗi/race.

## Lệnh kiểm tra và kết quả

Từ `backend/`:

```bash
pnpm test
pnpm run lint
pnpm run build
CHAT_TEST_MONGO_URI='mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true' pnpm run test:chat:integration
pnpm run format:check
```

- `pnpm test`: 574 passed, 120 skipped, 67 files passed. Các suite DB tùy chọn không tự chạy nếu thiếu biến môi trường.
- `test:chat:integration`: chạy riêng trên MongoDB replica set local trong database test sinh tên riêng và được xóa sau test. 23 test đạt trong 4 suite repository/admission/recovery/lifecycle/HTTP streaming.
- `lint`: không có lỗi; 21 warning `no-explicit-any` còn lại trong test/controller có sẵn.
- `build`: TypeScript đạt.
- Format toàn package còn 6 file ngoài phạm vi chưa đúng Prettier: `mcp/resources/skills.ts`, `mcp/routes/mcpRoute.ts`, `services/test/agentSkillService.test.ts`, `skills/registry.ts`, `skills/test/policy.test.ts`, `validations/agentValidation.ts`. File sửa trong task này được check riêng và đạt.

Từ `frontend/`:

```bash
pnpm test
pnpm run lint
pnpm run build
pnpm exec playwright test e2e/chat-streaming.spec.ts e2e/v2-chat-two-modes.spec.ts
pnpm run format:check
```

- `pnpm test`: 529 passed, 100 files passed. Log có cảnh báo jsdom/network của test hiện hữu; không có test thất bại ở lượt cuối.
- `lint`: đạt, không warning.
- `build`: typecheck và bundle đạt; Vite vẫn cảnh báo chunk lớn hơn 500 kB.
- Playwright hai file trên: 12 passed. Đây là E2E với API mock để kiểm tra UI/layout; không dùng làm bằng chứng backend stream thật.
- Format toàn package còn 16 file ngoài phạm vi chưa đúng Prettier. Lỗi format ở `src/shared/services/test/chatStreamService.test.ts` được review chỉ ra đã được sửa. Các file thay đổi được check riêng và đạt.

Format scoped dùng project-local `pnpm exec prettier --check` với danh sách file thay đổi lấy từ `git diff --name-only` và file test mới, tách theo package. `git diff --check` không có lỗi whitespace.

## Bằng chứng tích hợp thật

`services/test/chatStreamingHttp.integration.test.ts` khởi động HTTP provider fixture có gate phần cuối, SDK OpenAI-compatible thật, Express routes/auth thật, runner thật và MongoDB transaction thật:

- Ask và Auto nhận `tool.started`, `tool.finished`, `assistant.delta` trong khi GET snapshot vẫn processing và provider chưa được release.
- Ngắt subscription không hủy runner; release provider, GET nhận completed; reconnect bằng `after` nhận đúng phần còn lại và một terminal event.
- Cancel stream provider đang mở cho kết quả cancelled và giữ nguyên partial text.

`services/test/chatStreamingLifecycle.integration.test.ts` kiểm tra success, cancel, provider error, deadline, menu, proposal và deadline vượt qua bên trong transaction tạo proposal. Assert đúng một terminal event, giữ lịch sử dở, public interaction và rollback proposal khi timeout thắng.

Kiểm tra browser thủ công bằng Chromium/Playwright trên Vite + backend HTTP thật + MongoDB test, không route-mock API:

- Trang `/agent`: thấy partial text và nút Stop trước khi release provider; sau release composer mở khóa, reload vẫn giữ câu trả lời. Bấm Stop giữ text và nhãn Đã dừng.
- Chat cũ `/dashboard`, chat V2 `/v2/dashboard`, trang `/v2/agents`: kiểm tra Ask/Auto, thấy text trước completion và mở khóa composer sau terminal.
- Không có pageerror trong smoke Agent. Ảnh/log của phiên smoke lưu tạm dưới `/tmp/chat-live-*`, không chứa token production. Chỉ dùng token fixture local; database fixture được dọn sau phiên.

## Giới hạn kiểm chứng

Không triển khai production, không gọi model production và không xác nhận nhà cung cấp AI thực tế đang cấu hình có hỗ trợ streaming hay không. Phiên này không dựng lại Docker/Nginx end-to-end hoặc chạy load test. Các tuyên bố Nginx/restart của báo cáo cũ không được tự động chuyển thành PASS mới: recovery đã có integration DB, còn restart tiến trình/container thật cần smoke trên môi trường triển khai.

Kiến trúc vẫn yêu cầu một backend process/container và MongoDB replica set. Không tự scale nhiều runner. Các lỗi format toàn repo ngoài phạm vi được ghi rõ ở trên; không format hàng loạt các file không liên quan.
