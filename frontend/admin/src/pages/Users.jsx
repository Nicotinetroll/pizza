import React, { useState, useEffect } from 'react';
import { Crown, Edit, Check, X, AlertCircle } from 'lucide-react';
import { usersAPI } from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVIP, setEditingVIP] = useState(null);
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
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
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
      alert('✅ VIP status updated successfully!');
      setEditingVIP(null);
      fetchUsers();
    } catch (error) {
      alert('❌ Error updating VIP status: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
      <div className="users-section">
        <div className="section-header">
          <h2>Users ({users.length})</h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Crown size={20} style={{ color: '#ffd700' }} />
            <span style={{ color: '#ffd700' }}>
            {users.filter(u => u.is_vip && u.vip_status === 'active').length} VIP Users
          </span>
          </div>
        </div>

        <div className="users-table">
          {users.length === 0 ? (
              <div style={{padding: '40px', textAlign: 'center', color: '#888'}}>
                No users yet. Users will appear here after they interact with the Telegram bot.
              </div>
          ) : (
              <table>
                <thead>
                <tr>
                  <th>Telegram ID</th>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Joined</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Status</th>
                  <th>VIP</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {users.map(user => (
                    <tr key={user._id} style={{
                      background: user.is_vip && user.vip_status === 'active' ? 'rgba(255, 215, 0, 0.05)' : 'transparent'
                    }}>
                      <td>{user.telegram_id}</td>
                      <td>@{user.username || 'N/A'}</td>
                      <td>
                        {user.first_name || ''} {user.last_name || ''}
                        {!user.first_name && !user.last_name && 'Anonymous'}
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>{user.total_orders || 0}</td>
                      <td className="price">${formatPrice(user.total_spent_usdt)}</td>
                      <td>
                    <span className={`status status-${user.status || 'active'}`}>
                      {user.status || 'active'}
                    </span>
                      </td>
                      <td>
                        {editingVIP === user._id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="checkbox"
                                    checked={vipForm.is_vip}
                                    onChange={(e) => setVipForm({...vipForm, is_vip: e.target.checked})}
                                />
                                VIP
                              </label>
                              <input
                                  type="number"
                                  placeholder="Discount %"
                                  value={vipForm.vip_discount_percentage}
                                  onChange={(e) => setVipForm({...vipForm, vip_discount_percentage: parseFloat(e.target.value) || 0})}
                                  min="0"
                                  max="100"
                                  style={{
                                    padding: '5px',
                                    background: '#2a2a2a',
                                    border: '1px solid #3a3a3a',
                                    borderRadius: '5px',
                                    color: '#fff',
                                    width: '80px'
                                  }}
                              />
                              <input
                                  type="date"
                                  placeholder="Expires"
                                  value={vipForm.vip_expires}
                                  onChange={(e) => setVipForm({...vipForm, vip_expires: e.target.value})}
                                  style={{
                                    padding: '5px',
                                    background: '#2a2a2a',
                                    border: '1px solid #3a3a3a',
                                    borderRadius: '5px',
                                    color: '#fff',
                                    width: '120px'
                                  }}
                              />
                              <input
                                  type="text"
                                  placeholder="Notes"
                                  value={vipForm.vip_notes}
                                  onChange={(e) => setVipForm({...vipForm, vip_notes: e.target.value})}
                                  style={{
                                    padding: '5px',
                                    background: '#2a2a2a',
                                    border: '1px solid #3a3a3a',
                                    borderRadius: '5px',
                                    color: '#fff',
                                    width: '120px'
                                  }}
                              />
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {user.vip_status === 'active' ? (
                                  <>
                                    <Crown size={16} style={{ color: '#ffd700' }} />
                                    <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
                              {user.vip_discount_percentage}% OFF
                            </span>
                                  </>
                              ) : user.vip_status === 'expired' ? (
                                  <span style={{ color: '#ff6b6b' }}>Expired</span>
                              ) : (
                                  <span style={{ color: '#666' }}>—</span>
                              )}
                            </div>
                        )}
                      </td>
                      <td>
                        {editingVIP === user._id ? (
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button
                                  onClick={() => saveVIPStatus(user._id)}
                                  style={{
                                    padding: '5px',
                                    background: '#00c896',
                                    border: 'none',
                                    borderRadius: '5px',
                                    color: '#fff',
                                    cursor: 'pointer'
                                  }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                  onClick={cancelEditVIP}
                                  style={{
                                    padding: '5px',
                                    background: '#ff4444',
                                    border: 'none',
                                    borderRadius: '5px',
                                    color: '#fff',
                                    cursor: 'pointer'
                                  }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => startEditVIP(user)}
                                style={{
                                  padding: '5px 10px',
                                  background: '#667eea',
                                  border: 'none',
                                  borderRadius: '5px',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px'
                                }}
                            >
                              <Crown size={14} />
                              VIP
                            </button>
                        )}
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
          )}
        </div>

        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: '#1a1a1a',
          borderRadius: '15px',
          border: '1px solid #ffd700'
        }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <Crown size={24} style={{ color: '#ffd700' }} />
            VIP Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#ffd700', marginBottom: '10px' }}>VIP Benefits</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>✅ Custom discount on ALL products</li>
                <li>✅ Discount applies automatically in bot</li>
                <li>✅ Shows VIP badge in welcome message</li>
                <li>✅ Priority support</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#ffd700', marginBottom: '10px' }}>How to Set VIP</h4>
              <ol style={{ marginLeft: '20px' }}>
                <li>Click the VIP button for a user</li>
                <li>Check the VIP checkbox</li>
                <li>Set discount percentage (0-100%)</li>
                <li>Optionally set expiration date</li>
                <li>Add notes if needed</li>
                <li>Click the check button to save</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Users;