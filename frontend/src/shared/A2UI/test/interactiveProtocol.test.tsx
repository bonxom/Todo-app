import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { A2uiMessageSchema, MessageProcessor } from "@a2ui/web_core/v0_9";
import { A2uiHost } from "../A2uiHost";
import type { SurfacePayload } from "../catalogRegistry";
import { interactiveRegistry } from "../interactiveCatalog";
import type { UiSurfaceEnvelope } from "@/shared/types/A2UI/uiSurface";
import interactiveFixture from "@/test/fixtures/a2ui-interactive-v09.json";

const cloneInteractivePayload = (): SurfacePayload =>
  structuredClone(
    (interactiveFixture.envelope as UiSurfaceEnvelope).a2ui,
  ) as SurfacePayload;

describe("interactiveProtocol & interactiveComponents", () => {
  it("conforms to A2UI v0.9, starts disabled while loading, and dispatches exact server actionId when ready", async () => {
    const user = userEvent.setup();
    const payload = cloneInteractivePayload();
    for (const message of payload.messages) {
      expect(A2uiMessageSchema.safeParse(message).success).toBe(true);
    }

    const processor = interactiveRegistry.createProcessor(payload, vi.fn());
    expect(processor).toBeInstanceOf(MessageProcessor);
    processor.dispose();

    const onAction = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <A2uiHost
        payload={payload}
        registry={interactiveRegistry}
        onAction={onAction}
        fallback={<div data-testid="fallback">Fallback rendered</div>}
      />,
    );

    const button = await screen.findByRole("button", { name: "Hoàn thành" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onAction).not.toHaveBeenCalled();

    rerender(
      <A2uiHost
        payload={payload}
        registry={interactiveRegistry}
        dataPatches={{
          "/actionState/finishTask": { status: "ready", disabled: false },
        }}
        onAction={onAction}
        fallback={<div data-testid="fallback">Fallback rendered</div>}
      />,
    );

    expect(button).toBeEnabled();
    button.focus();
    await user.keyboard("{Enter}");

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "dispatch",
        surfaceId: payload.surfaceId,
        context: { actionId: interactiveFixture.actionId },
      }),
    );
  });

  it("rejects unknown action names, unknown components, and missing actionState bindings with fallback", async () => {
    const badActionPayload = cloneInteractivePayload();
    (
      badActionPayload.messages[1].updateComponents as {
        components: Record<string, unknown>[];
      }
    ).components[2] = {
      id: "finishButton",
      component: "Button",
      label: "Hoàn thành",
      action: {
        event: {
          name: "delete_all",
          context: { actionId: interactiveFixture.actionId },
        },
      },
      actionState: { path: "/actionState/finishTask" },
    };

    expect(() =>
      interactiveRegistry.createProcessor(badActionPayload, vi.fn()),
    ).toThrow();

    render(
      <A2uiHost
        payload={badActionPayload}
        registry={interactiveRegistry}
        onAction={vi.fn()}
        fallback={<div data-testid="fallback">Fallback rendered</div>}
      />,
    );
    expect(await screen.findByTestId("fallback")).toBeInTheDocument();

    const badBindingPayload = cloneInteractivePayload();
    (
      badBindingPayload.messages[1].updateComponents as {
        components: Record<string, unknown>[];
      }
    ).components[2] = {
      id: "finishButton",
      component: "Button",
      label: "Hoàn thành",
      action: {
        event: {
          name: "dispatch",
          context: { actionId: interactiveFixture.actionId },
        },
      },
      actionState: { path: "/actionState/missingKey" },
    };
    expect(() =>
      interactiveRegistry.createProcessor(badBindingPayload, vi.fn()),
    ).toThrow();

    const proposalComponentPayload = cloneInteractivePayload();
    (
      proposalComponentPayload.messages[1].updateComponents as {
        components: Record<string, unknown>[];
      }
    ).components[2] = {
      id: "finishButton",
      component: "TaskProposalForm",
    };
    expect(() =>
      interactiveRegistry.createProcessor(proposalComponentPayload, vi.fn()),
    ).toThrow();
  });
});
