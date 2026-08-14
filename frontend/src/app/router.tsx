import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RootGuard, PublicOnlyGuard, ProtectedGuard } from './routeGuards';
import MainLayout from '../shared/layouts/MainLayout';
import ChatBubble from '../features/tasks/components/chat';
import ErrorPage from '../features/errors/ErrorPage';
import { landingRoutes } from '../features/landing/routes';
import { authRoutes } from '../features/auth/routes';
import { taskRoutes } from '../features/tasks/routes';
import { categoryRoutes } from '../features/categories/routes';
import { calendarRoutes } from '../features/calendar/routes';
import { statisticsRoutes } from '../features/statistics/routes';
import { profileRoutes } from '../features/profile/routes';
import { errorRoutes } from '../features/errors/routes';

export const routes: RouteObject[] = [
  {
    element: <RootGuard />,
    errorElement: <ErrorPage code="500" />,
    children: [...landingRoutes],
  },
  {
    element: <PublicOnlyGuard />,
    errorElement: <ErrorPage code="500" />,
    children: [...authRoutes],
  },
  {
    element: <ProtectedGuard />,
    errorElement: <ErrorPage code="500" />,
    children: [
      {
        element: <MainLayout assistant={<ChatBubble />} />,
        children: [
          ...taskRoutes,
          ...categoryRoutes,
          ...calendarRoutes,
          ...statisticsRoutes,
          ...profileRoutes,
        ],
      },
    ],
  },
  ...errorRoutes,
];

export const browserRouter = createBrowserRouter(routes);
export default browserRouter;
