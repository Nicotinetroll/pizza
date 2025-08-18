import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, Select,
  Table, IconButton, Heading, TextField, Dialog,
  Switch, Avatar, Separator, ScrollArea, Code,
  Progress, DropdownMenu, TextArea, Tabs
} from '@radix-ui/themes';
import {
  PersonIcon, PlusIcon, Pencil1Icon, TrashIcon, EyeOpenIcon,
  RocketIcon, ReloadIcon, CheckCircledIcon,
  Link2Icon, CardStackIcon, TimerIcon, TokensIcon, ArrowUpIcon
} from '@radix-ui/react-icons';
import { sellersAPI, referralsAPI } from '../services/api';

// Seller Form Modal
const SellerFormModal = ({ seller, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    telegram_username: '',
    commission_percentage: 30,
    payout_address: '',
    notes: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (seller) {
      setFormData({
        name: seller.name,
        telegram_username: seller.telegram_username,
        commission_percentage: seller.commission_percentage,
        payout_address: seller.payout_address || '',
        notes: seller.notes || '',
        is_active: seller.is_active
      });
    } else {
      setFormData({
        name: '',
        telegram_username: '',
        commission_percentage: 30,
        payout_address: '',
        notes: '',
        is_active: true
      });
    }
    setErrors({});
  }, [seller, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.telegram_username) newErrors.telegram_username = 'Telegram username is required';
    if (formData.commission_percentage < 0 || formData.commission_percentage > 100) {
      newErrors.commission_percentage = 'Commission must be between 0 and 100';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave(formData, seller?._id);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '600px', padding: '24px' }}>
        <Dialog.Title style={{ marginBottom: '20px' }}>
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
              <PersonIcon width="20" height="20" />
            </Box>
            <Heading size="4">
              {seller ? 'Edit Seller' : 'Add New Seller'}
            </Heading>
          </Flex>
        </Dialog.Title>

        <Box mt="5">
          <Flex direction="column" gap="4">
            <Box>
              <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                Seller Name *
              </Text>
              <TextField.Root
                size="3"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: errors.name ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                }}
              />
              {errors.name && (
                <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                  {errors.name}
                </Text>
              )}
            </Box>

            <Box>
              <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                Telegram Username *
              </Text>
              <TextField.Root
                size="3"
                placeholder="username (without @)"
                value={formData.telegram_username}
                onChange={(e) => setFormData({...formData, telegram_username: e.target.value})}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: errors.telegram_username ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                }}
              />
              {errors.telegram_username && (
                <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                  {errors.telegram_username}
                </Text>
              )}
            </Box>

            <Grid columns="2" gap="4">
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Commission % *
                </Text>
                <TextField.Root
                  size="3"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.commission_percentage}
                  onChange={(e) => setFormData({...formData, commission_percentage: parseFloat(e.target.value) || 0})}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.commission_percentage ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
                {errors.commission_percentage && (
                  <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                    {errors.commission_percentage}
                  </Text>
                )}
              </Box>

              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  USDT Address
                </Text>
                <TextField.Root
                  size="3"
                  placeholder="Optional payout address"
                  value={formData.payout_address}
                  onChange={(e) => setFormData({...formData, payout_address: e.target.value})}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
              </Box>
            </Grid>

            <Box>
              <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                Notes
              </Text>
              <TextArea
                placeholder="Optional notes about this seller"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minHeight: '80px'
                }}
              />
            </Box>

            <Card style={{
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <Flex align="center" justify="between">
                <Box>
                  <Text size="2" weight="medium">Active Status</Text>
                  <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                    {formData.is_active ? 'Seller can earn commissions' : 'Seller is inactive'}
                  </Text>
                </Box>
                <Switch
                  size="3"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
              </Flex>
            </Card>

            <Flex gap="3" justify="end" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Dialog.Close>
                <Button variant="soft" size="3">Cancel</Button>
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
                {saving ? 'Saving...' : (seller ? 'Update' : 'Create')} Seller
              </Button>
            </Flex>
          </Flex>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
};

// Earnings Modal
const EarningsModal = ({ sellerId, isOpen, onClose, onPayout }) => {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('commissions');

  useEffect(() => {
    if (isOpen && sellerId) {
      fetchEarnings();
    }
  }, [isOpen, sellerId]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await sellersAPI.getEarnings(sellerId);
      setEarningsData(response);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '900px', maxHeight: '80vh', padding: '24px' }}>
        <Dialog.Title style={{ marginBottom: '20px' }}>
          <Flex align="center" gap="3">
            <Box style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TokensIcon width="20" height="20" />
            </Box>
            <Heading size="4">
              Earnings Report: {earningsData?.seller?.name || 'Loading...'}
            </Heading>
          </Flex>
        </Dialog.Title>

        {loading ? (
          <Flex align="center" justify="center" style={{ minHeight: '200px' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RocketIcon width="32" height="32" style={{ color: '#8b5cf6' }} />
            </motion.div>
          </Flex>
        ) : earningsData && (
          <Box mt="5">
            <Grid columns="4" gap="3" mb="4">
              <Card style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '20px'
              }}>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '8px' }}>Total Earned</Text>
                <Text size="6" weight="bold" style={{ color: '#10b981' }}>
                  ${earningsData.summary.total_earnings || '0.00'}
                </Text>
              </Card>
              <Card style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                padding: '20px'
              }}>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '8px' }}>Total Paid</Text>
                <Text size="6" weight="bold" style={{ color: '#8b5cf6' }}>
                  ${earningsData.summary.total_paid || '0.00'}
                </Text>
              </Card>
              <Card style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                padding: '20px'
              }}>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '8px' }}>Pending</Text>
                <Text size="6" weight="bold" style={{ color: '#f59e0b' }}>
                  ${earningsData.summary.pending_payout || '0.00'}
                </Text>
              </Card>
              <Card style={{ padding: '20px' }}>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '8px' }}>Total Orders</Text>
                <Text size="6" weight="bold">
                  {earningsData.summary.total_orders || '0'}
                </Text>
              </Card>
            </Grid>

            <Tabs.Root value={activeTab} onValueChange={setActiveTab} style={{ marginTop: '24px' }}>
              <Tabs.List style={{ marginBottom: '20px' }}>
                <Tabs.Trigger value="commissions">Commissions</Tabs.Trigger>
                <Tabs.Trigger value="payouts">Payout History</Tabs.Trigger>
              </Tabs.List>

              <Box mt="4">
                <Tabs.Content value="commissions">
                  <ScrollArea style={{ maxHeight: '300px' }}>
                    {earningsData.earnings.length === 0 ? (
                      <Flex align="center" justify="center" style={{ padding: '40px' }}>
                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          No earnings yet
                        </Text>
                      </Flex>
                    ) : (
                      <Table.Root variant="surface">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Order</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Code</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Order Total</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Profit</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Rate</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Commission</Table.ColumnHeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {earningsData.earnings.map((earning, idx) => (
                            <Table.Row key={idx}>
                              <Table.Cell style={{ padding: '12px' }}>{new Date(earning.date).toLocaleDateString()}</Table.Cell>
                              <Table.Cell style={{ padding: '12px' }}>
                                <Code size="1">{earning.order_number}</Code>
                              </Table.Cell>
                              <Table.Cell style={{ padding: '12px' }}>
                                <Badge variant="soft">{earning.referral_code}</Badge>
                              </Table.Cell>
                              <Table.Cell style={{ padding: '12px' }}>${earning.order_total}</Table.Cell>
                              <Table.Cell style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                ${earning.order_profit}
                              </Table.Cell>
                              <Table.Cell style={{ padding: '12px' }}>{earning.commission_rate}%</Table.Cell>
                              <Table.Cell style={{ padding: '12px' }}>
                                <Text weight="bold" style={{ color: '#10b981' }}>
                                  ${earning.commission_earned}
                                </Text>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    )}
                  </ScrollArea>
                </Tabs.Content>

                <Tabs.Content value="payouts">
                  <ScrollArea style={{ maxHeight: '300px' }}>
                    {earningsData.payout_history.length === 0 ? (
                      <Flex align="center" justify="center" style={{ padding: '40px' }}>
                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          No payouts yet
                        </Text>
                      </Flex>
                    ) : (
                      <Table.Root variant="surface">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Method</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Transaction ID</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {earningsData.payout_history.map((payout, idx) => (
                            <Table.Row key={idx}>
                              <Table.Cell style={{ padding: '12px' }}>{new Date(payout.created_at).toLocaleDateString()}</Table.Cell>
                              <Table.Cell style={{ padding: '12px' }}>
                                <Text weight="bold" style={{ color: '#10b981' }}>
                                  ${payout.amount.toFixed(2)}
                                </Text>
                              </Table.Cell>
                              <Table.Cell style={{ padding: '12px' }}>
                                <Badge>{payout.payment_method}</Badge>
                              </Table.Cell>
                              <Table.Cell style={{ padding: '12px' }}>
                                <Code size="1">{payout.transaction_id || '—'}</Code>
                              </Table.Cell>
                              <Table.Cell style={{ padding: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                {payout.notes || '—'}
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    )}
                  </ScrollArea>
                </Tabs.Content>
              </Box>
            </Tabs.Root>

            {earningsData.summary.pending_payout > 0 && (
              <Card style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                marginTop: '32px',
                padding: '24px'
              }}>
                <Flex align="center" justify="between" gap="4">
                  <Box>
                    <Text size="3" weight="medium" style={{ display: 'block' }}>Pending Payout Available</Text>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px', display: 'block' }}>
                      Process payout for ${earningsData.summary.pending_payout}
                    </Text>
                  </Box>
                  <Button
                    size="3"
                    onClick={() => onPayout(sellerId, earningsData.summary.pending_payout)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      padding: '12px 24px'
                    }}
                  >
                    <Flex align="center" gap="2">
                      <CardStackIcon width="18" height="18" />
                      <Text size="3">Process Payout</Text>
                    </Flex>
                  </Button>
                </Flex>
              </Card>
            )}

            <Flex gap="3" justify="end" mt="4">
              <Dialog.Close>
                <Button variant="soft" size="3">Close</Button>
              </Dialog.Close>
            </Flex>
          </Box>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};

// Assign Referral Code Modal
const AssignCodeModal = ({ seller, referralCodes, isOpen, onClose, onAssign }) => {
  const availableCodes = referralCodes.filter(code => !code.seller_id || code.seller_id === seller?._id);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '600px', padding: '24px' }}>
        <Dialog.Title style={{ marginBottom: '20px' }}>
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
              <Link2Icon width="20" height="20" />
            </Box>
            <Heading size="4">
              Assign Referral Code to {seller?.name}
            </Heading>
          </Flex>
        </Dialog.Title>

        <Box mt="4">
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '20px' }}>
            Select a referral code to assign. The seller will earn {seller?.commission_percentage}% commission on profits from orders using their code.
          </Text>

          {seller?.referral_codes && seller.referral_codes.length > 0 && (
            <Card style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              marginBottom: '20px',
              padding: '16px'
            }}>
              <Text size="2" weight="medium" style={{ marginBottom: '10px' }}>Currently Assigned:</Text>
              <Flex gap="2" wrap="wrap">
                {seller.referral_codes.map(code => (
                  <Badge key={code.code} size="2" color="green">
                    {code.code} ({code.uses} uses)
                  </Badge>
                ))}
              </Flex>
            </Card>
          )}

          <ScrollArea style={{ maxHeight: '400px' }}>
            <Flex direction="column" gap="3">
              {availableCodes.length === 0 ? (
                <Card style={{ padding: '24px' }}>
                  <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                    No unassigned referral codes available. Create new codes in the Referrals section.
                  </Text>
                </Card>
              ) : (
                availableCodes.map(code => (
                  <Card key={code._id} style={{
                    background: code.seller_id === seller?._id ? 
                      'rgba(16, 185, 129, 0.05)' : 
                      'rgba(255, 255, 255, 0.02)',
                    border: code.seller_id === seller?._id ?
                      '1px solid rgba(16, 185, 129, 0.3)' :
                      '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '16px'
                  }}>
                    <Flex align="center" justify="between">
                      <Box>
                        <Flex align="center" gap="2" mb="1">
                          <Code size="3" style={{ color: '#8b5cf6' }}>{code.code}</Code>
                          <Badge size="1" color={code.discount_type === 'percentage' ? 'purple' : 'green'}>
                            {code.discount_type === 'percentage' ? `${code.discount_value}%` : `$${code.discount_value}`}
                          </Badge>
                        </Flex>
                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {code.description} • Used {code.used_count || 0} times
                        </Text>
                        {code.seller_id === seller?._id && (
                          <Badge size="1" color="green" variant="soft" mt="1">
                            ✓ Already assigned to this seller
                          </Badge>
                        )}
                      </Box>
                      {code.seller_id !== seller?._id && (
                        <Button
                          size="2"
                          onClick={() => onAssign(code._id, seller._id)}
                          style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                          }}
                        >
                          Assign
                        </Button>
                      )}
                    </Flex>
                  </Card>
                ))
              )}
            </Flex>
          </ScrollArea>

          <Flex gap="3" justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft" size="3">Close</Button>
            </Dialog.Close>
          </Flex>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
};

// Main Sellers Component
const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [referralCodes, setReferralCodes] = useState([]);
  
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [earningsModalOpen, setEarningsModalOpen] = useState(false);
  const [viewingSeller, setViewingSeller] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningSeller, setAssigningSeller] = useState(null);

  useEffect(() => {
    fetchSellers();
    fetchStats();
    fetchReferralCodes();
  }, []);

  const fetchSellers = async () => {
    try {
      const response = await sellersAPI.getAll();
      // Don't filter anything - show all sellers from backend
      // Backend should handle what to return
      setSellers(response.sellers || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await sellersAPI.getStats();
      setStats(response);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchReferralCodes = async () => {
    try {
      const response = await referralsAPI.getAll();
      setReferralCodes(response.referrals || []);
    } catch (error) {
      console.error('Error fetching referral codes:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSellers();
    fetchStats();
    fetchReferralCodes();
  };

  const handleSave = async (formData, sellerId) => {
    try {
      if (sellerId) {
        await sellersAPI.update(sellerId, formData);
      } else {
        await sellersAPI.create(formData);
      }
      await fetchSellers();
      await fetchStats();
    } catch (error) {
      console.error('Error saving seller:', error);
    }
  };

  const handleDelete = async (sellerId, sellerName, event) => {
    const isShiftPressed = event.shiftKey;
    
    if (isShiftPressed) {
      // Hard delete with strong warning
      const userInput = prompt(
        `⚠️ PERMANENT DELETE WARNING!\n\n` +
        `You are about to PERMANENTLY DELETE "${sellerName}".\n\n` +
        `This will:\n` +
        `• Delete ALL earnings history\n` +
        `• Delete ALL payout records\n` +
        `• Remove ALL associated data\n` +
        `• This CANNOT be undone!\n\n` +
        `Type "DELETE" to confirm permanent deletion:`
      );
      
      if (userInput === 'DELETE') {
        try {
          const result = await sellersAPI.delete(sellerId, true); // true for hard delete
          console.log('Hard delete result:', result);
          await fetchSellers();
          await fetchStats();
          alert(`✅ Seller "${sellerName}" permanently deleted`);
        } catch (error) {
          console.error('Error deleting seller:', error);
          alert('Error deleting seller: ' + error.message);
        }
      } else if (userInput !== null) {
        alert('Deletion cancelled - you must type DELETE exactly');
      }
    } else {
      // Soft delete (deactivate)
      if (confirm(`Deactivate seller "${sellerName}"?\n\nThis will disable the seller but keep their history.\n\n(Hold Shift + Click for permanent delete)`)) {
        try {
          const result = await sellersAPI.delete(sellerId, false); // false for soft delete
          console.log('Soft delete result:', result);
          await fetchSellers();
          await fetchStats();
          alert(`✅ Seller "${sellerName}" deactivated`);
        } catch (error) {
          console.error('Error deactivating seller:', error);
          alert('Error deactivating seller: ' + error.message);
        }
      }
    }
  };

  const handlePayout = async (sellerId, pendingAmount) => {
    const amount = prompt(`Enter payout amount (Max: $${pendingAmount}):`);
    if (!amount) return;
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Invalid amount');
      return;
    }
    
    if (parsedAmount > parseFloat(pendingAmount)) {
      alert(`Amount cannot exceed pending earnings ($${pendingAmount})`);
      return;
    }
    
    const notes = prompt('Add notes (optional):');
    
    try {
      await sellersAPI.createPayout(sellerId, {
        amount: parsedAmount,
        payment_method: 'USDT',
        notes: notes || ''
      });
      
      await fetchSellers();
      await fetchStats();
      setEarningsModalOpen(false);
    } catch (error) {
      console.error('Error processing payout:', error);
    }
  };

  const handleAssignCode = async (referralId, sellerId) => {
    try {
      await sellersAPI.assignReferralCode(referralId, sellerId);
      setAssignModalOpen(false);
      setAssigningSeller(null);
      await fetchSellers();
      await fetchReferralCodes();
    } catch (error) {
      console.error('Error assigning code:', error);
    }
  };

  const openEditModal = (seller) => {
    setSelectedSeller(seller);
    setFormModalOpen(true);
  };

  const openEarningsModal = (seller) => {
    setViewingSeller(seller._id);
    setEarningsModalOpen(true);
  };

  const openAssignModal = (seller) => {
    setAssigningSeller(seller);
    setAssignModalOpen(true);
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
            Seller Management
          </Heading>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Manage your referral partners and their commissions
          </Text>
        </Box>

        <Flex gap="3">
          <Button
            size="3"
            onClick={() => {
              setSelectedSeller(null);
              setFormModalOpen(true);
            }}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              cursor: 'pointer'
            }}
          >
            <PlusIcon width="18" height="18" />
            Add Seller
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
      {stats && (
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
                    Active Sellers
                  </Text>
                  <Text size="6" weight="bold">{stats.total_sellers}</Text>
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
                    Total Earnings
                  </Text>
                  <Text size="6" weight="bold">${stats.total_earnings}</Text>
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
                    Pending Payouts
                  </Text>
                  <Text size="6" weight="bold">${stats.total_pending}</Text>
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
                  <TimerIcon width="20" height="20" style={{ color: '#f59e0b' }} />
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
                    This Month Paid
                  </Text>
                  <Text size="6" weight="bold">${stats.monthly_payouts}</Text>
                </Box>
                <Box style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(6, 182, 212, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ArrowUpIcon width="20" height="20" style={{ color: '#06b6d4' }} />
                </Box>
              </Flex>
            </Card>
          </motion.div>
        </Grid>
      )}

      {/* Sellers Table */}
      {sellers.length === 0 ? (
        <Card style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '60px',
          textAlign: 'center'
        }}>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            No sellers yet. Add your first seller to start the referral program!
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
                <Table.ColumnHeaderCell>Seller</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Commission</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Referral Codes</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Total Earned</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Pending</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sellers.map(seller => (
                <Table.Row key={seller._id}>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Flex align="center" gap="3">
                      <Avatar
                        size="2"
                        fallback={seller.name.slice(0, 2).toUpperCase()}
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                        }}
                      />
                      <Box>
                        <Text size="2" weight="medium">{seller.name}</Text>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          @{seller.telegram_username}
                        </Text>
                      </Box>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Badge size="2" color="purple">
                      {seller.commission_percentage}%
                    </Badge>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Flex direction="column" gap="2">
                      {seller.referral_codes?.map(code => (
                        <Badge key={code.code} size="1" variant="soft">
                          {code.code} ({code.uses} uses)
                        </Badge>
                      ))}
                      {(!seller.referral_codes || seller.referral_codes.length === 0) && (
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No codes</Text>
                      )}
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => openAssignModal(seller)}
                        style={{ marginTop: '8px' }}
                      >
                        <Link2Icon width="12" height="12" />
                        Assign Code
                      </Button>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                      ${seller.total_earnings || '0.00'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Text size="2" weight="bold" style={{ color: '#f59e0b' }}>
                      ${seller.pending_earnings || '0.00'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Badge color={seller.is_active ? 'green' : 'gray'}>
                      {seller.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle', padding: '16px' }}>
                    <Flex gap="2">
                      <IconButton
                        size="2"
                        variant="soft"
                        onClick={() => openEarningsModal(seller)}
                      >
                        <EyeOpenIcon width="16" height="16" />
                      </IconButton>
                      <IconButton
                        size="2"
                        variant="soft"
                        onClick={() => openEditModal(seller)}
                      >
                        <Pencil1Icon width="16" height="16" />
                      </IconButton>
                      <IconButton
                        size="2"
                        variant="soft"
                        color="red"
                        onClick={(e) => handleDelete(seller._id, seller.name, e)}
                        title="Click to deactivate | Shift+Click for permanent delete"
                      >
                        <TrashIcon width="16" height="16" />
                      </IconButton>
                      {parseFloat(seller.pending_earnings) > 0 && (
                        <IconButton
                          size="2"
                          variant="soft"
                          style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#10b981'
                          }}
                          onClick={() => handlePayout(seller._id, seller.pending_earnings)}
                        >
                          <CardStackIcon width="16" height="16" />
                        </IconButton>
                      )}
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card>
      )}

      {/* Top Sellers */}
      {stats?.top_sellers && stats.top_sellers.length > 0 && (
        <Card style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '24px',
          marginTop: '24px'
        }}>
          <Heading size="4" mb="4">🏆 Top Performing Sellers</Heading>
          <Flex direction="column" gap="3">
            {stats.top_sellers.map((seller, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '16px'
                }}>
                  <Flex align="center" justify="between">
                    <Flex align="center" gap="3">
                      <Box style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#8b5cf6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}>
                        {idx + 1}
                      </Box>
                      <Text size="3" weight="medium">{seller.name}</Text>
                    </Flex>
                    <Text size="4" weight="bold" style={{ color: '#10b981' }}>
                      ${seller.earnings}
                    </Text>
                  </Flex>
                </Card>
              </motion.div>
            ))}
          </Flex>
        </Card>
      )}

      {/* Modals */}
      <SellerFormModal
        seller={selectedSeller}
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedSeller(null);
        }}
        onSave={handleSave}
      />

      <EarningsModal
        sellerId={viewingSeller}
        isOpen={earningsModalOpen}
        onClose={() => {
          setEarningsModalOpen(false);
          setViewingSeller(null);
        }}
        onPayout={handlePayout}
      />

      <AssignCodeModal
        seller={assigningSeller}
        referralCodes={referralCodes}
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setAssigningSeller(null);
        }}
        onAssign={handleAssignCode}
      />
    </Box>
  );
};

export default Sellers;
