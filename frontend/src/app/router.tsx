import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { RootGuard, PublicOnlyGuard, ProtectedGuard } from "./routeGuards";
import ErrorPage from "../features/errors/ErrorPage";
import { landingRoutes } from "../features/landing/routes";
import { authRoutes } from "../features/auth/routes";
import { notificationRoutes } from "../features/notifications/routes";
import { taskRoutes } from "../features/tasks/routes";
import { categoryRoutes } from "../features/categories/routes";
import { calendarRoutes } from "../features/calendar/routes";
import { statisticsRoutes } from "../features/statistics/routes";
import { settingsRoutes } from "../features/settings/routes";
import { errorRoutes } from "../features/errors/routes";
import { v2Routes } from "../features/v2/routes";

export const routes: RouteObject[] = [
  {
    path: "/ui-demo",
    lazy: async () => ({
      Component: (await import("../features/ui-demo/OrbitDemo")).default,
    }),
  },
  {
    element: <RootGuard />,
    errorElement: <ErrorPage code="500" />,
    children: [...landingRoutes],
  },
  {
    element: <PublicOnlyGuard />,
    errorElement: <ErrorPage code="500" />,
    children: [...authRoutes],
  },
  {
    element: <ProtectedGuard />,
    errorElement: <ErrorPage code="500" />,
    children: [
      {
        // Code splitting: isolate V1 presentation from initial V2 bundle
        lazy: async () => ({
          Component: (await import("./V1RouteLayout")).default,
        }),
        children: [
          ...taskRoutes,
          ...notificationRoutes,
          ...categoryRoutes,
          ...calendarRoutes,
          ...statisticsRoutes,
          ...settingsRoutes,
          {
            path: "/agent",
            lazy: async () => ({
              Component: (await import("../features/agent/AgentPage")).default,
            }),
          },
          {
            path: "/agent/skills",
            lazy: async () => ({
              Component: (await import("../features/agent/skills/SkillsPage"))
                .SkillsPage,
            }),
          },
          {
            path: "/agent/skills/new",
            lazy: async () => ({
              Component: (
                await import("../features/agent/skills/SkillEditorPage")
              ).SkillEditorPage,
            }),
          },
          {
            path: "/agent/skills/:skillId",
            lazy: async () => ({
              Component: (
                await import("../features/agent/skills/SkillEditorPage")
              ).SkillEditorPage,
            }),
          },
        ],
      },
      ...v2Routes,
    ],
  },
  ...errorRoutes,
];

export const browserRouter = createBrowserRouter(routes);
export default browserRouter;
