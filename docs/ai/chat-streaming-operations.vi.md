# Hướng dẫn Vận hành Tính năng Chat Streaming (Resumable Streaming Run)

Tài liệu này cung cấp hướng dẫn vận hành, giám sát, khắc phục sự cố và quy trình rollback cho hệ thống streaming hội thoại AI theo đặc tả `docs/superpowers/specs/2026-11-18-chat-streaming.md`.

---

## 1. Kiến trúc Hệ thống & Bất biến (System Architecture & Invariants)

### 1.1 Single-Process Architecture

- Backend Node.js chạy theo mô hình **single-process per deployment** (1 instance).
- Broadcast SSE stream và quản lý bộ nhớ đệm sự kiện (event buffer) diễn ra in-memory thông qua `ChatStreamBroadcaster` kết hợp lưu trữ snapshot và event log trên MongoDB.
- Mọi kết nối SSE client (`GET /api/ai/conversations/:id/turns/:turnId/events`) kết nối trực tiếp hoặc qua Nginx reverse proxy đến tiến trình này.
- Khi triển khai đa container/cluster trong tương lai, cần bổ sung distributed pub/sub (Redis Streams / RabbitMQ); hiện tại **bắt buộc duy trì 1 active backend container**.

### 1.2 Giới hạn Tài nguyên & Quota

- **Giới hạn đồng thời toàn tài khoản**: Tối đa **3 active runs** cùng lúc trên toàn bộ tài khoản người dùng (`MAX_USER_CONCURRENT_RUNS = 3`). Khi vượt quá, server từ chối ngay với HTTP 429 `CHAT_CONCURRENCY_LIMIT`.
- **Giới hạn hội thoại**: Tối đa **1 active run** trên một hội thoại (`MAX_CONVERSATION_RUNS = 1`). Yêu cầu gửi thêm vào hội thoại đang chạy sẽ nhận HTTP 409 `CONVERSATION_BUSY`.
- **Hạn chót xử lý (Run Deadline)**: Mỗi lượt chat turn có thời hạn tối đa **300 giây (5 phút)**. Sau thời gian này, background task tự động hủy provider call và đánh dấu turn là `timed_out`.
- **Giới hạn bộ đệm sự kiện**:
  - `MAX_EVENT_LOG_SIZE = 1000`: Tối đa 1000 sự kiện được lưu trong một turn.
  - Snapshot định kỳ được lưu vào collection `ChatTurn` sau mỗi batch sự kiện (300ms) để hỗ trợ khôi phục tức thì.

### 1.3 Yêu cầu MongoDB Replica Set

- Cơ chế quản lý slot chạy (`ChatRunSlot`) và cập nhật trạng thái turn yêu cầu hỗ trợ **MongoDB Multi-Document Transactions**.
- Do đó, MongoDB bắt buộc phải được cấu hình ở chế độ **Replica Set** (tối thiểu `rs0`). Môi trường standalone đơn lẻ không có replica set sẽ không thực hiện được giao dịch admission và recovery.

---

## 2. Cấu hình Nginx Reverse Proxy

Nginx cần cấu hình bypass buffering, caching và gzip cho endpoint SSE:

```nginx
location ^~ /api/ {
  # SSE streaming events endpoint without proxy buffering / caching / gzip
  location ~* /api/ai/conversations/[^/]+/turns/[^/]+/events$ {
    proxy_pass http://backend:4000;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 600s;
    gzip off;
    chunked_transfer_encoding on;
  }

  client_max_body_size 11m;
  proxy_read_timeout 600s;
  proxy_pass http://backend:4000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Kiểm tra cú pháp Nginx:

```bash
docker run --rm --add-host backend:127.0.0.1 -v $(pwd)/frontend/nginx.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine nginx -t
```

---

## 3. Khởi động, Tắt êm và Phục hồi sự cố (Lifecycle & Recovery)

### 3.1 Khởi động và Tự động phục hồi Run gián đoạn

Khi tiến trình backend khởi động (`ensureAppReady()`):

1. Kết nối MongoDB và khởi tạo indexes cho `ChatRunSlot`, `ChatTurn`, `ChatTurnEvent`.
2. Hàm `recoverInterruptedRuns()` tự động quét tất cả các turn ở trạng thái `processing` hoặc `stopping`.
3. Chuyển trạng thái các turn gián đoạn sang `interrupted` với lý do `Server restarted while turn was active`.
4. Các tool call đang ở trạng thái `started` được đánh dấu thành `unknown`.
5. Thu hồi toàn bộ slot trong `ChatRunSlot`, giải phóng quota cho người dùng tiếp tục chat.

### 3.2 Tắt êm (Graceful Shutdown)

Khi nhận tín hiệu `SIGTERM` hoặc `SIGINT`:

1. Ngừng chấp nhận request `POST /api/ai/conversations/:id/turns` mới.
2. Phát tín hiệu `AbortController` tới các AI provider stream đang hoạt động.
3. Đợi các turn hoàn tất ghi trạng thái cuối (hoặc timeout 10 giây).
4. Đóng kết nối MongoDB an toàn.

---

## 4. Kiểm tra Vận hành (Smoke Test Runbook)

### 4.1 Kiểm tra Streaming bằng cURL

Sử dụng cURL không đệm (`--no-buffer`) để kiểm tra nhận delta và heartbeat thời gian thực:

```bash
# 1. Khởi tạo một turn mới
RESPONSE=$(curl -s -X POST http://localhost:3001/api/ai/conversations/<CONVERSATION_ID>/turns \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"userInput": "Chào bạn, hãy phân tích dự án này"}')

TURN_ID=$(echo $RESPONSE | jq -r '.data.turnId')

# 2. Đăng ký nhận stream sự kiện
curl -N -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Accept: text/event-stream" \
  "http://localhost:3001/api/ai/conversations/<CONVERSATION_ID>/turns/$TURN_ID/events?after=0"
```

Kỳ vọng nhận các sự kiện:

- `event: turn.started`
- `event: assistant.delta` (từng đoạn văn bản trả về tức thì)
- `:heartbeat` (mỗi 15 giây nếu không có dữ liệu)
- `event: turn.finished`

### 4.2 Hủy lượt chạy giữa chừng (Cancellation Smoke Test)

```bash
curl -X POST "http://localhost:3001/api/ai/conversations/<CONVERSATION_ID>/turns/$TURN_ID/cancel" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Phản hồi nhận về HTTP 202 với `status: "stopping"` hoặc HTTP 200 `status: "cancelled"`.

---

## 5. Quy trình Rollback An toàn (Rollback Procedure)

Nếu gặp sự cố nghiêm trọng cần quay về phiên bản cũ (trước khi có tính năng chat streaming):

1. **Bước 1: Tạm dừng Admission**
   Chặn hoặc điều hướng request gửi đến `/api/ai/conversations/*/turns` (frontend sẽ tự động fallback sang `/api/ai/chat-mcp` theo cơ chế tương thích ngược).

2. **Bước 2: Thu hồi Slot & Đánh dấu Interrupted**
   Trước khi triển khai mã nguồn cũ, chạy script một lần trên database để giải phóng toàn bộ slot và chuyển các turn dở dang sang trạng thái kết thúc:

   ```js
   db.chatrunslots.deleteMany({});
   db.chatturns.updateMany(
     { status: { $in: ["processing", "stopping"] } },
     { $set: { status: "interrupted", updatedAt: new Date() } },
   );
   ```

3. **Bước 3: Triển khai Binary / Docker image cũ**
   Khởi động lại backend và frontend bằng phiên bản trước. Các endpoint cũ `/api/ai/chat-mcp` và `/api/ai/conversations/:id` tiếp tục phục vụ bình thường từ dữ liệu đã lưu.
