import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://smartnest-3jr4.onrender.com',
  timeout: 15000,
});

// Automatically inject JWT token from localStorage into all request headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
