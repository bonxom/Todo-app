import AppRouter from './route/AppRouter';
import { TaskRefreshProvider } from './context/TaskRefreshContext';
import './App.css';

function App() {
  return (
    <TaskRefreshProvider>
      <AppRouter />
    </TaskRefreshProvider>
  );
}

export default App;
