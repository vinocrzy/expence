import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Configuration
// Use env var or default to Cloudflare Tunnel / Localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '/backend-api');

if (typeof window !== 'undefined') {
  console.log('[API] Connected to:', API_URL);
}
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1s

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, 
});

// Helper: Is Retryable? (Network Error or 5xx)
const isRetryableError = (error: any) => {
    // Network Error (no response)
    if (!error.response) return true; 
    // Server Error (5xx)
    const status = error.response.status;
    return status >= 500 && status <= 599; 
};

// Request Interceptor: Attach Token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    
    if (process.env.NODE_ENV === 'development' && !token) {
        config.headers.Authorization = `Bearer DEV_TOKEN`;
    } else if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: Retry & Error Handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    if (!originalRequest) return Promise.reject(error);

    // 1. Handle 401 Unauthorized (Token Expiry) - Requirement 5
    // In a full implementation, we would pause requests, refresh token, and release queue.
    if (error.response?.status === 401 && !originalRequest._retryCount) {
         // Placeholder for Refresh Logic
         // await refreshToken(); 
         // return api(originalRequest);
    }

    // 2. Retry Logic (Exponential Backoff) - Requirement 3
    if (isRetryableError(error) && (originalRequest._retryCount || 0) < MAX_RETRIES) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        
        // Exponential Backoff with Jitter
        // delay = 1000 * 2^(retry-1) + jitter
        const baseDelay = INITIAL_BACKOFF * Math.pow(2, originalRequest._retryCount - 1);
        const jitter = Math.random() * 200; 
        const delay = baseDelay + jitter;
        
        console.warn(`[API] Retry attempt ${originalRequest._retryCount}/${MAX_RETRIES} after ${Math.round(delay)}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;
