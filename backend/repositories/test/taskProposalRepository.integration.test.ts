import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import TaskProposal from "../../models/A2UI/TaskProposal.js";
import TaskProposalReceipt from "../../models/A2UI/TaskProposalReceipt.js";
import type {
  ITaskProposal,
  ProposalView,
} from "../../types/A2UI/ITaskProposal.js";
import { taskProposalRepository as repository } from "../A2UI/taskProposalRepository.js";

const uri = process.env.ORBIT_MCP_TEST_MONGO_URI;
const dbName = `orbit_proposal_repository_test_${process.pid}_${Date.now()}`;
const userId = new mongoose.Types.ObjectId();
const draft = (overrides: Partial<ITaskProposal> = {}): ITaskProposal => ({
  userId,
  conversationId: randomUUID(),
  turnId: randomUUID(),
  proposalId: randomUUID(),
  revision: 1,
  status: "draft",
  protocolVersion: "v0.9",
  catalogId: "urn:orbit:a2ui:task-proposals:v1",
  items: [{ id: randomUUID(), title: "Read" }],
  selectedItemIds: [],
  createdTasks: [],
  ...overrides,
});
const view = (proposal: ITaskProposal): ProposalView => ({
  id: proposal.proposalId,
  conversationId: proposal.conversationId,
  turnId: proposal.turnId,
  revision: proposal.revision,
  status: proposal.status,
  protocolVersion: proposal.protocolVersion,
  catalogId: proposal.catalogId,
  items: proposal.items,
  selectedItemIds: [],
  createdTasks: [],
});

describe.skipIf(!uri)("task proposal repository with real MongoDB", () => {
  beforeAll(async () => {
    if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/$/.test(uri)) {
      throw new Error("Use disposable loopback MongoDB");
    }
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
    await repository.initIndexes();
  });
  afterAll(async () => {
    if (mongoose.connection.name === dbName)
      await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("updates only the selected conversation when proposal IDs coincide", async () => {
    const first = draft();
    const second = draft({ proposalId: first.proposalId });
    await repository.create(first);
    await repository.create(second);
    const changed = await repository.saveRevision(
      String(userId),
      second.conversationId,
      second.proposalId,
      1,
      { status: "cancelled" },
    );
    expect(changed?.conversationId).toBe(second.conversationId);
    expect(changed?.revision).toBe(2);
    expect(
      (
        await repository.findOwned(
          String(userId),
          first.conversationId,
          first.proposalId,
        )
      )?.status,
    ).toBe("draft");
    expect(
      await repository.saveRevision(
        String(userId),
        second.conversationId,
        second.proposalId,
        1,
        { status: "draft" },
      ),
    ).toBeNull();
  });

  it("isolates owned reads and updates", async () => {
    const proposal = draft();
    await repository.create(proposal);
    const stranger = String(new mongoose.Types.ObjectId());
    expect(
      await repository.findOwned(
        stranger,
        proposal.conversationId,
        proposal.proposalId,
      ),
    ).toBeNull();
    expect(await repository.findByTurn(stranger, proposal.turnId)).toBeNull();
    expect(await repository.findByTurnIds(stranger, [proposal.turnId])).toEqual(
      [],
    );
    expect(
      await repository.saveRevision(
        stranger,
        proposal.conversationId,
        proposal.proposalId,
        1,
        { status: "cancelled" },
      ),
    ).toBeNull();
  });

  it("enforces unique turn and conversation/proposal keys", async () => {
    const proposal = draft();
    await repository.create(proposal);
    await expect(
      repository.create(draft({ turnId: proposal.turnId })),
    ).rejects.toMatchObject({ code: 11000 });
    await expect(
      repository.create(
        draft({
          conversationId: proposal.conversationId,
          proposalId: proposal.proposalId,
        }),
      ),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("stores receipts with owner-scoped request uniqueness", async () => {
    const proposal = draft();
    const receipt = {
      userId,
      requestId: randomUUID(),
      proposalId: proposal.proposalId,
      payloadFingerprint: "fixture",
      responseView: view(proposal),
    };
    await repository.saveReceipt(receipt);
    expect(
      (await repository.findReceipt(String(userId), receipt.requestId))
        ?.responseView,
    ).toEqual(view(proposal));
    await expect(repository.saveReceipt(receipt)).rejects.toMatchObject({
      code: 11000,
    });
    const other = new mongoose.Types.ObjectId();
    expect(
      await repository.findReceipt(String(other), receipt.requestId),
    ).toBeNull();
    await repository.saveReceipt({ ...receipt, userId: other });
  });

  it("rolls back proposal and receipt writes with an explicit session", async () => {
    const proposal = draft();
    const requestId = randomUUID();
    await expect(
      mongoose.connection.transaction(async (session) => {
        await repository.create(proposal, session);
        await repository.saveReceipt(
          {
            userId,
            requestId,
            proposalId: proposal.proposalId,
            payloadFingerprint: "rollback",
            responseView: view(proposal),
          },
          session,
        );
        expect(
          await repository.findOwned(
            String(userId),
            proposal.conversationId,
            proposal.proposalId,
            session,
          ),
        ).not.toBeNull();
        throw new Error("injected failure");
      }),
    ).rejects.toThrow("injected failure");
    expect(
      await TaskProposal.countDocuments({ proposalId: proposal.proposalId }),
    ).toBe(0);
    expect(await TaskProposalReceipt.countDocuments({ requestId })).toBe(0);
  });

  it("finds the newest three confirmed proposals with stable tie-break and isolates other users/conversations", async () => {
    const conversationId = randomUUID();
    const otherConversationId = randomUUID();
    const otherUserId = new mongoose.Types.ObjectId();

    const t0 = new Date("2026-11-20T10:00:00.000Z");
    const t1 = new Date("2026-11-21T10:00:00.000Z");
    const t2 = new Date("2026-11-22T10:00:00.000Z");
    const t3 = new Date("2026-11-23T10:00:00.000Z");
    const tEqual = new Date("2026-11-23T12:00:00.000Z");

    // 1. Old draft created at t0, confirmed last at tEqual
    const lateConfirmedId = new mongoose.Types.ObjectId();
    const lateConfirmed = {
      _id: lateConfirmedId,
      userId,
      conversationId,
      turnId: randomUUID(),
      proposalId: "prop-late",
      status: "created",
      createdTasks: [{ taskId: "task-late", title: "Late task" }],
      createdAt: t0,
      updatedAt: tEqual,
    };

    // 2. Another confirmed with same timestamp tEqual
    const equalConfirmedId = new mongoose.Types.ObjectId();
    const equalConfirmed = {
      _id: equalConfirmedId,
      userId,
      conversationId,
      turnId: randomUUID(),
      proposalId: "prop-equal",
      status: "created",
      createdTasks: [{ taskId: "task-equal", title: "Equal task" }],
      createdAt: t1,
      updatedAt: tEqual,
    };

    // 3. Confirmed at t3
    const nextConfirmed = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      conversationId,
      turnId: randomUUID(),
      proposalId: "prop-next",
      status: "created",
      createdTasks: [{ taskId: "task-next", title: "Next task" }],
      createdAt: t2,
      updatedAt: t3,
    };

    // 4. Older confirmed at t2 (should be 4th, so not in top 3)
    const oldConfirmed = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      conversationId,
      turnId: randomUUID(),
      proposalId: "prop-old",
      status: "created",
      createdTasks: [{ taskId: "task-old", title: "Old task" }],
      createdAt: t1,
      updatedAt: t2,
    };

    // 5. Cancelled record
    const cancelled = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      conversationId,
      turnId: randomUUID(),
      proposalId: "prop-cancelled",
      status: "cancelled",
      createdTasks: [{ taskId: "task-c", title: "Cancelled" }],
      createdAt: t1,
      updatedAt: tEqual,
    };

    // 6. Draft record
    const draftRec = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      conversationId,
      turnId: randomUUID(),
      proposalId: "prop-draft",
      status: "draft",
      createdTasks: [],
      createdAt: t1,
      updatedAt: tEqual,
    };

    // 7. Confirmed record in another conversation
    const otherConv = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      conversationId: otherConversationId,
      turnId: randomUUID(),
      proposalId: "prop-other-conv",
      status: "created",
      createdTasks: [{ taskId: "task-oc", title: "Other conv task" }],
      createdAt: t1,
      updatedAt: tEqual,
    };

    // 8. Confirmed record owned by another user
    const otherUserRec = {
      _id: new mongoose.Types.ObjectId(),
      userId: otherUserId,
      conversationId,
      turnId: randomUUID(),
      proposalId: "prop-other-user",
      status: "created",
      createdTasks: [{ taskId: "task-ou", title: "Other user task" }],
      createdAt: t1,
      updatedAt: tEqual,
    };

    await TaskProposal.collection.insertMany([
      lateConfirmed,
      equalConfirmed,
      nextConfirmed,
      oldConfirmed,
      cancelled,
      draftRec,
      otherConv,
      otherUserRec,
    ]);

    const results = await repository.findRecentConfirmed(
      String(userId),
      conversationId,
    );

    expect(results).toHaveLength(3);
    const expectedTopTwo = [equalConfirmed, lateConfirmed].sort((a, b) =>
      b._id.toString().localeCompare(a._id.toString()),
    );
    expect(results.map((r) => r.proposalId)).toEqual([
      expectedTopTwo[0].proposalId,
      expectedTopTwo[1].proposalId,
      "prop-next",
    ]);
    expect(results[0]).toMatchObject({
      proposalId: expectedTopTwo[0].proposalId,
      confirmedAt: tEqual.toISOString(),
      createdTasks: expect.any(Array),
    });
  });
});
