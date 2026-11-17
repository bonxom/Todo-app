# V2 chat: popup dưới phải và khung ghim Liquid Glass

Chỉ còn hai chế độ: **compact popup ↔ docked**. Nút chuyển đi thẳng giữa hai chế độ; đã bỏ state, icon, CSS và bản dịch cho expanded của V2. Chat V1 vẫn giữ chức năng riêng.

Popup mở ở **góc dưới bên phải**, cách mép 24px desktop / 12px mobile. Nút mở vẫn ở topbar. Khung tối đa 420×640 và luôn giới hạn theo viewport. Dock là panel kính có khoảng hở quanh viền, chừa chỗ cho workspace trên desktop; mobile dùng overlay có inset.

Đã tách header thành nhận diện/đóng và toolbar bên dưới, cho mọi nút tối thiểu 44px. Shared ChatField được ánh xạ màu V2 bên trong bubble: user message màu teal/mint, assistant message nền kính, composer bo tròn, nút gửi và công cụ đồng bộ. Một component chat vẫn mounted nên đổi chế độ giữ nguyên hội thoại, bản nháp, tools và attachments. Escape đóng lịch sử trước, đóng panel sau, trả focus về launcher và reset về compact.

## Tự review

Đã mở ảnh desktop sáng/tối, mobile 320/390px, dock, tin dài, code và bản nháp nhiều dòng với tools trên màn hình cao 568px. Sửa focus ring lồng nhau; vùng nhập và nút gửi vẫn trong viewport. Kiểm tra tiếng Việt và chế độ giảm độ trong suốt.

Unit tests chuyển trực tiếp sang dock đã thất bại trước code; browser tests ban đầu thất bại vì còn Expand chat. Sau yêu cầu đổi vị trí, assertion đo tọa độ góc dưới phải cũng được chạy thất bại trước khi sửa anchor.

## Kiểm chứng

```sh
pnpm --dir frontend exec playwright test v2-chat-two-modes v2-topbar-notifications notifications.spec.ts frontend-v2-polish v2-workspace-layout frontend-v2.spec.ts frontend-v2-visual liquid-glass-refinement --workers=2
pnpm --dir frontend exec playwright test --config playwright.v2-production.config.ts
pnpm --dir frontend exec vitest run --maxWorkers=2
pnpm --dir backend run build
pnpm --dir backend exec vitest run --maxWorkers=2
pnpm --dir frontend run lint
pnpm --dir frontend run build
pnpm --dir frontend exec prettier --check src/features/v2/components/V2AgentChatBubble.tsx src/features/v2/layouts/V2Layout.tsx src/features/v2/styles/assistant.css src/features/v2/styles/topbar.css src/features/v2/styles/v2.css src/features/v2/styles/workspace.css src/features/v2/test/AgentChatBubbleModes.test.tsx src/shared/i18n/locales/en/v2.json src/shared/i18n/locales/vi/v2.json e2e/v2-chat-two-modes.spec.ts e2e/v2-workspace-layout.spec.ts
git diff --check
```

- **74/74 UI + 3/3 production = 77** kiểm tra Playwright đạt, gồm 9 kiểm tra cho chat hai chế độ.
- Frontend: **496/496** unit tests; lint, formatter và build/typecheck đạt.
- Backend: **539 đạt**, **97 bỏ qua theo cấu hình**; build đạt.
- Không thay dependency, backend, API hoặc auth/ownership.
- Còn cảnh báo bundle >500kB và log jsdom navigation/HydrateFallback/preflight trong unit test hiện hữu.
- Browser dùng API fixtures; chưa kiểm tra AI/MongoDB thật hay Safari iOS thật.

## Ảnh sau sửa

- [Popup desktop ở góc dưới phải](assets/2026-11-18-v2-chat/popup-light.png)
- [Dock nền tối](assets/2026-11-18-v2-chat/docked-dark.png)
- [Popup mobile ở góc dưới phải](assets/2026-11-18-v2-chat/popup-mobile.png)
