# Chat Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream text và tiến độ tool, hỗ trợ Dừng và nối lại cho mọi giao diện chat mà không thực thi trùng lượt.

**Architecture:** HTTP claim/cancel và SSE qua authenticated fetch, runner độc lập socket trong một tiến trình backend Docker/VPS. MongoDB lưu snapshot và event atomically; execution guard hiện có tiếp tục bảo vệ tool writes. Frontend dùng chung reducer/session cho Ask, Auto, V2, Agent và chat cũ.

**Tech Stack:** Node 22+, Express 5, TypeScript NodeNext ESM, Mongoose transactions, OpenAI-compatible SDK hiện có, React, axios/fetch, Vitest, Playwright, pnpm@11.21.0.

**Spec:** [2026-11-18-chat-streaming.md](../specs/2026-11-18-chat-streaming.md).

## Global Constraints

- Tối đa 3 lượt đang chạy mỗi tài khoản; vượt giới hạn báo rõ, không tự xếp hàng.
- Mỗi cuộc trò chuyện chỉ có một lượt đang chạy.
- Giới hạn tổng 5 phút, tính từ lúc claim lượt, bao gồm chuẩn bị lịch sử, attachment/vision, gọi AI, tool và hoàn tất.
- Bản đầu hỗ trợ một tiến trình backend thực thi lượt trên một instance Docker/VPS, MongoDB có transaction như luồng claim hiện tại.
- Mất kết nối không hủy lượt; Dừng không rollback tool đã hoàn tất; restart không thực thi lại tool.
- Giữ requestId idempotency, ownership, `req.validatedBody`, route -> controller -> service -> repository, import `.js` trong backend TypeScript.
- Chỉ pnpm; không sửa real `.env`, generated output, lockfile thủ công hoặc thay đổi ngoài phạm vi.
- Spec -> Plan -> Test đỏ -> Code -> Test xanh -> Lint -> Format check -> Build/type-check.

## Workspace và baseline trước thực thi

Worktree đã tạo từ `feat/stream-chat-statistic`, HEAD tại thời điểm viết `6bbc2bd`: `/home/bonxom/.codex/worktrees/1579/TodoApp`. Dùng workdir này cho mọi command; không tạo worktree thứ hai. Các đường dẫn bên dưới tương đối với worktree. Skill trong `.agents` bị ignore nên đọc bản đã cung cấp ở checkout nguồn nếu worktree không chứa chúng.

- [ ] Kiểm tra `git status --short`, `git rev-parse HEAD`, `git worktree list`; bảo toàn chỉnh sửa có sẵn. Nếu worktree detached, tạo branch `feat/chat-streaming` sau khi xác nhận tên chưa tồn tại bằng `git show-ref --verify refs/heads/feat/chat-streaming`; không reset checkout nguồn.
- [ ] `corepack enable`; từ `backend`, chạy `pnpm install --frozen-lockfile`; từ `frontend`, chạy `pnpm install --frozen-lockfile`.
- [ ] Từ `backend`: `pnpm run build`, `pnpm test`; từ `frontend`: `pnpm test`, `pnpm run lint`, `pnpm run build`. Ghi baseline failure riêng trước khi sửa; không gọi failure có sẵn là regression mới.
- [ ] Xem `backend/services/test/conversationService.integration.test.ts` và cấu hình Vitest để dùng đúng DB fixture hiện tại. Test concurrency mới phải có replica set riêng; không trỏ database người dùng. Nếu harness hiện tại chỉ mock, thêm harness thật ở Task 1.

## Bản đồ file và trách nhiệm

| Nhóm               | File chính                                                                                                         | Trách nhiệm                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Protocol           | `backend/types/IChatStream.ts`, `frontend/src/shared/types/chatStream.ts`                                          | Public snapshots/events và trạng thái; không xuất model nội bộ   |
| Persistence        | `backend/models/ChatTurnEvent.ts`, `backend/models/ChatRunSlot.ts`, `backend/repositories/chatStreamRepository.ts` | Durable cursor/event/snapshot, admission và terminal transaction |
| Existing turn      | `backend/types/IChatTurn.ts`, `backend/models/ChatTurn.ts`, `backend/repositories/chatTurnRepository.ts`           | Trạng thái mới, fencing, checkpoint, tích hợp slot/stream        |
| Runner             | `backend/services/chatRunService.ts`, `backend/services/chatRunRecoveryService.ts`                                 | Registry, deadline, cancellation, recovery                       |
| Generation         | `backend/libs/aiStream.ts`, `backend/services/agentService.ts`, `backend/services/conversationTurnService.ts`      | Ghép provider stream, phát tiến độ, giữ tool semantics           |
| Delivery           | `backend/controllers/chatStreamController.ts`, `backend/services/chatEventStreamService.ts`                        | HTTP/SSE, heartbeat, backpressure; controller không query model  |
| Frontend transport | `frontend/src/shared/services/authSession.ts`, `frontend/src/shared/services/chatStreamService.ts`                 | Auth dùng chung, fetch SSE, parser                               |
| Frontend state     | `frontend/src/features/tasks/hooks/chatStreamReducer.ts`, `frontend/src/features/tasks/hooks/useChatRunStream.ts`  | Cursor, retry, reconcile, vòng đời subscription                  |
| Frontend views     | Existing conversation hooks, chat components, i18n                                                                 | Composer/Dừng, progress, terminal labels, navigation             |
| Runtime            | `backend/server.ts`, `frontend/nginx.conf`, `docs/agent-chat-architecture.md`                                      | Recovery, graceful shutdown, proxy, vận hành                     |

Đặt các test mới cạnh test cùng tầng. Không tách/refactor toàn bộ agentService; chỉ tách adapter stream và runner orchestration cần thiết. Tên file mới là quyết định của plan; các interface bên dưới là hợp đồng giữa task.

### Task 1: Admission, durable protocol và lifecycle repository

**Files:** Create `backend/types/IChatStream.ts`, `backend/models/ChatTurnEvent.ts`, `backend/models/ChatRunSlot.ts`, `backend/repositories/chatStreamRepository.ts`, `backend/repositories/test/chatStreamRepository.integration.test.ts`, `backend/test/helpers/chatMongo.ts`. Modify `backend/types/IChatTurn.ts`, `backend/models/ChatTurn.ts`, `backend/repositories/chatTurnRepository.ts`, `backend/error/definitions/aiErrors.ts`, `backend/package.json` chỉ nếu cần harness/script DB.

**Interfaces:**

```ts
// IChatStream.ts; also define public ToolProgress, ChatStreamEvent and TurnSnapshot.
export type TerminalStatus = 'completed' | 'failed' | 'cancelled' | 'timed_out' | 'interrupted';
export type RunStatus = 'processing' | 'stopping' | TerminalStatus;
// chatStreamRepository; owner checked on every external lookup.
getSnapshot(userId: string, conversationId: string, turnId: string): Promise<TurnSnapshot>;
readEvents(userId: string, conversationId: string, turnId: string, after: number, limit: number): Promise<ChatStreamEvent[]>;
append(turnId: string, executionToken: string, event: ChatEventInput): Promise<ChatStreamEvent>;
requestStop(userId: string, conversationId: string, turnId: string, reason: 'user' | 'deadline'): Promise<TurnSnapshot>;
finish(turnId: string, executionToken: string, outcome: TurnOutcome): Promise<TurnSnapshot>;
// ChatEventInput is a discriminated union of the six non-terminal event types in spec.
// TurnOutcome = { status: TerminalStatus; terminalReason?: string; result: PublicChatResult }.
// PublicChatResult is the existing public resultFor shape, with the new status union.
```

`claim` giữ API hiện tại và thêm claim slot/initial event trong cùng transaction; turn ID vẫn từ requestId hiện có. Event seq tăng bằng update có fencing trong transaction, không count-then-insert. Public snapshot projection không trả executionToken/messages. `finish` là transaction chung cho response/event/slot/lock; `finishWithProposal` tích hợp cùng transaction này thay vì finish rồi append terminal riêng.

- [ ] Viết DB integration test admission trước. Dùng fixture `createUserAndConversations(count)` và `claimFor(userId, conversationId, requestId)` định nghĩa trong `chatMongo.ts`: tạo user/category/conversation qua model hiện có trên DB test, gọi repository claim thật; close/drop DB riêng trong afterAll.

```ts
it("admits only three concurrent conversations for one user", async () => {
  const { userId, conversationIds } = await createUserAndConversations(4);
  const outcomes = await Promise.allSettled(
    conversationIds.map((id, n) => claimFor(userId, id, `request-${n}`)),
  );
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(3);
  expect(await ChatRunSlot.countDocuments({ userId })).toBe(3);
});
```

- [ ] Thêm test same-conversation race; duplicate cùng payload giữ một slot/turn; conflict payload; owner isolation; rollback claim không rò slot; user thứ hai không bị quota user đầu. Event append fail phải rollback cả partial snapshot/seq; unique cursor; finish lặp chỉ một terminal event. Giữ regression claim attachment/selection.
- [ ] Chạy từ backend: `pnpm exec vitest run repositories/test/chatStreamRepository.integration.test.ts`; xác nhận đỏ vì thiếu protocol/admission, không phải thiếu DB. Harness đọc `CHAT_TEST_MONGO_URI`, fail rõ nếu thiếu khi chạy integration; không silently skip. Nếu cần script mới, đặt `test:chat:integration` chạy đúng file này và recovery integration ở Task 4; dependencies thêm bằng pnpm và lockfile tương ứng.
- [ ] Implement schema fields/indexes, slot transaction, atomic append/projection/finish theo spec. Test kích thước output 1 MiB, event 16 KiB, count 20.000; dùng injected limits nội bộ test để không sinh hàng chục nghìn documents. Không tin limits từ HTTP.
- [ ] Rerun test target xanh; `pnpm run build`; commit scoped `feat(chat): persist streaming runs and enforce admission limits`.

### Task 2: Provider streaming adapter và nội dung nhiều round

**Files:** Create `backend/libs/aiStream.ts`, `backend/libs/test/aiStream.test.ts`. Modify `backend/services/agentService.ts`, `backend/types/IAgent.ts`, `backend/libs/aiProvider.ts` chỉ khi cần chia sẻ error mapping; test `backend/services/test/agentService.test.ts`, create `backend/services/test/agentStreaming.test.ts`.

**Interfaces:**

```ts
export type AgentStreamHooks = {
  signal: AbortSignal;
  emit(event: ChatEventInput): Promise<void>;
};
// AgentMemory gains optional stream?: AgentStreamHooks.
export async function readAiStream(
  chunks: AsyncIterable<ChatCompletionChunk>,
  options: { signal: AbortSignal; onText(text: string): Promise<void> },
): Promise<ChatCompletionMessage>;
```

Adapter trả message hoàn chỉnh để `validateAgentResponse` và tool loop hiện tại tiếp tục dùng. Adapter không gọi tool, không persist, không xử lý HTTP. Nhánh non-stream giữ cho client cũ. JSON/tool args không phát ra public stream.

- [ ] Viết fixture async generator có chunk content và args bị chia theo index, nhiều tool call xen kẽ. Test text callback xảy ra trước generator kết thúc:

```ts
it("emits content before the provider completes", async () => {
  const gate = Promise.withResolvers<void>();
  async function* chunks() {
    yield providerChunk({ content: "Xin " });
    await gate.promise;
    yield providerChunk({ content: "chào" }, "stop");
  }
  const onText = vi.fn();
  const reading = readAiStream(chunks(), {
    signal: new AbortController().signal,
    onText,
  });
  await vi.waitFor(() => expect(onText).toHaveBeenCalledWith("Xin "));
  gate.resolve();
  expect((await reading).content).toBe("Xin chào");
});
```

`providerChunk(delta, finishReason = null)` là fixture trong file test trả đầy đủ `id/object/created/model/choices` theo type SDK. Dùng helper deferred tương đương nếu tsconfig không có Promise.withResolvers.

- [ ] Test abort, malformed/missing tool arguments, finish_reason length/content_filter, stream throw giữa chừng, provider không hỗ trợ stream, reasoning field không phát, text nhiều round không lặp. Không execute tool khi arguments mới nhận một phần; không fallback non-stream sau lỗi.
- [ ] Run `pnpm exec vitest run libs/test/aiStream.test.ts services/test/agentStreaming.test.ts`, xác nhận đỏ; implement stream:true SDK call, async chunk assembly, validate cuối round và emit từng public text chunk. Rerun xanh và existing agentService tests.
- [ ] Commit `feat(chat): stream provider text and assemble tool calls safely`.

### Task 3: Runner độc lập kết nối, progress và cancellation fence

**Files:** Create `backend/services/chatRunService.ts`, `backend/services/test/chatRunService.test.ts`. Modify `backend/services/conversationService.ts`, `backend/services/conversationTurnService.ts`, `backend/services/agentService.ts`, `backend/utils/agentBudget.ts`, `backend/services/attachmentVisionService.ts`, `backend/mcp/context.ts`, `backend/utils/agentMessages.ts`, `backend/utils/conversationView.ts`, `backend/utils/agentActivity.ts`. Inspect write handlers in `backend/mcp/` and preserve their transaction guard.

**Interfaces:**

```ts
// chatRunService, singleton registry owned by backend process.
start(turn: ChatTurn, context: McpContext, selected?: AgentInteraction): void;
cancel(userId: string, conversationId: string, turnId: string): Promise<TurnSnapshot>;
shutdown(): Promise<void>;
// runConversationTurn gains optional fourth parameter:
type TurnExecution = {
  signal: AbortSignal;
  deadlineAt: Date;
  emit(event: ChatEventInput): Promise<void>;
};
```

`start` chỉ schedule lượt đã claim mới; registry không phải nguồn owner/quota. `conversationService` tách `claimTurn(input, context)` trả `{ turn, claimed, selectedInteraction }` dùng chung bởi `send` JSON cũ và `startStreamTurn` mới. `startStreamTurn` trả snapshot, không await runner. `send` cũ vẫn await cùng turn execution và public result; không giữ runner hai lần. Mọi execution được cấp deadline/slot, stream hooks chỉ bật cho API mới.

- [ ] Viết test với deferred provider/tool: disconnect subscriber không abort run; cancel abort provider, không gọi tool tiếp; stop race completion có một terminal; stop khi tool commit phải giữ activity và status stopping đến khi resolve; persist lỗi không announce success.
- [ ] Thêm test clock: fake timer tới 300.000 ms abort vision hoặc provider; nhiều round không reset deadline; terminal vẫn persist dù lease hết hạn. Test flush 50 ms/4 KiB, boundary terminal flush, output limit, batching UTF-8. Test failed partial giữ nguyên thay vì bị `interruptedReply` ghi đè.
- [ ] Run `pnpm exec vitest run services/test/chatRunService.test.ts services/test/agentBudget.test.ts`, xác nhận đỏ đúng hành vi.
- [ ] Implement AbortController/absolute deadline, bắt mọi background rejection. Với tool loop phát started ngay trước execute và finished sau kết quả; dùng mapping label/summary có whitelist, generic fallback; giữ `AgentActivity` nghiệp vụ riêng. Await persist before publish. Kiểm tra signal trước/sau attachment/vision, provider và tool; pass signal theo SDK hỗ trợ, không nhầm request abort với run abort.
- [ ] Bổ sung DB race test stop/beforeWrite ở file integration Task 1: hai transaction tranh execution guard; không cho write mới sau stop đã commit. Sửa filter guard/lease/finish và finishWithProposal để không công bố completed khi stop thắng; không release slot khi write chưa rõ. Test lịch sử tool chưa có result được chuẩn hóa, partial text có marker server sở hữu.
- [ ] Rerun targets và `pnpm exec vitest run services/test/agentActivity.test.ts services/test/conversationHistory.test.ts services/test/conversationVision.test.ts services/test/agentService.test.ts`; commit `feat(chat): add cancellable detached chat execution`.

### Task 4: Recovery và shutdown một instance

**Files:** Create `backend/services/chatRunRecoveryService.ts`, `backend/services/test/chatRunRecovery.integration.test.ts`. Modify `backend/server.ts`, `backend/repositories/chatStreamRepository.ts`, `backend/app.ts` nếu readiness cần chặn admission.

**Interfaces:** `recoverInterruptedRuns(instanceId: string): Promise<number>` sau connectDB, trước listen; `chatRunService.shutdown(): Promise<void>` ngừng admission, abort, persist interrupted và chờ tối đa 10 giây. Instance ID sinh mỗi lần process start bằng randomUUID, không nhận từ client.

- [ ] Viết DB test seed claimed run chưa schedule, partial text, tool started chưa checkpoint result, stopping run; gọi recovery hai lần, kiểm tra terminal duy nhất/unknown tool/slot lock được release. Không gọi agent/tool/provider trong recovery.

```ts
expect(await recoverInterruptedRuns("next-instance")).toBe(1);
expect(await recoverInterruptedRuns("next-instance")).toBe(0);
const snapshot = await chatStreamRepository.getSnapshot(
  userId,
  conversationId,
  turnId,
);
expect(snapshot.status).toBe("interrupted");
expect(snapshot.partialResponse).toBe("Đang phân tích");
expect(await ChatRunSlot.countDocuments({ turnId })).toBe(0);
```

- [ ] Run `pnpm exec vitest run services/test/chatRunRecovery.integration.test.ts`, xác nhận đỏ; implement recovery transaction dùng terminal path, không chỉ sửa status. Test recovery DB lỗi chặn startup/admission.
- [ ] Thêm unit test shutdown timeout bằng fake timers, không chờ thật 10 giây. Implement SIGTERM/SIGINT đúng một handler, đóng listener và registry timers; lần kill cứng sau phục hồi bằng DB. Rerun integration/runner targets; commit `feat(chat): recover interrupted runs on backend restart`.

### Task 5: HTTP API và durable SSE delivery

**Files:** Create `backend/controllers/chatStreamController.ts`, `backend/services/chatEventStreamService.ts`, `backend/validations/chatStreamValidation.ts`, `backend/controllers/test/chatStreamController.test.ts`, `backend/services/test/chatEventStreamService.test.ts`. Modify `backend/routes/aiRoutes.ts`, `backend/services/conversationService.ts`, `backend/utils/conversationView.ts`, `backend/validations/aiValidation.ts`, CORS config tìm trong `backend/app.ts`.

**Interfaces:** Controller exports `startChatTurn`, `getChatTurn`, `streamChatEvents`, `cancelChatTurn`. Service `streamEvents({ userId, conversationId, turnId, after, signal, write, drain }): Promise<void>`; `write(frame: string): boolean`, `drain(): Promise<void>` adapter HTTP chỉ phục vụ subscriber. `signal` ở đây là disconnect subscription, tách signal runner. Owner/cursor kiểm tra trước flushHeaders.

- [ ] Viết Supertest JSON tests 202/200 duplicate/409 conflict/busy/429 quota/401/404 owner; malformed cursor, query priority và Last-Event-ID. SSE dùng low-level Node HTTP hoặc service writer fake để không chờ response vô hạn.
- [ ] Viết test seam event thêm sau snapshot, trong replay, trước wait: event đúng thứ tự không mất; notification mất vẫn đọc sau <=1 giây; terminal replay đóng; heartbeat 15 giây; `write=false` đợi drain; buffer >256 KiB đóng subscriber nhưng runner sống.

```ts
expect(frames.join("")).toContain("event: assistant.delta\n");
expect(frames.join("")).toContain("id: 2\n");
expect(frames.join("")).not.toContain("executionToken");
expect(runAbort.signal.aborted).toBe(false);
```

`frames` ghi từ `write` fake và `runAbort` thuộc runner fixture; dispose SSE signal trong finally để test không treo. Test lỗi sau headers kết thúc subscription/reconnect, không viết JSON error vào SSE.

- [ ] Run `pnpm exec vitest run controllers/test/chatStreamController.test.ts services/test/chatEventStreamService.test.ts`, xác nhận đỏ; implement routes đúng spec, validate Zod, headers, batching read 100, heartbeat/backpressure cleanup. Mỗi query repository có owner, không chỉ lần mở đầu.
- [ ] Conversation GET trả `activeRun` kèm snapshot cursor; history labels mới qua conversationView. Legacy JSON response giữ shape và status compatibility cho lượt cũ. Rerun conversation integration + controller tests; commit `feat(chat): expose resumable SSE and run cancellation APIs`.

### Task 6: Auth dùng chung và fetch SSE parser

**Files:** Create `frontend/src/shared/services/authSession.ts`, `frontend/src/shared/services/chatStreamService.ts`, `frontend/src/shared/types/chatStream.ts`, `frontend/src/shared/services/test/chatStreamService.test.ts`. Modify `frontend/src/shared/services/httpClient.ts`, `frontend/src/shared/services/aiService.ts`, `frontend/src/shared/types/domain.ts`, `frontend/src/shared/services/test/httpClient.test.ts`.

**Interfaces:**

```ts
// authSession.ts; extract existing logic, preserving same shared promise and Web Lock.
getAccessToken(): Promise<string | null>;
refreshAccessToken(): Promise<string>;
handleTerminalAuthFailure(): Promise<void>;
// chatStreamService.ts
startTurn(payload: ChatPayload): Promise<TurnSnapshot>;
getTurn(conversationId: string, turnId: string): Promise<TurnSnapshot>;
cancelTurn(conversationId: string, turnId: string): Promise<TurnSnapshot>;
subscribeTurn(options: {
  conversationId: string; turnId: string; after: number;
  signal: AbortSignal; onEvent(event: ChatStreamEvent): void;
}): Promise<void>;
```

JSON methods dùng axiosInstance; chỉ subscribe dùng fetch. Subscribe không tự backoff (Task 7 sở hữu), nhưng dùng cùng auth helper để retry mở socket tối đa một lần khi 401. Dùng env.serverUrl như axios, không hardcode origin. Public schema types khớp backend protocol v1.

- [ ] Viết parser tests từ ReadableStream chia giữa byte UTF-8 tiếng Việt, giữa CRLF và frame boundary, nhiều data lines/comments, nhiều events một chunk. Test HTTP JSON errors trước stream, 200 sai content-type, malformed JSON/version, premature EOF, abort reader cleanup.
- [ ] Viết race auth test axios request và SSE mở cùng lúc đều 401 -> một refresh; late 401 dùng token mới; terminal 401/logout/sessionRevision change không update user cũ; token không nằm URL. Giữ Web Lock behavior existing tests.
- [ ] Run từ frontend `pnpm exec vitest run src/shared/services/test/chatStreamService.test.ts src/shared/services/test/httpClient.test.ts`, xác nhận đỏ; extract auth không đổi semantics và implement parser. Parser reject event sai schema để hook reconcile, không crash React.
- [ ] Rerun tests + `pnpm run typecheck`; commit `feat(chat): add authenticated resumable SSE client`.

### Task 7: Reducer, reconnect và điều hướng session

**Files:** Create `frontend/src/features/tasks/hooks/chatStreamReducer.ts`, `frontend/src/features/tasks/hooks/useChatRunStream.ts`, `frontend/src/features/tasks/hooks/test/chatStreamReducer.test.ts`, `frontend/src/features/tasks/hooks/test/useChatRunStream.test.tsx`. Modify `frontend/src/features/tasks/hooks/useConversationChat.ts`, `frontend/src/features/tasks/hooks/useConversationSession.ts`, `frontend/src/features/tasks/api/aiMutations.ts`, `frontend/src/features/agent/AgentSessionProvider.tsx`.

**Interfaces:**

```ts
reduceChatRun(state: ChatRunState, action: ChatRunAction): ChatRunState;
// State: snapshot: TurnSnapshot | null, connection: idle|connecting|live|reconnecting|offline|error,
// messages projected from snapshot and ordered events; generation guards are in hook.
useChatRunStream(options: {
  conversationId?: string; snapshot: TurnSnapshot | null;
  onSnapshot(snapshot: TurnSnapshot): void;
  onActivity(activity: AgentActivity): void;
  onTerminal(snapshot: TurnSnapshot): void;
}): { connection: string; reconnect(): void; stop(): Promise<void> };
```

`ChatRunAction` union `snapshot` (replace authoritative state), `event` (apply seq), `connection` (UI transport only). Reducer throw typed cursor-gap error for seq > last+1; ignore duplicates <=last; event turnId mismatch ignored. `TurnSnapshot` giữ current accumulated text/toolProgress, terminal result replaces canonical message bằng message ID ổn định. `useConversationChat` trả `activeRun`, `connection`, `stop`, `reconnect` cùng API cũ.

- [ ] Viết reducer test sequence 1,2,2,3 không lặp text; gap không append; snapshot và terminal không tạo bot message thứ hai; tools update theo ID; activities deduplicate; menu/proposal chỉ terminal.

```ts
const once = reduceChatRun(initial, {
  type: "event",
  event: textEvent(2, "Xin"),
});
const twice = reduceChatRun(once, {
  type: "event",
  event: textEvent(2, "Xin"),
});
expect(twice.snapshot?.partialResponse).toBe("Xin");
expect(twice.snapshot?.lastEventSeq).toBe(2);
```

`initial` fixture snapshot cursor 1 cùng turnId với `textEvent`; define fixtures đầy đủ theo Task 6 public types.

- [ ] Hook tests fake timers: retry 1/2/4/8/10 giây + jitter injectable, online retry, dừng sau 10 failures, reconnect chỉ GET, premature EOF reconnect, terminal unsubscribe, unmount/logout không cancel, old generation event không lọt conversation mới.
- [ ] Session test switch/new conversation được khi run active, composer đúng conversation vẫn khóa; giữ discard draft guard. Duplicate start chưa có ACK dùng cùng requestId, không auto-new request sau terminal. React StrictMode không tạo runner mới/subscriber rò rỉ.
- [ ] Run `pnpm exec vitest run src/features/tasks/hooks/test/chatStreamReducer.test.ts src/features/tasks/hooks/test/useChatRunStream.test.tsx`, xác nhận đỏ; implement reducer/hooks và tách busy submission khỏi run state. On activity/terminal gọi `invalidateWorkspaceQueries`, không dựa mutation onSettled của POST 202 (quá sớm).
- [ ] Rerun hook tests + existing attachment/skills/session tests; commit `feat(chat): reconnect active runs and isolate conversation state`.

### Task 8: Trải nghiệm streaming trên mọi UI chat

**Files:** Create `frontend/src/features/tasks/components/chat/ChatRunStatus.tsx`, `frontend/src/features/tasks/components/test/ChatStreaming.test.tsx`. Modify `frontend/src/features/v2/components/V2AgentChatBubble.tsx`, `frontend/src/features/agent/AgentChatBubble.tsx`, `frontend/src/features/agent/AgentPage.tsx`, `frontend/src/features/tasks/components/chat/SmallChat.jsx`, `frontend/src/features/tasks/components/chat/ChatField.jsx`, `frontend/src/features/tasks/components/chat/MermaidDiagram.jsx` chỉ nếu renderer hiện tại chưa chịu code fence dở, `frontend/src/features/agent/AgentActivityList.tsx` nếu cần wiring activity; locale `frontend/src/shared/i18n/locales/{vi,en}/agent.json`, CSS gần component tương ứng.

**Interfaces:** `ChatRunStatus({ run, connection, onStop, onReconnect })` dùng public snapshot. Không tạo subscriber riêng trong từng status component; hook/session sở hữu một subscriber mỗi view/provider. Existing surfaces/proposals nhận canonical result sau terminal như trước.

- [ ] Component tests parameterize Ask/Auto và ba surfaces: text hiện trước completion, tool label/summary không raw args, Dừng -> Đang dừng -> Đã dừng, cancel request lỗi không giả báo cancelled, 429 giữ draft và giải thích giới hạn 3 lượt.
- [ ] Test terminal labels cả vi/en, accessible stop button/live region, partial Markdown/code fence/Mermaid không crash, user scroll lên không bị giật xuống; menu/proposal giữ confirmation behavior.
- [ ] Run `pnpm exec vitest run src/features/tasks/components/test/ChatStreaming.test.tsx`, xác nhận đỏ; implement controls và status theo style sẵn có, không redesign giao diện ngoài phạm vi. Reuse frontend-design skill khi thực thi quyết định visual nếu cần.
- [ ] Rerun `pnpm exec vitest run src/features/v2/test/AgentChatBubbleModes.test.tsx src/features/agent/test/AgentPage.test.tsx src/features/tasks/components/test/ChatUsability.test.jsx src/features/tasks/components/test/ChatAttachments.test.jsx`; commit `feat(chat): display live tool progress and stop controls across chat views`.

### Task 9: Proxy, E2E và bằng chứng restart thực tế

**Files:** Create `frontend/e2e/chat-streaming.spec.ts`, `backend/scripts/chat-stream-fixture.ts`, `docs/ai/chat-streaming-operations.vi.md`. Modify `frontend/nginx.conf`, `docs/agent-chat-architecture.md`, test scripts/config chỉ nếu cần chạy fixture độc lập.

Fixture là provider HTTP OpenAI-compatible chạy riêng chỉ trong test, không thêm public endpoint giả vào app production. Script dùng Node HTTP built-in, host 127.0.0.1 mặc định, port qua env `CHAT_FIXTURE_PORT`, trả text chunks/tool_calls deterministic và cho test giữ/release response qua control port local có test key ngẫu nhiên. Không thay auth hoặc bỏ ownership. Test MongoDB và tài khoản riêng; fixture không gọi API thật.

- [ ] Viết Playwright tests trước wiring Nginx: ba surfaces x Ask/Auto, type text before terminal, tool started pending, switch conversation, drop/reopen stream, duplicate frames, stop then no next write, keep partial after reload, quota fourth run, token refresh và logout. Dùng existing e2e fixtures để mock transport riêng UI; chạy thêm real backend/provider fixture cho detach/restart/write race, không coi route mock là bằng chứng backend.
- [ ] Run `pnpm exec playwright test e2e/chat-streaming.spec.ts` từ frontend để xác nhận đỏ theo hành vi chưa có; sau implementation chạy lại xanh với fixture deterministic. Thiếu browser thì `pnpm exec playwright install chromium`; báo rõ nếu dependency hệ thống cản trở.
- [ ] Configure location regex events đặt **bên trong** `location ^~ /api/` hiện tại (hoặc thay bằng nested prefix hợp lệ): tránh regex top-level bị `^~ /api/` nuốt. Nested location match `/api/ai/conversations/[^/]+/turns/[^/]+/events$`; proxy_pass `http://backend:4000` không URI, buffering/cache/gzip off, HTTP/1.1, `Connection ""`, timeout 600s và giữ forwarded headers. Không copy websocket Upgrade vào SSE location.
- [ ] `docker compose build backend frontend`; chạy `nginx -t` trong image frontend; dùng compose với env test riêng, không sửa real `.env`. Qua Nginx dùng `curl --no-buffer` và tài khoản test để chứng minh text/heartbeat đến trước terminal. Ngắt curl, kiểm tra GET snapshot backend vẫn chạy; nối `after` đúng cursor. Không in token vào log/report.
- [ ] Thực hiện restart backend giữa run bằng fixture giữ provider: sau startup GET snapshot interrupted, slot hết, không thêm tool write. Chạy stop/write transaction race trên DB thật; ghi timeline commit/stop từ logs chỉ metadata, không nội dung riêng tư.
- [ ] Tài liệu vận hành ghi single-process invariant, deadline/limits, Mongo transaction requirement, graceful shutdown/recovery, cách smoke/rollback; rollback cần ngừng admission và để drain hoặc mark interrupted trước khi dùng binary cũ không hiểu status mới. Commit `test(chat): verify streaming through nginx and backend restarts`.

### Task 10: Kiểm tra cuối và đối chiếu acceptance criteria

**Files:** Hai tài liệu spec/plan hiện tại, test/report tại `docs/superpowers/reviews/2026-11-18-chat-streaming.md` (tạo khi thực thi, không ghi kết quả giả trước).

- [ ] Từ backend chạy lần lượt `pnpm test`, `pnpm run lint`. Từ frontend chạy `pnpm test`, `pnpm run lint`. Sửa lỗi phát sinh, không format/refactor phần không liên quan.
- [ ] Format check các file thay đổi thuộc backend/frontend bằng project-local Prettier: `pnpm exec prettier --check <danh sách file đã đổi của package>`; thay danh sách bằng output đã review của `git diff --name-only` và các file mới, không shell interpolate dữ liệu tùy ý. Chạy thêm `pnpm run format:check` mỗi package để ghi rõ baseline format issues toàn repo nếu có. Format hai tài liệu Markdown bằng Prettier local cùng phiên bản backend.
- [ ] Sau tests/lint/format chạy backend `pnpm run build`; frontend `pnpm run build` (đã gồm typecheck). Rerun test sau mọi thay đổi ảnh hưởng hành vi; không chỉ dựa build xanh.
- [ ] Chạy lại target DB integration với replica set thật và `pnpm exec playwright test e2e/chat-streaming.spec.ts`; ghi test account/fixture setup và kết quả Docker smoke/restart.
- [ ] Đối chiếu coverage: AC01/AC11 -> Tasks 2,8,9; AC02/AC03/AC12 -> Tasks 5,6,7,9; AC04/AC05/AC07/AC14 -> Tasks 1,3,7,8,9; AC06/AC09/AC10/AC16 -> Tasks 1,5,6; AC08 -> Tasks 4,9; AC13 -> Tasks 7,8,9; AC15 -> Tasks 1,5,9. Mỗi AC cần test assertion hoặc evidence manual cụ thể, không chỉ tên file.
- [ ] Review `git diff --check`, `git status --short`, scoped diff; không secrets/generated files. Dùng verification-before-completion và requesting-code-review trước khi tuyên bố hoàn tất implementation. Report exact commands, pass/fail/skip, warnings và hạn chế single-instance. Không merge/deploy production trong task viết spec/plan.

## Trạng thái tại thời điểm bàn giao tài liệu

Chỉ có spec và plan được viết; chưa cài dependencies, viết feature test, sửa runtime, chạy baseline suite hoặc triển khai streaming. Các test/code snippet ở trên là hướng dẫn thực thi, không phải bằng chứng tính năng đã tồn tại. Mặc định kỹ thuật mới trong spec (batch/limits/backoff/single-instance) phải được giữ nhất quán khi triển khai; thay đổi thiết kế thì cập nhật cả hai tài liệu trước code.

## Review remediation — 2026-11-18

Các lỗi phát hiện sau implementation được sửa trên cùng worktree, không đổi thiết kế HTTP + SSE:

- [x] Thêm regression test đỏ cho success/cancel/error/deadline/menu; chỉ finalizer streaming ghi kết quả + event + release slot. Proposal được finalize cùng transaction tạo draft; deadline thắng phải rollback draft.
- [x] Khôi phục context `tasks:write` bằng `createMcpContext`; xét `isError` thật của MCP và kết thúc progress của internal skill tools.
- [x] Đồng bộ reducer/cursor trước callback; replay ngay khi gap, bỏ phản hồi session cũ, reconcile cả cancel response đã terminal và giữ composer khóa khi transport lỗi.
- [x] Giữ partial text và nhãn terminal trong lịch sử sau reload; bảo toàn timezone của browser khi gửi API mới.
- [x] Thêm kiểm thử HTTP dùng SDK thật + provider HTTP fixture + auth thật + Mongo replica set: text/tool events trước completion, disconnect/replay và cancel provider đang stream.
- [x] Kiểm tra browser với backend thật trên Agent, chat cũ và V2; provider fixture giữ phần cuối để chứng minh UI hiển thị trước completion.

Kết quả command và giới hạn kiểm chứng được ghi trong `docs/superpowers/reviews/2026-11-18-chat-streaming.md`. Không diễn giải E2E mock hoặc Nginx syntax check thành bằng chứng tích hợp production.
