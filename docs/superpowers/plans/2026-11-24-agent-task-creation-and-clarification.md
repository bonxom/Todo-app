# Orbit Agent Task Creation and Clarification Implementation Plan

> For agentic workers, use `superpowers:executing-plans` to implement the reviewed plan task by task. Check off each step after verifying its result.

**Goal**

Let Auto execute clear creation requests, give the model the committed result of a proposal confirmation, and make clarification easy to answer.

**Architecture**

Use the existing agent loop for creation policy and a conversation-scoped proposal query for confirmation context. Keep the clarification card in the shared chat composer and reuse the existing answer and retry flow.

**Tech stack**

Node.js, TypeScript, Express, Mongoose, React, Tailwind, Vitest, and Playwright.

**Spec**

[Task creation, proposal confirmation, and clarification in Orbit Agent](../specs/2026-11-24-agent-task-creation-and-clarification.md)

## Global constraints

- Reuse the existing endpoints, proposal response and A2UI formats, task editor, and authorization.
- Preserve task ownership, idempotency, execution leases, and explicit proposal write restrictions.
- Use V1/V2 semantic tokens and English/Vietnamese translations. Main touch targets are at least 44 CSS px.
- Run commands from `backend/` or `frontend/` with the pinned pnpm 11.21.0. Use disposable MongoDB data and test-only provider/auth settings.

## Review focus

- An Auto clarification must allow direct creation after the answer. Legacy confirmations still need their Ask-mode selection contract. Task 1 covers both.
- A clear request may omit optional fields. A write failure or replay of the chat request must never be interpreted as another successful creation. Task 1 checks those outcomes.
- A draft that falls outside the transcript window can still be confirmed now. Task 2 verifies ordering by confirmation time.
- A renamed and partially confirmed draft, replayed confirm, failed transaction, or unrelated conversation must yield exact or empty context as applicable. Task 2 inspects the model request.
- A narrow popup with a long question and a failed custom answer must keep the answer and recovery usable. Tasks 3 and 4 verify this in component and browser tests.

## Test setup

- [x] Before the first focused run, use a disposable loopback replica set on port 27034. Reuse a test replica already running there, or create one with these commands and wait until the last command returns `true`.

  ```sh
  docker run --detach --rm --name orbit-agent-task-test-mongo -p 127.0.0.1:27034:27034 mongo:7 --replSet rs0 --bind_ip_all --port 27034
  docker exec orbit-agent-task-test-mongo mongosh --port 27034 --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27034"}]})'
  docker exec orbit-agent-task-test-mongo mongosh --port 27034 --quiet --eval 'db.hello().isWritablePrimary'
  ```

## Task 1 — Route Auto creation and preserve mode across clarification

**Files**

- Modify `backend/services/agentService.ts` and `backend/services/interactionAnswerService.ts`.
- Modify `frontend/src/features/tasks/hooks/useConversationChat.ts`.
- Extend `backend/services/test/agentService.test.ts`, `backend/services/test/taskProposalGeneration.test.ts`, and `backend/services/test/conversationService.integration.test.ts`.
- Extend `frontend/src/features/tasks/components/test/ChatUsability.test.jsx`.
- Update policy descriptions in `docs/agent-chat-architecture.md` and `docs/a2ui-task-proposals.md`.

**Interfaces**

- Consumes the existing `AgentMemory.mode`, `AgentMemory.intent`, `AgentInteraction.kind`, and proposal feature flag.
- Preserves the signatures of `chatWithMcp` and `prepareInteractionSelection` and the existing `ChatPayload.mode` and `selection` fields.

- [x] Add the failing Auto cases. In the enabled suite, check that Auto is offered both tools and still accepts a preview result. Change the existing fabricated create rejection case to use Ask. Keep the explicit proposal regression and the flag-disabled checks. In the HTTP suite, send a clear request with title only, replay the same request ID, and return a separate failed create in another turn. Check the verified activity and saved task rather than relying on fake provider prose.

  ```ts
  expect(autoToolNames).toEqual(
    expect.arrayContaining(["orbit_create_task", "propose_tasks"]),
  );
  expect(askToolNames).not.toContain("orbit_create_task");
  expect(rejectedAskCall).toMatchObject({
    code: "WRITE_FORBIDDEN",
    executed: false,
  });
  expect(createdActivity).toMatchObject({
    kind: "task_created",
    status: "succeeded",
  });
  expect(await Task.countDocuments({ title: "Send the report" })).toBe(1);
  expect(failedToolResult).toMatchObject({ isError: true });
  expect(failedTurn.body.activities ?? []).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "task_created" })]),
  );
  ```

- [x] Add a failing clarification continuation test at each boundary. In the frontend, submit a pending Auto clarification and check the outgoing mode and selection. In the HTTP suite, let an Auto request ask which project to use, answer with `mode: "auto"`, and assert that `orbit_create_task` executes once using the chosen project. Keep the legacy confirmation Auto rejection and inherited `task_proposal` write rejection checks.

  ```ts
  expect(selectionPayload).toMatchObject({
    mode: "auto",
    selection: { interactionId, optionId: "project-a" },
  });
  expect(answerTurn.body.status).toBe("completed");
  expect(await Task.countDocuments({ title, projectId })).toBe(1);
  ```

- [x] Run the new tests against the existing code. Expect an absent Auto create tool, an Auto selection rejected by the backend, and a frontend payload forced to Ask.

  From `backend/`:

  ```sh
  ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27034/ pnpm exec vitest run services/test/agentService.test.ts services/test/taskProposalGeneration.test.ts services/test/conversationService.integration.test.ts
  ```

  From `frontend/`:

  ```sh
  pnpm exec vitest run src/features/tasks/components/test/ChatUsability.test.jsx
  ```

- [x] Implement the policy in `chatWithMcp`. Derive `const createRequiresProposal = proposalsEnabled && ask` and use it at all three existing create checks. Retain the explicit intent allowlist and the independent write guard. In the enabled proposal prompt, put explicit proposal guidance first, Ask creation guidance second, and ordinary Auto guidance last. Auto should create only when explicitly asked and the details are clear, draft editable plans and previews, and ask for essential missing details. For an existing draft awaiting Confirm, direct the user to the draft action. Describe success only after the tool verifies the write.
- [x] In `prepareInteractionSelection`, keep the Ask-only mode check for `pending.kind === "confirmation"`. Use the current mode when `useConversationChat` sends a clarification selection. Keep Ask for legacy confirmation selections. The server still checks the pending interaction ID, status, and answer. Do not alter pending payload replay or the effective proposal intent retained at claim time.
- [x] Run the same focused commands. Expect the new Auto tests, existing Ask proposal cases, explicit intent cases, and flag-disabled regression to pass. Update the two operating guides with the tested policy.

## Task 2 — Include committed proposal results in the next model request

**Files**

- Modify `backend/repositories/A2UI/taskProposalRepository.ts`, `backend/types/IAgent.ts`, `backend/services/conversationTurnService.ts`, and `backend/services/agentService.ts`.
- Extend `backend/repositories/test/taskProposalRepository.integration.test.ts`, `backend/services/test/conversationService.integration.test.ts`, and `backend/services/test/chatStreamingHttp.integration.test.ts`.
- Document the new model context in `docs/agent-chat-architecture.md`.

**Interfaces**

- Add `ConfirmedProposalContext` with `proposalId: string`, `confirmedAt: string`, and `createdTasks: Array<{ taskId: string; title: string }>` to `backend/types/IAgent.ts`.
- Add `taskProposalRepository.findRecentConfirmed(userId: string, conversationId: string): Promise<ConfirmedProposalContext[]>`.
- Pass the result as `AgentMemory.confirmedProposals?: ConfirmedProposalContext[]` in the existing `chatWithMcp` call. Use the section label `Confirmed task proposals (server data):` in the model request.

- [x] Add failing integration tests. Seed four created records with controlled confirmation times, including an old draft confirmed last, plus one cancelled record, one draft, one record in another conversation, and one owned by another user. Call the new repository method and check the exact newest three in order. Include equal timestamps to exercise the stable tie-break.
- [x] Extend the legacy HTTP test to create a five-item proposal through chat, change a title, confirm two rows through the action endpoint, and replay that Confirm. Capture the provider call count before Confirm and check it after both requests. Inspect the system message on the next chat request. Also exercise a rejected confirmation using a failed write and verify that its title did not enter model context. In the streaming integration, inspect the captured provider request for the same context contract.

  ```ts
  expect(completion).toHaveBeenCalledTimes(providerCallsBeforeConfirm);
  expect(recent.map(({ proposalId }) => proposalId)).toEqual([
    lateConfirmedId,
    nextConfirmedId,
    thirdConfirmedId,
  ]);
  expect(
    confirmedContext.filter(({ proposalId }) => proposalId === draft.id),
  ).toEqual([
    {
      proposalId: draft.id,
      confirmedAt: expect.any(String),
      createdTasks: [
        { taskId: firstCreatedId, title: "Send the revised report" },
        { taskId: secondCreatedId, title: "Schedule the review" },
      ],
    },
  ]);
  expect(nextSystemMessage).not.toContain("Task from failed confirmation");
  ```

- [x] Run the focused suites from `backend/`. Expect the repository method and model context tests to fail on current code.

  ```sh
  ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27034/ pnpm exec vitest run repositories/test/taskProposalRepository.integration.test.ts services/test/conversationService.integration.test.ts services/test/taskProposalActions.integration.test.ts services/test/chatStreamingHttp.integration.test.ts
  ```

- [x] Implement the repository read. Filter by `{ userId, conversationId, status: "created", "createdTasks.0": { $exists: true } }`, sort by `{ updatedAt: -1, _id: -1 }`, and limit to three. Project `proposalId`, `updatedAt`, `createdAt`, and `createdTasks`. Use `updatedAt` as confirmation time with `createdAt` for older records lacking it. Match existing projections by using the Unix epoch only if neither timestamp is available. Return only the view fields in the interface.
- [x] Read this context once in the shared turn runner before model invocation. Serialize it into a labeled section of the existing system message when nonempty. Instruct the model to use exact IDs for follow-up lookups, treat titles as data, and require a new user request for writes. Let read failures follow the current turn failure path. Keep the original transcript and Confirm controller intact.
- [x] Rerun the focused tests. Check that the provider saw the result on the follow-up and received no call on Confirm. In the docs, explain that the result records what was created at confirmation time.

## Task 3 — Redesign the shared clarification card

**Files**

- Modify `frontend/src/features/tasks/components/chat/InteractionCard.jsx` and `frontend/src/features/tasks/components/chat/ChatField.jsx`.
- Modify `frontend/src/shared/i18n/locales/en/agent.json` and `frontend/src/shared/i18n/locales/vi/agent.json`.
- Modify clarification copy in `backend/services/agentInteractionService.ts` and `backend/services/agentService.ts`.
- Extend `frontend/src/features/tasks/components/test/InteractionCard.test.jsx`, `frontend/src/features/tasks/components/test/ChatUsability.test.jsx`, `frontend/e2e/chat-usability.spec.ts`, and `backend/services/test/agentService.test.ts`.

**Interfaces**

- Keep the existing `InteractionCard` props and question, selection, cancel, and custom answer JSON shapes.
- Add `writeOwnAnswer` with “Write my own answer” / “Tự nhập câu trả lời” and `skipQuestion` with “Skip question” / “Bỏ qua câu hỏi” in the `agent` namespace. Keep “Send answer” and “Change request” as the primary and secondary labels.

- [x] Add failing component tests. Assert that the question heads one labelled radio group, the custom option is part of it, selecting a row does not submit, and selecting the custom row focuses the textarea without hiding the other options. Verify that text survives switching options and a recoverable send error. Assert that the server-accepted answer collapses into an accessible transcript summary. Keep the coverage for legacy confirmations.

  ```ts
  const ownAnswer = screen.getByRole("radio", { name: "Write my own answer" });
  await user.click(ownAnswer);
  expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveFocus();
  expect(screen.getByRole("radio", { name: "Buổi sáng" })).toBeVisible();
  expect(onAnswer).not.toHaveBeenCalled();
  ```

- [x] Extend the chat test to select custom, type, use “Change request”, then return and assert that the textarea retains the text. From the alternate composer, “Skip question” should send `selection.cancel: true`. Sending a replacement message should omit `selection`. Extend the provider prompt test to assert the short, relevant options guidance. Update existing test selectors to target the radio and textarea labels. Retain the 503 test that compares the full retry payload against the original.
- [x] Run the focused frontend and backend tests and confirm they fail for the missing inline choice and guidance. Capture a baseline of the existing short-popup layout with the current `chat-usability` fixture before editing the CSS.

  From `frontend/`:

  ```sh
  pnpm exec vitest run src/features/tasks/components/test/InteractionCard.test.jsx src/features/tasks/components/test/ChatUsability.test.jsx
  pnpm run test:e2e e2e/chat-usability.spec.ts --workers=1
  ```

  From `backend/`:

  ```sh
  pnpm exec vitest run services/test/agentService.test.ts
  ```

- [x] Implement the card. Keep the question and radio choices in one scrollable body and the footer outside that scroll region. Remove the clarification-specific header and method tabs. Place the custom row at the end of the native radio group and its labelled textarea immediately after the group. Focus the textarea when that row is selected, and use an associated description for each explained choice. Keep the selection and typed text locally by interaction ID. Let the resolved view use the server-saved answer. Preserve the existing legacy confirmation controls.
- [x] In `ChatField`, keep the pending clarification mounted and hide it when showing the replacement composer. Focus the composer on “Change request”, restore focus to the previous answer control on return, and expose “Skip question” there with the existing cancel callback. Keep busy, error, and retry controls reachable. Use Tailwind semantic tokens, wrapping text and 44 px main controls.
- [x] In the tool description and prompt, give the model guidance equivalent to “Ask one short, direct question in the user's language. Offer two to four relevant options. Use at most one sentence per option description when it helps the user decide. Keep tool names and jargon out of the question.” Keep stored question and option lengths supported.
- [x] Rerun the focused commands. Verify option and custom answers, replacement, return, cancellation, retry, and legacy confirmations against their existing payloads and status transitions.

## Task 4 — Verify browser and package behavior

- [x] Add a real-API browser smoke test in `frontend/e2e/agent-task-creation-live.spec.ts`. Adapt the deterministic HTTP provider fixture from `backend/services/test/chatStreamingHttp.integration.test.ts` in a test-only harness at `backend/test/helpers/agentTaskCreationBrowserHarness.ts`. Set test-only environment values before importing the production Express app so it connects to a uniquely named disposable database and uses the local provider. Seed a user and an Uncategorized category with the existing test fixtures. Bind the app to loopback port 3011, allow `http://127.0.0.1:5000`, and use the `token` and `user` local storage keys for the seeded session. Gate the spec with `ORBIT_AGENT_BROWSER_TOKEN` from that harness and pass real chat, task, and proposal API requests through to the app. The scripted provider should assert the offered tools and confirmed-result payload before responding.
- [x] In the live browser test, submit an explicit Auto request and verify the task exists through the UI or task API. Switch to Ask and submit a creation request, then edit and confirm only part of the proposal. Verify the resulting visible created titles and their saved IDs. Ask “Which tasks did I just confirm?” and assert that the provider receives and the chat names exactly the confirmed subset. Exercise at least one Auto clarification continuation through the UI. Start the harness from `backend/` and run Playwright from `frontend/` with the harness token exported as `ORBIT_AGENT_BROWSER_TOKEN`.

  ```sh
  ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27034/ pnpm exec tsx test/helpers/agentTaskCreationBrowserHarness.ts
  ```

  ```sh
  VITE_SERVER_URL=http://127.0.0.1:3011 pnpm run test:e2e e2e/agent-task-creation-live.spec.ts --workers=1
  ```

- [x] Run the frontend browser regressions. In V1/V2 Agent and floating chat, inspect screenshots at 320–390 px, 768 px, and 1440 px across light and dark themes. Check long Vietnamese text, keyboard focus and selection, an open custom field, an error with retry, and a resolved answer. The HTTP integration and fixture-based browser checks complement the live browser run.

  ```sh
  pnpm run test:e2e e2e/chat-usability.spec.ts e2e/task-proposals.spec.ts e2e/task-proposal-slide-deck.spec.ts e2e/agent-workspace.spec.ts e2e/chat-streaming.spec.ts --workers=2
  ```

- [x] Run package tests, then lint and format checks, then builds. Record exact counts and any skips. The live browser test already has its own run above. Report skipped suites individually, with any unverified runtime behavior such as live model response quality.

  From `backend/`:

  ```sh
  ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27034/ pnpm test --maxWorkers=2
  pnpm run lint
  pnpm run format:check
  pnpm run build
  ```

  From `frontend/`:

  ```sh
  pnpm test --maxWorkers=2
  pnpm run lint
  pnpm run format:check
  pnpm run build
  ```

- [x] Stop the test harness so it drops only its disposable database. If setup created a container, stop it with `docker stop orbit-agent-task-test-mongo`. Record which browser cases used the mock provider with the real app, which used mocked API responses, and any failing or blocked checks.
