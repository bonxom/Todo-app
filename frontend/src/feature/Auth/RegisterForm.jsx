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
      return;
    }
    
    onSubmit(credentials, setErrors);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
      <div>
        <Input
          label="Full Name"
          value={credentials.name}
          onChange={(e) => {
            setCredentials({ ...credentials, name: e.target.value });
            if (errors.name) setErrors({ ...errors, name: undefined });
          }}
          placeholder="John Doe"
          fullWidth
          className="bg-gray-50"
          error={errors.name}
        />
      </div>
      
      <div>
        <Input
          label="Date of Birth"
          type="date"
          value={credentials.dob}
          onChange={(e) => {
            setCredentials({ ...credentials, dob: e.target.value });
            if (errors.dob) setErrors({ ...errors, dob: undefined });
          }}
          fullWidth
          className="bg-gray-50"
          error={errors.dob}
        />
      </div>
      
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
          placeholder="At least 6 characters"
          fullWidth
          className="bg-gray-50"
          error={errors.password}
        />
      </div>
      
      <div>
        <PasswordInput
          label="Confirm Password"
          value={credentials.confirmPassword || ''}
          onChange={(e) => {
            setCredentials({ ...credentials, confirmPassword: e.target.value });
            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
          }}
          placeholder="Re-enter your password"
          fullWidth
          className="bg-gray-50"
          error={errors.confirmPassword}
        />
      </div>
      
      <Button
        type="submit"
        fullWidth
        size="lg"
        variant="purple"
        disabled={isLoading}
        icon={<UserPlus className="w-5 h-5" />}
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
};

export default RegisterForm;
