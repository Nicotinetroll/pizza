import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, Select,
  Table, IconButton, Heading, TextField, Dialog,
  Switch, Avatar, Separator, ScrollArea, Code,
  Progress, DropdownMenu, TextArea, Tabs, Checkbox
} from '@radix-ui/themes';
import {
  PersonIcon, MagnifyingGlassIcon, ReloadIcon, CheckCircledIcon,
  Cross2Icon, StarFilledIcon, CalendarIcon, IdCardIcon,
  RocketIcon, TokensIcon, ActivityLogIcon, InfoCircledIcon,
  Pencil1Icon, CheckIcon, TimerIcon, ChevronLeftIcon, ChevronRightIcon,
  DoubleArrowLeftIcon, DoubleArrowRightIcon
} from '@radix-ui/react-icons';
import { usersAPI } from '../services/api';

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
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
          <Text size="3" weight="medium">{message || 'Loading users...'}</Text>
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
            Showing {startItem}-{endItem} of {totalItems} users
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

const VIPEditModal = ({ user, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    is_vip: false,
    vip_discount_percentage: 0,
    vip_expires: '',
    vip_notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        is_vip: user.is_vip || false,
        vip_discount_percentage: user.vip_discount_percentage || 0,
        vip_expires: user.vip_expires ? new Date(user.vip_expires).toISOString().split('T')[0] : '',
        vip_notes: user.vip_notes || ''
      });
    }
  }, [user, isOpen]);

  const handleSubmit = async () => {
    setSaving(true);
    const data = {
      ...formData,
      vip_expires: formData.vip_expires ? new Date(formData.vip_expires).toISOString() : null
    };
    await onSave(user._id, data);
    setSaving(false);
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '500px', padding: '24px' }}>
        <Dialog.Title style={{ marginBottom: '20px' }}>
          <Flex align="center" gap="3">
            <Box style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <StarFilledIcon width="20" height="20" style={{ color: '#000' }} />
            </Box>
            <Box>
              <Heading size="4">Edit VIP Status</Heading>
              <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                @{user.username || `user${user.telegram_id}`}
              </Text>
            </Box>
          </Flex>
        </Dialog.Title>

        <Box style={{ marginTop: '24px' }}>
          <Flex direction="column" gap="4">
            <Card style={{
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}>
              <Flex align="center" justify="between">
                <Box>
                  <Text size="2" weight="medium">VIP Status</Text>
                  <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                    {formData.is_vip ? 'User has VIP privileges' : 'Regular user'}
                  </Text>
                </Box>
                <Switch
                  size="3"
                  checked={formData.is_vip}
                  onCheckedChange={(checked) => setFormData({...formData, is_vip: checked})}
                  style={{
                    backgroundColor: formData.is_vip ? '#ffd700' : undefined
                  }}
                />
              </Flex>
            </Card>

            <Box>
              <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                Discount Percentage
              </Text>
              <Flex align="center" gap="2">
                <TextField.Root
                  size="3"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.vip_discount_percentage}
                  onChange={(e) => setFormData({...formData, vip_discount_percentage: parseFloat(e.target.value) || 0})}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    flex: 1
                  }}
                />
                <Badge size="2" color="amber">
                  {formData.vip_discount_percentage}% OFF
                </Badge>
              </Flex>
            </Box>

            <Box>
              <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                VIP Expires (Optional)
              </Text>
              <TextField.Root
                size="3"
                type="date"
                value={formData.vip_expires}
                onChange={(e) => setFormData({...formData, vip_expires: e.target.value})}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              />
              {!formData.vip_expires && (
                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                  Leave empty for lifetime VIP
                </Text>
              )}
            </Box>

            <Box>
              <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                Notes (Optional)
              </Text>
              <TextArea
                placeholder="e.g., Long-time customer, Special promotion"
                value={formData.vip_notes}
                onChange={(e) => setFormData({...formData, vip_notes: e.target.value})}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minHeight: '80px'
                }}
              />
            </Box>

            <Flex gap="3" justify="end" mt="4" style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Dialog.Close>
                <Button variant="soft" size="3">Cancel</Button>
              </Dialog.Close>
              <Button
                size="3"
                disabled={saving}
                onClick={handleSubmit}
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                  color: '#000',
                  fontWeight: 'bold',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Update VIP Status'}
              </Button>
            </Flex>
          </Flex>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
};

const Users = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVIP, setFilterVIP] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(isMobile ? 10 : 20);

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
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Initializing...');
    
    try {
      setLoadingProgress(10);
      setLoadingMessage('Connecting to server...');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setLoadingProgress(30);
      setLoadingMessage('Loading user data...');
      
      const response = await usersAPI.getAll();
      const users = response.users || [];
      
      setLoadingProgress(70);
      setLoadingMessage(`Processing ${users.length} users...`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setAllUsers(users);
      
      setLoadingProgress(100);
      setLoadingMessage('Complete!');
      
      setTimeout(() => {
        setLoadingProgress(0);
        setLoadingMessage('');
      }, 500);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      setAllUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchUsers();
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const handleVIPSave = async (userId, data) => {
    try {
      await usersAPI.updateVIPStatus(userId, data);
      await fetchUsers();
    } catch (error) {
      console.error('Error updating VIP status:', error);
      alert('Error updating VIP status: ' + error.message);
    }
  };

  const openVIPModal = (user) => {
    setSelectedUser(user);
    setVipModalOpen(true);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const matchesSearch = 
        user.telegram_id?.toString().includes(searchTerm) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVIP = 
        filterVIP === 'all' ||
        (filterVIP === 'vip' && user.is_vip && user.vip_status === 'active') ||
        (filterVIP === 'regular' && (!user.is_vip || user.vip_status !== 'active'));
      
      return matchesSearch && matchesVIP;
    });
  }, [allUsers, searchTerm, filterVIP]);

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers].sort((a, b) => {
      if (!sortConfig.key) return 0;

      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'username') {
        aValue = a.username || `user${a.telegram_id}`;
        bValue = b.username || `user${b.telegram_id}`;
      } else if (sortConfig.key === 'vip') {
        aValue = a.is_vip && a.vip_status === 'active' ? 1 : 0;
        bValue = b.is_vip && b.vip_status === 'active' ? 1 : 0;
      } else if (sortConfig.key === 'total_spent_usdt' || sortConfig.key === 'total_orders') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return sorted;
  }, [filteredUsers, sortConfig]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedUsers.slice(startIndex, endIndex);
  }, [sortedUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterVIP]);

  const stats = useMemo(() => ({
    total: allUsers.length,
    vip: allUsers.filter(u => u.is_vip && u.vip_status === 'active').length,
    totalSpent: allUsers.reduce((sum, u) => sum + (u.total_spent_usdt || 0), 0),
    totalOrders: allUsers.reduce((sum, u) => sum + (u.total_orders || 0), 0)
  }), [allUsers]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <Text size="1" style={{ opacity: 0.3 }}>↕</Text>;
    }
    return sortConfig.direction === 'asc' ? 
      <Text size="1" style={{ color: '#8b5cf6' }}>↑</Text> : 
      <Text size="1" style={{ color: '#8b5cf6' }}>↓</Text>;
  };

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
                  Users Management
                </Heading>
                {!isMobile && (
                  <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Manage customer accounts and VIP status
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

            <Grid columns={{ initial: '2', sm: '2', lg: '4' }} gap={isMobile ? '2' : '4'} mb={isMobile ? '4' : '6'}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={!isMobile ? { y: -2 } : {}}
              >
                <Card style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: isMobile ? '12px' : '20px'
                }}>
                  <Flex align="center" justify="between">
                    <Box>
                      <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                        Total Users
                      </Text>
                      <Text size={isMobile ? '5' : '6'} weight="bold">{stats.total}</Text>
                    </Box>
                    <Box style={{
                      width: isMobile ? '32px' : '40px',
                      height: isMobile ? '32px' : '40px',
                      borderRadius: isMobile ? '8px' : '10px',
                      background: 'rgba(139, 92, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <PersonIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: '#8b5cf6' }} />
                    </Box>
                  </Flex>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={!isMobile ? { y: -2 } : {}}
                transition={{ delay: 0.1 }}
              >
                <Card style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: isMobile ? '12px' : '20px'
                }}>
                  <Flex align="center" justify="between">
                    <Box>
                      <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                        VIP Users
                      </Text>
                      <Text size={isMobile ? '5' : '6'} weight="bold" style={{ color: '#ffd700' }}>{stats.vip}</Text>
                    </Box>
                    <Box style={{
                      width: isMobile ? '32px' : '40px',
                      height: isMobile ? '32px' : '40px',
                      borderRadius: isMobile ? '8px' : '10px',
                      background: 'rgba(255, 215, 0, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <StarFilledIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: '#ffd700' }} />
                    </Box>
                  </Flex>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={!isMobile ? { y: -2 } : {}}
                transition={{ delay: 0.2 }}
              >
                <Card style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: isMobile ? '12px' : '20px'
                }}>
                  <Flex align="center" justify="between">
                    <Box>
                      <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                        Total Revenue
                      </Text>
                      <Text size={isMobile ? '5' : '6'} weight="bold" style={{ color: '#10b981' }}>
                        ${formatNumber(stats.totalSpent)}
                      </Text>
                    </Box>
                    <Box style={{
                      width: isMobile ? '32px' : '40px',
                      height: isMobile ? '32px' : '40px',
                      borderRadius: isMobile ? '8px' : '10px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <TokensIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: '#10b981' }} />
                    </Box>
                  </Flex>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={!isMobile ? { y: -2 } : {}}
                transition={{ delay: 0.3 }}
              >
                <Card style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: isMobile ? '12px' : '20px'
                }}>
                  <Flex align="center" justify="between">
                    <Box>
                      <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                        Total Orders
                      </Text>
                      <Text size={isMobile ? '5' : '6'} weight="bold">{stats.totalOrders}</Text>
                    </Box>
                    <Box style={{
                      width: isMobile ? '32px' : '40px',
                      height: isMobile ? '32px' : '40px',
                      borderRadius: isMobile ? '8px' : '10px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <RocketIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: '#f59e0b' }} />
                    </Box>
                  </Flex>
                </Card>
              </motion.div>
            </Grid>

            <Card style={{
              background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
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
                    placeholder={isMobile ? "Search users..." : "Search by ID, username, or name..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: isMobile ? '10px 10px 10px 36px' : '12px 12px 12px 40px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  />
                </Box>

                <Select.Root value={filterVIP} onValueChange={setFilterVIP}>
                  <Select.Trigger
                    variant="surface"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      minWidth: isMobile ? '100%' : '150px'
                    }}
                  >
                    <Flex align="center" gap="2">
                      {filterVIP === 'vip' ? (
                        <>
                          <StarFilledIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ color: '#ffd700' }} />
                          <Text>VIP Users</Text>
                        </>
                      ) : filterVIP === 'regular' ? (
                        <>
                          <PersonIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
                          <Text>Regular Users</Text>
                        </>
                      ) : (
                        <>
                          <InfoCircledIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
                          <Text>All Users</Text>
                        </>
                      )}
                    </Flex>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="all">
                      <Flex align="center" gap="2">
                        <InfoCircledIcon width="16" height="16" />
                        All Users
                      </Flex>
                    </Select.Item>
                    <Select.Separator />
                    <Select.Item value="vip">
                      <Flex align="center" gap="2">
                        <StarFilledIcon width="16" height="16" style={{ color: '#ffd700' }} />
                        VIP Users
                      </Flex>
                    </Select.Item>
                    <Select.Item value="regular">
                      <Flex align="center" gap="2">
                        <PersonIcon width="16" height="16" />
                        Regular Users
                      </Flex>
                    </Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Card>

            {sortedUsers.length === 0 ? (
              <Card style={{
                background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: isMobile ? '40px 20px' : '60px',
                textAlign: 'center'
              }}>
                <Text size={isMobile ? '2' : '3'} style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  {searchTerm || filterVIP !== 'all' ? 
                    'No users found matching your filters' : 
                    'No users yet. Users will appear here after they interact with the Telegram bot.'}
                </Text>
              </Card>
            ) : (
              <>
                <Card style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: 0,
                  overflow: 'hidden'
                }}>
                  <Box style={{ overflowX: 'auto' }}>
                    <Table.Root variant="surface">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell 
                            onClick={() => handleSort('username')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <Flex align="center" gap="1">
                              User {getSortIcon('username')}
                            </Flex>
                          </Table.ColumnHeaderCell>
                          {!isMobile && (
                            <Table.ColumnHeaderCell 
                              onClick={() => handleSort('telegram_id')}
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                              <Flex align="center" gap="1">
                                Telegram ID {getSortIcon('telegram_id')}
                              </Flex>
                            </Table.ColumnHeaderCell>
                          )}
                          {!isMobile && (
                            <Table.ColumnHeaderCell 
                              onClick={() => handleSort('created_at')}
                              style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                              <Flex align="center" gap="1">
                                Joined {getSortIcon('created_at')}
                              </Flex>
                            </Table.ColumnHeaderCell>
                          )}
                          <Table.ColumnHeaderCell 
                            onClick={() => handleSort('total_orders')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <Flex align="center" gap="1">
                              Orders {getSortIcon('total_orders')}
                            </Flex>
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell 
                            onClick={() => handleSort('total_spent_usdt')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <Flex align="center" gap="1">
                              Spent {getSortIcon('total_spent_usdt')}
                            </Flex>
                          </Table.ColumnHeaderCell>
                          {!isMobile && (
                            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                          )}
                          <Table.ColumnHeaderCell 
                            onClick={() => handleSort('vip')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <Flex align="center" gap="1">
                              VIP {getSortIcon('vip')}
                            </Flex>
                          </Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {paginatedUsers.map(user => (
                          <Table.Row 
                            key={user._id}
                            style={{
                              background: user.is_vip && user.vip_status === 'active' ? 
                                'rgba(255, 215, 0, 0.03)' : 'transparent'
                            }}
                          >
                            <Table.Cell style={{ verticalAlign: 'middle', padding: isMobile ? '12px' : '16px' }}>
                              <Flex align="center" gap={isMobile ? '2' : '3'}>
                                <Avatar
                                  size={isMobile ? '1' : '2'}
                                  fallback={
                                    user.username ? user.username.slice(0, 2).toUpperCase() :
                                    user.first_name ? user.first_name.slice(0, 2).toUpperCase() :
                                    'NA'
                                  }
                                  style={{
                                    background: user.is_vip && user.vip_status === 'active' ?
                                      'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)' :
                                      'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                                  }}
                                />
                                <Box>
                                  <Flex align="center" gap="1">
                                    <Text size={isMobile ? '1' : '2'} weight="medium">
                                      @{user.username || `user${user.telegram_id}`}
                                    </Text>
                                  </Flex>
                                  {!isMobile && (user.first_name || user.last_name) && (
                                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                      {user.first_name} {user.last_name}
                                    </Text>
                                  )}
                                </Box>
                              </Flex>
                            </Table.Cell>
                            {!isMobile && (
                              <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                                <Code size="2">{user.telegram_id}</Code>
                              </Table.Cell>
                            )}
                            {!isMobile && (
                              <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                                <Flex align="center" gap="1">
                                  <CalendarIcon width="14" height="14" style={{ opacity: 0.6 }} />
                                  <Text size="2">{formatDate(user.created_at)}</Text>
                                </Flex>
                              </Table.Cell>
                            )}
                            <Table.Cell style={{ verticalAlign: 'middle', padding: isMobile ? '12px' : '16px' }}>
                              <Badge size={isMobile ? '1' : '2'} variant="soft">
                                {user.total_orders || 0}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell style={{ verticalAlign: 'middle', padding: isMobile ? '12px' : '16px' }}>
                              <Text size={isMobile ? '1' : '2'} weight="bold" style={{ color: '#10b981' }}>
                                ${formatNumber(user.total_spent_usdt || 0)}
                              </Text>
                            </Table.Cell>
                            {!isMobile && (
                              <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                                <Badge color={user.status === 'active' ? 'green' : 'gray'}>
                                  {user.status || 'active'}
                                </Badge>
                              </Table.Cell>
                            )}
                            <Table.Cell style={{ verticalAlign: 'middle', padding: isMobile ? '12px' : '16px' }}>
                              {user.vip_status === 'active' ? (
                                <Flex align="center" gap={isMobile ? '1' : '2'}>
                                  <StarFilledIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ color: '#ffd700' }} />
                                  {!isMobile && (
                                    <Badge size="2" color="amber" variant="soft">
                                      {user.vip_discount_percentage}% OFF
                                    </Badge>
                                  )}
                                </Flex>
                              ) : user.vip_status === 'expired' ? (
                                <Badge size={isMobile ? '1' : '2'} color="red" variant="soft">
                                  Expired
                                </Badge>
                              ) : (
                                <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.3)' }}>—</Text>
                              )}
                            </Table.Cell>
                            <Table.Cell style={{ verticalAlign: 'middle', padding: isMobile ? '12px' : '16px' }}>
                              <IconButton
                                size={isMobile ? '1' : '2'}
                                variant="soft"
                                onClick={() => openVIPModal(user)}
                                style={{
                                  background: user.is_vip && user.vip_status === 'active' ?
                                    'rgba(255, 215, 0, 0.2)' :
                                    'rgba(139, 92, 246, 0.2)',
                                  color: user.is_vip && user.vip_status === 'active' ?
                                    '#ffd700' : '#8b5cf6'
                                }}
                              >
                                <StarFilledIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
                              </IconButton>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>
                </Card>

                {sortedUsers.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={sortedUsers.length}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    isMobile={isMobile}
                  />
                )}
              </>
            )}

            <VIPEditModal
              user={selectedUser}
              isOpen={vipModalOpen}
              onClose={() => {
                setVipModalOpen(false);
                setSelectedUser(null);
              }}
              onSave={handleVIPSave}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default Users;
