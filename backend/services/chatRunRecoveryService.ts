import mongoose from "mongoose";
import ChatRunSlot from "../models/ChatRunSlot.js";
import ChatTurn from "../models/ChatTurn.js";
import ChatTurnEvent from "../models/ChatTurnEvent.js";
import Conversation from "../models/Conversation.js";

/**
 * Recovers orphaned chat runs from previous process instances on startup.
 * Finds all turns left in "processing" or "stopping", marks unfinished tools
 * as "unknown", records a terminal "turn.finished" event with status "interrupted",
 * and releases run slots and conversation locks.
 *
 * @param instanceId The unique ID of the current process instance.
 * @returns The number of orphaned runs recovered.
 */
export async function recoverInterruptedRuns(
  _instanceId: string,
): Promise<number> {
  await ChatTurn.init();
  await ChatTurnEvent.init();
  await ChatRunSlot.init();
  await Conversation.init();

  const orphanedTurns = await ChatTurn.find(
    { status: { $in: ["processing", "stopping"] } },
    { _id: 1 },
  ).lean();

  if (orphanedTurns.length === 0) {
    return 0;
  }

  let recoveredCount = 0;

  for (const orphan of orphanedTurns) {
    const recovered = await mongoose.connection.transaction(async (session) => {
      const turn = await ChatTurn.findOne({ _id: orphan._id }).session(session);
      if (!turn || !["processing", "stopping"].includes(turn.status)) {
        return false;
      }

      if (Array.isArray(turn.toolProgress)) {
        turn.toolProgress = turn.toolProgress.map((tp) =>
          tp.status === "started" ? { ...tp, status: "unknown" } : tp,
        );
      }

      const terminalStatus = "interrupted";
      const terminalReason = "process_restarted";
      turn.status = terminalStatus;
      turn.terminalReason = terminalReason;
      turn.response = turn.partialResponse || "";
      turn.finishedAt = new Date();

      const nextSeq = (turn.lastEventSeq ?? 0) + 1;
      turn.lastEventSeq = nextSeq;
      await turn.save({ session });

      await ChatTurnEvent.create(
        [
          {
            turnId: turn._id,
            userId: turn.userId,
            conversationId: turn.conversationId,
            seq: nextSeq,
            type: "turn.finished",
            payload: {
              status: terminalStatus,
              terminalReason,
              result: {
                turnId: turn._id,
                conversationId: turn.conversationId,
                status: terminalStatus,
                mode: turn.mode ?? "auto",
                response: turn.partialResponse || "",
                terminalReason,
              },
            },
            createdAt: new Date(),
          },
        ],
        { session },
      );

      await ChatRunSlot.deleteMany({ turnId: turn._id }, { session });
      await Conversation.updateOne(
        { _id: turn.conversationId, activeTurn: turn._id },
        { $set: { activeTurn: null, busyUntil: null } },
        { session },
      );

      return true;
    });

    if (recovered) {
      recoveredCount++;
    }
  }

  return recoveredCount;
}
