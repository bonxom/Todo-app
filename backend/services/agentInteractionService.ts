import { randomUUID } from "node:crypto";
import type { ChatCompletionTool } from "openai/resources/chat/completions.js";
import type { AgentInteraction } from "../types/IAgent.js";
import { grillUserSchema } from "../validations/agentValidation.js";

export const grillUserTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "grill_user",
    description:
      "Ask one short, direct question in the user's language. Offer two to four relevant options. Use at most one sentence per option description when it helps the user decide. Keep tool names and jargon out of the question. Allow a custom answer where appropriate. You may recommend an option without assuming it was selected. Do not ask again for details or actions the user has already clearly requested or confirmed. This displays a menu and waits for the next user message. Use the answer to continue the task and write a natural response after executing tools.",
    parameters: grillUserSchema.toJSONSchema(),
  },
};

export function clarification(
  raw: unknown,
  toolCallId: string,
): AgentInteraction {
  return {
    ...grillUserSchema.parse(raw),
    id: randomUUID(),
    kind: "clarification",
    status: "pending",
    toolCallId,
  };
}
