# Đặc tả: DSML Tool-Call Healing cho DeepSeek Provider

Ngày: 2026-11-12. Trạng thái: Đặc tả kỹ thuật.

## 1. Bối cảnh & Vấn đề

Khi tích hợp với các mô hình họ DeepSeek (DeepSeek V4, DeepSeek Flash qua OpenAI-compatible API), mô hình sử dụng định dạng nội bộ **DSML (DeepSeek Markup Language)** để biểu diễn lời gọi tool:
```xml
< | DSML | calls>
< | DSML | invoke name="present_ui">
< | DSML | parameter name="fallback_text" string="true">...</ | DSML | parameter>
< | DSML | parameter name="components" string="false">[...]</ | DSML | parameter>
< | DSML | parameter name="displayData" string="false">{...}</ | DSML | parameter>
</ | DSML | invoke>
</ | DSML | calls>
```

Trong một số trường hợp, nhà cung cấp (API gateway hoặc model output) không bọc DSML này thành trường JSON `tool_calls` chuẩn của OpenAI mà trả thẳng vào `message.content`. Phía backend hiện tại:
- `validateAgentResponse` chỉ đọc `message.tool_calls`.
- Khi `message.tool_calls` không có, `agentService` coi phản hồi là câu trả lời text cuối cùng và trả về nguyên văn chuỗi DSML XML cho người dùng.
- Thêm vào đó, DSML parameter có thể dùng `snake_case` (ví dụ `fallback_text` thay vì `fallbackText`), gây trượt validation của Zod strict object.

## 2. Mục tiêu

1. **Tự động nhận diện & bóc tách DSML**: Khi `message.tool_calls` rỗng hoặc không có, nhưng `message.content` chứa thẻ DSML, tự động chuyển đổi thành mảng `tool_calls` chuẩn OpenAI.
2. **Khử rò rỉ văn bản (Content cleanup)**: Loại bỏ các thẻ DSML khỏi `message.content`. Nếu nội dung sau khi loại bỏ là chuỗi rỗng/chỉ chứa khoảng trắng, gán `message.content = null`.
3. **Chuẩn hóa tham số (Parameter normalization)**:
   - Xử lý thuộc tính `string="false"` (parse JSON value) và `string="true"` / mặc định (giữ nguyên string).
   - Chuẩn hóa tên tham số từ `snake_case` sang `camelCase` đối với các tham số UI phổ biến (`fallback_text` -> `fallbackText`, `display_data` -> `displayData`) để tương thích với `surfaceSpecBaseSchema`.
4. **Hỗ trợ biến thể cú pháp**:
   - Dấu pipe: Cả ASCII pipe `|` và Fullwidth pipe `｜` (U+FF5C).
   - Khoảng trắng: Hỗ trợ cả `<|DSML|...>`, `< | DSML | ...>`, `<｜DSML｜...>`.
   - Thẻ bao: Hỗ trợ cả `calls` và `tool_calls`.
5. **Độ an toàn**:
   - Nếu `tool_calls` của provider đã có sẵn, giữ nguyên và không thay đổi.
   - Nếu `content` không chứa thẻ DSML, không làm thay đổi nội dung.
   - Sinh `id` ngẫu nhiên duy nhất cho mỗi tool call (`call_dsml_...`).

## 3. Thiết kế kỹ thuật

### 3.1. Vị trí xử lý

Tạo module helper `backend/utils/dsmlParser.ts` xuất hàm:
```ts
export function healDsmlToolCalls(message: {
  role: "assistant";
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }> | null;
  reasoning_content?: string | null;
}): {
  role: "assistant";
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  reasoning_content?: string | null;
}
```

Tích hợp vào đầu hàm `validateAgentResponse` trong `backend/utils/agentProviderResponse.ts`:
Trước khi kiểm tra schema của Zod, nếu `value.content` chứa markup DSML và `!value.tool_calls?.length`, gọi `healDsmlToolCalls(value)`.

### 3.2. Cú pháp & Quy tắc Regex

- Pattern nhận diện thẻ mở/đóng bao:
  `/<[\s\t]*[|｜][\s\t]*DSML[\s\t]*[|｜][\s\t]*(?:calls|tool_calls)[\s\t]*>([\s\S]*?)<\/?[ \t]*[|｜][ \t]*DSML[ \t]*[|｜][ \t]*(?:calls|tool_calls)?[ \t]*>/gi`
  hoặc nhận diện trực tiếp các block `<...invoke name="...">...</...invoke>`.
- Pattern cho `invoke`:
  `/<[\s\t]*[|｜][\s\t]*DSML[\s\t]*[|｜][\s\t]*invoke[\s\t]+name=["']([^"']+)["'][\s\t]*>([\s\S]*?)(?:<\/?[ \t]*[|｜][ \t]*DSML[ \t]*[|｜][ \t]*invoke[ \t]*>|$)/gi`
- Pattern cho `parameter`:
  `/<[\s\t]*[|｜][\s\t]*DSML[\s\t]*[|｜][\s\t]*parameter[\s\t]+name=["']([^"']+)["'](?:[\s\t]+string=["'](true|false)["'])?[\s\t]*>([\s\S]*?)<\/?[ \t]*[|｜][ \t]*DSML[ \t]*[|｜][ \t]*parameter[ \t]*>/gi`

### 3.3. Xử lý giá trị tham số

- Tên thuộc tính: chuyển `snake_case` sang `camelCase` (ví dụ `fallback_text` -> `fallbackText`, `display_data` -> `displayData`).
- Giá trị:
  - Nếu `string="false"`: thử `JSON.parse(rawValue.trim())`. Nếu lỗi, giữ nguyên `rawValue.trim()`.
  - Nếu `string="true"` hoặc không có: giữ nguyên chuỗi sau khi trim (tránh khoảng trắng thừa do XML indentation).

## 4. Acceptance Criteria

| ID | Điều kiện |
|---|---|
| **AC1** | Tin nhắn có `content` chứa thẻ DSML (`< | DSML | calls>...`) và `tool_calls` rỗng được chuyển đổi thành `tool_calls` hợp lệ với tên hàm và arguments JSON chính xác. |
| **AC2** | Hỗ trợ cả ASCII pipe `|` và fullwidth pipe `｜`, hỗ trợ cả `calls` và `tool_calls`. |
| **AC3** | Tham số `string="false"` được parse thành JSON object/array; tham số `string="true"` được giữ dạng chuỗi. |
| **AC4** | Tham số `fallback_text` được chuẩn hóa thành `fallbackText`, `display_data` thành `displayData`. |
| **AC5** | Thẻ DSML bị loại bỏ khỏi `message.content`; nếu không còn text dư, `content` chuyển thành `null`. |
| **AC6** | Khi provider đã trả sẵn `tool_calls`, hoặc khi `content` là văn bản bình thường không chứa DSML, không có bất kỳ thay đổi nào. |
| **AC7** | Tích hợp trong `agentService.chatWithMcp`: khi mô hình trả về DSML cho `present_ui`, runtime bóc tách và thực thi `present_ui`, trả về `surfaceSpec` chuẩn thay vì text XML rò rỉ. |
