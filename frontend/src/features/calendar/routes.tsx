import type { RouteObject } from 'react-router-dom';

export const calendarRoutes: RouteObject[] = [
  {
    path: 'calendar',
    lazy: async () => {
      const Component = (await import('./CalendarPage')).default;
      return { Component };
    },
  },
];
