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
