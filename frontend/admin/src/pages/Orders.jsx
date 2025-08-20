import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, Select,
  Table, IconButton, Heading, TextField, Dialog,
  Tabs, Avatar, Separator, ScrollArea, Code, DropdownMenu
} from '@radix-ui/themes';
import {
  MagnifyingGlassIcon, ReloadIcon, CalendarIcon, DownloadIcon,
  ChevronDownIcon, ChevronRightIcon, ClockIcon, CheckCircledIcon,
  CrossCircledIcon, RocketIcon, CopyIcon, ExternalLinkIcon,
  InfoCircledIcon, IdCardIcon, GlobeIcon, CubeIcon, PersonIcon,
  DotsHorizontalIcon
} from '@radix-ui/react-icons';
import { ordersAPI, usersAPI } from '../services/api';

// Order status colors and icons
const statusConfig = {
  pending: { color: 'amber', icon: ClockIcon, label: 'Pending' },
  paid: { color: 'blue', icon: CheckCircledIcon, label: 'Paid' },
  processing: { color: 'purple', icon: RocketIcon, label: 'Processing' },
  completed: { color: 'green', icon: CheckCircledIcon, label: 'Completed' },
  cancelled: { color: 'red', icon: CrossCircledIcon, label: 'Cancelled' }
};

// Mobile Order Card Component
const MobileOrderCard = ({ order, onStatusUpdate, onViewDetails }) => {
  const StatusIcon = statusConfig[order.status]?.icon || ClockIcon;
  const isMobile = window.innerWidth < 768;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isMobile ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
    >
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: isMobile ? '12px' : '16px',
        marginBottom: '12px'
      }}>
        {/* Header */}
        <Flex align="center" justify="between" mb="3">
          <Flex align="center" gap="2">
            <Avatar
              size={isMobile ? '1' : '2'}
              fallback={order.username?.slice(0, 2).toUpperCase() || order.telegram_id?.toString().slice(-2) || 'NA'}
              style={{
                background: `linear-gradient(135deg, ${statusConfig[order.status]?.color || '#8b5cf6'} 0%, ${statusConfig[order.status]?.color || '#8b5cf6'}90 100%)`
              }}
            />
            <Box>
              <Code size={isMobile ? '1' : '2'} style={{ color: '#8b5cf6' }}>
                {order.order_number}
              </Code>
              <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                {new Date(order.created_at).toLocaleDateString()}
              </Text>
            </Box>
          </Flex>
          
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton size="1" variant="ghost">
                <DotsHorizontalIcon width="16" height="16" />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => onViewDetails(order)}>
                <ExternalLinkIcon width="14" height="14" />
                View Details
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              {Object.entries(statusConfig).map(([value, config]) => (
                <DropdownMenu.Item
                  key={value}
                  onClick={() => onStatusUpdate(order._id, value)}
                  disabled={order.status === value}
                >
                  <Flex align="center" gap="2">
                    <config.icon width="14" height="14" />
                    Set as {config.label}
                  </Flex>
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>

        {/* Customer Info */}
        <Flex align="center" justify="between" mb="3">
          <Flex align="center" gap="2">
            <PersonIcon width="14" height="14" style={{ opacity: 0.6 }} />
            <Text size={isMobile ? '1' : '2'}>
              @{order.username || `user${order.telegram_id}`}
            </Text>
          </Flex>
          <Flex align="center" gap="1">
            <GlobeIcon width="12" height="12" style={{ opacity: 0.6 }} />
            <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {order.delivery_city}
            </Text>
          </Flex>
        </Flex>

        {/* Items Preview */}
        {!isMobile && order.items && order.items.length > 0 && (
          <Box style={{
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '6px',
            marginBottom: '12px'
          }}>
            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {order.items.length} item{order.items.length > 1 ? 's' : ''}: {order.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ').slice(0, 50)}...
            </Text>
          </Box>
        )}

        {/* Footer */}
        <Flex align="center" justify="between">
          <Flex align="center" gap="2">
            <Badge 
              size={isMobile ? '1' : '2'}
              color={statusConfig[order.status]?.color}
              variant="soft"
            >
              <StatusIcon width="12" height="12" />
              {statusConfig[order.status]?.label}
            </Badge>
            {order.has_discount && (
              <Badge size="1" color="green" variant="soft">
                -{order.discount_amount?.toFixed(0)}
              </Badge>
            )}
          </Flex>
          
          <Text size={isMobile ? '3' : '4'} weight="bold" style={{ color: '#10b981' }}>
            ${order.total_usdt?.toFixed(2)}
          </Text>
        </Flex>
      </Card>
    </motion.div>
  );
};

// Order detail modal component (optimized for mobile)
const OrderDetailModal = ({ order, isOpen, onClose, onStatusUpdate }) => {
  const [newStatus, setNewStatus] = useState(order?.status || 'pending');
  const [updating, setUpdating] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (order) {
      setNewStatus(order.status);
    }
  }, [order]);

  const handleStatusUpdate = async () => {
    if (newStatus === order.status) return;
    
    setUpdating(true);
    await onStatusUpdate(order._id, newStatus);
    setUpdating(false);
    onClose();
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  if (!order) return null;

  const StatusIcon = statusConfig[order.status]?.icon || ClockIcon;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ 
        maxWidth: isMobile ? '95%' : '700px',
        maxHeight: '90vh',
        margin: isMobile ? '10px' : 'auto',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
        <Dialog.Title>
          <Flex align="center" gap={isMobile ? '2' : '3'}>
            <Avatar
              size={isMobile ? '2' : '3'}
              fallback={order.order_number?.slice(-2) || 'NA'}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
              }}
            />
            <Box>
              <Heading size={isMobile ? '3' : '4'}>Order Details</Heading>
              <Code size={isMobile ? '1' : '2'} style={{ color: '#8b5cf6' }}>{order.order_number}</Code>
            </Box>
          </Flex>
        </Dialog.Title>

        <Dialog.Description>
          <ScrollArea style={{ maxHeight: isMobile ? '60vh' : '60vh' }}>
            <Flex direction="column" gap={isMobile ? '3' : '4'} mt={isMobile ? '3' : '4'}>
              {/* Status Section */}
              <Card style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                padding: isMobile ? '12px' : '16px'
              }}>
                <Flex align="center" justify="between">
                  <Flex align="center" gap="2">
                    <StatusIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: `var(--${statusConfig[order.status]?.color}-9)` }} />
                    <Text size={isMobile ? '2' : '3'} weight="medium">Current Status</Text>
                  </Flex>
                  <Badge size={isMobile ? '1' : '2'} color={statusConfig[order.status]?.color}>
                    {statusConfig[order.status]?.label}
                  </Badge>
                </Flex>
              </Card>

              {/* Customer Info */}
              <Card style={{ padding: isMobile ? '12px' : '16px' }}>
                <Heading size={isMobile ? '2' : '3'} mb={isMobile ? '2' : '3'}>Customer Information</Heading>
                <Grid columns={isMobile ? '1' : '2'} gap={isMobile ? '2' : '3'}>
                  <Flex align="center" gap="2">
                    <PersonIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ opacity: 0.6 }} />
                    <Text size={isMobile ? '1' : '2'}>
                      Telegram: <Code size="1">@{order.username || `user${order.telegram_id}`}</Code>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <IdCardIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ opacity: 0.6 }} />
                    <Text size={isMobile ? '1' : '2'}>
                      ID: <Code size="1">{order.telegram_id}</Code>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <GlobeIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ opacity: 0.6 }} />
                    <Text size={isMobile ? '1' : '2'}>
                      Location: <strong>{order.delivery_city}, {order.delivery_country}</strong>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <CalendarIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ opacity: 0.6 }} />
                    <Text size={isMobile ? '1' : '2'}>
                      Created: {new Date(order.created_at).toLocaleString()}
                    </Text>
                  </Flex>
                </Grid>
              </Card>

              {/* Order Items */}
              <Card style={{ padding: isMobile ? '12px' : '16px' }}>
                <Heading size={isMobile ? '2' : '3'} mb={isMobile ? '2' : '3'}>Order Items</Heading>
                {isMobile ? (
                  <Flex direction="column" gap="2">
                    {order.items?.map((item, idx) => (
                      <Box key={idx} style={{
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <Flex justify="between" mb="1">
                          <Text size="2" weight="medium">{item.product_name}</Text>
                          <Badge size="1" variant="soft">{item.quantity}x</Badge>
                        </Flex>
                        <Flex justify="between">
                          <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            ${item.price_usdt?.toFixed(2)} each
                          </Text>
                          <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                            ${item.subtotal_usdt?.toFixed(2)}
                          </Text>
                        </Flex>
                      </Box>
                    ))}
                  </Flex>
                ) : (
                  <Table.Root variant="surface">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Product</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Price</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Qty</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Total</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {order.items?.map((item, idx) => (
                        <Table.Row key={idx}>
                          <Table.Cell>
                            <Flex align="center" gap="2">
                              <CubeIcon width="16" height="16" style={{ opacity: 0.6 }} />
                              <Text size="2">{item.product_name}</Text>
                            </Flex>
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="2">${item.price_usdt?.toFixed(2)}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant="soft">{item.quantity}</Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Text size="2" weight="medium">${item.subtotal_usdt?.toFixed(2)}</Text>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}

                {/* Totals */}
                <Separator size="4" my={isMobile ? '2' : '3'} />
                <Flex direction="column" gap="2">
                  {order.has_discount && (
                    <>
                      <Flex justify="between">
                        <Text size={isMobile ? '1' : '2'}>Subtotal:</Text>
                        <Text size={isMobile ? '1' : '2'}>${((order.total_usdt || 0) + (order.discount_amount || 0)).toFixed(2)}</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size={isMobile ? '1' : '2'} style={{ color: '#10b981' }}>
                          Discount ({order.referral_code}):
                        </Text>
                        <Text size={isMobile ? '1' : '2'} style={{ color: '#10b981' }}>
                          -${order.discount_amount?.toFixed(2)}
                        </Text>
                      </Flex>
                    </>
                  )}
                  <Flex justify="between">
                    <Text size={isMobile ? '2' : '3'} weight="bold">Total:</Text>
                    <Text size={isMobile ? '2' : '3'} weight="bold" style={{ color: '#8b5cf6' }}>
                      ${order.total_usdt?.toFixed(2)}
                    </Text>
                  </Flex>
                </Flex>
              </Card>

              {/* Payment Info */}
              {order.payment && (
                <Card style={{ padding: isMobile ? '12px' : '16px' }}>
                  <Heading size={isMobile ? '2' : '3'} mb={isMobile ? '2' : '3'}>Payment Information</Heading>
                  <Flex direction="column" gap={isMobile ? '2' : '3'}>
                    <Flex align="center" justify="between">
                      <Text size={isMobile ? '1' : '2'}>Method:</Text>
                      <Badge size={isMobile ? '1' : '2'} color="purple">{order.payment.method}</Badge>
                    </Flex>
                    {order.payment.transaction_id && (
                      <Box>
                        <Text size={isMobile ? '1' : '2'} style={{ marginBottom: '8px' }}>Transaction:</Text>
                        <Flex align="center" gap="2">
                          <Code size="1" style={{ 
                            flex: 1,
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '4px',
                            wordBreak: 'break-all',
                            fontSize: isMobile ? '10px' : '11px'
                          }}>
                            {order.payment.transaction_id}
                          </Code>
                          <IconButton
                            size="1"
                            variant="ghost"
                            onClick={() => copyToClipboard(order.payment.transaction_id, 'tx')}
                          >
                            {copiedText === 'tx' ? (
                              <CheckCircledIcon width="14" height="14" style={{ color: '#10b981' }} />
                            ) : (
                              <CopyIcon width="14" height="14" />
                            )}
                          </IconButton>
                        </Flex>
                      </Box>
                    )}
                  </Flex>
                </Card>
              )}

              {/* Status Update */}
              <Card style={{
                background: 'rgba(20, 20, 25, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: isMobile ? '12px' : '16px'
              }}>
                <Heading size={isMobile ? '2' : '3'} mb={isMobile ? '2' : '3'}>Update Status</Heading>
                <Flex gap={isMobile ? '2' : '3'} align="center" direction={isMobile ? 'column' : 'row'}>
                  <Select.Root value={newStatus} onValueChange={setNewStatus} style={{ flex: 1 }}>
                    <Select.Trigger style={{ width: '100%' }}>
                      <Flex align="center" gap="2">
                        {React.createElement(statusConfig[newStatus]?.icon || ClockIcon, { width: 16, height: 16 })}
                        <Text>{statusConfig[newStatus]?.label}</Text>
                      </Flex>
                    </Select.Trigger>
                    <Select.Content>
                      {Object.entries(statusConfig).map(([value, config]) => (
                        <Select.Item key={value} value={value}>
                          <Flex align="center" gap="2">
                            <config.icon width="16" height="16" />
                            {config.label}
                          </Flex>
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={updating || newStatus === order.status}
                    style={{
                      width: isMobile ? '100%' : 'auto',
                      background: newStatus !== order.status ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.1)',
                      cursor: updating || newStatus === order.status ? 'not-allowed' : 'pointer',
                      opacity: updating || newStatus === order.status ? 0.5 : 1
                    }}
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </Button>
                </Flex>
              </Card>
            </Flex>
          </ScrollArea>
        </Dialog.Description>

        <Flex gap="3" mt={isMobile ? '4' : '6'} justify="end">
          <Dialog.Close>
            <Button variant="soft" style={{ width: isMobile ? '100%' : 'auto' }}>Close</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await ordersAPI.getAll();
      
      // Fetch user details for orders that have telegram_id but no username
      const ordersWithUsernames = await Promise.all(
        (response.orders || []).map(async (order) => {
          // If order already has username, use it
          if (order.username) {
            return order;
          }
          
          // Try to find user by telegram_id to get username
          try {
            const usersResponse = await usersAPI.getAll();
            const user = usersResponse.users?.find(u => u.telegram_id === order.telegram_id);
            if (user) {
              return { ...order, username: user.username };
            }
          } catch (err) {
            console.error('Error fetching user for order:', err);
          }
          
          return order;
        })
      );
      
      setOrders(ordersWithUsernames);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const toggleRowExpansion = (orderId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedRows(newExpanded);
  };

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.telegram_id?.toString().includes(searchTerm) ||
      order.delivery_city?.toLowerCase().includes(searchLower) ||
      order.delivery_country?.toLowerCase().includes(searchLower) ||
      order.username?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    paid: orders.filter(o => o.status === 'paid').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

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

  return (
    <Box style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      {/* Header - Mobile Optimized */}
      <Flex 
        align={isMobile ? 'start' : 'center'} 
        justify="between" 
        mb={isMobile ? '4' : '6'}
        direction={isMobile ? 'column' : 'row'}
        gap={isMobile ? '3' : '0'}
      >
        <Box>
          <Heading size={isMobile ? '6' : '8'} weight="bold" style={{ marginBottom: '8px' }}>
            Orders
          </Heading>
          {!isMobile && (
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Manage and track all customer orders
            </Text>
          )}
        </Box>

        <Button
          size={isMobile ? '2' : '3'}
          variant="surface"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: 'rgba(20, 20, 25, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          <motion.div
            animate={refreshing ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ReloadIcon width={isMobile ? '16' : '18'} height={isMobile ? '16' : '18'} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </motion.div>
        </Button>
      </Flex>

      {/* Stats Cards - Mobile Responsive */}
      <Grid 
        columns={{ 
          initial: '2',
          xs: '2',
          sm: '3',
          lg: '5'
        }} 
        gap={isMobile ? '2' : '4'} 
        mb={isMobile ? '4' : '6'}
      >
        {Object.entries(stats).map(([key, value]) => {
          const config = key === 'total' ? 
            { color: '#8b5cf6', label: 'Total', icon: RocketIcon } :
            statusConfig[key];
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={!isMobile ? { y: -2 } : {}}
            >
              <Card style={{
                background: 'rgba(20, 20, 25, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: isMobile ? '12px' : '20px'
              }}>
                <Flex align="center" justify="between">
                  <Box>
                    <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                      {config?.label || key}
                    </Text>
                    <Text size={isMobile ? '5' : '6'} weight="bold">
                      {value}
                    </Text>
                  </Box>
                  <Box style={{
                    width: isMobile ? '32px' : '40px',
                    height: isMobile ? '32px' : '40px',
                    borderRadius: isMobile ? '8px' : '10px',
                    background: `${config?.color || '#8b5cf6'}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {config?.icon && <config.icon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: config?.color || '#8b5cf6' }} />}
                  </Box>
                </Flex>
              </Card>
            </motion.div>
          );
        })}
      </Grid>

      {/* Filters - Mobile Optimized */}
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: isMobile ? '12px' : '20px',
        marginBottom: isMobile ? '16px' : '24px'
      }}>
        <Flex 
          gap={isMobile ? '2' : '3'} 
          align="center"
          direction={isMobile ? 'column' : 'row'}
        >
          <Box style={{ flex: 1, position: 'relative', width: '100%' }}>
            <MagnifyingGlassIcon 
              width={isMobile ? '14' : '16'}
              height={isMobile ? '14' : '16'}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.5,
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              placeholder={isMobile ? "Search orders..." : "Search by order number, telegram ID, username, or city..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: isMobile ? '10px 10px 10px 36px' : '12px 12px 12px 40px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: isMobile ? '14px' : '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.boxShadow = '0 0 0 1px rgba(139, 92, 246, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </Box>

          <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger
              size={isMobile ? '2' : '3'}
              variant="surface"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                minWidth: isMobile ? '100%' : '150px'
              }}
            >
              <Flex align="center" gap="2">
                {statusFilter === 'all' ? (
                  <>
                    <InfoCircledIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
                    <Text size={isMobile ? '2' : '3'}>All Status</Text>
                  </>
                ) : (
                  <>
                    {React.createElement(statusConfig[statusFilter]?.icon || ClockIcon, { width: isMobile ? 14 : 16, height: isMobile ? 14 : 16 })}
                    <Text size={isMobile ? '2' : '3'}>{statusConfig[statusFilter]?.label}</Text>
                  </>
                )}
              </Flex>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">
                <Flex align="center" gap="2">
                  <InfoCircledIcon width="16" height="16" />
                  All Status
                </Flex>
              </Select.Item>
              <Select.Separator />
              {Object.entries(statusConfig).map(([value, config]) => (
                <Select.Item key={value} value={value}>
                  <Flex align="center" gap="2">
                    <config.icon width="16" height="16" />
                    {config.label}
                  </Flex>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      </Card>

      {/* Orders Display - Mobile Cards vs Desktop Table */}
      {filteredOrders.length === 0 ? (
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: isMobile ? '40px 20px' : '60px'
        }}>
          <Flex align="center" justify="center">
            <Text size={isMobile ? '2' : '3'} style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {searchTerm || statusFilter !== 'all' ? 'No orders found matching your filters' : 'No orders yet'}
            </Text>
          </Flex>
        </Card>
      ) : (
        <>
          {isMobile ? (
            // Mobile Cards View
            <Box>
              {filteredOrders.map((order) => (
                <MobileOrderCard
                  key={order._id}
                  order={order}
                  onStatusUpdate={updateOrderStatus}
                  onViewDetails={openOrderModal}
                />
              ))}
            </Box>
          ) : (
            // Desktop Table View
            <Card style={{
              background: 'rgba(20, 20, 25, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: 0,
              overflow: 'hidden'
            }}>
              <Box style={{ overflowX: 'auto' }}>
                <Table.Root variant="surface">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell width="40px"></Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Order #</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Customer</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Location</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Total</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell width="60px">View</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filteredOrders.map((order, idx) => {
                      const isExpanded = expandedRows.has(order._id);
                      const StatusIcon = statusConfig[order.status]?.icon || ClockIcon;
                      
                      return (
                        <React.Fragment key={order._id}>
                          <Table.Row
                            onClick={() => toggleRowExpansion(order._id)}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              background: isExpanded ? 'rgba(139, 92, 246, 0.05)' : 'transparent'
                            }}
                          >
                            <Table.Cell>
                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronRightIcon width="16" height="16" />
                              </motion.div>
                            </Table.Cell>
                            <Table.Cell>
                              <Code size="2" style={{ color: '#8b5cf6' }}>
                                {order.order_number}
                              </Code>
                            </Table.Cell>
                            <Table.Cell>
                              <Flex direction="column" gap="1">
                                <Text size="2">{new Date(order.created_at).toLocaleDateString()}</Text>
                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                  {new Date(order.created_at).toLocaleTimeString()}
                                </Text>
                              </Flex>
                            </Table.Cell>
                            <Table.Cell>
                              <Flex align="center" gap="2">
                                <Avatar
                                  size="1"
                                  fallback={order.username?.slice(0, 2).toUpperCase() || order.telegram_id?.toString().slice(-2) || 'NA'}
                                  style={{
                                    background: `linear-gradient(135deg, ${statusConfig[order.status]?.color || '#8b5cf6'} 0%, ${statusConfig[order.status]?.color || '#8b5cf6'}90 100%)`
                                  }}
                                />
                                <Flex direction="column">
                                  <Text size="2">@{order.username || `user${order.telegram_id}`}</Text>
                                  {order.first_name && (
                                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                      {order.first_name} {order.last_name}
                                    </Text>
                                  )}
                                </Flex>
                              </Flex>
                            </Table.Cell>
                            <Table.Cell>
                              <Flex align="center" gap="1">
                                <GlobeIcon width="14" height="14" style={{ opacity: 0.6 }} />
                                <Text size="2">{order.delivery_city}, {order.delivery_country}</Text>
                              </Flex>
                            </Table.Cell>
                            <Table.Cell>
                              <Flex direction="column" gap="1">
                                <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                                  ${order.total_usdt?.toFixed(2)}
                                </Text>
                                {order.has_discount && (
                                  <Badge size="1" color="green" variant="soft">
                                    -${order.discount_amount?.toFixed(2)}
                                  </Badge>
                                )}
                              </Flex>
                            </Table.Cell>
                            <Table.Cell>
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                  <Button
                                    variant="soft"
                                    color={statusConfig[order.status]?.color}
                                    size="2"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <Flex align="center" gap="2">
                                      <StatusIcon width="14" height="14" />
                                      <Text size="2">{statusConfig[order.status]?.label}</Text>
                                      <ChevronDownIcon width="14" height="14" />
                                    </Flex>
                                  </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                  {Object.entries(statusConfig).map(([value, config]) => (
                                    <DropdownMenu.Item
                                      key={value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateOrderStatus(order._id, value);
                                      }}
                                    >
                                      <Flex align="center" gap="2">
                                        <config.icon width="14" height="14" />
                                        {config.label}
                                      </Flex>
                                    </DropdownMenu.Item>
                                  ))}
                                </DropdownMenu.Content>
                              </DropdownMenu.Root>
                            </Table.Cell>
                            <Table.Cell>
                              <IconButton
                                size="2"
                                variant="soft"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openOrderModal(order);
                                }}
                              >
                                <ExternalLinkIcon width="16" height="16" />
                              </IconButton>
                            </Table.Cell>
                          </Table.Row>

                          {/* Expanded Row Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <Table.Row>
                                <Table.Cell colSpan={8} style={{ padding: 0 }}>
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <Box style={{
                                      padding: '20px',
                                      background: 'rgba(139, 92, 246, 0.02)',
                                      borderTop: '1px solid rgba(139, 92, 246, 0.1)',
                                      borderBottom: '1px solid rgba(139, 92, 246, 0.1)'
                                    }}>
                                      <Grid columns="2" gap="4">
                                        <Box>
                                          <Heading size="3" mb="3">Order Items</Heading>
                                          <Flex direction="column" gap="2">
                                            {order.items?.map((item, i) => (
                                              <Flex key={i} align="center" justify="between" style={{
                                                padding: '10px',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                borderRadius: '8px'
                                              }}>
                                                <Flex align="center" gap="2">
                                                  <CubeIcon width="16" height="16" style={{ opacity: 0.6 }} />
                                                  <Text size="2">{item.quantity}x {item.product_name}</Text>
                                                </Flex>
                                                <Text size="2" weight="medium">
                                                  ${item.subtotal_usdt?.toFixed(2)}
                                                </Text>
                                              </Flex>
                                            ))}
                                          </Flex>
                                        </Box>
                                        
                                        <Box>
                                          <Heading size="3" mb="3">Payment Details</Heading>
                                          <Flex direction="column" gap="2">
                                            <Flex justify="between">
                                              <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                                Method:
                                              </Text>
                                              <Badge>{order.payment?.method || 'N/A'}</Badge>
                                            </Flex>
                                            {order.payment?.transaction_id && (
                                              <Box>
                                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                                                  Transaction:
                                                </Text>
                                                <Code size="1" style={{ 
                                                  display: 'block',
                                                  padding: '8px',
                                                  background: 'rgba(255, 255, 255, 0.03)',
                                                  borderRadius: '4px',
                                                  wordBreak: 'break-all',
                                                  fontSize: '11px'
                                                }}>
                                                  {order.payment.transaction_id}
                                                </Code>
                                              </Box>
                                            )}
                                          </Flex>
                                        </Box>
                                      </Grid>
                                    </Box>
                                  </motion.div>
                                </Table.Cell>
                              </Table.Row>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Card>
          )}
        </>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onStatusUpdate={updateOrderStatus}
      />
    </Box>
  );
};

export default Orders;
