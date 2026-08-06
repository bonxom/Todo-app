import { z } from 'zod';
import mongoose from 'mongoose';
import { getAiClient } from '../libs/aiClient.js';
import { getAiModel } from '../config/env.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { statService } from './statService.js';
import { normalizeTaskDateInput } from '../utils/dateTime.js';

export const aiService = {
  async generateTasks(
    userRequirement: string,
    userId: mongoose.Types.ObjectId | string
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
      priority: z.enum(['Low', 'Medium', 'High']).optional(),
      categoryName: z.string().optional().nullable(),
      dueDate: z.string().optional(),
    });

    const tasksArraySchema = z.array(taskSchema).length(3);

    const today = new Date().toISOString().split('T')[0];
    const prompt = `Generate EXACTLY 3 tasks (as an array) based on the following user requirement: "${userRequirement}".

Available categories (choose ONE of these EXACT names for each task or pick the "Uncategorized" category if none fit):
${categories.map((c) => `- "${c.name}"`).join('\n')}

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
    if (!model) throw new Error('Missing required environment variable: AI_MODEL_NAME');

    const rawSchema = tasksArraySchema.toJSONSchema();
    const { $schema, ...jsonSchema } = rawSchema;

    const response = await ai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You must respond with a JSON array of exactly 3 task objects. Follow this JSON Schema:\n${JSON.stringify(jsonSchema, null, 2)}`,
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');

    const generatedTasks = tasksArraySchema.parse(JSON.parse(content));

    const savedTasks: unknown[] = [];

    for (const generatedTask of generatedTasks) {
      let categoryId: string | null = null;
      if (generatedTask.categoryName) {
        if (categoryMap[generatedTask.categoryName]) {
          categoryId = categoryMap[generatedTask.categoryName];
        } else {
          const lower = generatedTask.categoryName.toLowerCase();
          const matched = categories.find((c) => c.name.toLowerCase() === lower);
          if (matched) {
            categoryId = matched._id.toString();
          } else if (categoryMap['Uncategorized']) {
            categoryId = categoryMap['Uncategorized'];
          }
        }
      }

      const dueDateUpdate = normalizeTaskDateInput(generatedTask.dueDate);
      if (dueDateUpdate.error) continue;

      const task = await taskRepository.create({
        title: generatedTask.title,
        description: generatedTask.description || '',
        priority: generatedTask.priority || 'Medium',
        status: 'pending',
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

    const sysInstruction = `You are a helpful assistant for a TodoApp your name is Đạt.
Help users manage tasks, provide productivity tips,
and answer questions about task organization, categories, priorities, and time management.
If user want to auto generate tasks, advise them to use the task generation mode.
Provide short, clear, concise, and friendly responses.`;

    const model = getAiModel();
    if (!model) throw new Error('Missing required environment variable: AI_MODEL_NAME');

    const response = await ai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: sysInstruction },
        { role: 'user', content: userInput },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');

    return content;
  },
};
