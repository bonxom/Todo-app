import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import TodoPage from '../page/TodoPage';
import ProfilePage from '../page/ProfilePage';
import CategoryPage from '../page/CategoryPage';
import AuthPage from '../page/AuthPage';
import LandingPage from '../page/LandingPage';

const AppRouter = () => {
  // Check if user is authenticated
  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" replace />;
  };

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
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;

