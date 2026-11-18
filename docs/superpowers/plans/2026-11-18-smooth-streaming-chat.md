# Kế hoạch triển khai: Tối ưu độ mượt Streaming Chat (Smooth Resumable Chat Streaming)

Tham chiếu đặc tả: [docs/superpowers/specs/2026-11-18-smooth-streaming-chat.md](file:///home/bonxom/Code/TodoApp/docs/superpowers/specs/2026-11-18-smooth-streaming-chat.md)

## Mục tiêu
Loại bỏ hoàn toàn cảm giác giật cục khi streaming chat bằng cách:
1. Đẩy token tức thì qua In-Memory Bus thay vì poll MongoDB mỗi 500ms.
2. Micro-batch text deltas trước khi ghi MongoDB để giải phóng nghẽn transaction.
3. Hợp nhất dispatch và render trên Frontend qua `requestAnimationFrame`.
4. Memoize `MarkdownText` và các bubble tin nhắn trong `ChatField`.

---

## Danh sách công việc (Ordered Tasks)

### Task 1: Xây dựng In-Memory Bus `chatStreamBus`
- **File:** `backend/services/chatStreamBus.ts`
- **Nhiệm vụ:**
  - Tạo `chatStreamBus` dùng Node.js `EventEmitter` (hoặc `Set` callback theo `turnId`).
  - Hỗ trợ phương thức `publish(turnId: string, event: ChatStreamEvent): void`.
  - Hỗ trợ phương thức `waitForNext(turnId: string, timeoutMs: number, signal: AbortSignal): Promise<boolean>`.
  - Dọn dẹp listener tự động khi timeout, abort hoặc turn kết thúc để tránh memory leak.

### Task 2: Live Memory Store trong `chatStreamBus`
- **File:** `backend/services/chatStreamBus.ts`
- **Nhiệm vụ:**
  - Bổ sung quản lý `LiveTurnState` trong RAM (`partialResponse`, `lastEventSeq`, `toolProgress`, `events`).
  - Cung cấp `initLiveTurn()`, `emitLiveEvent()`, `getLiveSnapshot()`, `getLiveEvents()`, `finishLiveTurn()`.
  - Khi có event mới, cập nhật RAM và emit event tới subscriber SSE ngay lập tức với 0 I/O delay.

### Task 3: Chuyển đổi `chatRunService` và Repository sang Zero-DB Streaming
- **Files:**
  - `backend/services/chatRunService.ts`
  - `backend/repositories/chatStreamRepository.ts`
- **Nhiệm vụ:**
  - `chatRunService.emit`: gọi `chatStreamBus.emitLiveEvent()` thay vì gọi `chatStreamRepository.append()`.
  - `chatStreamRepository.getSnapshot` và `readEvents`: ưu tiên đọc từ RAM nếu turn đang active.
  - Khi turn hoàn tất/kết thúc: `chatStreamRepository.finishInSession` nhận chuỗi kết quả hoàn chỉnh từ RAM và lưu vào MongoDB trong **đúng 1 transaction duy nhất**.

### Task 4: Viết Test Backend cho Bus & Micro-batching
- **Files:**
  - `backend/services/test/chatStreamBus.test.ts`
  - `backend/services/test/chatEventStreamService.test.ts`
- **Nhiệm vụ:**
  - Kiểm tra `waitForNext` thức dậy ngay khi có publish (< 15ms).
  - Kiểm tra không rò rỉ listener sau khi client ngắt kết nối.
  - Chạy `pnpm test` trong backend để đảm bảo không hồi quy 67 test suite hiện có.

### Task 5: Hợp nhất Action trong Reducer (Frontend)
- **Files:**
  - `frontend/src/features/tasks/hooks/chatStreamReducer.ts`
  - `frontend/src/features/tasks/hooks/useChatRunStream.ts`
- **Nhiệm vụ:**
  - Trong `chatStreamReducer.ts`, action `EVENT` tự động gán `reconnectAttempts: 0` và `connection: { status: "connected" }`.
  - Trong `useChatRunStream.ts`, thay vì 3 lần gọi `apply()`, chỉ gọi 1 lần `apply({ type: "EVENT", event })`.

### Task 6: Điều phối Render Text Streaming qua `requestAnimationFrame`
- **Files:**
  - `frontend/src/features/tasks/hooks/useChatRunStream.ts` hoặc `frontend/src/features/tasks/hooks/useConversationChat.ts`
- **Nhiệm vụ:**
  - Gom các text delta dồn dập vào buffer tạm và flush vào React state theo nhịp màn hình (`requestAnimationFrame` ~60fps) thay vì re-render 50 lần/giây.

### Task 7: Memoization & Tách biệt Component Render
- **Files:**
  - `frontend/src/features/tasks/components/chat/MarkdownText.jsx`
  - `frontend/src/features/tasks/components/chat/ChatField.jsx`
- **Nhiệm vụ:**
  - Bọc `React.memo` cho `MarkdownText`.
  - Trích xuất component `ChatMessageItem` bọc bởi `React.memo` cho từng phần tử tin nhắn. Tin nhắn cũ không re-render khi tin nhắn streaming đang sinh chữ.
  - Hoist các style tĩnh (`userMessageStyle`, `botMessageStyle`) ra ngoài component hoặc memoize với `useMemo`.
  - Throttle hàm `scrollToBottom` với `requestAnimationFrame` khi đang stream.

### Task 8: Kiểm thử & Hoàn tất
- **Nhiệm vụ:**
  - Chạy `backend/`: `pnpm run build` && `pnpm test`
  - Chạy `frontend/`: `pnpm run lint` && `pnpm run build`
  - Xác nhận streaming mượt mà, không giật, không lỗi typecheck và lint.
