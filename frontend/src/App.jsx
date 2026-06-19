import AppRouter from './route/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { TaskRefreshProvider } from './context/TaskRefreshContext';
import { TaskFilterProvider } from './context/TaskFilterContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <TaskRefreshProvider>
        <TaskFilterProvider>
          <AppRouter />
        </TaskFilterProvider>
      </TaskRefreshProvider>
    </AuthProvider>
  );
}

export default App;
