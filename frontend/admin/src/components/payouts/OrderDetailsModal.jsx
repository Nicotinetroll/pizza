import React, { useState } from 'react';
import {
    Dialog, Box, Flex, Text, Button, Table, Badge, ScrollArea,
    Heading, IconButton, Separator, Card, Grid, VisuallyHidden
} from '@radix-ui/themes';
import {
    Cross2Icon, BarChartIcon, ArrowRightIcon
} from '@radix-ui/react-icons';

const OrderDetailsModal = ({ isOpen, onClose, calculation }) => {
    if (!calculation) return null;

    const originalPrice = calculation.total_usdt + (calculation.deductions.find(d => d.type === 'discount')?.amount || 0);
    const purchaseCost = originalPrice - calculation.base_profit;
    let runningTotal = calculation.base_profit;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Content style={{ maxWidth: '900px', maxHeight: '85vh', padding: '0' }}>
                <VisuallyHidden>
                    <Dialog.Title>Order Details</Dialog.Title>
                    <Dialog.Description>Detailed breakdown of order {calculation.order_number}</Dialog.Description>
                </VisuallyHidden>
                
                <Box style={{
                    background: 'linear-gradient(135deg, #1a1a20 0%, #2a2a35 100%)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}>
                    <Flex align="center" justify="between" style={{
                        padding: '24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <Flex align="center" gap="3">
                            <BarChartIcon width="24" height="24" style={{ color: '#8b5cf6' }} />
                            <Box>
                                <Heading size="5" style={{ color: '#fff' }}>
                                    Order Details: {calculation.order_number}
                                </Heading>
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                                    {new Date(calculation.order_date).toLocaleString()}
                                </Text>
                            </Box>
                        </Flex>
                        <IconButton
                            size="2"
                            variant="ghost"
                            onClick={onClose}
                            style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                        >
                            <Cross2Icon width="18" height="18" />
                        </IconButton>
                    </Flex>

                    <Box style={{ padding: '24px' }}>
                        <Grid columns="4" gap="4" style={{ marginBottom: '24px' }}>
                            <Card style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                padding: '16px'
                            }}>
                                <Text size="1" style={{ 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    display: 'block',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Customer Paid
                                </Text>
                                <Text size="6" weight="bold" style={{ color: '#fff' }}>
                                    ${calculation.total_usdt.toFixed(2)}
                                </Text>
                            </Card>

                            <Card style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                padding: '16px'
                            }}>
                                <Text size="1" style={{ 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    display: 'block',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Base Profit
                                </Text>
                                <Text size="6" weight="bold" style={{ color: '#3b82f6' }}>
                                    ${calculation.base_profit.toFixed(2)}
                                </Text>
                            </Card>

                            <Card style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '16px'
                            }}>
                                <Text size="1" style={{ 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    display: 'block',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Total Deductions
                                </Text>
                                <Text size="6" weight="bold" style={{ color: '#ef4444' }}>
                                    -${calculation.deductions.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}
                                </Text>
                            </Card>

                            <Card style={{
                                background: calculation.final_profit >= 0 
                                    ? 'rgba(16, 185, 129, 0.1)' 
                                    : 'rgba(239, 68, 68, 0.1)',
                                border: calculation.final_profit >= 0
                                    ? '1px solid rgba(16, 185, 129, 0.2)'
                                    : '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '16px'
                            }}>
                                <Text size="1" style={{ 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    display: 'block',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    Final Profit
                                </Text>
                                <Text size="6" weight="bold" style={{ 
                                    color: calculation.final_profit >= 0 ? '#10b981' : '#ef4444' 
                                }}>
                                    ${calculation.final_profit.toFixed(2)}
                                </Text>
                            </Card>
                        </Grid>

                        <Card style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '0',
                            overflow: 'hidden'
                        }}>
                            <Box style={{
                                padding: '16px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(139, 92, 246, 0.05)'
                            }}>
                                <Text size="3" weight="bold">
                                    Calculation Breakdown
                                </Text>
                            </Box>
                            
                            <ScrollArea style={{ maxHeight: '400px' }}>
                                <Table.Root variant="surface">
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell>Calculation</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell align="right">Amount</Table.ColumnHeaderCell>
                                            <Table.ColumnHeaderCell align="right">Running Total</Table.ColumnHeaderCell>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        <Table.Row>
                                            <Table.Cell>
                                                <Flex align="center" gap="2">
                                                    <Badge color="gray">Revenue</Badge>
                                                    <Text weight="medium">Original Price</Text>
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Text size="2" style={{ fontFamily: 'monospace' }}>
                                                    Before discount
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell align="right">
                                                <Text size="3" weight="bold">
                                                    ${originalPrice.toFixed(2)}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell align="right">
                                                <Text size="3" weight="bold">
                                                    ${originalPrice.toFixed(2)}
                                                </Text>
                                            </Table.Cell>
                                        </Table.Row>

                                        <Table.Row>
                                            <Table.Cell>
                                                <Flex align="center" gap="2">
                                                    <Badge color="blue">Cost</Badge>
                                                    <Text weight="medium">Purchase Cost</Text>
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Text size="2" style={{ fontFamily: 'monospace' }}>
                                                    Cost of goods
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell align="right">
                                                <Text size="3" weight="bold" style={{ color: '#ef4444' }}>
                                                    -${purchaseCost.toFixed(2)}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell align="right">
                                                <Text size="3" weight="bold">
                                                    ${calculation.base_profit.toFixed(2)}
                                                </Text>
                                            </Table.Cell>
                                        </Table.Row>

                                        <Table.Row style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                                            <Table.Cell>
                                                <Flex align="center" gap="2">
                                                    <Badge color="green">Profit</Badge>
                                                    <Text weight="bold">Base Profit</Text>
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Text size="2" style={{ fontFamily: 'monospace' }}>
                                                    ${originalPrice.toFixed(2)} - ${purchaseCost.toFixed(2)}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell align="right">
                                                <Text size="3" weight="bold" style={{ color: '#10b981' }}>
                                                    ${calculation.base_profit.toFixed(2)}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell align="right">
                                                <Text size="3" weight="bold" style={{ color: '#10b981' }}>
                                                    ${calculation.base_profit.toFixed(2)}
                                                </Text>
                                            </Table.Cell>
                                        </Table.Row>

                                        {calculation.deductions.length > 0 && (
                                            <>
                                                <Table.Row>
                                                    <Table.Cell colSpan={4}>
                                                        <Separator size="4" style={{ margin: '8px 0' }} />
                                                        <Text size="2" weight="bold" style={{ 
                                                            color: 'rgba(255, 255, 255, 0.7)',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            Deductions
                                                        </Text>
                                                    </Table.Cell>
                                                </Table.Row>

                                                {calculation.deductions.map((deduction, idx) => {
                                                    runningTotal -= deduction.amount;
                                                    return (
                                                        <Table.Row key={idx}>
                                                            <Table.Cell>
                                                                <Flex align="center" gap="2">
                                                                    <Badge color={
                                                                        deduction.type === 'expense' ? 'red' :
                                                                        deduction.type === 'discount' ? 'orange' :
                                                                        deduction.type === 'seller_commission' ? 'purple' : 'green'
                                                                    }>
                                                                        {deduction.type === 'expense' ? 'Expense' :
                                                                         deduction.type === 'discount' ? 'Discount' :
                                                                         deduction.type === 'seller_commission' ? 'Seller' :
                                                                         deduction.type === 'partner_commission' ? 'Partner' : 'Other'}
                                                                    </Badge>
                                                                    <Text weight="medium">{deduction.name}</Text>
                                                                </Flex>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <Text size="2" style={{ fontFamily: 'monospace' }}>
                                                                    {deduction.type === 'expense' ? 'Fixed per order' :
                                                                     deduction.rate > 0 ? `${deduction.rate}% of profit` : 'Fixed amount'}
                                                                </Text>
                                                            </Table.Cell>
                                                            <Table.Cell align="right">
                                                                <Text size="3" weight="bold" style={{ 
                                                                    color: deduction.type === 'expense' ? '#ef4444' :
                                                                           deduction.type === 'discount' ? '#f59e0b' :
                                                                           deduction.type === 'seller_commission' ? '#8b5cf6' : '#10b981'
                                                                }}>
                                                                    -${deduction.amount.toFixed(2)}
                                                                </Text>
                                                            </Table.Cell>
                                                            <Table.Cell align="right">
                                                                <Text size="3" weight="bold">
                                                                    ${runningTotal.toFixed(2)}
                                                                </Text>
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </Table.Body>
                                </Table.Root>
                            </ScrollArea>
                        </Card>

                        <Card style={{
                            background: 'rgba(139, 92, 246, 0.05)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            padding: '16px',
                            marginTop: '16px'
                        }}>
                            <Flex align="center" justify="between">
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Profit Margin: {((calculation.final_profit / calculation.total_usdt) * 100).toFixed(1)}%
                                </Text>
                                <Text size="3" weight="bold">
                                    Customer Paid: ${calculation.total_usdt.toFixed(2)} 
                                    <ArrowRightIcon style={{ display: 'inline', margin: '0 8px' }} />
                                    Your Profit: ${calculation.final_profit.toFixed(2)}
                                </Text>
                            </Flex>
                        </Card>
                    </Box>
                </Box>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default OrderDetailsModal;
