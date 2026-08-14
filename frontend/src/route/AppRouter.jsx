import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import TodoPage from '../features/tasks';
import ProfilePage from '../features/profile';
import CategoryPage from '../features/categories';
import CalendarPage from '../features/calendar';
import AuthPage from '../features/auth';
import LandingPage from '../features/landing';
import StatisticsPage from '../features/statistics';
import ErrorPage from '../features/errors';

const MAIN_APP_ROUTE = '/dashboard';

const AuthLoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] text-sm font-medium text-[var(--color-text-muted)]">
      Checking your session…
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

        {/* Error Pages */}
        <Route path="/404" element={<ErrorPage code="404" />} />
        <Route path="/403" element={<ErrorPage code="403" />} />
        <Route path="/500" element={<ErrorPage code="500" />} />
        <Route path="/503" element={<ErrorPage code="503" />} />
        <Route path="*" element={<ErrorPage code="404" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
