import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions.js";
import { createTaskInputSchema, updateTaskInputSchema } from "../mcp/schemas.js";
import type { McpContext } from "../mcp/context.js";
import { taskService } from "./taskService.js";
import { categoryService } from "./categoryService.js";
import { projectService } from "./projectService.js";
import { getStartOfToday } from "../utils/dateTime.js";

export type AgentMode = "auto" | "ask";
export type AgentInteraction = {
  id: string; kind: "clarification" | "confirmation"; question: string;
  options: { id: string; label: string; description?: string }[];
  allowCustomAnswer: boolean; status: "pending" | "answered" | "cancelled";
  toolCallId: string; details?: { label: string; value: string }[];
  answer?: { optionId?: string; customAnswer?: string }; answerRequestId?: string;
  answerAction?: "answer" | "cancel";
  approval?: { toolName: string; args: Record<string, unknown>; fingerprint: string; previewFingerprint: string };
};
export const grillUserSchema = z.strictObject({
  question: z.string().trim().min(1).max(1000),
  options: z.array(z.strictObject({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/), label: z.string().trim().min(1).max(200), description: z.string().max(500).optional() })).min(2).max(4).refine(v => new Set(v.map(o => o.id)).size === v.length, "Option IDs must be unique"),
  allowCustomAnswer: z.boolean().default(false),
});
export const grillUserTool: ChatCompletionTool = { type: "function", function: {
  name: "grill_user", description: "Pause and ask the user to select a direction or clarify missing information. This never grants permission to change data.", parameters: grillUserSchema.toJSONSchema(),
} };
export const READ_TOOLS = new Set(["orbit_get_me", "orbit_list_tasks", "orbit_get_task", "orbit_list_projects", "orbit_list_categories"]);
export const WRITE_TOOLS = new Set(["orbit_create_task", "orbit_update_task"]);
const canonical = (value: unknown): string => {
  if (value && typeof value === "object" && !Array.isArray(value)) return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => [k, JSON.parse(canonical(v))])));
  return JSON.stringify(value);
};
export const fingerprint = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export function publicInteraction(i: AgentInteraction) {
  const { id, kind, question, options, allowCustomAnswer, status, details, answer } = i;
  return { id, kind, question, options, allowCustomAnswer, status, details, answer };
}
export function clarification(raw: unknown, toolCallId: string): AgentInteraction {
  return { ...grillUserSchema.parse(raw), id: randomUUID(), kind: "clarification", status: "pending", toolCallId };
}
export function pendingCalls(messages: ChatCompletionMessageParam[]) {
  const answered = new Set(messages.filter(m => m.role === "tool").map(m => m.tool_call_id));
  return messages.flatMap(m => m.role === "assistant" ? (m.tool_calls ?? []) : []).filter(c => !answered.has(c.id));
}
export function closePendingCalls(messages: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
  return [...messages, ...pendingCalls(messages).map(c => ({ role: "tool" as const, tool_call_id: c.id, content: JSON.stringify({ cancelled: true, skipped: true }) }))];
}

// Resolve references with authenticated reads and freeze defaults before displaying approval.
export async function confirmation(toolName: string, raw: unknown, toolCallId: string, context: McpContext): Promise<AgentInteraction> {
  if (context.user.role !== "USER" || !context.scopes?.includes("tasks:write")) throw new Error("Write permission is required");
  const creating = toolName === "orbit_create_task";
  const args = (creating ? createTaskInputSchema : updateTaskInputSchema).parse(raw) as Record<string, unknown>;
  const fields = creating ? args : args.changes as Record<string, unknown>;
  const categories = await categoryService.getAll(context.user);
  if (creating) {
    fields.description ??= "";
    fields.priority ??= "Medium";
    fields.projectId ??= null;
    if (fields.startDate === undefined) fields.startDate = getStartOfToday().toISOString();
    if (fields.dueDate === undefined) fields.dueDate = null;
    if (fields.categoryId === undefined) fields.categoryId = String(categories.find(c => c.name === "Uncategorized")?._id ?? "");
  }
  const details: {label: string; value: string}[] = [];
  let taskSnapshot: unknown = null;
  if (!creating) {
    const task = await taskService.getById(String(args.taskId), context.user);
    taskSnapshot = JSON.parse(JSON.stringify(task));
    details.push({label: "Công việc", value: `${task.title} (${args.taskId})`});
  }
  const referenceState: unknown[] = [];
  for (const [key, value] of Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))) {
    if (key === "idempotencyKey") continue;
    let display = value === null ? "Không có / xóa giá trị" : String(value);
    if (key === "categoryId") {
      const category = categories.find(c => String(c._id) === value);
      if (!category) throw new Error("Category not found or not accessible");
      display = `${category.name} (${value})`;
      referenceState.push({id: value, name: category.name});
    }
    if (key === "projectId" && value !== null) {
      const project = (await projectService.getAll(context.user)).find(p => String(p._id) === value);
      if (!project) throw new Error("Project not found or not accessible");
      display = `${project.name} (${value})`;
      referenceState.push({id: value, name: project.name, status: project.status});
    }
    const labels: Record<string, string> = { title: "Tiêu đề", description: "Mô tả", priority: "Độ ưu tiên", categoryId: "Danh mục", projectId: "Dự án", startDate: "Ngày bắt đầu", dueDate: "Hạn hoàn thành", status: "Trạng thái" };
    details.push({ label: labels[key] ?? key, value: display });
  }
  if (creating) details.push({ label: "Trạng thái", value: "pending" });
  return {
    id: randomUUID(), kind: "confirmation", toolCallId, status: "pending",
    question: creating ? "Xác nhận tạo công việc với các thông tin sau?" : "Xác nhận thay đổi công việc sau?",
    options: [{id: "confirm", label: "Xác nhận"}, {id: "cancel", label: "Hủy"}], allowCustomAnswer: false, details,
    approval: { toolName, args, fingerprint: fingerprint({toolName, args}), previewFingerprint: fingerprint({taskSnapshot, referenceState, details}) },
  };
}
