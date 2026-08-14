import type { RouteObject } from 'react-router-dom';

export const authRoutes: RouteObject[] = [
  {
    path: 'login',
    lazy: async () => {
      const Component = (await import('./AuthPage')).default;
      return { Component };
    },
  },
  {
    path: 'register',
    lazy: async () => {
      const Component = (await import('./AuthPage')).default;
      return { Component };
    },
  },
];
