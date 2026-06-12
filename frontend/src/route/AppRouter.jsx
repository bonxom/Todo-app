import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import TodoPage from '../page/TodoPage';
import ProfilePage from '../page/ProfilePage';
import CategoryPage from '../page/CategoryPage';
import CalendarPage from '../page/CalendarPage';
import AuthPage from '../page/AuthPage';
import LandingPage from '../page/LandingPage';
import StatisticsPage from '../page/StatisticsPage';

const hasStoredToken = () => localStorage.getItem('token') !== null;

const ProtectedRoute = ({ children }) => {
  return hasStoredToken() ? children : <Navigate to="/login" replace />;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><TodoPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
