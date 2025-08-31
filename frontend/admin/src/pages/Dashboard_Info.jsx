// Dashboard_Info.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, Badge, Box, Card, Flex, Grid, Heading, Progress, Text } from '@radix-ui/themes';

const InfoCards = ({ recentOrders, stats, isMobile }) => {
  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
  
  const formatPrice = (price) => {
    if (typeof price !== 'number') return '0';
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Grid columns={{ initial: '1', lg: '2' }} gap={isMobile ? '3' : '4'}>
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: isMobile ? '16px' : '24px'
      }}>
        <Heading size={isMobile ? '3' : '4'} mb={isMobile ? '3' : '4'}>Recent Orders</Heading>
        
        <Flex direction="column" gap={isMobile ? '2' : '3'}>
          {recentOrders.length === 0 ? (
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '20px' }}>
              No orders yet
            </Text>
          ) : (
            recentOrders.map((order, idx) => (
              <motion.div key={order._id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
                <Flex align="center" justify="between" style={{
                  padding: isMobile ? '10px' : '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <Flex align="center" gap={isMobile ? '2' : '3'}>
                    <Avatar size={isMobile ? '1' : '2'} fallback={order.order_number?.slice(-2) || 'NA'} style={{
                      background: `linear-gradient(135deg, ${COLORS[idx % COLORS.length]} 0%, ${COLORS[idx % COLORS.length]}90 100%)`
                    }} />
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
                    <Text size={isMobile ? '2' : '3'} weight="bold">${formatPrice(order.total_usdt)}</Text>
                    {!isMobile && (
                      <Badge size="1" color={
                        order.status === 'completed' ? 'green' :
                        order.status === 'paid' ? 'blue' :
                        order.status === 'processing' ? 'orange' :
                        'gray'
                      } variant="soft">
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
        <Heading size={isMobile ? '3' : '4'} mb={isMobile ? '3' : '4'}>Top Products</Heading>
        
        <Flex direction="column" gap={isMobile ? '2' : '3'}>
          {(stats.top_products || []).slice(0, 5).map((product, idx) => {
            const profitPerUnit = (product.price_usdt - (product.purchase_price_usdt || 0));
            const totalProductProfit = profitPerUnit * product.sold_count;
            
            return (
              <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
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
                    <Progress value={(product.sold_count / Math.max(...(stats.top_products || [{sold_count: 1}]).map(p => p.sold_count))) * 100} size="1" style={{
                      background: 'rgba(255, 255, 255, 0.05)'
                    }} />
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
  );
};

export default InfoCards;
