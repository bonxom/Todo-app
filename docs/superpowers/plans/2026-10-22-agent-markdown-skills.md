# Agent Markdown Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agent phải nạp hướng dẫn Markdown vào context và có một lượt suy luận với hướng dẫn đó trước khi gọi tool nghiệp vụ phụ thuộc; có thể bổ sung chuyên môn gym, IELTS bằng tài liệu.

**Architecture:** Registry đọc các skill do ứng dụng quản lý, expose tài liệu qua MCP Resource. Tool nội bộ `load_skill` / `read_skill_document` đưa nội dung vào context; agent runtime kiểm soát tool khả dụng và kiểm tra điều kiện ngay trước `callTool`. Quyền truy cập nghiệp vụ vẫn do MCP và service hiện tại kiểm tra.

**Tech Stack:** TypeScript NodeNext, Node 22, MCP SDK hiện có, Zod, Vitest, pnpm.

**Spec:** Các quyết định và acceptance criteria trong tài liệu này cụ thể hóa thiết kế đã thống nhất trong hội thoại ngày 2026-10-22.

## Global Constraints

- Chỉ triển khai backend; giữ hành vi Auto/Ask, menu, authorization, ownership, idempotency và execution lease hiện có.
- Dùng pnpm; relative imports TypeScript dùng đuôi `.js`.
- Skill chỉ chứa tài liệu do maintainer quản lý trong repository; không nhận đường dẫn tùy ý hoặc Markdown upload của người dùng.
- “Đã đọc” nghĩa là nội dung đầy đủ đã được đưa vào context của một provider request thành công trước hành động; không khẳng định model hiểu hoặc tuân thủ tuyệt đối.
- Chốt này bảo vệ chatbot Orbit. Client MCP bên ngoài có thể đọc Resource nhưng không được tuyên bố là có cùng bảo đảm; không thay đổi contract MCP tools hiện hữu trong bản đầu.
- Chưa tạo tool chấm IELTS hoặc thiết kế bài tập riêng; chuyên môn sử dụng hướng dẫn và các task tools hiện có khi người dùng yêu cầu lưu công việc.
- Không tự mở rộng quyền tool khi load skill.

## Hiện trạng đã kiểm tra

- `backend/services/agentService.ts` tạo MCP server/client in-memory mỗi request, gọi `listTools`, rồi đưa toàn bộ tool được phép vào model.
- Agent hiện có 6 vòng xử lý và tối đa 40 tool calls; tool output bị cắt ở 12.000 ký tự.
- `backend/mcp/server.ts` chỉ đăng ký tools; `backend/mcp/tools.ts` giới hạn write tools theo role và scope.
- Checkpoint lưu message qua `AgentMemory.checkpoint`; history không chứng minh tài liệu hiện tại đã được nạp.
- `grill_user` là tool nội bộ trong Ask; menu kết thúc turn. Tool này không cần skill.

## Thiết kế và phạm vi

Registry dùng `manifest.json` được kiểm tra bởi Zod thay vì thêm YAML parser. Manifest chứa id, description, entrypoint, documents; version là SHA-256 tính từ manifest và toàn bộ tài liệu của skill. Tool-to-skill mapping do code kiểm soát, không lấy từ model.

```text
backend/skills/
  types.ts
  registry.ts
  policy.ts
  content/
    task-management/manifest.json
    task-management/SKILL.md
    gym/manifest.json
    gym/SKILL.md
    ielts/manifest.json
    ielts/SKILL.md
    ielts/writing-rubric.md
    ielts/speaking-rubric.md
  test/registry.test.ts
  test/policy.test.ts
backend/mcp/resources/skills.ts
backend/mcp/test/skills.test.ts
backend/services/agentSkillService.ts
backend/services/test/agentSkillService.test.ts
```

Ví dụ manifest IELTS:

```json
{
  "id": "ielts",
  "description": "Luyện IELTS và nhận xét bài Writing/Speaking.",
  "entrypoint": "SKILL.md",
  "documents": ["SKILL.md", "writing-rubric.md", "speaking-rubric.md"]
}
```

Interface thống nhất:

```ts
type SkillSummary = { id: string; description: string; version: string };
type SkillDocument = {
  skillId: string; document: string; version: string;
  uri: string; text: string;
};
interface SkillRegistry {
  list(): SkillSummary[];
  read(skillId: string, document?: string): SkillDocument;
}
type LoadedSkills = Map<string, {
  version: string; documents: Set<string>;
}>;
```

`documents` trong LoadedSkills chỉ gồm tài liệu đã xuất hiện đầy đủ trong provider request thành công. Có vùng pending riêng cho kết quả mới tải, chỉ chuyển sang loaded sau provider response thành công. Chặn business call cùng batch với load: model chưa có cơ hội đọc kết quả khi tạo batch đó.

Tất cả 7 MCP tools hiện hữu phụ thuộc `task-management/SKILL.md`. Gym và IELTS là skill tư vấn bổ sung; tạo task từ kế hoạch gym vẫn phải nạp task-management. Trong bản đầu, lựa chọn đúng chuyên môn và đọc rubric đúng ngữ cảnh được hướng dẫn bằng prompt và kiểm tra bằng eval; không tuyên bố chốt tool có thể cưỡng chế mọi câu trả lời văn bản tự do.

## Task 1: Registry và nội dung skill nền tảng

**Files:** Tạo `backend/skills/types.ts`, `registry.ts`, `content/task-management/{manifest.json,SKILL.md}`, `test/registry.test.ts`.

**Interfaces:** Export types trên và `loadSkillRegistry(root: URL): Promise<SkillRegistry>`; đọc file bất đồng bộ khi khởi tạo registry, giữ snapshot bất biến trong một turn.

- [ ] Viết test registry cho nội dung đầy đủ, thiếu file, manifest trùng ID, đường dẫn vượt root, symlink ra ngoài root, tài liệu quá lớn và version đổi khi reference đổi.

```ts
expect(registry.read("task-management").document).toBe("SKILL.md");
expect(() => registry.read("task-management", "../../.env")).toThrow();
expect(() => registry.read("unknown")).toThrow();
expect(registry.read("task-management").text).toContain("idempotencyKey");
```

- [ ] Chạy `pnpm exec vitest run skills/test/registry.test.ts` từ backend; xác nhận test đỏ trước implementation.
- [ ] Implement schema manifest: id khớp `^[a-z0-9-]+$`, description không rỗng, entrypoint nằm trong documents, documents duy nhất. Dùng realpath kiểm tra containment; chỉ đọc tài liệu nằm trong manifest. Dùng URL tương đối `import.meta.url`, không phụ thuộc cwd.
- [ ] Giới hạn mỗi tài liệu 10.000 ký tự và tổng tài liệu skill đang nạp trong turn 30.000 ký tự. Trả lỗi rõ ràng thay vì cắt tài liệu; giới hạn là hằng số dùng chung và được test.
- [ ] Viết task-management/SKILL.md từ quy tắc nghiệp vụ đang có trong system prompt: resolve ID, đọc lại task trước sửa, UUID idempotencyKey, retry giữ nguyên arguments/key, trạng thái task và chỉ báo thành công khi tool thành công. Giữ quy tắc authorization và độ tin cậy của user/tool data trong system prompt.
- [ ] Chạy lại test registry, kỳ vọng PASS; kiểm tra nội dung Markdown khớp schema và tool descriptions thực tế.

## Task 2: MCP Resources cho cùng nguồn tài liệu

**Files:** Tạo `backend/mcp/resources/skills.ts`, `backend/mcp/test/skills.test.ts`; sửa `backend/mcp/server.ts` và call site tạo server nếu cần truyền registry.

**Interfaces:** `registerSkillResources(server: McpServer, registry: SkillRegistry): void`; resource URI `skill://{skillId}/{document}`, MIME `text/markdown`.

- [ ] Viết integration test qua InMemoryTransport: listResources có SKILL.md, readResource trả đúng nội dung/version tương ứng registry; URI không hợp lệ không trả file ngoài registry.

```ts
const result = await client.readResource({ uri: "skill://task-management/SKILL.md" });
expect(result.contents[0]).toMatchObject({
  mimeType: "text/markdown",
  text: registry.read("task-management").text,
});
```

- [ ] Chạy `pnpm exec vitest run mcp/test/skills.test.ts`, xác nhận test đỏ.
- [ ] Dùng `server.registerResource` theo type của SDK đang cài; callback lấy tài liệu từ registry snapshot. Truyền cùng registry cho agent và MCP server, tránh lệch phiên bản trong turn.
- [ ] Giữ nguyên danh sách/quyền tool MCP hiện tại; resource reads không tạo quyền hoặc loaded state của agent.
- [ ] Chạy lại test resources và các test server/router hiện hữu, kỳ vọng PASS.

## Task 3: Tool tải skill và policy kiểm soát thực thi

**Files:** Tạo `backend/services/agentSkillService.ts`, `backend/skills/policy.ts`, `backend/services/test/agentSkillService.test.ts`, `backend/skills/test/policy.test.ts`.

**Interfaces:** Export `createAgentSkillSession(registry)` trả `{ catalog, definitions, load, readDocument, acceptProviderContext, canExecute }`. `load(id)` và `readDocument(id, document)` trả SkillDocument và thêm pending; `acceptProviderContext()` chuyển pending sang loaded sau model response thành công; `canExecute(toolName)` kiểm tra loaded và mapping.

- [ ] Viết test chứng minh nạp tài liệu chưa lập tức mở tool; chỉ mở sau provider context được chấp nhận.

```ts
const session = createAgentSkillSession(registry);
expect(session.canExecute("orbit_create_task")).toBe(false);
session.load("task-management");
expect(session.canExecute("orbit_create_task")).toBe(false);
session.acceptProviderContext();
expect(session.canExecute("orbit_create_task")).toBe(true);
```

- [ ] Chạy hai test files mới, xác nhận đỏ.
- [ ] Định nghĩa `load_skill({skillId})` và `read_skill_document({skillId,document})` bằng schema strict. Không chấp nhận version hoặc loaded flag do model truyền. Resource được đọc bằng MCP client ở integration agent; đối chiếu response với registry trước ghi pending.
- [ ] Policy khai báo đầy đủ 7 tên tool trong `backend/mcp/tools.ts`; tool nghiệp vụ chưa có mapping bị từ chối mặc định. `grill_user` và hai loader được xử lý riêng, không mở quyền business.
- [ ] Trả lỗi tool có cấu trúc: `SKILL_REQUIRED`, `SKILL_NOT_FOUND`, `SKILL_DOCUMENT_NOT_FOUND`, `SKILL_CONTENT_TOO_LARGE`; kèm `executed:false` và skill cần tải khi bị chặn. Load lặp lại không cộng budget lần nữa.
- [ ] Chạy lại test; thêm case skill IELTS không mở task tools, session khác không thừa hưởng trạng thái và thiếu tài liệu không đánh dấu loaded.

## Task 4: Tích hợp agent loop, checkpoint và giới hạn vòng

**Files:** Sửa `backend/services/agentService.ts`, `backend/services/test/agentService.test.ts`; dùng `backend/types/IAgent.ts` hiện hữu, chỉ mở rộng nếu implementation thực sự cần.

**Interfaces:** Agent dùng session Task 3; `toolsByName` vẫn giới hạn tool MCP được server cấp theo user/scope. Tool list mỗi provider request gồm loader, grill_user khi Ask, và giao của tool được cấp với policy đã mở.

- [ ] Thêm mock-provider test cho chuỗi `load_skill → model nhận Markdown → business call → final`; spy xác nhận không gọi MCP business tool trước bước model nhận tài liệu.
- [ ] Thêm test model gọi load và business cùng batch: business nhận SKILL_REQUIRED, không chạy; sau vòng model mới mới có thể chạy. Test gọi business trực tiếp dù tool đang ẩn cũng bị chặn.
- [ ] Chạy `pnpm exec vitest run services/test/agentService.test.ts`, xác nhận case mới đỏ.
- [ ] Đưa catalog tên/mô tả vào system context. Instruct model chọn skill phù hợp trước tư vấn, tải task-management trước thao tác dữ liệu và đọc reference được SKILL.md yêu cầu. Nội dung skill là tài liệu maintainer, không nâng user data thành chỉ dẫn.
- [ ] Xử lý loader riêng khỏi business output truncation 12.000 ký tự: đưa toàn bộ Markdown đã kiểm tra vào tool response. Chỉ mark pending sau khi message được thêm thành công; accept sau provider call thành công có chứa message đó.
- [ ] Kiểm tra `canExecute(name)` ngay trước `mcpClient.callTool`. Không tự chạy lại business call bị chặn; để model tạo call mới sau khi đọc hướng dẫn.
- [ ] Tạo session mới mỗi turn. History có kết quả load cũ không tự mở tool; model phải tải lại. Checkpoint giữ tool-call/result pairs như hiện tại; lỗi checkpoint/provider không để lại loaded state có thể dùng ở request khác.
- [ ] Nâng giới hạn vòng thành hằng số 8 để có chỗ tải skill/reference, giữ giới hạn 40 calls và lần cuối `tool_choice: none`. Test final summary sau write ở vòng cuối; đo ảnh hưởng timeout frontend 60 giây, không tự tăng timeout nếu chưa có số liệu.
- [ ] Test Auto/Ask, menu kết thúc turn rồi answer ở turn mới, retry write không lặp thành công, hai user concurrent, provider failure sau load, unknown tool, và history đã có load nhưng vẫn phải tải lại.
- [ ] Chạy lại agent tests cùng `services/test/conversationHistory.test.ts`, kỳ vọng PASS.

## Task 5: Chuyên môn gym/IELTS, đóng gói và kiểm chứng

**Files:** Tạo `backend/skills/content/gym/{manifest.json,SKILL.md}` và `backend/skills/content/ielts/{manifest.json,SKILL.md,writing-rubric.md,speaking-rubric.md}`; cập nhật `docs/agent-chat-architecture.md`. Kiểm tra `backend/Dockerfile`, `.dockerignore` và cấu hình deploy thực tế trước sửa asset inclusion nếu cần.

- [ ] Viết gym/SKILL.md: thu thập mục tiêu, kinh nghiệm, lịch rảnh, thiết bị và giới hạn vận động liên quan; lập lịch phù hợp dữ liệu đã có; chỉ lưu task khi được yêu cầu. Không biến mọi lượt tư vấn thành một bảng câu hỏi bắt buộc.
- [ ] Viết ielts/SKILL.md: xác định kỹ năng, mục tiêu, trình độ/bài làm; Writing phải đọc writing-rubric, Speaking phải đọc speaking-rubric. Rubric đối chiếu nguồn IELTS chính thức khi viết nội dung; ghi nguồn và ngày rà soát, diễn giải bằng lời riêng. Nhận xét chỉ dựa trên dữ liệu thực có; không chấm phát âm từ văn bản thuần.
- [ ] Test registry tự phát hiện skill mới bằng manifest, không phải sửa agent loop; test reference read thực sự xuất hiện trong messages. Không gọi test mock là bằng chứng model thực tế luôn chọn đúng chuyên môn.
- [ ] Kiểm tra assets Markdown/JSON có mặt trong Docker/deploy artifact và đọc được từ cwd khác. Startup/registry failure phải báo lỗi cấu hình rõ ràng, không silently mở tool.
- [ ] Ghi log tối thiểu `skill_loaded`, `skill_document_loaded`, `tool_blocked_missing_skill` với requestId, skillId, version, toolName; không log toàn bộ Markdown, prompt hoặc dữ liệu cá nhân.
- [ ] Cập nhật tài liệu: cách thêm folder/manifest, cách thêm tool mapping, ranh giới bảo đảm nội bộ Orbit với client MCP ngoài và cách cập nhật phiên bản tài liệu.
- [ ] Chạy từ backend: `pnpm run build`, `pnpm test`. Theo quy định repo, chạy từ frontend: `pnpm run lint`, `pnpm run build`; báo lỗi có sẵn riêng nếu có. Integration dùng MongoDB disposable khi có cấu hình, ghi rõ phần skip.
- [ ] Smoke test bằng provider thật khi có cấu hình: xem task, tạo task rõ ràng, kế hoạch gym không lưu, kế hoạch IELTS rồi yêu cầu lưu, chấm Writing có đọc reference. Đánh giá lựa chọn skill, thứ tự đọc/thực thi, chất lượng câu trả lời và latency; không tự tạo dữ liệu người dùng thật để smoke test.

## Acceptance criteria

1. Business tool được gọi trực tiếp khi chưa có skill sẽ không thực thi, kể cả khi model tự dựng tên tool.
2. Agent phải có provider round nhận đủ Markdown trước business call; load và action cùng batch không vượt chốt.
3. Thêm chuyên môn chỉ cần manifest và tài liệu; thêm business tool cần policy mapping rõ ràng.
4. Không tải hết nội dung các skill vào mọi request; catalog luôn nhỏ, tài liệu tải theo nhu cầu.
5. Lượt chat mới không tin loaded flag trong history; lỗi tải/cắt tài liệu không mở tool.
6. Quyền MCP, idempotency, Ask menu và báo cáo kết quả tool giữ đúng hành vi hiện hữu.
7. Test tự động chứng minh thứ tự/context và gate; eval thực tế kiểm tra chọn chuyên môn, không nhầm hai mức bảo đảm này.

## Thứ tự bàn giao

Thực hiện Task 1–4 trước để hoàn thành cơ chế bắt buộc đọc cho task tools. Task 5 bổ sung nội dung chuyên môn và xác minh triển khai trên cùng cơ chế. Mỗi task là một đơn vị review/commit độc lập khi người dùng yêu cầu commit; kế hoạch này không tự commit hoặc deploy.
