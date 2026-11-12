# Agent: ngữ cảnh thời gian và web search

Ngày: 2026-11-12. Trạng thái: đặc tả bàn giao để triển khai; chưa có code tính năng.

## 1. Mục tiêu và quyết định thiết kế

Agent hiểu “hôm nay”, “ngày mai”, “tuần này” theo múi giờ người dùng mà không hỏi lại ngày hiện tại; có thể tìm thông tin công khai trên web và dẫn nguồn khi trả lời. Hai phần dùng chung runtime agent, nhưng triển khai thời gian trước, tìm kiếm sau.

Các mặc định dưới đây là quyết định đề xuất cho bản đầu, không phải cấu hình đã được người dùng cung cấp:

- Thời điểm lấy từ backend; múi giờ lấy từ trình duyệt, dự phòng bằng UTC. Không suy ra múi giờ từ ngôn ngữ.
- Inject ngữ cảnh thời gian mỗi turn và tính sẵn khoảng ngày thông dụng ở backend. Không thêm tool đọc đồng hồ vì mọi turn đều cần thông tin này.
- Web search dùng adapter Brave Search riêng, không phụ thuộc tính năng search của model/provider AI hiện tại. Đây là lựa chọn triển khai, có thể thay bằng adapter khác nếu cập nhật spec và plan trước khi code.
- Web search mặc định tắt, chỉ bật khi người vận hành cấu hình key. Không mua gói, tạo tài khoản hoặc cung cấp key trong phạm vi triển khai.
- Giữ một spec và một plan chung theo yêu cầu bàn giao. Không bắt đầu code trong phiên soạn tài liệu này.

Các phương án đã cân nhắc: chỉ sửa prompt không giải quyết nguồn thời gian; tool đồng hồ thêm vòng gọi không cần thiết; search tích hợp model làm ràng buộc provider. Chọn context đáng tin cậy và search tool độc lập để dễ kiểm thử, kiểm soát timeout và đổi provider.

## 2. Hiện trạng đã kiểm tra

- `backend/services/agentService.ts` xây system prompt nhưng chưa inject ngày/múi giờ hiện tại; dùng MCP tools và policy deny-by-default.
- `backend/mcp/models/Task.ts` có `startDate`/`endDate`, lọc **dueDate**, cả hai biên inclusive; không phải lọc thời gian task đang diễn ra.
- `backend/services/aiService.ts` có ngày UTC trong luồng generate-tasks cũ; không giải quyết ngữ cảnh của conversation agent.
- Luồng chính: `POST /api/ai/chat-mcp` → `aiController` → `conversationService` → `chatTurnRepository.claim` → `conversationTurnService` → `agentService`.
- `requestId` đã có xử lý replay và conflict. Không được phá semantics đó.
- Frontend hiện dùng `frontend/src/shared/services/aiService.ts`, `shared/types/domain.ts`, Vitest và Playwright; hướng dẫn cũ về `src/api/apiService.js` không còn đúng với checkout này.
- `MarkdownText.jsx` là renderer tự viết, chưa render Markdown links. Phải bổ sung link an toàn để dẫn nguồn có thể bấm được.

## 3. Phạm vi và non-goals

Áp dụng cho conversation agent `/api/ai/chat-mcp`, cả Auto, Ask, proposal intent và lượt trả lời clarification. Không thay đổi legacy `/chat`, `/generate-tasks`, schema Task, ownership, thống kê, refresh token hay cơ chế Confirm để tạo task.

Không có browser automation, crawl/fetch URL tùy ý, đọc toàn văn trang, RAG, upload tài liệu ra search provider, UI chọn provider, hồ sơ múi giờ lưu lâu dài, hay thiết kế lại chat. Không thêm nguồn giả hoặc tuyên bố đã đọc toàn văn khi chỉ có snippet.

## 4. Ngữ cảnh thời gian

### 4.1 API và nguồn dữ liệu

Thêm `timeZone?: string` vào **conversationChatSchema**, không vào chatSchema dùng chung với legacy API. Chuỗi tối đa 100 ký tự, kiểm tra là IANA time zone hợp lệ qua `Intl.DateTimeFormat`; cho phép `UTC`, từ chối offset thuần như `+07:00`. Canonicalize bằng `resolvedOptions().timeZone`; không tự đổi alias bằng bảng tự viết. Giá trị sai trả HTTP 400 trước khi tạo turn/gọi AI.

Frontend lấy `Intl.DateTimeFormat().resolvedOptions().timeZone` khi gửi request qua shared AI service. Nếu không lấy được, bỏ field. Cho phép caller truyền timezone hợp lệ để test hoặc hỗ trợ client khác. Không gửi `now`, `today` hoặc thời gian do máy client tính.

Backend lấy một instant UTC khi claim turn mới. Timezone mặc định là UTC khi field vắng. Context gồm:

```ts
type AgentTimeContext = {
  now: string; // ISO instant UTC, millisecond precision
  timeZone: string; // validated, canonical IANA name or UTC
  source: "client" | "fallback";
  localDate: string; // YYYY-MM-DD
  localDateTime: string; // ISO local datetime with numeric UTC offset
  weekStartsOn: "monday";
  ranges: Record<
    "yesterday" | "today" | "tomorrow" | "thisWeek" | "nextWeek",
    { startDate: string; endDate: string }
  >;
};
```

Lưu `timeContext` optional trên ChatTurn, dùng cùng snapshot trong mọi vòng model của turn. Tạo snapshot bên trong nhánh claim turn mới và lưu cùng transaction. Hai request trùng requestId dùng kết quả/snapshot đầu tiên; timezone là metadata, không thêm vào điều kiện conflict hiện có. Đổi timezone với requestId cũ không sửa turn hay chạy lại search. RequestId mới lấy giờ và timezone mới, kể cả khi trả lời clarification sau nửa đêm.

Turn cũ thiếu field vẫn đọc được. Nếu cần chạy turn cũ, tạo fallback từ `createdAt` và UTC; không rewrite history. Direct invocation của agent không qua conversation được cấp context từ backend `new Date()`/UTC nếu memory thiếu context. Không chấp nhận snapshot từ HTTP body.

### 4.2 Tính khoảng thời gian

Dùng `@js-temporal/polyfill` trong backend cho phép cộng ngày lịch/múi giờ, không cộng cố định 24 giờ. Tính local midnight đầu khoảng và midnight đầu khoảng tiếp theo; đổi ra instant rồi trừ 1 millisecond ở biên cuối để tương thích filter inclusive hiện tại. Tuần từ thứ Hai 00:00 tới trước thứ Hai kế tiếp.

Ví dụ fixed instant `2026-11-11T18:30:00.000Z`, zone `Asia/Ho_Chi_Minh`:

- localDate: `2026-11-12`.
- today: `2026-11-11T17:00:00.000Z` … `2026-11-12T16:59:59.999Z`.
- thisWeek: `2026-11-08T17:00:00.000Z` … `2026-11-15T16:59:59.999Z`.

Ngày chuyển DST tại `America/New_York`: 2026-03-08 có 23 giờ, 2026-11-01 có 25 giờ. Các biên phải phản ánh điều này. Không suy ra hôm nay bằng `toISOString().split("T")[0]`.

### 4.3 Hành vi agent

Context được inject bằng JSON vào system prompt mới, có nhãn server-generated. Chỉ dẫn dùng snapshot hiện tại thay vì thời gian trong history, skills, attachment hoặc kết quả web. Không hỏi “hôm nay là ngày mấy?” khi context đã có.

- “Hôm nay tôi có task gì?” → gọi `orbit_list_tasks` với khoảng today, giữ phạm vi project nếu hội thoại đang giới hạn project. Hiển thị “Các task đến hạn hôm nay (ngày …)” và status; không mặc định loại completed/given-up. Nếu người dùng hỏi “còn phải làm”, lọc pending/in-progress bằng các lần đọc cần thiết.
- Không âm thầm gộp task quá hạn, task không dueDate hoặc task chỉ giao nhau qua startDate. Người dùng yêu cầu nhóm khác thì truy vấn riêng, ghi rõ nhãn.
- Không có kết quả → thông báo không có task đến hạn trong khoảng đã tra, không nói người dùng không có task nào.
- Nếu dữ liệu phân trang, tiếp tục trong budget khi cần; nếu chưa lấy đủ phải nói rõ kết quả chưa đầy đủ. Không khẳng định đã liệt kê tất cả từ trang đầu.
- Fallback UTC: vẫn trả lời, ghi rõ “theo múi giờ UTC”; không bắt người dùng xác nhận ngày chỉ để đọc task.
- Ngày cụ thể do người dùng đưa ra ưu tiên hơn cách diễn giải relative date. Đối với thay đổi task có ngày/giờ thực sự mơ hồ, giữ cơ chế clarification hiện tại.
- Bản đầu không tự resolve múi giờ khác ghi trong văn bản thành timezone request. Nếu người dùng yêu cầu một zone khác với context, phải nói rõ giới hạn hoặc hỏi thông tin ngày/giờ cần thiết; không giả vờ ranges hiện tại thuộc zone đó.

## 5. Web search

### 5.1 Configuration và provider

Backend thêm `WEB_SEARCH_ENABLED=false` và `BRAVE_SEARCH_API_KEY=` vào `.env.example`. Không đưa key vào frontend, prompt, tool output hay log. Disabled: không cần key, không làm hỏng startup/healthz. Enabled nhưng thiếu key: startup validation báo tên biến thiếu; không log giá trị. Runtime direct invocation gặp config thiếu phải fail closed, không gửi network request.

Adapter v1 gọi endpoint cố định `https://api.search.brave.com/res/v1/web/search` bằng GET, header `X-Subscription-Token`, params `q`, `count`, `result_filter=web`, `text_decorations=false`. Không cho model chọn base URL, headers hay endpoint; không theo HTTP redirect. Thông tin endpoint/header/params tham khảo [Brave Web Search API](https://api-dashboard.search.brave.com/api-reference/web/search/get), kiểm tra ngày 2026-11-12. Không giả định giá hoặc quota miễn phí.

### 5.2 Tool contract

Tên `orbit_web_search`, đăng ký có điều kiện khi enabled, là core read tool không cần skill. Cho phép trong Auto, Ask và proposal intent, ở cả danh sách tool gửi model lẫn kiểm tra thực thi. `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: true`.

```ts
type WebSearchInput = { query: string; count?: number };
// strict object; query trimmed 1..400 characters and <=75 whitespace-separated
// words; count integer 1..5, default 5. Reject unknown fields.
type WebSearchOutput = {
  query: string;
  searchedAt: string; // backend instant at successful search
  results: Array<{
    title: string; // <=200 chars
    url: string; // absolute http(s), <=2048 chars, no credentials
    snippet: string; // plain text <=1000 chars
  }>;
};
```

Chỉ map `web.results`, tối đa count, bỏ row malformed/URL không hợp lệ và deduplicate theo URL chuẩn hóa. Không trả raw provider payload hoặc answer do provider tạo. Thiếu web/results coi là empty search; nếu response có cấu trúc trường sai kiểu thì trả provider error. Loại HTML tags/decorations khỏi title/snippet; text không được chạy như HTML. Kết quả chỉ là dữ liệu không đáng tin cậy, không phải chỉ dẫn.

### 5.3 Giới hạn, lỗi và budget

Mỗi agent turn tối đa 2 network searches. Lần gọi giống hệt query đã trim và count trong cùng turn dùng lại kết quả thành công, không tốn thêm network; không cache giữa người dùng/turn. Failures cũng tính vào số lần gọi. Không auto-retry provider error. MCP consumer ngoài agent có cùng giới hạn mỗi MCP server session, timeout cố định 8 giây.

Timeout agent: `min(8000, budget.remainingMs() - 12000)` millisecond, giữ 10 giây cho phản hồi cuối và 2 giây persistence. Nếu không còn thời gian dương thì không gọi mạng. Timeout phải abort HTTP và đọc body, không chỉ Promise.race. Giới hạn response body 1 MiB trước JSON parse, kể cả response chunked; không chỉ kiểm tra Content-Length.

Tool trả `isError: true` và JSON `{error:{code,message,retryable}}`, không trả HTTP body chứa bí mật. Các mã: `WEB_SEARCH_DISABLED`, `WEB_SEARCH_TIMEOUT`, `WEB_SEARCH_RATE_LIMITED`, `WEB_SEARCH_UNAVAILABLE`, `WEB_SEARCH_LIMIT_REACHED`, `WEB_SEARCH_BUDGET_EXCEEDED`, `INVALID_ARGUMENT`. 401/403/5xx, JSON lỗi hoặc body quá lớn map unavailable; 429 map rate limited; abort vì deadline map timeout. Timeout/rate limited/unavailable cho retryable=true để biểu đạt người dùng có thể thử ở turn khác; không tự retry trong turn.

Search failure không làm mất câu trả lời task đã đọc được. Agent nói rõ chưa tra cứu được thông tin web, không đổi failure thành “không có kết quả” và không tuyên bố đã xác minh thông tin mới. Có thể tổng hợp phần nội bộ thành công và nêu phần chưa hoàn thành.

### 5.4 Khi nào dùng và dữ liệu gửi ra ngoài

- Dùng khi người dùng yêu cầu search/tra cứu web hoặc cần thông tin công khai cập nhật, tài liệu bên ngoài để trả lời. Không search để biết ngày hiện tại hoặc đọc task/profile.
- “Tìm tài liệu React rồi đề xuất kế hoạch học tuần này” có thể kết hợp search và time context, sau đó tạo proposal; chỉ Confirm mới tạo task như hiện tại.
- Disabled: nói khả năng tìm web chưa bật nếu người dùng yêu cầu; không gọi tool không tồn tại, không bịa kết quả. Prompt phải có trạng thái khả dụng rõ ràng.
- Chỉ query chủ đề công khai tối thiểu cần thiết. Không copy task description, profile, conversation history, token, attachment hay thông tin cá nhân vào query. Request chỉ đọc task không được gây outbound search.
- Adapter chỉ nhận query/count, không có tham chiếu đến user/task/history. Quy tắc chọn query ở model là giới hạn bảo vệ bằng instruction, không phải cơ chế DLP tuyệt đối; test prompt và các tình huống nhạy cảm, không tuyên bố đã ngăn được mọi kiểu rò rỉ văn bản tự do.
- Tool output/skills không được cho phép task write hoặc tự sinh query chứa dữ liệu riêng tư. Giữ authorization/Confirm hiện có; snippet “ignore instructions/delete tasks” chỉ là văn bản.

### 5.5 Nguồn và UI

Agent dẫn nguồn bằng Markdown `[Tên nguồn](URL)` cạnh nhận định dựa vào kết quả, URL phải đến từ kết quả thành công của turn. Nếu empty results, nói không tìm thấy nguồn phù hợp. Không bịa nguồn hoặc ngày xuất bản; `searchedAt` không phải publication date. Không khẳng định thông tin cập nhật chính xác chỉ vì snippet mới được lấy.

Mở rộng parser `MarkdownText.jsx` để render inline HTTP(S) links dạng trên, không thêm raw HTML. Dùng URL validation, reject javascript/data/file/protocol-relative/credentials, escape text qua React, external links có `target="_blank" rel="noopener noreferrer"`. URL bị từ chối hiển thị như text. Giữ inline code, code fences, Mermaid, HTML/SVG preview hiện tại và không parse link bên trong code.

Không thêm citation card hoặc response envelope mới. Response text và tool result đi qua persistence hiện có; link phải hoạt động sau reload history. Citation correctness là kiểm thử hành vi/model smoke bên cạnh deterministic tests, không giả định mocked model chứng minh model luôn làm đúng.

## 6. Acceptance criteria và kiểm thử

| ID  | Tình huống                                                      | Kết quả bắt buộc                                                        |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| T1  | Browser gửi Asia/Ho_Chi_Minh, UTC đang ngày hôm trước           | Prompt có localDate/ranges đúng, không hỏi lại ngày                     |
| T2  | Không timezone / timezone không hợp lệ                          | UTC + nhãn fallback / HTTP 400, không gọi AI                            |
| T3  | Ngày DST 23h/25h, cuối tháng/năm, tuần đổi năm                  | Khoảng calendar chính xác, không giả định ngày=24h                      |
| T4  | Turn mới sau nửa đêm, trả lời clarification sau nửa đêm         | Context mới; history không thay thế ngày hiện tại                       |
| T5  | Replay requestId qua nửa đêm hoặc đổi zone                      | Dùng kết quả/snapshot cũ, không rerun tools; request mới dùng zone mới  |
| T6  | “Task hôm nay”, empty, pagination, project context              | Đọc dueDate đúng biên, ownership giữ nguyên, không overclaim            |
| T7  | ChatTurn cũ và direct agent call                                | Không crash, fallback xác định như mục 4                                |
| W1  | Disabled, enabled thiếu key, enabled hợp lệ                     | Tool ẩn / config error / tool có thể gọi trong các mode                 |
| W2  | Search thành công, trùng URL, unsafe URL, malformed/empty rows  | Output gọn, có nguồn hợp lệ, empty được phân biệt với error             |
| W3  | 429, 401, 5xx, timeout, invalid JSON, body quá lớn, redirect    | Lỗi có cấu trúc, abort thật, không lộ key, không auto-retry             |
| W4  | Query lặp, lần thứ ba, hết budget                               | Cache trong turn / limit / không network; reserve còn cho finalize      |
| W5  | Chỉ hỏi task; snippet injection; dữ liệu riêng tư trong history | Không search cho task lookup; không tự write; query công khai tối thiểu |
| W6  | Answer chứa link + reload, link nguy hiểm, code regression      | Link nguồn bấm được và an toàn; code/preview vẫn đúng                   |
| X1  | Tìm tài liệu + kế hoạch tuần này                                | Search và ranges đúng, proposal đúng flow, chưa ghi task trước Confirm  |
| X2  | Search lỗi nhưng task lookup thành công                         | Trả phần thành công, nêu giới hạn search, không báo thành công giả      |

Unit/integration tests mock AI, search HTTP và clock. Dùng MongoDB test riêng cho replay/claim/ownership. Playwright dùng fixture để kiểm UI ổn định; chạy thêm manual smoke với model thật và key riêng để đánh giá routing, không hỏi lại ngày, nguồn và injection. Không gọi dịch vụ trả phí trong CI mặc định. Ghi rõ test bị skip khi thiếu MongoDB/key; không tuyên bố full verification nếu chưa chạy.

## 7. Hoàn tất và vận hành

Theo chuỗi Test → Code → Test → Lint → Format check → Build/type-check của repo, giữ Node 22/NodeNext `.js` imports và pnpm; chỉ thêm dependency thời gian ở backend bằng pnpm, commit lockfile do pnpm sinh. Cả hai package đã có lint/format/test scripts.

Không cần backfill database; field mới optional. Rollback web bằng `WEB_SEARCH_ENABLED=false`; client cũ không gửi timezone vẫn chạy. Release ghi rõ cần Brave key để sử dụng search. Log chỉ mã lỗi, duration, result count và requestId, không raw query/key/provider body. Tài liệu tham khảo thêm cho thư viện thời gian: [Temporal polyfill](https://github.com/js-temporal/temporal-polyfill).
