# Orbit engineering documentation

Start with the row that matches the change. Open additional guides only when the work crosses those boundaries.

| When the task touches                                                    | Read                                                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A new feature, a spec or plan, or verification before delivery           | [Development workflow](workflow.md)                                                                                                               |
| Coding, API contracts, authorization, or dependency changes              | [Engineering conventions](conventions.md)                                                                                                         |
| Backend routes, models, task ownership, stats, or JWT rotation           | [Backend architecture](architecture/backend.md)                                                                                                   |
| Frontend routes, components, session state, or query cache               | [Frontend architecture](architecture/frontend.md)                                                                                                 |
| Web layouts, design tokens, interaction patterns, or visual verification | [Orbit UI/UX guide](design/ui-ux.md)                                                                                                              |
| Local setup, environment variables, Docker Compose, or package commands  | [Local development](development.md)                                                                                                               |
| Choosing a project skill                                                 | [Skill routing](skills.md)                                                                                                                        |
| Agent modes, permissions, tools, or SSE chat runs                        | [Agent chat architecture](agent-chat-architecture.md) and, for deployment or recovery, [streaming operations](ai/chat-streaming-operations.vi.md) |
| Conversation memory or user-authored skills                              | [Conversation memory](ai/conversation-memory.md) and [personal skills](ai/personal-skills.md)                                                     |
| A2UI task proposals, interactive task actions, or automatic surfaces     | [Task proposals & interactive actions](a2ui-task-proposals.md) and [proactive A2UI evaluation](proactive-a2ui-evaluation.md)                      |
| Agent time context or web search                                         | [Agent time and web search](agent-time-web-search.md)                                                                                             |
| MCP transport, access policy, or smoke tests                             | [MCP local development](mcp/local-development.md)                                                                                                 |
| CI, deployment, uploads, or notification workers                         | [CI and deployment](deployment.md), [MinIO storage](deployment/minio.md), or [notifications](deployment/notifications.md), as applicable          |

Specs, plans, and reviews under [`superpowers/`](superpowers/) describe individual changes. Open the entries for the feature at hand and check their implementation status against the current code. [UI audits](ui-audit/) record observations and screenshots from specific reviews.

When a change affects a documented convention, update the guide that owns it. Add an entry here when a new guide helps agents find the right context.
