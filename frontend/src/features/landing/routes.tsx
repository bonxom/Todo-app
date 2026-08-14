import type { RouteObject } from 'react-router-dom';

export const landingRoutes: RouteObject[] = [
  {
    path: '',
    lazy: async () => {
      const Component = (await import('./LandingPage')).default;
      return { Component };
    },
  },
];
