import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { taskProposalUiService } from "../A2UI/taskProposalUiService.js";
import { proposalEnvelopeSchema } from "../../validations/A2UI/a2uiValidation.js";
import type { ProposalView } from "../../types/A2UI/ITaskProposal.js";

describe("taskProposalUiService", () => {
  const fixturePath = resolve(
    process.cwd(),
    "../docs/superpowers/fixtures/a2ui-task-proposal-v09.json",
  );
  const fixture = JSON.parse(readFileSync(fixturePath, "utf-8"));

  const sampleView: ProposalView = fixture.proposal;

  it("returns text and proposal without a2ui payload when feature is disabled", () => {
    const envelope = taskProposalUiService.present(sampleView, false);

    expect(envelope.proposal).toEqual(sampleView);
    expect(envelope.text).toBe(fixture.text);
    expect(envelope.a2ui).toBeUndefined();
    expect(proposalEnvelopeSchema.safeParse(envelope).success).toBe(true);
  });

  it("returns valid a2ui envelope when feature is enabled", () => {
    const envelope = taskProposalUiService.present(sampleView, true);

    expect(envelope.proposal).toEqual(sampleView);
    expect(envelope.a2ui).toBeDefined();
    expect(envelope.a2ui?.protocolVersion).toBe("v0.9");
    expect(envelope.a2ui?.catalogId).toBe("urn:orbit:a2ui:task-proposals:v1");
    expect(envelope.a2ui?.surfaceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(envelope.a2ui?.messages).toHaveLength(3);
    expect(envelope.a2ui?.messages[0]).toEqual({
      version: "v0.9",
      createSurface: {
        surfaceId: envelope.a2ui?.surfaceId,
        catalogId: sampleView.catalogId,
      },
    });
    expect(proposalEnvelopeSchema.safeParse(envelope).success).toBe(true);
  });

  it("structurally matches the a2ui fixture when surfaceId is normalized", () => {
    const envelope = taskProposalUiService.present(sampleView, true);

    // Normalize surfaceId to fixture's surfaceId
    const normalizedEnvelope = {
      ...envelope,
      a2ui: {
        ...envelope.a2ui,
        surfaceId: fixture.a2ui.surfaceId,
        messages: JSON.parse(
          JSON.stringify(envelope.a2ui?.messages).replaceAll(
            envelope.a2ui!.surfaceId,
            fixture.a2ui.surfaceId,
          ),
        ),
      },
    };

    expect(normalizedEnvelope).toEqual(fixture);
  });

  it("provides tailored summary texts for created and cancelled states", () => {
    const createdView: ProposalView = {
      ...sampleView,
      status: "created",
      createdTasks: [
        {
          itemId: sampleView.items[0].id,
          taskId: "507f1f77bcf86cd799439011",
          title: "Study Vocabulary",
        },
      ],
    };

    const createdEnvelope = taskProposalUiService.present(createdView, true);
    expect(createdEnvelope.text).toContain("Đã tạo thành công 1 công việc.");

    const cancelledView: ProposalView = {
      ...sampleView,
      status: "cancelled",
    };

    const cancelledEnvelope = taskProposalUiService.present(
      cancelledView,
      true,
    );
    expect(cancelledEnvelope.text).toContain("Đề xuất công việc đã được hủy.");
  });
});
