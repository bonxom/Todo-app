import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../docs/superpowers/fixtures/a2ui-task-proposal-v09.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
import { dashboardFixture } from "./dashboard.fixture";
import type {
  ProposalAction,
  ProposalEnvelope,
} from "../src/shared/types/A2UI/taskProposal";

export async function setupTaskProposalMocks(
  page: Page,
  loseFirstResponse = false,
) {
  await dashboardFixture(page, true);
  const envelope = structuredClone(fixture) as ProposalEnvelope;
  const second = {
    ...envelope.proposal.items[0],
    id: "44444444-4444-4444-8444-444444444444",
    title: "Practice speaking",
  };
  envelope.proposal.items.push(second);
  envelope.proposal.selectedItemIds.push(second.id);
  const actions: ProposalAction[] = [];
  const sync = () => {
    for (const message of envelope.a2ui!.messages) {
      if ("updateDataModel" in message) {
        (message.updateDataModel as { value: unknown }).value = structuredClone(
          envelope.proposal,
        );
      }
    }
  };
  sync();
  await page.route("**/api/categories**", (route) =>
    route.fulfill({
      json: [{ _id: "507f1f77bcf86cd799439011", name: "Uncategorized" }],
    }),
  );
  await page.route("**/api/projects**", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/ai/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities"))
      return route.fulfill({ json: { taskProposals: true } });
    if (path.endsWith("/actions")) {
      const action = route.request().postDataJSON() as ProposalAction;
      actions.push(action);
      if (
        actions.length === 1 ||
        action.requestId !== actions.at(-2)?.requestId
      ) {
        envelope.proposal.revision++;
        if (action.action !== "cancel") {
          envelope.proposal.items = action.items!;
          envelope.proposal.selectedItemIds = action.selectedItemIds!;
        }
        envelope.proposal.status =
          action.action === "confirm"
            ? "created"
            : action.action === "cancel"
              ? "cancelled"
              : "draft";
        if (action.action === "confirm") {
          envelope.proposal.createdTasks = envelope.proposal.items
            .filter((item) => action.selectedItemIds!.includes(item.id))
            .map((item) => ({
              itemId: item.id,
              taskId: "507f1f77bcf86cd799439012",
              title: item.title,
            }));
        }
        sync();
      }
      if (loseFirstResponse && actions.length === 1)
        return route.abort("failed");
      return route.fulfill({ json: { success: true, data: envelope } });
    }
    if (path.endsWith("/conversations"))
      return route.fulfill({ json: { data: [] } });
    return route.fulfill({
      json: {
        data: {
          conversationId: envelope.proposal.conversationId,
          mode: "auto",
          before: null,
          pending: [],
          messages: [
            {
              id: "proposal-message",
              sender: "bot",
              timestamp: new Date().toISOString(),
              ...envelope,
            },
          ],
        },
      },
    });
  });
  return { actions };
}
