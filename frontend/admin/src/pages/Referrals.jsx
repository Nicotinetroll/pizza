import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, Select,
  Table, IconButton, Heading, TextField, Dialog,
  Switch, Avatar, Separator, ScrollArea, Code,
  Tabs, Progress, DropdownMenu, TextArea
} from '@radix-ui/themes';
import {
  PlusIcon, Pencil1Icon, TrashIcon, MagnifyingGlassIcon,
  ReloadIcon, CheckCircledIcon, CrossCircledIcon, RocketIcon,
  CopyIcon, ExclamationTriangleIcon, LayersIcon, InfoCircledIcon,
  TimerIcon, LightningBoltIcon, DiscordLogoIcon, MagicWandIcon,
  CalendarIcon, ClockIcon, TokensIcon
} from '@radix-ui/react-icons';
import { referralsAPI } from '../services/api';

// Referral Form Modal
const ReferralFormModal = ({ referral, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    usage_limit: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (referral) {
      setFormData({
        code: referral.code,
        description: referral.description,
        discount_type: referral.discount_type,
        discount_value: referral.discount_value,
        usage_limit: referral.usage_limit || '',
        valid_from: referral.valid_from ? new Date(referral.valid_from).toISOString().split('T')[0] : '',
        valid_until: referral.valid_until ? new Date(referral.valid_until).toISOString().split('T')[0] : '',
        is_active: referral.is_active
      });
    } else {
      setFormData({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        usage_limit: '',
        valid_from: '',
        valid_until: '',
        is_active: true
      });
    }
    setErrors({});
  }, [referral, isOpen]);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormData({...formData, code});
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.code || formData.code.length < 3) {
      newErrors.code = 'Code must be at least 3 characters';
    }
    if (!/^[A-Z0-9]+$/.test(formData.code.toUpperCase())) {
      newErrors.code = 'Code must be alphanumeric only';
    }
    if (!formData.description) {
      newErrors.description = 'Description is required';
    }
    if (formData.discount_type === 'percentage' && (formData.discount_value < 0 || formData.discount_value > 100)) {
      newErrors.discount_value = 'Percentage must be between 0 and 100';
    }
    if (formData.discount_type === 'fixed' && formData.discount_value < 0) {
      newErrors.discount_value = 'Fixed discount must be positive';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    const data = {
      ...formData,
      code: formData.code.toUpperCase(),
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
    };
    
    await onSave(data);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '600px' }}>
        <Dialog.Title>
          <Flex align="center" gap="3">
            <Box style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TokensIcon width="20" height="20" />
            </Box>
            <Heading size="4">
              {referral ? 'Edit Referral Code' : 'Create New Referral Code'}
            </Heading>
          </Flex>
        </Dialog.Title>

        <Box mt="4">
          <ScrollArea style={{ maxHeight: '70vh' }}>
            <Flex direction="column" gap="4">
              {/* Code field with generator */}
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Referral Code *
                </Text>
                <Flex gap="2">
                  <TextField.Root
                    size="3"
                    placeholder="e.g., GAINS20"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: errors.code ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                  <Button
                    size="3"
                    variant="soft"
                    onClick={generateRandomCode}
                    style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}
                  >
                    <MagicWandIcon width="16" height="16" />
                    Generate
                  </Button>
                </Flex>
                {errors.code && (
                  <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                    {errors.code}
                  </Text>
                )}
              </Box>

              {/* Description field */}
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Description *
                </Text>
                <TextArea
                  placeholder="e.g., 20% off for new customers"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.description ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    minHeight: '80px'
                  }}
                />
                {errors.description && (
                  <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                    {errors.description}
                  </Text>
                )}
              </Box>

              {/* Discount Type and Value */}
              <Grid columns="2" gap="4">
                <Box>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    Discount Type
                  </Text>
                  <Select.Root 
                    value={formData.discount_type} 
                    onValueChange={(value) => setFormData({...formData, discount_type: value})}
                  >
                    <Select.Trigger style={{ 
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <Text>{formData.discount_type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount ($)'}</Text>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="percentage">Percentage (%)</Select.Item>
                      <Select.Item value="fixed">Fixed Amount ($)</Select.Item>
                    </Select.Content>
                  </Select.Root>
                </Box>

                <Box>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    Discount Value *
                  </Text>
                  <Box style={{ position: 'relative' }}>
                    <Text size="1" style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.6)',
                      zIndex: 1
                    }}>
                      {formData.discount_type === 'percentage' ? '%' : '$'}
                    </Text>
                    <TextField.Root
                      size="3"
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.discount_type === 'percentage' ? "100" : "9999"}
                      placeholder={formData.discount_type === 'percentage' ? '10' : '25.00'}
                      value={formData.discount_value}
                      onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: errors.discount_value ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                        paddingLeft: '32px'
                      }}
                    />
                  </Box>
                  {errors.discount_value && (
                    <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                      {errors.discount_value}
                    </Text>
                  )}
                </Box>
              </Grid>

              {/* Usage Limit */}
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Usage Limit (optional)
                </Text>
                <TextField.Root
                  size="3"
                  type="number"
                  min="0"
                  placeholder="Leave empty for unlimited"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
              </Box>

              {/* Valid From and Until */}
              <Grid columns="2" gap="4">
                <Box>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    Valid From (optional)
                  </Text>
                  <TextField.Root
                    size="3"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </Box>

                <Box>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    Valid Until (optional)
                  </Text>
                  <TextField.Root
                    size="3"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </Box>
              </Grid>

              {/* Active Status */}
              <Card style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.2)'
              }}>
                <Flex align="center" justify="between">
                  <Box>
                    <Text size="2" weight="medium" style={{ display: 'block' }}>
                      Active Status
                    </Text>
                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                      {formData.is_active ? 'Code can be used by customers' : 'Code is disabled'}
                    </Text>
                  </Box>
                  <Switch
                    size="3"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                </Flex>
              </Card>

              {/* Form Actions */}
              <Flex gap="3" justify="end" mt="4">
                <Dialog.Close>
                  <Button variant="soft" size="3">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  size="3"
                  disabled={saving}
                  onClick={handleSubmit}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Saving...' : (referral ? 'Update' : 'Create')} Code
                </Button>
              </Flex>
            </Flex>
          </ScrollArea>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
};

// Main Referrals Component
const Referrals = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await referralsAPI.getAll();
      setReferrals(response.referrals || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReferrals();
  };

  const handleSave = async (formData) => {
    try {
      if (selectedReferral) {
        await referralsAPI.update(selectedReferral._id, formData);
      } else {
        await referralsAPI.create(formData);
      }
      await fetchReferrals();
    } catch (error) {
      console.error('Error saving referral:', error);
    }
  };

  const handleDelete = async (referral) => {
    if (!confirm(`Delete referral code "${referral.code}"? This cannot be undone!`)) return;

    try {
      await referralsAPI.delete(referral._id);
      await fetchReferrals();
    } catch (error) {
      console.error('Error deleting referral:', error);
    }
  };

  const handleEdit = (referral) => {
    setSelectedReferral(referral);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedReferral(null);
    setModalOpen(true);
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No limit';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  // Filter referrals
  const filteredReferrals = referrals.filter(referral => {
    const matchesSearch = 
      referral.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && referral.is_active && !referral.is_expired) ||
      (statusFilter === 'inactive' && !referral.is_active) ||
      (statusFilter === 'expired' && referral.is_expired);
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: referrals.length,
    active: referrals.filter(r => r.is_active && !r.is_expired).length,
    used: referrals.reduce((sum, r) => sum + (r.used_count || 0), 0),
    totalSaved: referrals.reduce((sum, r) => {
      const saved = (r.used_count || 0) * (r.discount_type === 'percentage' 
        ? (r.discount_value / 100) * 100 // Approximate
        : r.discount_value);
      return sum + saved;
    }, 0)
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <TokensIcon width="32" height="32" style={{ color: '#8b5cf6' }} />
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
            Referral Codes
          </Heading>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Manage discount codes and referral programs
          </Text>
        </Box>

        <Flex gap="3">
          <Button
            size="3"
            onClick={handleCreate}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              cursor: 'pointer'
            }}
          >
            <PlusIcon width="18" height="18" />
            Create Code
          </Button>
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
                  Total Codes
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
                <TokensIcon width="20" height="20" style={{ color: '#8b5cf6' }} />
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
                  Active
                </Text>
                <Text size="6" weight="bold">{stats.active}</Text>
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
                <CheckCircledIcon width="20" height="20" style={{ color: '#10b981' }} />
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
                  Times Used
                </Text>
                <Text size="6" weight="bold">{stats.used}</Text>
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
                <LightningBoltIcon width="20" height="20" style={{ color: '#f59e0b' }} />
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
                  Total Saved
                </Text>
                <Text size="6" weight="bold">${stats.totalSaved.toFixed(0)}</Text>
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
                <RocketIcon width="20" height="20" style={{ color: '#10b981' }} />
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
              placeholder="Search codes or descriptions..."
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
                <InfoCircledIcon width="16" height="16" />
                <Text>
                  {statusFilter === 'all' ? 'All Status' : 
                   statusFilter === 'active' ? 'Active' :
                   statusFilter === 'inactive' ? 'Inactive' : 'Expired'}
                </Text>
              </Flex>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Status</Select.Item>
              <Select.Separator />
              <Select.Item value="active">Active</Select.Item>
              <Select.Item value="inactive">Inactive</Select.Item>
              <Select.Item value="expired">Expired</Select.Item>
            </Select.Content>
          </Select.Root>
        </Flex>
      </Card>

      {/* Referrals Table */}
      {filteredReferrals.length === 0 ? (
        <Card style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '60px',
          textAlign: 'center'
        }}>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {searchTerm || statusFilter !== 'all' ? 
              'No referral codes found matching your filters' : 
              'No referral codes yet. Create your first code to offer discounts!'}
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
                <Table.ColumnHeaderCell>Code</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Discount</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Usage</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Valid Until</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredReferrals.map(referral => (
                <Table.Row key={referral._id}>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Flex align="center" gap="2">
                      <Code size="3" style={{ 
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: '#8b5cf6',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: 'bold'
                      }}>
                        {referral.code}
                      </Code>
                      <IconButton
                        size="1"
                        variant="ghost"
                        onClick={() => copyToClipboard(referral.code)}
                        style={{
                          color: copiedCode === referral.code ? '#10b981' : 'rgba(255, 255, 255, 0.6)'
                        }}
                      >
                        {copiedCode === referral.code ? 
                          <CheckCircledIcon width="16" height="16" /> : 
                          <CopyIcon width="16" height="16" />
                        }
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {referral.description}
                    </Text>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Badge 
                      size="2" 
                      color={referral.discount_type === 'percentage' ? 'purple' : 'green'}
                      variant="soft"
                    >
                      {referral.discount_type === 'percentage' 
                        ? `${referral.discount_value}%` 
                        : `$${referral.discount_value}`}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Flex align="center" gap="2">
                      <Text size="2" weight="medium">
                        {referral.used_count || 0}
                      </Text>
                      <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        / {referral.usage_limit || '∞'}
                      </Text>
                      {referral.usage_limit && (
                        <Progress 
                          value={(referral.used_count || 0) / referral.usage_limit * 100}
                          size="1"
                          style={{ width: '60px' }}
                        />
                      )}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    {referral.is_expired ? (
                      <Flex align="center" gap="1">
                        <ExclamationTriangleIcon width="14" height="14" style={{ color: '#ef4444' }} />
                        <Text size="2" style={{ color: '#ef4444' }}>Expired</Text>
                      </Flex>
                    ) : referral.valid_until ? (
                      <Flex align="center" gap="1">
                        <CalendarIcon width="14" height="14" style={{ opacity: 0.6 }} />
                        <Text size="2">{formatDate(referral.valid_until)}</Text>
                      </Flex>
                    ) : (
                      <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No limit</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Badge 
                      size="2"
                      color={
                        referral.is_expired ? 'red' :
                        referral.is_active ? 'green' : 'gray'
                      }
                      variant="soft"
                    >
                      {referral.is_expired ? 'Expired' : 
                       referral.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Flex gap="2">
                      <IconButton
                        size="2"
                        variant="soft"
                        onClick={() => handleEdit(referral)}
                        style={{
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.2)'
                        }}
                      >
                        <Pencil1Icon width="16" height="16" />
                      </IconButton>
                      <IconButton
                        size="2"
                        variant="soft"
                        color="red"
                        onClick={() => handleDelete(referral)}
                      >
                        <TrashIcon width="16" height="16" />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card>
      )}

      {/* Referral Form Modal */}
      <ReferralFormModal
        referral={selectedReferral}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </Box>
  );
};

export default Referrals;
