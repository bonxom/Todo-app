import AppRouter from './route/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { TaskRefreshProvider } from './context/TaskRefreshContext';
import ErrorBoundary from './component/ErrorBoundary';
import QueryProvider from './app/QueryProvider';
import AuthCacheBoundary from './app/AuthCacheBoundary';
import './App.css';

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
