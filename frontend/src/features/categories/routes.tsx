import type { RouteObject } from 'react-router-dom';

export const categoryRoutes: RouteObject[] = [
  {
    path: 'categories',
    lazy: async () => {
      const Component = (await import('./CategoryPage')).default;
      return { Component };
    },
  },
];
