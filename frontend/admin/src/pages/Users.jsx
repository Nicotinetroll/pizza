import React, { useState, useEffect } from 'react';
import { Crown, Edit, Check, X, AlertCircle, Search, Star, TrendingUp, Calendar } from 'lucide-react';
import { usersAPI } from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVIP, setEditingVIP] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVIP, setFilterVIP] = useState('all');
  const [vipForm, setVipForm] = useState({
    is_vip: false,
    vip_discount_percentage: 0,
    vip_expires: '',
    vip_notes: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('❌ Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const startEditVIP = (user) => {
    setEditingVIP(user._id);
    setVipForm({
      is_vip: user.is_vip || false,
      vip_discount_percentage: user.vip_discount_percentage || 0,
      vip_expires: user.vip_expires ? new Date(user.vip_expires).toISOString().split('T')[0] : '',
      vip_notes: user.vip_notes || ''
    });
  };

  const cancelEditVIP = () => {
    setEditingVIP(null);
    setVipForm({
      is_vip: false,
      vip_discount_percentage: 0,
      vip_expires: '',
      vip_notes: ''
    });
  };

  const saveVIPStatus = async (userId) => {
    try {
      const data = {
        ...vipForm,
        vip_expires: vipForm.vip_expires ? new Date(vipForm.vip_expires).toISOString() : null
      };

      await usersAPI.updateVIPStatus(userId, data);
      showToast('✅ VIP status updated successfully!', 'success');
      setEditingVIP(null);
      fetchUsers();
    } catch (error) {
      showToast('❌ Error updating VIP status', 'error');
    }
  };

  const showToast = (message, type) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.telegram_id?.toString().includes(searchQuery);

    const matchesVIP = filterVIP === 'all' ||
        (filterVIP === 'vip' && user.is_vip && user.vip_status === 'active') ||
        (filterVIP === 'regular' && (!user.is_vip || user.vip_status !== 'active'));

    return matchesSearch && matchesVIP;
  });

  const vipCount = users.filter(u => u.is_vip && u.vip_status === 'active').length;
  const totalRevenue = users.reduce((sum, user) => sum + (user.total_spent_usdt || 0), 0);

  if (loading) {
    return (
        <div className="users-section">
          <div className="section-header">
            <h2 className="skeleton" style={{width: '100px', height: '36px'}}></h2>
          </div>
          <div className="users-list">
            {[1,2,3,4,5].map(i => (
                <div key={i} className="user-card">
                  <div className="skeleton" style={{width: '100%', height: '100px', borderRadius: '12px'}}></div>
                </div>
            ))}
          </div>
        </div>
    );
  }

  return (
      <div className="users-section">
        <div className="section-header">
          <h2>Users ({users.length})</h2>
        </div>

        {/* Stats Overview */}
        <div className="users-stats">
          <div className="stat-mini">
            <div className="stat-mini-icon" style={{background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'}}>
              <Crown size={20} />
            </div>
            <div className="stat-mini-content">
              <span className="stat-mini-label">VIP Users</span>
              <span className="stat-mini-value">{vipCount}</span>
            </div>
          </div>

          <div className="stat-mini">
            <div className="stat-mini-icon" style={{background: 'linear-gradient(135deg, #30D158 0%, #00C896 100%)'}}>
              <TrendingUp size={20} />
            </div>
            <div className="stat-mini-content">
              <span className="stat-mini-label">Total Revenue</span>
              <span className="stat-mini-value">${formatPrice(totalRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="search-filter-bar">
          <div className="search-box">
            <Search size={20} />
            <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
                <button
                    className="clear-search"
                    onClick={() => setSearchQuery('')}
                >
                  <X size={16} />
                </button>
            )}
          </div>

          <select
              className="filter-select"
              value={filterVIP}
              onChange={(e) => setFilterVIP(e.target.value)}
          >
            <option value="all">All Users</option>
            <option value="vip">VIP Only</option>
            <option value="regular">Regular</option>
          </select>
        </div>

        {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={48} />
              <h3>No users found</h3>
              <p>
                {searchQuery || filterVIP !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Users will appear here after they interact with the bot'}
              </p>
            </div>
        ) : (
            <div className="users-list">
              {filteredUsers.map(user => (
                  <div
                      key={user._id}
                      className={`user-card ${user.is_vip && user.vip_status === 'active' ? 'vip-user' : ''}`}
                  >
                    {editingVIP === user._id ? (
                        <div className="vip-edit-form">
                          <h4>Edit VIP Status</h4>

                          <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={vipForm.is_vip}
                                onChange={(e) => setVipForm({...vipForm, is_vip: e.target.checked})}
                            />
                            <span>Enable VIP Status</span>
                          </label>

                          {vipForm.is_vip && (
                              <>
                                <div className="form-group">
                                  <label>Discount Percentage</label>
                                  <div className="discount-input">
                                    <input
                                        type="number"
                                        value={vipForm.vip_discount_percentage}
                                        onChange={(e) => setVipForm({...vipForm, vip_discount_percentage: parseFloat(e.target.value) || 0})}
                                        min="0"
                                        max="100"
                                    />
                                    <span className="discount-suffix">%</span>
                                  </div>
                                </div>

                                <div className="form-group">
                                  <label>Expires On (Optional)</label>
                                  <input
                                      type="date"
                                      value={vipForm.vip_expires}
                                      onChange={(e) => setVipForm({...vipForm, vip_expires: e.target.value})}
                                  />
                                </div>

                                <div className="form-group">
                                  <label>Notes (Optional)</label>
                                  <input
                                      type="text"
                                      placeholder="e.g., Loyal customer"
                                      value={vipForm.vip_notes}
                                      onChange={(e) => setVipForm({...vipForm, vip_notes: e.target.value})}
                                      maxLength={100}
                                  />
                                </div>
                              </>
                          )}

                          <div className="vip-edit-actions">
                            <button
                                className="btn btn-success"
                                onClick={() => saveVIPStatus(user._id)}
                            >
                              <Check size={16} /> Save
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={cancelEditVIP}
                            >
                              <X size={16} /> Cancel
                            </button>
                          </div>
                        </div>
                    ) : (
                        <>
                          <div className="user-header">
                            <div className="user-identity">
                              <div className="user-avatar">
                                {user.first_name?.[0] || user.username?.[0] || '?'}
                              </div>
                              <div className="user-info">
                                <h3>
                                  {user.first_name || user.last_name
                                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                      : user.username || 'Anonymous'}
                                  {user.is_vip && user.vip_status === 'active' && (
                                      <Crown size={16} className="vip-icon" />
                                  )}
                                </h3>
                                <span className="user-telegram">@{user.username || user.telegram_id}</span>
                              </div>
                            </div>

                            <button
                                className="btn-vip-toggle"
                                onClick={() => startEditVIP(user)}
                            >
                              <Crown size={16} />
                              {user.is_vip && user.vip_status === 'active' ? 'Edit VIP' : 'Make VIP'}
                            </button>
                          </div>

                          <div className="user-stats">
                            <div className="user-stat">
                              <span className="stat-label">Joined</span>
                              <span className="stat-value">
                        <Calendar size={14} />
                                {formatDate(user.created_at)}
                      </span>
                            </div>

                            <div className="user-stat">
                              <span className="stat-label">Orders</span>
                              <span className="stat-value">{user.total_orders || 0}</span>
                            </div>

                            <div className="user-stat">
                              <span className="stat-label">Spent</span>
                              <span className="stat-value price">${formatPrice(user.total_spent_usdt)}</span>
                            </div>
                          </div>

                          {user.is_vip && user.vip_status === 'active' && (
                              <div className="vip-info">
                                <Star size={16} />
                                <span>{user.vip_discount_percentage}% VIP Discount</span>
                                {user.vip_expires && (
                                    <span className="vip-expires">
                          • Expires {formatDate(user.vip_expires)}
                        </span>
                                )}
                              </div>
                          )}

                          <div className="user-badges">
                    <span className={`status status-${user.status || 'active'}`}>
                      {user.status || 'active'}
                    </span>
                            {user.total_orders > 10 && (
                                <span className="badge badge-loyal">Loyal Customer</span>
                            )}
                            {user.total_spent_usdt > 1000 && (
                                <span className="badge badge-premium">High Value</span>
                            )}
                          </div>
                        </>
                    )}
                  </div>
              ))}
            </div>
        )}

        {/* VIP Info Section */}
        <div className="vip-guide card">
          <div className="vip-guide-header">
            <h3>
              <Crown size={24} />
              VIP Program Guide
            </h3>
          </div>

          <div className="vip-guide-content">
            <div className="vip-benefits">
              <h4>VIP Benefits</h4>
              <ul>
                <li>✨ Custom discount on ALL products</li>
                <li>🎯 Automatic discount application in bot</li>
                <li>👑 VIP badge in welcome message</li>
                <li>⚡ Priority support</li>
              </ul>
            </div>

            <div className="vip-instructions">
              <h4>How to Set VIP</h4>
              <ol>
                <li>Click "Make VIP" on any user</li>
                <li>Enable VIP status</li>
                <li>Set discount percentage</li>
                <li>Optionally set expiration</li>
                <li>Save changes</li>
              </ol>
            </div>
          </div>
        </div>

        <style jsx>{`
        .users-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-mini {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--separator);
          border-radius: var(--radius);
          padding: 20px;
        }

        .stat-mini-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .stat-mini-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-mini-label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .stat-mini-value {
          font-size: 24px;
          font-weight: 700;
        }

        .search-filter-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .search-box {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-box svg {
          position: absolute;
          left: 16px;
          color: var(--text-secondary);
          pointer-events: none;
        }

        .search-box input {
          width: 100%;
          padding: 12px 44px;
          background: var(--bg-secondary);
          border: 1px solid var(--separator);
          border-radius: var(--radius-small);
          color: var(--text-primary);
          font-size: 16px;
        }

        .clear-search {
          position: absolute;
          right: 12px;
          background: var(--bg-tertiary);
          border: none;
          padding: 6px;
          border-radius: 50%;
          cursor: pointer;
          color: var(--text-secondary);
        }

        .filter-select {
          padding: 12px 20px;
          background: var(--bg-secondary);
          border: 1px solid var(--separator);
          border-radius: var(--radius-small);
          color: var(--text-primary);
          font-size: 16px;
          cursor: pointer;
        }

        .users-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .user-card {
          background: var(--bg-secondary);
          border: 1px solid var(--separator);
          border-radius: var(--radius);
          padding: 24px;
          transition: var(--transition);
          position: relative;
          overflow: hidden;
        }

        .user-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          transform: translateY(-2px);
        }

        .user-card.vip-user {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(255, 215, 0, 0.05) 100%);
          border-color: rgba(255, 215, 0, 0.3);
        }

        .user-card.vip-user::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
        }

        .user-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .user-identity {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
        }

        .user-info h3 {
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .vip-icon {
          color: #FFD700;
        }

        .user-telegram {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .btn-vip-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 20px;
          color: #FFD700;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
        }

        .btn-vip-toggle:hover {
          background: rgba(255, 215, 0, 0.2);
          transform: translateY(-1px);
        }

        .user-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .user-stat {
          text-align: center;
          padding: 12px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-small);
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 16px;
          font-weight: 600;
        }

        .stat-value.price {
          color: var(--accent-success);
        }

        .vip-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.2);
          border-radius: var(--radius-small);
          margin-bottom: 16px;
          font-size: 14px;
          color: #FFD700;
        }

        .vip-expires {
          color: rgba(255, 215, 0, 0.7);
          font-size: 13px;
        }

        .user-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-loyal {
          background: rgba(100, 210, 255, 0.2);
          color: var(--accent-teal);
        }

        .badge-premium {
          background: rgba(191, 90, 242, 0.2);
          color: var(--accent-purple);
        }

        /* VIP Edit Form */
        .vip-edit-form {
          animation: slideDown 0.3s ease-out;
        }

        .vip-edit-form h4 {
          margin-bottom: 20px;
          font-size: 18px;
          font-weight: 600;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          cursor: pointer;
          font-size: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .discount-input {
          position: relative;
          display: flex;
          align-items: center;
        }

        .discount-input input {
          width: 100%;
          padding-right: 40px;
        }

        .discount-suffix {
          position: absolute;
          right: 16px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .vip-edit-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        /* VIP Guide */
        .vip-guide {
          margin-top: 32px;
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(255, 215, 0, 0.02) 100%);
          border-color: rgba(255, 215, 0, 0.2);
        }

        .vip-guide-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--separator);
        }

        .vip-guide-header h3 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 600;
          color: #FFD700;
        }

        .vip-guide-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .vip-benefits h4,
        .vip-instructions h4 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--text-primary);
        }

        .vip-benefits ul {
          list-style: none;
          padding: 0;
        }

        .vip-benefits li {
          padding: 8px 0;
          color: var(--text-secondary);
        }

        .vip-instructions ol {
          margin-left: 20px;
          color: var(--text-secondary);
        }

        .vip-instructions li {
          padding: 4px 0;
        }

        @media (max-width: 768px) {
          .users-list {
            grid-template-columns: 1fr;
          }
          
          .vip-guide-content {
            grid-template-columns: 1fr;
          }
          
          .user-stats {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        @media (max-width: 640px) {
          .user-header {
            flex-direction: column;
            gap: 12px;
          }
          
          .btn-vip-toggle {
            width: 100%;
            justify-content: center;
          }
          
          .vip-edit-actions {
            flex-direction: column;
          }
          
          .vip-edit-actions button {
            width: 100%;
          }
        }
      `}</style>
      </div>
  );
};

export default Users;