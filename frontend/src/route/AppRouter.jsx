import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import TodoPage from '../page/TodoPage';
import ProfilePage from '../page/ProfilePage';
import CategoryPage from '../page/CategoryPage';
import CalendarPage from '../page/CalendarPage';
import AuthPage from '../page/AuthPage';
import LandingPage from '../page/LandingPage';
import StatisticsPage from '../page/StatisticsPage';

const MAIN_APP_ROUTE = '/dashboard';

const AuthLoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">
      Checking your session...
    </div>
  );
};

const RootRoute = () => {
  const { isAuthReady, isAuthenticated } = useAuth();

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  return isAuthenticated ? <Navigate to={MAIN_APP_ROUTE} replace /> : <LandingPage />;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthReady, isAuthenticated } = useAuth();

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthReady, isAuthenticated } = useAuth();

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  return isAuthenticated ? <Navigate to={MAIN_APP_ROUTE} replace /> : children;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<RootRoute />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><AuthPage /></PublicOnlyRoute>} />
        
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
