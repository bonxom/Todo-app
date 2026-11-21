import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { installV2Fixture } from "./frontend-v2.fixture";
import type {
  ProposalAction,
  ProposalEnvelope,
  ProposalItem,
} from "../src/shared/types/A2UI/taskProposal";
import type { UiSurfaceEnvelope } from "../src/shared/types/A2UI/uiSurface";

const legacyFixture = JSON.parse(
  readFileSync(
    new URL(
      "../src/test/fixtures/a2ui-task-proposal-v09.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

const composedFixture = JSON.parse(
  readFileSync(
    new URL("../src/test/fixtures/a2ui-composition-v09.json", import.meta.url),
    "utf8",
  ),
);

const PROJECT_ID = "507f1f77bcf86cd799439090";
const CATEGORY_ID = "507f1f77bcf86cd799439091";

function buildTwentyTasks(language: "vi" | "en"): ProposalItem[] {
  const viTitles = [
    "Hoàn thiện tài liệu đặc tả API thanh toán",
    "Rà soát bảo mật xác thực OAuth2 & token rotation",
    "Viết test tích hợp cho luồng thanh toán định kỳ",
    "Tối ưu truy vấn bảng lịch sử giao dịch",
    "Cập nhật giao diện hóa đơn trên mobile",
    "Thiết kế trạng thái lỗi khi cổng thanh toán quá tải",
    "Kiểm tra khả năng tương thích Dark Mode",
    "Chuẩn hóa thông báo email xác nhận đơn hàng",
    "Thêm cảnh báo ngưỡng chi tiêu bất thường",
    "Kiểm thử hiệu năng dưới tải 500 kết nối đồng thời",
    "Rà soát quyền truy cập theo vai trò quản trị",
    "Cấu hình theo dõi log và cảnh báo độ trễ",
    "Viết hướng dẫn triển khai cho đội vận hành",
    "Kiểm tra sao lưu và khôi phục dữ liệu định kỳ",
    "Sửa lỗi hiển thị ngày hết hạn múi giờ UTC+7",
    "Bổ sung bộ lọc xuất báo cáo CSV theo tháng",
    "Đánh giá lại trải nghiệm onboarding người dùng mới",
    "Tối ưu dung lượng bundle trang thống kê",
    "Kiểm tra khả năng truy cập bàn phím toàn bộ biểu mẫu",
    "Tổng hợp checklist nghiệm thu bản phát hành v2.4",
  ];
  const enTitles = [
    "Finalize payment API specification document",
    "Audit OAuth2 token rotation and session security",
    "Write integration tests for recurring billing flow",
    "Optimize transaction history database indexes",
    "Refine mobile invoice receipt layout",
    "Design retry states for gateway timeouts",
    "Verify dark mode contrast across billing views",
    "Standardize order confirmation email templates",
    "Add abnormal spend threshold notifications",
    "Benchmark 500 concurrent checkout connections",
    "Review admin role-based permission boundaries",
    "Configure latency alerts and structured logs",
    "Author deployment runbook for operations team",
    "Verify automated backup and restore drill",
    "Fix due date rendering for UTC+7 timezone",
    "Add monthly CSV export filter controls",
    "Evaluate new-user onboarding checklist flow",
    "Reduce analytics page JavaScript bundle size",
    "Audit keyboard navigation on all proposal forms",
    "Compile release v2.4 final sign-off checklist",
  ];
  const titles = language === "vi" ? viTitles : enTitles;
  const priorities: Array<"High" | "Medium" | "Low"> = [
    "High",
    "Medium",
    "Low",
  ];

  return titles.map((title, i) => ({
    id: `77777777-7777-4777-8777-${String(i + 1).padStart(12, "0")}`,
    title,
    description:
      i % 2 === 0
        ? language === "vi"
          ? `Phạm vi công việc #${i + 1}: phối hợp cùng nhóm backend & QA để nghiệm thu trước đợt phát hành cuối tuần.`
          : `Scope for task #${i + 1}: coordinate with backend & QA to verify acceptance criteria before weekend release.`
        : "",
    priority: priorities[i % 3],
    categoryId: CATEGORY_ID,
    projectId: i % 2 === 0 ? PROJECT_ID : null,
    startDate: i === 0 ? "2026-11-22T09:00:00.000Z" : null,
    dueDate:
      i < 8
        ? `2026-11-${String(22 + (i % 7)).padStart(2, "0")}T17:00:00.000Z`
        : null,
  }));
}

async function setupTwentyTaskV2Proposal(
  page: Page,
  options: {
    theme?: "light" | "dark";
    language?: "vi" | "en";
    withInvalidItemAt?: number;
  } = {},
) {
  const { theme = "light", language = "vi", withInvalidItemAt } = options;
  await installV2Fixture(page, {
    preferredVersion: "v2",
    theme,
    language,
  });

  const composedSurface = structuredClone(
    composedFixture.proposal,
  ) as UiSurfaceEnvelope;
  const legacyEnvelope = structuredClone(legacyFixture) as ProposalEnvelope;
  const proposal = structuredClone(
    (
      composedSurface.a2ui.messages[2].updateDataModel as {
        value: { proposal: ProposalEnvelope["proposal"] };
      }
    ).value.proposal,
  );

  const items = buildTwentyTasks(language);
  if (typeof withInvalidItemAt === "number" && items[withInvalidItemAt]) {
    items[withInvalidItemAt].categoryId = "507f1f77bcf86cd799439099";
  }
  proposal.items = items;
  proposal.selectedItemIds = items.map((item) => item.id);
  composedSurface.text =
    language === "vi"
      ? "Mình đã chia nhỏ kế hoạch phát hành v2.4 thành 20 công việc bên dưới. Bạn có thể lướt từng thẻ hoặc chuyển sang danh sách để chọn nhanh:"
      : "I broke down the v2.4 release plan into 20 tasks below. Flip through slides or switch to list view to select quickly:";

  const sync = () => {
    for (const msg of legacyEnvelope.a2ui!.messages) {
      if ("updateDataModel" in msg) {
        (msg.updateDataModel as { value: unknown }).value =
          structuredClone(proposal);
      }
    }
    for (const msg of composedSurface.a2ui.messages) {
      if ("updateDataModel" in msg) {
        (
          msg.updateDataModel as {
            value: { display: unknown; proposal: unknown };
          }
        ).value.proposal = structuredClone(proposal);
      }
    }
  };
  sync();

  const actions: ProposalAction[] = [];

  await page.route("**/api/ai/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities")) {
      return route.fulfill({
        json: { taskProposals: true, uiComposition: true },
      });
    }
    if (path.endsWith("/conversations")) {
      return route.fulfill({
        json: {
          data: [
            {
              id: proposal.conversationId,
              title:
                language === "vi"
                  ? "Kế hoạch phát hành v2.4"
                  : "Release v2.4 Plan",
              updatedAt: new Date().toISOString(),
              projectId: PROJECT_ID,
            },
          ],
        },
      });
    }
    if (path.endsWith("/actions")) {
      const action = route.request().postDataJSON() as ProposalAction;
      actions.push(action);
      proposal.revision++;
      if (action.action !== "cancel") {
        proposal.items = action.items!;
        proposal.selectedItemIds = action.selectedItemIds!;
      }
      proposal.status =
        action.action === "confirm"
          ? "created"
          : action.action === "cancel"
            ? "cancelled"
            : "draft";
      if (action.action === "confirm") {
        proposal.createdTasks = proposal.items
          .filter((item) => action.selectedItemIds!.includes(item.id))
          .map((item, idx) => ({
            itemId: item.id,
            taskId: `507f1f77bcf86cd799439${String(idx + 1).padStart(3, "0")}`,
            title: item.title,
          }));
      }
      sync();
      return route.fulfill({
        json: {
          success: true,
          data: {
            proposal,
            text: composedSurface.text,
            a2ui: legacyEnvelope.a2ui,
            surface: composedSurface,
          },
        },
      });
    }
    return route.fulfill({
      json: {
        data: {
          conversationId: proposal.conversationId,
          title:
            language === "vi" ? "Kế hoạch phát hành v2.4" : "Release v2.4 Plan",
          mode: "auto",
          before: null,
          pending: [],
          messages: [
            {
              id: "user-msg-1",
              sender: "user",
              text:
                language === "vi"
                  ? "Lập kế hoạch 20 đầu việc cho bản phát hành v2.4 giúp mình"
                  : "Break down 20 tasks for the v2.4 release plan",
              timestamp: new Date().toISOString(),
            },
            {
              id: "proposal-msg-20",
              sender: "bot",
              text: composedSurface.text,
              timestamp: new Date().toISOString(),
              proposal,
              a2ui: legacyEnvelope.a2ui,
              surface: composedSurface,
            },
          ],
        },
      },
    });
  });

  return { actions, conversationId: proposal.conversationId };
}

const REVIEW_DIR = process.env.PROPOSAL_REVIEW_DIR;

async function maybeShot(page: Page, filename: string) {
  if (!REVIEW_DIR) return;
  await page.screenshot({ path: `${REVIEW_DIR}/${filename}` });
}

test("20-task proposal stays compact in Slide & List views, supports inline Pencil edit, bulk selection, error jump, and Confirm in V2", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { actions, conversationId } = await setupTwentyTaskV2Proposal(page, {
    theme: "light",
    language: "vi",
    withInvalidItemAt: 14,
  });

  await page.goto(`/v2/agents?conversation=${conversationId}`);
  await expect(
    page.getByText("Hoàn thiện tài liệu đặc tả API thanh toán"),
  ).toBeVisible();
  await expect(page.getByText("1 / 20")).toBeVisible();
  await expect(page.getByText("20/20")).toBeVisible();
  await maybeShot(page, "01-v2-desktop-light-slide-20.png");

  // Proposal card remains compact (well under 550px tall even for 20 tasks!)
  const proposalHeight = await page
    .locator(".task-proposal")
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(proposalHeight).toBeLessThan(550);

  // Navigate slides via Next/Prev buttons
  await page
    .getByRole("button", { name: "Công việc tiếp theo", exact: true })
    .click();
  await expect(page.getByText("2 / 20")).toBeVisible();
  await expect(
    page.getByText("Rà soát bảo mật xác thực OAuth2 & token rotation"),
  ).toBeVisible();

  // Error jump pill jumps straight to task #15 in Edit mode
  await page
    .getByRole("button", { name: "Đi tới công việc đầu tiên bị lỗi" })
    .click();
  await expect(page.getByText("15 / 20")).toBeVisible();
  const catSelect = page.getByLabel("Danh mục công việc 15");
  await expect(catSelect).toBeVisible();
  await maybeShot(page, "02-v2-desktop-light-edit-error.png");
  await catSelect.selectOption(CATEGORY_ID);
  await page
    .getByRole("button", { name: "Hoàn tất chỉnh sửa công việc 15" })
    .click();
  await maybeShot(page, "02b-v2-desktop-light-slide-valid.png");

  // Switch to List view and verify bounded scroll container + checkbox toggle in place
  await page
    .getByRole("button", { name: "Xem danh sách", exact: true })
    .click();
  await expect(
    page.getByText("Tổng hợp checklist nghiệm thu bản phát hành v2.4"),
  ).toBeVisible();
  const listHeight = await page
    .locator(".task-proposal")
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(listHeight).toBeLessThan(600);

  // Uncheck 1 task from list, capture list screenshot, then confirm 19 tasks
  await page
    .getByRole("checkbox", {
      name: "Chọn công việc: Hoàn thiện tài liệu đặc tả API thanh toán",
    })
    .uncheck();
  await maybeShot(page, "03-v2-desktop-light-list-20.png");
  await page.getByRole("button", { name: "Xác nhận (19)" }).click();

  await expect(page.getByText("Đã tạo 19 công việc")).toBeVisible();
  await maybeShot(page, "04-v2-desktop-light-created-19.png");
  expect(actions).toHaveLength(1);
  expect(actions[0].action).toBe("confirm");
  expect(actions[0].selectedItemIds).toHaveLength(19);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("20-task proposal renders cleanly in V2 Dark mode on Desktop, Mobile (390px), and Tablet (768px)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const { conversationId } = await setupTwentyTaskV2Proposal(page, {
    theme: "dark",
    language: "vi",
  });

  await page.goto(`/v2/agents?conversation=${conversationId}`);
  await expect(page.getByText("1 / 20")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xác nhận (20)" }),
  ).toBeEnabled();
  await maybeShot(page, "05-v2-desktop-dark-slide-20.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("1 / 20")).toBeVisible();
  await maybeShot(page, "06-v2-mobile-dark-slide-20.png");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page
    .getByRole("button", { name: "Chỉnh sửa công việc 1", exact: true })
    .click();
  await expect(page.getByLabel("Tiêu đề công việc 1")).toBeVisible();
  await maybeShot(page, "07-v2-mobile-dark-edit.png");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 768, height: 1024 });
  await page
    .getByRole("button", { name: "Xem danh sách", exact: true })
    .click();
  await expect(
    page.getByText("Tổng hợp checklist nghiệm thu bản phát hành v2.4"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("20-task proposal fits cleanly inside the narrow V2 Dashboard assistant popup", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupTwentyTaskV2Proposal(page, {
    theme: "light",
    language: "vi",
  });

  await page.goto("/v2/dashboard");
  await page.getByRole("button", { name: "Mở trợ lý" }).click();
  await expect(page.getByText("1 / 20")).toBeVisible();
  await maybeShot(page, "08-v2-popup-light-slide-20.png");

  await page
    .getByRole("button", { name: "Xem danh sách", exact: true })
    .click();
  await expect(
    page.getByText("Tổng hợp checklist nghiệm thu bản phát hành v2.4"),
  ).toBeVisible();
  await maybeShot(page, "09-v2-popup-light-list-20.png");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
