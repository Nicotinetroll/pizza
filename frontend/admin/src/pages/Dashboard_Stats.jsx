// Dashboard_Stats.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Box, Card, Flex, Grid, Text } from '@radix-ui/themes';
import { ArrowUpIcon, ArrowDownIcon, RocketIcon, TargetIcon, ActivityLogIcon, LightningBoltIcon } from '@radix-ui/react-icons';

const StatCard = ({ title, value, change, icon: Icon, color, prefix = '', isMobile }) => {
  const isPositive = change >= 0;
  
  const formatValue = (val) => {
    if (title === "Orders") {
      return { main: Math.floor(val).toLocaleString('en-US'), decimal: null };
    }
    if (title === "Revenue" || title === "Profit" || title === "Avg Order") {
      const [whole, decimal] = val.toFixed(2).split('.');
      return { main: parseInt(whole).toLocaleString('en-US'), decimal: decimal };
    }
    return { main: Math.floor(val).toLocaleString('en-US'), decimal: null };
  };

  const formatted = formatValue(value);

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
        <Flex direction="column" gap={isMobile ? '2' : '4'}>
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
            <Text size={isMobile ? '5' : '8'} weight="bold" style={{ display: 'flex', alignItems: 'baseline' }}>
              {prefix && <span>{prefix}</span>}
              <span>{formatted.main}</span>
              {formatted.decimal && (
                <span style={{ fontSize: '0.4em', opacity: 0.6 }}>.{formatted.decimal}</span>
              )}
            </Text>
            {change !== undefined && !isMobile && (
              <Flex align="center" gap="1" mt="2">
                {isPositive ? (
                  <ArrowUpIcon width="16" height="16" style={{ color: '#10b981' }} />
                ) : (
                  <ArrowDownIcon width="16" height="16" style={{ color: '#ef4444' }} />
                )}
                <Text size="2" style={{ color: isPositive ? '#10b981' : '#ef4444' }}>
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

const StatsCards = ({ stats, isMobile }) => {
  return (
    <Grid columns={{ initial: '2', xs: '2', sm: '2', md: '4', lg: '4' }} gap={isMobile ? '2' : '4'} mb={isMobile ? '4' : '6'}>
      <StatCard 
        title="Revenue" 
        value={stats.total_revenue_usdt || 0} 
        change={stats.revenue_growth} 
        icon={RocketIcon} 
        color="#8b5cf6" 
        prefix="$" 
        isMobile={isMobile}
      />
      <StatCard 
        title="Profit" 
        value={stats.total_profit_usdt || 0} 
        change={stats.profit_growth} 
        icon={TargetIcon} 
        color={stats.total_profit_usdt >= 0 ? "#10b981" : "#ef4444"} 
        prefix="$" 
        isMobile={isMobile}
      />
      <StatCard 
        title="Orders" 
        value={stats.total_orders || 0} 
        change={stats.orders_growth} 
        icon={ActivityLogIcon} 
        color="#f59e0b" 
        isMobile={isMobile}
      />
      <StatCard 
        title="Avg Order" 
        value={stats.avg_order_value || 0} 
        change={stats.avg_order_growth} 
        icon={LightningBoltIcon} 
        color="#06b6d4" 
        prefix="$" 
        isMobile={isMobile}
      />
    </Grid>
  );
};

export default StatsCards;
