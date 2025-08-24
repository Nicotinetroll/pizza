import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, Select,
  Table, IconButton, Heading, Dialog, Checkbox,
  Code, DropdownMenu
} from '@radix-ui/themes';
import {
  MagnifyingGlassIcon, ReloadIcon, TrashIcon, CheckIcon,
  ClockIcon, DotsHorizontalIcon, PersonIcon,
  ExclamationTriangleIcon, ChevronDownIcon,
  ChevronLeftIcon, ChevronRightIcon, DoubleArrowLeftIcon,
  DoubleArrowRightIcon
} from '@radix-ui/react-icons';
import { customOrdersAPI } from '../services/api';

const statusConfig = {
  pending: { color: 'amber', icon: ClockIcon, label: 'Pending' },
  processing: { color: 'blue', icon: ReloadIcon, label: 'Processing' },
  completed: { color: 'green', icon: CheckIcon, label: 'Completed' }
};

const ITEMS_PER_PAGE = 10;

const CustomerRequests = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
      const response = await customOrdersAPI.getAll();
      setOrders(response.orders || []);
    } catch (error) {
      console.error('Error fetching customer requests:', error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSelectedOrders(new Set());
    setCurrentPage(1);
    fetchOrders();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await customOrdersAPI.updateStatus(orderId, newStatus);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await customOrdersAPI.delete(orderId);
      await fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) return;
    
    try {
      await customOrdersAPI.bulkDelete(Array.from(selectedOrders));
      setSelectedOrders(new Set());
      setDeleteModalOpen(false);
      await fetchOrders();
    } catch (error) {
      console.error('Error bulk deleting:', error);
    }
  };

  const toggleOrderSelection = (orderId) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(o => o._id)));
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      order.custom_id?.toString().includes(searchTerm) ||
      order.first_name?.toLowerCase().includes(searchLower) ||
      order.last_name?.toLowerCase().includes(searchLower) ||
      order.product_text?.toLowerCase().includes(searchLower) ||
      order.telegram_id?.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  const getDisplayName = (order) => {
    // For group messages, the actual user info should be in first_name/last_name
    // even if username is GroupAnonymousBot
    if (order.first_name || order.last_name) {
      const fullName = `${order.first_name || ''} ${order.last_name || ''}`.trim();
      return fullName || `User${order.telegram_id}`;
    }
    // If no name, show telegram_id
    return `User${order.telegram_id}`;
  };

  const getActualUsername = (order) => {
    // Check if there's a real_username or original_username field
    if (order.real_username || order.original_username) {
      return `@${order.real_username || order.original_username}`;
    }
    // If username is GroupAnonymousBot, don't show it
    if (order.username && order.username !== 'GroupAnonymousBot') {
      return `@${order.username}`;
    }
    return '';
  };

  // Function to get customer type
  const getCustomerType = (order) => {
    if (order.username === 'GroupAnonymousBot' || order.is_group_message) {
      return 'Group';
    }
    return 'Direct';
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <ReloadIcon width="32" height="32" style={{ color: '#8b5cf6' }} />
        </motion.div>
      </Flex>
    );
  }

  return (
    <Box style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      <Flex 
        align={isMobile ? 'start' : 'center'} 
        justify="between" 
        mb={isMobile ? '4' : '6'}
        direction={isMobile ? 'column' : 'row'}
        gap={isMobile ? '3' : '0'}
      >
        <Box>
          <Heading size={isMobile ? '6' : '8'} weight="bold" style={{ marginBottom: '8px' }}>
            Customer Requests
          </Heading>
          {!isMobile && (
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Manage product requests from customers
            </Text>
          )}
        </Box>

        <Flex gap="2">
          {selectedOrders.size > 0 && (
            <Button
              size={isMobile ? '2' : '3'}
              color="red"
              onClick={() => setDeleteModalOpen(true)}
            >
              <TrashIcon width="16" height="16" />
              Delete ({selectedOrders.size})
            </Button>
          )}
          <Button
            size={isMobile ? '2' : '3'}
            variant="surface"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: refreshing ? Infinity : 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ReloadIcon width="16" height="16" />
              {!isMobile && (refreshing ? 'Refreshing...' : 'Refresh')}
            </motion.div>
          </Button>
        </Flex>
      </Flex>

      <Grid 
        columns={{ initial: '2', xs: '2', sm: '4' }} 
        gap={isMobile ? '2' : '4'} 
        mb={isMobile ? '4' : '6'}
      >
        {Object.entries(stats).map(([key, value]) => {
          const config = key === 'total' ? 
            { color: '#8b5cf6', label: 'Total Requests', icon: ExclamationTriangleIcon } :
            statusConfig[key];
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={!isMobile ? { y: -2 } : {}}
            >
              <Card style={{
                background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: isMobile ? '16px' : '20px'
              }}>
                <Flex align="center" justify="between">
                  <Box>
                    <Text size={isMobile ? '1' : '2'} style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      display: 'block', 
                      marginBottom: '4px' 
                    }}>
                      {config?.label || key}
                    </Text>
                    <Text size={isMobile ? '5' : '6'} weight="bold">
                      {value}
                    </Text>
                  </Box>
                  <Box style={{
                    width: isMobile ? '32px' : '40px',
                    height: isMobile ? '32px' : '40px',
                    borderRadius: '10px',
                    background: `rgba(${config?.color === '#8b5cf6' ? '139, 92, 246' : 
                                  config?.color === 'amber' ? '245, 158, 11' :
                                  config?.color === 'blue' ? '59, 130, 246' :
                                  config?.color === 'green' ? '16, 185, 129' : '139, 92, 246'}, 0.2)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <config.icon 
                      width="20" 
                      height="20" 
                      style={{ 
                        color: config?.color === 'amber' ? '#f59e0b' :
                              config?.color === 'blue' ? '#3b82f6' :
                              config?.color === 'green' ? '#10b981' :
                              config?.color || '#8b5cf6' 
                      }} 
                    />
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
        marginBottom: '24px'
      }}>
        <Flex gap={isMobile ? '2' : '3'} direction={isMobile ? 'column' : 'row'}>
          <Box style={{ flex: 1, position: 'relative', width: '100%' }}>
            <MagnifyingGlassIcon 
              width="16" 
              height="16"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.5
              }}
            />
            <input
              type="text"
              placeholder={isMobile ? "Search..." : "Search by ID, name, or product..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: isMobile ? '10px 10px 10px 36px' : '12px 12px 12px 40px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </Box>

          <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger style={{ minWidth: isMobile ? '100%' : '150px' }}>
              <Flex align="center" gap="2">
                {statusFilter === 'all' ? 'All Status' : statusConfig[statusFilter]?.label}
              </Flex>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Status</Select.Item>
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
          padding: '60px',
          textAlign: 'center'
        }}>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            No customer requests found
          </Text>
        </Card>
      ) : (
        <>
          <Card style={{
            background: 'rgba(20, 20, 25, 0.6)',
            padding: 0,
            overflow: 'hidden'
          }}>
            {isMobile ? (
              <Box style={{ padding: '12px' }}>
                {paginatedOrders.map((order) => (
                  <Card key={order._id} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    marginBottom: '12px',
                    padding: '12px'
                  }}>
                    <Flex justify="between" mb="2">
                      <Flex align="center" gap="2">
                        <Checkbox
                          checked={selectedOrders.has(order._id)}
                          onCheckedChange={() => toggleOrderSelection(order._id)}
                        />
                        <Code size="1">#{order.custom_id}</Code>
                      </Flex>
                      <Badge size="1" color={statusConfig[order.status]?.color}>
                        {statusConfig[order.status]?.label}
                      </Badge>
                    </Flex>
                    
                    <Flex direction="column" gap="1" mb="2">
                      <Flex align="center" gap="2">
                        <Text size="2" weight="medium">
                          {getDisplayName(order)}
                        </Text>
                        {getActualUsername(order) && (
                          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            {getActualUsername(order)}
                          </Text>
                        )}
                      </Flex>
                      <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {getCustomerType(order)}
                      </Text>
                    </Flex>
                    
                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block', marginBottom: '8px' }}>
                      {order.product_text}
                    </Text>
                    
                    <Flex justify="between" align="center">
                      <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </Text>
                      
                      <Flex gap="1">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger>
                            <IconButton size="1" variant="soft">
                              <DotsHorizontalIcon width="14" height="14" />
                            </IconButton>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content>
                            {Object.entries(statusConfig).map(([value, config]) => (
                              <DropdownMenu.Item
                                key={value}
                                onClick={() => updateOrderStatus(order._id, value)}
                              >
                                <Flex align="center" gap="2">
                                  <config.icon width="14" height="14" />
                                  {config.label}
                                </Flex>
                              </DropdownMenu.Item>
                            ))}
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                              color="red"
                              onClick={() => deleteOrder(order._id)}
                            >
                              <TrashIcon width="14" height="14" />
                              Delete
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Box>
            ) : (
              <Box style={{ overflowX: 'auto' }}>
                <Table.Root variant="surface">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell width="40px" style={{ verticalAlign: 'middle' }}>
                        <Checkbox
                          checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell style={{ verticalAlign: 'middle' }}>ID</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell style={{ verticalAlign: 'middle' }}>Date</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell style={{ verticalAlign: 'middle' }}>Customer</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell style={{ verticalAlign: 'middle' }}>Request</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell style={{ verticalAlign: 'middle' }}>Status</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell width="100px" style={{ verticalAlign: 'middle' }}>Actions</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {paginatedOrders.map((order) => {
                      const StatusIcon = statusConfig[order.status]?.icon || ClockIcon;
                      
                      return (
                        <Table.Row key={order._id}>
                          <Table.Cell style={{ verticalAlign: 'middle' }}>
                            <Checkbox
                              checked={selectedOrders.has(order._id)}
                              onCheckedChange={() => toggleOrderSelection(order._id)}
                            />
                          </Table.Cell>
                          <Table.Cell style={{ verticalAlign: 'middle' }}>
                            <Code size="2">#{order.custom_id}</Code>
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
                            <Flex direction="column" gap="1">
                              <Flex align="center" gap="2">
                                <Text size="2" weight="medium">
                                  {getDisplayName(order)}
                                </Text>
                                {getActualUsername(order) && (
                                  <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    {getActualUsername(order)}
                                  </Text>
                                )}
                              </Flex>
                              <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                {getCustomerType(order)}
                              </Text>
                            </Flex>
                        </Table.Cell>
                          <Table.Cell style={{ verticalAlign: 'middle' }}>
                            <Text size="2" style={{ maxWidth: '300px', display: 'block' }}>
                              {order.product_text}
                            </Text>
                          </Table.Cell>
                          <Table.Cell style={{ verticalAlign: 'middle' }}>
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger>
                                <Button
                                  variant="soft"
                                  color={statusConfig[order.status]?.color}
                                  size="2"
                                >
                                  <Flex align="center" gap="2">
                                    <StatusIcon width="14" height="14" />
                                    {statusConfig[order.status]?.label}
                                    <ChevronDownIcon width="14" height="14" />
                                  </Flex>
                                </Button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Content>
                                {Object.entries(statusConfig).map(([value, config]) => (
                                  <DropdownMenu.Item
                                    key={value}
                                    onClick={() => updateOrderStatus(order._id, value)}
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
                              variant="ghost"
                              color="red"
                              onClick={() => deleteOrder(order._id)}
                            >
                              <TrashIcon width="16" height="16" />
                            </IconButton>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card style={{
              background: 'rgba(20, 20, 25, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: isMobile ? '12px' : '16px',
              marginTop: '24px'
            }}>
              <Flex align="center" justify="between" gap="3">
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}
                </Text>
                
                <Flex gap="2" align="center">
                  <IconButton
                    size="2"
                    variant="soft"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    <DoubleArrowLeftIcon width="16" height="16" />
                  </IconButton>
                  
                  <IconButton
                    size="2"
                    variant="soft"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <ChevronLeftIcon width="16" height="16" />
                  </IconButton>
                  
                  <Flex gap="1" align="center">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          size="2"
                          variant={currentPage === pageNum ? "solid" : "soft"}
                          onClick={() => setCurrentPage(pageNum)}
                          style={{
                            minWidth: '40px',
                            background: currentPage === pageNum ? '#8b5cf6' : undefined
                          }}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </Flex>
                  
                  <IconButton
                    size="2"
                    variant="soft"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    <ChevronRightIcon width="16" height="16" />
                  </IconButton>
                  
                  <IconButton
                    size="2"
                    variant="soft"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    <DoubleArrowRightIcon width="16" height="16" />
                  </IconButton>
                </Flex>
              </Flex>
            </Card>
          )}
        </>
      )}

      <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <Dialog.Content style={{ maxWidth: '450px' }}>
          <Dialog.Title>
            <Flex align="center" gap="2">
              <ExclamationTriangleIcon width="20" height="20" style={{ color: '#ef4444' }} />
              Confirm Deletion
            </Flex>
          </Dialog.Title>
          <Dialog.Description>
            <Text>
              Are you sure you want to delete {selectedOrders.size} selected request(s)?
              This action cannot be undone.
            </Text>
          </Dialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft">Cancel</Button>
            </Dialog.Close>
            <Button color="red" onClick={handleBulkDelete}>
              Delete {selectedOrders.size} Request(s)
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default CustomerRequests;
