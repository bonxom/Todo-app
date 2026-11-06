# Personal Skills Architecture & Operational Reference

Ngày cập nhật: 2026-11-06.
Tham chiếu: `docs/superpowers/specs/2026-11-06-personal-skills.md`, `docs/superpowers/plans/2026-11-06-personal-skills.md`.

## 1. Ba lớp tách biệt (Three-Tier Separation)

1. **System & Server Rules**: Cấu hình server và prompt nền của Orbit, luôn áp dụng trước mọi chỉ dẫn khác. Trusted specialist tools và chính sách bảo mật thuộc quyền kiểm soát của server.
2. **Personal Skills**: Tài liệu Markdown do chủ tài khoản tạo và sở hữu tại `/agent/skills`. Chỉ là advisory context cho model; tuyệt đối **không** cấp thêm quyền tools, database hay bypass security policies.
3. **Templates**: Các mẫu read-only do nhà phát triển biên tập trong `backend/skills/templates/` (ví dụ: IELTS, Gym). User chủ động xem trước và nhập bản sao độc lập vào thư viện cá nhân.

## 2. API Quản lý Kỹ năng Cá nhân (`/api/ai/skills` & `/api/ai/skill-templates`)

| Phương thức | Đường dẫn                      | Tham số / Body                                                  | Kết quả             | Mô tả                                                                 |
| :---------- | :----------------------------- | :-------------------------------------------------------------- | :------------------ | :-------------------------------------------------------------------- |
| `GET`       | `/api/ai/skills`               | Không                                                           | `SkillSummary[]`    | Danh sách kỹ năng của người dùng (sort theo `updatedAt: -1, _id: 1`). |
| `POST`      | `/api/ai/skills`               | `{ name, description, instructions, enabled? }`                 | `SkillDetail` (201) | Tạo kỹ năng mới (atomic quota counter <= 50).                         |
| `GET`       | `/api/ai/skills/:skillId`      | UUID param                                                      | `SkillDetail`       | Xem chi tiết nội dung kỹ năng.                                        |
| `PUT`       | `/api/ai/skills/:skillId`      | `{ expectedVersion, name, description, instructions, enabled }` | `SkillDetail`       | Cập nhật kỹ năng; 409 nếu xung đột version.                           |
| `DELETE`    | `/api/ai/skills/:skillId`      | `?expectedVersion=<int>`                                        | `{ id }`            | Xóa kỹ năng và giảm quota trong transaction.                          |
| `GET`       | `/api/ai/skill-templates`      | Không                                                           | `TemplateSummary[]` | Danh sách mẫu kỹ năng sẵn có.                                         |
| `GET`       | `/api/ai/skill-templates/:id`  | Template slug                                                   | `TemplateDetail`    | Xem chi tiết nội dung mẫu kỹ năng.                                    |
| `POST`      | `/api/ai/skills/from-template` | `{ templateId, expectedTemplateVersion }`                       | `SkillDetail` (201) | Nhập bản sao độc lập từ mẫu.                                          |

## 3. Ranh giới Bảo mật & Giới hạn Thực thi (Security Boundaries)

- **Định danh UUID**: Mọi personal skill dùng UUIDv4; không bao giờ dùng tên hoặc display name để so khớp quyền.
- **Không bypass Trusted Gate**: Kỹ năng cá nhân dù có tên là `ielts` hoặc chỉ dẫn "bỏ qua quyền" vẫn không thể thỏa mãn yêu cầu của `specialist_tool` hay các công cụ yêu cầu trusted developer skill.
- **Snapshot bất biến trong lượt (Per-Turn Snapshot)**: Tại thời điểm bắt đầu lượt (`chatWithMcp`), hệ thống lấy snapshot các kỹ năng đang bật (`enabled: true`) của user. Thay đổi bật/tắt/sửa/xóa chỉ có hiệu lực từ lượt tiếp theo.
- **Discovery tự động qua list_skills**: Runtime chèn một cặp message tool call & tool result cho `list_skills` vào đầu lượt, cung cấp overview (tên, mô tả, phiên bản) cho model mà không tiêu tốn provider round nào và không gửi nội dung hướng dẫn khi chưa đọc.
- **Ngân sách ký tự 30.000 ký tự**: Giới hạn tối đa 30.000 ký tự hướng dẫn được nạp trong một lượt. Đọc lặp cùng một version của một skill không bị cộng trùng dung lượng. Nếu vượt quá, trả lỗi `SKILL_CONTENT_TOO_LARGE`.
- **Làm sạch lịch sử (History Sanitization)**: Khi chuẩn bị lịch sử cho các lượt kế tiếp, nội dung hướng dẫn của các lệnh `read_skill` ở các lượt trước sẽ được thu gọn chỉ còn metadata (`previouslyLoaded: true, validForCurrentTurn: false`) để tránh việc model tự động phát lại các chỉ dẫn cũ.

## 4. Giao diện & Trải nghiệm Người dùng

- `/agent/skills`: Trang danh sách kỹ năng, tìm kiếm theo thời gian thực, bật/tắt nhanh với thông báo "Thay đổi áp dụng từ lượt chat tiếp theo", mở Thư viện mẫu.
- `/agent/skills/new` và `/agent/skills/:skillId`: Trình soạn thảo Markdown với chế độ xem trước an toàn, bộ đếm độ dài (Tên: 80, Mô tả: 500, Hướng dẫn: 10.000), hộp thoại xác nhận khi hủy bản thảo và xử lý 409 conflict giữ lại nội dung người dùng đang nhập.
- `SkillReadBadge`: Hiển thị nhãn "Đã đọc: <Tên kỹ năng>" trên tin nhắn bot trong hội thoại, hỗ trợ mở liên kết đến kỹ năng và cảnh báo rõ ràng khi phiên bản hiện tại khác với phiên bản lúc đọc hoặc kỹ năng đã bị xóa.

## Rollout và vận hành

- Deploy backend additive API/model trước frontend. Không auto-seed IELTS/Gym hoặc chạy migration ghi user/hội thoại cũ.
- Create/import/delete yêu cầu MongoDB replica set hỗ trợ transaction. Không fallback sang ghi không transaction; driver retry transient transaction conflicts. Quota tính cả skill đã tắt.
- IELTS/Gym chỉ là templates opt-in trong chatbot. MCP `skill://ielts/...` và `skill://gym/...` giữ tương thích; không expose personal skills qua MCP resources. Trusted loader chỉ khả dụng với skill được developer cấu hình làm prerequisite của tool hiện có.
- Template version bao gồm metadata và Markdown; symlink thoát khỏi thư mục template bị từ chối. Import tạo bản sao độc lập, không tự đồng bộ khi template thay đổi.
- Edit/toggle/delete áp dụng từ lượt chat tiếp theo. Turn đang xử lý dùng snapshot riêng; full instructions từ turn cũ bị loại khỏi model history.
- UI giữ bản nháp khi refetch/conflict, dùng phiên bản gốc để save, yêu cầu xác nhận trước khi tải đè bản mới. Mutation hoàn tất sau đổi tài khoản không được phục hồi cache cũ hoặc chuyển trang tài khoản mới.
- Rollback frontend và runtime personal skills đồng bộ, giữ nguyên UserSkill/UserSkillQuota. Runtime cũ có thể phục hồi advisory catalog hệ thống; cần ghi rõ thay đổi này trong release note.

Kết quả review và kiểm thử: [Personal Skills review](2026-11-06-personal-skills-review.vi.md).
