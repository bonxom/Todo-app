import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions.js";

export const analyzeImageSchema = z.strictObject({
  attachmentId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(1000),
});

export type AnalyzeImageArgs = z.infer<typeof analyzeImageSchema>;

export const analyzeImageTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "analyze_image",
    description:
      "Inspect an attached image in the current conversation using a dedicated vision model. Pass the attachmentId from attached file metadata (current or earlier turns in this conversation) and a focused prompt describing what to read, extract, or examine based on the user's request. You may call this tool in parallel for multiple images or again with a more specific prompt on follow-up questions.",
    parameters: {
      type: "object",
      properties: {
        attachmentId: {
          type: "string",
          format: "uuid",
          description:
            "The UUID attachmentId of an attached image in this conversation.",
        },
        prompt: {
          type: "string",
          minLength: 1,
          maxLength: 1000,
          description:
            "A focused question or extraction instruction telling the vision model what to look for in the image.",
        },
      },
      required: ["attachmentId", "prompt"],
      additionalProperties: false,
    },
  },
};

export function parseAnalyzeImageArgs(raw: unknown): AnalyzeImageArgs {
  return analyzeImageSchema.parse(raw);
}
