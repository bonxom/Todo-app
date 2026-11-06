# Agent visual refinement

User yêu cầu tự thao tác, chụp ảnh, review và sửa Agent/Skills cho đẹp và đồng bộ. Đây là sửa UI hiện có; không thêm API hoặc thay đổi quyền/runtime.

## Bằng chứng ban đầu

Ảnh tại `docs/ui-audit/2026-11-06-agent/before`: biến `--color-bg-primary`, `--color-border`, light `--color-primary` không tồn tại khiến modal trong suốt, switch mất track và CTA mất nền. Header mobile chật; editor chưa có phân cấp rõ; card là div click không truy cập được bằng bàn phím.

## Hướng thiết kế

Dùng token Orbit: canvas #f6f7f9, surface #fff, line #d9dee5, text #1f2328, muted #667085, accent #456b8c. Dark dùng token hiện có. Font sans hệ thống của app cho tiêu đề/nội dung; mono chỉ cho nội dung Markdown và số phiên bản. Không thêm font/dependency.

Thư viện là danh sách skill dễ quét: biểu tượng tài liệu, tên, mô tả, nguồn/version và switch trạng thái. Header rõ một hành động chính. Editor hai vùng: thông tin/trạng thái và hướng dẫn; xuống một cột trên mobile. Gallery nền đặc, danh sách mẫu bên trái và preview bên phải; mobile chuyển panel, footer hành động rõ. Agent dùng cùng điều hướng Chat/Skills, header mobile không chen chúc.

## Acceptance

- CTA/switch/modal có màu nền thực tế, tương phản ở light/dark, không dùng biến CSS chưa định nghĩa.
- Skill mở được bằng link bàn phím; focus visible; modal Escape/focus trap/return vẫn đúng.
- Không tràn ngang ở 390px/320px; hành động lưu, đóng và quay lại truy cập được; chat composer nằm trong viewport.
- Create/edit/import/toggle/delete, dirty guard, conflict, badge và session isolation giữ nguyên.
- Chụp và xem lại desktop, mobile, empty, populated, editor, preview và dark; sửa sau tự critique.
- Vitest, Playwright regression, ESLint, scoped Prettier, frontend build/typecheck qua.
