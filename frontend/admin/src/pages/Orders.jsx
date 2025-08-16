import React, { useState, useEffect } from 'react';
import { RefreshCw, Tag } from 'lucide-react';
import { ordersAPI } from '../services/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);

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

  const toggleOrderDetails = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
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
                  <th>Discount</th>
                  <th>Location</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {orders.map(order => (
                    <React.Fragment key={order._id}>
                      <tr
                          onClick={() => toggleOrderDetails(order._id)}
                          style={{ cursor: 'pointer' }}
                      >
                        <td className="order-number">{order.order_number}</td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>@{order.telegram_id}</td>
                        <td>
                          <div style={{maxWidth: '200px'}}>
                            {order.items?.slice(0, 2).map((item, idx) => (
                                <div key={idx} style={{
                                  padding: '2px 0',
                                  borderBottom: idx < Math.min(order.items.length, 2) - 1 ? '1px solid #333' : 'none'
                                }}>
                                  <strong>{item.quantity}x</strong> {item.product_name}
                                </div>
                            ))}
                            {order.items?.length > 2 && (
                                <div style={{ color: '#888', fontSize: '12px', marginTop: '5px' }}>
                                  +{order.items.length - 2} more items
                                </div>
                            )}
                          </div>
                        </td>
                        <td className="price">
                          ${formatPrice(order.total_usdt)}
                          {order.has_discount && (
                              <div style={{
                                fontSize: '11px',
                                color: '#888',
                                textDecoration: 'line-through'
                              }}>
                                ${formatPrice((order.total_usdt || 0) + (order.discount_amount || 0))}
                              </div>
                          )}
                        </td>
                        <td>
                          {order.referral_code ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Tag size={14} />
                                <code style={{
                                  background: '#2a2a2a',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontSize: '11px'
                                }}>
                                  {order.referral_code}
                                </code>
                                <span style={{ color: '#00c896', fontSize: '11px' }}>
                            -${formatPrice(order.discount_amount || 0)}
                          </span>
                              </div>
                          ) : (
                              <span style={{ color: '#666' }}>—</span>
                          )}
                        </td>
                        <td>{order.delivery_city}, {order.delivery_country}</td>
                        <td>{order.payment?.method}</td>
                        <td>
                      <span className={`status status-${order.status}`}>
                        {order.status}
                      </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
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
                      {expandedOrder === order._id && (
                          <tr>
                            <td colSpan="10" style={{
                              background: '#1a1a1a',
                              padding: '20px',
                              borderTop: '2px solid #667eea'
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                  <h4 style={{ marginBottom: '10px', color: '#667eea' }}>Order Details</h4>
                                  <p><strong>Order ID:</strong> {order._id}</p>
                                  <p><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</p>
                                  {order.paid_at && (
                                      <p><strong>Paid:</strong> {new Date(order.paid_at).toLocaleString()}</p>
                                  )}
                                  {order.payment?.transaction_id && (
                                      <p><strong>Transaction:</strong> <code>{order.payment.transaction_id}</code></p>
                                  )}
                                </div>
                                <div>
                                  <h4 style={{ marginBottom: '10px', color: '#667eea' }}>Items Breakdown</h4>
                                  {order.items?.map((item, idx) => (
                                      <div key={idx} style={{ marginBottom: '5px' }}>
                                        • {item.quantity}x {item.product_name} @ ${formatPrice(item.price_usdt)}
                                        = ${formatPrice(item.subtotal_usdt)}
                                      </div>
                                  ))}
                                  {order.has_discount && (
                                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #3a3a3a' }}>
                                        <p>Subtotal: ${formatPrice((order.total_usdt || 0) + (order.discount_amount || 0))}</p>
                                        <p style={{ color: '#00c896' }}>
                                          Discount ({order.referral_code}): -${formatPrice(order.discount_amount || 0)}
                                        </p>
                                        <p><strong>Final Total: ${formatPrice(order.total_usdt)}</strong></p>
                                      </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                      )}
                    </React.Fragment>
                ))}
                </tbody>
              </table>
          )}
        </div>
      </div>
  );
};

export default Orders;