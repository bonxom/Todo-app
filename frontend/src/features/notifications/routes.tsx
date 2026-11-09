import type { RouteObject } from "react-router-dom";
export const notificationRoutes: RouteObject[] = [
  {
    path: "notifications",
    lazy: async () => ({
      Component: (await import("./NotificationsPage")).default,
    }),
  },
];
