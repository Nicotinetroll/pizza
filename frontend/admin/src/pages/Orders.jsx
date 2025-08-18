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
  InfoCircledIcon, IdCardIcon, GlobeIcon, CubeIcon, PersonIcon
} from '@radix-ui/react-icons';
import { ordersAPI } from '../services/api';

// Order status colors and icons
const statusConfig = {
  pending: { color: 'amber', icon: ClockIcon, label: 'Pending' },
  paid: { color: 'blue', icon: CheckCircledIcon, label: 'Paid' },
  processing: { color: 'purple', icon: RocketIcon, label: 'Processing' },
  completed: { color: 'green', icon: CheckCircledIcon, label: 'Completed' },
  cancelled: { color: 'red', icon: CrossCircledIcon, label: 'Cancelled' }
};

// Order detail modal component
const OrderDetailModal = ({ order, isOpen, onClose, onStatusUpdate }) => {
  const [newStatus, setNewStatus] = useState(order?.status || 'pending');
  const [updating, setUpdating] = useState(false);
  const [copiedText, setCopiedText] = useState('');

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
      <Dialog.Content style={{ maxWidth: '700px' }}>
        <Dialog.Title>
          <Flex align="center" gap="3">
            <Avatar
              size="3"
              fallback={order.order_number?.slice(-2) || 'NA'}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
              }}
            />
            <Box>
              <Heading size="4">Order Details</Heading>
              <Code size="2" style={{ color: '#8b5cf6' }}>{order.order_number}</Code>
            </Box>
          </Flex>
        </Dialog.Title>

        <Dialog.Description>
          <ScrollArea style={{ maxHeight: '60vh' }}>
            <Flex direction="column" gap="4" mt="4">
              {/* Status Section */}
              <Card style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)'
              }}>
                <Flex align="center" justify="between">
                  <Flex align="center" gap="2">
                    <StatusIcon width="20" height="20" style={{ color: `var(--${statusConfig[order.status]?.color}-9)` }} />
                    <Text size="3" weight="medium">Current Status</Text>
                  </Flex>
                  <Badge size="2" color={statusConfig[order.status]?.color}>
                    {statusConfig[order.status]?.label}
                  </Badge>
                </Flex>
              </Card>

              {/* Customer Info */}
              <Card>
                <Heading size="3" mb="3">Customer Information</Heading>
                <Grid columns="2" gap="3">
                  <Flex align="center" gap="2">
                    <PersonIcon width="16" height="16" style={{ opacity: 0.6 }} />
                    <Text size="2">
                      Telegram: <Code size="1">@{order.username || `user${order.telegram_id}`}</Code>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <IdCardIcon width="16" height="16" style={{ opacity: 0.6 }} />
                    <Text size="2">
                      ID: <Code size="1">{order.telegram_id}</Code>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <GlobeIcon width="16" height="16" style={{ opacity: 0.6 }} />
                    <Text size="2">
                      Location: <strong>{order.delivery_city}, {order.delivery_country}</strong>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <CalendarIcon width="16" height="16" style={{ opacity: 0.6 }} />
                    <Text size="2">
                      Created: {new Date(order.created_at).toLocaleString()}
                    </Text>
                  </Flex>
                  {order.paid_at && (
                    <Flex align="center" gap="2">
                      <CheckCircledIcon width="16" height="16" style={{ opacity: 0.6 }} />
                      <Text size="2">
                        Paid: {new Date(order.paid_at).toLocaleString()}
                      </Text>
                    </Flex>
                  )}
                  {order.first_name && (
                    <Flex align="center" gap="2">
                      <PersonIcon width="16" height="16" style={{ opacity: 0.6 }} />
                      <Text size="2">
                        Name: <strong>{order.first_name} {order.last_name}</strong>
                      </Text>
                    </Flex>
                  )}
                </Grid>
              </Card>

              {/* Order Items */}
              <Card>
                <Heading size="3" mb="3">Order Items</Heading>
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

                {/* Totals */}
                <Separator size="4" my="3" />
                <Flex direction="column" gap="2">
                  {order.has_discount && (
                    <>
                      <Flex justify="between">
                        <Text size="2">Subtotal:</Text>
                        <Text size="2">${((order.total_usdt || 0) + (order.discount_amount || 0)).toFixed(2)}</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size="2" style={{ color: '#10b981' }}>
                          Discount ({order.referral_code}):
                        </Text>
                        <Text size="2" style={{ color: '#10b981' }}>
                          -${order.discount_amount?.toFixed(2)}
                        </Text>
                      </Flex>
                    </>
                  )}
                  <Flex justify="between">
                    <Text size="3" weight="bold">Total:</Text>
                    <Text size="3" weight="bold" style={{ color: '#8b5cf6' }}>
                      ${order.total_usdt?.toFixed(2)}
                    </Text>
                  </Flex>
                </Flex>
              </Card>

              {/* Payment Info */}
              {order.payment && (
                <Card>
                  <Heading size="3" mb="3">Payment Information</Heading>
                  <Flex direction="column" gap="3">
                    <Flex align="center" justify="between">
                      <Text size="2">Method:</Text>
                      <Badge size="2" color="purple">{order.payment.method}</Badge>
                    </Flex>
                    {order.payment.transaction_id && (
                      <Flex align="center" justify="between">
                        <Text size="2">Transaction:</Text>
                        <Flex align="center" gap="2">
                          <Code size="1" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                      </Flex>
                    )}
                    {order.referral_code && (
                      <Flex align="center" justify="between">
                        <Text size="2">Referral:</Text>
                        <Badge color="green" variant="soft">{order.referral_code}</Badge>
                      </Flex>
                    )}
                  </Flex>
                </Card>
              )}

              {/* Status Update */}
              <Card style={{
                background: 'rgba(20, 20, 25, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Heading size="3" mb="3">Update Status</Heading>
                <Flex gap="3" align="center">
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

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close>
            <Button variant="soft">Close</Button>
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

  // Mock some orders with usernames for testing
  useEffect(() => {
    const mockOrders = [
      {
        _id: '1',
        order_number: 'ORD-2024-0001',
        telegram_id: '6264469295',
        username: 'mashmast3r',
        delivery_city: 'Paris',
        delivery_country: 'France',
        total_usdt: 215.86,
        discount_amount: 24.00,
        has_discount: true,
        referral_code: 'GAYLORD',
        status: 'paid',
        created_at: '2025-08-18T10:47:36',
        paid_at: '2025-08-18T10:47:41',
        items: [
          { product_name: 'Test E 250', quantity: 2, price_usdt: 50, subtotal_usdt: 100 },
          { product_name: 'Anavar 50mg', quantity: 1, price_usdt: 139.86, subtotal_usdt: 139.86 }
        ],
        payment: {
          method: 'ETH',
          transaction_id: 'DEMO_9ccaa85f2b3d4e4795a1b2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5'
        }
      }
    ];

    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await ordersAPI.getAll();
      // Add mock username if not present
      const ordersWithUsernames = (response.orders || []).map(order => ({
        ...order,
        username: order.username || `user${order.telegram_id}`
      }));
      setOrders(ordersWithUsernames);
    } catch (error) {
      console.error('Error fetching orders:', error);
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
    <Box>
      {/* Header */}
      <Flex align="center" justify="between" mb="6">
        <Box>
          <Heading size="8" weight="bold" style={{ marginBottom: '8px' }}>
            Orders Management
          </Heading>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Manage and track all customer orders
          </Text>
        </Box>

        <Flex gap="3">
          <Button
            size="3"
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
              <ReloadIcon width="18" height="18" />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </motion.div>
          </Button>
        </Flex>
      </Flex>

      {/* Stats Cards */}
      <Grid columns={{ initial: '2', sm: '3', lg: '5' }} gap="4" mb="6">
        {Object.entries(stats).map(([key, value]) => {
          const config = key === 'total' ? 
            { color: '#8b5cf6', label: 'Total Orders', icon: RocketIcon } :
            statusConfig[key];
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -2 }}
            >
              <Card style={{
                background: 'rgba(20, 20, 25, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '20px'
              }}>
                <Flex align="center" justify="between">
                  <Box>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                      {config?.label || key}
                    </Text>
                    <Text size="6" weight="bold">
                      {value}
                    </Text>
                  </Box>
                  <Box style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: `${config?.color || '#8b5cf6'}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {config?.icon && <config.icon width="20" height="20" style={{ color: config?.color || '#8b5cf6' }} />}
                  </Box>
                </Flex>
              </Card>
            </motion.div>
          );
        })}
      </Grid>

      {/* Filters */}
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <Flex gap="3" align="center">
          <Box style={{ flex: 1, position: 'relative' }}>
            <MagnifyingGlassIcon 
              width="16" 
              height="16" 
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
              placeholder="Search by order number, telegram ID, username, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
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
              variant="surface"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                minWidth: '150px'
              }}
            >
              <Flex align="center" gap="2">
                {statusFilter === 'all' ? (
                  <>
                    <InfoCircledIcon width="16" height="16" />
                    <Text>All Status</Text>
                  </>
                ) : (
                  <>
                    {React.createElement(statusConfig[statusFilter]?.icon || ClockIcon, { width: 16, height: 16 })}
                    <Text>{statusConfig[statusFilter]?.label}</Text>
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

      {/* Orders Table */}
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: 0,
        overflow: 'hidden'
      }}>
        {filteredOrders.length === 0 ? (
          <Flex align="center" justify="center" style={{ padding: '60px' }}>
            <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {searchTerm || statusFilter !== 'all' ? 'No orders found matching your filters' : 'No orders yet'}
            </Text>
          </Flex>
        ) : (
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
                          background: isExpanded ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                          verticalAlign: 'middle'
                        }}
                      >
                        <Table.Cell style={{ verticalAlign: 'middle' }}>
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRightIcon width="16" height="16" />
                          </motion.div>
                        </Table.Cell>
                        <Table.Cell style={{ verticalAlign: 'middle' }}>
                          <Code size="2" style={{ color: '#8b5cf6' }}>
                            {order.order_number}
                          </Code>
                        </Table.Cell>
                        <Table.Cell style={{ verticalAlign: 'middle' }}>
                          <Flex direction="column" gap="1">
                            <Text size="2">{new Date(order.created_at).toLocaleDateString()}</Text>
                            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                              {new Date(order.created_at).toLocaleTimeString()}
                            </Text>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell style={{ verticalAlign: 'middle' }}>
                          <Flex align="center" gap="2">
                            <Avatar
                              size="1"
                              fallback={order.username?.slice(0, 2).toUpperCase() || 'NA'}
                              style={{
                                background: `linear-gradient(135deg, ${statusConfig[order.status]?.color || '#8b5cf6'} 0%, ${statusConfig[order.status]?.color || '#8b5cf6'}90 100%)`
                              }}
                            />
                            <Flex direction="column">
                              <Text size="2">@{order.username}</Text>
                              {order.first_name && (
                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                  {order.first_name} {order.last_name}
                                </Text>
                              )}
                            </Flex>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell style={{ verticalAlign: 'middle' }}>
                          <Flex align="center" gap="1">
                            <GlobeIcon width="14" height="14" style={{ opacity: 0.6 }} />
                            <Text size="2">{order.delivery_city}, {order.delivery_country}</Text>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell style={{ verticalAlign: 'middle' }}>
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
                        <Table.Cell style={{ verticalAlign: 'middle' }}>
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
                        <Table.Cell style={{ verticalAlign: 'middle' }}>
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
                                  <Grid columns={{ initial: '1', md: '2' }} gap="4">
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
                                        {order.referral_code && (
                                          <Flex justify="between">
                                            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                              Referral:
                                            </Text>
                                            <Badge color="green" variant="soft">
                                              {order.referral_code}
                                            </Badge>
                                          </Flex>
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
        )}
      </Card>

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
