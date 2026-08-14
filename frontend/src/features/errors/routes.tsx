import type { RouteObject } from 'react-router-dom';

export const errorRoutes: RouteObject[] = [
  {
    path: '400',
    lazy: async () => {
      const ErrorPage = (await import('./ErrorPage')).default;
      return { Component: () => <ErrorPage code="400" /> };
    },
  },
  {
    path: '401',
    lazy: async () => {
      const ErrorPage = (await import('./ErrorPage')).default;
      return { Component: () => <ErrorPage code="401" /> };
    },
  },
  {
    path: '403',
    lazy: async () => {
      const ErrorPage = (await import('./ErrorPage')).default;
      return { Component: () => <ErrorPage code="403" /> };
    },
  },
  {
    path: '404',
    lazy: async () => {
      const ErrorPage = (await import('./ErrorPage')).default;
      return { Component: () => <ErrorPage code="404" /> };
    },
  },
  {
    path: '500',
    lazy: async () => {
      const ErrorPage = (await import('./ErrorPage')).default;
      return { Component: () => <ErrorPage code="500" /> };
    },
  },
  {
    path: '502',
    lazy: async () => {
      const ErrorPage = (await import('./ErrorPage')).default;
      return { Component: () => <ErrorPage code="502" /> };
    },
  },
  {
    path: '503',
    lazy: async () => {
      const ErrorPage = (await import('./ErrorPage')).default;
      return { Component: () => <ErrorPage code="503" /> };
    },
  },
  {
    path: 'error',
    lazy: async () => {
      const ErrorPage = (await import('./ErrorPage')).default;
      return { Component: () => <ErrorPage code="500" /> };
    },
  },
  {
    path: '*',
    lazy: async () => {
      const ErrorPage = (await import('./ErrorPage')).default;
      return { Component: () => <ErrorPage code="404" /> };
    },
  },
];
