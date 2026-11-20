import { Navigate, type RouteObject } from "react-router-dom";

export const settingsRoutes: RouteObject[] = [
  {
    path: "settings",
    lazy: async () => {
      const Component = (await import("./SettingsPage")).default;
      return { Component };
    },
  },
  {
    path: "profile",
    element: <Navigate to="/settings" replace />,
  },
];
