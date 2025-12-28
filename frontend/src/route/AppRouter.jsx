import { Routes, Route, BrowserRouter } from 'react-router-dom';
import TodoPage from '../page/TodoPage';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TodoPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;

