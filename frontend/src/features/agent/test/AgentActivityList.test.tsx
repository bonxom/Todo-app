import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AgentActivityList } from "../AgentActivityList";
it("shows a deletion receipt without offering to open the removed task", () => {
  render(
    <AgentActivityList
      activities={[
        {
          id: "receipt",
          requestId: "request",
          toolCallId: "call",
          kind: "task_deleted",
          status: "succeeded",
          title: "Old task",
          resourceType: "task",
          resourceId: "task-id",
          occurredAt: new Date().toISOString(),
        },
      ]}
    />,
  );
  expect(screen.getByText("Task deleted")).toBeInTheDocument();
  expect(screen.getByText("Old task")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "View details" }),
  ).not.toBeInTheDocument();
});
