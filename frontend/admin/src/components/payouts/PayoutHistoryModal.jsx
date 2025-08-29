// frontend/admin/src/components/payouts/PayoutHistoryModal.jsx

import React, { useState, useEffect } from 'react';
import {
    Dialog, Box, Flex, Text, Card, Badge, ScrollArea,
    Tabs, Table, Heading, Button, IconButton, Grid
} from '@radix-ui/themes';
import {
    ClockIcon, CheckCircledIcon, CopyIcon, ExternalLinkIcon,
    FileTextIcon, CalendarIcon
} from '@radix-ui/react-icons';

const PayoutHistoryModal = ({ isOpen, onClose, partner, payoutsAPI }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, partner]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await payoutsAPI.getHistory(partner?._id);
            setHistory(response.transactions || []);
        } catch (error) {
            console.error('Error fetching history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'paid': return 'green';
            case 'pending': return 'orange';
            case 'failed': return 'red';
            default: return 'gray';
        }
    };

    const filteredHistory = activeTab === 'all' 
        ? history 
        : history.filter(h => h.status === activeTab);

    const totalPaid = history
        .filter(h => h.status === 'paid')
        .reduce((sum, h) => sum + h.amount, 0);

    const totalPending = history
        .filter(h => h.status === 'pending')
        .reduce((sum, h) => sum + h.amount, 0);

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Content style={{ maxWidth: '900px', maxHeight: '80vh', padding: '24px' }}>
                <Dialog.Title>
                    <Flex align="center" gap="3">
                        <ClockIcon width="24" height="24" style={{ color: '#8b5cf6' }} />
                        <Box>
                            <Heading size="5">Payment History</Heading>
                            {partner && (
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                    {partner.name}
                                </Text>
                            )}
                        </Box>
                    </Flex>
                </Dialog.Title>

                <Box mt="4">
                    {/* Summary Cards */}
                    <Grid columns="1" gap="3" mb="4">
                        <Card style={{
                            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            padding: '20px'
                        }}>
                            <Grid columns="3" gap="4">
                                <Box>
                                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '8px' }}>
                                        Total Paid
                                    </Text>
                                    <Text size="6" weight="bold" style={{ color: '#10b981' }}>
                                        ${totalPaid.toFixed(2)}
                                    </Text>
                                </Box>
                                <Box>
                                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '8px' }}>
                                        Pending
                                    </Text>
                                    <Text size="6" weight="bold" style={{ color: '#f59e0b' }}>
                                        ${totalPending.toFixed(2)}
                                    </Text>
                                </Box>
                                <Box>
                                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '8px' }}>
                                        Transactions
                                    </Text>
                                    <Text size="6" weight="bold" style={{ color: '#8b5cf6' }}>
                                        {history.length}
                                    </Text>
                                </Box>
                            </Grid>
                        </Card>
                    </Grid>

                    {/* Tabs */}
                    <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                        <Tabs.List size="2" style={{ marginBottom: '16px' }}>
                            <Tabs.Trigger value="all">
                                All ({history.length})
                            </Tabs.Trigger>
                            <Tabs.Trigger value="paid">
                                Paid ({history.filter(h => h.status === 'paid').length})
                            </Tabs.Trigger>
                            <Tabs.Trigger value="pending">
                                Pending ({history.filter(h => h.status === 'pending').length})
                            </Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content value={activeTab}>
                            {loading ? (
                                <Box style={{ padding: '40px', textAlign: 'center' }}>
                                    <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                        Loading history...
                                    </Text>
                                </Box>
                            ) : filteredHistory.length === 0 ? (
                                <Box style={{ padding: '40px', textAlign: 'center' }}>
                                    <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                        No transactions found
                                    </Text>
                                </Box>
                            ) : (
                                <ScrollArea style={{ maxHeight: '400px' }}>
                                    <Box style={{ display: 'flex', alignItems: 'center', minHeight: '400px' }}>
                                        <Table.Root variant="surface" style={{ width: '100%' }}>
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                                                    <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                                                    <Table.ColumnHeaderCell>Method</Table.ColumnHeaderCell>
                                                    <Table.ColumnHeaderCell>Transaction ID</Table.ColumnHeaderCell>
                                                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                                                    <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body>
                                            {filteredHistory.map((transaction) => (
                                                <Table.Row key={transaction._id}>
                                                    <Table.Cell>
                                                        <Flex align="center" gap="2">
                                                            <CalendarIcon width="14" height="14" />
                                                            <Box>
                                                                <Text size="2">
                                                                    {new Date(transaction.created_at || transaction.paid_at).toLocaleDateString()}
                                                                </Text>
                                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                                    {new Date(transaction.created_at || transaction.paid_at).toLocaleTimeString()}
                                                                </Text>
                                                            </Box>
                                                        </Flex>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Text size="3" weight="bold">
                                                            ${transaction.amount.toFixed(2)}
                                                        </Text>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge variant="soft">
                                                            {transaction.payment_method || 'USDT'}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        {transaction.transaction_id ? (
                                                            <Flex align="center" gap="2">
                                                                <Text size="2" style={{ 
                                                                    fontFamily: 'monospace',
                                                                    maxWidth: '150px',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis'
                                                                }}>
                                                                    {transaction.transaction_id}
                                                                </Text>
                                                                <IconButton
                                                                    size="1"
                                                                    variant="ghost"
                                                                    onClick={() => copyToClipboard(transaction.transaction_id)}
                                                                >
                                                                    <CopyIcon width="12" height="12" />
                                                                </IconButton>
                                                            </Flex>
                                                        ) : (
                                                            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                                —
                                                            </Text>
                                                        )}
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <Badge color={getStatusColor(transaction.status)}>
                                                            {transaction.status}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        {transaction.notes ? (
                                                            <Text size="2" style={{ 
                                                                maxWidth: '200px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {transaction.notes}
                                                            </Text>
                                                        ) : (
                                                            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                                —
                                                            </Text>
                                                        )}
                                                    </Table.Cell>
                                                </Table.Row>
                                            ))}
                                                                                    </Table.Body>
                                        </Table.Root>
                                    </Box>
                                </ScrollArea>
                            )}
                        </Tabs.Content>
                    </Tabs.Root>

                    {/* Actions */}
                    <Flex justify="end" mt="4">
                        <Dialog.Close>
                            <Button variant="soft" size="3">
                                Close
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Box>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default PayoutHistoryModal;
