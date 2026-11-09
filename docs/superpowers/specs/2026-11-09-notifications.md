# Thông báo deadline trong ứng dụng

Ngày: 2026-11-09. Trạng thái: đã triển khai; xem báo cáo kiểm chứng trong `docs/deployment/notifications-verification.md` để biết các cảnh báo baseline.

## Mục tiêu và phạm vi đã thống nhất

Thêm chuông, số chưa đọc và lịch sử thông báo trong TodoApp. Nhắc sắp đến hạn trước 10 giờ và nhắc quá hạn; mỗi loại chỉ một lần cho mỗi deadline. Dữ liệu được lưu trên server và dùng chung giữa các phiên đăng nhập.

Không bao gồm email, Web Push, thông báo hệ điều hành, realtime qua socket, nhắc lại sau, cấu hình thời gian nhắc, tổng hợp hằng ngày hoặc thông báo AI.

## Quy tắc tạo thông báo

- Chỉ xét task `pending` hoặc `in-progress` có `dueDate` hợp lệ.
- `due_soon`: `dueDate - 10 giờ <= now < dueDate`.
- `overdue`: `now >= dueDate`. Không phụ thuộc cờ `isOverDue` có thể chưa được cập nhật.
- Mỗi khóa `(recipientId, taskId, type, dueAt)` chỉ có một bản ghi. Unique index trong MongoDB bảo đảm chạy lại, nhiều tab và nhiều tiến trình không tạo trùng.
- Tạo task còn dưới 10 giờ: tạo `due_soon` ở lần quét kế tiếp. Task đã quá hạn: chỉ tạo `overdue`, không gửi bù `due_soon`.
- Task hoàn thành, từ bỏ hoặc bỏ deadline: không tạo thêm thông báo. Lịch sử đã tạo vẫn được giữ.
- Đổi deadline: xét theo thời điểm mới. Đổi trở lại đúng một deadline từng nhắc không nhắc lại loại đã gửi. Mở lại task cũng không đặt lại khóa chống trùng.
- Khi tiến trình dừng rồi chạy lại, chỉ xét trạng thái và deadline hiện tại; không phát lại các mốc đã bỏ lỡ.
- Lần triển khai đầu cũng xét task đang hoạt động đã quá hạn, một thông báo cho mỗi task; không phát sinh toast hàng loạt.

## Thời gian và quyền sở hữu

So sánh bằng thời điểm UTC đã lưu trong `dueDate`, hiển thị theo múi giờ trình duyệt và ngôn ngữ hiện tại. Không đổi cách chuẩn hóa ngày của task trong tính năng này. Hiện backend chuyển đầu vào chỉ có ngày thành 00:00 theo múi giờ server; deadline đó vẫn được dùng nguyên trạng, không tự chuyển thành cuối ngày. Kiểm thử phải ghi rõ hành vi này.

Task không có `userId`. Người nhận được suy ra từ chủ category và project hiện tại, loại trùng cùng một user; admin không tự nhận thông báo của mọi người. Task không có chủ hợp lệ bị bỏ qua. Các truy vấn đọc/sửa thông báo luôn giới hạn theo user đang đăng nhập, kể cả admin.

Trước khi tạo phải kiểm tra lại trạng thái, deadline và người nhận hiện tại. Thay đổi task đồng thời với lần quét có thể để lại thông báo phản ánh trạng thái ngay trước thay đổi; thông báo không được dùng làm bằng chứng quyền truy cập hiện tại. Khi mở task luôn dùng kiểm tra quyền hiện có.

## Trải nghiệm

- Gắn chuông vào `frontend/src/shared/components/Topbar.jsx`, dùng được trên desktop/mobile, giao diện sáng/tối.
- Badge ẩn khi bằng 0; hiển thị `99+` khi vượt 99, tên truy cập vẫn đọc được số thật.
- Bảng chuông hiển thị 10 thông báo mới nhất, thời điểm, loại và trạng thái đã đọc, cùng liên kết tới `/notifications`.
- Trang lịch sử: 20 mục mỗi trang, mới nhất trước; thứ tự phụ theo ID để ổn định khi trùng thời gian. Bộ lọc Tất cả/Chưa đọc, nút Đánh dấu tất cả đã đọc.
- Bấm một mục: đánh dấu đã đọc và mở chi tiết task bằng luồng hiện có. Bổ sung deep link `/dashboard?taskId=<id>` nếu luồng hiện tại chưa hỗ trợ; tải task qua API có xác thực.
- Task đã xóa hoặc không còn quyền truy cập: thông báo nhẹ rằng task không còn khả dụng, giữ người dùng trong ứng dụng. Nội dung lịch sử không cập nhật theo tên task mới.
- Có trạng thái đang tải, trống, lỗi và thử lại. Không biến lỗi API thành số chưa đọc bằng 0. Đánh dấu đã đọc lỗi phải giữ/khôi phục trạng thái trước đó.
- Hỗ trợ bàn phím, Escape, trả focus về chuông khi đóng, nhãn trợ năng và bản dịch trong các locale hiện có.
- Lấy dữ liệu khi phiên xác thực sẵn sàng, khi mở chuông, khi quay lại tab; cập nhật số chưa đọc mỗi 60 giây khi tab đang hiển thị. Dừng polling và xóa cache theo user khi đăng xuất/đổi tài khoản.

## Dữ liệu và API đề xuất

Collection `Notification`: `recipientId`, `taskId`, `type` (`due_soon | overdue`), `dueAt` (bản sao deadline), `taskTitle` (bản sao tiêu đề), `readAt` (nullable), `createdAt`, `updatedAt`.

Index chống trùng như trên; index phục vụ lịch sử `(recipientId, createdAt, _id)` và chưa đọc `(recipientId, readAt, createdAt)`. Không dùng TTL ở bản đầu vì xóa bản ghi có thể làm mất dấu chống trùng.

- `GET /api/notifications?pageNo=1&pageSize=20&filter=all|unread`: trả phân trang theo envelope hiện có, mỗi mục chứa ID, loại, taskId, taskTitle, dueAt, createdAt, readAt. Page size tối đa 100; query sai trả 400.
- `GET /api/notifications/unread-count`: trả `{ count: number }` trong envelope API hiện có.
- `PATCH /api/notifications/:id/read`: đánh dấu một mục đã đọc, gọi lại vẫn thành công và giữ `readAt` đầu tiên. ID sai định dạng trả 400; không tồn tại/không thuộc user trả 404.
- `PATCH /api/notifications/read-all`: cập nhật các mục chưa đọc của user có `createdAt <=` thời điểm server bắt đầu xử lý; mục phát sinh sau đó vẫn chưa đọc. Trả số mục thay đổi.

Các route yêu cầu `protect`; đặt route `read-all` trước route tham số. Không cho client truyền recipientId. Giữ luồng route → validation → controller → service → repository → model, dùng AppError và convention import `.js` hiện tại. API đọc không tự tạo thông báo.

## Tác vụ nền và triển khai

Một script chạy một lượt, ví dụ `backend/scripts/generate-notifications.ts`, gọi service tạo thông báo, xử lý task theo batch 200 và kết thúc. Scheduler bên ngoài gọi mỗi phút; không dùng timer phụ thuộc Express hoặc request trong môi trường serverless. Tái sử dụng khởi tạo môi trường/database hiện có và đóng kết nối khi kết thúc.

Trong Docker, bổ sung service worker chạy cùng backend image, gọi lượt quét mỗi 60 giây, không chồng lượt trong cùng worker, hỗ trợ dừng khi nhận SIGTERM. Ngoài Docker, tài liệu hướng dẫn scheduler gọi cùng script mỗi phút; môi trường chỉ chạy HTTP server không bảo đảm sinh thông báo.

Upsert với `$setOnInsert` và unique index; duplicate key do chạy đồng thời được xem là đã xử lý, các lỗi database khác phải báo lỗi và thử lại lượt sau. Lỗi một batch không được báo cả lượt thành công. Không ghi secret hoặc nội dung task vào log. Không thêm Redis hay message broker.

Khi worker khỏe, mục đủ điều kiện được tạo trong lượt quét tiếp theo; giao diện nhận ở lần refresh/poll kế tiếp. Khoảng trễ danh nghĩa tối đa khoảng hai phút, không cam kết giao đúng giây khi hệ thống gặp lỗi.

## Tiêu chí nghiệm thu và kiểm thử

1. Dùng clock cố định: trước ngưỡng 10 giờ 1 ms không nhắc; đúng ngưỡng nhắc một lần; trước deadline 1 ms chỉ sắp đến hạn; đúng deadline nhắc quá hạn.
2. Quét lặp, quét đồng thời và restart không tạo trùng; kiểm tra unique index/upsert trên MongoDB thật trong integration test.
3. Task không deadline, hoàn thành, từ bỏ không sinh thông báo; task mới dưới 10 giờ và task đã quá hạn tuân thủ quy tắc trên.
4. Đổi/xóa deadline, đổi trở lại deadline cũ, mở lại task, task bị xóa và thay đổi đồng thời với lượt quét đều có regression test.
5. Chủ category/project được suy ra đúng và loại trùng; không rò thông báo qua list/count/read/read-all giữa user, kể cả admin.
6. Phân trang, lọc chưa đọc, đánh dấu từng mục/tất cả, thao tác lặp và thông báo mới xuất hiện trong lúc read-all hoạt động đúng.
7. Badge, bảng chuông, trang lịch sử, lỗi/thử lại, task không còn khả dụng, deep link và cache đổi tài khoản có test frontend.
8. Polling dừng khi tab ẩn/đăng xuất, chạy lại khi quay về; refetch sau thao tác đọc đồng bộ badge và lịch sử.
9. Browser verification: mobile/desktop, sáng/tối, các locale hiện có, bàn phím/focus và luồng đăng nhập → chuông → task → lịch sử.
10. Kiểm tra cùng thời điểm với offset khác nhau cho cùng kết quả; ghi nhận rõ hành vi đầu vào chỉ có ngày theo chuẩn hóa hiện tại.

## Quy trình triển khai

Sau khi rà soát spec, lập plan có đường dẫn file và test cụ thể. Viết/chạy test đỏ trước code, rồi test xanh, regression, lint, format check và build/type-check. Cả hai package hiện đã có Vitest, ESLint và Prettier; frontend có Playwright.

Lệnh bắt buộc từ từng package: `pnpm test`, `pnpm run lint`, `pnpm run format:check`, `pnpm run build`. Frontend thêm `pnpm run test:e2e` cho ca thông báo; integration MongoDB phải báo riêng nếu thiếu môi trường. Không tuyên bố hoàn tất khi kiểm tra bắt buộc bị bỏ qua hoặc thất bại. Chỉ format các file liên quan, không sửa secret hay thay đổi người dùng.
