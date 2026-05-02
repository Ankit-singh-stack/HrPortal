import axios from 'axios';

// Determine the API URL based on the environment
const isProd = import.meta.env.PROD;
const envUrl = import.meta.env.VITE_API_URL;
const prodFallback = 'https://hrportal-server-7hkl.onrender.com/api';

const API_URL = isProd 
  ? (envUrl && !envUrl.includes('localhost') ? envUrl : prodFallback)
  : (envUrl || 'http://localhost:5000/api');

console.log('🔗 API Base URL:', API_URL);
console.log('🌍 Environment:', import.meta.env.PROD ? 'production' : 'development');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    console.error(`❌ API Error [${status || 'NETWORK'}]:`, message);
    
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;