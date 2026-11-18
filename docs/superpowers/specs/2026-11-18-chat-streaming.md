# Streaming chat có lưu tiến độ và nối lại

Ngày: 2026-11-18. Trạng thái: thiết kế HTTP + SSE đã được người dùng chấp thuận; tài liệu để review trước triển khai.

## Mục tiêu và quyết định đã chốt

Người dùng thấy nội dung trả lời xuất hiện dần và trạng thái thực thi tool thật trong cả Ask (`ask`) và Agent/Auto (`auto`), trên V2, trang Agent và chat cũ. Mất mạng, chuyển cuộc trò chuyện hoặc đóng tab chỉ ngắt theo dõi: backend tiếp tục chạy. Mở lại khôi phục nội dung, trạng thái tool và nối stream.

- Có nút Dừng: hủy sinh nội dung, ngăn các bước tiếp theo; không rollback thao tác đã hoàn tất.
- Giữ câu trả lời dở trong lịch sử; đánh dấu Đã dừng, Bị lỗi, Hết thời gian hoặc Bị gián đoạn. Lượt sau biết nội dung chưa hoàn tất và kết quả tool đã xảy ra.
- Mỗi cuộc trò chuyện chỉ có một lượt đang chạy. Không xếp hàng và không ngắt lượt cũ khi gửi tin mới. Cho phép chuyển sang cuộc trò chuyện khác.
- Tối đa 3 lượt đang chạy mỗi tài khoản; vượt giới hạn báo rõ, không tự xếp hàng.
- Giới hạn tổng 5 phút, tính từ lúc claim lượt, bao gồm chuẩn bị lịch sử, attachment/vision, gọi AI, tool và hoàn tất.
- Backend khởi động lại: lượt còn dang dở thành Bị gián đoạn; không tự phục hồi thực thi hoặc gọi lại tool.
- Thử lại chỉ nối lại/theo dõi lượt cũ. Lượt đã kết thúc yêu cầu người dùng chủ động gửi tin mới; không tự POST lại để tạo lượt mới.
- Trạng thái tool là nhãn dễ hiểu và kết quả ngắn; không hiển thị tham số/kết quả thô.
- Triển khai Docker/VPS với backend chạy liên tục.

## Phạm vi và giả định triển khai

Bản đầu hỗ trợ một tiến trình backend thực thi lượt trên một instance Docker/VPS, MongoDB có transaction như luồng claim hiện tại. Không chạy cluster/PM2 nhiều worker hoặc rolling deployment nhiều instance cho runner này. Giới hạn này phải được ghi trong tài liệu vận hành; HTTP nhiều tab không phải nhiều instance backend.

Không thêm Redis, queue worker riêng, WebSocket, serverless runner, phục hồi thực thi sau restart, rollback tool, streaming reasoning nội bộ, hay dựng proposal/card từ JSON chưa hoàn chỉnh. Không thay đổi quyền Ask/Auto hoặc cơ chế xác nhận proposal. `/generate-tasks` không thuộc phạm vi streaming. Các endpoint JSON cũ giữ tương thích cho client cũ, dùng chung claim/runner và giới hạn tài khoản; client giao diện chat trong repo chuyển sang API mới.

## Hiện trạng và các ranh giới thay đổi

`conversationService.send()` hiện claim `ChatTurn` rồi chờ `runConversationTurn()`. `chatTurnRepository` đã có transaction claim, `executionToken`, checkpoint trước tool và `guardExecution` trong luồng ghi dữ liệu. `conversationTurnService` dùng budget mặc định 50 giây. `agentService` gọi provider không stream và chỉ trả kết quả cuối. `AgentActivity` hiện là hoạt động thay đổi task/proposal, không phải trạng thái mọi tool.

Frontend dùng `useConversationChat` / `useConversationSession`; `SmallChat` có session riêng, Agent/V2 dùng provider chung. `httpClient.ts` đã serialize refresh token, kể cả giữa các tab khi có Web Locks. Tái sử dụng nền này; không tạo bộ refresh độc lập. Không đổi `AgentActivity` thành log tool: thêm kiểu `ToolProgress` riêng, vẫn giữ activities để invalidate dữ liệu nghiệp vụ.

## Kiến trúc và vòng đời

1. POST khởi tạo xác thực, validate, kiểm tra quyền, claim lượt và slot tài khoản bằng transaction. Commit lượt trước khi trả ID. Không giữ `Request`/`Response` trong runner; chỉ truyền context nội bộ đã xác thực và dữ liệu lượt.
2. Runner trong tiến trình chạy độc lập với socket, có AbortController riêng, deadline và registry theo `turnId`. Promise phải được bắt lỗi và giải phóng timer/registry. Không dùng signal của request gửi hoặc request SSE làm signal thực thi.
3. Provider được đọc theo stream. Ghép text delta, tool-call fragments; validate đủ arguments trước thực thi tool. Ghi checkpoint trước tool, phát trạng thái bắt đầu, ghi kết quả thật rồi phát kết thúc. Mỗi bước kiểm tra quyền thực thi còn hiệu lực.
4. Batch text thành sự kiện bền vững; cùng transaction cập nhật snapshot và append event, sau đó mới thông báo subscriber. MongoDB là nguồn dữ liệu chuẩn; notify trong bộ nhớ chỉ để đánh thức bộ đọc.
5. SSE đọc event theo số thứ tự, replay rồi theo dõi tiếp bằng truy vấn cursor. Không có khoảng trống giữa replay và live. Snapshot khi load có cursor tương ứng chính xác với nội dung; client tiếp tục từ cursor đó.
6. Hoàn tất ghi kết quả cuối, interaction/proposal/surface đã validate, terminal event và giải phóng khóa/slot trong cùng transaction. Nếu flush hoặc persist lỗi, không công bố thành công.

### Trạng thái

Trạng thái mới: `processing`, `stopping`, `completed`, `failed`, `cancelled`, `timed_out`, `interrupted`. `awaiting_user` cũ vẫn đọc tương thích; menu mới kết thúc lượt bằng `completed` + interaction pending, không chiếm slot.

`processing -> stopping -> cancelled | timed_out`; `processing -> completed | failed`; `processing | stopping -> interrupted` khi restart. Nếu hoàn tất đã commit trước yêu cầu Dừng, trả trạng thái hoàn tất. Sau khi yêu cầu Dừng đã commit, không cho completion/proposal commit thắng ngược lại. Tất cả chuyển trạng thái dùng conditional update với `executionToken` và trạng thái dự kiến.

`stopping` vẫn chiếm khóa cuộc trò chuyện và slot tài khoản đến khi tool đang thực thi đã được giải quyết. Abort không bảo đảm rollback một write đã bắt đầu. Write và yêu cầu Dừng phải tranh chấp cùng execution guard trong transaction: write đã thắng có thể hoàn tất; write chưa được phép không được bắt đầu. Không có bước tool/provider tiếp theo sau khi dừng. Tool không thể hủy phải được chờ hoặc xác định trạng thái không rõ, không gán thất bại khi có thể đã commit.

Deadline 300.000 ms ngăn bước mới và abort provider/vision/tool có hỗ trợ signal; không hứa rollback hoặc kết thúc DB write đúng tại mili giây thứ 300.000. Budget từng provider vẫn có thể ngắn hơn tổng deadline; abort/timeout toàn lượt được phân loại riêng với lỗi provider. Thời gian chuẩn bị dùng cùng deadline, không reset khi chuyển round hoặc reconnect.

## Dữ liệu và persistence

Mở rộng `ChatTurn`: `finalResult` (public canonical result để replay/snapshot không mất menu/proposal/surface), `partialResponse`, `lastEventSeq` (mặc định 0), `deadlineAt`, `stopRequestedAt`, `stopReason` (`user` hoặc `deadline`), `terminalReason`, `runnerInstanceId`, `toolProgress`, `finishedAt`. `response` là kết quả canonical khi terminal; trạng thái dở giữ chính xác text đã persist, không bị thay bằng thông báo lỗi chung. `executionToken` vẫn chỉ nội bộ.

Thêm collection `ChatTurnEvent` với `turnId`, `userId`, `conversationId`, `seq`, `type`, `payload`, `createdAt`; unique index `(turnId, seq)`, index đọc theo owner/turn/seq. Sự kiện dùng collection riêng để tránh tăng document `ChatTurn` không giới hạn. Trong bản đầu giữ event cùng vòng đời lịch sử chat; không TTL event độc lập làm đứt cursor. Không lưu raw provider chunk, reasoning, credentials hoặc raw tool arguments/results vào payload công khai.

Thêm `ChatRunSlot`: unique `(userId, slot)` với slot 0..2, `turnId`, `executionToken`. Transaction claim kiểm tra request cũ trước, claim conversation và slot, tạo turn và event đầu tiên. Dùng ba slot cố định thay vì count-then-insert để bảo đảm giới hạn khi nhiều request đồng thời. Duplicate slot race retry có giới hạn rồi trả lỗi giới hạn; lỗi conflict cùng conversation trả 409 busy. Terminal transaction xóa slot đúng executionToken. Rollback không để slot rác. Lượt JSON cũ cũng đi qua admission này.

Snapshot/event phải commit atomically. Text flush tối đa mỗi 50 ms hoặc 4 KiB UTF-8; flush phần còn lại trước boundary tool/terminal. Hạn mức partial text 1 MiB UTF-8 mỗi lượt, 20.000 durable events mỗi lượt và 16 KiB mỗi payload event, gồm giới hạn cho metadata/summary; vượt ngưỡng kết thúc `failed` với mã `CHAT_OUTPUT_LIMIT`, giữ nội dung đã lưu. Chia text event để không vượt giới hạn, không cắt hỏng UTF-8. Đây là mặc định thiết kế để giới hạn bộ nhớ/storage, không phải lựa chọn đã hỏi riêng người dùng.

## Hợp đồng HTTP

Tất cả đường dẫn dưới `/api/ai`, qua `protect`, validate Zod và kiểm tra owner. Không cho admin đọc stream của người khác bằng bypass. ID không đủ để được truy cập. Không trả token nội bộ.

| Method/path                                                       | Hành vi                                                                                                                                                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST `/conversations/:conversationId/turns`                       | Body giữ `requestId`, `userInput`, `mode`, `selection`, `intent`, `attachmentIds`, `timeZone` như hiện tại. Trả 202 khi processing/stopping, 200 khi request cũ đã terminal. |
| GET `/conversations/:conversationId/turns/:turnId`                | Snapshot authoritative để khôi phục/kiểm tra trạng thái.                                                                                                                     |
| GET `/conversations/:conversationId/turns/:turnId/events?after=N` | SSE, replay event `seq > N`, rồi theo dõi tiếp; terminal đóng sau khi phát event cuối.                                                                                       |
| POST `/conversations/:conversationId/turns/:turnId/cancel`        | Không cần body. Idempotent; trả 202 cùng snapshot khi stopping, 200 nếu đã terminal.                                                                                         |

Envelope JSON: `{ data: TurnSnapshot }`, với `TurnSnapshot = { turnId, conversationId, requestId, status, partialResponse, lastEventSeq, toolProgress, deadlineAt, terminalReason?, result? }`. `result` dùng public `ChatResponse` hiện có, mở rộng union status; interaction/proposal/surface chỉ công bố sau persist thành công. Conversation GET thêm `activeRun: TurnSnapshot | null`, giữ trường cũ trong giai đoạn tương thích.

RequestId là idempotency key theo user như hiện tại: cùng payload trả cùng lượt, không chạy lại; khác payload trả 409 `CHAT_REQUEST_CONFLICT`. Client có thể gửi lại chính POST khởi tạo với cùng requestId nếu chưa biết server đã nhận chưa; đây là phục hồi ACK, không phải chạy lại sau lỗi. Không cấp thêm slot cho duplicate.

Các lỗi trước mở SSE dùng JSON: 400 cursor/params sai, 401 hết phiên, 404 không có hoặc không thuộc owner, 409 conversation busy/request conflict, 429 `CHAT_CONCURRENCY_LIMIT` (3 lượt), 503 admission chưa sẵn sàng. Cursor là số nguyên an toàn >= 0; hỗ trợ `Last-Event-ID` nếu không có query `after`. Query có ưu tiên. Cursor vượt `lastEventSeq` trả 400 `CHAT_CURSOR_INVALID` để client tải lại snapshot. Không im lặng bỏ event.

## Hợp đồng SSE v1

Mỗi durable event có `id: <seq>`, `event: <type>`, `data` JSON `{ version: 1, turnId, seq, occurredAt, payload }`. Chỉ giữ dữ liệu thuộc lượt đã được xác thực.

| Type                | Payload                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `turn.started`      | `{ deadlineAt }`                                                                             |
| `assistant.delta`   | `{ messageId, text }`; messageId ổn định `${turnId}:bot`, nối text theo seq                  |
| `tool.started`      | `{ toolCallId, label }`                                                                      |
| `tool.finished`     | `{ toolCallId, status: 'succeeded'                                                           | 'failed'      | 'unknown', summary }` |
| `activity.recorded` | `{ activity }` với public AgentActivity hiện có                                              |
| `turn.stopping`     | `{ reason: 'user'                                                                            | 'deadline' }` |
| `turn.finished`     | `{ status, terminalReason?, result }`; status chỉ terminal, result là canonical ChatResponse |

Tool call ID xác định cùng một lần thực thi, khác với tên tool. Nhãn và summary tạo từ mapping do ứng dụng sở hữu, kết quả đã xác thực và số lượng đã biết; nhãn fallback “Đang xử lý tác vụ”. Không gọi AI thêm để tóm tắt. Không hiển thị chain-of-thought, tên skill loader nội bộ hay argument fragment. Mọi tool thực thi có started/finished; tool nội bộ dùng nhãn tổng quát. `unknown` chỉ dùng khi thực sự không xác định được kết quả, nhất là restart giữa write và checkpoint.

Heartbeat là comment `: heartbeat` mỗi 15 giây, không seq và không persist. Header `Content-Type: text/event-stream`, `Cache-Control: no-store, no-transform`, `X-Accel-Buffering: no`. Flush headers. Không nén/buffer SSE. SSE chậm có hàng đợi tối đa 256 KiB mỗi connection; vượt ngưỡng đóng subscriber để client reconnect, không dừng runner và không giữ queue vô hạn. Bộ đọc durable events dùng page 100 events và truy vấn tiếp theo từ cursor sau `drain`; notify mất vẫn được bù bằng poll tối đa 1 giây. Logout/unmount đóng subscriber/timer; không hủy lượt.

## Provider, tool và bảo toàn lịch sử

Thêm adapter streaming cho OpenAI-compatible Chat Completions, dùng SDK đã cài. Tham số provider bật stream; ghép `delta.tool_calls` theo index và ID, hỗ trợ nhiều calls và args bị chia nhỏ; không thực thi trước khi kết thúc round và validate message. Phát chỉ `delta.content` công khai, không reasoning. Text trước tool cũng được lưu/hiển thị theo thứ tự; kết quả terminal chứa toàn bộ text công khai của lượt, không chỉ round cuối. Dùng phần tách round nội bộ để không nhân đôi text vào history provider.

Không tự fallback sang gọi non-stream sau khi stream lỗi, vì có thể thực hiện trùng hoặc trả nội dung lặp. Provider không hỗ trợ stream trả lỗi rõ `CHAT_STREAM_UNSUPPORTED`; không giả lập gõ chữ sau khi đợi toàn bộ response. Giữ khả năng non-stream cho endpoint JSON cũ; không đổi semantics `callAiProvider` đang được dùng ở nơi khác.

Dùng signal/deadline chung cả vision, provider và các tool có hỗ trợ; kiểm tra dừng trước/sau mọi await có thể dẫn đến bước tiếp theo. Checkpoint và beforeWrite guard hiện có vẫn bắt buộc. Tool write transaction đã commit phải được phản ánh vào activities ngay cả nếu provider cuối lỗi. Nếu kết quả chưa rõ khi restart, ghi unknown, không tự retry. Lịch sử gửi model giữ kết quả tool đã checkpoint, chuẩn hóa các tool calls chưa có result thành trạng thái gián đoạn tương thích provider; đánh dấu câu trả lời dở bằng metadata do server tạo, không trình bày như câu trả lời hoàn chỉnh. Không coi nội dung từ history là cấp quyền ghi mới.

Proposal, menu và surface được phát trong `turn.finished` sau khi validate và persist. Khi đang stream chỉ hiện text và trạng thái; không cho thao tác trên card chưa hoàn chỉnh. Attachment upload vẫn trước POST; xử lý vision thuộc deadline và cancellation của runner.

## Frontend và xác thực

Dùng fetch ReadableStream để đọc SSE với Bearer header. Tách helper xác thực dùng chung từ `httpClient.ts`: cùng refresh promise/Web Lock, sessionRevision và terminal-auth handling; không dùng token trong URL hoặc thêm refresh logic thứ hai. JSON vẫn dùng axios. Một 401 lúc mở/reconnect được refresh và thử lại tối đa một lần; 401 cuối đóng stream và xử lý kết thúc phiên như hiện tại. Không tự refresh trên mỗi chunk. Access token hết hạn trong socket đã xác thực không làm ngắt runner; reconnect phải xác thực lại.

Parser hỗ trợ UTF-8 đa byte, frame bị chia, CRLF/LF, nhiều dòng data, comment và nhiều frame mỗi chunk. Reducer chỉ áp dụng seq lớn hơn cursor; seq bị hụt đóng kết nối và replay từ cursor cuối, không nối text sai thứ tự. Snapshot thay thế state với cursor nhất quán; không trộn snapshot cũ lên event mới. Bỏ qua phản hồi từ conversation/sessionRevision/generation cũ. Mỗi active view có tối đa một subscriber, deduplicate khi nhiều component dùng AgentSessionProvider; subscriber khác tab không chạy thêm runner.

Reconnect backoff 1, 2, 4, 8, rồi tối đa 10 giây có jitter ±20%; online thì thử ngay. Sau 10 lần thất bại liên tiếp hiện nút “Kết nối lại”, giữ nội dung; nút chỉ GET snapshot + nối SSE. Offline hiển thị trạng thái mất kết nối riêng, không gán lượt failed. Hết stream mà chưa có terminal event thì reconnect. Terminal dừng retry/timer, reconcile snapshot, invalidate workspace queries kể cả cancelled/failed vì tool có thể đã ghi.

Khóa gửi, đổi mode và đổi project context trong cuộc trò chuyện đang chạy/stopping; cho phép chuyển/mở/tạo cuộc trò chuyện khác, giữ draft guards hiện có. Tách network submission busy khỏi trạng thái run, không dùng một busy ref toàn session để khóa điều hướng. Nút Dừng có accessible name, sau click thành “Đang dừng”; request cancel lỗi mạng hiển thị chưa xác nhận và cho thử lại chính cancel, không tự kết luận lượt đã dừng. Tool progress dùng live region lịch sự, không đọc lại mỗi token. Không ép scroll khi người dùng đang đọc phía trên; giữ Markdown/Mermaid và paste/attachments hiện có, chỉ render diagram khi block đủ hoàn chỉnh. Nhãn terminal và thông báo concurrency có cả tiếng Việt/Anh theo i18n hiện tại.

## Restart, vận hành và tương thích

Startup sau connectDB và trước nhận admission: transaction chuyển toàn bộ processing/stopping của instance cũ thành interrupted, giữ partial text/activities, đánh dấu tool còn started là unknown, tạo terminal event và giải phóng khóa/slot. Single-instance invariant cho phép nhận diện orphan; không quét nhầm lượt của instance sống khác. Nếu claim đã commit nhưng process chết trước schedule, recovery vẫn tìm được lượt. Recovery lỗi thì startup không nhận lượt mới. SIGTERM ngừng admission, abort runner, chờ tối đa 10 giây để persist interrupted; lần startup sau hoàn tất recovery nếu bị kill cứng. Không replay tool.

Điều chỉnh `expiresAt`/conversation lease cho deadline + 30 giây grace; guard kiểm tra cả deadline và stop state. Terminalization sau deadline vẫn được phép: không tái sử dụng filter `expiresAt > now` hiện có làm mất kết quả timeout. Claim mới không được cướp lượt stopping đang có write chưa giải quyết; recovery/finalizer chịu trách nhiệm giải phóng.

Nginx cấu hình riêng endpoint events: HTTP/1.1, `Connection ""`, proxy buffering/cache off, gzip off, read timeout 600 giây. Giữ giới hạn upload hiện có cho API khác. Cập nhật CORS cho Authorization/Last-Event-ID nếu cần theo cấu hình hiện tại. Log chỉ requestId/turnId, transition, elapsed, reconnect, số event/byte; không ghi token, nội dung chat hoặc raw tool dữ liệu.

## Tiêu chí chấp nhận và kiểm thử

| ID   | Điều kiện có thể kiểm thử                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC01 | Ask/Auto ở V2, Agent page và SmallChat nhận text trước khi provider hoàn tất; tool started hiện trước khi tool promise resolve.                  |
| AC02 | Đóng tab/ngắt SSE không abort runner; kết quả vẫn được persist, mở lại tải snapshot và tiếp tục đúng cursor.                                     |
| AC03 | Replay trùng không nhân đôi chữ/tool; sự kiện sinh trong khoảng snapshot/replay/live không mất; client chậm reconnect đúng.                      |
| AC04 | Dừng abort provider, chặn tool chưa bắt đầu; write đã commit vẫn còn; cancel/completion race có đúng một kết quả terminal.                       |
| AC05 | Partial text và nhãn cancelled/failed/timed_out/interrupted tồn tại sau reload và trong history lượt tiếp theo.                                  |
| AC06 | Cùng conversation gửi song song chỉ claim một lượt; 4 conversation cùng user chỉ claim tối đa 3 slot; user khác độc lập.                         |
| AC07 | Deadline 5 phút bao trùm vision và mọi provider round; không bước mới sau deadline, không reset khi reconnect.                                   |
| AC08 | Restart trước schedule, giữa stream và giữa write/checkpoint không thực thi lại; recovery giải phóng khóa/slot và phát interrupted đúng một lần. |
| AC09 | POST trùng requestId cùng payload trả cùng lượt/slot, khác payload 409; reconnect/retry không tạo requestId mới.                                 |
| AC10 | Owner khác không xem/cancel/replay được; token refresh đồng thời stream + axios không xoay hai lần; logout bỏ event trễ.                         |
| AC11 | Menu/proposal/surface chỉ xuất hiện khi valid/persist; quyền Ask/Auto, proposal confirmation, attachment và context không bị thay đổi.           |
| AC12 | Parser chịu fragmented UTF-8/CRLF/multiline; cursor lỗi có response rõ; malformed event không làm crash UI; mất kết nối không bị coi failed.     |
| AC13 | Chuyển conversation khi đang chạy được; event cũ không lọt view mới; chỉ khóa composer của conversation có activeRun.                            |
| AC14 | Workspace cache được invalidate trên kết quả tool và mọi terminal, kể cả stop/lỗi sau write; trạng thái tool không lộ raw dữ liệu.               |
| AC15 | Docker/Nginx chuyển chunk trước khi kết thúc response và heartbeat duy trì kết nối; giới hạn output/event/subscriber hoạt động.                  |
| AC16 | JSON endpoints và lượt lịch sử cũ vẫn đọc được, chia sẻ admission/guard với streaming; không bỏ bảo vệ ghi hiện có.                              |

Unit/integration Vitest cho backend/frontend, Playwright cho các giao diện; test DB transaction/concurrency/restart bằng MongoDB replica set thật dành riêng kiểm thử. Mock model không đủ chứng minh AC04/06/08/09. Browser test có provider fixture deterministic để đo thứ tự chunk/tool, không phụ thuộc AI production. Smoke Docker qua Nginx dùng provider fixture và tài khoản test; không dùng dữ liệu hoặc secret production.

Quy trình bắt buộc: Spec -> Plan -> Test đỏ -> Code -> Test xanh -> Lint -> Format check -> Build/type-check, sau brainstorming đã hoàn tất. Khi thực thi phải ghi exact commands và kết quả, kể cả test bị skip do thiếu MongoDB/Docker. Tài liệu này không khẳng định tính năng đã được triển khai hay kiểm thử.
