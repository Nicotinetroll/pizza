import React, { useState, useEffect } from 'react';
import { ShoppingCart, DollarSign, Users, Package, AlertCircle } from 'lucide-react';
import { statsAPI, ordersAPI, adminAPI } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearingData, setClearingData] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
    }
  };

  const clearOrders = async () => {
    if (!confirm('⚠️ Clear all orders and reset user stats?\n\nThis action cannot be undone!')) return;
    
    setClearingData(true);
    try {
      await adminAPI.clearOrders();
      alert('✅ Orders cleared successfully!');
      fetchData();
    } catch (error) {
      alert('❌ Error clearing orders: ' + error.message);
    } finally {
      setClearingData(false);
    }
  };

  const clearUsers = async () => {
    if (!confirm('⚠️ Clear all users?\n\nThis will remove all user data!\nThis action cannot be undone!')) return;
    
    setClearingData(true);
    try {
      await adminAPI.clearUsers();
      alert('✅ Users cleared successfully!');
      fetchData();
    } catch (error) {
      alert('❌ Error clearing users: ' + error.message);
    } finally {
      setClearingData(false);
    }
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orders">
            <ShoppingCart />
          </div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <p className="stat-number">{stats.total_orders || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <DollarSign />
          </div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <p className="stat-number">${formatPrice(stats.total_revenue_usdt)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon users">
            <Users />
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.total_users || 0}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon products">
            <Package />
          </div>
          <div className="stat-content">
            <h3>Active Products</h3>
            <p className="stat-number">{stats.total_products || 0}</p>
          </div>
        </div>
      </div>

      <div className="recent-orders">
        <h3>Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <div style={{padding: '20px', color: '#888', textAlign: 'center'}}>
            No orders yet
          </div>
        ) : (
          recentOrders.map(order => (
            <div key={order._id} className="recent-order">
              <span className="order-num">{order.order_number}</span>
              <span className="order-date">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
              <span className="order-total">${formatPrice(order.total_usdt)}</span>
              <span className={`status status-${order.status}`}>{order.status}</span>
            </div>
          ))
        )}
      </div>

      <div className="admin-actions">
        <h3>⚠️ Danger Zone</h3>
        <div style={{
          display: 'flex', 
          gap: '10px', 
          padding: '20px',
          background: 'rgba(255, 68, 68, 0.1)',
          borderRadius: '10px',
          border: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <button 
            onClick={clearOrders} 
            disabled={clearingData}
            style={{
              padding: '10px 20px',
              background: '#ff4444',
              border: 'none',
              borderRadius: '5px',
              color: 'white',
              cursor: clearingData ? 'not-allowed' : 'pointer',
              opacity: clearingData ? 0.5 : 1
            }}
          >
            {clearingData ? 'Clearing...' : '🗑️ Clear All Orders'}
          </button>
          
          <button 
            onClick={clearUsers}
            disabled={clearingData}
            style={{
              padding: '10px 20px',
              background: '#ff4444',
              border: 'none',
              borderRadius: '5px',
              color: 'white',
              cursor: clearingData ? 'not-allowed' : 'pointer',
              opacity: clearingData ? 0.5 : 1
            }}
          >
            {clearingData ? 'Clearing...' : '🗑️ Clear All Users'}
          </button>
        </div>
        <p style={{
          fontSize: '12px',
          color: '#ff6b6b',
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <AlertCircle size={16} />
          These actions cannot be undone!
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
