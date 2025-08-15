import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="users-section">
      <div className="section-header">
        <h2>Users ({users.length})</h2>
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
                <th>Last Active</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>{user.telegram_id}</td>
                  <td>@{user.username || 'N/A'}</td>
                  <td>
                    {user.first_name || ''} {user.last_name || ''}
                    {!user.first_name && !user.last_name && 'Anonymous'}
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>{formatDate(user.last_active)}</td>
                  <td>{user.total_orders || 0}</td>
                  <td className="price">${formatPrice(user.total_spent_usdt)}</td>
                  <td>
                    <span className={`status status-${user.status || 'active'}`}>
                      {user.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Users;
