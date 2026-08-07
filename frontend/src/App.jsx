import AppRouter from './route/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { TaskRefreshProvider } from './context/TaskRefreshContext';
import { TaskFilterProvider } from './context/TaskFilterContext';
import ErrorBoundary from './component/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TaskRefreshProvider>
          <TaskFilterProvider>
            <AppRouter />
          </TaskFilterProvider>
        </TaskRefreshProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
