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
});
