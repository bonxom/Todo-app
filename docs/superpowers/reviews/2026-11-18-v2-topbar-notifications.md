# V2: glass pills, trợ lý và thông báo trên topbar

Đã chỉnh cụm nút theo ảnh tham khảo: pill kính mờ với viền sáng, độ trong suốt, bóng mềm và xử lý nền tối riêng. Trợ lý dùng icon Sparkles kèm nhãn; chuông tròn có badge đỏ lấy số chưa đọc thật, ẩn khi bằng 0 và giới hạn 99+.

Launcher trợ lý được đưa vào topbar qua portal, giữ nguyên component/session/bản nháp và các chế độ chat. Popup chat mở bên dưới thanh đầu trang; không còn launcher ở sidebar hoặc góc màn hình. Trên trang hội thoại đầy đủ, nút đưa focus vào composer hiện có để tránh mở hai khung chat.

Thông báo tái dùng NotificationBell, NotificationsPage, queries và mutations v1, với prop `version` mặc định v1. V2 có `/v2/notifications`, giữ đọc một/tất cả, lọc, phân trang, xác nhận xóa, lỗi/thử lại, polling và xử lý công việc không còn tồn tại. Mở công việc và “Xem tất cả” ở v2 không dẫn về v1. Chuyển phiên bản giữa hai trang lịch sử được ánh xạ đúng.

## Tự review

Đã mở ảnh desktop sáng/tối, popup điện thoại 320/390px và lịch sử thông báo. Sửa lỗi menu mobile bị hiện trên desktop do selector nút mới; giữ header/footer popup cố định và chỉ cuộn danh sách. Đã thử mở/đóng chat, Escape và trả focus, gửi tin, dock, thao tác thông báo và luồng V1/V2.

Kiểm thử V1 mobile trước đây chỉ so tọa độ ngang nên báo nhầm khi các nút nằm ở hai hàng theo CSS hiện hữu. Đã chỉnh kiểm thử để xét giao nhau theo cả hai chiều; không sửa giao diện V1.

## Kiểm chứng

Chạy từ thư mục gốc:

```sh
pnpm --dir frontend exec playwright test v2-topbar-notifications notifications.spec.ts frontend-v2-polish v2-workspace-layout frontend-v2.spec.ts frontend-v2-visual liquid-glass-refinement --workers=2
pnpm --dir frontend exec playwright test --config playwright.v2-production.config.ts
pnpm --dir frontend exec vitest run --maxWorkers=2
pnpm --dir frontend exec vitest run src/shared/navigation/test/uiVersions.test.ts src/features/notifications/test/NotificationBell.test.tsx src/features/v2/test/AgentChatBubbleModes.test.tsx src/features/v2/test/V2Layout.test.tsx --maxWorkers=2
pnpm --dir backend run build
pnpm --dir backend exec vitest run --maxWorkers=2
pnpm --dir frontend run lint
pnpm --dir frontend run build
pnpm --dir frontend exec prettier --check src/features/v2/components/V2Topbar.tsx src/features/v2/components/V2AgentChatBubble.tsx src/features/v2/layouts/V2Layout.tsx src/features/v2/pages/NotificationsPage.tsx src/features/v2/routes.tsx src/features/v2/styles/topbar.css src/features/notifications/components/NotificationBell.tsx src/features/notifications/NotificationsPage.tsx src/shared/navigation/uiVersions.ts src/shared/navigation/test/uiVersions.test.ts src/shared/i18n/locales/en/v2.json src/shared/i18n/locales/vi/v2.json e2e/v2-topbar-notifications.spec.ts e2e/frontend-v2-polish.spec.ts e2e/notifications.spec.ts
git diff --check
```

- **65/65** kiểm tra UI đạt, gồm 10 kiểm tra mới cho topbar/thông báo và 10 kiểm tra V1 notifications.
- **3/3** kiểm tra production đạt. Tổng Playwright: **68**.
- **495/495** frontend unit tests đạt; 42 test trực tiếp liên quan được chạy lại sau chỉnh ARIA.
- Backend: **539 đạt**, **97 bỏ qua theo cấu hình**; build đạt.
- Lint, Prettier file sửa, build/typecheck và diff check đạt.
- Kiểm thử mới đã thất bại trước code vì launcher chưa ở header, chưa có chuông và chưa có route lịch sử V2; unit test ánh xạ phiên bản cũng thất bại trước code.

Còn cảnh báo Vite bundle >500kB, log jsdom navigation/HydrateFallback và một số request preflight 403 trong unit test hiện hữu. Playwright dùng API fixtures; chưa kiểm tra MongoDB/AI/notification worker thật hoặc Safari iOS thật. Không thêm dependency hay thay đổi API/backend.

## Ảnh

- [Cụm nút sáng](assets/2026-11-18-v2-topbar/controls-light.png)
- [Cụm nút tối](assets/2026-11-18-v2-topbar/controls-dark.png)
- [Thông báo mobile](assets/2026-11-18-v2-topbar/notifications-mobile.png)
- [Lịch sử v2](assets/2026-11-18-v2-topbar/history-dark.png)
