import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import User from "../../models/User.js";
import Category from "../../models/Category.js";
import Conversation from "../../models/Conversation.js";
import { chatTurnRepository } from "../../repositories/chatTurnRepository.js";
import type { ProposalIntent } from "../../types/A2UI/ITaskProposal.js";
import type { InteractionSelection } from "../../types/IChatTurn.js";
import type { AgentMode } from "../../types/IAgent.js";

export function getChatTestMongoUri(): string {
  const uri =
    process.env.CHAT_TEST_MONGO_URI || process.env.ORBIT_MCP_TEST_MONGO_URI;
  if (!uri) {
    throw new Error(
      "Missing CHAT_TEST_MONGO_URI or ORBIT_MCP_TEST_MONGO_URI. A MongoDB replica set is required for transactions.",
    );
  }
  return uri;
}

export async function connectChatTestMongo(
  dbPrefix = "orbit_chat_test",
): Promise<string> {
  const uri = getChatTestMongoUri();
  const dbName = `${dbPrefix}_${process.pid}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  await mongoose.connect(uri, { dbName });
  await Conversation.init();
  return dbName;
}

export async function disconnectChatTestMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.dropDatabase();
    } catch {
      // ignore drop errors on teardown
    }
    await mongoose.disconnect();
  }
}

export async function createUserAndConversations(
  count: number,
  userIndex = 0,
): Promise<{
  userId: string;
  userObjectId: mongoose.Types.ObjectId;
  conversationIds: string[];
}> {
  const userObjectId = new mongoose.Types.ObjectId();
  const userId = userObjectId.toHexString();

  await User.collection.insertOne({
    _id: userObjectId,
    role: "USER",
    name: `chat-user-${userIndex}-${Date.now()}`,
    email: `chat-user-${userIndex}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.test`,
  });

  await Category.create([{ userId: userObjectId, name: "Uncategorized" }]);

  const conversationIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = randomUUID();
    await Conversation.create({
      _id: id,
      userId: userObjectId,
      title: `Conversation ${i}`,
    });
    conversationIds.push(id);
  }

  return { userId, userObjectId, conversationIds };
}

export async function claimFor(
  userId: string,
  conversationId: string,
  requestId: string,
  options?: {
    userInput?: string;
    mode?: AgentMode;
    intent?: ProposalIntent;
    selection?: InteractionSelection;
    attachmentIds?: string[];
    timeZone?: string;
  },
) {
  return chatTurnRepository.claim(
    userId,
    conversationId,
    requestId,
    options?.userInput ?? "Hello from test",
    options?.mode ?? "auto",
    options?.intent,
    options?.selection,
    undefined,
    options?.attachmentIds ?? [],
    undefined,
    options?.timeZone,
  );
}
