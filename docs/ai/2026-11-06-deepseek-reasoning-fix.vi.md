# Sửa Agent trả lời gián đoạn với DeepSeek

## Nguyên nhân đã tái hiện

Cấu hình local dùng `deepseek-flash` tại `api.deepseek.com`. Request Agent đầu tiên bị HTTP 400 `invalid_request_error`: “The reasoning_content in the thinking mode must be passed back to the API.” Thời gian lỗi khoảng 248ms, phù hợp triệu chứng người dùng cung cấp.

Agent chèn cặp assistant/tool `list_skills` trước vòng provider đầu tiên nhưng không có `reasoning_content`. Đồng thời schema validate response loại bỏ trường này khỏi kết quả provider, khiến vòng tiếp theo sau tool call cũng không hợp lệ.

Tham chiếu: [DeepSeek Thinking Mode / Tool Calls](https://api-docs.deepseek.com/guides/thinking_mode/).

## Sửa

- Schema giữ `reasoning_content` kiểu string/null nếu provider có trả về; không passthrough các trường tùy ý.
- Chuẩn bị payload DeepSeek bằng bản sao, thêm reasoning rỗng chỉ khi assistant message chưa có reasoning (synthetic/legacy). Giữ nguyên reasoning thật, không sửa lịch sử lưu trữ và không thêm trường này vào message thường của provider khác.
- Checkpoint giữ metadata cho lần gọi tiếp theo. Public conversation projection vẫn chỉ trả text/interaction/proposal, không trả reasoning.
- Không thay model, không tắt thinking, không thay .env và không sửa những câu trả lời lỗi đã lưu.

## Kiểm chứng

Chạy từ `backend/`:

```sh
pnpm exec vitest run services/test/agentReasoning.test.ts
pnpm test
pnpm run build
pnpm run lint
pnpm exec prettier --check utils/agentProviderResponse.ts utils/agentProviderMessages.ts services/agentService.ts services/test/agentReasoning.test.ts services/test/personalSkillsRuntime.test.ts
```

- Hai regression test đầu tiên fail trước sửa vì mất reasoning/không có trường trên synthetic message; sau sửa đạt.
- Full backend: 361 tests đạt, 76 skipped (các kiểm thử integration phụ thuộc Mongo test chưa cấu hình trong lượt này).
- Type-check đạt; lint không lỗi, còn 13 cảnh báo `any` có sẵn; formatter các file thay đổi đạt.
- Live probe dùng chính agentService và DeepSeek cấu hình local: request ban đầu trước sửa 400; sau sửa chat đơn thành công.
- Probe nhiều vòng chỉ cho phép `list_skills`/`read_skill`, dùng snapshot giả trong RAM: hai lượt hội thoại, mỗi lượt `read_skill` rồi final response, cả 4 request provider thành công. Không đọc/ghi task hay dữ liệu production. Script tạm đã xóa, không in reasoning/khóa API.

Chưa commit. Các thay đổi UI đang có trong worktree được giữ nguyên.
