import { RouterProvider } from 'react-router-dom';
import ErrorBoundary from '../shared/components/ErrorBoundary';
import { QueryProvider } from './QueryProvider';
import { AuthCacheBoundary } from './AuthCacheBoundary';
import { AuthBootstrap } from './AuthBootstrap';
import { browserRouter } from './router';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthCacheBoundary>
          <AuthBootstrap>
            <RouterProvider router={browserRouter} />
          </AuthBootstrap>
        </AuthCacheBoundary>
      </QueryProvider>
    </ErrorBoundary>
  );
}
