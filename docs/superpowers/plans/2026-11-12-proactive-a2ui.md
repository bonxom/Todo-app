# Proactive A2UI System Prompt — Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to execute task-by-task. Đây là plan bàn giao; phiên sửa tài liệu không triển khai code.

**Goal:** Khuyến khích agent cân nhắc trực quan khi người dùng yêu cầu thống kê, tổng kết và nội dung có cấu trúc, giữ guidance được load theo nhu cầu.

**Architecture:** Chỉ cập nhật đoạn system prompt do `formatDeveloperUiSkillContext` sinh. Không đổi tool exposure, loader, skill session, schema, renderer hoặc persistence.

**Tech Stack:** TypeScript, Vitest và pnpm hiện có; không dependency mới.

**Spec:** [2026-11-12-proactive-a2ui.md](../specs/2026-11-12-proactive-a2ui.md).

## Global constraints

- Không preload full A2UI guidance hoặc tự tạo synthetic UI loader exchanges.
- Không expose present_ui/presentation trước khi model load guidance hợp lệ.
- Chỉ lời khuyến khích ngắn trong system prompt; không đưa full component catalog/schema/examples vào prompt.
- Giữ SKILL.md/manifest và mọi giới hạn, flags, gates, write permissions, Confirm.
- Không sửa hoặc stage thay đổi time/web-search đang có trong worktree.
- Test → Code → Test → Lint → Format check → Build/type-check; không coi mocked model là bằng chứng tăng adoption.

## Task 1 — Baseline và regression contract

**Read:** `backend/services/agentUiService.ts`, `backend/services/agentService.ts`, `backend/services/agentSkillService.ts`, `backend/skills/content/ui-composition/SKILL.md`.

**Test:** `backend/services/test/agentUiCapability.test.ts`, `backend/services/test/agentUiRuntime.test.ts`, `backend/services/test/agentSkillsRuntime.test.ts`.

**Interfaces:** Giữ `formatDeveloperUiSkillContext(registry, capability): string`, `UiCapability`, SurfaceSpec và response union hiện tại.

- [ ] Đọc spec và ghi nhận baseline tests; kiểm tra system prompt hiện tại để xác nhận thiếu khuyến khích rõ cho thống kê/tổng kết.
- [ ] Trước thay prompt, nếu có model credentials, chạy 8 tình huống spec mục 3 với dữ liệu synthetic; ghi baseline lựa chọn text/UI và số lần load UI guidance. Không reset/checkout đè worktree.
- [ ] Giữ test hiện có assert request đầu không expose present_ui. Bổ sung assertion payload không chứa full SkillDocument hoặc synthetic UI load_skill exchange nếu chưa có; greeting không được runtime tự preload.
- [ ] Dùng runtime sequence có sẵn để test: provider request đầu chưa có UI → model gọi load_skill → request kế tiếp có UI → trả valid surface. Test proposal presentation dùng cùng gate.

```ts
completionCreate
  .mockImplementationOnce(async (payload) => {
    expect(toolNames(payload)).not.toContain("present_ui");
    return response(
      call("load-ui", "load_skill", { skillId: "ui-composition" }),
    );
  })
  .mockImplementationOnce(async (payload) => {
    expect(toolNames(payload)).toContain("present_ui");
    return response(call("show-ui", "present_ui", fixture.readonly));
  });
expect(await agentService.chatWithMcp("Tổng kết tiến độ", context)).toEqual({
  surfaceSpec: fixture.readonly,
});
```

- [ ] Các tests giữ contract có thể đã xanh trước sửa; không sửa expectations để mở tool sớm. Với thay đổi lời hướng dẫn, baseline behavior bằng model thật mới là bằng chứng vấn đề lựa chọn; không cố tạo test fail giả bằng assertion câu văn chính xác hoặc mocked answer.
- [ ] Run `cd backend && pnpm exec vitest run services/test/agentUiCapability.test.ts services/test/agentUiRuntime.test.ts services/test/agentSkillsRuntime.test.ts`.

## Task 2 — Cập nhật system prompt ngắn

**Modify:** `backend/services/agentUiService.ts::formatDeveloperUiSkillContext`.

**Read-only integration check:** `backend/services/agentService.ts` đã gọi helper khi xây system prompt; không cần sửa tool loop.

- [ ] Thay câu thông báo chung hiện tại bằng catalog summary hiện có, lời khuyến khích tại spec mục 3 và yêu cầu gọi load_skill khi chọn visual.
- [ ] Nội dung cần giữ cùng đoạn: thống kê/tổng kết/tiến độ/so sánh/lịch trình/quy trình là các tình huống đáng cân nhắc; không chờ user yêu cầu biểu đồ; dữ liệu phải có căn cứ; trả text cho câu ngắn/text-only; không hỏi riêng chỉ để xin dùng visual.
- [ ] Giữ early return chuỗi rỗng khi capability disabled. Không tự thêm messages, gọi session.load, sửa requiredDocs hoặc đổi `tool_choice`.
- [ ] Hình thức implementation dự kiến:

```ts
return `Developer UI composition guidance is enabled. Available code-owned developer UI skills: ${JSON.stringify(summaries)}.
When the user asks for statistics, a summary, a progress report, comparisons, a schedule, or an explanation of a process, proactively consider A2UI if a visual layout makes the answer easier to understand. Do not wait for an explicit request for a chart or dashboard.
When a visual response is useful, call load_skill for the available developer UI skill and read its guidance before calling present_ui or passing presentation to propose_tasks.
Gather the required data before presenting; never invent numbers to create a chart. Use plain text for brief answers or when the user requests text only. Do not ask for permission merely to choose a visual format.`;
```

- [ ] Chạy lại tests Task 1 và `services/test/agentSkillService.test.ts`. Kiểm diff chỉ thay lời hướng dẫn và tests cần thiết, không chứa bootstrap/helper/metrics mới.

## Task 3 — Đánh giá và bàn giao

**Create:** `docs/proactive-a2ui-evaluation.md` để ghi kết quả thực tế, không điền trước kết quả pass.

- [ ] Chạy lại cùng 8 cases × 3 lượt với model/config baseline nếu có credentials. Dữ liệu synthetic, không thao tác DB thật. Ghi tool trace, final response type, grounding, lỗi validation, số vòng provider/latency; giữ key và nội dung riêng tư ngoài báo cáo.
- [ ] So sánh mức chủ động ở 5 cases có lợi ích visual; kiểm text-only, câu ngắn và thiếu dữ liệu. Nếu không tăng, điều chỉnh wording trong phạm vi prompt, không tự chuyển sang preload hoặc bỏ gates.
- [ ] Nếu thiếu credentials, ghi blocked live evaluation và không tuyên bố agent thật dùng UI thường xuyên hơn. Mocked tests chỉ xác nhận đường đi loader/tool không bị hỏng.
- [ ] Run minimum verification từ từng package:

```bash
cd backend
pnpm test
pnpm run lint
pnpm exec prettier --check services/agentUiService.ts
pnpm run build
```

```bash
cd frontend
pnpm run lint
pnpm run build
```

- [ ] Nếu có sửa test/docs, thêm đúng các file đó vào lệnh Prettier check. Không format unrelated files. Frontend không thay đổi, không cần thêm UI tests hoặc chạy lại browser chỉ để kiểm câu system prompt.
- [ ] Run `git diff --check`; báo exact commands, pass/fail/skipped, warnings và trạng thái live evaluation. Mapping: A1/A4→Task 2 và live check; A2/A3/A5→Task 1 regression; A6→Task 3.
- [ ] Rollback chỉ revert prompt change. Không commit cùng thay đổi tính năng khác đang có trong worktree.

## Trạng thái bàn giao

Chỉ cập nhật spec/plan theo yêu cầu: khuyến khích trong system prompt, guidance load theo nhu cầu. Chưa sửa application code hoặc chạy live evaluation.
