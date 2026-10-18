# Conversation memory — internal Orbit chat

Implemented 2026-10-18: steps 1–2 (persist chat and reuse context within a conversation). No vector store, long-term preference memory or automatic summaries.

## Storage and request flow

- `Conversation`: UUID, authenticated user ID, title, sequence and active turn deadline.
- `ChatTurn`: one user request plus assistant/tool messages, final response, status and request UUID. Keeping a turn together makes checkpointing and loading complete tool exchanges simpler than separate documents for each message.
- Conversations belong to the authenticated account. All read, create-ID reuse and send paths enforce ownership; callers cannot provide another user ID.
- Each app reload starts a fresh chat session without loading previous conversations. There is no New conversation button. A conversation is persisted only on the first message; creation retries reuse the same UUID to avoid duplicate empty records. Closing/reopening or resizing the chat retains the current session. Switching Chat/Tasks keeps each mode's history separate; the legacy task-generator mode remains local, not part of agent memory.
- HTTP chat requires `conversationId`, `requestId` and `userInput`. The client generates UUIDs; retries reuse the request UUID. Deploy both frontend and backend for this contract.

## API

- `POST /api/ai/conversations` with `{ conversationId }`: create, or retrieve an existing ID owned by the caller.
- `GET /api/ai/conversations/latest`: latest conversation or null (not used by the current chat UI).
- `GET /api/ai/conversations/:conversationId?before=N`: up to 50 turns, visible user/assistant messages only, older-page cursor and any pending turn. Tool arguments/results are not exposed by this UI endpoint.
- `POST /api/ai/chat-mcp`: process a turn and return the existing string `data` plus conversation/request IDs and completed/failed status.

## Retry and failure behavior

A MongoDB transaction atomically claims the conversation and inserts a deterministic per-user request receipt. There is only one active turn per conversation. Duplicate completed requests return the saved response; concurrent requests return 409. Reusing an ID with a different conversation/text returns 409.

Assistant tool-call messages are checkpointed before executing tools, and results afterward. On a model failure, already committed tool effects and saved results remain; the turn is marked failed and returns an interruption message. Retrying a failed or expired turn never re-executes it. The UI preserves the request ID after an uncertain HTTP error and provides **Check reply / Retry**. Validation failures allow reloading/correcting the message.

A turn has a five-minute execution deadline, checked at each checkpoint before model/tool work. Provider calls have a 45-second timeout without automatic provider retry. A dead worker cannot permanently block the conversation: a new request can claim it after the deadline. Expired processing turns display an interruption message. A tool already in progress at the deadline may still complete; missing tool results are represented as uncertain in subsequent model context, never assumed safe to repeat. This is not a resumable background job system.

## Context limits

The agent receives at most 20 previous turns and 60,000 serialized characters, on whole-turn boundaries. Individual tool results are capped at 12,000 characters. Larger/older history stays in MongoDB for UI pagination but is not guaranteed to be in the model context. No automatic summarization yet. Memory is not authorization or fresh task state: the system prompt requires current data to be read before changing referenced tasks.

A new conversation starts with no old context. Session changes remount the chat and ignore late responses from the previous account. No historical chats from the earlier in-browser-only implementation can be recovered after they were lost.

## Deployment and validation

Uses the same replica-set/Atlas MongoDB transaction requirement as MCP writes. Keep `MCP_ENABLED=false` on Vercel; this chat uses in-memory MCP.

Backend: 171 tests passed including real HTTP/auth/MCP and a disposable MongoDB replica set, with a mocked LLM. Scenarios cover remembered task IDs, restored history, cross-account denial, concurrent/repeated requests, provider failure after a committed tool, expired claims, pagination and new-conversation isolation.

Frontend: focused chat/API mutation tests passed, including reload, mode switching, request-ID reuse and ignoring old-account responses. TypeScript and targeted lint passed. The full frontend suite has an unrelated existing failure in `CalendarTaskDetailCard.test.jsx` (ordering of description/status); it also fails when run alone. No live LLM or Vercel smoke test was run.
