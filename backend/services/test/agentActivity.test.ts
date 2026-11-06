import { describe, expect, it } from "vitest";
import {
  projectAgentActivity,
  projectProposalActivities,
  projectPersistedProposal,
  deduplicateActivities,
} from "../../utils/agentActivity.js";
import type { AgentActivity } from "../../types/IAgentActivity.js";

describe("agentActivity projection and allowlist adapter", () => {
  const requestId = "req-123";
  const toolCallId = "call-abc";
  const taskId = "672bb1c6e1a42b1234567890";

  it("projects confirmed orbit_create_task into a succeeded task_created activity", () => {
    const input = {
      toolName: "orbit_create_task",
      args: { title: "Read Chapter 1" },
      result: {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              task: { id: taskId, title: "Read Chapter 1" },
            }),
          },
        ],
        structuredContent: {
          task: { id: taskId, title: "Read Chapter 1" },
        },
      },
      requestId,
      toolCallId,
    };

    const activity = projectAgentActivity(input);
    expect(activity).toMatchObject({
      requestId,
      toolCallId,
      kind: "task_created",
      status: "succeeded",
      resourceType: "task",
      resourceId: taskId,
      title: "Read Chapter 1",
    });
    expect(activity?.id).toBeDefined();
    expect(activity?.occurredAt).toBeDefined();
  });

  it("projects confirmed orbit_update_task into a succeeded task_updated activity", () => {
    const input = {
      toolName: "orbit_update_task",
      args: { taskId, changes: { status: "completed" } },
      result: {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              task: {
                id: taskId,
                title: "Finish Homework",
                status: "completed",
              },
            }),
          },
        ],
        structuredContent: {
          task: { id: taskId, title: "Finish Homework", status: "completed" },
        },
      },
      requestId,
      toolCallId,
    };

    const activity = projectAgentActivity(input);
    expect(activity).toMatchObject({
      requestId,
      toolCallId,
      kind: "task_updated",
      status: "succeeded",
      resourceType: "task",
      resourceId: taskId,
      title: "Finish Homework",
    });
  });

  it("does not project proposals before they are persisted", () => {
    const input = {
      toolName: "propose_tasks",
      args: {
        items: [{ title: "Workout A" }, { title: "Workout B" }],
      },
      result: {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ status: "proposed", count: 2 }),
          },
        ],
      },
      requestId,
      toolCallId,
    };

    const activity = projectAgentActivity(input);
    expect(activity).toBeNull();
  });

  it("redacts internal traces and returns failed status on tool errors", () => {
    const input = {
      toolName: "orbit_create_task",
      args: { title: "Buggy task" },
      result: {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: {
                code: "INTERNAL_ERROR",
                message:
                  "Database connection failed at Mongoose.connect (/app/backend/server.ts:42)",
              },
            }),
          },
        ],
      },
      requestId,
      toolCallId,
    };

    const activity = projectAgentActivity(input);
    expect(activity).toMatchObject({
      kind: "task_created",
      status: "failed",
      title: "Buggy task",
    });
    expect(activity?.resourceId).toBeUndefined();
    // Raw traceback / error text must not leak
    expect(JSON.stringify(activity)).not.toContain(
      "Database connection failed",
    );
    expect(JSON.stringify(activity)).not.toContain("Mongoose.connect");
  });

  it("projects unknown write outcome as status unknown and not succeeded", () => {
    const input = {
      toolName: "orbit_create_task",
      args: { title: "Uncertain task" },
      result: {
        outcome: "unknown",
      },
      requestId,
      toolCallId,
    };

    const activity = projectAgentActivity(input);
    expect(activity?.status).toBe("unknown");
    expect(activity?.status).not.toBe("succeeded");
    expect(activity?.resourceId).toBeUndefined();
  });

  it("does not treat the requested task ID as proof of an update", () => {
    for (const result of [
      undefined,
      { content: [] },
      { content: [{ type: "text", text: "invalid" }] },
      { outcome: "unknown" },
    ]) {
      const activity = projectAgentActivity({
        toolName: "orbit_update_task",
        args: { taskId },
        result,
        requestId,
        toolCallId,
      });
      expect(activity?.status).toBe("unknown");
      expect(activity?.resourceId).toBeUndefined();
    }
  });

  it("returns null for read-only tools and skill loads", () => {
    expect(
      projectAgentActivity({
        toolName: "orbit_list_tasks",
        args: {},
        result: { content: [] },
        requestId,
        toolCallId,
      }),
    ).toBeNull();

    expect(
      projectAgentActivity({
        toolName: "orbit_get_me",
        args: {},
        result: { content: [] },
        requestId,
        toolCallId,
      }),
    ).toBeNull();

    expect(
      projectAgentActivity({
        toolName: "load_skill",
        args: { skillId: "gym" },
        result: { content: [] },
        requestId,
        toolCallId,
      }),
    ).toBeNull();
  });

  it("projects proposal confirm committed tasks into activities", () => {
    const proposalAction = {
      requestId: "action-req-1",
      proposalId: "prop-1",
      createdTasks: [
        { itemId: "item-1", taskId: "task-1", title: "Task 1" },
        { itemId: "item-2", taskId: "task-2", title: "Task 2" },
      ],
    };

    const activities = projectProposalActivities(proposalAction);
    expect(activities).toHaveLength(2);
    expect(activities[0]).toMatchObject({
      requestId: "action-req-1",
      kind: "task_created",
      status: "succeeded",
      resourceType: "task",
      resourceId: "task-1",
      title: "Task 1",
    });
    expect(activities[1]).toMatchObject({
      requestId: "action-req-1",
      kind: "task_created",
      status: "succeeded",
      resourceType: "task",
      resourceId: "task-2",
      title: "Task 2",
    });
  });

  it("deduplicates activities by unique id", () => {
    const act: AgentActivity = {
      id: "dup-id",
      requestId,
      toolCallId,
      kind: "task_created",
      status: "succeeded",
      title: "Duplicate",
      resourceType: "task",
      resourceId: taskId,
      occurredAt: "2026-11-06T00:00:00.000Z",
    };

    const deduped = deduplicateActivities([act, { ...act }, act]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe("dup-id");
  });
});

it("reconstructs committed proposal results deterministically without a projection write", () => {
  const committed = {
    proposalId: "proposal-1",
    createdRequestId: "action-1",
    createdAt: new Date("2026-11-06T00:00:00Z"),
    updatedAt: new Date("2026-11-06T00:01:00Z"),
    createdTasks: [
      {
        itemId: "item-1",
        taskId: "672bb1c6e1a42b1234567890",
        title: "Committed",
      },
    ],
  };
  const result = projectPersistedProposal(committed);
  expect(result).toHaveLength(2);
  expect(result[1]).toMatchObject({
    requestId: "action-1",
    status: "succeeded",
    title: "Committed",
  });
  expect(projectPersistedProposal(committed)).toEqual(result);
});

it("requires a verified deletion marker for task_deleted", () => {
  const base = {
    toolName: "orbit_delete_task",
    requestId: "req",
    toolCallId: "call",
  };
  const task = { id: "507f1f77bcf86cd799439011", title: "Deleted task" };
  expect(
    projectAgentActivity({
      ...base,
      result: { structuredContent: { task, deleted: true } },
    }),
  ).toMatchObject({
    kind: "task_deleted",
    status: "succeeded",
    title: "Deleted task",
  });
  expect(
    projectAgentActivity({ ...base, result: { structuredContent: { task } } }),
  ).toMatchObject({ kind: "task_deleted", status: "unknown" });
});
