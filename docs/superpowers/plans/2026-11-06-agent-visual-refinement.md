# Agent visual refinement implementation plan

**Goal:** Sửa UI Agent/Skills bị mất màu, cải thiện phân cấp và đồng bộ Orbit.
**Architecture:** Giữ nguyên hooks/API. Shared AgentNavigation, semantic library/editor/gallery và CSS theo token hiện có.
**Tech Stack:** React/TypeScript/CSS, Vitest/Playwright; không dependency mới.
**Spec:** ../specs/2026-11-06-agent-visual-refinement.md

## 1. Audit và regression

- [x] Click/chụp before bằng `e2e/agent-design-audit.spec.ts`.
- [x] Thêm `e2e/agent-visual-contract.spec.ts`: computed background CTA/switch, opaque modal và keyboard link.
- [x] Xác nhận red từ thiếu nền/thiếu link.

## 2. Shared Orbit language và library

Files: `src/features/agent/AgentNavigation.tsx`, `skills/SkillsPage.tsx`, `skills/skills.css`, `AgentPage.tsx`, `agentWorkspace.css`; sửa token sai trong các component Agent.

- [x] Dùng `var(--color-surface)`, `var(--color-line)`, `var(--color-accent)`; `ui-btn-primary`, `ui-btn-secondary`, `ui-input`.
- [x] `AgentNavigation({ active: "chat" | "skills" })` dùng links với aria-current, không mất shared session.
- [x] Library semantic links và switch tách biệt, nội dung trạng thái dễ đọc, empty/error có hướng xử lý.

## 3. Editor và gallery

Files: `skills/SkillEditorPage.tsx`, `skills/TemplateGallery.tsx`, `skills/skills.css`.

- [x] Giữ toàn bộ save/conflict/blocker/session handlers; thay JSX layout hai vùng, thông tin tên/mô tả và vùng Markdown.
- [x] Gallery surface đặc; preview rõ; một hành động import cho mẫu đang xem; không auto-import; Escape/focus giữ nguyên.
- [x] Header mobile và textarea không tràn; dùng token dark hiện có.

## 4. Tự critique và xác minh

- [x] Chạy audit after, xem ảnh từng trạng thái; sửa các lỗi nhìn thấy, chụp lại.
- [x] `pnpm test`; `pnpm exec playwright test e2e/personal-skills.spec.ts e2e/agent-workspace.spec.ts e2e/agent-visual-contract.spec.ts e2e/agent-design-audit.spec.ts --workers=2`.
- [x] `pnpm run lint`; `pnpm exec prettier --check` các file đổi; `pnpm run build`.
- [x] Ghi báo cáo before/after và giới hạn fixture; chưa commit trừ khi user yêu cầu.
