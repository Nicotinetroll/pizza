import React, { useState, useEffect } from 'react';
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
  Pencil1Icon, CheckIcon, TimerIcon
} from '@radix-ui/react-icons';
import { usersAPI } from '../services/api';

// VIP Edit Modal
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
            {/* VIP Active Switch */}
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

            {/* Discount Percentage */}
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

            {/* Expiry Date */}
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

            {/* Notes */}
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

            {/* Form Actions */}
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

// Main Users Component
const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVIP, setFilterVIP] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
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

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter users
  const filteredUsers = users.filter(user => {
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

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Special handling for different fields
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

  // Get sort icon
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <Text size="1" style={{ opacity: 0.3 }}>↕</Text>;
    }
    return sortConfig.direction === 'asc' ? 
      <Text size="1" style={{ color: '#8b5cf6' }}>↑</Text> : 
      <Text size="1" style={{ color: '#8b5cf6' }}>↓</Text>;
  };

  // Calculate stats
  const stats = {
    total: users.length,
    vip: users.filter(u => u.is_vip && u.vip_status === 'active').length,
    totalSpent: users.reduce((sum, u) => sum + (u.total_spent_usdt || 0), 0),
    totalOrders: users.reduce((sum, u) => sum + (u.total_orders || 0), 0)
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <PersonIcon width="32" height="32" style={{ color: '#8b5cf6' }} />
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
            Users Management
          </Heading>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Manage customer accounts and VIP status
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
      <Grid columns={{ initial: '2', sm: '2', lg: '4' }} gap="4" mb="6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
        >
          <Card style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '20px'
          }}>
            <Flex align="center" justify="between">
              <Box>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                  Total Users
                </Text>
                <Text size="6" weight="bold">{stats.total}</Text>
              </Box>
              <Box style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PersonIcon width="20" height="20" style={{ color: '#8b5cf6' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
          transition={{ delay: 0.1 }}
        >
          <Card style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '20px'
          }}>
            <Flex align="center" justify="between">
              <Box>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                  VIP Users
                </Text>
                <Text size="6" weight="bold" style={{ color: '#ffd700' }}>{stats.vip}</Text>
              </Box>
              <Box style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(255, 215, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <StarFilledIcon width="20" height="20" style={{ color: '#ffd700' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
          transition={{ delay: 0.2 }}
        >
          <Card style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '20px'
          }}>
            <Flex align="center" justify="between">
              <Box>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                  Total Revenue
                </Text>
                <Text size="6" weight="bold" style={{ color: '#10b981' }}>
                  ${formatPrice(stats.totalSpent)}
                </Text>
              </Box>
              <Box style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TokensIcon width="20" height="20" style={{ color: '#10b981' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
          transition={{ delay: 0.3 }}
        >
          <Card style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '20px'
          }}>
            <Flex align="center" justify="between">
              <Box>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                  Total Orders
                </Text>
                <Text size="6" weight="bold">{stats.totalOrders}</Text>
              </Box>
              <Box style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <RocketIcon width="20" height="20" style={{ color: '#f59e0b' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>
      </Grid>

      {/* Filters */}
      <Card style={{
        background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
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
              placeholder="Search by ID, username, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
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
                minWidth: '150px'
              }}
            >
              <Flex align="center" gap="2">
                {filterVIP === 'vip' ? (
                  <>
                    <StarFilledIcon width="16" height="16" style={{ color: '#ffd700' }} />
                    <Text>VIP Users</Text>
                  </>
                ) : filterVIP === 'regular' ? (
                  <>
                    <PersonIcon width="16" height="16" />
                    <Text>Regular Users</Text>
                  </>
                ) : (
                  <>
                    <InfoCircledIcon width="16" height="16" />
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

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <Card style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '60px',
          textAlign: 'center'
        }}>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {searchTerm || filterVIP !== 'all' ? 
              'No users found matching your filters' : 
              'No users yet. Users will appear here after they interact with the Telegram bot.'}
          </Text>
        </Card>
      ) : (
        <Card style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: 0,
          overflow: 'hidden'
        }}>
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
                <Table.ColumnHeaderCell 
                  onClick={() => handleSort('telegram_id')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Flex align="center" gap="1">
                    Telegram ID {getSortIcon('telegram_id')}
                  </Flex>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell 
                  onClick={() => handleSort('created_at')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Flex align="center" gap="1">
                    Joined {getSortIcon('created_at')}
                  </Flex>
                </Table.ColumnHeaderCell>
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
                    Total Spent {getSortIcon('total_spent_usdt')}
                  </Flex>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
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
              {sortedUsers.map(user => (
                <Table.Row 
                  key={user._id}
                  style={{
                    background: user.is_vip && user.vip_status === 'active' ? 
                      'rgba(255, 215, 0, 0.03)' : 'transparent'
                  }}
                >
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Flex align="center" gap="3">
                      <Avatar
                        size="2"
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
                          <Text size="2" weight="medium">
                            @{user.username || `user${user.telegram_id}`}
                          </Text>
                        </Flex>
                        {(user.first_name || user.last_name) && (
                          <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            {user.first_name} {user.last_name}
                          </Text>
                        )}
                      </Box>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Code size="2">{user.telegram_id}</Code>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Flex align="center" gap="1">
                      <CalendarIcon width="14" height="14" style={{ opacity: 0.6 }} />
                      <Text size="2">{formatDate(user.created_at)}</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Badge size="2" variant="soft">
                      {user.total_orders || 0}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                      ${formatPrice(user.total_spent_usdt)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Badge color={user.status === 'active' ? 'green' : 'gray'}>
                      {user.status || 'active'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    {user.vip_status === 'active' ? (
                      <Flex align="center" gap="2">
                        <StarFilledIcon width="16" height="16" style={{ color: '#ffd700' }} />
                        <Badge size="2" color="amber" variant="soft">
                          {user.vip_discount_percentage}% OFF
                        </Badge>
                      </Flex>
                    ) : user.vip_status === 'expired' ? (
                      <Badge size="2" color="red" variant="soft">
                        Expired
                      </Badge>
                    ) : (
                      <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>—</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <IconButton
                      size="2"
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
                      <StarFilledIcon width="16" height="16" />
                    </IconButton>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card>
      )}

      {/* VIP Edit Modal */}
      <VIPEditModal
        user={selectedUser}
        isOpen={vipModalOpen}
        onClose={() => {
          setVipModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleVIPSave}
      />
    </Box>
  );
};

export default Users;
