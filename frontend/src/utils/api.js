import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

// Get JWT token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Profile API functions
export const profileAPI = {
  // Upload profile photo
  uploadPhoto: async (file) => {
    const formData = new FormData();
    formData.append('profilePhoto', file);

    const token = getToken();
    const response = await axios.post(`${API_URL}/profile/upload-photo`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update identity
  updateIdentity: async (data) => {
    const response = await api.put('/profile/identity', data);
    return response.data;
  },

  // Update location
  updateLocation: async (data) => {
    const response = await api.put('/profile/location', data);
    return response.data;
  },

  // Verify KYC
  verifyKYC: async (data) => {
    const response = await api.post('/profile/verify-kyc', data);
    return response.data;
  },

  // Get profile status
  getStatus: async () => {
    const response = await api.get('/profile/status');
    return response.data;
  },
};

export default api;
