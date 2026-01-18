import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../feature/Auth/AuthLayout';
import LoginForm from '../feature/Auth/LoginForm';
import RegisterForm from '../feature/Auth/RegisterForm';
import AuthOverlay from '../feature/Auth/AuthOverlay';
import { authService } from '../api/apiService';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const initialMode = location.pathname === '/register' ? 'register' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const newMode = location.pathname === '/register' ? 'register' : 'login';
    setMode(newMode);
  }, [location.pathname]);

  // Submit Handlers
  const handleLoginSubmit = async (credentials, setErrors) => {
    try {
      setIsLoading(true);
      console.log('Login attempt with:', { email: credentials.email });
      
      const response = await authService.login(credentials);
      console.log('Login response:', response);
      
      // Store user info if needed
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      console.log('Login successful, redirecting...');
      // Redirect to main page
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      const errorMessage = error?.message || 'Login failed. Please try again.';
      setErrors({ password: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (credentials, setErrors) => {
    try {
      setIsLoading(true);
      
      // Register new user (auto login with token)
      await authService.register({
        email: credentials.email,
        password: credentials.password,
        name: credentials.name,
        dob: credentials.dob
      });
      
      // Redirect to main page
      // navigate('/', { replace: true });
      switchMode('login');
    } catch (error) {
      const errorMessage = error?.message || 'Registration failed. Please try again.';
      setErrors({ email: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    setMode(newMode);
    navigate(newMode === 'login' ? '/login' : '/register', { replace: true });
    
    setTimeout(() => setIsAnimating(false), 700);
  };

  return (
    <>
    {/* HOME BUTTON */}
    <button
      onClick={() => navigate('/')}
      className="absolute top-6 left-6 z-50 p-3 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 group"
      aria-label="Go to home"
    >
      <svg 
        className="w-6 h-6 text-purple-600 group-hover:text-purple-700 transition-colors" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
        />
      </svg>
    </button>
    <AuthLayout>


      {/* LEFT SIDE: LOGIN FORM */}
      <div className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center transition-all duration-700 absolute md:relative top-0 left-0 h-full bg-white
        ${mode === 'login' 
          ? 'z-30 opacity-100 translate-x-0 pointer-events-auto' 
          : 'z-0 opacity-0 pointer-events-none'
        }
        ${mode === 'register' && 'hidden md:flex'}
      `}>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
          <p className="text-gray-500">Sign in to manage your tasks</p>
        </div>

        <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} />
        <video 
          className="fixed -bottom-20 left-1/2 w-96 h-96 z-0 shadow-bottom"
          style={{
            transform: 'translate(calc(-50%), calc(50%))'
          }}
          autoPlay
          loop
          muted
        >
          <source src="/robothihi1.mp4" type="video/mp4" />
        </video>
      </div>

      {/* RIGHT SIDE: REGISTER FORM */}
      <div className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center transition-all duration-700 absolute md:relative top-0 right-0 h-full bg-white
        ${mode === 'register'
          ? 'z-30 opacity-100 translate-x-0 pointer-events-auto' 
          : 'z-0 opacity-0 pointer-events-none'
        }
        ${mode === 'login' && 'hidden md:flex'}
      `}>
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
          <p className="text-gray-500">Join us to start managing your tasks</p>
        </div>

        <RegisterForm onSubmit={handleRegisterSubmit} isLoading={isLoading} />
      </div>

      {/* THE SLIDING OVERLAY */}
      <AuthOverlay mode={mode} onSwitchMode={switchMode} />
    </AuthLayout>
    </>
  );
};

export default AuthPage;
