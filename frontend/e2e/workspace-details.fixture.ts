import type { Page } from "@playwright/test";
import { dashboardFixture } from "./dashboard.fixture";

export async function workspaceDetailsFixture(page: Page) {
  await dashboardFixture(page);
  const categories = [
    {
      _id: "health",
      name: "Health",
      description:
        "A little care, every day. Build habits that help you feel your best.",
    },
    {
      _id: "work",
      name: "Work",
      description: "Daily priorities and bigger plans, all in one place.",
    },
    {
      _id: "personal",
      name: "Personal",
      description: "Make time for what matters outside of work.",
    },
  ];
  let projects = [
    {
      _id: "website",
      name: "Website refresh",
      description: "A clearer, friendlier home for our next chapter.",
      color: "#6B8CA9",
      status: "active",
    },
    {
      _id: "studio",
      name: "Studio essentials",
      description: "Make space for your best work.",
      color: "#BB8A60",
      status: "active",
    },
    {
      _id: "finished",
      name: "Spring reset",
      description: "A fresh start, one small step at a time.",
      color: "#7C9A7F",
      status: "active",
    },
    {
      _id: "archived",
      name: "Last season",
      description: "Good work, wrapped up.",
      color: "#8C81A5",
      status: "completed",
    },
  ];
  const healthTitles = [
    "Morning strength training",
    "Book an annual checkup",
    "Take a walk after lunch",
    "Plan meals for the week",
    "Practice ten minutes of mindfulness",
    "Go for a swim",
    "Stretch before bed",
    "Try a new running route",
  ];
  let tasks = Array.from({ length: 125 }, (_, index) => ({
    _id: `detail-${index}`,
    title:
      index < 30
        ? `${healthTitles[index % healthTitles.length]}${index >= 8 ? ` · Week ${Math.floor(index / 8) + 1}` : ""}`
        : `Prepare the next design milestone ${index - 29}`,
    description: "Small, steady steps make a difference.",
    categoryId: categories[index < 30 ? 0 : 1],
    projectId: index < 12 ? projects[0] : index >= 120 ? projects[2] : null,
    status:
      index >= 120 || index < 13
        ? "completed"
        : index < 20
          ? "in-progress"
          : index < 28
            ? "pending"
            : index < 30
              ? "given-up"
              : "pending",
    priority: index % 3 === 0 ? "High" : index % 3 === 1 ? "Medium" : "Low",
    startDate: "2026-09-01T09:00:00.000Z",
    dueDate: "2026-09-25T09:00:00.000Z",
  }));
  const taskPages: number[] = [];
  await page.route("**/api/categories**", (route) =>
    route.fulfill({ json: categories }),
  );
  await page.route("**/api/projects**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const id = path.split("/")[3];
    if (method === "POST") {
      const item = {
        ...route.request().postDataJSON(),
        _id: "new-project",
        status: "active",
      };
      projects.push(item);
      return route.fulfill({ json: item });
    }
    if (method === "PUT" || method === "PATCH")
      projects = projects.map((p) =>
        p._id === id ? { ...p, ...route.request().postDataJSON() } : p,
      );
    if (method === "DELETE") projects = projects.filter((p) => p._id !== id);
    return route.fulfill({
      json: id ? projects.find((p) => p._id === id) || {} : projects,
    });
  });
  await page.route("**/api/tasks**", async (route) => {
    const url = new URL(route.request().url());
    const id = url.pathname.split("/")[3];
    const method = route.request().method();
    if (id) {
      if (method === "DELETE") tasks = tasks.filter((t) => t._id !== id);
      else if (method !== "GET")
        tasks = tasks.map((t) =>
          t._id === id
            ? {
                ...t,
                ...(route.request().postDataJSON() || {}),
                ...(url.pathname.endsWith("/finish")
                  ? { status: "completed" }
                  : url.pathname.endsWith("/start")
                    ? { status: "in-progress" }
                    : url.pathname.endsWith("/give-up")
                      ? { status: "given-up" }
                      : {}),
              }
            : t,
        );
      return route.fulfill({ json: tasks.find((t) => t._id === id) || {} });
    }
    const pageNo = Number(url.searchParams.get("pageNo") || 1);
    const pageSize = Number(url.searchParams.get("pageSize") || 10);
    taskPages.push(pageNo);
    await route.fulfill({
      json: {
        data: tasks.slice((pageNo - 1) * pageSize, pageNo * pageSize),
        pageInfo: {
          pageNo,
          pageSize,
          totalCount: tasks.length,
          totalPage: Math.ceil(tasks.length / pageSize),
        },
      },
    });
  });
  return { taskPages };
}
