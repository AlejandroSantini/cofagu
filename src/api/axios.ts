import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
    
// Interceptor to add token to headers
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage');
  
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage);
      if (state && state.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch (error) {
      console.error('Error parsing auth-storage', error);
    }
  }
  
  return config;
});

// Interceptor to handle 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login?error=' + encodeURIComponent('Tu sesión ha expirado o el token es inválido.');
      }
    }
    return Promise.reject(error);
  }
);
