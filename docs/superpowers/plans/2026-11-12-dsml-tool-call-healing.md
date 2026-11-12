# Kế hoạch triển khai: DSML Tool-Call Healing cho DeepSeek Provider

**Mục tiêu:** Bóc tách và hồi phục (healing) các lời gọi tool theo định dạng DSML bị rò rỉ vào `message.content` của mô hình DeepSeek thành `tool_calls` JSON chuẩn OpenAI.

**Kiến trúc:**
- Helper độc lập `backend/utils/dsmlParser.ts` thực hiện regex parse và normalize parameters.
- Tích hợp vào `backend/utils/agentProviderResponse.ts::validateAgentResponse` trước khi validate schema.
- Regression tests trong `backend/utils/test/dsmlParser.test.ts` và `backend/services/test/agentUiRuntime.test.ts`.

**Spec:** `docs/superpowers/specs/2026-11-12-dsml-tool-call-healing.md`.

---

## Task 1: Viết test trước (TDD) cho DSML Parser

- **Tệp mới:** `backend/utils/test/dsmlParser.test.ts`.
- **Nội dung test:**
  - Test bóc tách cú pháp chuẩn từ ảnh chụp của người dùng (`< | DSML | calls>`, `invoke name="present_ui"`, `fallback_text`, `components`, `displayData`).
  - Test chuẩn hóa `snake_case` -> `camelCase` cho `fallback_text` và `display_data`.
  - Test parse `string="false"` thành JSON object/array và `string="true"` thành string.
  - Test với fullwidth pipe `｜` và không có khoảng trắng (`<｜DSML｜calls>`).
  - Test giữ nguyên khi không có DSML hoặc khi đã có `tool_calls`.
  - Test loại bỏ DSML khỏi `content` (gán `null` khi rỗng hoặc giữ phần text còn lại).
- **Lệnh chạy:** `cd backend && pnpm exec vitest run utils/test/dsmlParser.test.ts` (xác nhận fail vì chưa có code).

---

## Task 2: Cài đặt `backend/utils/dsmlParser.ts` và tích hợp vào `agentProviderResponse.ts`

- **Tạo tệp:** `backend/utils/dsmlParser.ts`.
- **Cập nhật:** `backend/utils/agentProviderResponse.ts` để gọi `healDsmlToolCalls`.
- **Chạy lại test:** `cd backend && pnpm exec vitest run utils/test/dsmlParser.test.ts services/test/agentReasoning.test.ts`.

---

## Task 3: Bổ sung integration test trong `agentUiRuntime.test.ts`

- **Cập nhật:** `backend/services/test/agentUiRuntime.test.ts` thêm test case:
  - Provider trả về `content` chứa DSML `< | DSML | calls>< | DSML | invoke name="present_ui">...` và `tool_calls: undefined`.
  - Runtime tự động phát hiện, gọi `present_ui` và trả về `surfaceSpec` thay vì text.
- **Chạy lại test:** `cd backend && pnpm exec vitest run services/test/agentUiRuntime.test.ts`.

---

## Task 4: Kiểm tra toàn bộ hệ thống (Verification & Handoff)

- Chạy toàn bộ backend test: `cd backend && pnpm test`.
- Chạy backend lint: `cd backend && pnpm run lint`.
- Chạy prettier check: `cd backend && pnpm exec prettier --check utils/dsmlParser.ts utils/test/dsmlParser.test.ts utils/agentProviderResponse.ts services/test/agentUiRuntime.test.ts`.
- Chạy backend build: `cd backend && pnpm run build`.
- Chạy frontend lint & build: `cd frontend && pnpm run lint && pnpm run build`.
- Kiểm tra `git diff --check`.
