# Personal Skills — Specification

Ngày: 2026-11-06. Trạng thái: thiết kế đề xuất; triển khai sau [Agent Workspace](2026-11-06-agent-workspace.md).

## Mục tiêu

User quản lý hướng dẫn riêng cho Orbit Agent tại `/agent/skills`; Agent khám phá overview rồi đọc nội dung khi cần. Chatbot vẫn có hướng dẫn nền do dev cấu hình, không hiện trong thư viện cá nhân. IELTS/Gym hiện là system advisory skills được chuyển thành templates opt-in, không tự thêm cho mọi user.

## Ba lớp tách biệt

1. Hướng dẫn/quy tắc hệ thống: nằm trong cấu hình server và prompt nền, luôn áp dụng; không expose qua API quản lý skill. Trusted developer tool prerequisites nếu có vẫn do server kiểm soát.
2. Personal skills: dữ liệu Markdown của chủ tài khoản, chỉ là advisory context. Không cấp tool, scope, quyền DB, quyền network hoặc khả năng chạy mã.
3. Templates: mẫu read-only do dev phát hành, user xem trước rồi thêm bản sao vào thư viện. Cập nhật template không ghi đè bản sao đã sửa.

Ưu tiên: system/domain/authorization → yêu cầu cụ thể hiện tại của user → personal skill phù hợp → lịch sử. Khi hai skills mâu thuẫn ảnh hưởng kết quả, Agent hỏi lại hoặc trình bày lựa chọn; không ngầm gộp chỉ dẫn trái nhau. Đây là guidance cho model; backend enforcement vẫn độc lập.

## Phạm vi

CRUD personal skills, bật/tắt, thêm từ templates IELTS/Gym, xem skill đã đọc trong hội thoại, discovery/read tools và ownership/version isolation. Chưa có chia sẻ công khai, marketplace, upload ZIP, chạy script, arbitrary filesystem paths, user-defined tools, multi-file editor, chọn skill riêng cho từng conversation hoặc Agent tự sửa skill qua tool.

Skill bật có thể áp dụng cho tất cả hội thoại của user khi phù hợp. Không nhồi toàn bộ nội dung skills vào system prompt. Việc đọc skill được ghi nhận là “Đã đọc”, không khẳng định model đã tuân thủ hoàn toàn.

## Model và validation

`UserSkill`: `_id` UUID string, `userId` ObjectId, `name` 1–80 ký tự sau trim, `description` 1–500, `instructions` 1–10000 ký tự sau trim, `enabled` boolean mặc định true, `version` integer bắt đầu 1, `sourceTemplateId?`, `sourceTemplateVersion?`, timestamps. Không lưu API key hoặc quyền tool trong schema. Body strict không nhận userId/version do client tự gán. Tên có thể trùng, identity là ID; UI phân biệt bằng mô tả. Giới hạn 50 skills/user, bao gồm disabled, enforce atomically khi tạo/import. Dùng quota counter riêng theo user trong transaction cùng insert/delete để không vượt giới hạn do concurrent requests; không dùng count-then-insert ngoài transaction.

PUT yêu cầu `expectedVersion` và đầy đủ name/description/instructions/enabled. Update điều kiện owner+version và tăng version. DELETE yêu cầu expectedVersion qua query, giảm quota trong cùng transaction. Xung đột trả 409, giữ draft để user reload/so sánh; không silently overwrite. Delete là hard delete; hoạt động đọc cũ chỉ giữ metadata, không cần giữ nội dung để mở lại phiên bản đã xóa.

Templates là catalog riêng `backend/skills/templates/`, manifest chứa id/name/description/version/entrypoint; version tính hash nội dung. IELTS nhập bản sao một Markdown tổng hợp từ SKILL.md và hai rubric có heading rõ ràng; Gym một Markdown. Kiểm tra nội dung tổng hợp <=10000 ký tự khi build/test; biên tập rút gọn nếu quá giới hạn, không cắt chuỗi tự động. Bản đầu không còn liên kết tài liệu filesystem bên trong nội dung user skill.

## API (authenticated, no-store)

Prefix `/api/ai`. Response thành công `{ data: ... }`, dùng error envelope chuẩn repository.

| Method/path                      | Request                                                         | Response data                                                 |
| -------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| GET /skills                      | Không có filter owner từ client                                 | `SkillSummary[]`, gồm cả disabled, sort updatedAt desc rồi id |
| POST /skills                     | `{ name, description, instructions, enabled? }`                 | SkillDetail, 201                                              |
| GET /skills/:skillId             | UUID param                                                      | SkillDetail                                                   |
| PUT /skills/:skillId             | `{ expectedVersion, name, description, instructions, enabled }` | SkillDetail                                                   |
| DELETE /skills/:skillId          | `?expectedVersion=<integer>`                                    | `{ id }`                                                      |
| GET /skill-templates             | Không                                                           | TemplateSummary[]                                             |
| GET /skill-templates/:templateId | slug từ catalog                                                 | TemplateDetail                                                |
| POST /skills/from-template       | `{ templateId, expectedTemplateVersion }`                       | SkillDetail, 201                                              |

SkillSummary = `{ id, name, description, enabled, version, updatedAt, sourceTemplateId?, sourceTemplateVersion? }`; SkillDetail thêm `instructions`. TemplateSummary = `{ id, name, description, version }`; TemplateDetail thêm instructions. Hai lần chủ động import cùng template tạo hai bản sao độc lập, UI không tự retry POST khi kết quả mạng chưa rõ; refresh danh sách để kiểm tra. Template version stale trả 409 yêu cầu preview lại.

401 chưa auth; 400 invalid/oversize/unknown fields; 404 cho skill thiếu hoặc không thuộc owner (kể cả admin); 409 version/template conflict; 409 SKILL_LIMIT_REACHED khi đủ 50; lỗi DB/network không đổi state đã lưu. Khai báo static routes trước `/:skillId` để không nuốt `from-template`.

## Agent tools và lifecycle

- `list_skills({})` → `{ skills: [{ id, name, description, version }] }`, chỉ enabled của user hiện tại, không có instructions hoặc system skills. Mô tả chứa when-to-use; không cần field taxonomy mới.
- `read_skill({ skillId, version })` → `{ id, name, version, instructions }`; ID và version phải có trong catalog snapshot của lượt đó. Sai owner/disabled/không tồn tại dùng lỗi không khả dụng chung; version không khớp trả SKILL_VERSION_CONFLICT, không âm thầm dùng bản khác.
- Không cung cấp tool `view_skil`; dùng list_skills/read_skill nhất quán. Personal skills chỉ có một document nên không cần read_skill_document cho user content.

Để discovery đáng tin cậy: runtime lấy enabled skill snapshot sau khi claim turn và trước provider round đầu; tạo internal list_skills tool exchange hợp lệ trong model messages (assistant tool call + tool result), vì vậy overview luôn sẵn mà không phụ thuộc model nhớ gọi. Không gọi provider thêm chỉ để list. Model vẫn có thể gọi list_skills; mọi lần gọi trong cùng execution trả catalog cache, không query DB lại. Một lần snapshot load tính vào thời gian budget; model-initiated calls vẫn tính vào tool-call cap hiện có.

Snapshot chứa metadata và nội dung server-side, giới hạn tổng 50 × 10000 ký tự; chỉ overview và documents được read mới gửi model. `read_skill` nhiều lần cùng ID/version trả cùng nội dung, không cộng trùng budget; giữ MAX_TURN_SKILL_CHARS = 30000. Không nạp skill tiếp nếu vượt budget; trả SKILL_CONTENT_TOO_LARGE để Agent yêu cầu thu hẹp, không truncate âm thầm. Lỗi lấy catalog khiến lượt fail retryable trước provider/write; không chạy như thể user không có skills.

Phiên bản ổn định trong lượt: edit/toggle/delete áp dụng từ lượt mới, lượt đang thực thi dùng snapshot đã lấy. UI ghi rõ “Thay đổi áp dụng từ lượt chat tiếp theo”. Snapshot không được tái sử dụng cho turn mới; retry request đã hoàn tất trả kết quả cũ; retry/recovery không được tự phát lại các writes đã checkpoint. Giữ nguyên chính sách lease/unknown outcomes hiện có. Nếu execution được khởi tạo lại hợp lệ thì tạo snapshot mới, không coi loaded skill từ lịch sử là current instruction.

Ẩn nội dung user skill cũ trong model history: giữ metadata read, không replay Markdown từ lượt trước làm instruction. User text/response bình thường vẫn giữ như hiện tại. Không thể thu hồi tri thức model đã dùng trong lượt đang chạy, nên không hứa disable có hiệu lực giữa lượt.

## Tool permissions và MCP compatibility

`agentSkillService` hiện kết hợp registry và request-bound execution gate; `agentService` hiện inject catalog từ filesystem vào prompt. Tách `personalSkillService` (CRUD/snapshot) và `agentPersonalSkillService` (tools/model context) khỏi trusted `agentSkillService`.

Giữ deny-by-default của `backend/skills/policy.ts`, quyền business tools, ownership, validation và các request-bound checks của trusted prerequisites. Không cho personal ID trùng slug `ielts` thỏa prerequisite trusted; sử dụng UUID và namespace origin rõ ràng. Test cố tình viết instructions “bypass permissions” hoặc tên “ielts” không được mở specialist_tool. Không xóa security tests chỉ để đổi architecture.

IELTS/Gym rời catalog mặc định của internal agent; không seed user skills, không sửa conversation cũ. MCP resources hiện có `skill://ielts/...` và `skill://gym/...` được giữ làm compatibility resources đọc mẫu dev, không tự grant execution hay enable personal skill. Adapter đọc template compatibility source; không expose UserSkill qua MCP resources. Trusted runtime fixtures/prerequisites được giữ riêng, không dùng user-imported template để mở khóa.

## Giao diện

Trong Agent thêm navigation Chat / Skills. `/agent/skills` có cards tên/mô tả/badge bật-tắt, search local toàn bộ thư viện tối đa 50, nút “Tạo skill” và “Thêm từ mẫu”. Empty state giải thích ngắn: skills giúp Agent theo hướng dẫn của bạn; không hiện system skills hay placeholder cho chúng.

Editor tại `/agent/skills/new` hoặc `/agent/skills/:skillId`: tên, mô tả có gợi ý khi nào dùng, Markdown instructions, toggle, Save, Delete. Preview dùng Markdown renderer an toàn hiện có; không thực thi HTML/script hoặc fetch link tự động. Validate inline với cùng giới hạn backend, confirm bỏ draft khi rời editor, confirm delete, busy state tránh double submit; lỗi giữ input. Version conflict có nút tải bản mới sau xác nhận bỏ draft, không ép overwrite.

Template gallery có preview nội dung và nút thêm; sau thành công mở bản sao để sửa. Toggle optimistic có rollback khi lỗi và version conflict. Cache key chứa userId/sessionRevision; logout dọn cache, không show thư viện account trước.

Chat hiển thị nhãn “Đã đọc: <name>” từ metadata backend, click mở skill hiện tại; nếu version khác thông báo “Hội thoại dùng phiên bản X”; nếu đã xóa hiện “Skill không còn khả dụng”. Nhãn không show internal/system skills. Thêm `skillsRead: [{ id, name, version }]` ở response lượt và bot message history, default []; persist theo successful read/checkpoint, deduplicate ID/version. Không trả instructions trong public chat metadata.

## Acceptance criteria

| ID  | Điều kiện phải đạt                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | CRUD/toggle/delete chỉ owner, kể cả truy cập ID trực tiếp và tools; không lộ existence sang account khác.                                                                     |
| S2  | Giới hạn input/quota 50 được enforce cả concurrent creates; conflict version giữ draft; delete giảm quota đúng một lần.                                                       |
| S3  | IELTS/Gym không tự có trong library hoặc internal catalog; import tạo bản sao độc lập, template update không sửa user copy; rubric IELTS được giữ đủ ý trong single document. |
| S4  | Model thấy overview trước xử lý, không thấy full instructions chưa đọc; list trong cùng lượt dùng cache; disabled skills không có trong overview.                             |
| S5  | read_skill đúng version/owner; tổng content <=30000, đọc lặp không cộng trùng; lượt sau dùng edit/toggle/delete mới và không replay old skill instructions.                   |
| S6  | Personal content không mở tool/đổi quyền; trusted request-bound gate và MCP compatibility tests vẫn pass.                                                                     |
| S7  | Skills UI CRUD/template/dirty state/conflict/mobile/keyboard hoạt động; account switch không rò cache.                                                                        |
| S8  | Nhãn skill đọc đúng persisted metadata sau reload, không hiện system skill; deleted/renamed/version mới xử lý rõ ràng.                                                        |
| S9  | Auto/Ask, existing conversations, A2UI, attachments, retry/idempotency/lease/budget vẫn pass regression.                                                                      |

## Rollout và verification

Deploy backend additive API/model trước UI. Chuyển catalog nội bộ sang personal snapshot trong cùng release runtime đã kiểm chứng; templates không tự enable. Không chạy migration ghi hàng loạt user hoặc sửa hội thoại cũ. Nếu rollback, tắt UI/runtime personal skills đồng bộ và giữ UserSkill data; code cũ có thể dùng lại advisory catalog hệ thống nên phải ghi rõ thay đổi hành vi này trong release note.

Vitest backend cho API/ownership/quota/version/snapshot/policy; frontend Testing Library cho editor/cache; Playwright dùng API fixtures cho toàn luồng. Smoke provider thật với hai user: một user có IELTS cá nhân bật, một user không có; xác nhận catalog/read khác nhau, tool writes vẫn theo quyền. Test nội dung chống injection kiểm tra enforcement tool và scope bằng kết quả thực tế, không coi một lời từ chối của model là security boundary.

Thứ tự bắt buộc: tests fail đúng behavior → code → tests → lint → format files liên quan → build/type-check. Dùng pnpm và tooling project-local. Báo riêng các smoke chưa chạy vì thiếu môi trường.
