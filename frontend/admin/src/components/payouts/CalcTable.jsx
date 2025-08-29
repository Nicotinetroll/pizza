// frontend/admin/src/components/payouts/CalcTable.jsx

import React, { useState } from 'react';
import {
    Box, Flex, Text, Card, Badge, Button, Table, IconButton
} from '@radix-ui/themes';
import {
    EyeOpenIcon, ChevronLeftIcon, ChevronRightIcon, DoubleArrowLeftIcon, DoubleArrowRightIcon
} from '@radix-ui/react-icons';
import OrderDetailsModal from './OrderDetailsModal';

const CalcTable = ({ calculations }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCalc, setSelectedCalc] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    
    const itemsPerPage = 15;
    const totalPages = Math.ceil(calculations.length / itemsPerPage);
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = calculations.slice(startIndex, endIndex);

    const handleViewDetails = (calc) => {
        setSelectedCalc(calc);
        setDetailsModalOpen(true);
    };

    return (
        <>
            <Card style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: 0,
                overflow: 'hidden'
            }}>
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Order</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell align="right">Customer Paid</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell align="right">Base Profit</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell align="right">Deductions</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell align="right">Final Profit</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell align="center">Margin</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell align="center">Actions</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {currentItems.map((calc, idx) => {
                            const totalDeductions = calc.deductions.reduce((sum, d) => sum + d.amount, 0);
                            const profitMargin = (calc.final_profit / calc.total_usdt) * 100;
                            
                            return (
                                <Table.Row key={idx}>
                                    <Table.Cell>
                                        <Flex align="center" style={{ minHeight: '40px' }}>
                                            <Text size="2" weight="bold">
                                                {calc.order_number}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <Flex align="center" style={{ minHeight: '40px' }}>
                                            <Text size="2">
                                                {new Date(calc.order_date).toLocaleDateString()}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell align="right">
                                        <Flex align="center" justify="end" style={{ minHeight: '40px' }}>
                                            <Text size="3" weight="bold">
                                                ${calc.total_usdt.toFixed(2)}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell align="right">
                                        <Flex align="center" justify="end" style={{ minHeight: '40px' }}>
                                            <Text size="3" weight="bold" style={{ color: '#3b82f6' }}>
                                                ${calc.base_profit.toFixed(2)}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell align="right">
                                        <Flex align="center" justify="end" gap="2" style={{ minHeight: '40px' }}>
                                            <Text size="3" weight="bold" style={{ color: '#ef4444' }}>
                                                -${totalDeductions.toFixed(2)}
                                            </Text>
                                            {calc.deductions.length > 0 && (
                                                <Badge size="1" color="gray">
                                                    {calc.deductions.length}
                                                </Badge>
                                            )}
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell align="right">
                                        <Flex align="center" justify="end" style={{ minHeight: '40px' }}>
                                            <Text 
                                                size="3" 
                                                weight="bold" 
                                                style={{ 
                                                    color: calc.final_profit >= 0 ? '#10b981' : '#ef4444' 
                                                }}
                                            >
                                                ${calc.final_profit.toFixed(2)}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell align="center">
                                        <Flex align="center" justify="center" style={{ minHeight: '40px' }}>
                                            <Badge 
                                                color={profitMargin >= 50 ? 'green' : profitMargin >= 20 ? 'orange' : 'red'}
                                                variant="soft"
                                            >
                                                {profitMargin.toFixed(1)}%
                                            </Badge>
                                        </Flex>
                                    </Table.Cell>
                                    <Table.Cell align="center">
                                        <Flex align="center" justify="center" style={{ minHeight: '40px' }}>
                                            <IconButton
                                                size="2"
                                                variant="soft"
                                                onClick={() => handleViewDetails(calc)}
                                            >
                                                <EyeOpenIcon width="16" height="16" />
                                            </IconButton>
                                        </Flex>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table.Root>

                {/* Pagination */}
                {totalPages > 1 && (
                    <Flex 
                        align="center" 
                        justify="between" 
                        style={{
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.02)'
                        }}
                    >
                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            Showing {startIndex + 1}-{Math.min(endIndex, calculations.length)} of {calculations.length} orders
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
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
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
                                    
                                    if (pageNum < 1 || pageNum > totalPages) return null;
                                    
                                    return (
                                        <Button
                                            key={pageNum}
                                            size="2"
                                            variant={currentPage === pageNum ? "solid" : "soft"}
                                            onClick={() => setCurrentPage(pageNum)}
                                            style={{
                                                minWidth: '36px',
                                                background: currentPage === pageNum 
                                                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
                                                    : undefined
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
                )}
            </Card>

            <OrderDetailsModal 
                isOpen={detailsModalOpen}
                onClose={() => {
                    setDetailsModalOpen(false);
                    setSelectedCalc(null);
                }}
                calculation={selectedCalc}
            />
        </>
    );
};

export default CalcTable;
