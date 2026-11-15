import type { Page, Route } from "@playwright/test";

export interface InstallV2FixtureOptions {
  authenticated?: boolean;
  preferredVersion?: "v1" | "v2";
  theme?: "light" | "dark";
  language?: "en" | "vi";
  scenario?: "populated" | "empty" | "tasks-error" | "stats-error";
}

export async function installV2Fixture(
  page: Page,
  options: InstallV2FixtureOptions = {},
): Promise<void> {
  const {
    authenticated = true,
    preferredVersion = "v1",
    theme = "light",
    language = "en",
    scenario = "populated",
  } = options;

  let currentUser = authenticated
    ? {
        _id: "507f1f77bcf86cd799439000",
        id: "507f1f77bcf86cd799439000",
        name: "Test User",
        email: "test@example.com",
        role: "USER",
      }
    : null;

  const project = {
    _id: "507f1f77bcf86cd799439090",
    id: "507f1f77bcf86cd799439090",
    name: "Orbit V2 Core",
    description: "V2 Liquid Glass",
    color: "#126b78",
    status: "active",
  };

  const category = {
    _id: "507f1f77bcf86cd799439091",
    id: "507f1f77bcf86cd799439091",
    name: "Engineering",
  };

  const tasks =
    scenario === "empty"
      ? []
      : Array.from({ length: 15 }, (_, i) => {
          const num = i + 1;
          const status =
            num <= 3 ? "completed" : num <= 6 ? "in-progress" : "pending";

          return {
            _id: `507f1f77bcf86cd7994390${num.toString().padStart(2, "0")}`,
            id: `507f1f77bcf86cd7994390${num.toString().padStart(2, "0")}`,
            title: `Task Item ${num}`,
            description: `Description for task item ${num}`,
            status,
            priority: num % 2 === 0 ? "High" : "Medium",
            categoryId: category,
            projectId: project,
            startDate: "2026-11-14T08:00:00.000Z",
            dueDate: "2026-11-20T18:00:00.000Z",
          };
        });

  // Storage initialization
  await page.addInitScript(
    ({ auth, user, version, th, lang }) => {
      localStorage.clear();
      if (auth && user) {
        localStorage.setItem("token", "valid-v2-token");
        localStorage.setItem("user", JSON.stringify(user));
      }
      localStorage.setItem("orbit.ui-version", version);
      localStorage.setItem("orbit-theme", th);
      localStorage.setItem("orbit.language", lang);
    },
    {
      auth: authenticated,
      user: currentUser,
      version: preferredVersion,
      th: theme,
      lang: language,
    },
  );

  // Network routing
  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (!path.startsWith("/api/")) {
      return route.continue();
    }

    // Authentication endpoints
    if (path === "/api/auth/me") {
      if (!currentUser) {
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ message: "Unauthorized" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(currentUser),
      });
    }

    if (path === "/api/auth/login" || path === "/api/auth/register") {
      currentUser = {
        _id: "507f1f77bcf86cd799439000",
        id: "507f1f77bcf86cd799439000",
        name: "Test User",
        email: "test@example.com",
        role: "USER",
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "valid-v2-token",
          accessToken: "valid-v2-token",
          refreshToken: "valid-refresh-token",
          user: currentUser,
        }),
      });
    }

    if (path === "/api/auth/logout") {
      currentUser = null;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Logged out" }),
      });
    }

    // Agent / AI fallback
    if (path.startsWith("/api/ai/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          capabilities: { taskProposals: false },
        }),
      });
    }

    // Notifications
    if (path.startsWith("/api/notifications")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], unreadCount: 0 }),
      });
    }
    // Projects
    if (path.startsWith("/api/projects")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            ...project,
            summary: {
              totalTasks: tasks.length,
              completedTasks: tasks.filter((t) => t.status === "completed")
                .length,
              completionRate: 50,
              canComplete: false,
            },
          },
        ]),
      });
    }

    // Categories
    if (path.startsWith("/api/categories")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([category]),
      });
    }

    // Statistics
    if (path.startsWith("/api/stats")) {
      if (scenario === "stats-error") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal server error on stats" }),
        });
      }

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (t) => t.status === "completed",
      ).length;
      const inProgressTasks = tasks.filter(
        (t) => t.status === "in-progress",
      ).length;
      const pendingTasks = tasks.filter((t) => t.status === "pending").length;

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          givenUpTasks: 0,
          dailyStats: [],
        }),
      });
    }

    if (path.startsWith("/api/tasks/today-deadlines")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pageInfo: { pageNo: 1, pageSize: 10, totalCount: 0, totalPage: 0 },
        }),
      });
    }

    // Tasks Mutations: start / finish
    if (path.endsWith("/start") && method === "PATCH") {
      const parts = path.split("/");
      const id = parts[parts.length - 2];
      const task = tasks.find((t) => t._id === id);
      if (task) {
        task.status = "in-progress";
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(task),
        });
      }
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Task not found" }),
      });
    }

    if (path.endsWith("/finish") && method === "PATCH") {
      const parts = path.split("/");
      const id = parts[parts.length - 2];
      const task = tasks.find((t) => t._id === id);
      if (task) {
        task.status = "completed";
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(task),
        });
      }
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Task not found" }),
      });
    }

    // Native V2 creation and editing use the same backend contracts.
    if (path === "/api/tasks" && method === "POST") {
      const payload = request.postDataJSON();
      const id = `507f1f77bcf86cd799439${(tasks.length + 100).toString().padStart(3, "0")}`;
      const created = {
        _id: id,
        id,
        description: "",
        priority: "Medium",
        startDate: "",
        dueDate: "",
        ...payload,
        status: "pending",
        categoryId: category,
        projectId: payload.projectId ? project : null,
      };
      tasks.unshift(created);
      return route.fulfill({ status: 201, json: created });
    }
    if (path.startsWith("/api/tasks/") && method === "PUT") {
      const task = tasks.find((item) => item._id === path.split("/")[3]);
      if (!task)
        return route.fulfill({
          status: 404,
          json: { message: "Task not found" },
        });
      Object.assign(task, request.postDataJSON());
      return route.fulfill({ json: task });
    }

    // Single Task Detail
    if (path.startsWith("/api/tasks/") && method === "GET") {
      const id = path.split("/")[3];
      const task = tasks.find((t) => t._id === id);
      if (task) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(task),
        });
      }
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "Task not found" }),
      });
    }

    // Task List Query
    if (path === "/api/tasks" && method === "GET") {
      if (scenario === "tasks-error") {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal server error on tasks" }),
        });
      }

      const search = (url.searchParams.get("search") || "")
        .toLowerCase()
        .trim();
      const status = url.searchParams.get("status");
      const pageNo = parseInt(url.searchParams.get("pageNo") || "1", 10);
      const pageSize = parseInt(url.searchParams.get("pageSize") || "10", 10);

      const filtered = tasks.filter((t) => {
        const matchesSearch =
          !search ||
          t.title.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search);
        const matchesStatus = !status || t.status === status;
        return matchesSearch && matchesStatus;
      });

      const totalCount = filtered.length;
      const totalPage = Math.ceil(totalCount / pageSize);
      const start = (pageNo - 1) * pageSize;
      const paginatedData = filtered.slice(start, start + pageSize);

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: paginatedData,
          pageInfo: {
            pageNo,
            pageSize,
            totalCount,
            totalPage,
          },
        }),
      });
    }

    // Default: pass through or 404
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: `Unhandled route: ${method} ${path}` }),
    });
  });
}
