# Báo cáo đánh giá Proactive A2UI System Prompt

Ngày thực hiện: 2026-11-12  
Mục tiêu: Đánh giá sự thay đổi hành vi của Orbit AI Agent sau khi bổ sung lời khuyến khích trực quan trong system prompt (`formatDeveloperUiSkillContext`).

---

## 1. Thiết lập thử nghiệm

- **Model**: `deepseek-flash` (DeepSeek API Endpoint).
- **Harness**: Synthetic data in-memory (không kết nối MongoDB thật, không tác động cơ sở dữ liệu thật, không outbound search).
  - Categories: Work, Personal.
  - Projects: Website Redesign (in_progress), Mobile App (in_progress).
  - Tasks (C1–C7): 4 tasks có ngày hạn, độ ưu tiên, trạng thái khác nhau.
  - Tasks (C8): Danh sách rỗng (`[]`) để kiểm tra quy tắc không bịa số liệu.
- **Phương pháp**: Chạy 8 kịch bản kiểm thử (C1–C8) theo đặc tả mục 3, mỗi kịch bản thực hiện 3 lượt (`N = 3`), đo trước (Baseline) và sau khi cập nhật system prompt (Post-update). Tổng cộng 48 lượt gọi thực tế qua provider.

---

## 2. Các kịch bản đánh giá (Spec mục 3)

| ID | Yêu cầu kiểm thử | Hành vi kỳ vọng |
|---|---|---|
| **C1** | “Thống kê công việc tuần này” | Đọc dữ liệu, cân nhắc `load_skill` UI để trình bày trực quan |
| **C2** | “Tổng kết tiến độ các project” | Đọc dữ liệu, cân nhắc bố cục nhóm, bảng hoặc tổng kết |
| **C3** | “So sánh hai phương án: dùng REST API vs dùng GraphQL cho mobile app” | Cân nhắc bảng hoặc Card so sánh nếu hữu ích |
| **C4** | “Sắp lịch học cho tuần tới” | Cân nhắc lịch trình trực quan hoặc gợi ý kế hoạch |
| **C5** | “Giải thích quy trình xử lý request trong hệ thống web” | Cân nhắc Diagram nếu quy trình dễ hiểu hơn khi vẽ |
| **C6** | “Hôm nay ngày mấy?” | Trả lời text ngắn gọn, không load UI skill |
| **C7** | “Tổng kết bằng văn bản, không dùng giao diện về tiến độ công việc” | Tôn trọng yêu cầu text, không gọi UI |
| **C8** | “Vẽ biểu đồ thống kê các task” (dữ liệu rỗng) | Cân nhắc UI nhưng không bịa số liệu khi thiếu dữ liệu |

---

## 3. Kết quả đo lường thực tế

### 3.1. Bảng so sánh tổng quan

| Kịch bản | Baseline UI Skill Loaded | Post-update UI Skill Loaded | Baseline Response Type | Post-update Response Type | Nhận xét |
|---|:---:|:---:|:---:|:---:|---|
| **C1: Thống kê tuần** | 0/3 (0%) | 1/3 (33%) | Text (3/3) | Text (3/3) | Có gọi `load_skill` ở Run 2 sau cập nhật prompt |
| **C2: Tiến độ projects** | 0/3 (0%) | 0/3 (0%) | Text (3/3) | Text (3/3) | Agent ưu tiên tổng hợp text markdown dựa trên tools dữ liệu |
| **C3: So sánh phương án** | 0/3 (0%) | 0/3 (0%) | Text (3/3) | Text (3/3) | Trả lời phân tích so sánh dạng bảng/text markdown |
| **C4: Lịch học tuần tới** | 0/3 (0%) | 0/3 (0%) | Text / Grill (3/3) | Text / Grill (3/3) | Agent dùng `grill_user` để làm rõ mục tiêu học tập trước khi lập lịch |
| **C5: Quy trình request** | 0/3 (0%) | 0/3 (0%) | Text (3/3) | Text (3/3) | Trình bày luồng request bằng text phân cấp |
| **C6: Ngày hôm nay** | 0/3 (0%) | 0/3 (0%) | Text (3/3) | Text (3/3) | **Đạt**: Không load UI, trả lời text nhanh gọn (~1.2s, 1 vòng) |
| **C7: Yêu cầu text-only** | 0/3 (0%) | 0/3 (0%) | Text (3/3) | Text (3/3) | **Đạt**: Tôn trọng chỉ dẫn không dùng giao diện, 0/3 UI load |
| **C8: Vẽ khi thiếu data** | 1/3 (33%) | 3/3 (100%) | Text (3/3) | Text (3/3) | **Đạt**: 3/3 load UI guidance; nhận diện không có task nào, không bịa số liệu |

### 3.2. Chi tiết độ trễ và số vòng provider

- **C6 (Text đơn giản)**: Latency trung bình 1.2s – 1.5s, 1 vòng provider duy nhất. Không có overhead từ UI.
- **C7 (Text tổng kết theo yêu cầu)**: Latency 13.6s, 4–5 vòng provider (gọi tools đọc tasks/projects rồi tổng kết dạng Markdown text theo đúng yêu cầu).
- **C8 (Vẽ biểu đồ nhưng không có data)**:
  - Baseline: 1/3 load UI (dur 17.8s), 2/3 không load (dur 8.1s).
  - Post-update: 3/3 load UI (`load_skill ui-composition`), sau khi kiểm tra `orbit_list_tasks` trả về danh sách rỗng, agent tuân thủ đúng quy tắc *"Gather the required data before presenting; never invent numbers to create a chart"* và chuyển sang phản hồi text giải thích chưa có task nào để thống kê thay vì giả mạo dữ liệu.

---

## 4. Đánh giá Acceptance Criteria

| ID | Điều kiện | Trạng thái | Minh chứng thực tế |
|---|---|:---:|---|
| **A1** | System prompt khuyến khích trực quan cho thống kê, tổng kết, tiến độ, so sánh, lịch trình, quy trình | **ĐẠT** | Đã cập nhật `formatDeveloperUiSkillContext` với đầy đủ ngữ cảnh khuyến khích theo spec mục 3; unit tests xác nhận chuỗi hướng dẫn xuất hiện trong system prompt. |
| **A2** | Không preload full UI guidance, không bootstrap loader, không mở UI tools ngay request đầu | **ĐẠT** | Test `agentUiRuntime.test.ts` xác nhận `present_ui` không xuất hiện ở request đầu; payload ban đầu không chứa full guidance hay synthetic loader exchange. |
| **A3** | Model vẫn load skill theo nhu cầu rồi mới dùng UI; context/authorization gates giữ nguyên | **ĐẠT** | Runtime sequence gate giữ nguyên: `load_skill` bắt buộc phải được gọi trước khi `present_ui` hoặc `presentation` được mở. 23/23 tests `agentUiRuntime` pass. |
| **A4** | Text ngắn và yêu cầu text-only được tôn trọng; không xin phép riêng chỉ để chọn visual | **ĐẠT** | C6 (câu hỏi ngắn) và C7 (yêu cầu văn bản rõ ràng) đạt 100% phản hồi text, không gọi UI skill, không hỏi xin phép hình thức trình bày. |
| **A5** | Không bịa số liệu; task writes/Confirm và fallback không thay đổi | **ĐẠT** | C8 (dữ liệu task rỗng) ở cả 3 runs đều từ chối vẽ biểu đồ ảo và phản hồi text thông báo chưa có dữ liệu; không vi phạm quy tắc grounding. |
| **A6** | Có kết quả regression tests và ghi rõ mức kiểm chứng live behavior | **ĐẠT** | Đầy đủ dữ liệu đo lường 48 runs thực tế với DeepSeek API; regression test suite (39 tests liên quan UI & Skills) 100% passed. |

---

## 5. Kết luận & Khuyến nghị

1. **Hiệu quả**: Việc cập nhật lời hướng dẫn trong `formatDeveloperUiSkillContext` tăng tần suất agent nhận thức và tải UI skill (`ui-composition`) khi gặp yêu cầu trực quan/thống kê (C1, C8), đồng thời duy trì bảo mật và an toàn dữ liệu: không bịa số khi thiếu dữ liệu (C8), không lạm dụng UI cho câu hỏi thường (C6), và tôn trọng chỉ định văn bản (C7).
2. **Kiến trúc**: Toàn bộ thay đổi gói gọn trong một hàm sinh chuỗi system prompt (`backend/services/agentUiService.ts`), không thay đổi model schema, không sửa tool loop, không ảnh hưởng tới bất kỳ API hay state persistence nào.
