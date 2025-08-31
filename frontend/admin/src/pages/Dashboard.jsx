// Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Flex, Text, Card, Button, Select, IconButton, Heading, AlertDialog } from '@radix-ui/themes';
import { ReloadIcon, CalendarIcon, SunIcon, MoonIcon, ExclamationTriangleIcon, TrashIcon, GearIcon, TargetIcon } from '@radix-ui/react-icons';

import LoadingOverlay from './Dashboard_Loading';
import StatsCards from './Dashboard_Stats';
import ChartSection from './Dashboard_Charts';
import InfoCards from './Dashboard_Info';

const API = {
  stats: {
    getDashboard: async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) {
          console.warn('Dashboard stats API failed, using fallback');
          return { stats: { total_products: 0, total_categories: 0, top_products: [] } };
        }
        return response.json();
      } catch (error) {
        console.error('Dashboard stats error:', error);
        return { stats: { total_products: 0, total_categories: 0, top_products: [] } };
      }
    },
    getAnalytics: async (range) => {
      try {
        const response = await fetch(`/api/dashboard/analytics?days=${range}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) {
          console.warn('Analytics API not available');
          return null;
        }
        return response.json();
      } catch (error) {
        console.error('Analytics error:', error);
        return null;
      }
    }
  },
  orders: {
    getAll: async ({ skip = 0, limit = 100 }) => {
      try {
        const response = await fetch(`/api/orders?skip=${skip}&limit=${limit}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) {
          console.warn('Orders API failed');
          return { orders: [], total: 0 };
        }
        return response.json();
      } catch (error) {
        console.error('Orders error:', error);
        return { orders: [], total: 0 };
      }
    }
  },
  admin: {
    clearOrders: async () => {
      const response = await fetch('/api/admin/clear-orders', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    clearUsers: async () => {
      const response = await fetch('/api/admin/clear-users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    }
  }
};

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState({ 
    daily_sales: [], 
    category_sales: [], 
    hourly_distribution: [] 
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [timeRange, setTimeRange] = useState('today');
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [loadingState, setLoadingState] = useState({
    isLoading: true,
    progress: 0,
    message: 'Initializing...',
    stage: 'init'
  });
  
  const abortControllerRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [timeRange]);

  const updateLoadingState = (progress, message, stage) => {
    setLoadingState({ isLoading: true, progress, message, stage });
  };

  const calculateOrderProfit = (order) => {
    if (order.profit_usdt !== undefined && order.profit_usdt !== null) {
      return order.profit_usdt;
    }
    let totalProfit = 0;
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const sellingPrice = item.price_usdt || 0;
        const purchasePrice = item.purchase_price_usdt || 0;
        const quantity = item.quantity || 1;
        totalProfit += (sellingPrice - purchasePrice) * quantity;
      });
    }
    totalProfit -= (order.discount_amount || 0);
    totalProfit -= (order.seller_commission || 0);
    return totalProfit;
  };

  const fetchData = async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    updateLoadingState(0, 'Initializing...', 'init');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      updateLoadingState(5, 'Connecting to server...', 'connecting');
      
      const statsRes = await API.stats.getDashboard().catch(err => {
        console.log('Stats API error:', err);
        return { stats: { total_products: 0, total_categories: 0, top_products: [] } };
      });
      
      if (signal.aborted) return;
      updateLoadingState(15, 'Loading orders...', 'loading-orders');
      
      const batchSize = 100;
      let allOrders = [];
      let skip = 0;
      
      const firstBatch = await API.orders.getAll({ skip: 0, limit: batchSize }).catch(err => ({
        orders: [], total: 0
      }));
      
      if (signal.aborted) return;
      
      allOrders = firstBatch.orders || [];
      const totalOrders = firstBatch.total || 0;
      
      if (totalOrders > batchSize) {
        skip = batchSize;
        while (skip < totalOrders && !signal.aborted) {
          const progressPercent = 15 + (70 * (skip / totalOrders));
          updateLoadingState(
            progressPercent,
            `Loading orders... (${skip}/${totalOrders})`,
            'loading-orders'
          );
          
          const nextBatch = await API.orders.getAll({ skip, limit: batchSize }).catch(err => ({
            orders: []
          }));
          
          if (signal.aborted) return;
          
          if (nextBatch.orders && nextBatch.orders.length > 0) {
            allOrders = [...allOrders, ...nextBatch.orders];
            skip += nextBatch.orders.length;
          } else {
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      updateLoadingState(85, 'Processing analytics...', 'processing');
      
      if (signal.aborted) return;
      
      const analyticsRes = await API.stats.getAnalytics(
        timeRange === 'today' || timeRange === 'yesterday' ? '1' : 
        timeRange === '7' ? '7' :
        timeRange === '30' ? '30' :
        timeRange === 'lifetime' ? '365' : '30'
      ).catch(err => {
        console.log('Analytics API not available, will use order data directly');
        return null;
      });
      
      if (signal.aborted) return;
      
      updateLoadingState(95, 'Finalizing...', 'finalizing');
      
      setRecentOrders(allOrders.slice(0, isMobile ? 3 : 5));
      
      const paidStatuses = ['completed', 'paid', 'processing'];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let filteredOrders = allOrders;
      let previousPeriodOrders = [];
      
      if (timeRange === 'today') {
        filteredOrders = allOrders.filter(order => new Date(order.created_at) >= today);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        previousPeriodOrders = allOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= yesterday && orderDate < today;
        });
      } else if (timeRange === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filteredOrders = allOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= yesterday && orderDate < today;
        });
        const dayBefore = new Date(yesterday);
        dayBefore.setDate(dayBefore.getDate() - 1);
        previousPeriodOrders = allOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= dayBefore && orderDate < yesterday;
        });
      } else if (timeRange === '7') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filteredOrders = allOrders.filter(order => new Date(order.created_at) >= sevenDaysAgo);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        previousPeriodOrders = allOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= fourteenDaysAgo && orderDate < sevenDaysAgo;
        });
      } else if (timeRange === '30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredOrders = allOrders.filter(order => new Date(order.created_at) >= thirtyDaysAgo);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        previousPeriodOrders = allOrders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
        });
      } else if (timeRange === 'lifetime') {
        filteredOrders = allOrders;
        previousPeriodOrders = [];
      }
      
      const paidOrders = filteredOrders.filter(order => paidStatuses.includes(order.status));
      const prevPaidOrders = previousPeriodOrders.filter(order => paidStatuses.includes(order.status));
      
      const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total_usdt || 0), 0);
      const totalProfit = paidOrders.reduce((sum, order) => sum + calculateOrderProfit(order), 0);
      const uniqueUsers = new Set(filteredOrders.map(order => order.user_id || order.telegram_id)).size;
      const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
      
      const prevRevenue = prevPaidOrders.reduce((sum, order) => sum + (order.total_usdt || 0), 0);
      const prevProfit = prevPaidOrders.reduce((sum, order) => sum + calculateOrderProfit(order), 0);
      const prevOrders = previousPeriodOrders.length;
      const prevAvgOrder = prevPaidOrders.length > 0 ? prevRevenue / prevPaidOrders.length : 0;
      
      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const profitGrowth = prevProfit > 0 ? ((totalProfit - prevProfit) / prevProfit) * 100 : 0;
      const ordersGrowth = prevOrders > 0 ? ((filteredOrders.length - prevOrders) / prevOrders) * 100 : 0;
      const avgOrderGrowth = prevAvgOrder > 0 ? ((avgOrderValue - prevAvgOrder) / prevAvgOrder) * 100 : 0;
      
      setStats({
        total_revenue_usdt: totalRevenue,
        total_profit_usdt: totalProfit,
        total_orders: filteredOrders.length,
        total_users: uniqueUsers,
        avg_order_value: avgOrderValue,
        revenue_growth: timeRange === 'lifetime' ? undefined : revenueGrowth,
        profit_growth: timeRange === 'lifetime' ? undefined : profitGrowth,
        orders_growth: timeRange === 'lifetime' ? undefined : ordersGrowth,
        avg_order_growth: timeRange === 'lifetime' ? undefined : avgOrderGrowth,
        top_products: statsRes?.stats?.top_products || [],
        total_products: statsRes?.stats?.total_products || 0,
        total_categories: statsRes?.stats?.total_categories || 0
      });
      
      let chartData = [];
      
      if (timeRange === 'today' || timeRange === 'yesterday') {
        const maxHour = timeRange === 'today' ? new Date().getHours() : 23;
        for (let hour = 0; hour <= maxHour; hour++) {
          const hourOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate.getHours() === hour;
          });
          const hourPaidOrders = hourOrders.filter(order => paidStatuses.includes(order.status));
          const hourRevenue = hourPaidOrders.reduce((sum, order) => sum + (order.total_usdt || 0), 0);
          const hourProfit = hourPaidOrders.reduce((sum, order) => sum + calculateOrderProfit(order), 0);
          const hourAllOrdersSum = hourOrders.reduce((sum, order) => sum + (order.total_usdt || 0), 0);
          
          chartData.push({
            _id: `${hour.toString().padStart(2, '0')}:00`,
            revenue: hourRevenue,
            profit: hourProfit,
            allOrders: hourAllOrdersSum
          });
        }
      } else {
        const dailyMap = new Map();
        filteredOrders.forEach(order => {
          const orderDate = new Date(order.created_at);
          const dateKey = orderDate.toISOString().split('T')[0];
          
          if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, {
              _id: dateKey,
              revenue: 0,
              profit: 0,
              allOrders: 0
            });
          }
          
          const dayData = dailyMap.get(dateKey);
          if (paidStatuses.includes(order.status)) {
            dayData.revenue += order.total_usdt || 0;
            dayData.profit += calculateOrderProfit(order);
          }
          dayData.allOrders += order.total_usdt || 0;
        });
        
        chartData = Array.from(dailyMap.values()).sort((a, b) => a._id.localeCompare(b._id));
      }
      
      setAnalytics({
        daily_sales: chartData,
        category_sales: analyticsRes?.category_sales || [],
        hourly_distribution: analyticsRes?.hourly_distribution || []
      });
      
      updateLoadingState(100, 'Complete', 'done');
      
      loadingTimeoutRef.current = setTimeout(() => {
        setLoadingState({ isLoading: false, progress: 0, message: '', stage: 'idle' });
      }, 500);
      
    } catch (error) {
      if (!signal.aborted) {
        console.error('Error fetching dashboard data:', error);
        setLoadingState({ isLoading: false, progress: 0, message: '', stage: 'error' });
      }
    }
  };

  const handleRefresh = () => fetchData();

  const clearOrders = async () => {
    setClearingData(true);
    try {
      await API.admin.clearOrders();
      alert('✅ Orders cleared successfully!');
      fetchData();
    } catch (error) {
      alert('❌ Error clearing orders');
    } finally {
      setClearingData(false);
    }
  };

  const clearUsers = async () => {
    setClearingData(true);
    try {
      await API.admin.clearUsers();
      alert('✅ Users cleared successfully!');
      fetchData();
    } catch (error) {
      alert('❌ Error clearing users');
    } finally {
      setClearingData(false);
    }
  };

  const timeRangeOptions = {
    'today': 'Today',
    'yesterday': 'Yesterday',
    '7': isMobile ? '7 days' : 'Last 7 days',
    '30': isMobile ? '30 days' : 'Last 30 days',
    'lifetime': 'Lifetime'
  };

  const getTimeRangeIcon = () => {
    switch(timeRange) {
      case 'today': return <SunIcon width="16" height="16" />;
      case 'yesterday': return <MoonIcon width="16" height="16" />;
      case 'lifetime': return <TargetIcon width="16" height="16" />;
      default: return <CalendarIcon width="16" height="16" />;
    }
  };

  const profitWarning = stats.total_profit_usdt < 0;
  const showSkeleton = loadingState.isLoading && loadingState.stage !== 'done';

  return (
    <Box style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      <LoadingOverlay loadingState={loadingState} />

      <AnimatePresence mode="wait">
        {!showSkeleton && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Flex align={isMobile ? 'start' : 'center'} justify="between" direction={isMobile ? 'column' : 'row'} gap={isMobile ? '3' : '0'} mb={isMobile ? '4' : '6'}>
              <Box>
                <Flex align="center" gap={isMobile ? '2' : '3'}>
                  <Heading size={isMobile ? '6' : '8'} weight="bold">Dashboard</Heading>
                  {!isMobile && (
                    <Button size="1" variant="ghost" color="red" onClick={() => setDangerZoneOpen(true)} style={{ fontSize: '13px', padding: '4px 8px' }}>
                      <ExclamationTriangleIcon width="14" height="14" />
                      Danger Zone
                    </Button>
                  )}
                </Flex>
                {!isMobile && (
                  <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
                    {timeRange === 'today' ? "Today's live performance metrics" :
                     timeRange === 'yesterday' ? "Yesterday's complete overview" :
                     timeRange === 'lifetime' ? "All-time performance metrics" :
                     "Welcome back! Here's what's happening with your store."}
                  </Text>
                )}
              </Box>
              
              <Flex gap={isMobile ? '2' : '3'} align="center" style={{ width: isMobile ? '100%' : 'auto' }}>
                <Select.Root value={timeRange} onValueChange={setTimeRange}>
                  <Select.Trigger size={isMobile ? '2' : '3'} style={{
                    background: 'rgba(20, 20, 25, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    flex: isMobile ? 1 : 0,
                    minWidth: isMobile ? 'auto' : '150px'
                  }}>
                    <Flex align="center" gap="2">
                      {getTimeRangeIcon()}
                      <Text size={isMobile ? '2' : '3'}>{timeRangeOptions[timeRange]}</Text>
                    </Flex>
                  </Select.Trigger>
                  <Select.Content>
                    {Object.entries(timeRangeOptions).map(([value, label]) => (
                      <Select.Item key={value} value={value}>{label}</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>

                <IconButton size={isMobile ? '2' : '3'} variant="surface" onClick={handleRefresh} disabled={loadingState.isLoading} style={{
                  background: 'rgba(20, 20, 25, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <motion.div
                    animate={loadingState.isLoading ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: loadingState.isLoading ? Infinity : 0, ease: "linear" }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ReloadIcon width={isMobile ? '16' : '18'} height={isMobile ? '16' : '18'} />
                  </motion.div>
                </IconButton>

                {isMobile && (
                  <IconButton size="2" variant="ghost" color="red" onClick={() => setDangerZoneOpen(true)}>
                    <GearIcon width="16" height="16" />
                  </IconButton>
                )}
              </Flex>
            </Flex>

            {timeRange === 'today' && (
              <Flex align="center" gap="2" mb="4">
                <Box style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  animation: 'pulse 2s infinite'
                }} />
                <Text size="2" style={{ color: '#10b981' }}>
                  Live data - Updates every minute
                </Text>
              </Flex>
            )}

            {profitWarning && (
              <Card style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <Flex align="center" gap="2">
                  <ExclamationTriangleIcon style={{ color: '#ef4444' }} />
                  <Text size="2" style={{ color: '#ef4444' }}>
                    Warning: Negative profit detected! Your discounts may be too high or costs are exceeding revenue.
                  </Text>
                </Flex>
              </Card>
            )}

            <StatsCards stats={stats} isMobile={isMobile} />
            <ChartSection analytics={analytics} timeRange={timeRange} isMobile={isMobile} />
            <InfoCards recentOrders={recentOrders} stats={stats} isMobile={isMobile} />
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog.Root open={dangerZoneOpen} onOpenChange={setDangerZoneOpen}>
        <AlertDialog.Content style={{ maxWidth: isMobile ? '90%' : 500 }}>
          <AlertDialog.Title>
            <Flex align="center" gap="2">
              <ExclamationTriangleIcon width="24" height="24" style={{ color: '#ef4444' }} />
              <Text size={isMobile ? '5' : '6'} weight="bold" style={{ color: '#ef4444' }}>
                Danger Zone
              </Text>
            </Flex>
          </AlertDialog.Title>
          
          <AlertDialog.Description>
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '24px' }}>
              These actions are irreversible and will permanently delete data. Use with extreme caution.
            </Text>
            
            <Flex direction="column" gap="3">
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button size="3" color="red" variant="surface" disabled={clearingData} style={{
                    width: '100%',
                    cursor: clearingData ? 'not-allowed' : 'pointer',
                    opacity: clearingData ? 0.7 : 1
                  }}>
                    <TrashIcon width="16" height="16" />
                    Clear All Orders
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 450 }}>
                  <AlertDialog.Title>Clear All Orders</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Are you sure you want to delete all orders? This will also reset user statistics.
                    This action cannot be undone.
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">Cancel</Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button variant="solid" color="red" onClick={clearOrders}>
                        Yes, delete all orders
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>

              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button size="3" color="red" variant="surface" disabled={clearingData} style={{
                    width: '100%',
                    cursor: clearingData ? 'not-allowed' : 'pointer',
                    opacity: clearingData ? 0.7 : 1
                  }}>
                    <TrashIcon width="16" height="16" />
                    Clear All Users
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 450 }}>
                  <AlertDialog.Title>Clear All Users</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Are you sure you want to delete all users? This will remove all user data permanently.
                    This action cannot be undone.
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">Cancel</Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button variant="solid" color="red" onClick={clearUsers}>
                        Yes, delete all users
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
            
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" size="3">Close</Button>
              </AlertDialog.Cancel>
            </Flex>
          </AlertDialog.Description>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}
      </style>
    </Box>
  );
};

export default Dashboard;
