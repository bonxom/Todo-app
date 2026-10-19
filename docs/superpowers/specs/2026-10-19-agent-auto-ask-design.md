# Agent Auto/Ask và grill_user

Ngày: 2026-10-19. Trạng thái: thiết kế chi tiết để review trước khi triển khai.

## Hành vi đã chốt

- Auto là mặc định và giữ hành vi chat hiện tại.
- Ask được tự đọc dữ liệu và trả lời câu hỏi thông tin. Agent dùng grill_user khi cần người dùng chọn hướng hoặc bổ sung thông tin; luôn yêu cầu xác nhận trước mỗi thao tác thay đổi dữ liệu nghiệp vụ.
- Việc lưu lịch sử chat, checkpoint và câu trả lời không thuộc thao tác nghiệp vụ cần xác nhận.
- Chọn hướng lập kế hoạch không phải xác nhận ghi dữ liệu. Lời yêu cầu ban đầu cũng không thay thế bước xác nhận trong Ask.
- Phạm vi là Agent trong tab Chat. Tab Tasks/generate-tasks giữ hành vi riêng hiện tại; selector Auto/Ask chỉ xuất hiện trong Chat.

## Kiến trúc

Mở rộng vòng lặp chatWithMcp và checkpoint MongoDB hiện có. Không giữ HTTP request hoặc MCP connection mở khi chờ người dùng. Tách runner để bắt đầu và tiếp tục cùng một ChatTurn; mỗi lần tiếp tục tạo MCP context theo người dùng đã xác thực.

grill_user là tool nội bộ của Agent, được đăng ký trong danh sách function tools của Ask và xử lý bởi runner. Không công khai nó qua MCP server bên ngoài. Các MCP tools nghiệp vụ vẫn dùng service và ownership checks hiện có.

Phương án JSON menu trong tin nhắn thông thường đơn giản hơn nhưng không giữ rõ tool-call continuation. Một workflow engine riêng tăng phụ thuộc không cần thiết. Chọn trạng thái bền vững trong ChatTurn hiện có.

## Hai loại tương tác

### Làm rõ yêu cầu

Model gọi grill_user với question, options gồm 2–4 phần tử { id, label, description? }, allowCustomAnswer. Mỗi lần một câu hỏi, chọn một option hoặc nhập câu trả lời khác. Backend kiểm tra giới hạn độ dài, ID duy nhất và sinh interactionId; model không được tự cấp quyền thực thi.

Backend lưu assistant tool call nhưng chưa tạo tool result khi đang chờ. Khi trả lời, append role=tool với đúng tool_call_id và câu trả lời đã kiểm tra, sau đó tiếp tục model. Nội dung trả lời là dữ liệu người dùng, không phải chỉ thị hệ thống.

### Xác nhận thay đổi dữ liệu

Backend áp dụng cổng kiểm soát ngay trước thực thi tool ghi; prompt không phải cơ chế bảo đảm. Danh sách phân loại tool nội bộ xác định read/write, tool chưa được phân loại bị từ chối trong Ask.

Khi gặp orbit_create_task hoặc orbit_update_task chưa được duyệt, runner giữ lại lệnh và gọi handler grill_user để tạo interaction xác nhận. Menu do backend tạo từ arguments đã validate, hiển thị task/đối tượng và mọi giá trị sẽ ghi hoặc xóa, có lựa chọn Xác nhận và Hủy. Không cho free text được tính như xác nhận. Các ID liên quan được giải nghĩa thành tên dễ hiểu bằng dữ liệu người dùng có quyền đọc.

Interaction lưu tên tool, arguments chính xác, tool_call_id, idempotencyKey, fingerprint và bản tóm tắt đã hiển thị. Xác nhận chỉ cho phép thực thi đúng lệnh được lưu, không cho model tái tạo arguments sau khi user duyệt. Lệnh đổi nội dung cần xác nhận mới. Backend chuẩn hóa arguments trước khi hiển thị và giữ nguyên qua thực thi; không tự suy luận thêm thay đổi sau xác nhận.

Khi user xác nhận, backend kiểm tra lại quyền và điều kiện nghiệp vụ, thực thi lệnh đã lưu, ghi tool result cho lệnh gốc rồi tiếp tục model. Nếu đối tượng hoặc điều kiện làm nội dung xác nhận không còn đúng, dừng và yêu cầu xác nhận mới. Từ chối/hủy không thực thi lệnh và kết thúc lượt; các thao tác trước đó đã thành công không bị rollback.

Xác nhận do runner tạo là interaction nội bộ gắn với write tool đang chờ; không giả mạo assistant tool call grill_user trong lịch sử provider. Cả hai loại interaction dùng chung handler/persistence/UI grill_user.

## Trạng thái và đồng thời

ChatTurn bổ sung mode (auto/ask), status awaiting_user/cancelled, interactions và thông tin continuation. Interaction lưu kind, ID, câu hỏi/options, trạng thái pending/answered/cancelled, câu trả lời, answerRequestId và thời điểm. Thông tin write approval chỉ ở backend, frontend không gửi lại arguments để thực thi.

Luồng: processing → awaiting_user → processing → completed/failed; awaiting_user → cancelled. Một lượt có thể có nhiều lần hỏi nối tiếp. Mode được snapshot lúc gửi; đổi mode chỉ áp dụng lượt tiếp theo. Request trùng ID nhưng khác mode hoặc payload trả conflict; các bản ghi cũ thiếu mode được hiểu là auto.

Tách execution lease 5 phút khỏi trạng thái chờ con người. awaiting_user không tự hết hạn theo lease và không thể bị claim của lượt mới ghi đè. Conversation giữ activeTurn trong khi chờ. Trả lời hoặc hủy phải là cập nhật nguyên tử theo user, conversation, turn, interaction và trạng thái pending. Hai tab hoặc hai lần bấm chỉ một bên được tiếp tục.

Retry cùng answerRequestId và cùng nội dung trả lại trạng thái/kết quả đã lưu; cùng ID khác nội dung trả conflict. Mỗi lần resume cấp execution lease mới. Worker cũ không được checkpoint hoặc finish khi mất lease; sử dụng execution token để ràng buộc các cập nhật.

Tiếp tục từ checkpoint và tool-call cursor; tuyệt đối không chạy lại toàn bộ lượt. Checkpoint trước/sau tool và idempotencyKey hiện có được giữ. Nếu crash khiến kết quả write không chắc chắn, không tự chạy lại bằng key mới; báo gián đoạn như hiện tại hoặc truy hồi kết quả qua cơ chế idempotency hiện có.

Trong Ask yêu cầu model gọi một tool mỗi lần. Runner vẫn xử lý an toàn response có nhiều tool calls: thực thi tuần tự, lưu cursor, dừng ngay tại interaction và chỉ chạy phần còn lại sau khi nhận trả lời. Mỗi write tiếp theo cần xác nhận riêng. Khi hủy, đóng các tool calls chưa thực thi bằng kết quả cancelled/skipped trước khi đưa lượt vào history.

Không đưa lượt awaiting_user qua prepareHistory hiện tại vốn tự điền kết quả gián đoạn cho tool chưa có result. Resume dùng messages nguyên trạng của lượt đang chờ cộng lịch sử các lượt trước. Giữ giới hạn vòng lặp theo mỗi đoạn thực thi và giới hạn tổng số câu hỏi/tool calls của một lượt để tránh vòng lặp vô hạn; dự kiến tối đa 10 interactions và 40 tool calls/lượt.

## API

- POST /api/ai/chat-mcp thêm mode, mặc định auto.
- Response giữ data cho text, thêm status và interaction khi awaiting_user; completed/failed giữ tương thích client Auto.
- POST /api/ai/conversations/:conversationId/interactions/:interactionId/answer nhận requestId và một trong optionId/customAnswer. Chỉ clarification cho phép customAnswer.
- POST /api/ai/conversations/:conversationId/interactions/:interactionId/cancel nhận requestId.
- GET conversation trả interactions và trạng thái active turn độc lập với phân trang messages; frontend chỉ nhận DTO cần hiển thị.
- Mọi endpoint yêu cầu auth, ownership, Zod validation. Interaction không thuộc user/conversation trả not found; stale hoặc đã trả lời bằng payload khác trả conflict.

## Giao diện

Selector Auto/Ask cạnh composer trong Chat; lưu lựa chọn theo conversation, server là nguồn dữ liệu khi khôi phục. Không đổi mode giữa lượt đang chạy/chờ; có thể hủy rồi đổi.

Question card hiển thị câu hỏi, options, mô tả, optional custom answer và nút Gửi/Hủy. Confirmation card hiển thị đầy đủ thay đổi và nút Xác nhận/Hủy. Dùng radio/button có keyboard navigation và accessible labels. Sau gửi, khóa card và giữ lựa chọn trong lịch sử.

Trong awaiting_user hiển thị Chờ bạn trả lời, bỏ typing indicator và khóa composer thường. Lỗi mạng giữ câu trả lời và requestId để retry. Khôi phục conversation hiện tại khi mở lại chat/tải lại trang; tránh reset khi chuyển giữa tab Chat và Tasks. Đổi tài khoản phải xóa state/cache của user cũ.

## Phạm vi mã nguồn

- Backend: aiService và runner/interaction handler mới; conversationService/repository; ChatTurn/Conversation; aiValidation, aiController, aiRoutes và error definitions.
- Frontend: shared types/domain và services/aiService; aiMutations; useConversationChat; SmallChat/ChatField; component interaction mới và CSS tương ứng.
- Giữ các sửa đổi đang có trong worktree, đặc biệt tool orbit_get_me và aiService; không đưa chúng vào commit tài liệu thiết kế.

## Tiêu chí kiểm thử

1. Auto mặc định và Auto explicit giữ hành vi hiện tại, không phát interaction.
2. Ask đọc dữ liệu không hỏi thừa; grill_user dừng thật, chưa chạy tool phía sau.
3. Write bị chặn ngay cả khi model bỏ qua hướng dẫn gọi grill_user; chưa duyệt thì DB nghiệp vụ không đổi.
4. Duyệt thực thi đúng payload đã hiển thị; khác payload/quyền/điều kiện không được dùng xác nhận cũ.
5. Resume giữ đúng tool-call pairing, cursor và kết quả tools đã chạy.
6. Double submit, concurrent tabs, HTTP retry và stale worker không gây hai lần thực thi.
7. Hủy, từ chối, lỗi provider/tool, tool batch và quá giới hạn có trạng thái kết thúc rõ ràng.
8. Reload khôi phục menu, câu trả lời và mode; user khác không truy cập được interaction.
9. Integration MongoDB kiểm tra transitions/locks; frontend kiểm tra lựa chọn, loading, retry, cancel và restore.

Sau triển khai chạy backend build/test; frontend test/lint/build. Integration cần MongoDB test phù hợp; báo rõ nếu môi trường chưa chạy được.
