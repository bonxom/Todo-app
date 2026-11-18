# Đặc tả: Tối ưu độ mượt Streaming Chat (Smooth Resumable Chat Streaming)

Ngày: 2026-11-18.  
Trạng thái: Đang soạn thảo - Chờ duyệt trước khi triển khai.

## 1. Bối cảnh và Vấn đề (Problem Statement)

Tính năng streaming chat có lưu tiến độ (`feat/stream-chat-statistic`) đã chạy ổn định về mặt dữ liệu và phục hồi khi ngắt kết nối. Tuy nhiên, trải nghiệm thị giác khi chat bị giật cục rõ rệt do 4 nút thắt (bottlenecks) chính:

1. **Backend SSE Polling 500ms:**  
   `chatEventStreamService.ts` dựa vào polling `readEvents()` mỗi 500ms (`pollIntervalMs = 500`). Khi không có event mới, tiến trình sleep 500ms. Kết quả là text xuất hiện theo từng cụm ngắt quãng thay vì chạy mượt theo thời gian thực.
2. **Backend Transaction mỗi token:**  
   `readAiStream` await `onText`, gọi trực tiếp qua `chatRunService.emit` -> `chatStreamRepository.append()`. Mỗi token kích hoạt 1 transaction MongoDB riêng biệt (`findOne` + lock + `turn.save` + `ChatTurnEvent.create`). Điều này gây nghẽn throughput đọc từ LLM và gia tăng latency (5-50ms/token).
3. **Frontend 3 Dispatch / 1 Event:**  
   Trong `useChatRunStream.ts`, mỗi event SSE gọi 3 lần `apply()` độc lập (`EVENT`, `SET_RECONNECT_ATTEMPTS`, `SET_CONNECTION`). Vì chạy trong vòng lặp bất đồng bộ của `ReadableStream` (ngoài Synthetic Event của React), React không batch tự động, dẫn tới nguy cơ 3 lần re-render per chunk.
4. **Frontend Thiếu Memoization & Full Markdown Re-parse:**  
   - `MarkdownText.jsx` không có `React.memo`, mỗi chunk text dài dần đều bị `split('\n')` và chạy qua hàng chục biểu thức chính quy (regex) từ đầu đến cuối.
   - Toàn bộ danh sách tin nhắn trong `ChatField.jsx` re-render do reference mảng `messages` và `streamingMessage` thay đổi liên tục; các bubble tin nhắn cũ không được memoize.

---

## 2. Mục tiêu & Tiêu chí chấp nhận (Acceptance Criteria)

### A. Backend: Push tức thì qua In-Memory Bus
- [x] Tạo `chatStreamBus` (dựa trên Node.js `EventEmitter` nội bộ trong tiến trình backend).
- [x] Khi `chatStreamRepository.append()` tạo event thành công (hoặc khi runner phát sinh event), event được broadcast ngay qua `chatStreamBus.emit(turnId, event)`.
- [x] Trong `chatEventStreamService.ts`, thay vì `setTimeout(pollIntervalMs)` cứng 500ms, tiến trình lắng nghe `chatStreamBus.waitForEvent(turnId)` với fallback timeout (heartbeat).
- [x] Ngay khi có event mới, SSE client nhận được frame tức thì (latency < 10ms), giải quyết triệt để nhịp giật 500ms.

### B. Backend: In-Memory Streaming & Single End-of-Turn Persistence (Lưu DB khi hoàn thành)
- [x] Khi LLM sinh token: `emit({ type: "assistant.delta" })` gom text và tăng cursor `seq` hoàn toàn trong RAM của `chatStreamBus`, sau đó broadcast ngay lập tức tới SSE socket của client.
- [x] **ZERO MongoDB transaction/write** trong suốt thời gian LLM đang trả lời.
- [x] Khi lượt chat kết thúc (`turn.finished`), bị dừng (`cancelled`), hết giờ (`timed_out`) hoặc gặp lỗi (`failed`): Thực hiện **1 transaction duy nhất** vào MongoDB để lưu câu trả lời hoàn chỉnh (`response`), snapshot cuối cùng và giải phóng slot.
- [x] Hỗ trợ Replay/Resume từ RAM: Nếu người dùng F5 hoặc mở thêm tab khi AI đang nói dở, hệ thống trả về snapshot và các event dở dang từ RAM mà không cần đọc database.

### C. Frontend: Hợp nhất Action trong Reducer
- [x] Gộp 3 action rời rạc (`EVENT`, `SET_RECONNECT_ATTEMPTS`, `SET_CONNECTION`) thành 1 action duy nhất trong `chatStreamReducer.ts`. Nhận event thành công tự động reset reconnect attempts và xác lập connection status là "connected".
- [x] Giảm số lần dispatch xuống còn đúng 1 lần duy nhất cho mỗi batch event.

### D. Frontend: Điều phối Render qua `requestAnimationFrame`
- [x] Thêm cơ chế batching / scheduling hiển thị text streaming bằng `requestAnimationFrame` (hoặc micro-debounce ~16ms/60fps) để React không bị quá tải khi token đổ về dồn dập.

### E. Frontend: Memoization & Tách biệt Component
- [x] Bọc `React.memo` cho `MarkdownText.jsx`.
- [x] Tách từng bubble tin nhắn thành sub-component `ChatMessageItem` bọc bởi `React.memo`, đảm bảo tin nhắn lịch sử của người dùng và bot không bao giờ re-render khi đang stream tin nhắn mới.
- [x] Hoist hoặc memoize các style object tĩnh (`userMessageStyle`, `botMessageStyle`) trong `ChatField.jsx`.
- [x] Throttle `scrollToBottom` để không gây layout thrashing liên tục.

### F. Tính tương thích & Không phá vỡ hợp đồng
- [x] Format SSE và REST API giữ nguyên 100% (`id`, `event`, `data: { version, turnId, seq, occurredAt, payload }`).
- [x] Khả năng ngắt (`cancel`/stop), khôi phục (`resume`) qua cursor `after`, và phục hồi sau khi restart tiến trình vẫn hoạt động đúng chuẩn.
- [x] Toàn bộ 67 test suite backend hiện tại tiếp tục pass.

---

## 3. Ngoài phạm vi (Non-Goals)
- Không dùng thêm Redis PubSub hay external message broker (vẫn giữ thiết kế single-process VPS/Docker).
- Không thay đổi logic reasoning hoặc sửa đổi cấu trúc prompt AI.
- Không thay đổi giao diện visual tổng thể (vẫn giữ đúng theme Orbit / Liquid Glass).

---

## 4. Rủi ro & Giải pháp phòng ngừa (Risks & Mitigations)
- **Rủi ro mất chữ nếu server crash giữa lúc batching:**  
  *Giải pháp:* Cửa sổ micro-batching chỉ kéo dài tối đa 30-50ms hoặc khi có dấu ngắt đoạn/tool call. Khi turn kết thúc hoặc chuyển sang tool, toàn bộ buffer buộc phải được flush xuống MongoDB trước khi kết thúc transaction.
- **Rủi ro Memory Leak ở EventBus:**  
  *Giải pháp:* Tự động remove listener khi SSE client disconnect, khi turn kết thúc (terminal state), hoặc khi `signal.aborted`.
