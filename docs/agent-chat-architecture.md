# Agent chat architecture

## Auto and Ask

Both modes use the same model/tool execution loop in `backend/services/agentService.ts`. Ask adds `grill_user` and prompt guidance to propose useful directions or ask when a decision is needed. Tool descriptions encourage asking before ambiguous writes, but there is no backend Ask approval gate, preview fingerprint, synthetic approved tool call, or tool-name allowlist for Ask.

The model chooses when to ask and which tools to call. After the user answers a menu, that answer becomes a new user turn and the model continues. A clear request does not require a separate confirmation for every create/update call. Existing authorization, input validation, idempotency and execution lease checks remain in place for both modes.

## Ownership

- `agentService.ts`: MCP lifecycle, model/tool loop, checkpoints and final model response.
- `agentInteractionService.ts`: internal `grill_user` definition and validated menu creation.
- `interactionAnswerService.ts`: menu selection validation and state transitions.
- `conversationService.ts` / `conversationTurnService.ts`: history, turn execution and persistence.
- `chatTurnRepository.ts`: claims, leases, checkpoints, menu persistence and finalization.
- MCP task tools: business input validation, permissions and transactional writes.
- `useConversationChat.ts` / `useConversationSession.ts`: sends, menu answers, recovery and pagination.

## Menu lifecycle

The agent explicitly calls `grill_user` with question, 2–4 options and optional custom answers. A displayed menu completes the current turn and closes outstanding tool calls. The UI submits the choice through `POST /api/ai/chat-mcp` with a new request ID and selection. The claim transaction consumes the menu and starts the new turn. Ordinary text can supersede a menu. Legacy confirmation records remain readable; their selected action is passed as model context rather than automatically executed.

## Final responses

Normal replies are always written by the model after it receives tool results. The final allowed tool round is followed by a model call with `tool_choice: "none"`, giving the model a chance to summarize instead of immediately throwing a step-limit error after a successful write.

On an actual error, confirmed tool results may supply a concise factual fallback. The previous verbose “Đã lưu thành công / Phần trả lời ... bị gián đoạn” wrapper has been removed. Unknown outcomes are not reported as successful. This does not eliminate real provider or hosting timeouts.

## Verification

Backend typecheck passed; 149 tests passed. 41 integration tests were skipped because no disposable MongoDB was configured. Tests cover Ask writes without a forced menu, model-written summaries after the final tool round, menu handling and interrupted-result reporting. No live-provider or browser evaluation was performed.
