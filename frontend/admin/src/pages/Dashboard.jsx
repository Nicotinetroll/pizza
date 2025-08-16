import React, { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Users, Package, AlertCircle, Crown, TrendingUp, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { statsAPI, ordersAPI, adminAPI } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearingData, setClearingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [statsRes, ordersRes] = await Promise.all([
        statsAPI.getDashboard(),
        ordersAPI.getAll()
      ]);

      setStats(statsRes.stats || {});
      setRecentOrders(ordersRes.orders?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const clearOrders = async () => {
    if (!confirm('⚠️ Clear all orders and reset user stats?\n\nThis action cannot be undone!')) return;

    setClearingData(true);
    try {
      await adminAPI.clearOrders();
      showToast('✅ Orders cleared successfully!', 'success');
      fetchData();
    } catch (error) {
      showToast('❌ Error clearing orders', 'error');
    } finally {
      setClearingData(false);
    }
  };

  const clearUsers = async () => {
    if (!confirm('⚠️ Clear all users?\n\nThis will remove all user data!\nThis action cannot be undone!')) return;

    setClearingData(true);
    try {
      await adminAPI.clearUsers();
      showToast('✅ Users cleared successfully!', 'success');
      fetchData();
    } catch (error) {
      showToast('❌ Error clearing users', 'error');
    } finally {
      setClearingData(false);
    }
  };

  const showToast = (message, type) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  // Calculate growth percentages (mock data for demo)
  const growthData = {
    orders: 12.5,
    revenue: 23.8,
    users: 8.3,
    products: 0
  };

  if (loading) {
    return (
        <div className="dashboard">
          <h2 className="skeleton" style={{width: '200px', height: '40px', marginBottom: '30px'}}></h2>
          <div className="stats-grid">
            {[1,2,3,4,5,6].map(i => (
                <div key={i} className="stat-card">
                  <div className="skeleton" style={{width: '48px', height: '48px', borderRadius: '16px', marginBottom: '12px'}}></div>
                  <div className="skeleton" style={{width: '80px', height: '16px', marginBottom: '8px'}}></div>
                  <div className="skeleton" style={{width: '100px', height: '32px'}}></div>
                </div>
            ))}
          </div>
        </div>
    );
  }

  return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          {refreshing && (
              <div className="refresh-indicator">
                <Activity size={16} className="spin" />
                <span>Updating...</span>
              </div>
          )}
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)'}}>
              <ShoppingCart />
            </div>
            <div className="stat-content">
              <h3>Total Orders</h3>
              <p className="stat-number">{formatNumber(stats.total_orders || 0)}</p>
              {growthData.orders > 0 && (
                  <div className="stat-growth positive">
                    <ArrowUp size={14} />
                    <span>{growthData.orders}%</span>
                  </div>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #30D158 0%, #00C896 100%)'}}>
              <DollarSign />
            </div>
            <div className="stat-content">
              <h3>Revenue</h3>
              <p className="stat-number">${formatNumber(stats.total_revenue_usdt || 0)}</p>
              {growthData.revenue > 0 && (
                  <div className="stat-growth positive">
                    <ArrowUp size={14} />
                    <span>{growthData.revenue}%</span>
                  </div>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #FF9F0A 0%, #FF6B6B 100%)'}}>
              <Users />
            </div>
            <div className="stat-content">
              <h3>Users</h3>
              <p className="stat-number">{formatNumber(stats.total_users || 0)}</p>
              {growthData.users > 0 && (
                  <div className="stat-growth positive">
                    <ArrowUp size={14} />
                    <span>{growthData.users}%</span>
                  </div>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #64D2FF 0%, #00F2FE 100%)'}}>
              <Package />
            </div>
            <div className="stat-content">
              <h3>Products</h3>
              <p className="stat-number">{formatNumber(stats.total_products || 0)}</p>
              <div className="stat-growth neutral">
                <span>—</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'}}>
              <Crown />
            </div>
            <div className="stat-content">
              <h3>VIP Users</h3>
              <p className="stat-number">{formatNumber(stats.vip_users || 0)}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #BF5AF2 0%, #FF453A 100%)'}}>
              <TrendingUp />
            </div>
            <div className="stat-content">
              <h3>Categories</h3>
              <p className="stat-number">{formatNumber(stats.total_categories || 0)}</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="card recent-orders-card">
            <div className="card-header">
              <h3>Recent Orders</h3>
              <button className="btn-link" onClick={() => window.location.hash = '#orders'}>
                View All →
              </button>
            </div>

            {recentOrders.length === 0 ? (
                <div className="empty-state">
                  <ShoppingCart size={48} />
                  <h3>No orders yet</h3>
                  <p>Orders will appear here when customers make purchases</p>
                </div>
            ) : (
                <div className="orders-list">
                  {recentOrders.map(order => (
                      <div key={order._id} className="order-item">
                        <div className="order-info">
                          <span className="order-number">{order.order_number}</span>
                          <span className="order-date">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                        </div>
                        <div className="order-details">
                          <span className="order-customer">@{order.telegram_id}</span>
                          <span className="order-total">${formatPrice(order.total_usdt)}</span>
                          <span className={`status status-${order.status}`}>{order.status}</span>
                        </div>
                      </div>
                  ))}
                </div>
            )}
          </div>

          <div className="card danger-zone">
            <div className="card-header">
              <h3 style={{ color: 'var(--accent-danger)' }}>
                <AlertCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Danger Zone
              </h3>
            </div>
            <div className="danger-content">
              <p className="danger-warning">
                These actions are irreversible and will permanently delete data.
              </p>
              <div className="danger-actions">
                <button
                    onClick={clearOrders}
                    disabled={clearingData}
                    className="btn btn-danger"
                >
                  {clearingData ? 'Processing...' : '🗑️ Clear All Orders'}
                </button>
                <button
                    onClick={clearUsers}
                    disabled={clearingData}
                    className="btn btn-danger"
                >
                  {clearingData ? 'Processing...' : '🗑️ Clear All Users'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .refresh-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .stat-growth {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          margin-top: 8px;
          font-weight: 600;
        }

        .stat-growth.positive {
          color: var(--accent-success);
        }

        .stat-growth.negative {
          color: var(--accent-danger);
        }

        .stat-growth.neutral {
          color: var(--text-tertiary);
        }

        .dashboard-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-top: 32px;
        }

        @media (max-width: 968px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }
        }

        .card {
          background: var(--bg-secondary);
          border-radius: var(--radius);
          padding: 24px;
          border: 1px solid var(--separator);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-header h3 {
          font-size: 20px;
          font-weight: 600;
        }

        .btn-link {
          background: none;
          border: none;
          color: var(--accent-primary);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: var(--transition);
        }

        .btn-link:hover {
          transform: translateX(4px);
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .order-item {
          padding: 16px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-small);
          border: 1px solid var(--separator);
          transition: var(--transition);
        }

        .order-item:hover {
          background: var(--bg-elevated);
          transform: translateX(4px);
        }

        .order-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .order-number {
          font-family: 'SF Mono', monospace;
          font-weight: 600;
          color: var(--accent-primary);
        }

        .order-date {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .order-details {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .order-customer {
          color: var(--text-secondary);
          flex: 1;
        }

        .order-total {
          font-weight: 600;
          color: var(--accent-success);
        }

        .danger-zone {
          border-color: rgba(255, 69, 58, 0.3);
        }

        .danger-content {
          text-align: center;
        }

        .danger-warning {
          color: var(--text-secondary);
          margin-bottom: 20px;
          font-size: 14px;
        }

        .danger-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .danger-actions {
            flex-direction: column;
          }
          
          .danger-actions button {
            width: 100%;
          }
        }

        .toast {
          transition: all 0.3s ease;
        }

        .toast-success {
          border-left: 4px solid var(--accent-success);
        }

        .toast-error {
          border-left: 4px solid var(--accent-danger);
        }
      `}</style>
      </div>
  );
};

export default Dashboard;