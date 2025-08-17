
import React, { useState, useEffect } from 'react';

import { ShoppingCart, DollarSign, Users, Package, TrendingUp, AlertCircle, Crown, Eye, EyeOff, Clock, BarChart3, PieChart, Activity, Settings } from 'lucide-react';

import { LineChart, Line, BarChart, Bar, PieChart as RechartsPC, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

import { statsAPI, ordersAPI, adminAPI } from '../services/api';



const Dashboard = () => {

  const [stats, setStats] = useState({});

  const [analytics, setAnalytics] = useState({ daily_sales: [], category_sales: [], hourly_distribution: [] });

  const [recentOrders, setRecentOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [timeRange, setTimeRange] = useState(30);

  const [showDangerZone, setShowDangerZone] = useState(false);

  const [clearingData, setClearingData] = useState(false);

  const [activeChart, setActiveChart] = useState('revenue');



  useEffect(() => {

    fetchData();

  }, [timeRange]);



  const fetchData = async () => {

    try {

      const [statsRes, ordersRes, analyticsRes] = await Promise.all([

        statsAPI.getDashboard(),

        ordersAPI.getAll(),

        statsAPI.getAnalytics(timeRange)

      ]);



      setStats(statsRes.stats || {});

      setRecentOrders(ordersRes.orders?.slice(0, 5) || []);

      setAnalytics(analyticsRes || { daily_sales: [], category_sales: [], hourly_distribution: [] });

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

      setShowDangerZone(false);

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

      setShowDangerZone(false);

    } catch (error) {

      alert('❌ Error clearing users: ' + error.message);

    } finally {

      setClearingData(false);

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



  // Chart colors

  const COLORS = ['#667eea', '#00c896', '#ffa500', '#ff6b6b', '#4facfe'];

  

  if (loading) {

    return <div className="loading">Loading dashboard...</div>;

  }



  return (

    <div className="dashboard">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>

        <h2>Dashboard Analytics</h2>

        <div style={{ display: 'flex', gap: '10px' }}>

          <select

            value={timeRange}

            onChange={(e) => setTimeRange(Number(e.target.value))}

            style={{

              padding: '10px 15px',

              background: '#2a2a2a',

              border: '1px solid #3a3a3a',

              borderRadius: '10px',

              color: '#fff',

              cursor: 'pointer'

            }}

          >

            <option value={7}>Last 7 days</option>

            <option value={30}>Last 30 days</option>

            <option value={90}>Last 90 days</option>

          </select>

          <button

            onClick={() => setShowDangerZone(!showDangerZone)}

            style={{

              padding: '10px 15px',

              background: '#3a3a3a',

              border: '1px solid #4a4a4a',

              borderRadius: '10px',

              color: '#888',

              cursor: 'pointer',

              display: 'flex',

              alignItems: 'center',

              gap: '5px'

            }}

          >

            <Settings size={16} />

            Settings

          </button>

        </div>

      </div>



      {/* Key Metrics Grid */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-icon orders">

            <ShoppingCart />

          </div>

          <div className="stat-content">

            <h3>Total Orders</h3>

            <p className="stat-number">{stats.total_orders || 0}</p>

            <span style={{ fontSize: '12px', color: '#00c896' }}>

              +{stats.today_orders || 0} today

            </span>

          </div>

        </div>



        <div className="stat-card">

          <div className="stat-icon revenue">

            <DollarSign />

          </div>

          <div className="stat-content">

            <h3>Total Revenue</h3>

            <p className="stat-number">${formatPrice(stats.total_revenue_usdt)}</p>

            <span style={{ fontSize: '12px', color: '#00c896' }}>

              +${formatPrice(stats.today_revenue)} today

            </span>

          </div>

        </div>



        <div className="stat-card">

          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)'}}>

            <TrendingUp />

          </div>

          <div className="stat-content">

            <h3>Net Profit</h3>

            <p className="stat-number">${formatPrice(stats.total_profit_usdt)}</p>

            <span style={{ fontSize: '12px', color: '#667eea' }}>

              {formatPrice(stats.profit_margin)}% margin

            </span>

          </div>

        </div>



        <div className="stat-card">

          <div className="stat-icon users">

            <Users />

          </div>

          <div className="stat-content">

            <h3>Total Users</h3>

            <p className="stat-number">{stats.total_users || 0}</p>

            <span style={{ fontSize: '12px', color: '#ffd700' }}>

              {stats.vip_users || 0} VIP

            </span>

          </div>

        </div>



        <div className="stat-card">

          <div className="stat-icon products">

            <Package />

          </div>

          <div className="stat-content">

            <h3>Active Products</h3>

            <p className="stat-number">{stats.total_products || 0}</p>

            <span style={{ fontSize: '12px', color: '#888' }}>

              {stats.total_categories || 0} categories

            </span>

          </div>

        </div>



        <div className="stat-card">

          <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}}>

            <Activity />

          </div>

          <div className="stat-content">

            <h3>Avg Order Value</h3>

            <p className="stat-number">${formatPrice(stats.avg_order_value)}</p>

            <span style={{ fontSize: '12px', color: '#ffa500' }}>

              {stats.pending_orders || 0} pending

            </span>

          </div>

        </div>

      </div>



      {/* Sales Charts Section */}

      <div style={{ 

        display: 'grid', 

        gridTemplateColumns: '2fr 1fr', 

        gap: '20px', 

        marginTop: '30px' 

      }}>

        {/* Revenue & Profit Chart */}

        <div style={{

          background: '#1a1a1a',

          borderRadius: '15px',

          padding: '20px',

          border: '1px solid #2a2a2a'

        }}>

          <div style={{ 

            display: 'flex', 

            justifyContent: 'space-between', 

            alignItems: 'center',

            marginBottom: '20px'

          }}>

            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

              <BarChart3 size={20} />

              Sales Performance

            </h3>

            <div style={{ display: 'flex', gap: '10px' }}>

              <button

                onClick={() => setActiveChart('revenue')}

                style={{

                  padding: '5px 15px',

                  background: activeChart === 'revenue' ? '#667eea' : '#2a2a2a',

                  border: 'none',

                  borderRadius: '5px',

                  color: '#fff',

                  cursor: 'pointer',

                  fontSize: '12px'

                }}

              >

                Revenue

              </button>

              <button

                onClick={() => setActiveChart('profit')}

                style={{

                  padding: '5px 15px',

                  background: activeChart === 'profit' ? '#00c896' : '#2a2a2a',

                  border: 'none',

                  borderRadius: '5px',

                  color: '#fff',

                  cursor: 'pointer',

                  fontSize: '12px'

                }}

              >

                Profit

              </button>

              <button

                onClick={() => setActiveChart('both')}

                style={{

                  padding: '5px 15px',

                  background: activeChart === 'both' ? '#ffa500' : '#2a2a2a',

                  border: 'none',

                  borderRadius: '5px',

                  color: '#fff',

                  cursor: 'pointer',

                  fontSize: '12px'

                }}

              >

                Both

              </button>

            </div>

          </div>

          <ResponsiveContainer width="100%" height={300}>

            <AreaChart data={analytics.daily_sales}>

              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />

              <XAxis 

                dataKey="_id" 

                stroke="#888"

                tick={{ fontSize: 11 }}

                tickFormatter={(value) => {

                  const date = new Date(value);

                  return `${date.getMonth() + 1}/${date.getDate()}`;

                }}

              />

              <YAxis stroke="#888" tick={{ fontSize: 11 }} />

              <Tooltip 

                contentStyle={{ 

                  background: '#1a1a1a', 

                  border: '1px solid #3a3a3a',

                  borderRadius: '10px'

                }}

                labelStyle={{ color: '#fff' }}

              />

              <Legend />

              {(activeChart === 'revenue' || activeChart === 'both') && (

                <Area 

                  type="monotone" 

                  dataKey="revenue" 

                  stroke="#667eea" 

                  fill="#667eea"

                  fillOpacity={0.3}

                  name="Revenue ($)"

                />

              )}

              {(activeChart === 'profit' || activeChart === 'both') && (

                <Area 

                  type="monotone" 

                  dataKey="profit" 

                  stroke="#00c896" 

                  fill="#00c896"

                  fillOpacity={0.3}

                  name="Profit ($)"

                />

              )}

            </AreaChart>

          </ResponsiveContainer>

        </div>



        {/* Category Sales Pie Chart */}

        <div style={{

          background: '#1a1a1a',

          borderRadius: '15px',

          padding: '20px',

          border: '1px solid #2a2a2a'

        }}>

          <h3 style={{ 

            display: 'flex', 

            alignItems: 'center', 

            gap: '10px',

            marginBottom: '20px'

          }}>

            <PieChart size={20} />

            Sales by Category

          </h3>

          <ResponsiveContainer width="100%" height={300}>

            <RechartsPC>

              <Pie

                data={analytics.category_sales}

                cx="50%"

                cy="50%"

                labelLine={false}

                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}

                outerRadius={80}

                fill="#8884d8"

                dataKey="revenue"

              >

                {analytics.category_sales.map((entry, index) => (

                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />

                ))}

              </Pie>

              <Tooltip />

            </RechartsPC>

          </ResponsiveContainer>

          <div style={{ marginTop: '10px' }}>

            {analytics.category_sales.map((cat, idx) => (

              <div key={idx} style={{ 

                display: 'flex', 

                justifyContent: 'space-between',

                padding: '5px 0',

                borderBottom: '1px solid #2a2a2a'

              }}>

                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>

                  <span style={{ 

                    width: '12px', 

                    height: '12px', 

                    background: COLORS[idx % COLORS.length],

                    borderRadius: '2px'

                  }}></span>

                  {cat.emoji} {cat.name}

                </span>

                <span style={{ color: '#888', fontSize: '12px' }}>

                  ${formatPrice(cat.revenue)}

                </span>

              </div>

            ))}

          </div>

        </div>

      </div>



      {/* Additional Charts Row */}

      <div style={{ 

        display: 'grid', 

        gridTemplateColumns: '1fr 1fr', 

        gap: '20px', 

        marginTop: '20px' 

      }}>

        {/* Top Products */}

        <div style={{

          background: '#1a1a1a',

          borderRadius: '15px',

          padding: '20px',

          border: '1px solid #2a2a2a'

        }}>

          <h3 style={{ marginBottom: '20px' }}>🏆 Top Selling Products</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {stats.top_products?.map((product, idx) => {

              const profit = (product.price_usdt - product.purchase_price_usdt) * product.sold_count;

              return (

                <div key={idx} style={{

                  display: 'flex',

                  justifyContent: 'space-between',

                  alignItems: 'center',

                  padding: '10px',

                  background: '#2a2a2a',

                  borderRadius: '10px'

                }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                    <span style={{

                      width: '30px',

                      height: '30px',

                      background: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#667eea',

                      borderRadius: '50%',

                      display: 'flex',

                      alignItems: 'center',

                      justifyContent: 'center',

                      fontWeight: 'bold'

                    }}>

                      {idx + 1}

                    </span>

                    <div>

                      <div style={{ fontWeight: 'bold' }}>{product.name}</div>

                      <div style={{ fontSize: '12px', color: '#888' }}>

                        {product.sold_count} sold • ${formatPrice(product.price_usdt)} each

                      </div>

                    </div>

                  </div>

                  <div style={{ textAlign: 'right' }}>

                    <div style={{ color: '#00c896', fontWeight: 'bold' }}>

                      ${formatPrice(profit)}

                    </div>

                    <div style={{ fontSize: '11px', color: '#888' }}>

                      profit

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        </div>



        {/* Hourly Distribution */}

        <div style={{

          background: '#1a1a1a',

          borderRadius: '15px',

          padding: '20px',

          border: '1px solid #2a2a2a'

        }}>

          <h3 style={{ 

            display: 'flex', 

            alignItems: 'center', 

            gap: '10px',

            marginBottom: '20px'

          }}>

            <Clock size={20} />

            Peak Hours (Last 7 Days)

          </h3>

          <ResponsiveContainer width="100%" height={250}>

            <BarChart data={analytics.hourly_distribution}>

              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />

              <XAxis 

                dataKey="_id" 

                stroke="#888"

                tick={{ fontSize: 10 }}

                tickFormatter={(value) => `${value}:00`}

              />

              <YAxis stroke="#888" tick={{ fontSize: 10 }} />

              <Tooltip 

                contentStyle={{ 

                  background: '#1a1a1a', 

                  border: '1px solid #3a3a3a',

                  borderRadius: '10px'

                }}

                labelFormatter={(value) => `${value}:00`}

              />

              <Bar dataKey="count" fill="#667eea" name="Orders" />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>



      {/* Recent Orders */}

      <div className="recent-orders" style={{ marginTop: '20px' }}>

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

                {formatDate(order.created_at)}

              </span>

              <span className="order-total">

                ${formatPrice(order.total_usdt)}

                <span style={{ 

                  fontSize: '11px', 

                  color: '#00c896',

                  marginLeft: '5px'

                }}>

                  (+${formatPrice(order.profit_usdt)})

                </span>

              </span>

              <span className={`status status-${order.status}`}>{order.status}</span>

            </div>

          ))

        )}

      </div>



      {/* Danger Zone Modal */}

      {showDangerZone && (

        <div style={{

          position: 'fixed',

          top: 0,

          left: 0,

          right: 0,

          bottom: 0,

          background: 'rgba(0,0,0,0.8)',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          zIndex: 9999

        }}>

          <div style={{

            background: '#1a1a1a',

            borderRadius: '20px',

            padding: '30px',

            maxWidth: '500px',

            border: '2px solid #ff4444'

          }}>

            <h3 style={{ 

              color: '#ff4444', 

              marginBottom: '20px',

              display: 'flex',

              alignItems: 'center',

              gap: '10px'

            }}>

              <AlertCircle size={24} />

              Danger Zone

            </h3>

            <p style={{ color: '#888', marginBottom: '20px' }}>

              These actions are irreversible and will permanently delete data. 

              Make sure you have backups before proceeding.

            </p>

            

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              <button

                onClick={clearOrders}

                disabled={clearingData}

                style={{

                  padding: '15px',

                  background: '#ff4444',

                  border: 'none',

                  borderRadius: '10px',

                  color: 'white',

                  cursor: clearingData ? 'not-allowed' : 'pointer',

                  opacity: clearingData ? 0.5 : 1,

                  fontWeight: 'bold'

                }}

              >

                {clearingData ? 'Processing...' : '🗑️ Delete All Orders & Reset Stats'}

              </button>



              <button

                onClick={clearUsers}

                disabled={clearingData}

                style={{

                  padding: '15px',

                  background: '#ff4444',

                  border: 'none',

                  borderRadius: '10px',

                  color: 'white',

                  cursor: clearingData ? 'not-allowed' : 'pointer',

                  opacity: clearingData ? 0.5 : 1,

                  fontWeight: 'bold'

                }}

              >

                {clearingData ? 'Processing...' : '🗑️ Delete All Users'}

              </button>



              <button

                onClick={() => setShowDangerZone(false)}

                style={{

                  padding: '15px',

                  background: '#3a3a3a',

                  border: 'none',

                  borderRadius: '10px',

                  color: 'white',

                  cursor: 'pointer',

                  marginTop: '10px'

                }}

              >

                Cancel

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



export default Dashboard;

