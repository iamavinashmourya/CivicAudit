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
    // Always log API calls for debugging (especially important in production)
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      params: config.params,
      hasToken: !!token
    });
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log API errors
    if (error.response) {
      console.error('[API] Error response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      console.error('[API] No response received:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        message: 'Network error - check if backend is running and CORS is configured'
      });
      
      // Check if this might be an Ngrok browser warning issue
      if (error.config?.baseURL?.includes('ngrok-free.app') || error.config?.baseURL?.includes('ngrok.io')) {
        console.warn('[API] Ngrok detected - If using free tier, you may need to visit the Ngrok URL in browser first to bypass the warning page');
      }
    }
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

  // Get full user profile
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },
};

// Reports API functions
export const reportsAPI = {
  // Create a new report
  createReport: async (formData) => {
    const token = getToken();
    const response = await axios.post(`${API_URL}/reports`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get nearby reports
  getNearbyReports: async (lat, lng) => {
    const response = await api.get('/reports/nearby', {
      params: { lat, lng },
    });
    return response.data;
  },

  // Get user's reports
  getMyReports: async () => {
    const response = await api.get('/reports/me');
    return response.data;
  },

  // Vote on a report (voteType: 'up' | 'down')
  vote: async (reportId, voteType) => {
    const response = await api.put(`/reports/${reportId}/vote`, { type: voteType });
    return response.data;
  },
  
  // Get a single report by ID (if needed in future)
  getReportById: async (reportId) => {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  },

  // Verify resolution (approve or reject)
  verifyResolution: async (reportId, action) => {
    const response = await api.post(`/reports/${reportId}/verify-resolution`, { action });
    return response.data;
  },
};

// Notifications API functions
export const notificationsAPI = {
  // Get all notifications
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
};

export default api;
