import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  timeout: 30000, // Increased to 30 seconds for general requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add token to requests and adjust timeout for AI endpoints
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('Request:', config.method?.toUpperCase(), config.url);
    console.log('Request data:', config.data);
    console.log('Base URL:', config.baseURL);
    
    // Increase timeout for AI endpoints (they need more time)
    if (config.url?.includes('/api/ai/')) {
      config.timeout = 60000; // 60 seconds for AI requests
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      
      // Handle 401 - Unauthorized
      if (error.response.status === 401) {
        // Only redirect if not on login/register page
        const currentPath = window.location.pathname;
        if (!['/login', '/register'].includes(currentPath)) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
      
      // Handle other errors
      const message = error.response.data?.message || 'An error occurred';
      console.error('Error message:', message);
      return Promise.reject(new Error(message));
    } else if (error.request) {
      console.error('No response received:', error.request);
      return Promise.reject(new Error('No response from server'));
    } else {
      console.error('Request setup error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default axiosInstance;
