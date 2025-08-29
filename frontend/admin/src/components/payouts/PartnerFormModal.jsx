// frontend/admin/src/components/payouts/PartnerFormModal.jsx

import React, { useState, useEffect } from 'react';
import {
    Dialog, Box, Flex, Text, Button, TextField, TextArea,
    Select, Switch, Card, Grid, Badge
} from '@radix-ui/themes';
import {
    PersonIcon, PlusIcon, CheckIcon, CrossCircledIcon
} from '@radix-ui/react-icons';

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
                    <Flex align="center" gap="2">
                        <PersonIcon width="20" height="20" style={{ color: '#10b981' }} />
                        {partner ? 'Edit Payout Partner' : 'Add Payout Partner'}
                    </Flex>
                </Dialog.Title>
                <Dialog.Description>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {partner ? 'Update partner details and commission settings.' : 'Add a new partner who receives commission from your profits.'}
                    </Text>
                </Dialog.Description>

                <Box mt="5">
                    <Flex direction="column" gap="4">
                        {/* Partner Type */}
                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Partner Type *
                            </Text>
                            <Select.Root value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                                <Select.Trigger style={{ width: '100%' }} />
                                <Select.Content>
                                    <Select.Item value="partner">
                                        <Flex align="center" gap="2">
                                            <Badge color="green" size="1">%</Badge>
                                            Commission Partner (% of profit)
                                        </Flex>
                                    </Select.Item>
                                    <Select.Item value="service">
                                        <Flex align="center" gap="2">
                                            <Badge color="orange" size="1">$</Badge>
                                            Service Provider (fixed amount)
                                        </Flex>
                                    </Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </Box>

                        {/* Name */}
                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Name *
                            </Text>
                            <TextField.Root
                                size="3"
                                placeholder="e.g., John Doe"
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

                        {/* Commission or Fixed Amount */}
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
                                <Card style={{
                                    background: 'rgba(139, 92, 246, 0.05)',
                                    border: '1px solid rgba(139, 92, 246, 0.2)',
                                    padding: '12px',
                                    marginTop: '8px'
                                }}>
                                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                        💡 This percentage will be calculated from the net profit after seller commissions
                                    </Text>
                                </Card>
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

                        {/* Priority and Payment Method */}
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
                                <Select.Root value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                                    <Select.Trigger style={{ width: '100%' }} />
                                    <Select.Content>
                                        <Select.Item value="USDT">USDT (TRC20)</Select.Item>
                                        <Select.Item value="USDT_ERC20">USDT (ERC20)</Select.Item>
                                        <Select.Item value="BTC">Bitcoin</Select.Item>
                                        <Select.Item value="ETH">Ethereum</Select.Item>
                                        <Select.Item value="Bank">Bank Transfer</Select.Item>
                                        <Select.Item value="Cash">Cash</Select.Item>
                                        <Select.Item value="Other">Other</Select.Item>
                                    </Select.Content>
                                </Select.Root>
                            </Box>
                        </Grid>

                        {/* Payment Address */}
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
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    fontFamily: 'monospace'
                                }}
                            />
                            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                Enter the wallet address or bank account details for payments
                            </Text>
                        </Box>

                        {/* Description */}
                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Description / Notes
                            </Text>
                            <TextArea
                                placeholder="e.g., Business partner - handles marketing"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    minHeight: '80px'
                                }}
                            />
                        </Box>

                        {/* Active Status */}
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

                        {/* Actions */}
                        <Flex gap="3" justify="end" mt="4">
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
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        {partner ? <CheckIcon width="16" height="16" /> : <PlusIcon width="16" height="16" />}
                                        {partner ? 'Update' : 'Create'} Partner
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

export default PartnerFormModal;
