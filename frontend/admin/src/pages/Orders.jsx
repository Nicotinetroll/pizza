import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { ordersAPI } from '../services/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      fetchOrders();
    } catch (error) {
      alert('❌ Error updating order status: ' + error.message);
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
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div className="orders-section">
      <div className="section-header">
        <h2>Orders ({orders.length})</h2>
        <button onClick={fetchOrders} className="btn-refresh">
          <RefreshCw size={20} /> Refresh
        </button>
      </div>

      <div className="orders-table">
        {orders.length === 0 ? (
          <div style={{padding: '40px', textAlign: 'center', color: '#888'}}>
            No orders yet. Orders will appear here when customers order through the Telegram bot.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Location</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id}>
                  <td className="order-number">{order.order_number}</td>
                  <td>{formatDate(order.created_at)}</td>
                  <td>@{order.telegram_id}</td>
                  <td>
                    <div style={{maxWidth: '200px'}}>
                      {order.items?.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '2px 0',
                          borderBottom: idx < order.items.length - 1 ? '1px solid #333' : 'none'
                        }}>
                          <strong>{item.quantity}x</strong> {item.product_name}
                          <br />
                          <small style={{color: '#888'}}>
                            ${formatPrice(item.subtotal_usdt)}
                          </small>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="price">${formatPrice(order.total_usdt)}</td>
                  <td>{order.delivery_city}, {order.delivery_country}</td>
                  <td>{order.payment?.method}</td>
                  <td>
                    <span className={`status status-${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <select 
                      value={order.status} 
                      onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                      className="status-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
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

export default Orders;
