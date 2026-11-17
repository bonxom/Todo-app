# V2: bố cục workspace theo ảnh tham khảo

Đã triển khai theo phương án người dùng duyệt: sidebar 232px có icon và nhãn nằm ngang, logo trên cùng, đăng xuất cuối thanh; topbar gọn với đường dẫn trang và các nút cũ. Giữ chất liquid glass, màu Orbit và các chức năng hiện có.

Dashboard mở đầu bằng ba thống kê, sau đó là khối công việc rộng. Đưa nút tạo việc vào cùng toolbar tìm kiếm/lọc. Danh sách desktop căn thành cột tên/ngữ cảnh, trạng thái, ưu tiên, hạn và thao tác; hàng dữ liệu mẫu cao 78px. Khi cửa sổ hoặc vùng làm việc bị thu hẹp bởi chat dock, các hàng chuyển thành dạng xếp gọn. Mobile giữ menu điều hướng và nút thao tác 44px; màn hình 320px xếp riêng bộ lọc để không cắt chữ.

## Tự review như người dùng

Đã mở và kiểm tra ảnh desktop sáng/tối, điện thoại, lịch, hội thoại, form tạo việc và chat dock. Đã trải nghiệm tìm kiếm, lọc, phân trang, tạo/sửa việc, bắt đầu/hoàn thành, giữ bản nháp, chuyển V1/V2, menu mobile và gửi tin nhận phản hồi. Kiểm tra tên việc dài, tiếng Việt, viewport 320/390/768/1024/1280/1440px, keyboard focus, giảm chuyển động và giảm độ trong suốt.

Hai fixture cũ chưa phản ánh đúng API: start/finish chờ PATCH thay vì PUT, và chat trả lịch sử cũ sau khi gửi. Đã sửa fixture và selector để kiểm thử thực sự bắt buộc chạy các thao tác này; không thay đổi API hoặc nghiệp vụ sản phẩm.

## Kết quả và lệnh kiểm tra

Chạy từ thư mục gốc:

```sh
pnpm --dir frontend exec playwright test v2-workspace-layout frontend-v2-polish frontend-v2.spec.ts frontend-v2-visual liquid-glass-refinement --workers=2
pnpm --dir frontend exec playwright test --config playwright.v2-production.config.ts
pnpm --dir frontend exec vitest run --maxWorkers=2
pnpm --dir backend run build
pnpm --dir backend exec vitest run --maxWorkers=2
pnpm --dir frontend run lint
pnpm --dir frontend run build
pnpm --dir frontend run typecheck
pnpm --dir frontend exec prettier --check src/features/v2/components/TaskCollection.tsx src/features/v2/components/TaskPagination.tsx src/features/v2/components/TaskRow.tsx src/features/v2/components/TaskToolbar.tsx src/features/v2/components/V2AgentChatBubble.tsx src/features/v2/components/V2Topbar.tsx src/features/v2/layouts/V2Layout.tsx src/features/v2/pages/DashboardPage.tsx src/features/v2/styles/workspace.css src/shared/i18n/locales/en/v2.json src/shared/i18n/locales/vi/v2.json e2e/frontend-v2.fixture.ts e2e/frontend-v2.spec.ts e2e/v2-workspace-layout.spec.ts
pnpm --dir frontend exec prettier --check e2e/agent-workspace.fixture.ts
git diff --check
```

- Playwright: **45/45 UI + 3/3 production**, tổng **48** đạt.
- Frontend unit: **494/494** đạt.
- Backend unit: **539 đạt**, **97 bỏ qua theo cấu hình**; build đạt.
- Frontend lint, format file sửa, typecheck và production build: đạt.
- Còn cảnh báo Vite bundle >500kB và log jsdom/navigation, preflight 403 trong test hiện hữu. Không che hoặc tắt cảnh báo.
- Browser dùng API fixtures; chưa kiểm chứng MongoDB/AI thật hoặc Safari trên iOS thật. Không thêm dependency, chức năng, route hay sửa backend.

## Ảnh đã kiểm tra

- [Desktop sáng](assets/2026-11-18-v2-workspace/dashboard-light.png)
- [Desktop tối](assets/2026-11-18-v2-workspace/dashboard-dark.png)
- [Dashboard mobile](assets/2026-11-18-v2-workspace/dashboard-mobile.png)
- [Hội thoại mobile](assets/2026-11-18-v2-workspace/conversation-mobile.png)
