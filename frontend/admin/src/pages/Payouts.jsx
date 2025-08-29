// frontend/admin/src/pages/Payouts.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, Flex, Grid, Text, Card, Badge, Button, TextField,
    Table, IconButton, Heading, Dialog, Switch, Avatar,
    Separator, ScrollArea, Code, Progress, DropdownMenu,
    TextArea, Tabs, Select, AlertDialog
} from '@radix-ui/themes';
import {
    PersonIcon, PlusIcon, Pencil1Icon, TrashIcon, EyeOpenIcon,
    RocketIcon, ReloadIcon, CheckCircledIcon, CrossCircledIcon,
    CardStackIcon, TimerIcon, TokensIcon, ArrowUpIcon,
    ExclamationTriangleIcon, Share1Icon,
    BarChartIcon, ActivityLogIcon, TargetIcon
} from '@radix-ui/react-icons';
import { payoutsAPI } from '../services/api';

// Stats Cards Component
const StatsCard = ({ title, value, change, icon: Icon, color, prefix = '', suffix = '' }) => {
    const isMobile = window.innerWidth < 768;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -2 }}
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
                            {title}
                        </Text>
                        <Text size={isMobile ? '5' : '6'} weight="bold">
                            {prefix}{typeof value === 'number' ? value.toFixed(2) : value}{suffix}
                        </Text>
                        {change !== undefined && !isMobile && (
                            <Flex align="center" gap="1" mt="1">
                                <ArrowUpIcon width="14" height="14" style={{ color }} />
                                <Text size="1" style={{ color }}>
                                    {change}% vs last month
                                </Text>
                            </Flex>
                        )}
                    </Box>
                    <Box style={{
                        width: isMobile ? '32px' : '40px',
                        height: isMobile ? '32px' : '40px',
                        borderRadius: '10px',
                        background: `${color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color }} />
                    </Box>
                </Flex>
            </Card>
        </motion.div>
    );
};

// Partner Form Modal
const PartnerFormModal = ({ partner, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'partner',
        commission_percentage: 10,
        fixed_amount: 0,
        description: '',
        payment_method: 'USDT',
        payment_address: '',
        priority: 1,
        is_active: true
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (partner) {
            setFormData(partner);
        } else {
            setFormData({
                name: '',
                type: 'partner',
                commission_percentage: 10,
                fixed_amount: 0,
                description: '',
                payment_method: 'USDT',
                payment_address: '',
                priority: 1,
                is_active: true
            });
        }
        setErrors({});
    }, [partner, isOpen]);

    const validate = () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Name is required';

        if (formData.type === 'partner') {
            if (!formData.commission_percentage || formData.commission_percentage <= 0) {
                newErrors.commission_percentage = 'Commission must be greater than 0';
            }
            if (formData.commission_percentage > 100) {
                newErrors.commission_percentage = 'Commission cannot exceed 100%';
            }
        } else {
            if (!formData.fixed_amount || formData.fixed_amount <= 0) {
                newErrors.fixed_amount = 'Fixed amount must be greater than 0';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        await onSave(formData, partner?._id);
        setSaving(false);
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Content style={{ maxWidth: '600px', padding: '24px' }}>
                <Dialog.Title>
                    {partner ? 'Edit Payout Partner' : 'Add Payout Partner'}
                </Dialog.Title>
                <Dialog.Description>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {partner ? 'Update partner details and commission settings.' : 'Add a new partner who receives commission from your profits.'}
                    </Text>
                </Dialog.Description>

                <Box mt="5">
                    <Flex direction="column" gap="4">
                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Partner Type *
                            </Text>
                            <Select.Root value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                                <Select.Trigger style={{ width: '100%' }} />
                                <Select.Content>
                                    <Select.Item value="partner">Commission Partner (% of profit)</Select.Item>
                                    <Select.Item value="service">Service Provider (fixed amount)</Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </Box>

                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Name *
                            </Text>
                            <TextField.Root
                                size="3"
                                placeholder="e.g., Erik"
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

                        {formData.type === 'partner' ? (
                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Commission Percentage (%) *
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
                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                    This percentage will be calculated from the net profit after seller commissions
                                </Text>
                            </Box>
                        ) : (
                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Fixed Amount (USDT) *
                                </Text>
                                <TextField.Root
                                    size="3"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.fixed_amount}
                                    onChange={(e) => setFormData({...formData, fixed_amount: parseFloat(e.target.value) || 0})}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: errors.fixed_amount ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                />
                                {errors.fixed_amount && (
                                    <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                                        {errors.fixed_amount}
                                    </Text>
                                )}
                            </Box>
                        )}

                        <Grid columns="2" gap="4">
                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Priority Order
                                </Text>
                                <TextField.Root
                                    size="3"
                                    type="number"
                                    min="1"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 1})}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                />
                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                    Lower numbers are calculated first
                                </Text>
                            </Box>

                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Payment Method
                                </Text>
                                <TextField.Root
                                    size="3"
                                    placeholder="e.g., USDT"
                                    value={formData.payment_method}
                                    onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                />
                            </Box>
                        </Grid>

                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Payment Address
                            </Text>
                            <TextField.Root
                                size="3"
                                placeholder="Wallet address or account details"
                                value={formData.payment_address}
                                onChange={(e) => setFormData({...formData, payment_address: e.target.value})}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            />
                        </Box>

                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Description
                            </Text>
                            <TextArea
                                placeholder="e.g., Business partner - 10% of net profit"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                                        {formData.is_active ? 'Partner will receive payouts' : 'Partner is inactive'}
                                    </Text>
                                </Box>
                                <Switch
                                    size="3"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                                />
                            </Flex>
                        </Card>

                        <Flex gap="3" justify="end" mt="4">
                            <Dialog.Close>
                                <Button variant="soft" size="3">Cancel</Button>
                            </Dialog.Close>
                            <Button
                                size="3"
                                disabled={saving}
                                onClick={handleSubmit}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : (partner ? 'Update' : 'Create')} Partner
                            </Button>
                        </Flex>
                    </Flex>
                </Box>
            </Dialog.Content>
        </Dialog.Root>
    );
};

// Expense Form Modal
const ExpenseFormModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'shipping',
        amount: 0,
        description: '',
        due_date: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        if (!formData.name || formData.amount <= 0) {
            alert('Please fill in all required fields');
            return;
        }
        setSaving(true);

        // Clean up the data before sending
        const submitData = {
            ...formData,
            due_date: formData.due_date || null  // Convert empty string to null
        };

        await onSave(submitData);
        setSaving(false);
        setFormData({
            name: '',
            type: 'shipping',
            amount: 0,
            description: '',
            due_date: ''
        });
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Content style={{ maxWidth: '500px', padding: '24px' }}>
                <Dialog.Title>
                    Add Expense
                </Dialog.Title>
                <Dialog.Description>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Track shipping costs, fees, and other business expenses.
                    </Text>
                </Dialog.Description>

                <Box mt="5">
                    <Flex direction="column" gap="4">
                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Expense Name *
                            </Text>
                            <TextField.Root
                                size="3"
                                placeholder="e.g., DHL Shipping"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </Box>

                        <Grid columns="2" gap="4">
                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Type *
                                </Text>
                                <Select.Root value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                                    <Select.Trigger style={{ width: '100%' }} />
                                    <Select.Content>
                                        <Select.Item value="shipping">Shipping</Select.Item>
                                        <Select.Item value="fee">Fee</Select.Item>
                                        <Select.Item value="tax">Tax</Select.Item>
                                        <Select.Item value="other">Other</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </Box>

                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Amount (USDT) *
                                </Text>
                                <TextField.Root
                                    size="3"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                                />
                            </Box>
                        </Grid>

                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Due Date
                            </Text>
                            <TextField.Root
                                size="3"
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                            />
                        </Box>

                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Description
                            </Text>
                            <TextArea
                                placeholder="Additional details..."
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                style={{ minHeight: '80px' }}
                            />
                        </Box>

                        <Flex gap="3" justify="end" mt="4">
                            <Dialog.Close>
                                <Button variant="soft" size="3">Cancel</Button>
                            </Dialog.Close>
                            <Button
                                size="3"
                                disabled={saving}
                                onClick={handleSubmit}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                }}
                            >
                                {saving ? 'Adding...' : 'Add Expense'}
                            </Button>
                        </Flex>
                    </Flex>
                </Box>
            </Dialog.Content>
        </Dialog.Root>
    );
};

// Main Payouts Component
const Payouts = () => {
    const [partners, setPartners] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [calculations, setCalculations] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('partners');
    const isMobile = window.innerWidth < 768;

    const [partnerModalOpen, setPartnerModalOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [partnersRes, expensesRes, statsRes, calculationsRes] = await Promise.all([
                payoutsAPI.getPartners(),
                payoutsAPI.getExpenses(),
                payoutsAPI.getStats(),
                payoutsAPI.getCalculations()
            ]);

            setPartners(partnersRes.partners || []);
            setExpenses(expensesRes.expenses || []);
            setStats(statsRes || {});
            setCalculations(calculationsRes.calculations || []);
        } catch (error) {
            console.error('Error fetching payout data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleSavePartner = async (formData, partnerId) => {
        try {
            if (partnerId) {
                await payoutsAPI.updatePartner(partnerId, formData);
            } else {
                await payoutsAPI.createPartner(formData);
            }
            await fetchData();
        } catch (error) {
            console.error('Error saving partner:', error);
        }
    };

    const handleDeletePartner = async (partnerId, partnerName) => {
        if (confirm(`Are you sure you want to delete "${partnerName}"?`)) {
            try {
                await payoutsAPI.deletePartner(partnerId);
                await fetchData();
            } catch (error) {
                console.error('Error deleting partner:', error);
            }
        }
    };

    const handleSaveExpense = async (formData) => {
        try {
            await payoutsAPI.createExpense(formData);
            await fetchData();
        } catch (error) {
            console.error('Error saving expense:', error);
        }
    };

    const handlePayExpense = async (expenseId) => {
        try {
            await payoutsAPI.payExpense(expenseId);
            await fetchData();
        } catch (error) {
            console.error('Error paying expense:', error);
        }
    };

    const handleProcessPayout = async (partnerId, amount) => {
        const transactionId = prompt('Enter transaction ID (optional):');
        const notes = prompt('Add notes (optional):');

        try {
            await payoutsAPI.processPayout({
                partner_id: partnerId,
                amount,
                transaction_id: transactionId,
                notes
            });
            await fetchData();
            alert('✅ Payout processed successfully!');
        } catch (error) {
            console.error('Error processing payout:', error);
            alert('❌ Error processing payout');
        }
    };

    if (loading) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <CardStackIcon width="32" height="32" style={{ color: '#10b981' }} />
                </motion.div>
            </Flex>
        );
    }

    // Calculate total obligations
    const totalObligations = (stats.total_pending || 0) + (stats.pending_expenses || 0);
    const partnerTotals = calculations.reduce((acc, calc) => {
        calc.deductions.forEach(d => {
            if (d.type === 'partner_commission') {
                if (!acc[d.name]) acc[d.name] = 0;
                acc[d.name] += d.amount;
            }
        });
        return acc;
    }, {});

    return (
        <Box style={{ paddingBottom: isMobile ? '80px' : '0' }}>
            {/* Header */}
            <Flex
                align={isMobile ? 'start' : 'center'}
                justify="between"
                direction={isMobile ? 'column' : 'row'}
                gap={isMobile ? '3' : '0'}
                mb={isMobile ? '4' : '6'}
            >
                <Box>
                    <Heading size={isMobile ? '6' : '8'} weight="bold">
                        Payouts & Obligations
                    </Heading>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
                        Manage partner commissions, expenses, and financial obligations
                    </Text>
                </Box>

                <Flex gap={isMobile ? '2' : '3'}>
                    <Button
                        size={isMobile ? '2' : '3'}
                        onClick={() => {
                            setSelectedPartner(null);
                            setPartnerModalOpen(true);
                        }}
                        style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        }}
                    >
                        <PlusIcon width={isMobile ? '16' : '18'} height={isMobile ? '16' : '18'} />
                        Add Partner
                    </Button>
                    <Button
                        size={isMobile ? '2' : '3'}
                        variant="surface"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <motion.div
                            animate={refreshing ? { rotate: 360 } : {}}
                            transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
                        >
                            <ReloadIcon width={isMobile ? '16' : '18'} height={isMobile ? '16' : '18'} />
                        </motion.div>
                    </Button>
                </Flex>
            </Flex>

            {/* Warning Banner */}
            {totalObligations > 1000 && (
                <Card style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '16px',
                    marginBottom: '20px'
                }}>
                    <Flex align="center" gap="2">
                        <ExclamationTriangleIcon style={{ color: '#ef4444' }} />
                        <Text size="2" style={{ color: '#ef4444' }}>
                            High pending obligations: ${totalObligations.toFixed(2)} needs to be paid out
                        </Text>
                    </Flex>
                </Card>
            )}

            {/* Stats Grid */}
            <Grid
                columns={{
                    initial: '2',
                    xs: '2',
                    sm: '2',
                    md: '4',
                    lg: '4'
                }}
                gap={isMobile ? '2' : '4'}
                mb={isMobile ? '4' : '6'}
            >
                <StatsCard
                    title="Total Pending"
                    value={stats.total_pending || 0}
                    icon={TimerIcon}
                    color="#f59e0b"
                    prefix="$"
                />
                <StatsCard
                    title="Monthly Paid"
                    value={stats.monthly_paid || 0}
                    icon={CheckCircledIcon}
                    color="#10b981"
                    prefix="$"
                />
                <StatsCard
                    title="Pending Expenses"
                    value={stats.pending_expenses || 0}
                    icon={ExclamationTriangleIcon}
                    color="#ef4444"
                    prefix="$"
                />
                <StatsCard
                    title="Active Partners"
                    value={stats.active_partners || 0}
                    icon={PersonIcon}
                    color="#8b5cf6"
                />
            </Grid>

            {/* Tabs */}
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                <Tabs.List size={isMobile ? '1' : '2'} style={{ marginBottom: '20px' }}>
                    <Tabs.Trigger value="partners">Partners & Commissions</Tabs.Trigger>
                    <Tabs.Trigger value="expenses">Expenses</Tabs.Trigger>
                    <Tabs.Trigger value="calculations">Profit Calculations</Tabs.Trigger>
                </Tabs.List>

                {/* Partners Tab */}
                <Tabs.Content value="partners">
                    <Card style={{
                        background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: 0,
                        overflow: 'hidden'
                    }}>
                        {partners.length === 0 ? (
                            <Box style={{ padding: '60px', textAlign: 'center' }}>
                                <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    No payout partners yet. Add partners who receive commissions from your profits.
                                </Text>
                            </Box>
                        ) : (
                            <ScrollArea style={{ width: '100%' }}>
                                <Table.Root variant="surface">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeaderCell>Partner</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Commission/Amount</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Pending</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Total Paid</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Priority</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {partners.map(partner => (
                                            <Table.Row key={partner._id}>
                                                <Table.Cell style={{ padding: '16px' }}>
                                                    <Flex align="center" gap="3">
                                                        <Avatar
                                                            size="2"
                                                            fallback={partner.name.slice(0, 2).toUpperCase()}
                                                            style={{
                                                                background: partner.type === 'partner'
                                                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                                            }}
                                                        />
                                                        <Box>
                                                            <Text size="2" weight="medium">{partner.name}</Text>
                                                            {partner.description && (
                                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                                    {partner.description}
                                                                </Text>
                                                            )}
                                                        </Box>
                                                    </Flex>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Badge color={partner.type === 'partner' ? 'green' : 'orange'}>
                                                        {partner.type === 'partner' ? 'Commission' : 'Service'}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {partner.type === 'partner' ? (
                                                        <Badge size="2" color="purple">
                                                            {partner.commission_percentage}%
                                                        </Badge>
                                                    ) : (
                                                        <Text size="2" weight="bold">
                                                            ${partner.fixed_amount}
                                                        </Text>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Flex align="center" gap="2">
                                                        <Text size="2" weight="bold" style={{ color: '#f59e0b' }}>
                                                            ${partner.pending_amount?.toFixed(2) || '0.00'}
                                                        </Text>
                                                        {partner.pending_count > 0 && (
                                                            <Badge size="1" color="orange">
                                                                {partner.pending_count} items
                                                            </Badge>
                                                        )}
                                                    </Flex>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                                                        ${partner.total_paid?.toFixed(2) || '0.00'}
                                                    </Text>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Badge variant="soft">
                                                        #{partner.priority}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Flex gap="2">
                                                        <IconButton
                                                            size="2"
                                                            variant="soft"
                                                            onClick={() => {
                                                                setSelectedPartner(partner);
                                                                setPartnerModalOpen(true);
                                                            }}
                                                        >
                                                            <Pencil1Icon width="16" height="16" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="2"
                                                            variant="soft"
                                                            color="red"
                                                            onClick={() => handleDeletePartner(partner._id, partner.name)}
                                                        >
                                                            <TrashIcon width="16" height="16" />
                                                        </IconButton>
                                                        {partner.pending_amount > 0 && (
                                                            <IconButton
                                                                size="2"
                                                                variant="soft"
                                                                style={{
                                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                                    color: '#10b981'
                                                                }}
                                                                onClick={() => handleProcessPayout(partner._id, partner.pending_amount)}
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
                            </ScrollArea>
                        )}
                    </Card>
                </Tabs.Content>

                {/* Expenses Tab */}
                <Tabs.Content value="expenses">
                    <Flex justify="between" mb="4">
                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            Track shipping costs, fees, and other expenses
                        </Text>
                        <Button
                            size="2"
                            onClick={() => setExpenseModalOpen(true)}
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            }}
                        >
                            <PlusIcon width="16" height="16" />
                            Add Expense
                        </Button>
                    </Flex>

                    <Card style={{
                        background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: 0,
                        overflow: 'hidden'
                    }}>
                        {expenses.length === 0 ? (
                            <Box style={{ padding: '60px', textAlign: 'center' }}>
                                <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    No expenses recorded yet
                                </Text>
                            </Box>
                        ) : (
                            <ScrollArea style={{ width: '100%' }}>
                                <Table.Root variant="surface">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Due Date</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {expenses.map(expense => (
                                            <Table.Row key={expense._id}>
                                                <Table.Cell style={{ padding: '16px' }}>
                                                    <Box>
                                                        <Text size="2" weight="medium">{expense.name}</Text>
                                                        {expense.description && (
                                                            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                                {expense.description}
                                                            </Text>
                                                        )}
                                                    </Box>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Badge color={
                                                        expense.type === 'shipping' ? 'blue' :
                                                            expense.type === 'fee' ? 'purple' :
                                                                expense.type === 'tax' ? 'orange' : 'gray'
                                                    }>
                                                        {expense.type}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Text size="3" weight="bold">
                                                        ${expense.amount.toFixed(2)}
                                                    </Text>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {expense.due_date ? (
                                                        <Text size="2">
                                                            {new Date(expense.due_date).toLocaleDateString()}
                                                        </Text>
                                                    ) : (
                                                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                            —
                                                        </Text>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Badge color={expense.status === 'paid' ? 'green' : 'orange'}>
                                                        {expense.status}
                                                    </Badge>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    {expense.status === 'pending' && (
                                                        <Button
                                                            size="2"
                                                            variant="soft"
                                                            color="green"
                                                            onClick={() => handlePayExpense(expense._id)}
                                                        >
                                                            <CheckCircledIcon width="14" height="14" />
                                                            Mark Paid
                                                        </Button>
                                                    )}
                                                </Table.Cell>
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table.Root>
                            </ScrollArea>
                        )}
                    </Card>
                </Tabs.Content>

                {/* Calculations Tab */}
                <Tabs.Content value="calculations">
                    <Card style={{
                        background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '24px'
                    }}>
                        <Heading size="4" mb="4">
                            Profit Breakdown Calculator
                        </Heading>
                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '20px' }}>
                            Shows how profits are distributed after all commissions
                        </Text>

                        {/* Summary */}
                        <Grid columns={isMobile ? '1' : '3'} gap="4" mb="4">
                            <Card style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                padding: '16px'
                            }}>
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                    Total Orders Analyzed
                                </Text>
                                <Text size="5" weight="bold">
                                    {calculations.length}
                                </Text>
                            </Card>
                            <Card style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                padding: '16px'
                            }}>
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                    Total Gross Profit
                                </Text>
                                <Text size="5" weight="bold" style={{ color: '#10b981' }}>
                                    ${calculations.reduce((sum, c) => sum + c.base_profit, 0).toFixed(2)}
                                </Text>
                            </Card>
                            <Card style={{
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                padding: '16px'
                            }}>
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                    Total Net Profit
                                </Text>
                                <Text size="5" weight="bold" style={{ color: '#f59e0b' }}>
                                    ${calculations.reduce((sum, c) => sum + c.final_profit, 0).toFixed(2)}
                                </Text>
                            </Card>
                        </Grid>

                        {/* Partner Totals */}
                        {Object.keys(partnerTotals).length > 0 && (
                            <Card style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '16px',
                                marginBottom: '20px'
                            }}>
                                <Heading size="3" mb="3">Partner Commission Totals</Heading>
                                <Grid columns={isMobile ? '1' : '2'} gap="3">
                                    {Object.entries(partnerTotals).map(([name, total]) => (
                                        <Flex key={name} align="center" justify="between" style={{
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            borderRadius: '8px'
                                        }}>
                                            <Text size="2" weight="medium">{name}</Text>
                                            <Text size="3" weight="bold" style={{ color: '#10b981' }}>
                                                ${total.toFixed(2)}
                                            </Text>
                                        </Flex>
                                    ))}
                                </Grid>
                            </Card>
                        )}

                        {/* Recent Calculations */}
                        <Heading size="3" mb="3">Recent Order Calculations</Heading>
                        <ScrollArea style={{ maxHeight: '400px' }}>
                            <Flex direction="column" gap="3">
                                {calculations.slice(0, 10).map((calc, idx) => (
                                    <Card key={idx} style={{
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        padding: '16px'
                                    }}>
                                        <Flex align="center" justify="between" mb="3">
                                            <Text size="2" weight="medium">
                                                {calc.order_number}
                                            </Text>
                                            <Badge size="1" variant="soft">
                                                {new Date(calc.order_date).toLocaleDateString()}
                                            </Badge>
                                        </Flex>

                                        <Grid columns={isMobile ? '1' : '4'} gap="2" mb="3">
                                            <Box>
                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Order Total</Text>
                                                <Text size="2" weight="bold">${calc.total_usdt.toFixed(2)}</Text>
                                            </Box>
                                            <Box>
                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Base Profit</Text>
                                                <Text size="2" weight="bold" style={{ color: '#8b5cf6' }}>
                                                    ${calc.base_profit.toFixed(2)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Total Deductions</Text>
                                                <Text size="2" weight="bold" style={{ color: '#ef4444' }}>
                                                    -${calc.deductions.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Final Profit</Text>
                                                <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                                                    ${calc.final_profit.toFixed(2)}
                                                </Text>
                                            </Box>
                                        </Grid>

                                        {calc.deductions.length > 0 && (
                                            <Box>
                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>
                                                    Deductions:
                                                </Text>
                                                <Flex direction="column" gap="1">
                                                    {calc.deductions.map((deduction, dIdx) => (
                                                        <Flex key={dIdx} align="center" justify="between" style={{
                                                            padding: '6px 8px',
                                                            background: 'rgba(255, 255, 255, 0.02)',
                                                            borderRadius: '4px'
                                                        }}>
                                                            <Flex align="center" gap="2">
                                                                <Badge size="1" color={
                                                                    deduction.type === 'seller_commission' ? 'purple' :
                                                                        deduction.type === 'partner_commission' ? 'green' : 'orange'
                                                                }>
                                                                    {deduction.type === 'seller_commission' ? 'Seller' : 'Partner'}
                                                                </Badge>
                                                                <Text size="1">{deduction.name}</Text>
                                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                                    ({deduction.rate}%)
                                                                </Text>
                                                            </Flex>
                                                            <Text size="1" weight="medium" style={{ color: '#ef4444' }}>
                                                                -${deduction.amount.toFixed(2)}
                                                            </Text>
                                                        </Flex>
                                                    ))}
                                                </Flex>
                                            </Box>
                                        )}
                                    </Card>
                                ))}
                            </Flex>
                        </ScrollArea>
                    </Card>
                </Tabs.Content>
            </Tabs.Root>

            {/* Modals */}
            <PartnerFormModal
                partner={selectedPartner}
                isOpen={partnerModalOpen}
                onClose={() => {
                    setPartnerModalOpen(false);
                    setSelectedPartner(null);
                }}
                onSave={handleSavePartner}
            />

            <ExpenseFormModal
                isOpen={expenseModalOpen}
                onClose={() => setExpenseModalOpen(false)}
                onSave={handleSaveExpense}
            />
        </Box>
    );
};

export default Payouts;
