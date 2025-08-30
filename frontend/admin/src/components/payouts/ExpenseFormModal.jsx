import React, { useState, useEffect } from 'react';
import {
    Dialog, Box, Flex, Text, Button, TextField, TextArea,
    Select, Grid, Card, Badge, Switch, RadioGroup, Radio
} from '@radix-ui/themes';
import {
    FileTextIcon, PlusIcon, CheckIcon, CrossCircledIcon,
    CalendarIcon, ExclamationTriangleIcon
} from '@radix-ui/react-icons';

const ExpenseFormModal = ({ expense, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'shipping',
        amount: 0,
        percentage: 0,
        amount_type: 'fixed',
        description: '',
        due_date: '',
        order_id: '',
        status: 'pending',
        apply_per_order: false
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (expense) {
            setFormData({
                ...expense,
                due_date: expense.due_date ? new Date(expense.due_date).toISOString().split('T')[0] : '',
                order_id: expense.order_id || '',
                apply_per_order: expense.apply_per_order || false,
                amount_type: expense.percentage ? 'percentage' : 'fixed',
                percentage: expense.percentage || 0
            });
        } else {
            setFormData({
                name: '',
                type: 'shipping',
                amount: 0,
                percentage: 0,
                amount_type: 'fixed',
                description: '',
                due_date: '',
                order_id: '',
                status: 'pending',
                apply_per_order: false
            });
        }
        setErrors({});
    }, [expense, isOpen]);

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Expense name is required';
        
        if (formData.apply_per_order && formData.amount_type === 'percentage') {
            if (!formData.percentage || formData.percentage <= 0 || formData.percentage > 100) {
                newErrors.percentage = 'Percentage must be between 0 and 100';
            }
        } else {
            if (!formData.amount || formData.amount <= 0) {
                newErrors.amount = 'Amount must be greater than 0';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        
        setSaving(true);
        
        const submitData = {
            ...formData,
            due_date: formData.due_date || null,
            order_id: formData.order_id || null
        };
        
        if (formData.apply_per_order && formData.amount_type === 'percentage') {
            submitData.amount = 0;
            submitData.percentage = formData.percentage;
        } else {
            submitData.percentage = 0;
        }
        
        await onSave(submitData, expense?._id);
        setSaving(false);
        onClose();
    };

    const getTypeColor = (type) => {
        switch(type) {
            case 'shipping': return 'blue';
            case 'fee': return 'purple';
            case 'tax': return 'orange';
            case 'marketing': return 'green';
            case 'supplies': return 'cyan';
            default: return 'gray';
        }
    };

    const getTypeIcon = (type) => {
        switch(type) {
            case 'shipping': return '📦';
            case 'fee': return '💳';
            case 'tax': return '📋';
            case 'marketing': return '📢';
            case 'supplies': return '🛠️';
            default: return '💰';
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Content style={{ maxWidth: '550px', padding: '24px' }}>
                <Dialog.Title>
                    <Flex align="center" gap="2">
                        <FileTextIcon width="20" height="20" style={{ color: '#f59e0b' }} />
                        {expense ? 'Edit Expense' : 'Add Business Expense'}
                    </Flex>
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
                                placeholder="e.g., DHL Express Shipping"
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

                        <Grid columns="2" gap="4">
                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Type *
                                </Text>
                                <Select.Root value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                                    <Select.Trigger style={{ width: '100%' }}>
                                        <Flex align="center" gap="2">
                                            <Text size="2">{getTypeIcon(formData.type)}</Text>
                                            <Badge color={getTypeColor(formData.type)} size="1">
                                                {formData.type}
                                            </Badge>
                                        </Flex>
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Item value="shipping">
                                            <Flex align="center" gap="2">
                                                <Text>📦</Text>
                                                <Text>Shipping</Text>
                                            </Flex>
                                        </Select.Item>
                                        <Select.Item value="fee">
                                            <Flex align="center" gap="2">
                                                <Text>💳</Text>
                                                <Text>Platform Fee</Text>
                                            </Flex>
                                        </Select.Item>
                                        <Select.Item value="tax">
                                            <Flex align="center" gap="2">
                                                <Text>📋</Text>
                                                <Text>Tax</Text>
                                            </Flex>
                                        </Select.Item>
                                        <Select.Item value="marketing">
                                            <Flex align="center" gap="2">
                                                <Text>📢</Text>
                                                <Text>Marketing</Text>
                                            </Flex>
                                        </Select.Item>
                                        <Select.Item value="supplies">
                                            <Flex align="center" gap="2">
                                                <Text>🛠️</Text>
                                                <Text>Supplies</Text>
                                            </Flex>
                                        </Select.Item>
                                        <Select.Item value="other">
                                            <Flex align="center" gap="2">
                                                <Text>💰</Text>
                                                <Text>Other</Text>
                                            </Flex>
                                        </Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </Box>

                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    {formData.apply_per_order && formData.amount_type === 'percentage' ? 'Percentage (%)' : 'Amount (USDT)'} *
                                </Text>
                                {formData.apply_per_order && formData.amount_type === 'percentage' ? (
                                    <TextField.Root
                                        size="3"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        placeholder="0.0"
                                        value={formData.percentage}
                                        onChange={(e) => setFormData({...formData, percentage: parseFloat(e.target.value) || 0})}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: errors.percentage ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    />
                                ) : (
                                    <TextField.Root
                                        size="3"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: errors.amount ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    />
                                )}
                                {errors.amount && (
                                    <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                                        {errors.amount}
                                    </Text>
                                )}
                                {errors.percentage && (
                                    <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                                        {errors.percentage}
                                    </Text>
                                )}
                            </Box>
                        </Grid>

                        <Card style={{
                            background: 'rgba(245, 158, 11, 0.05)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            padding: '20px'
                        }}>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '16px' }}>
                                Expense Options
                            </Text>
                            <Flex direction="column" gap="4">
                                <Flex align="center" justify="between">
                                    <Box style={{ maxWidth: '70%' }}>
                                        <Text size="2">Apply per Order</Text>
                                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', display: 'block' }}>
                                            Automatically deduct from each order
                                        </Text>
                                    </Box>
                                    <Switch
                                        size="2"
                                        checked={formData.apply_per_order}
                                        onCheckedChange={(checked) => setFormData({...formData, apply_per_order: checked})}
                                    />
                                </Flex>
                                
                                {formData.apply_per_order && (
                                    <>
                                        <Box style={{ marginTop: '12px' }}>
                                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '12px' }}>
                                                Calculation Type
                                            </Text>
                                            <RadioGroup.Root
                                                value={formData.amount_type}
                                                onValueChange={(value) => setFormData({...formData, amount_type: value})}
                                            >
                                                <Flex gap="4">
                                                    <Flex align="center" gap="2">
                                                        <RadioGroup.Item value="fixed" id="fixed" />
                                                        <label htmlFor="fixed">
                                                            <Text size="2">Fixed Amount</Text>
                                                        </label>
                                                    </Flex>
                                                    <Flex align="center" gap="2">
                                                        <RadioGroup.Item value="percentage" id="percentage" />
                                                        <label htmlFor="percentage">
                                                            <Text size="2">Percentage of Profit</Text>
                                                        </label>
                                                    </Flex>
                                                </Flex>
                                            </RadioGroup.Root>
                                        </Box>
                                        
                                        <Card style={{
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                            padding: '12px',
                                            marginTop: '8px'
                                        }}>
                                            <Flex align="center" gap="2">
                                                <ExclamationTriangleIcon style={{ color: '#f59e0b', flexShrink: 0 }} />
                                                <Text size="1" style={{ color: '#f59e0b' }}>
                                                    {formData.amount_type === 'percentage' 
                                                        ? `This ${formData.percentage}% will be deducted from profit on every order`
                                                        : 'This amount will be deducted from profit on every order'
                                                    }
                                                </Text>
                                            </Flex>
                                        </Card>
                                    </>
                                )}
                            </Flex>
                        </Card>

                        <Grid columns="2" gap="4">
                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Due Date
                                </Text>
                                <TextField.Root
                                    size="3"
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                />
                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                    When should this be paid?
                                </Text>
                            </Box>

                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Related Order
                                </Text>
                                <TextField.Root
                                    size="3"
                                    placeholder="Order number (optional)"
                                    value={formData.order_id}
                                    onChange={(e) => setFormData({...formData, order_id: e.target.value})}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                />
                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                    Link to specific order
                                </Text>
                            </Box>
                        </Grid>

                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Description / Notes
                            </Text>
                            <TextArea
                                placeholder="Additional details about this expense..."
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    minHeight: '80px'
                                }}
                            />
                        </Box>

                        {expense && (
                            <Card style={{
                                background: formData.status === 'paid' 
                                    ? 'rgba(16, 185, 129, 0.1)' 
                                    : 'rgba(245, 158, 11, 0.1)',
                                border: formData.status === 'paid'
                                    ? '1px solid rgba(16, 185, 129, 0.3)'
                                    : '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                                <Flex align="center" justify="between">
                                    <Box>
                                        <Text size="2" weight="medium">Status</Text>
                                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                                            {formData.status === 'paid' ? 'This expense has been paid' : 'This expense is pending payment'}
                                        </Text>
                                    </Box>
                                    <Select.Root value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                                        <Select.Trigger>
                                            <Badge color={formData.status === 'paid' ? 'green' : 'orange'}>
                                                {formData.status}
                                            </Badge>
                                        </Select.Trigger>
                                        <Select.Content>
                                            <Select.Item value="pending">Pending</Select.Item>
                                            <Select.Item value="paid">Paid</Select.Item>
                                        </Select.Content>
                                    </Select.Root>
                                </Flex>
                            </Card>
                        )}

                        <Card style={{
                            background: 'rgba(139, 92, 246, 0.05)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            padding: '12px'
                        }}>
                            <Flex align="center" gap="2">
                                <ExclamationTriangleIcon style={{ color: '#8b5cf6' }} />
                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                    Expenses are deducted from your total profit calculations
                                </Text>
                            </Flex>
                        </Card>

                        <Flex gap="3" justify="end" mt="2">
                            <Dialog.Close>
                                <Button variant="soft" size="3">
                                    <CrossCircledIcon width="16" height="16" />
                                    Cancel
                                </Button>
                            </Dialog.Close>
                            <Button
                                size="3"
                                disabled={saving}
                                onClick={handleSubmit}
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        {expense ? <CheckIcon width="16" height="16" /> : <PlusIcon width="16" height="16" />}
                                        {expense ? 'Update' : 'Add'} Expense
                                    </>
                                )}
                            </Button>
                        </Flex>
                    </Flex>
                </Box>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default ExpenseFormModal;
