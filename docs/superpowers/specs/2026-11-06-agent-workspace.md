# Agent Workspace — Specification

Ngày: 2026-11-06. Trạng thái: thiết kế đề xuất theo hướng đã thống nhất; chưa triển khai.

## Mục tiêu và thứ tự giao hàng

Tạo không gian làm việc trực tiếp với Orbit Agent tại `/agent`, dùng lại hội thoại hiện có. Đây là giai đoạn 1. Giai đoạn 2 được mô tả trong [Personal Skills](2026-11-06-personal-skills.md), triển khai sau khi Workspace đạt nghiệm thu. Không tạo tab Skills rỗng ở giai đoạn 1.

## Cơ sở từ repository

- `frontend/src/app/router.tsx` gắn ChatBubble trong MainLayout của các route được bảo vệ.
- Chat UI nằm tại `frontend/src/features/tasks/components/chat/`; `useConversationChat` và `useConversationSession` quản lý gửi, retry, lịch sử, attachments và interactions.
- `useConversationSession` hiện tự tải hội thoại gần nhất khi mount. Trang deep link phải tránh tải latest rồi ghi đè hội thoại được chọn.
- Backend lưu Conversation và ChatTurn; `conversationService`, `conversationTurnService`, `chatTurnRepository` đã có execution lease, checkpoint và chống thực thi lặp.
- Public conversation view chưa có activity feed hoặc project context. Không giả định có API đó.
- Cả hai package đã có Vitest, ESLint, Prettier; frontend có Playwright. Dùng cấu trúc `features/`, `shared/services/`, `stores/` thực tế, không theo đường dẫn kiến trúc cũ trong hướng dẫn repository.

## Phạm vi và quyết định

Bao gồm trang chat riêng, lịch sử có tìm theo tiêu đề, chọn project context, bảng kết quả thao tác, chuyển tiếp từ chat nổi, desktop/mobile và accessibility. Dùng nguyên Auto/Ask, attachments, A2UI proposal, Markdown, retry và phân trang tin nhắn hiện có.

Không bao gồm multi-agent, chạy nền theo lịch, streaming/SSE mới, dừng cưỡng chế lượt backend, cấu hình model/provider, thay đổi semantics Auto/Ask hoặc quản lý skills. Không hiển thị suy luận nội bộ, system prompt hay raw tool arguments/results.

## UX và điều hướng

- `/agent`: mở hội thoại gần nhất; nếu chưa có thì hiện empty state và chỉ tạo hội thoại khi user gửi hoặc bấm New chat.
- `/agent?conversation=<uuid>`: mở đúng hội thoại. ID sai định dạng, không tồn tại hoặc không thuộc user hiện trạng thái không khả dụng và nút mở chat mới; không âm thầm mở latest.
- Sidebar có Agent. URL thay đổi khi chọn/tạo hội thoại; Back/Forward mở đúng hội thoại và đi qua kiểm tra bản nháp. Tạo mới/chuyển hội thoại bị khóa khi đang gửi hoặc khôi phục lượt pending.
- Desktop từ 1280px: lịch sử 240px, chat co giãn, panel context/results 320px có thể đóng. 768–1279px: lịch sử 220px, panel phải thành drawer. Dưới 768px: một cột chat, hai nút mở lịch sử/ngữ cảnh bằng drawer. Nội dung không tràn ngang ở 390px.
- History tìm theo tiêu đề trên toàn bộ danh sách hiện được endpoint lịch sử trả về; ghi rõ phạm vi này trong UI nếu backend giới hạn danh sách. Không giới thiệu full-text search tin nhắn.
- Empty state có gợi ý “Lập kế hoạch hôm nay”, “Chia nhỏ công việc”, “Xem việc cần ưu tiên”; chọn gợi ý điền composer, không gửi tự động.
- Composer giữ attachments, slash menu, Auto/Ask; error có hành động retry theo requestId cũ. Không tự khởi tạo request mới cho một kết quả chưa rõ.
- Nhãn trạng thái: đang tải, đang xử lý, cần câu trả lời, hoàn tất, lỗi. Khi backend chỉ cung cấp processing thì hiện “Đang xử lý”, không dựng tiến trình từng tool giả.
- Drawer có tên accessible, Escape để đóng, focus trap và trả focus về nút mở. Chat page là main content, không trap focus toàn trang. Thông báo trạng thái dùng live region không đọc lại toàn bộ lịch sử.

## Một phiên chat dùng chung

Đưa ownership của hook chat vào `AgentSessionProvider` dưới protected layout; chat nổi và Agent page chỉ là hai view của cùng phiên. Chỉ một view được mount tương tác: khi `/agent` hoặc route con đang mở, không render ChatBubble. Tránh hai lần load/send/recovery.

Draft text và files chưa upload chuyển lên provider dưới dạng state trong bộ nhớ, phân biệt theo conversationId; composer nhận controlled value. Không lưu File hoặc nội dung bản nháp vào localStorage. Chuyển từ bubble sang page giữ conversation, draft, mode, attachments, pending interaction và A2UI draft bằng cách đặt state chỉnh proposal trong session theo proposalId (không chỉ giữ dirty boolean). Reload không giữ bản nháp chưa lưu; beforeunload cảnh báo khi có bản nháp. Logout/sessionRevision đổi phải reset session, cache và draft; response cũ không được cập nhật account mới.

Rời hội thoại hoặc ra khỏi Agent khi đang có draft dùng dialog bỏ thay đổi hiện có được mở rộng cho text/files/proposal; cancel giữ nguyên URL và nội dung. Riêng chuyển bubble → page cùng hội thoại không coi là bỏ draft. Đi ra trang khác vẫn giữ cùng phiên ở bubble; chỉ chuyển conversation mới phải hỏi bỏ draft. Browser Back/Forward dùng blocker của data router để tránh URL và session lệch nhau.

## Ngữ cảnh project

Thêm `contextProjectId: ObjectId | null` vào Conversation, mặc định null. UI gọi `PATCH /api/ai/conversations/:conversationId/context` với `{ projectId: string | null }`; response `{ data: { conversationId, contextProjectId } }`. Dùng protect, Zod strict body và validatedBody. Chỉ chủ hội thoại được sửa; project phải thuộc chính user. Không tạo quyền truy cập hội thoại người khác cho admin.

Context là gợi ý cho Agent, không phải giới hạn quyền hay lệnh gán project cho mọi task. System guidance nêu project đang chọn, user có thể chỉ định project khác nếu họ có quyền. Không nạp toàn bộ task vào prompt; Agent dùng tools hiện có khi cần.

Context chỉ đổi khi hội thoại không có active execution lease. Cập nhật context và claim lượt dùng cùng cơ chế concurrency của Conversation: hoặc PATCH thắng trước claim và lượt dùng giá trị mới, hoặc PATCH nhận 409 CONVERSATION_BUSY. Khi claim, chụp `contextProjectId` vào ChatTurn để retry dùng đúng ngữ cảnh ban đầu. Pending payload không cần client tự gửi lại context. Project bị xóa/mất quyền trước lượt mới: trả context null kèm trạng thái unavailable để UI thông báo; không dùng metadata cũ. Project completed vẫn được chọn để trao đổi, nhưng tool tạo/gán task tiếp tục từ chối theo domain invariant.

GET conversation bổ sung `context: { projectId: string | null, available: boolean }`; hội thoại cũ trả null/true. Client không cần migrate dữ liệu. Lỗi: 400 body/ID sai, 401 hết session, 404 hội thoại/project không được truy cập, 409 busy, lỗi mạng giữ lựa chọn đã xác nhận trước đó.

## Panel kết quả và hợp đồng dữ liệu

Bổ sung `activities` vào GET conversation và response lượt gửi; default `[]` cho dữ liệu cũ. Mỗi item có `{ id, requestId, toolCallId, kind, status, title, resourceType?, resourceId?, occurredAt }`. `kind` là `task_created | task_updated | proposal_created`; `status` là `succeeded | failed | unknown`. Chỉ success có resourceId đã xác minh. `proposal_created` là bản nháp đề xuất, không đồng nghĩa task đã được tạo.

Backend tạo activity từ kết quả tool/commit proposal thực tế, không parse văn bản model. Proposal activity được dựng từ bản ghi TaskProposal đã commit (lưu createdRequestId khi confirm), không ghi phụ trong transaction; GET và replay dựng lại cùng ID từ nguồn dữ liệu bền vững. Persist cùng checkpoint sau kết quả tool với executionToken và deduplicate theo `(requestId, toolCallId, kind, resourceId)`; proposal apply dùng action/request ID bền vững tương ứng. Response cuối thất bại vẫn giữ activity đã xác nhận. Kết quả write chưa rõ không được báo success hoặc tự phát lại write. GET lịch sử chỉ trả activities của cùng trang turns đang tải; load earlier merge theo id.

Dùng adapter allowlist để lấy tên hành động và ID từ kết quả tool; không gửi raw payload, tool trace hay lỗi nội bộ. Panel hiện task đã tạo/cập nhật và mở task qua cơ chế task detail hiện có (fetch lại có ownership check); task đã xóa hiện “Không còn khả dụng”. Với lượt cũ không có activity, hiện “Chưa có kết quả thao tác” và giữ nguyên nội dung chat. Đây là danh sách kết quả đã biết, không phải live execution trace.

## Kiến trúc và biên thay đổi

Feature mới ở `frontend/src/features/agent/`: routes, AgentPage, AgentSessionProvider, history/context/activity components và CSS dùng token Orbit hiện có. Tái sử dụng ChatField và các renderers hiện tại qua provider; không di chuyển toàn bộ thư mục chat chỉ để đổi tên.

API đi qua `frontend/src/shared/services/aiService.ts`, kiểu ở `shared/types/domain.ts`. Backend giữ route → validation/controller → service → repository → model. Tạo service/activity utility nhỏ để tránh nhồi projection vào agentService. Không thêm dependency nếu tooling hiện tại đủ dùng.

## Acceptance criteria / test matrix

| ID  | Điều kiện phải đạt                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | Guest vào /agent được redirect login; account A không mở conversation/project của B qua ID trực tiếp.                                                                                   |
| W2  | Deep link tải đúng hội thoại ngay lần đầu, không flash/latest fetch; Back/Forward đúng, invalid ID không fallback.                                                                      |
| W3  | Bubble → page giữ draft text/files/proposal, mode, menu và conversationId; chỉ một request/session owner. Logout trong request không rò dữ liệu sang session mới.                       |
| W4  | New/select conversation có discard guard; cancel giữ URL/draft; history search không bỏ mất selection.                                                                                  |
| W5  | Auto/Ask, attachments, retry cùng requestId, pending recovery, pagination và A2UI apply không hồi quy.                                                                                  |
| W6  | Project context lưu qua reload, claim chụp đúng context, PATCH đồng thời nhận 409 khi bận; project mất quyền không được dùng; completed project giữ quy tắc task hiện tại.              |
| W7  | Chỉ kết quả được xác nhận tạo activity success; duplicate retry/checkpoint không nhân đôi; lỗi final response không xóa success đã có; proposal draft không được gắn nhãn task created. |
| W8  | Layout 1440/1024/390px dùng được, không overflow; drawer keyboard/focus đúng; status accessible.                                                                                        |
| W9  | Trang khác vẫn có bubble, /agent không có bubble trùng; mở lại cùng hội thoại dùng chung lịch sử.                                                                                       |

## Verification và bàn giao

Viết test trước từng thay đổi, xác nhận fail vì thiếu behavior rồi implement. Dùng Vitest/Testing Library cho state/routing, backend tests cho ownership/concurrency/projection, Playwright cho flows W2–W9. Mock provider cho deterministic tests; một smoke thực tế với tài khoản test và AI đã cấu hình để kiểm tra lựa chọn context và kết quả tools. Nếu thiếu secrets/Mongo/browser, báo blocker riêng, không coi mock là kiểm chứng tích hợp thực tế.

Chạy backend build/test và frontend lint/build tối thiểu; thêm test/lint/format affected packages, frontend e2e. Format chỉ file liên quan. Không sửa .env thật, node_modules, dist hoặc lockfile bằng tay.
