import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { taskKeys } from "../taskKeys";
import { projectKeys } from "../projectKeys";
import { categoryKeys } from "@/features/categories/api/categoryKeys";
import { statKeys } from "@/features/statistics/api/statKeys";
import { userKeys } from "@/features/profile/api/userKeys";
import { invalidateTaskDependents, invalidateWorkspaceQueries } from "../invalidation";

describe("invalidation helpers", () => {
  it("invalidates task dependents without invalidating current user", async () => {
    const client = new QueryClient();
    client.setQueryData(taskKeys.list({}), []);
    client.setQueryData(projectKeys.list(), []);
    client.setQueryData(categoryKeys.list(), []);
    client.setQueryData(statKeys.all, {});
    client.setQueryData(userKeys.current(), { name: "Me" });

    await invalidateTaskDependents(client);

    // Tasks, projects, stats should be invalidated (state.isInvalidated === true)
    const taskQuery = client.getQueryCache().find({ queryKey: taskKeys.list({}) });
    const userQuery = client.getQueryCache().find({ queryKey: userKeys.current() });

    expect(taskQuery?.state.isInvalidated).toBe(true);
    expect(userQuery?.state.isInvalidated).toBe(false);
  });

  it("invalidates all workspace queries on invalidateWorkspaceQueries", async () => {
    const client = new QueryClient();
    client.setQueryData(taskKeys.list({}), []);
    client.setQueryData(categoryKeys.list(), []);

    await invalidateWorkspaceQueries(client);

    const taskQuery = client.getQueryCache().find({ queryKey: taskKeys.list({}) });
    const catQuery = client.getQueryCache().find({ queryKey: categoryKeys.list() });

    expect(taskQuery?.state.isInvalidated).toBe(true);
    expect(catQuery?.state.isInvalidated).toBe(true);
  });
});
