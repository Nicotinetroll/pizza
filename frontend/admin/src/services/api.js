import axios from 'axios';

const API_URL = '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Create axios instance with security headers
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for auth
api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        localStorage.removeItem('token');
        window.location.href = '/';
        return Promise.reject(error);
      }

      // Retry logic for network errors
      if (!error.response && originalRequest._retryCount < MAX_RETRIES) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return api(originalRequest);
      }

      return Promise.reject(error);
    }
);

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
};

// API methods with input validation
export const authAPI = {
  login: async (email, password) => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Password length check
    if (password.length < 4 || password.length > 100) {
      throw new Error('Invalid password length');
    }

    const response = await api.post('/auth/login', {
      email: sanitizeInput(email),
      password: sanitizeInput(password)
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    sessionStorage.clear();
  }
};

export const productsAPI = {
  getAll: async () => {
    const response = await api.get('/products');
    return response.data;
  },

  create: async (product) => {
    // Validate product data
    if (!product.name || !product.description || !product.price_usdt) {
      throw new Error('Missing required fields');
    }

    if (product.price_usdt < 0 || product.price_usdt > 999999) {
      throw new Error('Invalid price');
    }

    const response = await api.post('/products', {
      ...product,
      name: sanitizeInput(product.name),
      description: sanitizeInput(product.description),
      price_usdt: parseFloat(product.price_usdt),
      stock_quantity: parseInt(product.stock_quantity) || 999
    });
    return response.data;
  },

  update: async (id, product) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid product ID');
    }

    const response = await api.put(`/products/${id}`, {
      ...product,
      name: sanitizeInput(product.name),
      description: sanitizeInput(product.description),
      price_usdt: parseFloat(product.price_usdt)
    });
    return response.data;
  },

  delete: async (id) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid product ID');
    }

    const response = await api.delete(`/products/${id}`);
    return response.data;
  }
};

export const categoriesAPI = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  create: async (category) => {
    if (!category.name || !category.description) {
      throw new Error('Missing required fields');
    }

    const response = await api.post('/categories', {
      ...category,
      name: sanitizeInput(category.name),
      description: sanitizeInput(category.description)
    });
    return response.data;
  },

  update: async (id, category) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid category ID');
    }

    const response = await api.put(`/categories/${id}`, {
      ...category,
      name: sanitizeInput(category.name),
      description: sanitizeInput(category.description)
    });
    return response.data;
  },

  delete: async (id) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid category ID');
    }

    const response = await api.delete(`/categories/${id}`);
    return response.data;
  }
};

export const referralsAPI = {
  getAll: async () => {
    const response = await api.get('/referrals');
    return response.data;
  },

  create: async (referral) => {
    if (!referral.code || !referral.description) {
      throw new Error('Missing required fields');
    }

    const response = await api.post('/referrals', referral);
    return response.data;
  },

  update: async (id, referral) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid referral ID');
    }

    const response = await api.put(`/referrals/${id}`, referral);
    return response.data;
  },

  delete: async (id) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid referral ID');
    }

    const response = await api.delete(`/referrals/${id}`);
    return response.data;
  }
};

export const ordersAPI = {
  getAll: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  updateStatus: async (id, status) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid order ID');
    }

    const validStatuses = ['pending', 'paid', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data;
  }
};

export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  updateVIPStatus: async (userId, vipData) => {
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid user ID');
    }

    // Validate VIP data
    if (vipData.vip_discount_percentage < 0 || vipData.vip_discount_percentage > 100) {
      throw new Error('Discount must be between 0 and 100');
    }

    const response = await api.patch(`/users/${userId}/vip`, vipData);
    return response.data;
  }
};

export const statsAPI = {
  getDashboard: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};

export const adminAPI = {
  clearOrders: async () => {
    const response = await api.delete('/admin/clear-orders');
    return response.data;
  },

  clearUsers: async () => {
    const response = await api.delete('/admin/clear-users');
    return response.data;
  }
};

export default api;