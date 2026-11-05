import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskProposalSurface } from "../chat/A2UI/TaskProposalSurface";
import { taskProposalRegistry } from "../chat/A2UI/taskProposalCatalog";
import { categoryService } from "@/shared/services/categoryService";
import { projectService } from "@/shared/services/projectService";
import { A2uiMessageSchema, MessageProcessor } from "@a2ui/web_core/v0_9";
import type { ProposalEnvelope } from "@/shared/types/A2UI/taskProposal";
import fixture from "@/test/fixtures/a2ui-task-proposal-v09.json";

const envelope = () => structuredClone(fixture) as ProposalEnvelope;
beforeEach(() => {
  vi.spyOn(categoryService, "getAllCategories").mockResolvedValue([
    { _id: fixture.proposal.items[0].categoryId, name: "Work" },
  ] as never);
  vi.spyOn(projectService, "getAllProjects").mockResolvedValue([]);
});
it("shared fixture conforms to the real v0.9 processor", () => {
  const payload = envelope().a2ui!;
  for (const message of payload.messages)
    expect(A2uiMessageSchema.safeParse(message).success).toBe(true);
  const processor = taskProposalRegistry.createProcessor(payload, vi.fn());
  expect(processor).toBeInstanceOf(MessageProcessor);
  expect(
    processor.getSurfaces().get(payload.surfaceId)?.dataModel.get("/proposal"),
  ).toEqual(fixture.proposal);
  processor.dispose();
});
it("renders bound fields and sends edited data through a real A2UI action", async () => {
  const onAction = vi.fn().mockResolvedValue(undefined);
  const dirty = vi.fn();
  render(
    <TaskProposalSurface
      envelope={envelope()}
      onAction={onAction}
      onDirtyChange={dirty}
    />,
  );
  const input = await screen.findByRole("textbox", { name: "Task 1 title" });
  fireEvent.change(input, { target: { value: "Read chapter 2" } });
  expect(dirty).toHaveBeenCalledWith(true);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Lưu bản nháp" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
  await waitFor(() =>
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "save",
        items: [expect.objectContaining({ title: "Read chapter 2" })],
      }),
    ),
  );
});
it("rejects invalid fields and supports start date editing", async () => {
  render(<TaskProposalSurface envelope={envelope()} onAction={vi.fn()} />);
  fireEvent.change(
    await screen.findByRole("textbox", { name: "Task 1 title" }),
    { target: { value: " " } },
  );
  expect(screen.getByRole("button", { name: /Xác nhận/ })).toBeDisabled();
  expect(screen.getByLabelText("Task 1 startDate")).toBeInTheDocument();
});
describe.each(["created", "cancelled"] as const)("%s proposal", (status) => {
  it("disables editing after restoring history", async () => {
    const value = envelope();
    value.proposal.status = status;
    const message = value.a2ui!.messages[2].updateDataModel as {
      value: unknown;
    };
    message.value = value.proposal;
    render(<TaskProposalSurface envelope={value} />);
    expect(
      await screen.findByRole("textbox", { name: "Task 1 title" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /Xác nhận/ }),
    ).not.toBeInTheDocument();
  });
});
it.each(["catalog", "component", "data", "version", "root"])(
  "falls back for invalid %s",
  async (invalid) => {
    const value = envelope();
    if (invalid === "catalog") value.a2ui!.catalogId = "unknown";
    if (invalid === "version") value.a2ui!.messages[0].version = "v0.8";
    const components = (
      value.a2ui!.messages[1].updateComponents as {
        components: { id: string; component: string }[];
      }
    ).components;
    if (invalid === "component") components[0].component = "Unknown";
    if (invalid === "root") components[0].id = "other";
    if (invalid === "data")
      (value.a2ui!.messages[2].updateDataModel as { value: unknown }).value = {
        items: null,
      };
    render(<TaskProposalSurface envelope={value} />);
    expect(await screen.findByText(/Không thể hiển thị/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  },
);
it("rejects actions outside the catalog allowlist", async () => {
  const payload = envelope().a2ui!;
  const handler = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
  const processor = taskProposalRegistry.createProcessor(payload, handler);
  const surface = processor.getSurfaces().get(payload.surfaceId)!;
  await surface.dispatchAction({ event: { name: "delete_all" } }, "root");
  expect(handler).not.toHaveBeenCalled();
  processor.dispose();
});
