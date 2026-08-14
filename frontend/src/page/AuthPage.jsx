import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../feature/Auth/AuthLayout';
import LoginForm from '../feature/Auth/LoginForm';
import RegisterForm from '../feature/Auth/RegisterForm';
import { useLoginMutation, useRegisterMutation } from '../features/auth/api/authMutations';
import '../styles/auth.css';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  
  const initialMode = location.pathname === '/register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const newMode = location.pathname === '/register' ? 'register' : 'login';
    setMode(newMode);
  }, [location.pathname]);

  // Submit Handlers
  const handleLoginSubmit = async (credentials, setErrors) => {
    try {
      setIsLoading(true);
      await loginMutation.mutateAsync(credentials);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error?.message || 'Login failed. Please try again.';
      setErrors({ password: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (credentials, setErrors) => {
    try {
      setIsLoading(true);
      await registerMutation.mutateAsync({
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
        dob: credentials.dob,
      });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const errorMessage = error?.message || 'Registration failed. Please try again.';
      setErrors({ email: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    navigate(newMode === 'login' ? '/login' : '/register', { replace: true });
  };

  return (
    <AuthLayout mode={mode}>
      <div className="auth-card">
        <div className="auth-card-header">
          <div>
            <p className="ui-page-kicker">Account</p>
            <h2>{mode === 'login' ? 'Sign In' : 'Create Workspace'}</h2>
            <p>
              {mode === 'login'
                ? 'Continue to your tasks, projects, calendar, and statistics.'
                : 'Set up your account and start organizing tasks in one workspace.'}
            </p>
          </div>

          <div className="auth-mode-toggle" role="group" aria-label="Authentication mode">
            <button
              type="button"
              className="auth-mode-button"
              data-active={mode === 'login'}
              aria-pressed={mode === 'login'}
              onClick={() => switchMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              className="auth-mode-button"
              data-active={mode === 'register'}
              aria-pressed={mode === 'register'}
              onClick={() => switchMode('register')}
            >
              Sign Up
            </button>
          </div>
        </div>

        {mode === 'login' ? (
          <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
        ) : (
          <RegisterForm onSubmit={handleRegisterSubmit} isLoading={isLoading} />
        )}
      </div>
    </AuthLayout>
  );
};

export default AuthPage;
