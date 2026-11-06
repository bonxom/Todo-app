# Tự review UI Agent và kỹ năng — 06/11/2026

Đã thao tác bằng Chromium/Playwright trên ứng dụng local, chụp và xem ảnh desktop, mobile, dark mode; sửa rồi chụp lại. Giao diện dùng màu nền, viền, typography và nút Orbit hiện có.

## Những lỗi đã sửa

- Token CSS không tồn tại khiến nền modal trong suốt, nút chính mất màu và switch khó nhận biết. Thay bằng token thật của theme.
- Library thiếu phân cấp và hàng không truy cập được bằng bàn phím. Chuyển thành danh sách có link semantic, trạng thái bật/tắt riêng, tìm kiếm và nguồn mẫu rõ ràng.
- Editor dàn trải: tách thông tin kỹ năng và nội dung hướng dẫn, có tab xem trước; giữ xử lý bản nháp, conflict và phiên đăng nhập. Mobile ghim nút lưu trong viewport.
- Gallery có nền đặc, danh sách mẫu và preview rõ ràng, hành động thêm mẫu duy nhất; mobile chuyển giữa danh sách và preview.
- Agent có navigation chung với Skills; sửa chiều cao chat để composer nằm trong viewport. Topbar bỏ bộ lọc task không liên quan trên Agent.

## Ảnh đối chiếu

| Trạng thái | Trước | Sau |
| --- | --- | --- |
| Library desktop | [Trước](before/03-skills-desktop.png) | [Sau](after/03-skills-desktop.png) |
| Editor desktop | [Trước](before/05-editor-desktop.png) | [Sau](after/05-editor-desktop.png) |
| Gallery desktop | [Trước](before/04-template-desktop.png) | [Sau](after/04-template-desktop.png) |
| Agent mobile | [Trước](before/02-agent-mobile.png) | [Sau](after/02-agent-mobile.png) |
| Library mobile | [Trước](before/07-skills-mobile.png) | [Sau](after/07-skills-mobile.png) |

Thêm: [Editor mobile khi soạn](after/06b-editor-mobile-writing.png), [gallery mobile](after/08-template-mobile.png), [dark mode](after/11-editor-dark.png), [Agent desktop](after/01-agent-desktop.png), [Dashboard tham chiếu](after/00-dashboard.png).

Ảnh before là toàn trang; ảnh mobile after giới hạn viewport để thấy đúng vị trí các nút. Ảnh dashboard before bị lỗi fixture nên đã loại bỏ; ảnh tham chiếu được chụp lại sau khi bổ sung endpoint hội thoại cho fixture, không sửa UI dashboard.

## Kiểm chứng

Các lệnh chạy tại `frontend/`:

```sh
pnpm test
pnpm run lint
pnpm run build
pnpm exec playwright test e2e/agent-design-audit.spec.ts e2e/agent-visual-contract.spec.ts e2e/personal-skills.spec.ts e2e/agent-workspace.spec.ts e2e/dashboard.spec.ts e2e/chat-usability.spec.ts e2e/task-proposals.spec.ts --workers=2
pnpm exec prettier --check e2e/agent-design-audit.spec.ts e2e/agent-visual-contract.spec.ts src/features/agent/AgentNavigation.tsx src/features/agent/agentNavigation.css e2e/dashboard.fixture.ts e2e/personal-skills.spec.ts src/features/agent/AgentActivityList.tsx src/features/agent/AgentContextPanel.tsx src/features/agent/AgentDiscardDialog.tsx src/features/agent/AgentHistoryList.tsx src/features/agent/AgentPage.tsx src/features/agent/agentWorkspace.css src/features/agent/skills/SkillEditorPage.tsx src/features/agent/skills/SkillReadBadge.tsx src/features/agent/skills/SkillsPage.tsx src/features/agent/skills/TemplateGallery.tsx src/features/agent/skills/skills.css src/shared/components/Topbar.jsx
```

- Unit: 56 files, 256 tests đạt.
- E2E: 44 tests đạt, gồm CRUD/import, keyboard/focus/Escape, dirty draft/conflict, shared chat/proposal, dashboard và viewport 320/390px.
- Hai regression visual đầu tiên đã fail trước sửa đúng vì nền trong suốt và thiếu link semantic; sau sửa đạt.
- ESLint, Prettier các file frontend thay đổi, type-check và production build đạt.
- Cảnh báo còn lại: jsdom không hỗ trợ navigation đầy đủ trong unit test; Vite cảnh báo chunk >500kB. Không mở rộng scope sang tối ưu bundle.
- Không chạy lại backend vì không sửa backend/API. Browser dùng API fixtures, không khẳng định đã kiểm thử dịch vụ AI hoặc dữ liệu production.
- Chưa commit các thay đổi của lượt chỉnh UI này.
