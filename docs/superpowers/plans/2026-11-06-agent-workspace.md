# Agent Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Local skill: `.claude/skills/executing-plans/SKILL.md`. Không bắt đầu implementation trong lượt chỉ yêu cầu spec/plan.

**Goal:** Giao trang /agent với session dùng chung, project context và kết quả đã xác minh.

**Architecture:** AgentSessionProvider sở hữu một chat session cho protected layout. Backend bổ sung context snapshot và activity projection; tái dùng pipeline chat và renderers hiện có.

**Tech Stack:** Node/Express/TypeScript/Mongoose/Zod; React/React Router/Zustand/TanStack Query; Vitest/Testing Library/Playwright; pnpm@11.21.0.

**Spec:** [Specification](../specs/2026-11-06-agent-workspace.md). Đọc toàn bộ spec trước task đầu tiên.

## Global Constraints

- Dùng pnpm và tooling project-local.
- Không sửa .env thật, node_modules, dist hoặc lockfile bằng tay.
- Thứ tự: test fail đúng behavior → code → test → lint → format check → build/type-check.
- Giữ authorization, ownership, request idempotency, execution lease và auth session isolation.
- Không thêm dependency nếu tooling hiện tại đủ dùng.
- File mới dưới đây là đề xuất; file có sẵn phải đọc trước khi sửa. Không rewrite unrelated code để khớp snippets.
- Code snippets khóa interface và hành vi trọng tâm; mở rộng fixtures/test cases được liệt kê trong cùng task trước implementation.
- Sau mỗi task pass, kiểm tra diff và commit riêng các file task nếu đang thực hiện workflow commit; không stage toàn bộ worktree.

## File map

- Create `frontend/src/features/agent/{routes.tsx,AgentPage.tsx,AgentSessionProvider.tsx,agent.css}`: route, composition, session ownership, layout.
- Create `frontend/src/features/agent/components/{ConversationSidebar.tsx,AgentContextPanel.tsx,AgentActivityList.tsx}`: ba UI concern độc lập.
- Create `frontend/src/features/agent/hooks/useAgentNavigation.ts`: URL/session synchronization và draft blocker.
- Modify `frontend/src/app/router.tsx`, `frontend/src/shared/components/Sidebar.jsx`, `frontend/src/shared/layouts/MainLayout.jsx`: mount provider và route/bubble visibility.
- Modify `frontend/src/features/tasks/hooks/{useConversationChat.ts,useConversationSession.ts}`, `components/chat/{index.jsx,SmallChat.jsx,ChatField.jsx}`: controlled session/draft và chuyển view.
- Modify `frontend/src/features/tasks/components/chat/A2UI/{TaskProposalForm.tsx,taskProposalContext.ts}`: proposal draft lưu trong session để đổi view không mất.
- Modify `frontend/src/shared/services/aiService.ts`, `frontend/src/shared/types/domain.ts`: additive contracts.
- Modify `backend/{models/Conversation.ts,models/ChatTurn.ts,types/IChatTurn.ts,validations/aiValidation.ts,routes/aiRoutes.ts,controllers/aiController.ts}`.
- Modify `backend/{repositories/conversationRepository.ts,repositories/chatTurnRepository.ts,services/conversationService.ts,services/conversationTurnService.ts,services/agentService.ts,utils/conversationView.ts}`.
- Create `backend/services/conversationContextService.ts`, `backend/utils/agentActivity.ts`, `backend/types/IAgentActivity.ts`.
- Modify `backend/services/A2UI/taskProposalActionService.ts`: chiếu kết quả task proposal sau commit.

## Task 1: Một session và draft dùng chung (W3, W5, W9)

**Files:** Provider, hai hooks, ChatField, SmallChat, ChatBubble, A2UI form/context, router. Create `frontend/src/features/agent/test/AgentSessionProvider.test.tsx`; update existing `frontend/src/features/tasks/components/test/ChatBubble.test.jsx`, `ChatAttachments.test.jsx`, `TaskProposalChat.test.tsx`.

**Interfaces:**

```ts
type AgentDraft = {
  text: string;
  files: File[];
  proposalDrafts: Record<string, unknown>;
};
// useConversationChat options được chuyển xuống useConversationSession.
type AgentSessionOptions = {
  initialConversationId?: string;
  skipInitialLoad?: boolean;
};
// Provider exposes chat: ReturnType<typeof useConversationChat>, draft, setDraft.
// Draft keyed by conversationId; new unsaved conversation dùng key 'new'.
```

- [ ] Viết regression test dưới provider thực, mock aiService/attachmentService theo test hiện có. Cover single initial GET, account switch trong request, draft files/text/proposal giữ qua đổi view, discard cancel, pending retry dùng requestId cũ.

```tsx
it("keeps the draft when switching chat surfaces", async () => {
  // Harness renders either SmallChat or Agent chat view under the SAME provider.
  const user = userEvent.setup();
  render(<AgentSessionHarness />);
  await user.type(
    screen.getByRole("textbox", { name: /message/i }),
    "Plan IELTS",
  );
  await user.click(screen.getByRole("button", { name: /open in agent/i }));
  expect(screen.getByRole("textbox", { name: /message/i })).toHaveValue(
    "Plan IELTS",
  );
  expect(aiService.getConversation).toHaveBeenCalledTimes(1);
});
```

Harness là test-only component cần viết trong file test, compose provider + hai view; accessible label phải thống nhất với ChatField thực tế. Trước khi chạy, complete fixture imports/auth/mock responses, không chấp nhận setup error là red test.

- [ ] Chạy `cd frontend && pnpm exec vitest run src/features/agent/test/AgentSessionProvider.test.tsx`; xác nhận fail vì remount mất draft hoặc duplicate loads.
- [ ] Implement provider, controlled composer/proposal state và sessionRevision reset. Provider nhận initialConversationId từ URL đồng bộ ngay mount; invalid URL skip initial load. Hook không tự load latest nếu đã nhận ID.

```tsx
const initialOptions = { initialConversationId, skipInitialLoad: invalidId };
const chat = useConversationChat(initialOptions);
return (
  <AgentSessionContext.Provider value={{ chat, draft, setDraft }}>
    {children}
  </AgentSessionContext.Provider>
);
```

- [ ] Chuyển SmallChat lấy session qua context; không tạo hook thứ hai. Thêm nút Open in Agent dùng cùng session. Draft không serialize vào storage.
- [ ] Chạy targeted test và existing chat component suite; review diff/commit `feat: share agent conversation session across chat surfaces`.

## Task 2: Project context atomic và snapshot (W1, W6)

**Files:** Backend models/types/validation/route/controller/repositories/services trong file map; frontend aiService/domain. Create `backend/services/test/conversationContextService.test.ts`, extend `conversationService.integration.test.ts`.

**Interfaces:** `conversationContextService.update(userId, conversationId, projectId)` trả `{ conversationId, contextProjectId }`; repository update so sánh lease trong atomic operation; claim ghi context vào ChatTurn. `aiService.updateConversationContext(id, projectId)` unwrap data.

- [ ] Viết service tests owner A/B, invalid/deleted project, completed project, null clear; integration test race PATCH-vs-claim phải chứng minh chỉ một ordering hợp lệ. Body strict test reject extra fields.

```ts
await expect(
  conversationContextService.update(userA, conversationB, projectA),
).rejects.toMatchObject({ statusCode: 404 });
// AppError hiện dùng statusCode.
// Sau successful claim, update phải 409 và stored turn.contextProjectId không đổi.
```

- [ ] Chạy `cd backend && pnpm exec vitest run services/test/conversationContextService.test.ts services/test/conversationService.integration.test.ts`; red phải là missing context behavior, không lỗi DB setup.
- [ ] Implement strict schema và route/controller; service resolve ownership qua repository. Cùng transaction/atomic lease pattern hiện có, không check-then-save rời rạc.

```ts
export const conversationContextSchema = z.strictObject({
  projectId: z
    .string()
    .regex(/^[a-f0-9]{24}$/i)
    .nullable(),
});
// PATCH chỉ thành công nếu active lease chưa tồn tại; claim snapshot từ Conversation.
```

- [ ] Truyền turn.contextProjectId đã revalidate vào agent prompt dưới dạng dữ liệu, không string instructions từ tên project. GET context trả unavailable khi project không còn accessible. Update frontend types/helper.
- [ ] Rerun targeted tests và backend build; review/commit `feat: persist agent project context per conversation`.

## Task 3: Kết quả thao tác bền vững (W7)

**Files:** agentActivity utility/type, ChatTurn schema/type, agentService/conversationTurnService/chatTurnRepository/conversationView; proposal action orchestrator. Create `backend/services/test/agentActivity.test.ts`; extend `backend/services/test/conversationHistory.test.ts` and A2UI action tests.

**Interfaces:**

```ts
export type AgentActivity = {
  id: string;
  requestId: string;
  toolCallId: string;
  kind: "task_created" | "task_updated" | "proposal_created";
  status: "succeeded" | "failed" | "unknown";
  title: string;
  resourceType?: "task" | "proposal";
  resourceId?: string;
  occurredAt: string;
};
// projectAgentActivity(input: confirmed tool/action outcome): AgentActivity | null
// checkpoint append uses existing executionToken; duplicate IDs are no-ops.
```

- [ ] Đọc shape tool results và proposal apply commit; viết fixtures theo shape thật. Test confirmed create/update, proposal-only, raw error redaction, duplicate checkpoint, final provider timeout sau successful write, missing outcome không success, old turn [] và history pagination merge.

```ts
expect(projectAgentActivity(unknownWriteFixture)?.status).not.toBe("succeeded");
expect(projectAgentActivity(confirmedCreateFixture)).toMatchObject({
  kind: "task_created",
  status: "succeeded",
  resourceId: taskId,
});
```

- [ ] Chạy `cd backend && pnpm exec vitest run services/test/agentActivity.test.ts services/test/conversationHistory.test.ts`; xác nhận red.
- [ ] Implement allowlist adapter, persisted dedup IDs, activity write cùng checkpoint. Với proposal apply đã commit, derive/persist activity bằng action identity để GET/retry tái dựng nếu projection write thất bại; không gọi lại task mutation để tạo activity. Không sửa semantics task transaction.
- [ ] Thêm activities vào resultFor/get, chỉ expose safe DTO. Với await-user lượt không có bot final text, metadata vẫn trả cấp turn/response và không bị mất vì thiếu response string.
- [ ] Rerun tests; review/commit `feat: expose confirmed agent activity results`.

## Task 4: Agent page, URL và responsive UI (W1, W2, W4, W8, W9)

**Files:** AgentPage/routes/CSS/components/navigation hook, router, Sidebar, MainLayout, aiService/domain; create `frontend/src/features/agent/test/AgentPage.test.tsx` and `frontend/src/features/agent/test/useAgentNavigation.test.tsx`.

**Interfaces:** AgentPage consumes shared chat/draft; context panel calls updateConversationContext; activity list consumes AgentActivity[]; navigation hook owns query param and blocker. No second session in components.

- [ ] Đọc `.claude/skills/frontend-design/SKILL.md` trước visual implementation. Giữ Orbit tokens và accessible labels thống nhất.
- [ ] Viết route tests bằng createMemoryRouter: guest redirect, direct conversation ID, invalid/unowned ID không latest fallback, back/forward, discard cancel giữ URL, bubble absent trên /agent, loading/error/empty states. Viết component tests project revert on 409, activity open task unavailable.

```tsx
expect(
  screen.queryByRole("button", { name: "Open assistant" }),
).not.toBeInTheDocument();
expect(aiService.getConversation).toHaveBeenCalledWith(conversationId);
expect(aiService.getConversation).not.toHaveBeenCalledWith(undefined);
```

- [ ] Run `cd frontend && pnpm exec vitest run src/features/agent/test`; xác nhận thiếu route/behavior.
- [ ] Implement route protected và Agent menu; dùng existing ChatField, không fork renderer. URL có query param canonical khi conversation created/opened. Search history chỉ filter list response hiện có.

```tsx
// Route group ở trong ProtectedGuard và AgentSessionProvider.
{ path: '/agent', element: <AgentPage /> }
// MainLayout renders assistant only outside the /agent route subtree.
```

- [ ] Implement responsive grid/drawers theo spec, focus management/live region, project selection disabled khi pending/sending, activities merge theo id. Task links dùng task detail hiện có qua fetch theo ID, không bịa route /tasks/:id nếu router chưa có.
- [ ] Rerun tests, review/commit `feat: add agent workspace page`.

## Task 5: E2E, regression và tài liệu (W1–W9)

**Files:** Create `frontend/e2e/agent-workspace.spec.ts`, `frontend/e2e/agent-workspace.fixture.ts`; update `docs/agent-chat-architecture.md`.

- [ ] Đọc `.claude/skills/webapp-testing/SKILL.md`. Viết Playwright tests dựa auth/API fixtures đang có; cover chuyển bubble/draft/file/proposal, reload deep link, Back, mobile drawers keyboard, context conflict, confirmed activities và terminal error.

```ts
test("mobile workspace has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // Install authenticated API fixtures before goto, using existing e2e fixture pattern.
  await page.goto("/agent");
  await expect(page.getByRole("textbox", { name: /message/i })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
```

- [ ] Run e2e against production-like seeded state/mock API; fix behavior defects and rerun failing cases. Chạy real smoke backend/provider nếu environment đủ, ghi riêng kết quả.
- [ ] Update architecture doc với shared provider/context/activity semantics và link spec. Record test outputs trong execution notes.
- [ ] Run final gates bên dưới; inspect scoped diff; commit `test: verify agent workspace flows`.

## Final verification commands

Từ từng package tương ứng, chạy theo thứ tự test → lint → formatter → build. Formatter args là danh sách chính xác file đã đổi trong package, lấy từ `git diff --name-only` và review trước; không dùng `prettier --write .`.

```bash
cd backend
pnpm test
pnpm run lint
pnpm run format:check
pnpm run build

cd ../frontend
pnpm test
pnpm exec playwright test e2e/agent-workspace.spec.ts e2e/chat-usability.spec.ts e2e/chat-attachments.spec.ts e2e/task-proposals.spec.ts
pnpm run lint
pnpm run format:check
pnpm run build
```

Nếu package format check có baseline failures, chạy thêm `pnpm exec prettier --check` với danh sách file feature thực tế và báo cả hai kết quả; không sửa unrelated formatting để làm xanh check. Báo chính xác command được thực thi và phân biệt lỗi mới với baseline.

Coverage: W1→2,4; W2→1,4,5; W3→1,5; W4→1,4; W5→1,5; W6→2,4,5; W7→3,4,5; W8→4,5; W9→1,4,5.

## Review follow-up — 2026-11-06

Xem [báo cáo sửa lỗi và kiểm chứng](../../ai/2026-11-06-agent-workspace-review.vi.md). Proposal activities được dựng từ TaskProposal đã commit, với createdRequestId lưu trong cùng transaction xác nhận; không dùng appendActivities best-effort bên trong transaction. Tool activities vẫn checkpoint cùng messages. Pending A2UI action state giữ trong shared provider để retry xuyên hai view dùng cùng requestId. Full local gates pass; smoke AI provider thật chưa chạy.
