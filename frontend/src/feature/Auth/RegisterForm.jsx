import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import PasswordInput from './PasswordInput';

const RegisterForm = ({ onSubmit, isLoading }) => {
  const [credentials, setCredentials] = useState({ 
    name: '',
    email: '', 
    password: '', 
    confirmPassword: '',
    dob: ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!credentials.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!credentials.dob) {
      newErrors.dob = 'Date of birth is required';
    }
    
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
    
    if (credentials.confirmPassword !== credentials.password) {
      newErrors.confirmPassword = 'Passwords do not match';
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
        label="Full Name"
        name="name"
        value={credentials.name}
        onChange={(e) => {
          setCredentials({ ...credentials, name: e.target.value });
          if (errors.name) setErrors({ ...errors, name: undefined });
        }}
        placeholder="Jane Doe…"
        autoComplete="name"
        fullWidth
        error={errors.name}
      />
      
      <Input
        label="Date of Birth"
        name="dob"
        type="date"
        value={credentials.dob}
        onChange={(e) => {
          setCredentials({ ...credentials, dob: e.target.value });
          if (errors.dob) setErrors({ ...errors, dob: undefined });
        }}
        autoComplete="bday"
        fullWidth
        error={errors.dob}
      />
      
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
        placeholder="At least 6 characters…"
        autoComplete="new-password"
        fullWidth
        error={errors.password}
      />
      
      <PasswordInput
        label="Confirm Password"
        name="confirmPassword"
        value={credentials.confirmPassword || ''}
        onChange={(e) => {
          setCredentials({ ...credentials, confirmPassword: e.target.value });
          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
        }}
        placeholder="Re-enter your password…"
        autoComplete="new-password"
        fullWidth
        error={errors.confirmPassword}
      />
      
      <Button
        type="submit"
        fullWidth
        size="lg"
        variant="primary"
        loading={isLoading}
        icon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
      >
        {isLoading ? 'Creating account…' : 'Create Account'}
      </Button>
    </form>
  );
};

export default RegisterForm;
