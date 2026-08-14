import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { taskKeys } from "./taskKeys";
import { projectKeys } from "./projectKeys";
import { categoryKeys } from "../../categories/api/categoryKeys";
import { statKeys } from "../../statistics/api/statKeys";
import { userKeys } from "../../profile/api/userKeys";
import { invalidateTaskDependents, invalidateWorkspaceQueries } from "./invalidation";

describe("invalidation helpers", () => {
  it("invalidates task dependents without invalidating current user", async () => {
    const client = new QueryClient();
    client.setQueryData(taskKeys.list({}), []);
    client.setQueryData(projectKeys.list(), []);
    client.setQueryData(categoryKeys.list(), []);
    client.setQueryData(statKeys.summary(), { totalTasks: 0 });
    client.setQueryData(userKeys.me(), { email: "a@example.com", name: "A", role: "USER" });

    await invalidateTaskDependents(client);

    expect(client.getQueryState(taskKeys.list({}))?.isInvalidated).toBe(true);
    expect(client.getQueryState(projectKeys.list())?.isInvalidated).toBe(true);
    expect(client.getQueryState(categoryKeys.list())?.isInvalidated).toBe(true);
    expect(client.getQueryState(statKeys.summary())?.isInvalidated).toBe(true);
    expect(client.getQueryState(userKeys.me())?.isInvalidated).toBe(false);
  });

  it("invalidateWorkspaceQueries invalidates task, project, category, and stat roots", async () => {
    const client = new QueryClient();
    client.setQueryData(taskKeys.list({}), []);
    client.setQueryData(projectKeys.list(), []);
    client.setQueryData(categoryKeys.list(), []);
    client.setQueryData(statKeys.summary(), { totalTasks: 0 });

    await invalidateWorkspaceQueries(client);

    expect(client.getQueryState(taskKeys.list({}))?.isInvalidated).toBe(true);
    expect(client.getQueryState(projectKeys.list())?.isInvalidated).toBe(true);
    expect(client.getQueryState(categoryKeys.list())?.isInvalidated).toBe(true);
    expect(client.getQueryState(statKeys.summary())?.isInvalidated).toBe(true);
  });
});
