import axios from 'axios';
import { clearStoredAuth, getStoredRefreshToken, getStoredToken, updateStoredTokens } from './authStorage';

const baseURL = import.meta.env.VITE_SERVER_URL?.trim() || undefined;
const enableApiDebugLogs = import.meta.env.VITE_API_DEBUG === 'true' || false;

const axiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const handleAuthFailure = () => {
  clearStoredAuth();
  const currentPath = window.location.pathname;
  if (!['/login', '/register'].includes(currentPath)) {
    window.location.replace('/login');
  }
};

// Request interceptor - add token to requests and adjust timeout for AI endpoints
axiosInstance.interceptors.request.use(
  (config) => {
    if (enableApiDebugLogs) {
      console.log('Request:', config.method?.toUpperCase(), config.url);
      console.log('Request data:', config.data);
      console.log('Base URL:', config.baseURL);
    }

    // Increase timeout for AI endpoints (they need more time)
    if (config.url?.includes('/api/ai/')) {
      config.timeout = 60000;
    }

    const token = getStoredToken();
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

// Response interceptor - handle errors & refresh tokens
axiosInstance.interceptors.response.use(
  (response) => {
    if (enableApiDebugLogs) {
      console.log('Response received:', response.status, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (enableApiDebugLogs) {
      console.error('Response error:', error);
    }

    if (!error.response) {
      if (error.request) {
        console.error('No response received:', error.request);
        return Promise.reject(new Error('No response from server'));
      }
      return Promise.reject(error);
    }

    const { status } = error.response;
    const requestUrl = originalRequest?.url ?? '';

    // Check if 401 Unauthorized
    if (status === 401) {
      const isAuthEndpoint =
        requestUrl.includes('/api/auth/login') ||
        requestUrl.includes('/api/auth/register') ||
        requestUrl.includes('/api/auth/refresh');

      if (isAuthEndpoint || originalRequest._retry) {
        handleAuthFailure();
        const message = error.response.data?.message || 'Authentication failed';
        return Promise.reject(new Error(message));
      }

      const refreshToken = getStoredRefreshToken();

      if (!refreshToken) {
        handleAuthFailure();
        const message = error.response.data?.message || 'Session expired';
        return Promise.reject(new Error(message));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshBaseUrl = baseURL || '';
        const refreshResponse = await axios.post(`${refreshBaseUrl}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken, token: fallbackToken } = refreshResponse.data;
        const effectiveToken = newAccessToken || fallbackToken;

        updateStoredTokens({
          accessToken: effectiveToken,
          refreshToken: newRefreshToken,
        });

        axiosInstance.defaults.headers.common.Authorization = `Bearer ${effectiveToken}`;
        originalRequest.headers.Authorization = `Bearer ${effectiveToken}`;

        processQueue(null, effectiveToken);
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        handleAuthFailure();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const message = error.response.data?.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;
