import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
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

    // Store token after successful login
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

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
      purchase_price_usdt: parseFloat(product.purchase_price_usdt || 0),
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
      price_usdt: parseFloat(product.price_usdt),
      purchase_price_usdt: parseFloat(product.purchase_price_usdt || 0)
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

  updateStatus: async (id, status, notes = '') => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid order ID');
    }

    const validStatuses = ['pending', 'paid', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const response = await api.patch(`/orders/${id}/status`, { status, notes });
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
  },

  getAnalytics: async (days = 30) => {
    const response = await api.get(`/dashboard/analytics?days=${days}`);
    return response.data;
  }
};

// FIXED SELLERS API - using axios instead of fetch
export const sellersAPI = {
  getAll: async () => {
    const response = await api.get('/sellers');
    return response.data;
  },

  create: async (seller) => {
    if (!seller.name || !seller.telegram_username) {
      throw new Error('Missing required fields');
    }

    if (seller.commission_percentage < 0 || seller.commission_percentage > 100) {
      throw new Error('Commission must be between 0-100%');
    }

    const response = await api.post('/sellers', seller);
    return response.data;
  },

  update: async (id, seller) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid seller ID');
    }

    const response = await api.put(`/sellers/${id}`, seller);
    return response.data;
  },

  delete: async (id, hardDelete = false) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid seller ID');
    }

    const url = hardDelete
        ? `/sellers/${id}?hard=true`
        : `/sellers/${id}`;

    const response = await api.delete(url);
    return response.data;
  },

  getEarnings: async (sellerId) => {
    if (!sellerId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid seller ID');
    }

    const response = await api.get(`/sellers/${sellerId}/earnings`);
    return response.data;
  },

  createPayout: async (sellerId, payout) => {
    if (!sellerId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid seller ID');
    }

    if (!payout.amount || payout.amount <= 0) {
      throw new Error('Invalid payout amount');
    }

    const response = await api.post(`/sellers/${sellerId}/payout`, payout);
    return response.data;
  },

  getReferralCodes: async (sellerId) => {
    if (!sellerId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid seller ID');
    }

    const response = await api.get(`/sellers/${sellerId}/referral-codes`);
    return response.data;
  },

  // FIXED - Using axios instead of fetch!
  assignReferralCode: async (referralId, sellerId) => {
    if (!referralId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid referral ID');
    }

    if (!sellerId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid seller ID');
    }

    const response = await api.post(`/referrals/${referralId}/assign-seller`, {
      seller_id: sellerId
    });

    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/sellers/stats');
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

export const notificationsAPI = {
  getSettings: async () => {
    const response = await api.get('/notifications/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.put('/notifications/settings', settings);
    return response.data;
  },

  addTemplate: async (template) => {
    const response = await api.post('/notifications/templates', template);
    return response.data;
  },

  deleteTemplate: async (index) => {
    const response = await api.delete(`/notifications/templates/${index}`);
    return response.data;
  },

  sendTest: async () => {
    const response = await api.post('/notifications/test');
    return response.data;
  },

  sendFakeOrder: async () => {
    const response = await api.post('/notifications/fake-order');
    return response.data;
  },

  getLogs: async () => {
    const response = await api.get('/notifications/logs');
    return response.data;
  }
};

// Export dashboard API for compatibility
export const dashboardAPI = {
  getStats: statsAPI.getDashboard,
  getAnalytics: statsAPI.getAnalytics
};

// Add this to frontend/admin/src/services/api.js

export const chatAPI = {
  // Get all conversations
  getConversations: async (unreadOnly = false) => {
    const response = await api.get('/chat/conversations', {
      params: { unread_only: unreadOnly }
    });
    return response.data;
  },

  // Get messages for specific user
  getMessages: async (telegramId, skip = 0, limit = 50) => {
    if (!telegramId) {
      throw new Error('Telegram ID required');
    }
    const response = await api.get(`/chat/messages/${telegramId}`, {
      params: { skip, limit }
    });
    return response.data;
  },

  // Send message to user
  sendMessage: async (telegramId, message, attachments = null) => {
    if (!telegramId || !message) {
      throw new Error('Telegram ID and message required');
    }

    const response = await api.post('/chat/send', {
      telegram_id: telegramId,
      message: sanitizeInput(message),
      attachments
    });
    return response.data;
  },

  // Mark messages as read
  markAsRead: async (telegramId) => {
    if (!telegramId) {
      throw new Error('Telegram ID required');
    }
    const response = await api.patch(`/chat/mark-read/${telegramId}`);
    return response.data;
  },

  // Delete conversation
  deleteConversation: async (telegramId) => {
    if (!telegramId) {
      throw new Error('Telegram ID required');
    }
    if (!confirm('Are you sure you want to delete this entire conversation?')) {
      return;
    }
    const response = await api.delete(`/chat/conversation/${telegramId}`);
    return response.data;
  },

  // Search messages
  searchMessages: async (query, telegramId = null) => {
    if (!query) {
      throw new Error('Search query required');
    }
    const params = { query };
    if (telegramId) {
      params.telegram_id = telegramId;
    }
    const response = await api.get('/chat/search', { params });
    return response.data;
  },

  // Get chat statistics
  getStats: async () => {
    const response = await api.get('/chat/stats');
    return response.data;
  },

  // Get quick replies
  getQuickReplies: async () => {
    const response = await api.get('/chat/quick-replies');
    return response.data;
  }
};

// WebSocket connection for real-time chat
export class ChatWebSocket {
  constructor(onMessage) {
    this.ws = null;
    this.onMessage = onMessage;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.pingInterval = null;
    this.isIntentionalDisconnect = false;
  }

  connect() {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found, skipping WebSocket connection');
      return;
    }

    // Parse token to get email
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const email = payload.email;

      // Build WebSocket URL
      let wsUrl;

      // Get the current location
      const currentHost = window.location.hostname;
      const currentPort = window.location.port;

      // IMPORTANT: Always use the current port - Vite will proxy it
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

      if (currentPort) {
        // If there's a port (like 3000 for dev), include it
        wsUrl = `${protocol}//${currentHost}:${currentPort}/ws/chat/${encodeURIComponent(email)}`;
      } else {
        // No port means we're on standard 80/443
        wsUrl = `${protocol}//${currentHost}/ws/chat/${encodeURIComponent(email)}`;
      }

      console.log('Attempting WebSocket connection to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          console.warn('WebSocket connection timeout, closing...');
          this.ws.close();
        }
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('Chat WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // Reset delay

        // Start ping interval to keep connection alive
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.send(JSON.stringify({ type: 'ping' }));
            } catch (e) {
              console.error('Error sending ping:', e);
            }
          }
        }, 30000); // Ping every 30 seconds
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'pong' && this.onMessage) {
            this.onMessage(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('Chat WebSocket disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });

        this.cleanup();

        // Only reconnect if it wasn't an intentional disconnect
        if (!this.isIntentionalDisconnect && event.code !== 1000 && event.code !== 1001) {
          this.reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('Chat WebSocket error event (this is normal before close)');
        clearTimeout(connectionTimeout);
      };

    } catch (error) {
      console.error('Error setting up WebSocket connection:', error);
    }
  }

  reconnect() {
    if (this.isIntentionalDisconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      // Could notify user here that real-time updates are unavailable
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff with jitter
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
    const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds

    console.log(`Reconnecting in ${Math.round(delay)}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (!this.isIntentionalDisconnect) {
        this.connect();
      }
    }, delay);
  }

  sendTyping(telegramId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'typing',
          telegram_id: telegramId
        }));
      } catch (e) {
        console.error('Error sending typing indicator:', e);
      }
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('Error sending data:', e);
        return false;
      }
    } else {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }
  }

  cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.isIntentionalDisconnect = true;
    this.cleanup();
    if (this.ws) {
      try {
        this.ws.close(1000, 'Intentional disconnect');
      } catch (e) {
        console.error('Error closing WebSocket:', e);
      }
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export const customOrdersAPI = {
  getAll: async (skip = 0, limit = 100) => {
    const response = await api.get('/custom-orders', {
      params: { skip, limit }
    });
    return response.data;
  },

  updateStatus: async (orderId, status) => {
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid order ID');
    }

    const validStatuses = ['pending', 'processing', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const response = await api.patch(`/custom-orders/${orderId}/status`, { status });
    return response.data;
  },

  delete: async (orderId) => {
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid order ID');
    }

    const response = await api.delete(`/custom-orders/${orderId}`);
    return response.data;
  },

  bulkDelete: async (orderIds) => {
    const response = await api.post('/custom-orders/bulk-delete', { order_ids: orderIds });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/custom-orders/unread-count');
    return response.data;
  }
};

export const botAPI = {
  // Messages
  getMessages: async (category = null) => {
    const params = category ? { category } : {};
    const response = await api.get('/bot/messages', { params });
    return response.data;
  },

  createMessage: async (message) => {
    if (!message.key || !message.message) {
      throw new Error('Missing required fields');
    }
    const response = await api.post('/bot/messages', message);
    return response.data;
  },

  updateMessage: async (id, message) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid message ID');
    }
    const response = await api.put(`/bot/messages/${id}`, message);
    return response.data;
  },

  deleteMessage: async (id) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid message ID');
    }
    const response = await api.delete(`/bot/messages/${id}`);
    return response.data;
  },

  bulkUpdateMessages: async (updates) => {
    const response = await api.post('/bot/messages/bulk-update', updates);
    return response.data;
  },

  // Commands
  getCommands: async () => {
    const response = await api.get('/bot/commands');
    return response.data;
  },

  createCommand: async (command) => {
    if (!command.command || !command.response) {
      throw new Error('Missing required fields');
    }
    const response = await api.post('/bot/commands', command);
    return response.data;
  },

  updateCommand: async (id, command) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid command ID');
    }
    const response = await api.put(`/bot/commands/${id}`, command);
    return response.data;
  },

  deleteCommand: async (id) => {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid command ID');
    }
    const response = await api.delete(`/bot/commands/${id}`);
    return response.data;
  },

  // Settings
  getSettings: async () => {
    const response = await api.get('/bot/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.put('/bot/settings', settings);
    return response.data;
  },

  // Utilities
  initializeMessages: async () => {
    const response = await api.post('/bot/initialize-messages');
    return response.data;
  },

  restartBot: async () => {
    const response = await api.post('/bot/restart');
    return response.data;
  }
};

export const payoutsAPI = {
  // Partners
  getPartners: async () => {
    const response = await api.get('/payouts/partners');
    return response.data;
  },

  createPartner: async (partner) => {
    if (!partner.name) {
      throw new Error('Partner name is required');
    }

    if (partner.type === 'partner' && (!partner.commission_percentage || partner.commission_percentage <= 0)) {
      throw new Error('Valid commission percentage required for partners');
    }

    if (partner.type === 'service' && (!partner.fixed_amount || partner.fixed_amount <= 0)) {
      throw new Error('Valid fixed amount required for services');
    }

    const response = await api.post('/payouts/partners', partner);
    return response.data;
  },

  updatePartner: async (partnerId, partner) => {
    if (!partnerId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid partner ID');
    }

    const response = await api.put(`/payouts/partners/${partnerId}`, partner);
    return response.data;
  },

  deletePartner: async (partnerId) => {
    if (!partnerId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid partner ID');
    }

    const response = await api.delete(`/payouts/partners/${partnerId}`);
    return response.data;
  },

  // Expenses
  getExpenses: async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/payouts/expenses', { params });
    return response.data;
  },

  createExpense: async (expense) => {
    if (!expense.name || expense.amount <= 0) {
      throw new Error('Valid expense name and amount required');
    }

    const response = await api.post('/payouts/expenses', expense);
    return response.data;
  },

  payExpense: async (expenseId) => {
    if (!expenseId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid expense ID');
    }

    const response = await api.patch(`/payouts/expenses/${expenseId}/pay`);
    return response.data;
  },

  // Calculations
  getCalculations: async () => {
    const response = await api.get('/payouts/calculations');
    return response.data;
  },

  // Process Payout
  processPayout: async (transaction) => {
    if (!transaction.partner_id || !transaction.amount || transaction.amount <= 0) {
      throw new Error('Valid partner ID and amount required');
    }

    const response = await api.post('/payouts/process', transaction);
    return response.data;
  },

  // History
  getHistory: async (partnerId = null) => {
    const params = partnerId ? { partner_id: partnerId } : {};
    const response = await api.get('/payouts/history', { params });
    return response.data;
  },

  // Stats
  getStats: async () => {
    const response = await api.get('/payouts/stats');
    return response.data;
  }
};

export default api;
