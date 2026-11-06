import { createHash } from "node:crypto";
import type {
  AgentActivity,
  AgentActivityKind,
  AgentActivityStatus,
} from "../types/IAgentActivity.js";

export function generateActivityId(
  requestId: string,
  toolCallId: string,
  kind: AgentActivityKind,
  resourceId?: string,
): string {
  const payload = `${requestId}:${toolCallId}:${kind}:${resourceId || "none"}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

export interface ProjectToolActivityInput {
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  requestId: string;
  toolCallId: string;
  occurredAt?: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function projectAgentActivity(
  input: ProjectToolActivityInput,
): AgentActivity | null {
  const { toolName, requestId, toolCallId } = input;
  if (toolName !== "orbit_create_task" && toolName !== "orbit_update_task")
    return null;
  const kind: AgentActivityKind =
    toolName === "orbit_create_task" ? "task_created" : "task_updated";
  const result = record(input.result);
  let task = record(record(result?.structuredContent)?.task);
  if (!task && Array.isArray(result?.content)) {
    for (const item of result.content) {
      const content = record(item);
      if (content?.type !== "text" || typeof content.text !== "string")
        continue;
      try {
        task = record(record(JSON.parse(content.text))?.task);
      } catch {
        /* Not a task result. */
      }
      if (task) break;
    }
  }
  const taskId =
    typeof task?.id === "string" && /^[a-f0-9]{24}$/i.test(task.id)
      ? task.id
      : undefined;
  const status: AgentActivityStatus =
    result?.outcome === "unknown"
      ? "unknown"
      : result?.isError === true
        ? "failed"
        : taskId
          ? "succeeded"
          : "unknown";
  const resourceId = status === "succeeded" ? taskId : undefined;
  const title =
    status === "succeeded" && typeof task?.title === "string"
      ? task.title
      : toolName === "orbit_create_task" &&
          typeof input.args?.title === "string"
        ? input.args.title
        : toolName === "orbit_create_task"
          ? "Tạo công việc"
          : "Cập nhật công việc";
  return {
    id: generateActivityId(requestId, toolCallId, kind, resourceId),
    requestId,
    toolCallId,
    kind,
    status,
    title,
    resourceType: "task",
    ...(resourceId ? { resourceId } : {}),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}

export function projectProposalActivities(input: {
  requestId: string;
  proposalId: string;
  createdTasks: Array<{ itemId: string; taskId: string; title: string }>;
  occurredAt?: string;
}): AgentActivity[] {
  const { requestId, createdTasks } = input;
  const occurredAt = input.occurredAt || new Date().toISOString();

  return createdTasks.map((t) => {
    const kind: AgentActivityKind = "task_created";
    const id = generateActivityId(requestId, t.itemId, kind, t.taskId);
    return {
      id,
      requestId,
      toolCallId: t.itemId,
      kind,
      status: "succeeded",
      title: t.title,
      resourceType: "task",
      resourceId: t.taskId,
      occurredAt,
    };
  });
}

export function deduplicateActivities(
  activities: AgentActivity[],
): AgentActivity[] {
  const seen = new Set<string>();
  const deduped: AgentActivity[] = [];
  for (const act of activities) {
    if (!seen.has(act.id)) {
      seen.add(act.id);
      deduped.push(act);
    }
  }
  return deduped;
}

// Proposal records are the durable source of truth. No second best-effort write
// can lose a committed result or poison the business transaction.
export function projectPersistedProposal(proposal: {
  proposalId: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdRequestId?: string;
  createdTasks: Array<{ itemId: string; taskId: string; title: string }>;
}): AgentActivity[] {
  const occurredAt = (proposal.createdAt ?? new Date(0)).toISOString();
  return [
    {
      id: generateActivityId(
        proposal.proposalId,
        proposal.proposalId,
        "proposal_created",
        proposal.proposalId,
      ),
      requestId: proposal.proposalId,
      toolCallId: proposal.proposalId,
      kind: "proposal_created",
      status: "succeeded",
      title: "Đề xuất công việc",
      resourceType: "proposal",
      resourceId: proposal.proposalId,
      occurredAt,
    },
    ...projectProposalActivities({
      requestId: proposal.createdRequestId ?? proposal.proposalId,
      proposalId: proposal.proposalId,
      createdTasks: proposal.createdTasks ?? [],
      occurredAt: (
        proposal.updatedAt ??
        proposal.createdAt ??
        new Date(0)
      ).toISOString(),
    }),
  ];
}
