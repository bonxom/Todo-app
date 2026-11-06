# Personal Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Local skill: `.claude/skills/executing-plans/SKILL.md`. Không bắt đầu implementation trong lượt chỉ yêu cầu spec/plan.

**Goal:** Giao thư viện skills cá nhân và runtime discovery/read sau Agent Workspace.

**Architecture:** Tách personal advisory context khỏi trusted skill execution policy. UserSkill lưu MongoDB; template catalog read-only; per-turn snapshot chỉ đưa overview và documents đã đọc vào provider.

**Tech Stack:** Node/Express/TypeScript/Mongoose/Zod; React/React Router/Zustand/TanStack Query; Vitest/Testing Library/Playwright; pnpm@11.21.0.

**Spec:** [Specification](../specs/2026-11-06-personal-skills.md). Đọc toàn bộ spec trước task đầu tiên.

## Global Constraints

- Dùng pnpm và tooling project-local.
- Không sửa .env thật, node_modules, dist hoặc lockfile bằng tay.
- Thứ tự: test fail đúng behavior → code → test → lint → format check → build/type-check.
- Giữ authorization, ownership, request idempotency, execution lease và auth session isolation.
- Không thêm dependency nếu tooling hiện tại đủ dùng.
- File mới dưới đây là đề xuất; file có sẵn phải đọc trước khi sửa. Không rewrite unrelated code để khớp snippets.
- Code snippets khóa interface và hành vi trọng tâm; mở rộng fixtures/test cases được liệt kê trong cùng task trước implementation.
- Sau mỗi task pass, kiểm tra diff và commit riêng các file task nếu đang thực hiện workflow commit; không stage toàn bộ worktree.

## Dependency và file map

Hoàn tất Agent Workspace trước task 5 UI; tasks backend có thể được xây theo thứ tự dưới đây sau khi hợp đồng response Workspace ổn định. Không release UI trước API/runtime.

- Create `backend/{models/UserSkill.ts,models/UserSkillQuota.ts,types/IUserSkill.ts,repositories/userSkillRepository.ts,services/personalSkillService.ts,validations/skillValidation.ts,controllers/skillController.ts,routes/skillRoutes.ts}`.
- Create `backend/error/definitions/skillErrors.ts`; use actual `backend/error/AppError.ts`.
- Create `backend/skills/templates/{registry.ts,ielts/manifest.json,ielts/SKILL.md,gym/manifest.json,gym/SKILL.md}`; preserve legacy resource content as explicit compatibility resources.
- Create `backend/services/agentPersonalSkillService.ts`; modify `backend/services/{agentService.ts,conversationTurnService.ts}`, `backend/utils/{agentMessages.ts,conversationView.ts}`, `backend/{models/ChatTurn.ts,types/IChatTurn.ts}`.
- Modify `backend/routes/aiRoutes.ts`, `backend/mcp/resources/skills.ts`, `backend/skills/registry.ts` only as necessary to separate template compatibility and trusted registry. Preserve `backend/skills/policy.ts` enforcement.
- Create `frontend/src/shared/services/skillService.ts`, `frontend/src/shared/types/skill.ts`.
- Create `frontend/src/features/agent/skills/{SkillsPage.tsx,SkillEditorPage.tsx,TemplateGallery.tsx,SkillReadBadge.tsx,skills.css}` and `api/{skillKeys.ts,skillQueries.ts,skillMutations.ts}` beneath that directory.
- Modify Agent routes/navigation, chat message renderer and `shared/types/domain.ts` for skillsRead.

## Task 1: Owned CRUD, quota và optimistic concurrency (S1, S2)

**Files:** New backend model/repository/service/validation/controller/route/error files; mount skillRoutes in aiRoutes. Create `backend/services/test/personalSkillService.test.ts`, `backend/services/test/personalSkills.integration.test.ts`.

**Interfaces:**

```ts
export type SkillInput = {
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
};
// personalSkillService.list(userId), get(userId, id), create(userId, input),
// update(userId, id, expectedVersion, input), remove(userId, id, expectedVersion)
// Never accept userId inside client input; derive req.user in controller.
```

- [ ] Viết tests cho every endpoint: guest, owner, other user/admin, missing/invalid ID, empty/oversize body, extra fields, duplicate names, update version conflict, failed delete rollback. Test 49 existing + 2 concurrent creates chỉ một thành công; 50 + delete/create race không vượt quota.

```ts
const results = await Promise.allSettled([
  service.create(owner, validSkill),
  service.create(owner, validSkill),
]);
expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
expect(await repository.count(owner)).toBe(50);
```

Trong test dùng service/repository imports đã khai báo; seed 49 và quota 49 trong fixture transaction. Mongo integration dùng test harness sẵn có; không mock transaction cho test race.

- [ ] Run `cd backend && pnpm exec vitest run services/test/personalSkillService.test.ts services/test/personalSkills.integration.test.ts`; red phải do contract thiếu.
- [ ] Implement schema/unique index UUID/owner index/quota counter. Quota doc tạo một lần theo owner; transaction conditional increment `<50` cùng insert; unique owner key chống initial upsert race. Conditional delete decrement chỉ khi xóa thành công.

```ts
const skillInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  instructions: z.string().trim().min(1).max(10000),
  enabled: z.boolean().default(true),
});
// PUT schema thêm expectedVersion int >=1, yêu cầu enabled rõ ràng.
```

- [ ] Controller dùng validatedBody; service xử lý owner/version/errors; repository giữ query/transaction. Register static routes trước /:skillId, Cache-Control no-store.
- [ ] Rerun targeted tests/build, review/commit `feat: add owned personal skill APIs`.

## Task 2: Templates và compatibility (S3, S6)

**Files:** Template registry/content, personalSkillService, template controller/routes methods, MCP adapter/registry separation. Create `backend/skills/test/templates.test.ts`; extend `backend/mcp/test/skills.test.ts`.

**Interfaces:** `listTemplates(): TemplateSummary[]`, `readTemplate(id): TemplateDetail`; `personalSkillService.importTemplate(userId, templateId, expectedTemplateVersion)` trả bản sao mới.

- [ ] Viết registry tests hash stable/content change, no path traversal, IELTS có nội dung hai rubric và <=10000 chars, import independent copy, stale template version 409, user empty không auto-seed, duplicate explicit imports độc lập, quota dùng cùng transaction task 1. Existing MCP skill URI vẫn đọc được template compatibility content.

```ts
const copy = await personalSkillService.importTemplate(
  owner,
  "ielts",
  template.version,
);
expect(copy.sourceTemplateVersion).toBe(template.version);
expect(copy.id).not.toBe("ielts");
expect(copy.instructions.length).toBeLessThanOrEqual(10000);
```

- [ ] Run `cd backend && pnpm exec vitest run skills/test/templates.test.ts mcp/test/skills.test.ts`; capture red.
- [ ] Convert IELTS/Gym thành template manifests/Markdown, giữ old URIs qua read-only compatibility adapter; internal default advisory catalog không còn auto-list chúng sau task 4. Không để template copies và compatibility files bị lệch: test đối chiếu nguồn rubric/nội dung tương ứng.
- [ ] Implement preview/list/import endpoints, rerun tests, review/commit `feat: offer IELTS and Gym as opt-in skill templates`.

## Task 3: Per-turn snapshot và personal tools (S1, S4, S5)

**Files:** personalSkillService snapshot, new agentPersonalSkillService; create `backend/services/test/agentPersonalSkillService.test.ts`.

**Interfaces:**

```ts
// Snapshot only exists server-side for one execution, never a global user cache.
type PersonalSkillSnapshot = ReadonlyArray<{
  id: string;
  name: string;
  description: string;
  version: number;
  instructions: string;
}>;
// createPersonalSkillSession(snapshot) => { list(), read({skillId, version}), reads() }
// list(): { skills: Array<{id,name,description,version}> }
// reads(): Array<{id,name,version}>; unique successful reads only.
```

- [ ] Write tests list omits instructions/disabled/system skills, cannot read absent ID/version, same-turn frozen content, next-turn update/delete reflected, read repeat dedup budget, 30000 content cap, snapshot isolation A/B, read metadata only after success.

```ts
const session = createPersonalSkillSession([enabledSkill]);
expect(JSON.stringify(session.list())).not.toContain(enabledSkill.instructions);
expect(
  session.read({ skillId: enabledSkill.id, version: enabledSkill.version }),
).toMatchObject({ instructions: enabledSkill.instructions });
expect(session.reads()).toEqual([
  {
    id: enabledSkill.id,
    name: enabledSkill.name,
    version: enabledSkill.version,
  },
]);
```

- [ ] Run `cd backend && pnpm exec vitest run services/test/agentPersonalSkillService.test.ts`; verify behavioral red.
- [ ] Implement immutable snapshot query, pure bounded read session, strict schemas for list/read arguments; owner derived once from McpContext, no owner argument exposed to model.
- [ ] Rerun tests, review/commit `feat: add per-turn personal skill discovery and reads`.

## Task 4: Integrate runtime, history và policy boundaries (S4–S6, S8, S9)

**Files:** agentService/conversationTurnService/agentMessages/conversationView/ChatTurn type/model; extend `backend/services/test/{agentSkillsRuntime.test.ts,agentSkillService.test.ts,agentBudget.test.ts,conversationHistory.test.ts}`; create `backend/services/test/personalSkillsRuntime.test.ts`.

**Interfaces:** `skillsRead: Array<{id,name,version}>` in turn persistence, ChatResponse and bot message DTO. Trusted `agentSkillService` APIs remain private and separate. Personal loader identity includes origin personal, never resolves trusted requirement by display name.

- [ ] Mock provider request capture. Tests first provider request has valid list_skills exchange/overview without unread full content; repeated model list uses cached catalog; read result enters next provider request; catalog DB failure yields retryable failure before tools. Test edited skill not replayed from previous messages, completed request retry returns original metadata, read checkpoint survives final response error.
- [ ] Add adversarial fixture personal skill named IELTS with instructions asking to unlock specialist_tool; invoke dispatcher and assert block independent of model output. Keep trusted same-batch/read/request snapshot tests, ownership and call/time budget regressions.

```ts
expect(
  providerRequests[0].messages.some(
    (m) => m.role === "tool" && m.tool_call_id === catalogCallId,
  ),
).toBe(true);
expect(firstRequestText).not.toContain(unreadInstructions);
expect(blockedDispatch.executed).toBe(false);
```

- [ ] Run `cd backend && pnpm exec vitest run services/test/personalSkillsRuntime.test.ts services/test/agentSkillsRuntime.test.ts services/test/agentSkillService.test.ts services/test/agentBudget.test.ts services/test/conversationHistory.test.ts`; inspect intended red.
- [ ] Load snapshot before provider round 1 within existing budget. Add list_skills/read_skill internal tools to dispatch ahead of business MCP tools. Replace filesystem advisory catalog injection with personal overview exchange; keep trusted prerequisites accessible only through trusted loaders when actually configured.
- [ ] Strip old personal loader document text from history using explicit tool names/origin, preserving valid tool-call/result protocol; metadata-only historical read summaries. Do not erase normal user/chat content.
- [ ] Checkpoint successful read metadata; add public projection to both live result and history, including await-user/error turns. No system instructions or personal instructions in public metadata.
- [ ] Rerun targeted + full backend test, review/commit `feat: use personal skill context in agent turns`.

## Task 5: Skills UI, cache và read badges (S1–S3, S7, S8)

**Files:** skill service/types, Agent skills files/API hooks/routes, chat renderer/domain. Create `frontend/src/features/agent/skills/test/{SkillsPage.test.tsx,SkillEditorPage.test.tsx,SkillReadBadge.test.tsx}` and `frontend/src/shared/services/test/skillService.test.ts`.

**Interfaces:** skillService list/get/create/update/remove/templates/template/importTemplate mirror API table exactly; mutation keys include auth session identity. SkillReadBadge consumes `{ id, name, version }`, links `/agent/skills/:id` and displays historical-vs-current version.

- [ ] Read frontend-design skill for UI. Write tests empty/list/search, toggle success/rollback, validation length, 409 draft retained, dirty navigation cancel, delete confirm, template preview/import, disabled save while sending, account logout clears cache, deleted skill badge target unavailable.

```tsx
await user.click(screen.getByRole("button", { name: /save/i }));
await screen.findByRole("alert"); // fixture responds 409
expect(screen.getByRole("textbox", { name: /instructions/i })).toHaveValue(
  editedInstructions,
);
```

- [ ] Run `cd frontend && pnpm exec vitest run src/features/agent/skills/test src/shared/services/test/skillService.test.ts`; expected missing page/API behavior.
- [ ] Implement helper through shared httpClient and query hooks; expose no raw Axios calls in components. Full PUT includes expectedVersion; delete query includes expectedVersion. On conflict invalidate list but preserve editor draft.

```ts
export const skillKeys = {
  all: (sessionKey: string) => ["skills", sessionKey] as const,
  detail: (sessionKey: string, id: string) =>
    ["skills", sessionKey, id] as const,
};
```

- [ ] Add Chat/Skills navigation; keep shared chat provider mounted when switching tab. Editor dirty blocker separate from chat draft; opening skill must not erase chat. Plain Markdown editor plus existing safe renderer preview; no arbitrary HTML editor.
- [ ] Add badge from backend metadata only, version/deleted handling; loading/error/mobile/keyboard states; explain edits next turn. Rerun tests, review/commit `feat: manage personal skills in agent workspace`.

## Task 6: End-to-end và rollout notes (S1–S9)

**Files:** Create `frontend/e2e/personal-skills.spec.ts` and `frontend/e2e/personal-skills.fixture.ts`; update `docs/agent-chat-architecture.md`; create `docs/ai/personal-skills.md` with API/rollout/limits.

- [ ] Read webapp-testing skill. Playwright cover create → edit → toggle → delete, template copy, conflict, skill badge from chat, 390px drawer/editor, account switch and dirty tab navigation. API fixtures test UI, không thay thế backend ownership tests.

```ts
test("imports an editable IELTS copy", async ({ page }) => {
  // Set authenticated fixture with empty personal library and IELTS template.
  await page.goto("/agent/skills");
  await page.getByRole("button", { name: /add from template/i }).click();
  await page.getByRole("button", { name: /preview IELTS/i }).click();
  await page.getByRole("button", { name: /add to my skills/i }).click();
  await expect(page.getByRole("textbox", { name: /name/i })).toHaveValue(
    "IELTS",
  );
});
```

Labels là accessibility contract cho UI; nếu dùng tiếng Việt nhất quán thì đổi test và UI cùng nhau.

- [ ] Run Playwright; thực hiện smoke AI thật hai tài khoản như spec nếu đủ credentials. Ghi tool discovery/read thực tế; không log instructions hoặc secrets ra telemetry.
- [ ] Document no auto-seed, preserved MCP compatibility, changed default advice behavior, next-turn updates, quota/budget, backend-before-frontend deployment và rollback giữ dữ liệu.
- [ ] Run all final gates; review/commit `test: verify personal skill lifecycle and agent integration`.

## Final verification commands

```bash
cd backend
pnpm test
pnpm run lint
pnpm run format:check
pnpm run build

cd ../frontend
pnpm test
pnpm exec playwright test e2e/personal-skills.spec.ts e2e/agent-workspace.spec.ts e2e/chat-usability.spec.ts e2e/task-proposals.spec.ts
pnpm run lint
pnpm run format:check
pnpm run build
```

Nếu full formatting check có baseline failures, chạy thêm `pnpm exec prettier --check` với chính xác từng file feature đã đổi và báo cả hai kết quả; không format unrelated files. Actual Mongo concurrency/provider smoke phải được ghi riêng với environment, result hoặc blocker.

Coverage: S1→1,3,4,5,6; S2→1,5,6; S3→2,5,6; S4→3,4; S5→3,4; S6→2,4; S7→5,6; S8→4,5,6; S9→4,6.
