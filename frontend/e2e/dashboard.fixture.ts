import type { Page } from "@playwright/test";

export async function dashboardFixture(
  page: Page,
  empty = false,
  manyTasks = false,
) {
  const user = {
    _id: "dashboard-user",
    name: "Alex Morgan",
    email: "alex@example.com",
    role: "USER",
  };
  const projects = [
    {
      _id: "website",
      name: "Website refresh",
      description: "A fresh home for our next chapter.",
      color: "#6c8060",
      status: "active",
    },
    {
      _id: "studio",
      name: "Studio essentials",
      description: "Make space for your best work.",
      color: "#bb8a60",
      status: "active",
    },
    {
      _id: "personal",
      name: "Personal growth",
      description: "Small steps, meaningful progress.",
      color: "#8c81a5",
      status: "active",
    },
  ];
  const date = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString();
  };
  let tasks = empty
    ? []
    : [
        {
          _id: "1",
          title: "Explore directions for the homepage",
          description:
            "Pull together references, colors, and a few early ideas.",
          status: "in-progress",
          priority: "High",
          projectId: projects[0],
          dueDate: date(0),
        },
        {
          _id: "2",
          title: "Send the first round of design feedback",
          description: "Keep it clear, kind, and actionable.",
          status: "in-progress",
          priority: "High",
          projectId: projects[0],
          dueDate: date(0),
        },
        {
          _id: "3",
          title: "Plan next week’s studio priorities",
          description: "A little planning now goes a long way.",
          status: "pending",
          priority: "Medium",
          projectId: projects[1],
          dueDate: date(1),
        },
        {
          _id: "4",
          title: "Read a chapter of Creative Confidence",
          description: "Twenty minutes, just for you.",
          status: "in-progress",
          priority: "Low",
          projectId: projects[2],
          dueDate: date(1),
        },
        {
          _id: "5",
          title: "Organize the shared asset library",
          description: "Give every good idea a place to live.",
          status: "in-progress",
          priority: "Medium",
          projectId: projects[1],
          dueDate: date(3),
        },
        {
          _id: "6",
          title: "Book a coffee with Jamie",
          description: "",
          status: "pending",
          priority: "Low",
          projectId: null,
          dueDate: date(4),
        },
        {
          _id: "7",
          title: "Write the project kickoff notes",
          description: "The starting point for something good.",
          status: "completed",
          priority: "Medium",
          projectId: projects[0],
          dueDate: date(-1),
        },
      ].map((t) => ({
        ...t,
        startDate: date(-3),
        categoryId: { _id: "work", name: "Work" },
      }));
  if (manyTasks)
    tasks = [
      ...tasks,
      ...Array.from({ length: 12 }, (_, index) => ({
        ...tasks[0],
        _id: `extra-${index}`,
        title: `Follow-up task ${index + 1}`,
      })),
    ];
  await page.addInitScript((u) => {
    localStorage.setItem("token", "dashboard-test-token");
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("orbit-theme", "light");
  }, user);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (!path.startsWith("/api/")) return route.continue();
    let body: unknown = {};
    if (path.includes("/auth/me")) body = user;
    else if (path === "/api/tasks" && route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      const task = {
        ...payload,
        _id: String(Date.now()),
        projectId: projects.find((p) => p._id === payload.projectId) || null,
      };
      tasks = [...tasks, task];
      body = task;
    } else if (path.startsWith("/api/tasks/")) {
      const id = path.split("/")[3];
      if (route.request().method() === "DELETE")
        tasks = tasks.filter((t) => t._id !== id);
      else
        tasks = tasks.map((t) =>
          t._id === id
            ? {
                ...t,
                ...(route.request().postDataJSON() || {}),
                ...(path.endsWith("/finish")
                  ? { status: "completed" }
                  : path.endsWith("/start")
                    ? { status: "in-progress" }
                    : path.endsWith("/give-up")
                      ? { status: "given-up" }
                      : {}),
              }
            : t,
        );
      body = tasks.find((t) => t._id === id) || {};
    } else if (path === "/api/tasks") {
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const status = url.searchParams.get("status");
      const project = url.searchParams.get("projectId");
      const filtered = tasks.filter(
        (t) =>
          (!search ||
            `${t.title} ${t.description}`.toLowerCase().includes(search)) &&
          (!status || t.status === status) &&
          (!project ||
            (project === "standalone"
              ? !t.projectId
              : t.projectId?._id === project)),
      );
      if (url.searchParams.get("sort") === "title:asc")
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      const pageNo = Number(url.searchParams.get("pageNo") || 1),
        pageSize = Number(url.searchParams.get("pageSize") || 10);
      body = {
        data: filtered.slice((pageNo - 1) * pageSize, pageNo * pageSize),
        pageInfo: {
          pageNo,
          pageSize,
          totalCount: filtered.length,
          totalPage: Math.ceil(filtered.length / pageSize),
        },
      };
    } else if (path.startsWith("/api/projects"))
      body = empty
        ? []
        : projects.map((p) => {
            const list = tasks.filter((t) => t.projectId?._id === p._id),
              done = list.filter((t) => t.status === "completed").length;
            return {
              ...p,
              summary: {
                totalTasks: list.length,
                completedTasks: done,
                completionRate: list.length ? (done / list.length) * 100 : 0,
                canComplete: list.length > 0 && done === list.length,
              },
            };
          });
    else if (path.startsWith("/api/categories"))
      body = [{ _id: "work", name: "Work" }];
    else if (path.startsWith("/api/stats"))
      body = {
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "completed").length,
        inProgressTasks: tasks.filter((t) => t.status === "in-progress").length,
        pendingTasks: tasks.filter((t) => t.status === "pending").length,
        givenUpTasks: 0,
        dailyStats: [],
      };
    await route.fulfill({ json: body });
  });
}
