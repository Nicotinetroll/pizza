import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

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

      if (!error.response && originalRequest._retryCount < MAX_RETRIES) {
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return api(originalRequest);
      }

      return Promise.reject(error);
    }
);

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
};

export const authAPI = {
  login: async (email, password) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    if (password.length < 4 || password.length > 100) {
      throw new Error('Invalid password length');
    }

    const response = await api.post('/auth/login', {
      email: sanitizeInput(email),
      password: sanitizeInput(password)
    });

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
        const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch settings');
        return response.json();
    },

    updateSettings: async (settings) => {
        const response = await fetch(`${API_BASE_URL}/notifications/settings`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) throw new Error('Failed to update settings');
        return response.json();
    },

    addTemplate: async (template) => {
        const response = await fetch(`${API_BASE_URL}/notifications/templates`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(template)
        });
        
        if (!response.ok) throw new Error('Failed to add template');
        return response.json();
    },

    updateTemplate: async (index, template) => {
        const response = await fetch(`${API_BASE_URL}/notifications/templates/${index}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(template)
        });
        
        if (!response.ok) throw new Error('Failed to update template');
        return response.json();
    },

    deleteTemplate: async (index) => {
        const response = await fetch(`${API_BASE_URL}/notifications/templates/${index}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to delete template');
        return response.json();
    },

    sendTestNotification: async () => {
        const response = await fetch(`${API_BASE_URL}/notifications/test`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to send test notification');
        return response.json();
    },

    sendFakeOrder: async () => {
        const response = await fetch(`${API_BASE_URL}/notifications/fake-order`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to send fake order');
        return response.json();
    },

    getLogs: async () => {
        const response = await fetch(`${API_BASE_URL}/notifications/logs`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch logs');
        return response.json();
    },
    
    uploadMedia: async (file, type) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        const response = await fetch(`${API_BASE_URL}/notifications/media/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }
        
        return response.json();
    },
    
    getMedia: async () => {
        const response = await fetch(`${API_BASE_URL}/notifications/media`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch media');
        return response.json();
    },
    
    deleteMedia: async (mediaId) => {
        const response = await fetch(`${API_BASE_URL}/notifications/media/${mediaId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to delete media');
        return response.json();
    },
    
    toggleMedia: async (mediaId) => {
        const response = await fetch(`${API_BASE_URL}/notifications/media/${mediaId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to toggle media');
        return response.json();
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
  },
};

export const dashboardAPI = {
  getStats: statsAPI.getDashboard,
  getAnalytics: statsAPI.getAnalytics
};

export const chatAPI = {
  getConversations: async (unreadOnly = false) => {
    const response = await api.get('/chat/conversations', {
      params: { unread_only: unreadOnly }
    });
    return response.data;
  },

  getMessages: async (telegramId, skip = 0, limit = 50) => {
    if (!telegramId) {
      throw new Error('Telegram ID required');
    }
    const response = await api.get(`/chat/messages/${telegramId}`, {
      params: { skip, limit }
    });
    return response.data;
  },

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

  markAsRead: async (telegramId) => {
    if (!telegramId) {
      throw new Error('Telegram ID required');
    }
    const response = await api.patch(`/chat/mark-read/${telegramId}`);
    return response.data;
  },

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

  getStats: async () => {
    const response = await api.get('/chat/stats');
    return response.data;
  },

  getQuickReplies: async () => {
    const response = await api.get('/chat/quick-replies');
    return response.data;
  }
};

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

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const email = payload.email;

      let wsUrl;

      const currentHost = window.location.hostname;
      const currentPort = window.location.port;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

      if (currentPort) {
        wsUrl = `${protocol}//${currentHost}:${currentPort}/ws/chat/${encodeURIComponent(email)}`;
      } else {
        wsUrl = `${protocol}//${currentHost}/ws/chat/${encodeURIComponent(email)}`;
      }

      console.log('Attempting WebSocket connection to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

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
        this.reconnectDelay = 1000;

        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.send(JSON.stringify({ type: 'ping' }));
            } catch (e) {
              console.error('Error sending ping:', e);
            }
          }
        }, 30000);
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
      return;
    }

    this.reconnectAttempts++;
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, 30000);

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

  getSettings: async () => {
    const response = await api.get('/bot/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.put('/bot/settings', settings);
    return response.data;
  },

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

  updateExpense: async (expenseId, expense) => {
    if (!expenseId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid expense ID');
    }

    const response = await api.put(`/payouts/expenses/${expenseId}`, expense);
    return response.data;
  },

  deleteExpense: async (expenseId) => {
    if (!expenseId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid expense ID');
    }

    const response = await api.delete(`/payouts/expenses/${expenseId}`);
    return response.data;
  },

  payExpense: async (expenseId) => {
    if (!expenseId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid expense ID');
    }

    const response = await api.patch(`/payouts/expenses/${expenseId}/pay`);
    return response.data;
  },

  getCalculations: async () => {
    const response = await api.get('/payouts/calculations');
    return response.data;
  },

  processPayout: async (transaction) => {
    if (!transaction.partner_id || !transaction.amount || transaction.amount <= 0) {
      throw new Error('Valid partner ID and amount required');
    }

    const response = await api.post('/payouts/process', transaction);
    return response.data;
  },

  getHistory: async (partnerId = null) => {
    const params = partnerId ? { partner_id: partnerId } : {};
    const response = await api.get('/payouts/history', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/payouts/stats');
    return response.data;
  }
};

export const ticketsAPI = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await api.get(`/tickets${query ? `?${query}` : ''}`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },
  
  reply: async (ticketId, data) => {
    const response = await api.post(`/tickets/${ticketId}/reply`, data);
    return response.data;
  },
  
  updateStatus: async (ticketId, data) => {
    const response = await api.patch(`/tickets/${ticketId}/status`, data);
    return response.data;
  },
  
  assign: async (ticketId, data) => {
    const response = await api.post(`/tickets/${ticketId}/assign`, data);
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get('/tickets/stats/overview');
    return response.data;
  },
  
  search: async (query) => {
    const response = await api.post('/tickets/search', { query });
    return response.data;
  },
  
  delete: async (ticketId) => {
    const response = await api.delete(`/tickets/${ticketId}`);
    return response.data;
  }
};

export default api;
