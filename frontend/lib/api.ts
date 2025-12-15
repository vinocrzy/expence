import axios from 'axios';

// Ensure NEXT_PUBLIC_API_URL is set in environment or fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // In development, force the use of DEV_TOKEN to speed up workflow
    if (process.env.NODE_ENV === 'development') {
        config.headers.Authorization = `Bearer DEV_TOKEN`;
    } else {
        const token = localStorage.getItem('token');
        if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        }
    }
  }
  return config;
});

export default api;
