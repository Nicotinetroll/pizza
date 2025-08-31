import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  DotsHorizontalIcon, ChevronLeftIcon, DoubleArrowLeftIcon, DoubleArrowRightIcon
} from '@radix-ui/react-icons';
import { ordersAPI, usersAPI } from '../services/api';

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

const statusConfig = {
  pending: { color: 'amber', icon: ClockIcon, label: 'Pending' },
  paid: { color: 'blue', icon: CheckCircledIcon, label: 'Paid' },
  processing: { color: 'purple', icon: RocketIcon, label: 'Processing' },
  completed: { color: 'green', icon: CheckCircledIcon, label: 'Completed' },
  cancelled: { color: 'red', icon: CrossCircledIcon, label: 'Cancelled' }
};

const LoadingCard = ({ progress, message }) => {
  return (
    <Card style={{
      background: 'rgba(20, 20, 25, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      padding: '20px',
      marginBottom: '24px',
      position: 'sticky',
      top: '0',
      zIndex: 1000
    }}>
      <Flex align="center" justify="between" mb="3">
        <Flex align="center" gap="2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <ReloadIcon width="20" height="20" style={{ color: '#8b5cf6' }} />
          </motion.div>
          <Text size="3" weight="medium">{message || 'Loading orders...'}</Text>
        </Flex>
        <Text size="3" weight="bold" style={{ color: '#8b5cf6' }}>
          {Math.round(progress)}%
        </Text>
      </Flex>
      <Box style={{
        width: '100%',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
            borderRadius: '4px',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
          }}
        />
      </Box>
    </Card>
  );
};

const Pagination = ({ currentPage, totalPages, itemsPerPage, totalItems, onPageChange, onItemsPerPageChange, isMobile }) => {
  const pageNumbers = [];
  const maxVisiblePages = isMobile ? 3 : 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <Card style={{
      background: 'rgba(20, 20, 25, 0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      padding: isMobile ? '12px' : '16px',
      marginTop: '20px'
    }}>
      <Flex 
        align="center" 
        justify="between"
        direction={isMobile ? 'column' : 'row'}
        gap={isMobile ? '3' : '0'}
      >
        <Flex align="center" gap={isMobile ? '2' : '3'}>
          <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Showing {startItem}-{endItem} of {totalItems} orders
          </Text>
          
          {!isMobile && (
            <Select.Root value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
              <Select.Trigger size="1" variant="soft">
                <Text size="2">{itemsPerPage} per page</Text>
              </Select.Trigger>
              <Select.Content>
                {[10, 20, 30, 50, 100].map(value => (
                  <Select.Item key={value} value={value.toString()}>
                    {value} per page
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </Flex>
        
        <Flex align="center" gap={isMobile ? '1' : '2'}>
          <IconButton
            size={isMobile ? '1' : '2'}
            variant="soft"
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
            style={{ opacity: currentPage === 1 ? 0.3 : 1 }}
          >
            <DoubleArrowLeftIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
          </IconButton>
          
          <IconButton
            size={isMobile ? '1' : '2'}
            variant="soft"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{ opacity: currentPage === 1 ? 0.3 : 1 }}
          >
            <ChevronLeftIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
          </IconButton>
          
          <Flex gap={isMobile ? '1' : '2'}>
            {startPage > 1 && (
              <>
                <Button
                  size={isMobile ? '1' : '2'}
                  variant="soft"
                  onClick={() => onPageChange(1)}
                >
                  1
                </Button>
                {startPage > 2 && (
                  <Text size={isMobile ? '1' : '2'} style={{ padding: '0 4px', color: 'rgba(255, 255, 255, 0.3)' }}>
                    ...
                  </Text>
                )}
              </>
            )}
            
            {pageNumbers.map(number => (
              <Button
                key={number}
                size={isMobile ? '1' : '2'}
                variant={currentPage === number ? 'solid' : 'soft'}
                onClick={() => onPageChange(number)}
                style={{
                  background: currentPage === number ? 
                    'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 
                    'rgba(255, 255, 255, 0.05)',
                  minWidth: isMobile ? '28px' : '36px'
                }}
              >
                {number}
              </Button>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <Text size={isMobile ? '1' : '2'} style={{ padding: '0 4px', color: 'rgba(255, 255, 255, 0.3)' }}>
                    ...
                  </Text>
                )}
                <Button
                  size={isMobile ? '1' : '2'}
                  variant="soft"
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </Flex>
          
          <IconButton
            size={isMobile ? '1' : '2'}
            variant="soft"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{ opacity: currentPage === totalPages ? 0.3 : 1 }}
          >
            <ChevronRightIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
          </IconButton>
          
          <IconButton
            size={isMobile ? '1' : '2'}
            variant="soft"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            style={{ opacity: currentPage === totalPages ? 0.3 : 1 }}
          >
            <DoubleArrowRightIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
          </IconButton>
        </Flex>
        
        {isMobile && (
          <Select.Root value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
            <Select.Trigger size="2" variant="soft" style={{ width: '100%' }}>
              <Text size="2">{itemsPerPage} per page</Text>
            </Select.Trigger>
            <Select.Content>
              {[10, 20, 30, 50].map(value => (
                <Select.Item key={value} value={value.toString()}>
                  {value} per page
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
      </Flex>
    </Card>
  );
};

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
                -${formatNumber(order.discount_amount || 0)}
              </Badge>
            )}
          </Flex>
          
          <Text size={isMobile ? '3' : '4'} weight="bold" style={{ color: '#10b981' }}>
            ${formatNumber(order.total_usdt || 0)}
          </Text>
        </Flex>
      </Card>
    </motion.div>
  );
};

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

              <Card style={{ padding: isMobile ? '12px' : '16px' }}>
                <Heading size={isMobile ? '2' : '3'} mb={isMobile ? '2' : '3'}>Order Items</Heading>
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
                          ${formatNumber(item.price_usdt || 0)} each
                        </Text>
                        <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                          ${formatNumber(item.subtotal_usdt || 0)}
                        </Text>
                      </Flex>
                    </Box>
                  ))}
                </Flex>

                <Separator size="4" my={isMobile ? '2' : '3'} />
                <Flex direction="column" gap="2">
                  {order.has_discount && (
                    <>
                      <Flex justify="between">
                        <Text size={isMobile ? '1' : '2'}>Subtotal:</Text>
                        <Text size={isMobile ? '1' : '2'}>${formatNumber((order.total_usdt || 0) + (order.discount_amount || 0))}</Text>
                      </Flex>
                      <Flex justify="between">
                        <Text size={isMobile ? '1' : '2'} style={{ color: '#10b981' }}>
                          Discount ({order.referral_code}):
                        </Text>
                        <Text size={isMobile ? '1' : '2'} style={{ color: '#10b981' }}>
                          -${formatNumber(order.discount_amount || 0)}
                        </Text>
                      </Flex>
                    </>
                  )}
                  <Flex justify="between">
                    <Text size={isMobile ? '2' : '3'} weight="bold">Total:</Text>
                    <Text size={isMobile ? '2' : '3'} weight="bold" style={{ color: '#8b5cf6' }}>
                      ${formatNumber(order.total_usdt || 0)}
                    </Text>
                  </Flex>
                </Flex>
              </Card>

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
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(isMobile ? 10 : 20);
  
  const [userCache, setUserCache] = useState({});

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setItemsPerPage(mobile ? 10 : 20);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Initializing...');
    
    try {
      setLoadingProgress(5);
      setLoadingMessage('Fetching user data...');
      
      const usersResponse = await usersAPI.getAll().catch(() => ({ users: [] }));
      
      const userMap = {};
      if (usersResponse.users) {
        usersResponse.users.forEach(user => {
          userMap[user.telegram_id] = user;
        });
      }
      setUserCache(userMap);
      
      setLoadingProgress(15);
      setLoadingMessage('Loading orders...');
      
      const batchSize = 100;
      let allOrdersArray = [];
      let skip = 0;
      
      const firstBatch = await ordersAPI.getAll({ skip: 0, limit: batchSize });
      
      allOrdersArray = firstBatch.orders || [];
      const totalOrders = firstBatch.total || 0;
      
      if (totalOrders > batchSize) {
        skip = batchSize;
        while (skip < totalOrders) {
          const progressPercent = 15 + (75 * (skip / totalOrders));
          setLoadingProgress(progressPercent);
          setLoadingMessage(`Loading orders... (${skip}/${totalOrders})`);
          
          const nextBatch = await ordersAPI.getAll({ skip, limit: batchSize });
          
          if (nextBatch.orders && nextBatch.orders.length > 0) {
            allOrdersArray = [...allOrdersArray, ...nextBatch.orders];
            skip += nextBatch.orders.length;
          } else {
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      setLoadingProgress(90);
      setLoadingMessage('Processing order data...');
      
      const enrichedOrders = allOrdersArray.map(order => {
        const user = userMap[order.telegram_id];
        return {
          ...order,
          username: order.username || user?.username || null,
          first_name: order.first_name || user?.first_name || null,
          last_name: order.last_name || user?.last_name || null
        };
      });
      
      setAllOrders(enrichedOrders);
      
      setLoadingProgress(100);
      setLoadingMessage('Complete!');
      
      setTimeout(() => {
        setLoadingProgress(0);
        setLoadingMessage('');
      }, 500);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      setAllOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchOrders();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      
      setAllOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      fetchOrders();
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

  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
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
  }, [allOrders, searchTerm, statusFilter]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: allOrders.length,
    pending: allOrders.filter(o => o.status === 'pending').length,
    paid: allOrders.filter(o => o.status === 'paid').length,
    processing: allOrders.filter(o => o.status === 'processing').length,
    completed: allOrders.filter(o => o.status === 'completed').length
  }), [allOrders]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  return (
    <Box style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      {loadingProgress > 0 && loadingProgress < 100 && (
        <LoadingCard progress={loadingProgress} message={loadingMessage} />
      )}

      <AnimatePresence mode="wait">
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
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
                  <Box>
                    {paginatedOrders.map((order) => (
                      <MobileOrderCard
                        key={order._id}
                        order={order}
                        onStatusUpdate={updateOrderStatus}
                        onViewDetails={openOrderModal}
                      />
                    ))}
                  </Box>
                ) : (
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
                          {paginatedOrders.map((order, idx) => {
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
                                        ${formatNumber(order.total_usdt || 0)}
                                      </Text>
                                      {order.has_discount && (
                                        <Badge size="1" color="green" variant="soft">
                                          -${formatNumber(order.discount_amount || 0)}
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
                                                        ${formatNumber(item.subtotal_usdt || 0)}
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
                
                {filteredOrders.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredOrders.length}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    isMobile={isMobile}
                  />
                )}
              </>
            )}

            <OrderDetailModal
              order={selectedOrder}
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              onStatusUpdate={updateOrderStatus}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default Orders;
