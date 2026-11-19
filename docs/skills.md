# Project skill routing

For coding-agent tasks, check the active harness's available skills and the local `.agents/skills/` directory when present. For Anthropic tooling, see [`.claude/skills/`](../.claude/skills/). Read the applicable `SKILL.md` in full before doing the work it covers. Combine skills when the task crosses domains.

| Task | Relevant skills |
| --- | --- |
| Design and implement a feature | `brainstorming`, `writing-plans`, and `executing-plans` as appropriate to the stage. Follow the [feature workflow](workflow.md#new-features). |
| Change visual UI or verify it in a browser | `frontend-design` for design and `webapp-testing` for Playwright. Use `web-artifacts-builder` for complex standalone artifacts. |
| Audit UI accessibility or usability | `web-design-guidelines` when available in the active harness. |
| Work on Node.js, MCP, or CI/CD | `node`, `mcp-builder`, or `cicd-pipeline-skill` for the corresponding task. |
| Co-author structured docs or internal communications | `doc-coauthoring` or `internal-comms` when available in the active harness. |
| Work with Word, presentations, PDFs, or spreadsheets | Use the matching document skill, such as `docx`, `pptx`, `pdf`, or `xlsx`. Use `theme-factory` for shared visual themes when available. |
| Create generative art | `algorithmic-art` when available. |

Orbit's in-app agent skills have their own [architecture and policy](ai/personal-skills.md).
