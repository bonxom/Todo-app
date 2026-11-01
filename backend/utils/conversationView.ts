import type { AgentInteraction } from "../types/IAgent.js";
import type { ChatTurn } from "../types/IChatTurn.js";
import { interruptedReply } from "./interruptedReply.js";
import { decodeFilename } from "./attachmentFile.js";

export function publicInteraction(i: AgentInteraction) {
  const {
    id,
    kind,
    question,
    options,
    allowCustomAnswer,
    status,
    details,
    answer,
  } = i;
  return {
    id,
    kind,
    question,
    options,
    allowCustomAnswer,
    status,
    details,
    answer,
  };
}
export function resultFor(
  turn: Pick<
    ChatTurn,
    | "conversationId"
    | "requestId"
    | "status"
    | "response"
    | "interactions"
    | "expiresAt"
  > & { messages?: ChatTurn["messages"] },
) {
  const expired =
    turn.status === "processing" && turn.expiresAt.getTime() <= Date.now();
  const interaction = turn.interactions?.find((i) => i.status === "pending");
  return {
    data: expired ? interruptedReply(turn.messages) : turn.response,
    conversationId: turn.conversationId,
    requestId: turn.requestId,
    status: expired
      ? ("failed" as const)
      : turn.status === "awaiting_user"
        ? ("completed" as const)
        : turn.status,
    ...((turn.status === "completed" || turn.status === "awaiting_user") &&
    interaction
      ? { interaction: publicInteraction(interaction) }
      : {}),
  };
}

export function turnMessages(turn: ChatTurn) {
  const expired =
    turn.status === "processing" && turn.expiresAt.getTime() < Date.now();
  return [
    {
      id: `${turn._id}:user`,
      sender: "user",
      ...(turn.selection
        ? { replyToInteractionId: turn.selection.interactionId }
        : {}),
      text: turn.userInput,
      ...(turn.attachments?.length
        ? {
            attachments: turn.attachments.map((file) => ({
              ...file,
              name: decodeFilename(file.name),
            })),
          }
        : {}),
      timestamp: turn.createdAt.toISOString(),
    },
    ...(turn.interactions ?? []).map((i) => ({
      id: `${turn._id}:${i.id}`,
      sender: "bot",
      text: i.question,
      timestamp: turn.updatedAt.toISOString(),
      interaction: publicInteraction(i),
    })),
    ...((turn.response && !turn.interactions?.length) || expired
      ? [
          {
            id: `${turn._id}:bot`,
            sender: "bot",
            text: turn.response || interruptedReply(turn.messages),
            timestamp: turn.updatedAt.toISOString(),
          },
        ]
      : []),
  ];
}
