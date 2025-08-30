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
    ExclamationTriangleIcon, Share1Icon, DotsHorizontalIcon,
    BarChartIcon, ActivityLogIcon, TargetIcon, CopyIcon,
    DownloadIcon, FileTextIcon, ClockIcon
} from '@radix-ui/react-icons';
import { payoutsAPI } from '../services/api';
import PayoutProcess from './PayoutProcess';
import PartnerFormModal from '../components/payouts/PartnerFormModal';
import ExpenseFormModal from '../components/payouts/ExpenseFormModal';
import PayoutHistoryModal from '../components/payouts/PayoutHistoryModal';
import CalcTable from '../components/payouts/CalcTable';

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
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [payoutProcessOpen, setPayoutProcessOpen] = useState(false);
    const [selectedPayoutPartner, setSelectedPayoutPartner] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedHistoryPartner, setSelectedHistoryPartner] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [partnersRes, expensesRes, statsRes, calculationsRes, historyRes] = await Promise.all([
                payoutsAPI.getPartners(),
                payoutsAPI.getExpenses(),
                payoutsAPI.getStats(),
                payoutsAPI.getCalculations(),
                payoutsAPI.getHistory()
            ]);

            const partnerPending = {};
            if (calculationsRes.calculations) {
                calculationsRes.calculations.forEach(calc => {
                    calc.deductions.forEach(d => {
                        if (d.type === 'partner_commission') {
                            const partner = partnersRes.partners?.find(p => p.name === d.name);
                            if (partner) {
                                const partnerId = partner._id;
                                if (!partnerPending[partnerId]) {
                                    partnerPending[partnerId] = {
                                        amount: 0,
                                        count: 0
                                    };
                                }
                                partnerPending[partnerId].amount += d.amount;
                                partnerPending[partnerId].count += 1;
                            }
                        }
                    });
                });
            }

            const partnerPaid = {};
            if (historyRes.transactions) {
                historyRes.transactions.forEach(transaction => {
                    if (transaction.status === 'paid' && transaction.partner_id) {
                        if (!partnerPaid[transaction.partner_id]) {
                            partnerPaid[transaction.partner_id] = 0;
                        }
                        partnerPaid[transaction.partner_id] += transaction.amount;
                    }
                });
            }

            const updatedPartners = (partnersRes.partners || []).map(partner => {
                const totalOwed = partnerPending[partner._id]?.amount || 0;
                const totalPaid = partnerPaid[partner._id] || 0;
                const pendingAmount = Math.max(0, totalOwed - totalPaid);
                
                return {
                    ...partner,
                    pending_amount: pendingAmount,
                    pending_count: partnerPending[partner._id]?.count || 0,
                    total_paid: totalPaid
                };
            });

            setPartners(updatedPartners);
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
        if (confirm(`Are you sure you want to delete "${partnerName}"? This will also delete all payment history for this partner.`)) {
            try {
                await payoutsAPI.deletePartner(partnerId, true);
                await fetchData();
            } catch (error) {
                console.error('Error deleting partner:', error);
            }
        }
    };

    const handleSaveExpense = async (formData, expenseId) => {
        try {
            if (expenseId) {
                await payoutsAPI.updateExpense(expenseId, formData);
            } else {
                await payoutsAPI.createExpense(formData);
            }
            await fetchData();
        } catch (error) {
            console.error('Error saving expense:', error);
        }
    };

    const handleDeleteExpense = async (expenseId, expenseName) => {
        if (confirm(`Are you sure you want to delete "${expenseName}"?`)) {
            try {
                await payoutsAPI.deleteExpense(expenseId);
                await fetchData();
            } catch (error) {
                console.error('Error deleting expense:', error);
            }
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

    const handleStartPayout = (partner) => {
        setSelectedPayoutPartner(partner);
        setPayoutProcessOpen(true);
    };

    const handleProcessPayout = async (payoutData) => {
        try {
            await payoutsAPI.processPayout(payoutData);
            await fetchData();
            setPayoutProcessOpen(false);
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

    const totalPending = partners.reduce((sum, p) => sum + (p.pending_amount || 0), 0);
    const totalObligations = totalPending + (stats.pending_expenses || 0);

    const getPartnerColor = (index) => {
        const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
        return colors[index % colors.length];
    };

    return (
        <Box style={{ paddingBottom: isMobile ? '80px' : '0' }}>
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
                        Manage partner commissions and profit distribution
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

            {totalObligations > 100 && (
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
                    value={totalPending}
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

            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                <Tabs.List size={isMobile ? '1' : '2'} style={{ marginBottom: '20px' }}>
                    <Tabs.Trigger value="partners">Partners & Commissions</Tabs.Trigger>
                    <Tabs.Trigger value="expenses">Expenses</Tabs.Trigger>
                    <Tabs.Trigger value="calculations">Profit Calculations</Tabs.Trigger>
                </Tabs.List>

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
                                        {partners.map((partner, index) => (
                                            <Table.Row key={partner._id}>
                                                <Table.Cell style={{ padding: '16px' }}>
                                                    <Flex align="center" gap="3">
                                                        <Avatar
                                                            size="2"
                                                            fallback={partner.name.slice(0, 2).toUpperCase()}
                                                            style={{
                                                                background: `linear-gradient(135deg, ${getPartnerColor(index)} 0%, ${getPartnerColor(index)}CC 100%)`,
                                                                color: '#fff',
                                                                fontWeight: 'bold'
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
                                                        <Text size="3" weight="bold">
                                                            {expense.percentage && expense.percentage > 0 ? (
                                                                <>{expense.percentage}%</>
                                                            ) : (
                                                                <>${expense.amount.toFixed(2)}</>
                                                            )}
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
                                                                {partner.pending_count} orders
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
                                                        <IconButton
                                                            size="2"
                                                            variant="soft"
                                                            color="blue"
                                                            onClick={() => {
                                                                setSelectedHistoryPartner(partner);
                                                                setHistoryModalOpen(true);
                                                            }}
                                                        >
                                                            <ClockIcon width="16" height="16" />
                                                        </IconButton>
                                                        {partner.pending_amount > 0 && (
                                                            <Button
                                                                size="2"
                                                                variant="soft"
                                                                style={{
                                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                                    color: '#10b981'
                                                                }}
                                                                onClick={() => handleStartPayout(partner)}
                                                            >
                                                                <CardStackIcon width="14" height="14" />
                                                                Pay
                                                            </Button>
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

                <Tabs.Content value="expenses">
                    <Card style={{
                        background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '24px'
                    }}>
                        <Flex justify="between" mb="4">
                            <Box>
                                <Heading size="4">Business Expenses</Heading>
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                                    Track shipping costs, fees, and other expenses
                                </Text>
                            </Box>
                            <Button
                                size="3"
                                onClick={() => {
                                    setSelectedExpense(null);
                                    setExpenseModalOpen(true);
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                }}
                            >
                                <PlusIcon width="16" height="16" />
                                Add Expense
                            </Button>
                        </Flex>

                        {expenses.length === 0 ? (
                            <Box style={{ padding: '40px', textAlign: 'center' }}>
                                <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    No expenses recorded yet. Start tracking your business expenses.
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
                                                        <Flex align="center" gap="2" style={{ marginBottom: expense.description ? '4px' : '0' }}>
                                                            <Text size="2" weight="medium">{expense.name}</Text>
                                                            {expense.apply_per_order && (
                                                                <Badge size="1" color="purple" variant="soft">
                                                                    Recurring per order
                                                                </Badge>
                                                            )}
                                                        </Flex>
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
                                                        {expense.percentage && expense.percentage > 0 ? (
                                                            <>{expense.percentage}%</>
                                                        ) : (
                                                            <>${expense.amount.toFixed(2)}</>
                                                        )}
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
                                                    {expense.apply_per_order ? (
                                                        <Badge color="purple">
                                                            Per Order
                                                        </Badge>
                                                    ) : (
                                                        <Badge color={expense.status === 'paid' ? 'green' : 'orange'}>
                                                            {expense.status}
                                                        </Badge>
                                                    )}
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <Flex gap="2">
                                                        <IconButton
                                                            size="2"
                                                            variant="soft"
                                                            onClick={() => {
                                                                setSelectedExpense(expense);
                                                                setExpenseModalOpen(true);
                                                            }}
                                                        >
                                                            <Pencil1Icon width="16" height="16" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="2"
                                                            variant="soft"
                                                            color="red"
                                                            onClick={() => handleDeleteExpense(expense._id, expense.name)}
                                                        >
                                                            <TrashIcon width="16" height="16" />
                                                        </IconButton>
                                                        {!expense.apply_per_order && expense.status === 'pending' && (
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
                            Detailed calculation of profits and commissions
                        </Text>

                        <Grid columns={isMobile ? '1' : '3'} gap="4" mb="5">
                            <Card style={{
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                padding: '20px'
                            }}>
                                <Text size="2" style={{ 
                                    color: 'rgba(255, 255, 255, 0.7)', 
                                    marginBottom: '12px',
                                    display: 'block',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontSize: '11px'
                                }}>
                                    Total Orders Analyzed
                                </Text>
                                <Text size="7" weight="bold" style={{ color: '#fff' }}>
                                    {calculations.length}
                                </Text>
                            </Card>
                            <Card style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '20px'
                            }}>
                                <Text size="2" style={{ 
                                    color: 'rgba(255, 255, 255, 0.7)', 
                                    marginBottom: '12px',
                                    display: 'block',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontSize: '11px'
                                }}>
                                    Total Gross Profit
                                </Text>
                                <Text size="7" weight="bold" style={{ color: '#10b981' }}>
                                    ${calculations.reduce((sum, c) => sum + c.base_profit, 0).toFixed(2)}
                                </Text>
                            </Card>
                            <Card style={{
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '20px'
                            }}>
                                <Text size="2" style={{ 
                                    color: 'rgba(255, 255, 255, 0.7)', 
                                    marginBottom: '12px',
                                    display: 'block',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    fontSize: '11px'
                                }}>
                                    Total Net Profit
                                </Text>
                                <Text size="7" weight="bold" style={{ color: '#f59e0b' }}>
                                    ${calculations.reduce((sum, c) => sum + c.final_profit, 0).toFixed(2)}
                                </Text>
                            </Card>
                        </Grid>

                        {calculations.length === 0 ? (
                            <Box style={{ padding: '60px', textAlign: 'center' }}>
                                <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    No calculations yet. Complete some orders to see profit breakdown.
                                </Text>
                            </Box>
                        ) : (
                            <CalcTable calculations={calculations} />
                        )}
                    </Card>
                </Tabs.Content>
            </Tabs.Root>

            {partnerModalOpen && (
                <PartnerFormModal
                    partner={selectedPartner}
                    isOpen={partnerModalOpen}
                    onClose={() => {
                        setPartnerModalOpen(false);
                        setSelectedPartner(null);
                    }}
                    onSave={handleSavePartner}
                />
            )}

            {expenseModalOpen && (
                <ExpenseFormModal
                    expense={selectedExpense}
                    isOpen={expenseModalOpen}
                    onClose={() => {
                        setExpenseModalOpen(false);
                        setSelectedExpense(null);
                    }}
                    onSave={handleSaveExpense}
                />
            )}

            {payoutProcessOpen && selectedPayoutPartner && (
                <PayoutProcess
                    isOpen={payoutProcessOpen}
                    partner={selectedPayoutPartner}
                    onClose={() => {
                        setPayoutProcessOpen(false);
                        setSelectedPayoutPartner(null);
                    }}
                    onProcess={handleProcessPayout}
                />
            )}

            {historyModalOpen && (
                <PayoutHistoryModal
                    isOpen={historyModalOpen}
                    partner={selectedHistoryPartner}
                    onClose={() => {
                        setHistoryModalOpen(false);
                        setSelectedHistoryPartner(null);
                    }}
                    payoutsAPI={payoutsAPI}
                />
            )}
        </Box>
    );
};

export default Payouts;
