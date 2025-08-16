import React, { useState, useEffect } from 'react';
import { RefreshCw, Tag, ChevronDown, ChevronUp, Calendar, MapPin, CreditCard, Package, ShoppingCart } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

  // API helper functions
  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  };

  const ordersAPI = {
    getAll: () => apiCall('/api/orders'),
    updateStatus: (id, status) => apiCall(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await ordersAPI.getAll();
      setOrders(response.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showToast('❌ Error loading orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      showToast('✅ Order status updated!', 'success');
      fetchOrders();
    } catch (error) {
      showToast('❌ Error updating order status', 'error');
    }
  };

  const showToast = (message, type) => {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 500;
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
      max-width: 90vw;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (loading) {
    return (
        <div className="orders-section">
          <div className="section-header">
            <h2 className="skeleton" style={{width: '120px', height: '36px'}}></h2>
            <div className="skeleton" style={{width: '100px', height: '44px', borderRadius: '12px'}}></div>
          </div>
          <div className="orders-list">
            {[1,2,3,4,5].map(i => (
                <div key={i} className="order-card skeleton" style={{height: '180px'}}></div>
            ))}
          </div>
        </div>
    );
  }

  return (
      <div className="orders-section">
        <div className="section-header">
          <h2>Orders ({orders.length})</h2>
          <button onClick={fetchOrders} className="btn btn-secondary">
            <RefreshCw size={20} /> Refresh
          </button>
        </div>

        {orders.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={48} />
              <h3>No orders yet</h3>
              <p>Orders will appear here when customers purchase through the Telegram bot.</p>
            </div>
        ) : (
            <div className="orders-list">
              {orders.map(order => (
                  <div key={order._id} className="order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <h3 className="order-number">{order.order_number}</h3>
                        <div className="order-meta">
                    <span className="order-date">
                      <Calendar size={14} />
                      {formatDate(order.created_at)}
                    </span>
                          <span className="order-customer">@{order.telegram_id}</span>
                        </div>
                      </div>
                      <button
                          className="expand-button"
                          onClick={() => toggleOrderDetails(order._id)}
                      >
                        {expandedOrder === order._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>

                    <div className="order-summary">
                      <div className="order-items">
                        <Package size={16} />
                        <div className="items-list">
                          {order.items?.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="item-preview">
                                <strong>{item.quantity}x</strong> {item.product_name}
                              </div>
                          ))}
                          {order.items?.length > 2 && (
                              <div className="more-items">
                                +{order.items.length - 2} more items
                              </div>
                          )}
                        </div>
                      </div>

                      <div className="order-stats">
                        <div className="stat">
                          <MapPin size={14} />
                          <span>{order.delivery_city}, {order.delivery_country}</span>
                        </div>
                        <div className="stat">
                          <CreditCard size={14} />
                          <span>{order.payment?.method || 'N/A'}</span>
                        </div>
                        {order.referral_code && (
                            <div className="stat">
                              <Tag size={14} />
                              <code>{order.referral_code}</code>
                            </div>
                        )}
                      </div>
                    </div>

                    <div className="order-footer">
                      <div className="order-total">
                        <span className="total-label">Total</span>
                        <span className="total-amount">
                    ${formatPrice(order.total_usdt)}
                  </span>
                        {order.has_discount && (
                            <span className="original-price">
                      ${formatPrice((order.total_usdt || 0) + (order.discount_amount || 0))}
                    </span>
                        )}
                      </div>

                      <div className="order-status-wrapper">
                        <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                            className={`status-select status-${order.status}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="processing">Processing</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {expandedOrder === order._id && (
                        <div className="order-details">
                          <div className="details-grid">
                            <div className="detail-section">
                              <h4>Order Information</h4>
                              <div className="detail-item">
                                <span className="detail-label">Order ID</span>
                                <span className="detail-value">{order._id}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Created</span>
                                <span className="detail-value">{new Date(order.created_at).toLocaleString()}</span>
                              </div>
                              {order.paid_at && (
                                  <div className="detail-item">
                                    <span className="detail-label">Paid</span>
                                    <span className="detail-value">{new Date(order.paid_at).toLocaleString()}</span>
                                  </div>
                              )}
                              {order.payment?.transaction_id && (
                                  <div className="detail-item">
                                    <span className="detail-label">Transaction</span>
                                    <code className="detail-value">{order.payment.transaction_id}</code>
                                  </div>
                              )}
                            </div>

                            <div className="detail-section">
                              <h4>Items Breakdown</h4>
                              {order.items?.map((item, idx) => (
                                  <div key={idx} className="item-detail">
                          <span className="item-name">
                            {item.quantity}x {item.product_name}
                          </span>
                                    <span className="item-price">
                            ${formatPrice(item.price_usdt)} × {item.quantity} = ${formatPrice(item.subtotal_usdt)}
                          </span>
                                  </div>
                              ))}
                              {order.has_discount && (
                                  <div className="discount-detail">
                                    <div className="item-detail">
                                      <span>Subtotal</span>
                                      <span>${formatPrice((order.total_usdt || 0) + (order.discount_amount || 0))}</span>
                                    </div>
                                    <div className="item-detail discount">
                                      <span>Discount ({order.referral_code})</span>
                                      <span>-${formatPrice(order.discount_amount || 0)}</span>
                                    </div>
                                    <div className="item-detail total">
                                      <span>Final Total</span>
                                      <span>${formatPrice(order.total_usdt)}</span>
                                    </div>
                                  </div>
                              )}
                            </div>
                          </div>
                        </div>
                    )}
                  </div>
              ))}
            </div>
        )}

        <style jsx>{`
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 24px;
        }

        .order-card {
          background: var(--bg-secondary);
          border: 1px solid var(--separator);
          border-radius: var(--radius);
          padding: 24px;
          transition: var(--transition);
        }

        .order-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .order-info {
          flex: 1;
        }

        .order-number {
          font-family: 'SF Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: var(--accent-primary);
          margin-bottom: 8px;
        }

        .order-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .order-date,
        .order-customer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .expand-button {
          background: var(--bg-tertiary);
          border: 1px solid var(--separator);
          border-radius: var(--radius-small);
          padding: 8px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: var(--transition);
        }

        .expand-button:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        .order-summary {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          margin-bottom: 20px;
        }

        .order-items {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .order-items svg {
          color: var(--text-secondary);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .item-preview {
          font-size: 14px;
          color: var(--text-primary);
        }

        .more-items {
          font-size: 13px;
          color: var(--text-secondary);
          font-style: italic;
        }

        .order-stats {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .stat code {
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 6px;
          font-family: 'SF Mono', monospace;
          color: var(--accent-warning);
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid var(--separator);
          flex-wrap: wrap;
          gap: 16px;
        }

        .order-total {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .total-label {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .total-amount {
          font-size: 24px;
          font-weight: 700;
          color: var(--accent-success);
        }

        .original-price {
          font-size: 16px;
          color: var(--text-secondary);
          text-decoration: line-through;
        }

        .status-select {
          padding: 8px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--separator);
          border-radius: 20px;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: var(--transition);
        }

        .status-select.status-pending {
          background: rgba(255, 159, 10, 0.2);
          color: var(--accent-warning);
          border-color: rgba(255, 159, 10, 0.3);
        }

        .status-select.status-paid,
        .status-select.status-completed {
          background: rgba(48, 209, 88, 0.2);
          color: var(--accent-success);
          border-color: rgba(48, 209, 88, 0.3);
        }

        .status-select.status-processing {
          background: rgba(100, 210, 255, 0.2);
          color: var(--accent-teal);
          border-color: rgba(100, 210, 255, 0.3);
        }

        .status-select.status-cancelled {
          background: rgba(255, 69, 58, 0.2);
          color: var(--accent-danger);
          border-color: rgba(255, 69, 58, 0.3);
        }

        .order-details {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 2px solid var(--separator);
          animation: slideDown 0.3s ease-out;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .detail-section h4 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: var(--accent-primary);
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--separator);
        }

        .detail-label {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .detail-value {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
          word-break: break-all;
        }

        .item-detail {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }

        .item-name {
          color: var(--text-primary);
        }

        .item-price {
          color: var(--text-secondary);
          font-family: 'SF Mono', monospace;
        }

        .discount-detail {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--separator);
        }

        .item-detail.discount {
          color: var(--accent-success);
        }

        .item-detail.total {
          font-weight: 700;
          font-size: 16px;
          border-top: 1px solid var(--separator);
          margin-top: 8px;
          padding-top: 12px;
        }

        @media (max-width: 768px) {
          .order-summary {
            grid-template-columns: 1fr;
          }

          .order-stats {
            padding-top: 16px;
            border-top: 1px solid var(--separator);
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .order-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .order-total {
            justify-content: center;
          }

          .status-select {
            width: 100%;
            text-align: center;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      </div>
  );
};

export default Orders;