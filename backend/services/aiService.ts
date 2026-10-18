import { z } from "zod";
import type { ZodType } from "zod";
import mongoose from "mongoose";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createOrbitMcpServer } from "../mcp/server.js";
import type { McpContext } from "../mcp/context.js";
import { getAiClient } from "../libs/aiClient.js";
import { getAiModel } from "../config/env.js";
import { categoryRepository } from "../repositories/categoryRepository.js";
import { taskRepository } from "../repositories/taskRepository.js";
import { statService } from "./statService.js";
import { normalizeTaskDateInput } from "../utils/dateTime.js";
import { AppError } from "../error/AppError.js";
import { AI_ERROR } from "../error/definitions/aiErrors.js";

const parseAiResponse = <T>(schema: ZodType<T>, content: string): T => {
  try {
    return schema.parse(JSON.parse(content));
  } catch (error: unknown) {
    throw new AppError(AI_ERROR.RESPONSE_INVALID, { cause: error });
  }
};

const callAiProvider = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof AppError) throw error;
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      throw new AppError(AI_ERROR.PROVIDER_TIMEOUT, { cause: error });
    }
    throw new AppError(AI_ERROR.PROVIDER_ERROR, { cause: error });
  }
};

export const aiService = {
  async generateTasks(
    userRequirement: string,
    userId: mongoose.Types.ObjectId | string,
  ): Promise<unknown[]> {
    const ai = getAiClient();
    const categories = await categoryRepository.findByUser(userId);

    const categoryMap: Record<string, string> = {};
    categories.forEach((c) => {
      categoryMap[c.name] = c._id.toString();
    });

    const taskSchema = z.object({
      title: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      priority: z.enum(["Low", "Medium", "High"]).optional(),
      categoryName: z.string().optional().nullable(),
      dueDate: z.string().optional(),
    });

    const tasksArraySchema = z.array(taskSchema).length(3);

    const today = new Date().toISOString().split("T")[0];
    const prompt = `Generate EXACTLY 3 tasks (as an array) based on the following user requirement: "${userRequirement}".

Available categories (choose ONE of these EXACT names for each task or pick the "Uncategorized" category if none fit):
${categories.map((c) => `- "${c.name}"`).join("\n")}

IMPORTANT:
- Return an ARRAY of EXACTLY 3 TASK OBJECTS
- For categoryName, you MUST use the EXACT category name from the list above (case-sensitive)
- Do NOT make up new category names. If uncertain, use null
- Make each task unique and actionable

Create 3 practical, actionable tasks with:
- title: brief and clear
- description: detailed explanation
- priority: Low, Medium, or High
- categoryName: one of the exact names listed above, or null
- dueDate: YYYY-MM-DD format if applicable (based on today: ${today})`;

    const model = getAiModel();
    if (!model) throw new AppError(AI_ERROR.CONFIG_MISSING);

    const rawSchema = tasksArraySchema.toJSONSchema();
    const { $schema, ...jsonSchema } = rawSchema;

    const response = await callAiProvider(() =>
      ai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `You must respond with a JSON array of exactly 3 task objects. Follow this JSON Schema:\n${JSON.stringify(jsonSchema, null, 2)}`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    );

    const content = response.choices[0]?.message?.content;
    if (!content) throw new AppError(AI_ERROR.EMPTY_RESPONSE);

    const generatedTasks = parseAiResponse(tasksArraySchema, content);

    const savedTasks: unknown[] = [];

    for (const generatedTask of generatedTasks) {
      let categoryId: string | null = null;
      if (generatedTask.categoryName) {
        if (categoryMap[generatedTask.categoryName]) {
          categoryId = categoryMap[generatedTask.categoryName];
        } else {
          const lower = generatedTask.categoryName.toLowerCase();
          const matched = categories.find(
            (c) => c.name.toLowerCase() === lower,
          );
          if (matched) {
            categoryId = matched._id.toString();
          } else if (categoryMap["Uncategorized"]) {
            categoryId = categoryMap["Uncategorized"];
          }
        }
      }

      const dueDateUpdate = normalizeTaskDateInput(generatedTask.dueDate);
      if (dueDateUpdate.error) continue;

      const task = await taskRepository.create({
        title: generatedTask.title,
        description: generatedTask.description || "",
        priority: generatedTask.priority || "Medium",
        status: "pending",
        categoryId,
        dueDate: dueDateUpdate.shouldUpdate ? dueDateUpdate.value : undefined,
      });

      savedTasks.push(task);
      await statService.incrementPending(userId);
    }

    return savedTasks;
  },

  async chatResponse(userInput: string): Promise<string> {
    const ai = getAiClient();

    const sysInstruction = `You are a helpful assistant for Orbit; your name is Đạt.
Help users manage tasks, provide productivity tips,
and answer questions about task organization, categories, priorities, and time management.
If user want to auto generate tasks, advise them to use the task generation mode.
Provide short, clear, concise, and friendly responses.`;

    const model = getAiModel();
    if (!model) throw new AppError(AI_ERROR.CONFIG_MISSING);

    const response = await callAiProvider(() =>
      ai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: sysInstruction },
          { role: "user", content: userInput },
        ],
      }),
    );

    const content = response.choices[0]?.message?.content;
    if (!content) throw new AppError(AI_ERROR.EMPTY_RESPONSE);

    return content;
  },

  async chatWithMcp(userInput: string, context: McpContext): Promise<string> {
    const ai = getAiClient();
    const model = getAiModel();
    if (!model) throw new AppError(AI_ERROR.CONFIG_MISSING);

    // Each request owns its server and authenticated user context.
    const server = createOrbitMcpServer(context);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const mcpClient = new Client(
      { name: "orbit-ai-agent", version: "1.0.0" },
      { capabilities: {} },
    );

    try {
      await server.connect(serverTransport);
      await mcpClient.connect(clientTransport);
      const { tools: mcpTools } = await mcpClient.listTools();
      const openAiTools: ChatCompletionTool[] = mcpTools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as Record<string, unknown>,
        },
      }));

      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are Orbit AI Assistant; your name is Đạt. You have access to user's tasks, projects, and categories via tools.
Always use tools when user asks for information about their tasks, categories, or projects.
Respond in a helpful, concise, and friendly manner in the user's language (default Vietnamese).`,
        },
        { role: "user", content: userInput },
      ];

      const MAX_STEPS = 5;
      for (let step = 0; step < MAX_STEPS; step++) {
        const response = await callAiProvider(() =>
          ai.chat.completions.create({
            model,
            messages,
            tools: openAiTools.length > 0 ? openAiTools : undefined,
            tool_choice: "auto",
          }),
        );

        const choice = response.choices[0];
        const message = choice?.message;
        if (!message) throw new AppError(AI_ERROR.EMPTY_RESPONSE);

        messages.push(message);

        if (!message.tool_calls || message.tool_calls.length === 0) {
          return message.content || "";
        }

        for (const toolCall of message.tool_calls) {
          if (toolCall.type === "function") {
            const args = toolCall.function.arguments
              ? JSON.parse(toolCall.function.arguments)
              : {};

            const toolResult = await mcpClient.callTool({
              name: toolCall.function.name,
              arguments: args,
            });

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });
          }
        }
      }

      throw new AppError(AI_ERROR.PROVIDER_ERROR, {
        cause: new Error("Exceeded maximum tool calling steps"),
      });
    } finally {
      await Promise.allSettled([mcpClient.close(), server.close()]);
    }
  },
};
