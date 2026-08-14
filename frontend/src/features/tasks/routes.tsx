import type { RouteObject } from 'react-router-dom';

export const taskRoutes: RouteObject[] = [
  {
    path: 'dashboard',
    lazy: async () => {
      const Component = (await import('./TodoPage')).default;
      return { Component };
    },
  },
];
