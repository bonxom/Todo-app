import type { RouteObject } from 'react-router-dom';

export const profileRoutes: RouteObject[] = [
  {
    path: 'profile',
    lazy: async () => {
      const Component = (await import('./ProfilePage')).default;
      return { Component };
    },
  },
];
