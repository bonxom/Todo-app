# Đánh giá UI chatbot — 03/11/2026

Đã thao tác trên UI thật bằng Chromium/Playwright: mở chat, nhập bằng bàn phím, chọn skill, chuyển chế độ, mở rộng/dock, chọn tệp, tìm lịch sử, gửi lỗi và thử lại, xem Markdown và trả lời câu hỏi. Có 30 screenshot và số đo DOM trong `observations.json`.

**Bổ sung:** Đã kiểm thử riêng luồng Ask, thêm 19 ảnh và tìm thấy lỗi không phục hồi thẻ sau 422. Xem [báo cáo Ask](ASK-REVIEW.md).

**Phạm vi:** frontend local tại `http://localhost:5000`, dữ liệu tài khoản và phản hồi API được mô phỏng trong trình duyệt. Không kết nối AI/MongoDB thật, không ghi dữ liệu tài khoản thật. Đây là đánh giá hành vi và trình bày của frontend, không xác nhận tính đúng đắn của AI, tác vụ backend hay lưu trữ lâu dài. Desktop 1440×1000; mobile là viewport Chromium 390×844 và 390×500, chưa phải kiểm thử thiết bị/bàn phím ảo thực tế. Ảnh mobile chụp full-page nên có phần dashboard bên dưới viewport.

**Sau cải thiện:** [Kết quả triển khai, screenshot và tự đánh giá](AFTER-REVIEW.md).

## Nhận định

Giao diện có nền tảng tốt: màu xanh đồng bộ với dashboard, bong bóng phân biệt người dùng/trợ lý rõ, có nhiều chế độ cửa sổ và hỗ trợ nội dung phong phú. Tuy nhiên, chức năng bị giấu sau icon, thiếu hướng dẫn ban đầu và nhiều vùng UI cạnh tranh không gian. Vấn đề cần xử lý đầu tiên là độ rõ ràng của trạng thái, sau đó mới tinh chỉnh thẩm mỹ.

## Phát hiện và đề xuất

### P1 — Gửi câu trả lời thất bại nhưng thẻ vẫn hiện dấu tích

**Tái hiện:** có câu hỏi đang chờ → chọn “Công việc” → Send answer → API trả 503. Thẻ chuyển sang dấu tích xanh và “Bạn đã chọn Công việc”, trong khi phía trên báo lỗi. Không còn các lựa chọn để sửa ngay trên thẻ. [Ảnh lỗi](screenshots/24-answer-error-mobile.png).

Điều này dễ khiến người dùng hiểu rằng câu trả lời đã được hệ thống nhận. `InteractionCard.jsx` cập nhật `localSubmission` trước khi biết kết quả gửi; nhánh lỗi không hoàn nguyên trạng thái cục bộ.

**Cải thiện:** phân biệt “Đang gửi”, “Chưa gửi được”, “Đã gửi”. Giữ lựa chọn khi lỗi, đặt “Thử lại” và “Sửa câu trả lời” ngay trên thẻ. Chỉ hiển thị dấu tích hoàn tất sau phản hồi thành công. Kiểm thử cả chọn đáp án, xác nhận và hủy; lần audit này tái hiện lỗi ở chọn đáp án.

### P1 — Nút Gửi bị vô hiệu hóa nhưng vẫn trông như đang hoạt động

Khi ô nhập rỗng, DOM xác nhận `disabled: true`, nhưng nền vẫn xanh `rgb(69, 107, 140)` và icon trắng; trạng thái lỗi cũng có nút trông tương tự. [Ảnh màn hình trống](screenshots/02-empty-desktop.png), [ảnh gửi lỗi](screenshots/10-send-error.png).

**Cải thiện:** thống nhất style disabled trong component nút, loại trừ hover khi disabled và xử lý xung đột CSS giữa `.ui-btn-primary` với utility classes. Dùng màu nền trung tính và icon dịu hơn. Trong trạng thái lỗi, giải thích lý do bị khóa ngay gần vùng nhập.

### P1 — Mobile thiếu không gian nhập và đọc

Mở toolbar làm ô nhập chỉ còn **126 px**, placeholder xuống hai dòng. Khi focus vào ô nhập, toolbar tự đóng nên bố cục dịch chuyển ngay lúc bắt đầu gõ. [Ảnh toolbar](screenshots/17-mobile-toolbar.png).

Thẻ câu hỏi chiếm phần lớn cửa sổ; phải cuộn bên trong để xem lựa chọn cuối và câu trả lời tự nhập. Nút hành động vẫn được giữ ở đáy — đây là điểm tốt. [Ảnh câu hỏi](screenshots/23-question-mobile.png).

**Cải thiện:** mobile dùng chat toàn màn hình hoặc sheet gần toàn màn hình. Đưa đính kèm vào popover từ nút “+”; không cho toolbar đẩy co ô nhập. Tách thanh công cụ khỏi chiều ngang của textarea. Giữ composer cố định, chỉ một vùng cuộn chính khi có thể. Kiểm tra tiếp trên thiết bị thật khi mở bàn phím, xoay màn hình và phóng chữ.

### P2 — Auto/Ask và skill khó khám phá

Auto/Ask nằm sau dấu `>` và được biểu diễn bằng icon robot; trạng thái chủ yếu thể hiện qua màu, giải thích nằm trong tooltip. `/` mở được menu gym/ielts, chọn bằng ArrowDown + Enter hoạt động, nhưng màn hình ban đầu không gợi ý có chức năng này. [Toolbar desktop](screenshots/03-toolbar-desktop.png), [menu skill](screenshots/04-slash-desktop.png).

**Cải thiện:** hiển thị nhãn chế độ ngắn, ví dụ “Tự động” / “Hỏi để làm rõ”, cùng giải thích đúng theo hành vi thực tế của backend. Ask hỏi khi cần làm rõ hướng đi, không đảm bảo hỏi trước mọi lần ghi dữ liệu. Đưa skill vào menu có nhãn và gợi ý “Gõ / để chọn kỹ năng”. Không mặc định người dùng hiểu thuật ngữ Agent/Skill.

### P2 — Trạng thái trống chưa giúp người dùng bắt đầu

Một vùng lớn chỉ có “No messages yet. Start a conversation!” và placeholder “Ask something…”. Người mới không biết trợ lý hỗ trợ gì. [Ảnh](screenshots/02-empty-desktop.png).

**Cải thiện:** một câu giới thiệu bám đúng TodoApp và 3 gợi ý có thể bấm: “Lên kế hoạch hôm nay”, “Xem việc sắp đến hạn”, “Chia nhỏ một mục tiêu”. Chỉ quảng bá hành động đã được backend hỗ trợ. Khi có lịch sử, giữ gợi ý ngắn cùng nhóm hội thoại gần đây.

### P2 — Lịch sử không có lối vào rõ khi đang trò chuyện

Danh sách gần đây và tìm kiếm xuất hiện trong trạng thái không có tin nhắn; header cuộc trò chuyện chỉ có tạo mới, đổi kích thước và đóng. Muốn xem lịch sử, người dùng phải biết quay về trạng thái trống qua New chat. [Lịch sử](screenshots/14-recent-history.png), [tìm không có kết quả](screenshots/15-history-search-empty.png).

**Cải thiện:** thêm nút “Lịch sử” luôn truy cập được, hiển thị tên cuộc trò chuyện trong header. Cho phép tìm/chuyển hội thoại mà không phải tạo hội thoại mới trước.

### P2 — Nội dung dài bị bó trong bong bóng hẹp

Bảng phải cuộn ngang trong bong bóng; code chỉ thấy đoạn đầu; sơ đồ render được nhưng chữ rất nhỏ. Không ghi nhận tràn ngang toàn trang: document width vẫn 390 px. Đây là hạn chế khả năng đọc, không phải lỗi tràn viewport. [Bảng](screenshots/26-mobile-table-top.png), [code và sơ đồ](screenshots/19-mobile-rich-content.png).

**Cải thiện:** cho phản hồi trợ lý gần toàn chiều rộng trên mobile; bảng/code có dấu hiệu cuộn rõ; sơ đồ có nút mở lớn/phóng to. Với desktop mở rộng, giới hạn độ dài dòng bằng một cột nội dung ở giữa để tránh hai bên hội thoại cách nhau quá xa. [Chế độ mở rộng](screenshots/08-expanded.png).

### P2 — Đính kèm dễ tạo kỳ vọng sai về khả năng đọc tài liệu

Chọn tệp hiển thị chip và dòng giải thích rằng file chỉ được lưu tham khảo, trợ lý chưa đọc được; yêu cầu nhập thêm lời nhắn trước khi gửi. Có thông báo chặn định dạng không hỗ trợ. Đây là hành vi có giải thích, không nên báo thành lỗi “không gửi được tệp”. [Chọn tệp](screenshots/12-attachment-no-caption.png), [validation](screenshots/13-attachment-validation.png).

**Cải thiện:** nói rõ giới hạn này ngay trong menu đính kèm, trước lúc chọn file. Hiện loại tệp, giới hạn dung lượng/số lượng ở cùng nơi. Chỉ đổi thông điệp sang “Phân tích tài liệu” khi backend thực sự hỗ trợ đọc.

### P2 — Ngôn ngữ và luồng xác nhận thiếu nhất quán

Một thẻ có “Câu hỏi từ Agent”, “Nhắn tin”, “Other answer”, “Cancel”, “Send answer”; lịch sử dùng “Chats”, “Vừa xong”, “View all”. Xác nhận một hành động duy nhất vẫn yêu cầu chọn radio rồi bấm Confirm. [Câu hỏi](screenshots/21-question-desktop.png), [xác nhận](screenshots/28-confirmation.png).

**Cải thiện:** chọn một ngôn ngữ giao diện nhất quán. Với một hành động xác nhận, dùng trực tiếp CTA “Tạo 3 công việc” và “Hủy”, kèm bản tóm tắt tác động; không cần radio duy nhất. Dùng từ “Trợ lý” thay cho “Agent” ở giao diện phổ thông.

### P2 — Focus bàn phím đi vào điều khiển không nhìn thấy

Sau khi mở chat, focus ở BODY. Focus ô nhập rồi Shift+Tab đi vào select “Agent mode” được đặt trong `sr-only`, thay vì một điều khiển nhìn thấy. [Số đo](observations.json), [ảnh](screenshots/30-keyboard-focus.png).

**Cải thiện:** chuyển focus hợp lý khi mở/đóng; bỏ điểm dừng Tab ẩn hoặc đưa select chế độ ra hiển thị. Kiểm tra thứ tự Tab cho toolbar đóng và menu skill. Chưa thực hiện audit screen reader hay đánh giá WCAG đầy đủ.

### P3 — Hoàn thiện phân cấp thị giác và dark mode

Timestamp đầy đủ ngày/giờ dưới mọi tin nhắn tạo nhiều thông tin phụ. Dark mode đã đổi nền chat, nhưng input/nút header sáng nổi rõ so với mặt nền; bong bóng user xanh sáng với chữ trắng cần đo tương phản trước khi chốt palette. [Ảnh tối](screenshots/27-dark-mobile.png). Không kết luận đạt/trượt chuẩn tương phản vì chưa đo.

**Cải thiện:** nhóm theo ngày, chỉ hiển thị giờ ngắn dưới tin nhắn; dùng token dark cho input/button nhất quán. Giữ màu xanh nhận diện hiện tại, giảm viền lồng nhau. Chấm xanh cạnh tên trợ lý vẫn xuất hiện khi API lỗi; nếu không phản ánh kết nối thật, bỏ hoặc thay bằng trạng thái có nghĩa rõ.

## Những điểm hoạt động tốt trong lần thử

- Đóng/mở chat **giữ bản nháp**; không ghi nhận mất bản nháp ở thao tác này.
- Chuyển compact → expanded → docked → compact hoạt động; dock dành lại không gian cho dashboard.
- Chọn skill bằng bàn phím, đổi Auto/Ask và Shift+Enter xuống dòng hoạt động.
- Tìm lịch sử không có kết quả có thông báo; Escape đóng phần tìm kiếm.
- Gửi lỗi có Retry message/Reload conversation; thử lại tin nhắn thường thành công khi API mô phỏng được phục hồi.
- Markdown bảng, code và Mermaid render được; không có JavaScript `pageerror` trong kịch bản hoàn tất.

## Hướng thiết kế đề xuất

Giữ phong cách xanh nhẹ của TodoApp. Desktop dùng panel bên phải cho thao tác nhanh; chế độ mở rộng phục vụ đọc nội dung dài. Mobile chuyển sang màn hình chat riêng.

```text
[‹] Trợ lý / Tên cuộc trò chuyện     [Lịch sử] [+]
    [Tự động ▾]  Giải thích chế độ khi cần
──────────────────────────────────────────────
    Gợi ý bắt đầu / hội thoại
    Thẻ hành động: xem trước → xác nhận → kết quả
    Lỗi gắn ngay với tin nhắn hoặc hành động
──────────────────────────────────────────────
    [Tệp đã chọn / kỹ năng đã chọn]
    [Nhập yêu cầu…                         ]
    [+ Đính kèm] [Kỹ năng]           [Gửi ↑]
```

Thứ tự triển khai: (1) trạng thái gửi/lỗi và disabled/focus; (2) composer mobile, chế độ và lịch sử; (3) empty state, rich content, ngôn ngữ và dark mode. Đây là hướng cải thiện, chưa phải spec/plan triển khai tính năng.

## Kiểm chứng và giới hạn

Lệnh đã chạy:

```bash
cd frontend && pnpm dev
python3 -m venv /tmp/todo-ui-audit-venv
/tmp/todo-ui-audit-venv/bin/pip -q install playwright
/tmp/todo-ui-audit-venv/bin/python /tmp/todo_chat_audit.py
```

Kịch bản cuối hoàn tất, tạo 30 ảnh, không có `pageerror`. Lượt đầu bị timeout do route mock chặn nhầm module frontend; đã sửa bộ kiểm thử để chỉ intercept đường dẫn bắt đầu `/api/`, rồi chạy lại. Đây không phải lỗi sản phẩm.

Chưa kiểm tra: đăng nhập thật, nội dung phản hồi AI thật, upload/download qua backend, streaming/chờ lâu/timeout thực tế, phân trang lịch sử dài, kéo resize, copy clipboard, hủy/xác nhận thành công với backend, trình duyệt khác, thiết bị cảm ứng thật và screen reader. Không chạy unit test/lint/build vì chỉ thêm tài liệu và ảnh audit, không thay đổi mã ứng dụng. Không tuyên bố toàn bộ sản phẩm đã pass kiểm thử.

Toàn bộ ảnh được liệt kê trong [gallery](gallery.md). Script tái hiện nằm ở [audit.py](audit.py), dùng Python Playwright và Chromium đã cài; có thể cấu hình `AUDIT_URL`, `AUDIT_OUT`, `AUDIT_CHROMIUM` qua biến môi trường.
