# Review Personal Skills — 2026-11-06

Phạm vi: thay đổi Personal Skills trên `feat/agent-workspace`, đối chiếu spec/plan ngày 2026-11-06. Review và sửa trực tiếp; chưa commit/push.

## Kết luận

Các lỗi blocking phát hiện trong phạm vi review đã được sửa. Backend/frontend build và lint qua; kiểm thử tự động qua. Chưa xác minh bằng provider AI thật, không coi test giả lập provider là bằng chứng model thực tế luôn chọn đúng skill.

## Các lỗi đã sửa

| Mức | Vấn đề                                                                       | Sửa chữa và bằng chứng                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Quota fallback ghi ngoài transaction và không retry transaction conflict     | Bắt buộc session.withTransaction; kiểm tra Mongo thật: 49+2 creates, 50+delete/create, rollback insert/delete, không ghi khi mở session lỗi.                                           |
| P1  | Editor refetch mất draft, dùng version mới gây ghi đè, chỉ guard nút Back    | Giữ baseline khi dirty; useBlocker + beforeunload; save theo version gốc; reload thật sau xác nhận; reset form theo skill/session. Unit và browser Back/conflict tests.                |
| P1  | UI không nhận dạng ApiError 409; cached detail sau toggle gây xóa conflict   | Dùng ApiError.status, cập nhật detail cache sau toggle, adopt server data khi pristine, thông báo lỗi save/delete/toggle. CRUD E2E.                                                    |
| P1  | IELTS/Gym vẫn load được qua loader mặc định khi chưa import                  | Chỉ advertise/dispatch trusted loaders cho prerequisite đã cấu hình của tool thực tế. Personal read không mở quyền trusted tool; MCP URI cũ giữ tương thích.                           |
| P1  | Badge mất metadata ở live response và câu hỏi chờ trả lời                    | Bổ sung domain types, session receive và docked question rendering. Test HTTP + Mongo xác nhận persist ở completed/question/provider failure; public metadata không chứa instructions. |
| P1  | Mutation hoàn tất muộn có thể phục hồi cache riêng tư sau logout             | Guard sessionKey trong callbacks và giữa GET/PUT toggle; form/list keyed theo session. Deferred mutation tests.                                                                        |
| P2  | Snapshot shallow freeze, gallery mobile không xem được, modal thiếu keyboard | Clone/freeze snapshot records; clone overview/read metadata; responsive preview, focus trap/return và Escape; hiển thị lỗi import/preview.                                             |
| P2  | Template symlink thoát thư mục, version không đổi khi metadata đổi           | realpath containment cho manifest/document, hash metadata + instructions; test symlink/hash và đối chiếu rubric với MCP compatibility content.                                         |
| P2  | Cả hai package lỗi typecheck và tests không còn đúng contract                | Sửa type narrowing, fixture ApiError, mocks DB và assertions cho synthetic list_skills exchange; không bypass production reads để làm test pass.                                       |

## Kết quả xác minh

- Backend: **434 tests / 46 files passed**, không skip, MongoDB 7 replica set riêng tại loopback port 27029. Database test riêng, được cleanup.
- Frontend: **256 tests / 56 files passed**.
- Playwright regression: **29 passed** (Personal Skills + Agent Workspace + chat usability + task proposals). Sau chỉnh sửa editor cuối, chạy lại Personal Skills: **7 passed**.
- Backend và frontend lint: không lỗi. Backend còn **13 warnings any** có sẵn trong `services/test/taskProposalActions.test.ts`.
- Backend `tsc --noEmit`, frontend `tsc -b` + Vite production build: passed.
- Full Prettier: mỗi package còn **12 file baseline không thuộc thay đổi**. Không format các file ngoài phạm vi; scoped Prettier kiểm tra mọi file feature thay đổi: passed.
- Cảnh báo đã tồn tại: JSDOM navigation trong unit tests; Vite chunk >500KB và ErrorPage vừa static vừa dynamic import.
- Chưa chạy smoke provider AI thật với hai tài khoản. Playwright dùng API fixtures; backend ownership/concurrency và chat persistence dùng MongoDB thật với provider giả lập.

## Lệnh đã chạy

```bash
cd backend
ORBIT_MCP_TEST_MONGO_URI=mongodb://127.0.0.1:27029/ pnpm test
pnpm run lint
pnpm run format:check
pnpm run build
cd ../frontend
pnpm test
pnpm exec playwright test e2e/personal-skills.spec.ts e2e/agent-workspace.spec.ts e2e/chat-usability.spec.ts e2e/task-proposals.spec.ts --workers=2
pnpm exec playwright test e2e/personal-skills.spec.ts --workers=2
pnpm run lint
pnpm run format:check
pnpm run build
```

Scoped format (từ repository root):

```bash
cd backend
pnpm exec prettier --check \
  controllers/skillController.ts \
  error/definitions/skillErrors.ts \
  error/errorCodes.ts \
  mcp/test/skills.test.ts \
  models/ChatTurn.ts \
  models/UserSkill.ts \
  models/UserSkillQuota.ts \
  repositories/chatTurnRepository.ts \
  repositories/userSkillRepository.ts \
  routes/aiRoutes.ts \
  routes/skillRoutes.ts \
  services/agentPersonalSkillService.ts \
  services/agentService.ts \
  services/agentSkillService.ts \
  services/conversationTurnService.ts \
  services/personalSkillService.ts \
  services/test/agentPersonalSkillService.test.ts \
  services/test/agentService.test.ts \
  services/test/agentSkillsRuntime.test.ts \
  services/test/conversationHistory.test.ts \
  services/test/conversationService.integration.test.ts \
  services/test/interruptedReply.test.ts \
  services/test/personalSkillService.test.ts \
  services/test/personalSkills.integration.test.ts \
  services/test/personalSkillsRuntime.test.ts \
  services/test/taskProposalGeneration.test.ts \
  skills/templates/gym/SKILL.md \
  skills/templates/gym/manifest.json \
  skills/templates/ielts/SKILL.md \
  skills/templates/ielts/manifest.json \
  skills/templates/registry.ts \
  skills/test/templates.test.ts \
  types/IAgent.ts \
  types/IChatTurn.ts \
  types/IUserSkill.ts \
  utils/agentMessages.ts \
  utils/conversationView.ts \
  validations/skillValidation.ts
cd ..
cd frontend
pnpm exec prettier --check \
  e2e/agent-workspace.spec.ts \
  e2e/personal-skills.fixture.ts \
  e2e/personal-skills.spec.ts \
  src/app/router.tsx \
  src/features/agent/AgentPage.tsx \
  src/features/agent/skills/SkillEditorPage.tsx \
  src/features/agent/skills/SkillReadBadge.tsx \
  src/features/agent/skills/SkillsPage.tsx \
  src/features/agent/skills/TemplateGallery.tsx \
  src/features/agent/skills/skillKeys.ts \
  src/features/agent/skills/skills.css \
  src/features/agent/skills/test/SkillEditorPage.test.tsx \
  src/features/agent/skills/test/SkillReadBadge.test.tsx \
  src/features/agent/skills/test/SkillsPage.test.tsx \
  src/features/agent/skills/test/skillSession.test.tsx \
  src/features/agent/skills/useSkillQueries.ts \
  src/features/tasks/components/chat/ChatField.jsx \
  src/features/tasks/hooks/test/conversationSkills.test.tsx \
  src/features/tasks/hooks/useConversationSession.ts \
  src/shared/services/skillService.ts \
  src/shared/services/test/skillService.test.ts \
  src/shared/types/domain.ts \
  src/shared/types/skill.ts
cd ..
```
