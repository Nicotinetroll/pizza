import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, Select, 
  Tabs, Progress, Avatar, Separator, IconButton, Heading, AlertDialog
} from '@radix-ui/themes';
import {
  ArrowUpIcon, ArrowDownIcon, ReloadIcon, CalendarIcon,
  RocketIcon, TimerIcon, LightningBoltIcon, TargetIcon,
  ActivityLogIcon, BarChartIcon, PieChartIcon, MixerHorizontalIcon,
  ClockIcon, SunIcon, MoonIcon, ExclamationTriangleIcon, TrashIcon, GearIcon
} from '@radix-ui/react-icons';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { statsAPI, ordersAPI, adminAPI } from '../services/api';

// Animated counter component
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1000;
    const startValue = displayValue;
    const endValue = parseFloat(value) || 0;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * easeOutQuart;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
};

// Stat card component
const StatCard = ({ title, value, change, icon: Icon, color, prefix = '', suffix = '', decimals = 0 }) => {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '24px',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background gradient */}
        <Box style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '150px',
          height: '150px',
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }} />

        <Flex direction="column" gap="4" style={{ position: 'relative' }}>
          <Flex align="center" justify="between">
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {title}
            </Text>
            <Box style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${color}40`
            }}>
              <Icon width="20" height="20" style={{ color }} />
            </Box>
          </Flex>

          <Box>
            <Text size="8" weight="bold" style={{ display: 'block' }}>
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
            </Text>
            {change !== undefined && (
              <Flex align="center" gap="1" mt="2">
                {isPositive ? (
                  <ArrowUpIcon width="16" height="16" style={{ color: '#10b981' }} />
                ) : (
                  <ArrowDownIcon width="16" height="16" style={{ color: '#ef4444' }} />
                )}
                <Text size="2" style={{ 
                  color: isPositive ? '#10b981' : '#ef4444'
                }}>
                  {isPositive ? '+' : ''}{change.toFixed(1)}%
                </Text>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)', marginLeft: '4px' }}>
                  vs last period
                </Text>
              </Flex>
            )}
          </Box>
        </Flex>
      </Card>
    </motion.div>
  );
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Card style={{
        background: 'rgba(20, 20, 25, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px',
      }}>
        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '8px' }}>
          {label}
        </Text>
        {payload.map((entry, index) => (
          <Flex key={index} align="center" gap="2" style={{ marginTop: '4px' }}>
            <Box style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: entry.color
            }} />
            <Text size="2" weight="medium">
              {entry.name}: ${entry.value?.toFixed(2) || 0}
            </Text>
          </Flex>
        ))}
      </Card>
    );
  }
  return null;
};

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState({ 
    daily_sales: [], 
    category_sales: [], 
    hourly_distribution: [] 
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today'); // Changed default from '30' to 'today'
  const [refreshing, setRefreshing] = useState(false);
  const [activeChart, setActiveChart] = useState('area');
  const [clearingData, setClearingData] = useState(false);
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      // Convert timeRange to appropriate API parameter
      let apiTimeRange = timeRange;
      if (timeRange === 'today') apiTimeRange = '1';
      if (timeRange === 'yesterday') apiTimeRange = '1';

      const [statsRes, ordersRes] = await Promise.all([
        statsAPI.getDashboard(),
        ordersAPI.getAll()
      ]);
      
      // Try to get analytics, but don't fail if it doesn't work
      let analyticsRes = null;
      try {
        analyticsRes = await statsAPI.getAnalytics(apiTimeRange);
      } catch (analyticsError) {
        console.log('Analytics API not available, using order data directly');
        analyticsRes = null;
      }

      setRecentOrders(ordersRes.orders?.slice(0, 5) || []);
      
      // Filter orders based on selected time range
      let filteredOrders = ordersRes.orders || [];
      let previousPeriodOrders = [];
      
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (timeRange === 'today') {
        // Filter orders from today
        filteredOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= today;
        }) || [];
        
        // Previous period = yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        previousPeriodOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= yesterday && orderDate < today;
        }) || [];
        
      } else if (timeRange === 'yesterday') {
        // Filter orders from yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filteredOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= yesterday && orderDate < today;
        }) || [];
        
        // Previous period = day before yesterday
        const dayBefore = new Date(yesterday);
        dayBefore.setDate(dayBefore.getDate() - 1);
        previousPeriodOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= dayBefore && orderDate < yesterday;
        }) || [];
        
      } else if (timeRange === '7') {
        // Last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filteredOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= sevenDaysAgo;
        }) || [];
        
        // Previous period = 7 days before that
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        previousPeriodOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= fourteenDaysAgo && orderDate < sevenDaysAgo;
        }) || [];
        
      } else if (timeRange === '30') {
        // Last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= thirtyDaysAgo;
        }) || [];
        
        // Previous period = 30 days before that
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        previousPeriodOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
        }) || [];
        
      } else if (timeRange === '90') {
        // Last 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        filteredOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= ninetyDaysAgo;
        }) || [];
        
        // Previous period = 90 days before that
        const oneEightyDaysAgo = new Date();
        oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);
        previousPeriodOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= oneEightyDaysAgo && orderDate < ninetyDaysAgo;
        }) || [];
      }
      
      // Calculate stats from filtered orders
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_usdt || 0), 0);
      const uniqueUsers = new Set(filteredOrders.map(order => order.user_id || order.telegram_id)).size;
      const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
      
      // Calculate previous period stats for growth percentages
      const prevRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.total_usdt || 0), 0);
      const prevOrders = previousPeriodOrders.length;
      const prevUsers = new Set(previousPeriodOrders.map(order => order.user_id || order.telegram_id)).size;
      const prevAvgOrder = previousPeriodOrders.length > 0 ? prevRevenue / previousPeriodOrders.length : 0;
      
      // Calculate growth percentages
      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const ordersGrowth = prevOrders > 0 ? ((filteredOrders.length - prevOrders) / prevOrders) * 100 : 0;
      const usersGrowth = prevUsers > 0 ? ((uniqueUsers - prevUsers) / prevUsers) * 100 : 0;
      const avgOrderGrowth = prevAvgOrder > 0 ? ((avgOrderValue - prevAvgOrder) / prevAvgOrder) * 100 : 0;
      
      // Set calculated stats
      const calculatedStats = {
        total_revenue_usdt: totalRevenue,
        total_orders: filteredOrders.length,
        total_users: uniqueUsers,
        avg_order_value: avgOrderValue,
        // Growth percentages
        revenue_growth: revenueGrowth,
        orders_growth: ordersGrowth,
        users_growth: usersGrowth,
        avg_order_growth: avgOrderGrowth,
        // Keep other stats from API if available
        top_products: statsRes.stats?.top_products || [],
        total_products: statsRes.stats?.total_products || 0,
        total_categories: statsRes.stats?.total_categories || 0
      };
      
      setStats(calculatedStats);
      
      // Process analytics data for today - generate hourly data from 0:00 to current hour
      if (timeRange === 'today') {
        const currentHour = new Date().getHours();
        const todayData = [];
        
        // Initialize all hours with zero data
        for (let hour = 0; hour <= currentHour; hour++) {
          todayData.push({
            _id: `${hour.toString().padStart(2, '0')}:00`,
            revenue: 0,
            profit: 0,
            orders: 0
          });
        }

        // If we have orders, process them by hour
        if (ordersRes?.orders && ordersRes.orders.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Filter today's orders and group by hour
          ordersRes.orders.forEach(order => {
            const orderDate = new Date(order.created_at);
            
            // Check if order is from today
            if (orderDate >= today) {
              const orderHour = orderDate.getHours();
              
              // Find the corresponding hour in our data array
              if (orderHour <= currentHour) {
                const hourData = todayData[orderHour];
                if (hourData) {
                  hourData.orders += 1;
                  hourData.revenue += (order.total_usdt || 0);
                  // Calculate profit (assuming 40% margin if not provided)
                  const profit = order.profit_usdt || (order.total_usdt * 0.4);
                  hourData.profit += profit;
                }
              }
            }
          });
        }

        // Also check if analyticsRes has any data format we can use
        if (analyticsRes?.daily_sales && Array.isArray(analyticsRes.daily_sales)) {
          // If API returns properly formatted hourly data, use it
          analyticsRes.daily_sales.forEach(item => {
            // Extract hour from _id if it's in format "HH:00" or parse from date
            let hour = -1;
            if (typeof item._id === 'string' && item._id.includes(':')) {
              hour = parseInt(item._id.split(':')[0]);
            } else if (item.hour !== undefined) {
              hour = item.hour;
            }
            
            if (hour >= 0 && hour <= currentHour && todayData[hour]) {
              todayData[hour].revenue = item.revenue || todayData[hour].revenue;
              todayData[hour].profit = item.profit || todayData[hour].profit;
              todayData[hour].orders = item.orders || todayData[hour].orders;
            }
          });
        }
        
        setAnalytics({
          ...analyticsRes,
          daily_sales: todayData,
          category_sales: analyticsRes?.category_sales || []
        });
        
      } else if (timeRange === 'yesterday') {
        // For yesterday, show all 24 hours
        const yesterdayData = [];
        
        // Initialize all 24 hours
        for (let hour = 0; hour < 24; hour++) {
          yesterdayData.push({
            _id: `${hour.toString().padStart(2, '0')}:00`,
            revenue: 0,
            profit: 0,
            orders: 0
          });
        }

        // Process yesterday's orders if available
        if (ordersRes?.orders && ordersRes.orders.length > 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          ordersRes.orders.forEach(order => {
            const orderDate = new Date(order.created_at);
            
            // Check if order is from yesterday
            if (orderDate >= yesterday && orderDate < today) {
              const orderHour = orderDate.getHours();
              const hourData = yesterdayData[orderHour];
              if (hourData) {
                hourData.orders += 1;
                hourData.revenue += (order.total_usdt || 0);
                const profit = order.profit_usdt || (order.total_usdt * 0.4);
                hourData.profit += profit;
              }
            }
          });
        }
        
        setAnalytics({
          ...analyticsRes,
          daily_sales: yesterdayData,
          category_sales: analyticsRes?.category_sales || []
        });
        
      } else {
        // For other time ranges, use data as-is from API
        setAnalytics(analyticsRes || { daily_sales: [], category_sales: [], hourly_distribution: [] });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty data on error but still show hourly structure for today
      if (timeRange === 'today') {
        const currentHour = new Date().getHours();
        const emptyData = [];
        for (let hour = 0; hour <= currentHour; hour++) {
          emptyData.push({
            _id: `${hour.toString().padStart(2, '0')}:00`,
            revenue: 0,
            profit: 0,
            orders: 0
          });
        }
        setAnalytics({ daily_sales: emptyData, category_sales: [], hourly_distribution: [] });
      } else {
        setAnalytics({ daily_sales: [], category_sales: [], hourly_distribution: [] });
      }
      setStats({});
      setRecentOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const clearOrders = async () => {
    setClearingData(true);
    try {
      await adminAPI.clearOrders();
      alert('✅ Orders cleared successfully!');
      fetchData();
    } catch (error) {
      console.error('Error clearing orders:', error);
      alert('❌ Error clearing orders');
    } finally {
      setClearingData(false);
    }
  };

  const clearUsers = async () => {
    setClearingData(true);
    try {
      await adminAPI.clearUsers();
      alert('✅ Users cleared successfully!');
      fetchData();
    } catch (error) {
      console.error('Error clearing users:', error);
      alert('❌ Error clearing users');
    } finally {
      setClearingData(false);
    }
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  // Chart colors
  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RocketIcon width="32" height="32" style={{ color: '#8b5cf6' }} />
        </motion.div>
      </Flex>
    );
  }

  const timeRangeOptions = {
    'today': 'Today',
    'yesterday': 'Yesterday',
    '7': 'Last 7 days',
    '30': 'Last 30 days', 
    '90': 'Last 90 days'
  };

  // Get appropriate icon for time range
  const getTimeRangeIcon = () => {
    switch(timeRange) {
      case 'today':
        return <SunIcon width="16" height="16" />;
      case 'yesterday':
        return <MoonIcon width="16" height="16" />;
      case '7':
      case '30':
      case '90':
        return <CalendarIcon width="16" height="16" />;
      default:
        return <ClockIcon width="16" height="16" />;
    }
  };

  // Format X-axis based on time range
  const formatXAxis = (value) => {
    if (timeRange === 'today' || timeRange === 'yesterday') {
      return value; // Already formatted as hour
    } else if (timeRange === '90') {
      return value; // Week format
    } else {
      const date = new Date(value);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  // Calculate growth percentages (you can replace with real calculations)
  const growthData = {
    revenue: stats.revenue_growth || 0,
    orders: stats.orders_growth || 0,
    users: stats.users_growth || 0,
    avgOrder: stats.avg_order_growth || 0
  };

  // Render chart based on active tab
  const renderChart = () => {
    if (activeChart === 'area') {
      return (
        <AreaChart data={analytics.daily_sales}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="_id" 
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={formatXAxis}
          />
          <YAxis stroke="rgba(255,255,255,0.3)" />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#8b5cf6" 
            fillOpacity={1} 
            fill="url(#colorRevenue)"
            strokeWidth={2}
            name="Revenue"
          />
          <Area 
            type="monotone" 
            dataKey="profit" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorProfit)"
            strokeWidth={2}
            name="Profit"
          />
        </AreaChart>
      );
    } else if (activeChart === 'bar') {
      return (
        <BarChart data={analytics.daily_sales}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="_id" 
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={formatXAxis}
          />
          <YAxis stroke="rgba(255,255,255,0.3)" />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Revenue" />
          <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} name="Profit" />
        </BarChart>
      );
    } else {
      return (
        <LineChart data={analytics.daily_sales}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="_id" 
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={formatXAxis}
          />
          <YAxis stroke="rgba(255,255,255,0.3)" />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#8b5cf6' }}
            activeDot={{ r: 6 }}
            name="Revenue"
          />
          <Line 
            type="monotone" 
            dataKey="profit" 
            stroke="#10b981" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#10b981' }}
            activeDot={{ r: 6 }}
            name="Profit"
          />
        </LineChart>
      );
    }
  };

  return (
    <Box>
      {/* Header with Danger Zone button */}
      <Flex align="center" justify="between" mb="6">
        <Box>
          <Flex align="center" gap="3">
            <Heading size="8" weight="bold">
              Dashboard Overview
            </Heading>
            {/* Danger Zone link - smaller and styled as link */}
            <Button
              size="1"
              variant="ghost"
              color="red"
              onClick={() => setDangerZoneOpen(true)}
              style={{
                cursor: 'pointer',
                fontSize: '13px',
                padding: '4px 8px'
              }}
            >
              <ExclamationTriangleIcon width="14" height="14" />
              Danger Zone
            </Button>
          </Flex>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
            {timeRange === 'today' ? "Today's live performance metrics" :
             timeRange === 'yesterday' ? "Yesterday's complete overview" :
             "Welcome back! Here's what's happening with your store."}
          </Text>
        </Box>
        
        <Flex gap="3" align="center">
          <Select.Root value={timeRange} onValueChange={setTimeRange}>
            <Select.Trigger 
              variant="surface"
              style={{
                background: 'rgba(20, 20, 25, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                minWidth: '150px'
              }}
            >
              <Flex align="center" gap="2">
                {getTimeRangeIcon()}
                <Text>{timeRangeOptions[timeRange]}</Text>
              </Flex>
            </Select.Trigger>
            <Select.Content>
              <Select.Group>
                <Select.Label>Daily</Select.Label>
                <Select.Item value="today">
                  <Flex align="center" gap="2">
                    <SunIcon width="14" height="14" />
                    Today
                  </Flex>
                </Select.Item>
                <Select.Item value="yesterday">
                  <Flex align="center" gap="2">
                    <MoonIcon width="14" height="14" />
                    Yesterday
                  </Flex>
                </Select.Item>
              </Select.Group>
              <Select.Separator />
              <Select.Group>
                <Select.Label>Historical</Select.Label>
                <Select.Item value="7">
                  <Flex align="center" gap="2">
                    <CalendarIcon width="14" height="14" />
                    Last 7 days
                  </Flex>
                </Select.Item>
                <Select.Item value="30">
                  <Flex align="center" gap="2">
                    <CalendarIcon width="14" height="14" />
                    Last 30 days
                  </Flex>
                </Select.Item>
                <Select.Item value="90">
                  <Flex align="center" gap="2">
                    <CalendarIcon width="14" height="14" />
                    Last 90 days
                  </Flex>
                </Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>

          <IconButton
            size="3"
            variant="surface"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: 'rgba(20, 20, 25, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: refreshing ? 'not-allowed' : 'pointer'
            }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
            >
              <ReloadIcon width="18" height="18" />
            </motion.div>
          </IconButton>
        </Flex>
      </Flex>

      {/* Live indicator for today */}
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

      {/* Stats Grid with growth percentages */}
      <Grid columns={{ initial: '1', sm: '2', lg: '4' }} gap="4" mb="6">
        <StatCard
          title="Total Revenue"
          value={stats.total_revenue_usdt || 0}
          change={growthData.revenue}
          icon={RocketIcon}
          color="#8b5cf6"
          prefix="$"
          decimals={2}
        />
        <StatCard
          title="Total Orders"
          value={stats.total_orders || 0}
          change={growthData.orders}
          icon={TargetIcon}
          color="#10b981"
        />
        <StatCard
          title="Active Users"
          value={stats.total_users || 0}
          change={growthData.users}
          icon={ActivityLogIcon}
          color="#f59e0b"
        />
        <StatCard
          title="Avg Order Value"
          value={stats.avg_order_value || 0}
          change={growthData.avgOrder}
          icon={LightningBoltIcon}
          color="#06b6d4"
          prefix="$"
          decimals={2}
        />
      </Grid>

      {/* Charts Section */}
      <Grid columns={{ initial: '1', lg: '3' }} gap="4" mb="6">
        {/* Main Chart */}
        <Box style={{ gridColumn: 'span 2' }}>
          <Card style={{
            background: 'rgba(20, 20, 25, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '24px',
            minHeight: '400px'
          }}>
            <Flex align="center" justify="between" mb="4">
              <Box>
                <Heading size="4">
                  {timeRange === 'today' ? 'Today\'s Performance' :
                   timeRange === 'yesterday' ? 'Yesterday\'s Performance' :
                   'Sales Analytics'}
                </Heading>
                {(timeRange === 'today' || timeRange === 'yesterday') && (
                  <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                    Hourly breakdown
                  </Text>
                )}
              </Box>
              <Tabs.Root value={activeChart} onValueChange={setActiveChart}>
                <Tabs.List size="1">
                  <Tabs.Trigger value="area">Area</Tabs.Trigger>
                  <Tabs.Trigger value="bar">Bar</Tabs.Trigger>
                  <Tabs.Trigger value="line">Line</Tabs.Trigger>
                </Tabs.List>
              </Tabs.Root>
            </Flex>

            <Box style={{ width: '100%', height: '320px' }}>
              {analytics.daily_sales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              ) : (
                <Flex align="center" justify="center" style={{ height: '100%' }}>
                  <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    No data available for this period
                  </Text>
                </Flex>
              )}
            </Box>
          </Card>
        </Box>

        {/* Category Distribution */}
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '24px',
          minHeight: '400px'
        }}>
          <Heading size="4" mb="4">Category Sales</Heading>
          
          {analytics.category_sales.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={analytics.category_sales}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {analytics.category_sales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <Box mt="4">
                {analytics.category_sales.map((cat, idx) => (
                  <Flex key={idx} align="center" justify="between" style={{ marginBottom: '8px' }}>
                    <Flex align="center" gap="2">
                      <Box style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: COLORS[idx % COLORS.length]
                      }} />
                      <Text size="2">{cat.emoji} {cat.name}</Text>
                    </Flex>
                    <Text size="2" weight="medium">
                      ${formatPrice(cat.revenue)}
                    </Text>
                  </Flex>
                ))}
              </Box>
            </>
          ) : (
            <Flex align="center" justify="center" style={{ height: '200px' }}>
              <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                No category data available
              </Text>
            </Flex>
          )}
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid columns={{ initial: '1', lg: '2' }} gap="4">
        {/* Recent Orders */}
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '24px'
        }}>
          <Heading size="4" mb="4">Recent Orders</Heading>
          
          <Flex direction="column" gap="3">
            {recentOrders.length === 0 ? (
              <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '20px' }}>
                No orders yet
              </Text>
            ) : (
              recentOrders.map((order, idx) => (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Flex align="center" justify="between" style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <Flex align="center" gap="3">
                      <Avatar
                        size="2"
                        fallback={order.order_number?.slice(-2) || 'NA'}
                        style={{
                          background: `linear-gradient(135deg, ${COLORS[idx]} 0%, ${COLORS[idx]}90 100%)`
                        }}
                      />
                      <Box>
                        <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '2px' }}>
                          {order.order_number}
                        </Text>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {new Date(order.created_at).toLocaleDateString()}
                        </Text>
                      </Box>
                    </Flex>
                    
                    <Flex align="center" gap="3">
                      <Text size="2" weight="bold">
                        ${formatPrice(order.total_usdt)}
                      </Text>
                      <Badge 
                        color={
                          order.status === 'completed' ? 'green' :
                          order.status === 'paid' ? 'blue' :
                          order.status === 'processing' ? 'orange' :
                          'gray'
                        }
                        variant="soft"
                      >
                        {order.status}
                      </Badge>
                    </Flex>
                  </Flex>
                </motion.div>
              ))
            )}
          </Flex>
        </Card>

        {/* Top Products */}
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '24px'
        }}>
          <Heading size="4" mb="4">Top Products</Heading>
          
          <Flex direction="column" gap="3">
            {(stats.top_products || []).slice(0, 5).map((product, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Flex align="center" justify="between">
                  <Flex align="center" gap="3">
                    <Box style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#8b5cf6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {idx + 1}
                    </Box>
                    <Box>
                      <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '2px' }}>
                        {product.name}
                      </Text>
                      <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {product.sold_count} sold
                      </Text>
                    </Box>
                  </Flex>
                  
                  <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                    ${formatPrice((product.price_usdt - product.purchase_price_usdt) * product.sold_count)}
                  </Text>
                </Flex>
                
                {/* Progress bar */}
                <Box mt="2">
                  <Progress 
                    value={(product.sold_count / Math.max(...(stats.top_products || [{sold_count: 1}]).map(p => p.sold_count))) * 100}
                    size="1"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)'
                    }}
                  />
                </Box>
              </motion.div>
            ))}
            {(!stats.top_products || stats.top_products.length === 0) && (
              <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '20px' }}>
                No products sold yet
              </Text>
            )}
          </Flex>
        </Card>
      </Grid>

      {/* Danger Zone Modal */}
      <AlertDialog.Root open={dangerZoneOpen} onOpenChange={setDangerZoneOpen}>
        <AlertDialog.Content style={{ maxWidth: 500 }}>
          <AlertDialog.Title>
            <Flex align="center" gap="2">
              <ExclamationTriangleIcon width="24" height="24" style={{ color: '#ef4444' }} />
              <Text size="6" weight="bold" style={{ color: '#ef4444' }}>
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
                  <Button
                    size="3"
                    color="red"
                    variant="surface"
                    disabled={clearingData}
                    style={{
                      width: '100%',
                      cursor: clearingData ? 'not-allowed' : 'pointer',
                      opacity: clearingData ? 0.7 : 1
                    }}
                  >
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
                      <Button variant="soft" color="gray">
                        Cancel
                      </Button>
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
                  <Button
                    size="3"
                    color="red"
                    variant="surface"
                    disabled={clearingData}
                    style={{
                      width: '100%',
                      cursor: clearingData ? 'not-allowed' : 'pointer',
                      opacity: clearingData ? 0.7 : 1
                    }}
                  >
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
                      <Button variant="soft" color="gray">
                        Cancel
                      </Button>
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
                <Button variant="soft" size="3">
                  Close
                </Button>
              </AlertDialog.Cancel>
            </Flex>
          </AlertDialog.Description>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Box>
  );
};

export default Dashboard;
