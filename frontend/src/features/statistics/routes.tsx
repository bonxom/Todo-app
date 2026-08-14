import type { RouteObject } from 'react-router-dom';

export const statisticsRoutes: RouteObject[] = [
  {
    path: 'statistics',
    lazy: async () => {
      const Component = (await import('./StatisticsPage')).default;
      return { Component };
    },
  },
];
