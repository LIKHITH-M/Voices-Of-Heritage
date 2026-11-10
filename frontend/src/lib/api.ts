import axios from 'axios';
import { auth } from '@/lib/firebase';

const AUTH_SERVICE_URL =
  (import.meta.env.VITE_AUTH_SERVICE_URL as string) || 'http://localhost:4001';

export const apiClient = axios.create({
  baseURL: AUTH_SERVICE_URL,
  withCredentials: false,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase ID token automatically to every request.
// Firebase refreshes the token silently when it expires — no manual refresh needed.
apiClient.interceptors.request.use(async (config) => {
  const fbUser = auth.currentUser;
  if (fbUser) {
    const token = await fbUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);
