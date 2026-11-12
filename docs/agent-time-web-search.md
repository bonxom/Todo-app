# Runbook: Agent Time Context & Web Search

## 1. Giới thiệu

Tài liệu này hướng dẫn vận hành và cấu hình cho hai tính năng của Orbit AI Agent:
1. **Ngữ cảnh thời gian (Agent Time Context)**: Tự động nhận diện thời gian địa phương của người dùng dựa trên IANA time zone từ trình duyệt, tính sẵn các khoảng thời gian thông dụng (`today`, `tomorrow`, `thisWeek`, `nextWeek`, `yesterday`) phục vụ truy vấn nhiệm vụ.
2. **Tìm kiếm web có dẫn nguồn (Web Search)**: Tìm kiếm thông tin công khai qua adapter Brave Search API độc lập và dẫn nguồn an toàn bằng liên kết Markdown `[Nguồn](URL)`.

---

## 2. Cấu hình môi trường

### 2.1 Backend (.env)

| Biến môi trường | Kiểu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `WEB_SEARCH_ENABLED` | boolean (`"true"` / `"false"`) | `false` | Bật/tắt tính năng tìm kiếm web. |
| `BRAVE_SEARCH_API_KEY` | string | `""` | Khóa API đăng ký với Brave Search. Bắt buộc khi `WEB_SEARCH_ENABLED=true`. |

- **Khi tắt (`WEB_SEARCH_ENABLED=false` hoặc không cấu hình)**:
  - Khóa API không bắt buộc; hệ thống khởi động bình thường.
  - Tool `orbit_web_search` không đăng ký vào MCP server.
  - Agent hướng dẫn người dùng rằng tính năng tìm kiếm web chưa được kích hoạt.
- **Khi bật (`WEB_SEARCH_ENABLED=true`)**:
  - `BRAVE_SEARCH_API_KEY` bắt buộc phải có giá trị hợp lệ. Nếu thiếu, startup validation sẽ báo lỗi và ngăn khởi động.
  - Không bao giờ log giá trị của khóa API ra console hoặc trả về client.

---

## 3. Ngữ cảnh thời gian & dueDate Semantics

### 3.1 Nguồn thời gian và Timezone
- **Thời điểm (instant)**: Luôn lấy từ backend clock tại thời điểm claim turn hội thoại.
- **Timezone**: Client gửi IANA time zone (ví dụ: `Asia/Ho_Chi_Minh`, `Europe/London`).
- **Dự phòng (Fallback)**: Nếu client không gửi hoặc gửi không hợp lệ, backend sử dụng múi giờ `UTC` với nhãn `source: "fallback"`. Agent sẽ nêu rõ kết quả tính theo múi giờ UTC.
- **Đầu tuần**: Quy ước tuần bắt đầu từ Thứ Hai (`weekStartsOn: "monday"`).

### 3.2 Lọc nhiệm vụ (dueDate Filter)
- Bộ lọc `startDate` và `endDate` trên `orbit_list_tasks` lọc theo **`dueDate`** của nhiệm vụ (inclusive).
- Biên cuối ngày được tính bằng `midnight tiếp theo trừ 1 millisecond` (ví dụ: `2026-11-12T16:59:59.999Z` cho hết ngày 12/11 tại múi giờ +07:00).
- Chuyển đổi DST (Daylight Saving Time) được tính toán chính xác theo lịch của múi giờ (ngày 23 giờ hoặc 25 giờ).

---

## 4. Giới hạn, An toàn & Quyền riêng tư (Web Search)

### 4.1 Giới hạn cuộc gọi và Timeout
- **Số lần gọi tối đa**: Tối đa **2 network searches** cho mỗi turn của agent.
- **Cache trong turn**: Các lệnh tìm kiếm có cùng truy vấn đã chuẩn hóa và số lượng kết quả trong cùng một turn sẽ sử dụng lại kết quả đã có, không tốn thêm network call.
- **Timeout**:
  - Trong luồng agent: `Math.min(8000, remainingMs - 12000)` ms (đảm bảo giữ lại ít nhất 10 giây cho câu trả lời và 2 giây lưu trữ).
  - Ngoài agent (direct MCP call): Cố định 8000 ms.
- **Kích thước phản hồi**: Giới hạn tối đa **1 MiB** trước khi parse JSON; tự động hủy (abort) nếu vượt ngưỡng.

### 4.2 Ranh giới bảo mật & Quyền riêng tư
- Truy vấn gửi đến Brave Search chỉ chứa từ khóa công khai tối thiểu.
- **Tuyệt đối không gửi**:
  - Thông tin nhiệm vụ cá nhân (tiêu đề, mô tả, ghi chú).
  - Thông tin người dùng, hồ sơ, email, token.
  - Lịch sử hội thoại hoặc nội dung tệp đính kèm.
- Kết quả tìm kiếm và đoạn trích (snippets) là dữ liệu công khai **không đáng tin cậy**. Agent được chỉ thị bỏ qua mọi chỉ thị prompt injection nằm trong snippet kết quả.

### 4.3 Dẫn nguồn & Hiển thị liên kết
- Agent dẫn nguồn bằng cú pháp `[Tên nguồn](URL)`.
- Renderer chỉ cho phép liên kết HTTP/HTTPS an toàn, mở trong tab mới với `rel="noopener noreferrer"`.
- Các liên kết chứa scheme không an toàn (`javascript:`, `data:`, `file:`) hoặc chứa credentials (`user:pass@host`) sẽ được hiển thị dưới dạng văn bản thuần, không tạo thẻ anchor.

---

## 5. Quy trình Kiểm thử & Rollback

### 5.1 Chạy kiểm thử tự động
```bash
# Backend unit & integration tests
cd backend
pnpm test
pnpm run build

# Frontend unit & e2e tests
cd frontend
pnpm test
pnpm exec playwright test e2e/agent-time-web-search.spec.ts
pnpm run build
```

### 5.2 Rollback
Trong trường hợp dịch vụ tìm kiếm gặp sự cố hoặc cần tạm ngừng tính năng:
1. Đặt biến môi trường `WEB_SEARCH_ENABLED=false` trong cấu hình backend (`.env`).
2. Khởi động lại service backend. Tool `orbit_web_search` sẽ tự động ngừng hoạt động mà không ảnh hưởng đến các tính năng khác của Agent.
