# Khôi phục luồng vision → mô tả → chatbot

## Nguyên nhân

Nhánh hiện tại chỉ có upload/storage/hiển thị attachment. Không có vision service hay cache mô tả; runConversationTurn chỉ chuyển userInput cho Agent. Vì thế ảnh hiện trên UI nhưng chatbot không nhận thông tin ảnh.

## Thay đổi

- Vision invocation riêng, không có chat history hay tools. Có thể cấu hình VISION_MODEL_NAME, VISION_BASE_URL, VISION_API_KEY; trường bỏ trống dùng AI_* tương ứng. Không sửa .env thật.
- Attachment.analysis lưu processing/succeeded/failed, description, model, updatedAt. Repository claim nguyên tử theo owner + conversation + attached + analysis chưa tồn tại. Cache theo attachment, không deduplicate ảnh khác nhau hoặc xuyên user.
- Đọc ảnh tối đa 10 MiB từ storage private; deadline 20 giây cả đọc stream và provider; provider không tự retry. Tối đa bốn ảnh xử lý song song.
- Agent chỉ nhận mô tả text có nhãn dữ liệu không đáng tin. Checkpoint/history lưu text; không có base64/image_url trong chatbot payload. Ảnh gốc vẫn hiển thị bằng cơ chế cũ.
- Thất bại/processing không rõ kết quả không tự gửi lại ảnh. User có thể upload lại để chủ động thử lại. Crash sau claim không tạo lần gọi trùng; đổi lại attachment đó không tự hồi phục.
- PDF/text/document vẫn là file tham khảo, chưa phân tích. Composer đã sửa hướng dẫn tương ứng.
- Không backfill ảnh thuộc các lượt cũ trước khi có tính năng. Gửi ảnh trong lượt mới để kiểm tra.

## Verification

Tại backend:

```sh
pnpm exec vitest run services/test/attachmentVisionService.test.ts services/test/visionClient.test.ts services/test/personalSkillsRuntime.test.ts
pnpm test
pnpm run build
pnpm run lint
pnpm exec prettier --check libs/visionClient.ts services/attachmentVisionService.ts services/conversationTurnService.ts services/agentService.ts types/IAgent.ts models/Attachment.ts repositories/attachmentRepository.ts repositories/test/attachmentAnalysis.test.ts services/test/attachmentVisionService.test.ts services/test/visionClient.test.ts services/test/conversationVision.test.ts services/test/personalSkillsRuntime.test.ts
```

Tại frontend:

```sh
pnpm test
pnpm run lint
pnpm run build
pnpm exec prettier --check src/features/tasks/components/chat/AttachmentComposer.tsx
```

- RED: 5 test thiếu hành vi fail trước triển khai, non-image no-call test đã pass trên stub. GREEN: full backend 375 passed, 76 skipped; frontend 256 passed.
- Backend/frontend build/typecheck, lint, scoped formatter đạt. 13 warning any có sẵn ở backend; Vite cảnh báo bundle lớn; jsdom cảnh báo navigation trong unit tests.
- Live probe dùng ảnh screenshot của user: vision tạo mô tả 838 ký tự; agentService chỉ nhận text và trả lời đúng con ếch xanh, miệng nâu đỏ, áo xanh. Probe chặn nếu chatbot payload chứa image_url/data:image. Không có DB/task write trong probe; script tạm đã xóa.
- Ownership, concurrent winner, persisted cache hit, failure/no retry, persistence failure, stream size, text-only checkpoint và runner wiring có unit regression tests. Integration Mongo thực tế chưa chạy vì thiếu test DB; chưa khẳng định full HTTP + MinIO + Mongo E2E. Không sửa hay xóa dữ liệu lịch sử.

Chưa commit.
