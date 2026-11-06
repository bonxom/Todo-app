export type AgentActivityKind =
  "task_created" | "task_updated" | "task_deleted" | "proposal_created";

export type AgentActivityStatus = "succeeded" | "failed" | "unknown";

export interface AgentActivity {
  id: string;
  requestId: string;
  toolCallId: string;
  kind: AgentActivityKind;
  status: AgentActivityStatus;
  title: string;
  resourceType?: "task" | "proposal";
  resourceId?: string;
  occurredAt: string;
}
