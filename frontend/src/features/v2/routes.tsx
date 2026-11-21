import { type RouteObject, Navigate } from "react-router-dom";
import RouteLoadError from "@/app/RouteLoadError";

export const v2Routes: RouteObject[] = [
  {
    path: "v2",
    errorElement: <RouteLoadError />,
    // Code splitting: dynamically import V2 presentation with fallback on chunk load failure
    lazy: async () => {
      try {
        const mod = await import("./layouts/V2Layout");
        return { Component: mod.default };
      } catch (err) {
        return { Component: () => <RouteLoadError error={err} /> };
      }
    },
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: "notifications",
        errorElement: <RouteLoadError />,
        lazy: async () => ({
          Component: (await import("./pages/NotificationsPage")).default,
        }),
      },
      {
        path: "calendar",
        errorElement: <RouteLoadError />,
        lazy: async () => {
          try {
            const mod = await import("./pages/CalendarPage");
            return { Component: mod.default };
          } catch (err) {
            return { Component: () => <RouteLoadError error={err} /> };
          }
        },
      },
      {
        path: "dashboard",
        errorElement: <RouteLoadError />,
        lazy: async () => {
          try {
            const mod = await import("./pages/DashboardPage");
            return { Component: mod.default };
          } catch (err) {
            return { Component: () => <RouteLoadError error={err} /> };
          }
        },
      },
      {
        path: "statistics",
        errorElement: <RouteLoadError />,
        lazy: async () => {
          try {
            const mod = await import("./pages/StatisticsPage");
            return { Component: mod.default };
          } catch (err) {
            return { Component: () => <RouteLoadError error={err} /> };
          }
        },
      },
      {
        path: "settings",
        errorElement: <RouteLoadError />,
        lazy: async () => {
          try {
            const mod = await import("./pages/SettingsPage");
            return { Component: mod.default };
          } catch (err) {
            return { Component: () => <RouteLoadError error={err} /> };
          }
        },
      },
      {
        path: "profile",
        element: <Navigate to="/v2/settings" replace />,
      },
      {
        path: "agents",
        errorElement: <RouteLoadError />,
        lazy: async () => {
          try {
            const mod = await import("./pages/AgentsPage");
            return { Component: mod.default };
          } catch (err) {
            return { Component: () => <RouteLoadError error={err} /> };
          }
        },
      },
      {
        path: "agents/skills",
        errorElement: <RouteLoadError />,
        lazy: async () => {
          try {
            const mod = await import("./pages/SkillsPage");
            return { Component: mod.default };
          } catch (err) {
            return { Component: () => <RouteLoadError error={err} /> };
          }
        },
      },
      {
        path: "agents/skills/new",
        errorElement: <RouteLoadError />,
        lazy: async () => {
          try {
            const mod = await import("./pages/SkillEditorPage");
            return { Component: mod.default };
          } catch (err) {
            return { Component: () => <RouteLoadError error={err} /> };
          }
        },
      },
      {
        path: "agents/skills/:skillId",
        errorElement: <RouteLoadError />,
        lazy: async () => {
          try {
            const mod = await import("./pages/SkillEditorPage");
            return { Component: mod.default };
          } catch (err) {
            return { Component: () => <RouteLoadError error={err} /> };
          }
        },
      },
      {
        path: "*",
        errorElement: <RouteLoadError />,
        lazy: async () => {
          try {
            const mod = await import("./pages/V2NotFoundPage");
            return { Component: mod.default };
          } catch (err) {
            return { Component: () => <RouteLoadError error={err} /> };
          }
        },
      },
    ],
  },
];
