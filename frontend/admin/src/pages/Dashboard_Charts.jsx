// Dashboard_Charts.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Card, Flex, Grid, Heading, Tabs, Text } from '@radix-ui/themes';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

const ChartSection = ({ analytics, timeRange, isMobile }) => {
  const [activeChart, setActiveChart] = useState('area');
  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

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

  const formatPrice = (price) => {
    if (typeof price !== 'number') return '0';
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    const commonGridProps = {
      strokeDasharray: "3 3",
      stroke: "rgba(255,255,255,0.05)"
    };

    const commonAxisProps = {
      stroke: "rgba(255,255,255,0.3)",
      tick: { fontSize: isMobile ? 10 : 12 }
    };

    if (activeChart === 'area') {
      return (
        <AreaChart {...commonProps}>
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
          <CartesianGrid {...commonGridProps} />
          <XAxis dataKey="_id" tickFormatter={formatXAxis} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
          <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} name="Profit" />
          <Area type="monotone" dataKey="allOrders" stroke="#f59e0b" fillOpacity={1} fill="url(#colorAllOrders)" strokeWidth={2} strokeDasharray="5 5" name="All Orders" />
        </AreaChart>
      );
    } else if (activeChart === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid {...commonGridProps} />
          <XAxis dataKey="_id" tickFormatter={formatXAxis} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Revenue" />
          <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} name="Profit" />
          <Bar dataKey="allOrders" fill="#f59e0b" radius={[8, 8, 0, 0]} name="All Orders" />
        </BarChart>
      );
    } else {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid {...commonGridProps} />
          <XAxis dataKey="_id" tickFormatter={formatXAxis} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} name="Revenue" />
          <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} name="Profit" />
          <Line type="monotone" dataKey="allOrders" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} name="All Orders" />
        </LineChart>
      );
    }
  };

  return (
    <Grid columns={{ initial: '1', lg: '3' }} gap={isMobile ? '3' : '4'} mb={isMobile ? '4' : '6'}>
      <Box style={{ gridColumn: isMobile ? 'span 1' : 'span 2' }}>
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: isMobile ? '16px' : '24px',
          height: isMobile ? '250px' : '500px'
        }}>
          <Flex align={isMobile ? 'start' : 'center'} justify="between" direction={isMobile ? 'column' : 'row'} gap={isMobile ? '2' : '0'} mb={isMobile ? '3' : '4'}>
            <Box>
              <Heading size={isMobile ? '3' : '4'}>
                {timeRange === 'today' ? 'Today\'s Performance' :
                 timeRange === 'yesterday' ? 'Yesterday\'s Performance' :
                 timeRange === 'lifetime' ? 'All-Time Performance' :
                 'Sales Analytics'}
              </Heading>
              <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                {(timeRange === 'today' || timeRange === 'yesterday') ? 'Hourly breakdown' : 'Daily breakdown'}
              </Text>
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

          <Box style={{ width: '100%', height: isMobile ? '200px' : '420px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </Box>
        </Card>
      </Box>

      {!isMobile && (
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '24px',
          height: '500px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Heading size="4" mb="2">Category Performance</Heading>
          <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '16px' }}>
            Revenue distribution by category
          </Text>
          
          {analytics.category_sales?.length === 0 ? (
            <Flex align="center" justify="center" style={{ flex: 1 }}>
              <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                No category data available
              </Text>
            </Flex>
          ) : (
            <Box style={{ flex: 1, overflowY: 'auto' }}>
              <Flex direction="column" gap="2">
                {(analytics.category_sales || []).sort((a, b) => b.revenue - a.revenue).map((cat, idx) => {
                  const totalRevenue = analytics.category_sales.reduce((sum, c) => sum + (c.revenue || 0), 0);
                  const percentage = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;
                  
                  return (
                    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                      <Box style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <Flex align="center" justify="between">
                          <Flex align="center" gap="2" style={{ flex: 1 }}>
                            <Box style={{
                              width: '3px',
                              height: '24px',
                              borderRadius: '2px',
                              background: COLORS[idx % COLORS.length]
                            }} />
                            <Box>
                              <Text size="2" weight="medium">{cat.emoji} {cat.name}</Text>
                              <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                {percentage.toFixed(1)}% of total
                              </Text>
                            </Box>
                          </Flex>
                          <Text size="2" weight="bold">${formatPrice(cat.revenue)}</Text>
                        </Flex>
                        <Box style={{
                          width: '100%',
                          height: '3px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '2px',
                          overflow: 'hidden',
                          marginTop: '8px'
                        }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.1 }}
                            style={{
                              height: '100%',
                              background: `linear-gradient(90deg, ${COLORS[idx % COLORS.length]}40, ${COLORS[idx % COLORS.length]})`,
                              borderRadius: '2px'
                            }}
                          />
                        </Box>
                      </Box>
                    </motion.div>
                  );
                })}
              </Flex>
            </Box>
          )}
        </Card>
      )}
    </Grid>
  );
};

export default ChartSection;
