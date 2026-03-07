import axios from 'axios';
import { toast } from 'react-toastify';
import { getStatusMessage } from '../utils/statusMessages';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors and successes
apiClient.interceptors.response.use(
  (response) => {
    // For successful mutations, we could show the 200 message, 
    // but typically we only do this if it's a specific success like "Saved!"
    if (['post', 'put', 'delete', 'patch'].includes(response.config.method)) {
      // toast.success(getStatusMessage(200));
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const backendDetail = error.response?.data?.detail;

    // Dismiss existing toasts before showing a new error to prevent stacking
    toast.dismiss();

    let message = backendDetail || getStatusMessage(status);

    if (status === 429) {
      message = 'Too many attempts. Please wait a moment.';
    } else if (status === 401 && !backendDetail) {
      message = 'Invalid credentials.';
    }

    if (status) {
      toast.error(message);

      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Prevent infinite loops if already on login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } else {
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;


