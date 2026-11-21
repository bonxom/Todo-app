# Spec: Preserve Agent Companion Text Alongside A2UI Surfaces & Proposals

Date: 2026-11-21

## Problem Statement

When the Agent invokes an A2UI tool (`present_ui` or `propose_tasks`) during a turn, any assistant text generated earlier in the same turn or alongside the tool call is lost at three layers:

1. `backend/services/agentService.ts` returns `{ surfaceSpec }` / `{ proposalItems }` immediately without collecting assistant text emitted in the turn.
2. `backend/services/conversationTurnService.ts` and `backend/services/A2UI/uiPresentationService.ts` overwrite the turn's response with `surfaceSpec.fallbackText` or a default proposal message.
3. `frontend/src/features/tasks/components/chat/ChatField.jsx` uses an exclusive ternary (`message.surface ? <UiSurfaceMessage /> : message.proposal ? <TaskProposalMessage /> : <MarkdownText />`), so text is never rendered alongside A2UI components.

## Goals & Acceptance Criteria

1. **Collect Companion Text in Agent Loop:**
   - When the model emits non-empty assistant text across any round of the current turn before or alongside `present_ui` or `propose_tasks`, `agentService.chatWithMcp` attaches `companionText` to the returned object.
   - When no assistant text was emitted, `agentService.chatWithMcp` omits `companionText` (preserving existing return shapes and tests).
2. **Persist & Replay Without Schema Migration or Fallback Duplication:**
   - `conversationTurnService.ts` persists `turn.response = response.companionText || fallback` for `present_ui` and `propose_tasks`.
   - `uiPresentationService.forTurn(turn, proposal)` keeps `surface.text` (`spec.fallbackText`) and `proposalEnvelope.text` unchanged for backward compatibility, and sets `companionText` on `TurnPresentation` only when `turn.response` is non-empty and distinct from `surface.text` / default proposal text.
   - `conversationView.ts` (`turnMessages()` and `resultFor()`), `conversationService.ts`, and streaming `turn.finished` (`PublicChatResult`) expose `companionText` when present.
3. **Preserve Streamed Text & Render Above A2UI in Frontend:**
   - `chatStreamReducer.ts` projects `companionText` from `result.companionText` (falling back to trimmed `snapshot.partialResponse` when terminal `surface`/`proposal` arrives after streamed deltas).
   - `ChatField.jsx` renders `<MarkdownText text={companionText} />` directly above `<UiSurfaceMessage />` or `<TaskProposalMessage />` when `message.companionText` is non-empty.
   - When `message.companionText` is absent (A2UI-only turns), no duplicate fallback text is rendered above the A2UI card.

## Non-Goals

- Adding an extra post-A2UI LLM round-trip after `present_ui` or `propose_tasks`.
- Changing `proposalEnvelopeSchema` or `uiSurfaceEnvelopeSchema` wire formats.
- Modifying MongoDB `ChatTurn` schema (reuses existing `turn.response` and `turn.uiSurface.spec.fallbackText`).
