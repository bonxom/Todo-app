import AppRouter from './route/AppRouter';
import { AuthProvider } from './context/AuthContext';
import { TaskRefreshProvider } from './context/TaskRefreshContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <TaskRefreshProvider>
        <AppRouter />
      </TaskRefreshProvider>
    </AuthProvider>
  );
}

export default App;
