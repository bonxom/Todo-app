import AppRouter from './route/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { TaskRefreshProvider } from './context/TaskRefreshContext';
import ErrorBoundary from './shared/components/ErrorBoundary';
import QueryProvider from './app/QueryProvider';
import AuthCacheBoundary from './app/AuthCacheBoundary';
import './styles/app.css';

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthCacheBoundary>
          <AuthProvider>
            <TaskRefreshProvider>
              <AppRouter />
            </TaskRefreshProvider>
          </AuthProvider>
        </AuthCacheBoundary>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
