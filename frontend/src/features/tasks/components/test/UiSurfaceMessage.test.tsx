import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UiSurfaceMessage } from "../chat/A2UI/UiSurfaceMessage";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import { aiService } from "@/shared/services/aiService";
import type { UiSurfaceEnvelope } from "@/shared/types/A2UI/uiSurface";
import type { ProposalEnvelope } from "@/shared/types/A2UI/taskProposal";
import composedFixture from "@/test/fixtures/a2ui-composition-v09.json";
import legacyFixture from "@/test/fixtures/a2ui-task-proposal-v09.json";

describe("UiSurfaceMessage", () => {
  beforeEach(() => {
    vi.spyOn(categoryService, "getAllCategories").mockResolvedValue([
      { _id: "507f1f77bcf86cd799439011", name: "Work" },
    ] as never);
    vi.spyOn(projectService, "getAllProjects").mockResolvedValue([] as never);
  });

  const renderWithQuery = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        {ui}
      </QueryClientProvider>,
    );

  it("renders a read-only surface with Text and Table and no proposal actions", async () => {
    const surface = structuredClone(
      composedFixture.readonly,
    ) as UiSurfaceEnvelope;

    renderWithQuery(<UiSurfaceMessage surface={surface} />);

    expect(
      await screen.findByRole("heading", { name: "Weekly Study Plan" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Practice test 3")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Xác nhận/ }),
    ).not.toBeInTheDocument();
  });

  it("falls back to markdown text when a read-only surface payload is invalid", async () => {
    const surface = structuredClone(
      composedFixture.readonly,
    ) as UiSurfaceEnvelope;
    surface.a2ui.catalogId = "urn:orbit:a2ui:unknown:v1";

    renderWithQuery(<UiSurfaceMessage surface={surface} />);

    expect(await screen.findByText("Weekly Study Plan")).toBeInTheDocument();
    expect(screen.getByText("Monday: Reading (2h)")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a composed proposal surface with both presentation context and task actions", async () => {
    const user = userEvent.setup();
    const surface = structuredClone(
      composedFixture.proposal,
    ) as UiSurfaceEnvelope;
    const proposal = structuredClone(
      (
        surface.a2ui.messages[2].updateDataModel as {
          value: { proposal: ProposalEnvelope["proposal"] };
        }
      ).value.proposal,
    );
    const proposalEnvelope: ProposalEnvelope = {
      proposal,
      text: surface.text,
      surface,
      a2ui: structuredClone(legacyFixture.a2ui) as ProposalEnvelope["a2ui"],
    };

    const applyAction = vi
      .spyOn(aiService, "applyProposalAction")
      .mockResolvedValue({
        ...proposalEnvelope,
        proposal: {
          ...proposal,
          status: "created",
          revision: 2,
          createdTasks: [
            {
              itemId: proposal.items[0].id,
              taskId: "task-999",
              title: proposal.items[0].title,
            },
          ],
        },
      });

    renderWithQuery(
      <UiSurfaceMessage
        surface={surface}
        proposalEnvelope={proposalEnvelope}
      />,
    );

    expect(
      await screen.findByText(
        "Review and confirm the proposed study tasks below.",
      ),
    ).toBeInTheDocument();
    await screen.findByRole("option", { name: "Work" });

    await user.click(screen.getByRole("button", { name: /Xác nhận/ }));
    expect(applyAction).toHaveBeenCalledTimes(1);
  });
});
