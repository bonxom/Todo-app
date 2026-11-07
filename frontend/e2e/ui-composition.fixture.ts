import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dashboardFixture } from "./dashboard.fixture";
import type {
  ProposalAction,
  ProposalEnvelope,
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

export interface SetupUiCompositionOptions {
  mode:
    | "readonly"
    | "composed-proposal"
    | "malformed-composed-proposal"
    | "malformed-readonly";
}

export async function setupUiCompositionMocks(
  page: Page,
  options: SetupUiCompositionOptions,
) {
  await dashboardFixture(page, true);
  const readonlySurface = structuredClone(
    composedFixture.readonly,
  ) as UiSurfaceEnvelope;
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
  const secondItem = {
    ...proposal.items[0],
    id: "44444444-4444-4444-8444-444444444444",
    title: "Practice speaking",
  };
  proposal.items.push(secondItem);
  proposal.selectedItemIds.push(secondItem.id);

  if (options.mode === "malformed-readonly") {
    readonlySurface.a2ui.catalogId = "urn:orbit:a2ui:invalid:v1";
  }
  if (options.mode === "malformed-composed-proposal") {
    (
      composedSurface.a2ui.messages[1].updateComponents as {
        components: Record<string, unknown>[];
      }
    ).components = [{ id: "root", component: "Card", children: ["missing"] }];
  }

  const syncProposalToSurfaces = () => {
    for (const message of legacyEnvelope.a2ui!.messages) {
      if ("updateDataModel" in message) {
        (message.updateDataModel as { value: unknown }).value =
          structuredClone(proposal);
      }
    }
    for (const message of composedSurface.a2ui.messages) {
      if ("updateDataModel" in message) {
        (
          message.updateDataModel as {
            value: { display: unknown; proposal: unknown };
          }
        ).value.proposal = structuredClone(proposal);
      }
    }
  };
  syncProposalToSurfaces();

  const actions: ProposalAction[] = [];

  await page.route("**/api/categories**", (route) =>
    route.fulfill({
      json: [{ _id: "507f1f77bcf86cd799439011", name: "Uncategorized" }],
    }),
  );
  await page.route("**/api/projects**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/ai/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities")) {
      return route.fulfill({
        json: { taskProposals: true, uiComposition: true },
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
          .map((item) => ({
            itemId: item.id,
            taskId: "507f1f77bcf86cd799439012",
            title: item.title,
          }));
      }
      syncProposalToSurfaces();
      const responseEnvelope: ProposalEnvelope = {
        proposal,
        text: composedSurface.text,
        a2ui: legacyEnvelope.a2ui,
        surface: composedSurface,
      };
      return route.fulfill({
        json: { success: true, data: responseEnvelope },
      });
    }
    if (path.endsWith("/conversations")) {
      return route.fulfill({ json: { data: [] } });
    }

    const message =
      options.mode === "readonly" || options.mode === "malformed-readonly"
        ? {
            id: "readonly-surface-msg",
            sender: "bot",
            text: readonlySurface.text,
            timestamp: new Date().toISOString(),
            surface: readonlySurface,
          }
        : {
            id: "composed-proposal-msg",
            sender: "bot",
            text: composedSurface.text,
            timestamp: new Date().toISOString(),
            proposal,
            a2ui: legacyEnvelope.a2ui,
            surface: composedSurface,
          };

    return route.fulfill({
      json: {
        data: {
          conversationId: proposal.conversationId,
          mode: "auto",
          before: null,
          pending: [],
          messages: [message],
        },
      },
    });
  });

  return { actions };
}
