# Tool xóa task

Đã thêm `orbit_delete_task({taskId, idempotencyKey})` cho Agent/MCP có scope tasks:write. Chỉ USER, kiểm tra sở hữu qua taskService, guard execution trước khi ghi. Prompt yêu cầu yêu cầu xóa rõ ràng, tra cứu ID và hỏi lại nếu mục tiêu mơ hồ; không dùng xóa thay cho hoàn thành task.

Xóa + rebuild stats + receipt trong transaction hiện có. Receipt chứa snapshot task và deleted:true. Retry cùng key/arguments không cần đọc task đã biến mất và không xóa lại; khác arguments báo conflict. Receipt được phân vùng theo user. Tool có destructiveHint và idempotentHint.

Activity task_deleted chỉ thành công với marker deleted:true; frontend hiển thị Task deleted và không mở detail task đã mất. Interrupted reply chỉ xác nhận xóa khi tool đã trả bằng chứng. Giữ write gate trên các lượt task_proposal; chat thường vẫn có tool xóa khi A2UI bật.

## Kiểm tra

Backend:

```sh
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27029/ pnpm test
pnpm run build
pnpm run lint
pnpm exec vitest run services/test/agentService.test.ts
```

461 tests passed, 52 files, không skip. MongoDB 7 replica set chạy container tạm riêng, loopback port 27029; kiểm tra delete thật, ownership, retry, stats và rollback khi ghi receipt lỗi. Container và volume kiểm thử đã dọn. Không xóa task người dùng thật.

Frontend:

```sh
pnpm test
pnpm run lint
pnpm run build
```

260 tests passed, 58 files. Lint/build đạt; 13 warning any có sẵn backend, jsdom navigation warning và Vite bundle-size warning có sẵn. Prettier đạt cho các file thuộc phần delete task. Kiểm tra rộng toàn bộ worktree phát hiện AgentPage.tsx (thay đổi có sẵn ngoài task này) chưa đúng format; giữ nguyên file đó. Red tests trước sửa: service delete chưa tồn tại, activity/interrupt chưa nhận delete, UI chưa có nhãn; sau sửa đạt.

Chưa chạy live model với task thật vì đó sẽ là thao tác xóa dữ liệu không cần thiết; luồng tool được kiểm tra qua MCP SDK thật và Mongo tạm. Chưa commit. Các thay đổi vision/avatar và thay đổi khác đang có trong worktree được giữ nguyên.
