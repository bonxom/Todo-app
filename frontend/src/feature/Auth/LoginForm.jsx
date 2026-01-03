import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import PasswordInput from './PasswordInput';

const LoginForm = ({ onSubmit, isLoading }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!credentials.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSubmit(credentials, setErrors);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
      <div>
        <Input
          label="Email"
          type="email"
          value={credentials.email}
          onChange={(e) => {
            setCredentials({ ...credentials, email: e.target.value });
            if (errors.email) setErrors({ ...errors, email: undefined });
          }}
          placeholder="your@email.com"
          fullWidth
          className="bg-gray-50"
          error={errors.email}
        />
      </div>
      
      <div>
        <PasswordInput
          label="Password"
          value={credentials.password}
          onChange={(e) => {
            setCredentials({ ...credentials, password: e.target.value });
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
          placeholder="••••••••"
          fullWidth
          className="bg-gray-50"
          error={errors.password}
        />
      </div>
      
      <div className="flex justify-between items-center text-sm">
        <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
          <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
          Remember me
        </label>
        <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-semibold">
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        fullWidth
        size="lg"
        variant="purple"
        disabled={isLoading}
        icon={<LogIn className="w-5 h-5" />}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
};

export default LoginForm;
