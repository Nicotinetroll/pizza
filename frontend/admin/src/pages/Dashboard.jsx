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

const MobileStatCard = ({ title, value, change, icon: Icon, color, prefix = '', suffix = '', decimals = 0 }) => {
  const isPositive = change >= 0;
  const isMobile = window.innerWidth < 768;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: isMobile ? 1 : 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: isMobile ? '12px' : '24px',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {!isMobile && (
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
        )}

        <Flex direction="column" gap={isMobile ? '2' : '4'} style={{ position: 'relative' }}>
          <Flex align="center" justify="between">
            <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {title}
            </Text>
            <Box style={{
              width: isMobile ? '28px' : '40px',
              height: isMobile ? '28px' : '40px',
              borderRadius: '8px',
              background: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon width={isMobile ? '14' : '20'} height={isMobile ? '14' : '20'} style={{ color }} />
            </Box>
          </Flex>

          <Box>
            <Text size={isMobile ? '5' : '8'} weight="bold" style={{ display: 'block' }}>
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
            </Text>
            {change !== undefined && !isMobile && (
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
  const [timeRange, setTimeRange] = useState('today');
  const [refreshing, setRefreshing] = useState(false);
  const [activeChart, setActiveChart] = useState('area');
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      let apiTimeRange = timeRange;
      if (timeRange === 'today') apiTimeRange = '1';
      if (timeRange === 'yesterday') apiTimeRange = '1';

      const [statsRes, ordersRes] = await Promise.all([
        statsAPI.getDashboard(),
        ordersAPI.getAll()
      ]);
      
      let analyticsRes = null;
      try {
        analyticsRes = await statsAPI.getAnalytics(apiTimeRange);
      } catch (analyticsError) {
        console.log('Analytics API not available, using order data directly');
      }

      setRecentOrders(ordersRes.orders?.slice(0, isMobile ? 3 : 5) || []);
      
      let filteredOrders = ordersRes.orders || [];
      let previousPeriodOrders = [];
      
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (timeRange === 'today') {
        filteredOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= today;
        }) || [];
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        previousPeriodOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= yesterday && orderDate < today;
        }) || [];
        
      } else if (timeRange === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filteredOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= yesterday && orderDate < today;
        }) || [];
        
        const dayBefore = new Date(yesterday);
        dayBefore.setDate(dayBefore.getDate() - 1);
        previousPeriodOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= dayBefore && orderDate < yesterday;
        }) || [];
        
      } else if (timeRange === '7') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filteredOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= sevenDaysAgo;
        }) || [];
        
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        previousPeriodOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= fourteenDaysAgo && orderDate < sevenDaysAgo;
        }) || [];
        
      } else if (timeRange === '30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= thirtyDaysAgo;
        }) || [];
        
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        previousPeriodOrders = ordersRes.orders?.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
        }) || [];
      }
      
      const paidStatuses = ['completed', 'paid', 'processing'];
      const paidOrders = filteredOrders.filter(order => paidStatuses.includes(order.status));
      const prevPaidOrders = previousPeriodOrders.filter(order => paidStatuses.includes(order.status));
      
      const calculateOrderProfit = (order) => {
        if (order.profit_usdt !== undefined && order.profit_usdt !== null) {
          return order.profit_usdt;
        }
        
        let totalProfit = 0;
        
        if (order.items && order.items.length > 0) {
          order.items.forEach(item => {
            const sellingPricePerUnit = item.price_usdt || 0;
            const purchasePricePerUnit = item.purchase_price_usdt || 0;
            const quantity = item.quantity || 1;
            
            const baseProfit = (sellingPricePerUnit - purchasePricePerUnit) * quantity;
            totalProfit += baseProfit;
          });
        }
        
        const discountAmount = order.discount_amount || 0;
        totalProfit = totalProfit - discountAmount;
        
        if (order.seller_commission) {
          totalProfit = totalProfit - order.seller_commission;
        }
        
        return totalProfit;
      };
      
      const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total_usdt || 0), 0);
      const totalProfit = paidOrders.reduce((sum, order) => sum + calculateOrderProfit(order), 0);
      const uniqueUsers = new Set(filteredOrders.map(order => order.user_id || order.telegram_id)).size;
      const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
      
      const prevRevenue = prevPaidOrders.reduce((sum, order) => sum + (order.total_usdt || 0), 0);
      const prevProfit = prevPaidOrders.reduce((sum, order) => sum + calculateOrderProfit(order), 0);
      const prevOrders = previousPeriodOrders.length;
      const prevUsers = new Set(previousPeriodOrders.map(order => order.user_id || order.telegram_id)).size;
      const prevAvgOrder = prevPaidOrders.length > 0 ? prevRevenue / prevPaidOrders.length : 0;
      
      const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const profitGrowth = prevProfit > 0 ? ((totalProfit - prevProfit) / prevProfit) * 100 : 0;
      const ordersGrowth = prevOrders > 0 ? ((filteredOrders.length - prevOrders) / prevOrders) * 100 : 0;
      const usersGrowth = prevUsers > 0 ? ((uniqueUsers - prevUsers) / prevUsers) * 100 : 0;
      const avgOrderGrowth = prevAvgOrder > 0 ? ((avgOrderValue - prevAvgOrder) / prevAvgOrder) * 100 : 0;
      
      const calculatedStats = {
        total_revenue_usdt: totalRevenue,
        total_profit_usdt: totalProfit,
        total_orders: filteredOrders.length,
        total_users: uniqueUsers,
        avg_order_value: avgOrderValue,
        revenue_growth: revenueGrowth,
        profit_growth: profitGrowth,
        orders_growth: ordersGrowth,
        users_growth: usersGrowth,
        avg_order_growth: avgOrderGrowth,
        top_products: statsRes.stats?.top_products || [],
        total_products: statsRes.stats?.total_products || 0,
        total_categories: statsRes.stats?.total_categories || 0
      };
      
      setStats(calculatedStats);
      
      if (timeRange === 'today' || timeRange === 'yesterday') {
        const targetDate = timeRange === 'today' ? new Date() : new Date(Date.now() - 86400000);
        targetDate.setHours(0, 0, 0, 0);
        const endDate = new Date(targetDate);
        endDate.setDate(endDate.getDate() + 1);
        
        const hourlyData = [];
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
          
          hourlyData.push({
            _id: `${hour.toString().padStart(2, '0')}:00`,
            revenue: hourRevenue,
            profit: hourProfit,
            allOrders: hourAllOrdersSum
          });
        }
        
        setAnalytics({
          daily_sales: hourlyData,
          category_sales: analyticsRes?.category_sales || [],
          hourly_distribution: analyticsRes?.hourly_distribution || []
        });
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
        
        const dailyData = Array.from(dailyMap.values()).sort((a, b) => a._id.localeCompare(b._id));
        
        setAnalytics({
          daily_sales: dailyData,
          category_sales: analyticsRes?.category_sales || [],
          hourly_distribution: analyticsRes?.hourly_distribution || []
        });
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats({
        total_revenue_usdt: 0,
        total_profit_usdt: 0,
        total_orders: 0,
        total_users: 0,
        avg_order_value: 0,
        revenue_growth: 0,
        profit_growth: 0,
        orders_growth: 0,
        users_growth: 0,
        avg_order_growth: 0,
        top_products: []
      });
      setAnalytics({ daily_sales: [], category_sales: [], hourly_distribution: [] });
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
    '7': isMobile ? '7 days' : 'Last 7 days',
    '30': isMobile ? '30 days' : 'Last 30 days'
  };

  const getTimeRangeIcon = () => {
    switch(timeRange) {
      case 'today':
        return <SunIcon width="16" height="16" />;
      case 'yesterday':
        return <MoonIcon width="16" height="16" />;
      default:
        return <CalendarIcon width="16" height="16" />;
    }
  };

  const formatXAxis = (value) => {
    if (timeRange === 'today' || timeRange === 'yesterday') {
      return value;
    } else {
      if (value && value.includes('-')) {
        const parts = value.split('-');
        return `${parts[1]}/${parts[2]}`;
      }
      return value;
    }
  };

  const renderChart = () => {
    const chartData = analytics.daily_sales || [];
    
    if (chartData.length === 0) {
      return (
        <Flex align="center" justify="center" style={{ height: '100%' }}>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            No data available for this period
          </Text>
        </Flex>
      );
    }

    if (activeChart === 'area') {
      return (
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorAllOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="_id" 
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={formatXAxis}
            tick={{ fontSize: isMobile ? 10 : 12 }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)"
            tick={{ fontSize: isMobile ? 10 : 12 }}
          />
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
          <Area 
            type="monotone" 
            dataKey="allOrders" 
            stroke="#f59e0b" 
            fillOpacity={1} 
            fill="url(#colorAllOrders)"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="All Orders"
          />
        </AreaChart>
      );
    } else if (activeChart === 'bar') {
      return (
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="_id" 
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={formatXAxis}
            tick={{ fontSize: isMobile ? 10 : 12 }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)"
            tick={{ fontSize: isMobile ? 10 : 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Revenue" />
          <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} name="Profit" />
          <Bar dataKey="allOrders" fill="#f59e0b" radius={[8, 8, 0, 0]} name="All Orders" />
        </BarChart>
      );
    } else {
      return (
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="_id" 
            stroke="rgba(255,255,255,0.3)"
            tickFormatter={formatXAxis}
            tick={{ fontSize: isMobile ? 10 : 12 }}
          />
          <YAxis 
            stroke="rgba(255,255,255,0.3)"
            tick={{ fontSize: isMobile ? 10 : 12 }}
          />
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
          <Line 
            type="monotone" 
            dataKey="allOrders" 
            stroke="#f59e0b" 
            strokeWidth={3}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: '#f59e0b' }}
            activeDot={{ r: 6 }}
            name="All Orders"
          />
        </LineChart>
      );
    }
  };

  const profitWarning = stats.total_profit_usdt < 0;

  return (
    <Box style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      <Flex 
        align={isMobile ? 'start' : 'center'} 
        justify="between" 
        direction={isMobile ? 'column' : 'row'}
        gap={isMobile ? '3' : '0'}
        mb={isMobile ? '4' : '6'}
      >
        <Box>
          <Flex align="center" gap={isMobile ? '2' : '3'}>
            <Heading size={isMobile ? '6' : '8'} weight="bold">
              Dashboard
            </Heading>
            {!isMobile && (
              <Button
                size="1"
                variant="ghost"
                color="red"
                onClick={() => setDangerZoneOpen(true)}
                style={{ fontSize: '13px', padding: '4px 8px' }}
              >
                <ExclamationTriangleIcon width="14" height="14" />
                Danger Zone
              </Button>
            )}
          </Flex>
          {!isMobile && (
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
              {timeRange === 'today' ? "Today's live performance metrics" :
               timeRange === 'yesterday' ? "Yesterday's complete overview" :
               "Welcome back! Here's what's happening with your store."}
            </Text>
          )}
        </Box>
        
        <Flex gap={isMobile ? '2' : '3'} align="center" style={{ width: isMobile ? '100%' : 'auto' }}>
          <Select.Root value={timeRange} onValueChange={setTimeRange}>
            <Select.Trigger 
              size={isMobile ? '2' : '3'}
              style={{
                background: 'rgba(20, 20, 25, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                flex: isMobile ? 1 : 0,
                minWidth: isMobile ? 'auto' : '150px'
              }}
            >
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

          <IconButton
            size={isMobile ? '2' : '3'}
            variant="surface"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: 'rgba(20, 20, 25, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ReloadIcon width={isMobile ? '16' : '18'} height={isMobile ? '16' : '18'} />
            </motion.div>
          </IconButton>

          {isMobile && (
            <IconButton
              size="2"
              variant="ghost"
              color="red"
              onClick={() => setDangerZoneOpen(true)}
            >
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

      <Grid 
        columns={{ 
          initial: '2', 
          xs: '2',
          sm: '2', 
          md: '4',
          lg: '4' 
        }} 
        gap={isMobile ? '2' : '4'} 
        mb={isMobile ? '4' : '6'}
      >
        <MobileStatCard
          title="Revenue"
          value={stats.total_revenue_usdt || 0}
          change={stats.revenue_growth}
          icon={RocketIcon}
          color="#8b5cf6"
          prefix="$"
          decimals={isMobile ? 0 : 2}
        />
        <MobileStatCard
          title="Profit"
          value={stats.total_profit_usdt || 0}
          change={stats.profit_growth}
          icon={TargetIcon}
          color={stats.total_profit_usdt >= 0 ? "#10b981" : "#ef4444"}
          prefix="$"
          decimals={isMobile ? 0 : 2}
        />
        <MobileStatCard
          title="Orders"
          value={stats.total_orders || 0}
          change={stats.orders_growth}
          icon={ActivityLogIcon}
          color="#f59e0b"
        />
        <MobileStatCard
          title="Avg Order"
          value={stats.avg_order_value || 0}
          change={stats.avg_order_growth}
          icon={LightningBoltIcon}
          color="#06b6d4"
          prefix="$"
          decimals={isMobile ? 0 : 2}
        />
      </Grid>

      <Grid columns={{ initial: '1', lg: '3' }} gap={isMobile ? '3' : '4'} mb={isMobile ? '4' : '6'}>
        <Box style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
          <Card style={{
            background: 'rgba(20, 20, 25, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: isMobile ? '16px' : '24px',
            minHeight: isMobile ? '250px' : '400px'
          }}>
            <Flex 
              align={isMobile ? 'start' : 'center'} 
              justify="between" 
              mb={isMobile ? '3' : '4'}
              direction={isMobile ? 'column' : 'row'}
              gap={isMobile ? '2' : '0'}
            >
              <Box>
                <Heading size={isMobile ? '3' : '4'}>
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
              {!isMobile && (
                <Tabs.Root value={activeChart} onValueChange={setActiveChart}>
                  <Tabs.List size="1">
                    <Tabs.Trigger value="area">Area</Tabs.Trigger>
                    <Tabs.Trigger value="bar">Bar</Tabs.Trigger>
                    <Tabs.Trigger value="line">Line</Tabs.Trigger>
                  </Tabs.List>
                </Tabs.Root>
              )}
            </Flex>

            <Box style={{ width: '100%', height: isMobile ? '200px' : '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </Box>
          </Card>
        </Box>

        {!isMobile && analytics.category_sales.length > 0 && (
          <Card style={{
            background: 'rgba(20, 20, 25, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '24px',
            minHeight: '400px'
          }}>
            <Heading size="4" mb="4">Category Sales</Heading>
            
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
          </Card>
        )}
      </Grid>

      <Grid columns={{ initial: '1', lg: '2' }} gap={isMobile ? '3' : '4'}>
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: isMobile ? '16px' : '24px'
        }}>
          <Heading size={isMobile ? '3' : '4'} mb={isMobile ? '3' : '4'}>
            Recent Orders
          </Heading>
          
          <Flex direction="column" gap={isMobile ? '2' : '3'}>
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
                    padding: isMobile ? '10px' : '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <Flex align="center" gap={isMobile ? '2' : '3'}>
                      <Avatar
                        size={isMobile ? '1' : '2'}
                        fallback={order.order_number?.slice(-2) || 'NA'}
                        style={{
                          background: `linear-gradient(135deg, ${COLORS[idx % COLORS.length]} 0%, ${COLORS[idx % COLORS.length]}90 100%)`
                        }}
                      />
                      <Box>
                        <Text size={isMobile ? '1' : '2'} weight="medium" style={{ display: 'block', marginBottom: '2px' }}>
                          {order.order_number}
                        </Text>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {new Date(order.created_at).toLocaleDateString()}
                        </Text>
                      </Box>
                    </Flex>
                    
                    <Flex align="center" gap={isMobile ? '2' : '3'}>
                      <Text size={isMobile ? '2' : '3'} weight="bold">
                        ${formatPrice(order.total_usdt)}
                      </Text>
                      {!isMobile && (
                        <Badge 
                          size="1"
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
                      )}
                    </Flex>
                  </Flex>
                </motion.div>
              ))
            )}
          </Flex>
        </Card>

        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: isMobile ? '16px' : '24px'
        }}>
          <Heading size={isMobile ? '3' : '4'} mb={isMobile ? '3' : '4'}>
            Top Products
          </Heading>
          
          <Flex direction="column" gap={isMobile ? '2' : '3'}>
            {(stats.top_products || []).slice(0, 5).map((product, idx) => {
              const profitPerUnit = (product.price_usdt - (product.purchase_price_usdt || 0));
              const totalProductProfit = profitPerUnit * product.sold_count;
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Flex align="center" justify="between">
                    <Flex align="center" gap={isMobile ? '2' : '3'}>
                      <Box style={{
                        width: isMobile ? '24px' : '32px',
                        height: isMobile ? '24px' : '32px',
                        borderRadius: '8px',
                        background: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#8b5cf6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '12px' : '14px'
                      }}>
                        {idx + 1}
                      </Box>
                      <Box>
                        <Text size={isMobile ? '1' : '2'} weight="medium" style={{ display: 'block', marginBottom: '2px' }}>
                          {product.name}
                        </Text>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {product.sold_count} sold
                        </Text>
                      </Box>
                    </Flex>
                    
                    <Text size={isMobile ? '2' : '3'} weight="bold" style={{ color: '#10b981' }}>
                      ${formatPrice(totalProductProfit)}
                    </Text>
                  </Flex>
                  
                  {!isMobile && (
                    <Box mt="2">
                      <Progress 
                        value={(product.sold_count / Math.max(...(stats.top_products || [{sold_count: 1}]).map(p => p.sold_count))) * 100}
                        size="1"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)'
                        }}
                      />
                    </Box>
                  )}
                </motion.div>
              );
            })}
            {(!stats.top_products || stats.top_products.length === 0) && (
              <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '20px' }}>
                No products sold yet
              </Text>
            )}
          </Flex>
        </Card>
      </Grid>

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
