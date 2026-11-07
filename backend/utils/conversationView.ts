import type { AgentInteraction } from "../types/IAgent.js";
import type { ChatTurn } from "../types/IChatTurn.js";
import type { ProposalView } from "../types/A2UI/ITaskProposal.js";
import type { UiSurfaceEnvelope } from "../types/A2UI/IUiSurface.js";
import type { AgentActivity } from "../types/IAgentActivity.js";
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
  > & {
    messages?: ChatTurn["messages"];
    activities?: AgentActivity[];
    skillsRead?: ChatTurn["skillsRead"];
  },
  envelope?: {
    surface?: UiSurfaceEnvelope;
    proposal?: ProposalView;
    a2ui?: unknown;
    text?: string;
  },
) {
  const expired =
    turn.status === "processing" && turn.expiresAt.getTime() <= Date.now();
  const interaction = turn.interactions?.find((i) => i.status === "pending");
  return {
    data: expired
      ? interruptedReply(turn.messages)
      : (envelope?.text ?? turn.response),
    conversationId: turn.conversationId,
    requestId: turn.requestId,
    status: expired
      ? ("failed" as const)
      : turn.status === "awaiting_user"
        ? ("completed" as const)
        : turn.status,
    activities: turn.activities ?? [],
    skillsRead: turn.skillsRead ?? [],
    ...((turn.status === "completed" || turn.status === "awaiting_user") &&
    interaction
      ? { interaction: publicInteraction(interaction) }
      : {}),
    ...(envelope?.surface ? { surface: envelope.surface } : {}),
    ...(envelope?.proposal ? { proposal: envelope.proposal } : {}),
    ...(envelope?.a2ui ? { a2ui: envelope.a2ui } : {}),
  };
}

export function turnMessages(
  turn: ChatTurn,
  envelope?: {
    surface?: UiSurfaceEnvelope;
    proposal?: ProposalView;
    a2ui?: unknown;
    text?: string;
  },
) {
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
      skillsRead: turn.skillsRead ?? [],
    })),
    ...((turn.response && !turn.interactions?.length) || expired
      ? [
          {
            id: `${turn._id}:bot`,
            sender: "bot",
            text:
              envelope?.text ??
              (turn.response || interruptedReply(turn.messages)),
            timestamp: turn.updatedAt.toISOString(),
            skillsRead: turn.skillsRead ?? [],
            ...(envelope?.surface ? { surface: envelope.surface } : {}),
            ...(envelope?.proposal ? { proposal: envelope.proposal } : {}),
            ...(envelope?.a2ui ? { a2ui: envelope.a2ui } : {}),
          },
        ]
      : []),
  ];
}
