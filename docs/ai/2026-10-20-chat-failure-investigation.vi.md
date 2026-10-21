# Điều tra lỗi chat ngày 20/10/2026

Đọc các ChatTurn đã lưu, không chỉnh sửa dữ liệu người dùng. Giờ dưới đây theo Asia/Bangkok.

## Bằng chứng

- 22:31:49: turn failed có assistant gọi `grill_user`; đối số kết thúc bằng `}]} ` (bỏ khoảng trắng cuối), trong khi object JSON đã đóng. JSON.parse báo ký tự thừa sau JSON. Code cũ ném lỗi và kết thúc cả lượt.
- 22:32:19: menu được tạo thành công và interaction sau đó chuyển thành answered.
- 22:33:00 và 22:33:33: hai turn failed chỉ lưu user message, mất khoảng 18,4 và 22,3 giây. Không có tool call mới được lưu. Không đủ bằng chứng xác định provider error hay phản hồi bị kiểm tra loại bỏ. Không phải đã chạm mốc timeout 45 giây của caller.
- 22:34:06: turn completed có hai lần đọc và sáu create tool call, sau đó có câu trả lời assistant.

Log cũ chỉ ghi mã lỗi chung; không có phản hồi provider bị từ chối để chứng minh hai lỗi 22:33 là do giới hạn batch. Không dùng lời giải thích của agent như log kỹ thuật.

## Sửa và tái hiện

- Bỏ kiểm tra cứng hơn 8 tool call trong một phản hồi. Test batch 10 create xác nhận tool chạy và model viết tổng kết.
- JSON hoặc menu schema sai được trả thành tool result INVALID_TOOL_ARGUMENTS, executed=false để model sửa. Không lặp lại tool đã thành công. Test tái hiện phần JSON thừa ở đuôi và xác nhận menu sửa được.
- Giới hạn tổng tool call chuyển sang yêu cầu model tổng kết (`tool_choice: none`) thay vì ném lỗi ngay sau khi thao tác đã thực hiện.
- Thêm log stage, step, tool, elapsedMs, errorType, providerStatus và providerCode; không ghi prompt, arguments, credentials hoặc response body.
- Prompt yêu cầu model không bịa nguyên nhân kỹ thuật từ thông báo lỗi chung trong lịch sử.

Backend typecheck đạt; 151 test pass, 41 integration test skip do thiếu MongoDB thử nghiệm. Không gọi model thực tế hoặc chạy lại mutation của người dùng trong quá trình điều tra.
