import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Conversation from "../../models/Conversation.js";
import ChatTurn from "../../models/ChatTurn.js";
import TaskProposal from "../../models/A2UI/TaskProposal.js";
import { chatTurnRepository } from "../chatTurnRepository.js";
import { taskProposalRepository } from "../A2UI/taskProposalRepository.js";
import {
  UI_COMPOSITION_CATALOG_ID,
  type StoredUiSurface,
} from "../../types/A2UI/IUiSurface.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_ui_surface_persistence_test_${process.pid}_${Date.now()}`;
const ownerId = new mongoose.Types.ObjectId();
const otherUserId = new mongoose.Types.ObjectId();

const specFixture = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "../frontend/src/test/fixtures/ui-composition-spec.json",
    ),
    "utf-8",
  ),
);

describe.skipIf(!uri)(
  "uiSurface persistence with real MongoDB transactions",
  () => {
    beforeAll(async () => {
      if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri)) {
        throw new Error("Use disposable loopback MongoDB");
      }
      await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
      await Conversation.init();
      await ChatTurn.init();
      await taskProposalRepository.initIndexes();
    });

    afterAll(async () => {
      if (mongoose.connection.name === dbName) {
        await mongoose.connection.dropDatabase();
      }
      await mongoose.disconnect();
    });

    it("persists a read-only uiSurface on finish and replays on duplicate claim", async () => {
      const conversationId = randomUUID();
      await Conversation.create({
        _id: conversationId,
        userId: ownerId,
        title: "Readonly UI",
        sequence: 0,
      });

      const requestId = randomUUID();
      const claimed = await chatTurnRepository.claim(
        String(ownerId),
        conversationId,
        requestId,
        "Show table",
      );
      expect(claimed.claimed).toBe(true);

      const storedSurface: StoredUiSurface = {
        catalogId: UI_COMPOSITION_CATALOG_ID,
        surfaceId: randomUUID(),
        spec: specFixture.readonly,
      };

      await chatTurnRepository.finish(
        claimed.turn._id,
        specFixture.readonly.fallbackText,
        "completed",
        claimed.turn.executionToken,
        undefined,
        [],
        storedSurface,
      );

      const savedTurn = await ChatTurn.findById(claimed.turn._id).lean();
      expect(savedTurn?.status).toBe("completed");
      expect(savedTurn?.uiSurface).toEqual(storedSurface);

      const duplicate = await chatTurnRepository.claim(
        String(ownerId),
        conversationId,
        requestId,
        "Show table",
      );
      expect(duplicate.claimed).toBe(false);
      expect(duplicate.turn.uiSurface).toEqual(storedSurface);
    });

    it("atomically persists proposal and uiSurface and scopes findByProposal by owner and conversation", async () => {
      const conversationId = randomUUID();
      await Conversation.create({
        _id: conversationId,
        userId: ownerId,
        title: "Proposal UI",
        sequence: 0,
      });

      const claimed = await chatTurnRepository.claim(
        String(ownerId),
        conversationId,
        randomUUID(),
        "Propose study tasks",
      );

      const storedSurface: StoredUiSurface = {
        catalogId: UI_COMPOSITION_CATALOG_ID,
        surfaceId: randomUUID(),
        spec: specFixture.proposal,
      };
      const items = [{ id: randomUUID(), title: "Practice speaking" }];

      const proposal = await chatTurnRepository.finishWithProposal(
        claimed.turn._id,
        claimed.turn.executionToken,
        items,
        specFixture.proposal.fallbackText,
        [],
        storedSurface,
      );
      expect(proposal).not.toBeNull();
      expect(proposal?.catalogId).toBe("urn:orbit:a2ui:task-proposals:v1");

      const foundForOwner = await chatTurnRepository.findByProposal(
        String(ownerId),
        conversationId,
        proposal!.proposalId,
      );
      expect(foundForOwner?.uiSurface).toEqual(storedSurface);

      const foundForOtherUser = await chatTurnRepository.findByProposal(
        String(otherUserId),
        conversationId,
        proposal!.proposalId,
      );
      expect(foundForOtherUser).toBeNull();

      const foundForOtherConversation = await chatTurnRepository.findByProposal(
        String(ownerId),
        randomUUID(),
        proposal!.proposalId,
      );
      expect(foundForOtherConversation).toBeNull();
    });

    it("does not create proposal, store layout, or release a newer active turn when lease or executionToken is stale", async () => {
      const conversationId = randomUUID();
      await Conversation.create({
        _id: conversationId,
        userId: ownerId,
        title: "Lease expiry",
        sequence: 0,
      });

      const first = await chatTurnRepository.claim(
        String(ownerId),
        conversationId,
        randomUUID(),
        "Stale worker",
      );

      // Expire the first turn and claim a second active turn
      await ChatTurn.updateOne(
        { _id: first.turn._id },
        { $set: { expiresAt: new Date(0) } },
      );
      await Conversation.updateOne(
        { _id: conversationId },
        { $set: { busyUntil: new Date(0) } },
      );

      const second = await chatTurnRepository.claim(
        String(ownerId),
        conversationId,
        randomUUID(),
        "Active worker",
      );

      const storedSurface: StoredUiSurface = {
        catalogId: UI_COMPOSITION_CATALOG_ID,
        surfaceId: randomUUID(),
        spec: specFixture.proposal,
      };

      const staleProposal = await chatTurnRepository.finishWithProposal(
        first.turn._id,
        first.turn.executionToken,
        [{ id: randomUUID(), title: "Should not persist" }],
        "Stale",
        [],
        storedSurface,
      );
      expect(staleProposal).toBeNull();
      expect(
        await TaskProposal.countDocuments({ turnId: first.turn._id }),
      ).toBe(0);

      const firstTurnAfter = await ChatTurn.findById(first.turn._id).lean();
      expect(firstTurnAfter?.uiSurface).toBeNull();

      const convAfter = await Conversation.findById(conversationId).lean();
      expect(convAfter?.activeTurn).toBe(second.turn._id);
    });
  },
);
