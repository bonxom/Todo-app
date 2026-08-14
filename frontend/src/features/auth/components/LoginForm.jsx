import { useState } from 'react';
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
      const form = e.currentTarget;
      window.requestAnimationFrame(() => {
        form.querySelector('[aria-invalid="true"]')?.focus();
      });
      return;
    }
    
    onSubmit(credentials, setErrors);
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" noValidate>
      <Input
        label="Email"
        name="email"
        type="email"
        value={credentials.email}
        onChange={(e) => {
          setCredentials({ ...credentials, email: e.target.value });
          if (errors.email) setErrors({ ...errors, email: undefined });
        }}
        placeholder="you@example.com…"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        fullWidth
        error={errors.email}
      />
      
      <PasswordInput
        label="Password"
        name="password"
        value={credentials.password}
        onChange={(e) => {
          setCredentials({ ...credentials, password: e.target.value });
          if (errors.password) setErrors({ ...errors, password: undefined });
        }}
        placeholder="Enter your password…"
        autoComplete="current-password"
        fullWidth
        error={errors.password}
      />
      
      <div className="auth-form-row">
        <label className="auth-checkbox-label">
          <input type="checkbox" name="remember" />
          Remember me
        </label>
      </div>

      <Button
        type="submit"
        fullWidth
        size="lg"
        variant="primary"
        loading={isLoading}
        icon={<LogIn className="h-4 w-4" aria-hidden="true" />}
      >
        {isLoading ? 'Signing in…' : 'Sign In'}
      </Button>
    </form>
  );
};

export default LoginForm;
