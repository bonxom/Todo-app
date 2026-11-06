# Agent Workspace — kết quả review và sửa lỗi

Ngày: 2026-11-06. Branch: `feat/agent-workspace`. Thay đổi giữ trong worktree, chưa commit/push.

## Đối chiếu báo cáo ban đầu

Hai lệnh `pnpm test --typecheck` tái hiện số liệu đã báo (backend 310 pass / 63 skipped, frontend 231 pass). Tuy nhiên `pnpm run build` thực tế thất bại ở cả hai package. Vitest không thay thế TypeScript build của ứng dụng; nhiều mock frontend không khớp API thật.

## Lỗi đã sửa

1. **Build/type-check:** import trùng, kiểu MCP result chưa được thu hẹp, test fixtures thiếu fields, Signal API sai, prop callback suy luận sai và unused imports.
2. **Hợp đồng API:** dùng `getAllProjects()` thay method không tồn tại `list()`; history dùng `id` đúng response backend. Fixtures sửa capabilities, create-conversation, latest và endpoint chat-mcp.
3. **Session/navigation:** chỉ provider tạo phiên dùng chung; Open in Agent dùng React Router thay tải lại trang. URL không gây initial-load effect chạy lại. Back/Forward giữa hội thoại đi qua draft blocker, hủy giữ URL/draft, chọn hội thoại không fetch hai lần; New chat cập nhật canonical URL sau tạo thành công.
4. **Draft/account:** provider remount theo sessionRevision; text/files/proposal draft giữ khi đổi view; draft “new” chuyển sang ID và được xóa đúng sau gửi file. Lưu pending proposal request ID trong bộ nhớ để retry qua hai view không tạo request khác.
5. **Activities:** task ID trong args không còn được coi là bằng chứng update thành công. Không gắn proposal_created thành công trước khi proposal được lưu. Project proposal/task activities từ TaskProposal đã commit và createdRequestId thay best-effort append trong transaction; replay/GET có thể dựng lại kết quả. Checkpoint tool activities deduplicate theo ID.
6. **Project context:** query ở repository; snapshot/lease/ownership giữ nguyên và có test MongoDB cho PATCH-vs-claim, completed project context và retry không đổi snapshot.
7. **Giao diện:** focus trap/return cho drawer và discard dialog, pending turn khóa chuyển hội thoại; nút mở task fetch qua API và báo không khả dụng. Sửa rollback context chỉ tác động đúng hội thoại, không ghi state từ response cũ sang session khác.
8. **Tests/docs:** sửa test Supertest chưa khởi chạy request gây treo; thêm regression tests, cập nhật discard expectation của chat nổi và chờ CSS transition trong assertion màu. Tài liệu không còn khẳng định gắn nhãn JSON là biện pháp ngăn prompt injection tuyệt đối.

## Kết quả kiểm chứng cuối

| Kiểm tra                                         | Kết quả                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Backend Vitest với MongoDB replica set tạm       | 41 files, **376 tests pass**, không skip                          |
| Frontend Vitest                                  | 50 files, **234 tests pass**                                      |
| Playwright Chromium                              | **23 tests pass**                                                 |
| Backend/frontend ESLint                          | Pass; backend còn 13 warnings `no-explicit-any` trong test có sẵn |
| Backend `tsc --noEmit`                           | Pass                                                              |
| Frontend TypeScript + Vite build                 | Pass                                                              |
| Prettier trên toàn bộ source feature đã thay đổi | Pass                                                              |
| `git diff --check`                               | Pass                                                              |

Các lệnh đã chạy, từ root repository:

```bash
cd backend
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27028/ pnpm test
pnpm run lint
pnpm run build
cd ../frontend
pnpm test
pnpm exec playwright test e2e/agent-workspace.spec.ts e2e/chat-usability.spec.ts e2e/chat-attachments.spec.ts e2e/task-proposals.spec.ts
pnpm run lint
pnpm run build
cd ..
git diff --check
```

MongoDB chạy trong container riêng `todo-agent-review-mongo`, dùng MongoDB 7 replica set với port loopback 27028. Integration suite tự tạo database test riêng. Container tạm đã được dọn sau kiểm thử. Không dùng database hoặc secrets thật của ứng dụng. Ảnh regression sinh vào thư mục audit có sẵn được hoàn nguyên; không đưa ảnh không liên quan vào diff.

Cảnh báo còn lại: JSDOM không triển khai full navigation (suite vẫn pass); Vite cảnh báo chunks >500 kB; Playwright có warning NO_COLOR/FORCE_COLOR của môi trường. Chưa smoke với AI provider thật: integration mock provider để kiểm chứng tools/DB/HTTP một cách lặp lại được. Không xác nhận chất lượng trả lời thực tế của model từ các test này.

## Lệnh format check với danh sách file chính xác

Các lệnh dưới đây được gọi bằng argv từ Python (không nội suy shell), theo đúng working directory của package:

Working directory: `backend/`

```bash
pnpm exec prettier --check controllers/aiController.ts models/A2UI/TaskProposal.ts models/ChatTurn.ts models/Conversation.ts repositories/chatTurnRepository.ts repositories/conversationRepository.ts repositories/projectRepository.ts routes/aiRoutes.ts services/A2UI/taskProposalActionService.ts services/agentService.ts services/conversationContextService.ts services/conversationService.ts services/conversationTurnService.ts services/test/agentActivity.test.ts services/test/conversationContextService.test.ts services/test/conversationHistory.test.ts services/test/conversationService.integration.test.ts services/test/taskProposalActions.test.ts types/A2UI/ITaskProposal.ts types/IAgent.ts types/IAgentActivity.ts types/IChatTurn.ts utils/agentActivity.ts utils/conversationView.ts validations/aiValidation.ts
```

Working directory: `frontend/`

```bash
pnpm exec prettier --check e2e/agent-workspace.fixture.ts e2e/agent-workspace.spec.ts e2e/chat-usability.spec.ts src/app/router.tsx src/features/agent/AgentActivityList.tsx src/features/agent/AgentChatBubble.tsx src/features/agent/AgentContextPanel.tsx src/features/agent/AgentDiscardDialog.tsx src/features/agent/AgentHistoryList.tsx src/features/agent/AgentPage.tsx src/features/agent/AgentSessionProvider.tsx src/features/agent/agentSessionContext.ts src/features/agent/agentWorkspace.css src/features/agent/index.ts src/features/agent/test/AgentPage.test.tsx src/features/agent/test/AgentSessionProvider.test.tsx src/features/agent/test/useAgentNavigation.test.tsx src/features/agent/useAgentNavigation.ts src/features/tasks/components/chat/A2UI/TaskProposalMessage.tsx src/features/tasks/components/chat/A2UI/TaskProposalSurface.tsx src/features/tasks/components/chat/A2UI/taskProposalCatalog.tsx src/features/tasks/components/chat/A2UI/taskProposalContext.ts src/features/tasks/components/chat/ChatField.jsx src/features/tasks/components/chat/SmallChat.jsx src/features/tasks/components/chat/index.jsx src/features/tasks/hooks/A2UI/useTaskProposal.ts src/features/tasks/hooks/useConversationChat.ts src/features/tasks/hooks/useConversationSession.ts src/shared/components/Sidebar.jsx src/shared/layouts/MainLayout.jsx src/shared/services/aiService.ts src/shared/types/domain.ts
```
