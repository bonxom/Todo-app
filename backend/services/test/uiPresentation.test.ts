import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import { uiPresentationService } from "../A2UI/uiPresentationService.js";
import type { ChatTurn } from "../../types/IChatTurn.js";
import type { ProposalView } from "../../types/A2UI/ITaskProposal.js";
import {
  UI_COMPOSITION_CATALOG_ID,
  type StoredUiSurface,
} from "../../types/A2UI/IUiSurface.js";

const specFixture = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "../frontend/src/test/fixtures/ui-composition-spec.json",
    ),
    "utf-8",
  ),
);

const proposalFixture = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "../frontend/src/test/fixtures/a2ui-task-proposal-v09.json",
    ),
    "utf-8",
  ),
);

const sampleProposal: ProposalView = proposalFixture.proposal;

const makeTurn = (overrides: Partial<ChatTurn> = {}): ChatTurn => ({
  _id: "turn-1",
  conversationId: sampleProposal.conversationId,
  userId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
  requestId: "req-1",
  sequence: 1,
  userInput: "Help me plan",
  status: "completed",
  mode: "auto",
  executionToken: "tok-1",
  interactions: [],
  response: "Saved fallback response",
  messages: [],
  expiresAt: new Date(Date.now() + 60_000),
  createdAt: new Date("2026-11-07T00:00:00.000Z"),
  updatedAt: new Date("2026-11-07T00:00:00.000Z"),
  ...overrides,
});

describe("uiPresentationService", () => {
  beforeEach(() => {
    vi.stubEnv("A2UI_TASK_PROPOSALS_ENABLED", "true");
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "true");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("projects a read-only turn using its saved surfaceId", () => {
    const surfaceId = "22222222-2222-4222-8222-222222222222";
    const uiSurface: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId,
      spec: specFixture.readonly,
    };
    const turn = makeTurn({
      response: specFixture.readonly.fallbackText,
      uiSurface,
    });

    const presented = uiPresentationService.forTurn(turn);
    expect(presented.text).toBe(specFixture.readonly.fallbackText);
    expect(presented.surface).toBeDefined();
    expect(presented.surface?.a2ui.surfaceId).toBe(surfaceId);
    expect(presented.surface?.a2ui.catalogId).toBe(UI_COMPOSITION_CATALOG_ID);
    expect(presented.proposal).toBeUndefined();
    expect(presented.a2ui).toBeUndefined();
  });

  it("replays composed proposal turns with current authoritative status (draft, created, cancelled) and same surfaceId", () => {
    const surfaceId = "33333333-3333-4333-8333-333333333333";
    const uiSurface: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId,
      spec: specFixture.proposal,
    };
    const turn = makeTurn({
      proposalId: sampleProposal.id,
      response: specFixture.proposal.fallbackText,
      uiSurface,
    });

    const draftResult = uiPresentationService.forTurn(turn, sampleProposal);
    expect(draftResult.surface?.a2ui.surfaceId).toBe(surfaceId);
    expect(draftResult.proposal?.status).toBe("draft");
    expect(draftResult.a2ui).toBeDefined();

    const createdProposal: ProposalView = {
      ...sampleProposal,
      revision: 2,
      status: "created",
      createdTasks: [
        {
          itemId: sampleProposal.items[0].id,
          taskId: "507f1f77bcf86cd799439099",
          title: sampleProposal.items[0].title,
        },
      ],
    };
    const createdResult = uiPresentationService.forTurn(turn, createdProposal);
    expect(createdResult.surface?.a2ui.surfaceId).toBe(surfaceId);
    const createdModelMsg = createdResult.surface?.a2ui.messages.find(
      (m) => "updateDataModel" in m,
    ) as { updateDataModel: { value: { proposal: ProposalView } } };
    expect(createdModelMsg.updateDataModel.value.proposal.status).toBe(
      "created",
    );
    expect(createdModelMsg.updateDataModel.value.proposal.revision).toBe(2);

    const cancelledProposal: ProposalView = {
      ...sampleProposal,
      revision: 3,
      status: "cancelled",
    };
    const cancelledResult = uiPresentationService.forTurn(
      turn,
      cancelledProposal,
    );
    expect(cancelledResult.surface?.a2ui.surfaceId).toBe(surfaceId);
    const cancelledModelMsg = cancelledResult.surface?.a2ui.messages.find(
      (m) => "updateDataModel" in m,
    ) as { updateDataModel: { value: { proposal: ProposalView } } };
    expect(cancelledModelMsg.updateDataModel.value.proposal.status).toBe(
      "cancelled",
    );
  });

  it("falls back to text when stored read-only surface has an unsupported catalog or invalid graph", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const invalidTurn = makeTurn({
      response: "Safe fallback text",
      uiSurface: {
        catalogId: "urn:orbit:a2ui:unknown:v99" as never,
        surfaceId: randomUUID(),
        spec: specFixture.readonly,
      },
    });

    const result = uiPresentationService.forTurn(invalidTurn);
    expect(result.surface).toBeUndefined();
    expect(result.text).toBe("Safe fallback text");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("falls back to legacy proposal envelope when stored proposal layout is invalid or combined envelope exceeds 128 KiB", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const invalidProposalTurn = makeTurn({
      proposalId: sampleProposal.id,
      uiSurface: {
        catalogId: UI_COMPOSITION_CATALOG_ID,
        surfaceId: randomUUID(),
        spec: specFixture.readonly, // invalid for proposal mode!
      },
    });

    const fallback = uiPresentationService.forTurn(
      invalidProposalTurn,
      sampleProposal,
    );
    expect(fallback.surface).toBeUndefined();
    expect(fallback.proposal).toEqual(sampleProposal);
    expect(fallback.a2ui).toBeDefined();

    // Oversized combined envelope (> 128 KiB when combined with legacy a2ui + proposal)
    const largeText = "A".repeat(127 * 1024);
    const largeSpec = {
      ...specFixture.proposal,
      displayData: {
        ...specFixture.proposal.displayData,
        planIntro: largeText,
      },
    };
    const oversizedTurn = makeTurn({
      proposalId: sampleProposal.id,
      uiSurface: {
        catalogId: UI_COMPOSITION_CATALOG_ID,
        surfaceId: randomUUID(),
        spec: largeSpec,
      },
    });

    const oversizedFallback = uiPresentationService.forTurn(
      oversizedTurn,
      sampleProposal,
    );
    expect(oversizedFallback.surface).toBeUndefined();
    expect(oversizedFallback.proposal).toEqual(sampleProposal);
    expect(oversizedFallback.a2ui).toBeDefined();
  });

  it("suppresses composed surface projection when A2UI_COMPOSITION_ENABLED is false while retaining stored layout", () => {
    vi.stubEnv("A2UI_COMPOSITION_ENABLED", "false");
    const uiSurface: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId: randomUUID(),
      spec: specFixture.proposal,
    };
    const turn = makeTurn({
      proposalId: sampleProposal.id,
      response: specFixture.proposal.fallbackText,
      uiSurface,
    });

    const result = uiPresentationService.forTurn(turn, sampleProposal);
    expect(result.surface).toBeUndefined();
    expect(result.proposal).toEqual(sampleProposal);
    expect(result.a2ui).toBeDefined();
    expect(turn.uiSurface).toEqual(uiSurface);
  });

  it("forProposal resolves stored layout for owner and does not leak missing or foreign layouts", async () => {
    const surfaceId = "44444444-4444-4444-8444-444444444444";
    const uiSurface: StoredUiSurface = {
      catalogId: UI_COMPOSITION_CATALOG_ID,
      surfaceId,
      spec: specFixture.proposal,
    };
    const findSpy = vi
      .spyOn(chatTurnRepository, "findByProposal")
      .mockResolvedValueOnce(
        makeTurn({
          proposalId: sampleProposal.id,
          uiSurface,
        }) as never,
      )
      .mockResolvedValueOnce(null);

    const ownerEnvelope = await uiPresentationService.forProposal(
      "507f1f77bcf86cd799439011",
      sampleProposal,
    );
    expect(findSpy).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      sampleProposal.conversationId,
      sampleProposal.id,
    );
    expect(ownerEnvelope.surface?.a2ui.surfaceId).toBe(surfaceId);
    expect(ownerEnvelope.proposal).toEqual(sampleProposal);

    const missingOrForeign = await uiPresentationService.forProposal(
      "507f1f77bcf86cd799439099",
      sampleProposal,
    );
    expect(missingOrForeign.surface).toBeUndefined();
    expect(missingOrForeign.proposal).toEqual(sampleProposal);
  });
});
