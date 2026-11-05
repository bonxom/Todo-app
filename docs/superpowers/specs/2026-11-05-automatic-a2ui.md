# Automatic A2UI task proposals

Supersedes manual Plan tasks selection and the proposed default-on composer mode.
The user approved automatic selection on 2026-11-05.

## Behavior

- Ordinary chat uses ordinary text. No composer toggle/chip or frontend intent
  classification is required.
- With task proposals enabled, the agent can choose propose_tasks in both Auto
  and Ask, using current request and conversation history. Use it for actionable
  task planning or creation; do not fabricate an interactive form in Markdown.
- Missing essential information may use grill_user in either mode. Ask retains
  its existing preference for meaningful choices. Follow-up requests can choose
  propose_tasks without an inherited client intent.
- Direct orbit_create_task is hidden and rejected at execution while A2UI is
  enabled, including hallucinated calls and calls preceding propose_tasks in
  the same batch. The only creation path is authenticated proposal confirmation.
  Existing task update/status actions retain their authorization rules.
- When disabled, propose_tasks is hidden and rejected. Normal legacy tools
  remain available; persisted explicit task_proposal intent remains supported
  for older clients and still obeys the flag.
- Existing validation, catalog allowlists, persistence, revisions, retries and
  transactions remain unchanged. Backend defaults enabled unless configured off.

## Acceptance checks

Provider-mocked tests verify text without a proposal, automatic proposal with no
intent, clarification in Auto and Ask, creation bypass rejection and disabled
tool rejection. Conversation integration verifies a proposal can be persisted
and replayed with no intent. UI tests verify no toggle/chip or forced outbound
intent, while proposal cards still work. Browser fixtures cover the real renderer.
Live-model routing quality requires a configured provider and a manual smoke test.

## Calendar regression

Investigate the existing compact-card layout failure. Preserve intentional
side-badge layout if confirmed by history and adjust obsolete assertions to test
current labels, truncation and metadata. Do not weaken functional assertions.
