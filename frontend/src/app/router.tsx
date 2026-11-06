import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { RootGuard, PublicOnlyGuard, ProtectedGuard } from "./routeGuards";
import MainLayout from "../shared/layouts/MainLayout";
import { AgentChatBubble } from "../features/agent/AgentChatBubble";
import { AgentSessionProvider } from "../features/agent/AgentSessionProvider";
import ErrorPage from "../features/errors/ErrorPage";
import { landingRoutes } from "../features/landing/routes";
import { authRoutes } from "../features/auth/routes";
import { taskRoutes } from "../features/tasks/routes";
import { categoryRoutes } from "../features/categories/routes";
import { calendarRoutes } from "../features/calendar/routes";
import { statisticsRoutes } from "../features/statistics/routes";
import { profileRoutes } from "../features/profile/routes";
import { errorRoutes } from "../features/errors/routes";

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
        element: (
          <AgentSessionProvider>
            <MainLayout assistant={<AgentChatBubble />} />
          </AgentSessionProvider>
        ),
        children: [
          ...taskRoutes,
          ...categoryRoutes,
          ...calendarRoutes,
          ...statisticsRoutes,
          ...profileRoutes,
          {
            path: "/agent",
            lazy: async () => ({
              Component: (await import("../features/agent/AgentPage")).default,
            }),
          },
        ],
      },
    ],
  },
  ...errorRoutes,
];

export const browserRouter = createBrowserRouter(routes);
export default browserRouter;
