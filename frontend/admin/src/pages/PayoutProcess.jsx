// frontend/admin/src/pages/PayoutProcess.jsx
// Component for processing partner payouts

import React, { useState, useEffect } from 'react';
import {
    Dialog, Box, Flex, Text, Button, TextField, TextArea,
    Card, Badge, Separator, Select, Heading, Switch
} from '@radix-ui/themes';
import {
    CardStackIcon, CopyIcon, CheckCircledIcon,
    ExclamationTriangleIcon
} from '@radix-ui/react-icons';

const PayoutProcess = ({ isOpen, partner, onClose, onProcess }) => {
    const [paymentMethod, setPaymentMethod] = useState('USDT');
    const [transactionId, setTransactionId] = useState('');
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [partialAmount, setPartialAmount] = useState(partner?.pending_amount || 0);
    const [isPartialPayment, setIsPartialPayment] = useState(false);

    useEffect(() => {
        if (partner) {
            setPartialAmount(partner.pending_amount || 0);
            setIsPartialPayment(false); // Reset to full payment by default
        }
    }, [partner]);

    const handleSubmit = async () => {
        if (!transactionId.trim()) {
            alert('Please enter a transaction ID');
            return;
        }

        const amountToPay = isPartialPayment ? partialAmount : partner.pending_amount;
        
        if (isPartialPayment && (partialAmount <= 0 || partialAmount > partner.pending_amount)) {
            alert('Invalid amount. Must be between 0 and pending amount.');
            return;
        }

        setProcessing(true);
        await onProcess({
            partner_id: partner._id,
            amount: amountToPay,
            transaction_id: transactionId,
            notes: notes,
            payment_method: paymentMethod
        });
        setProcessing(false);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Content style={{ maxWidth: '550px', padding: '24px' }}>
                <Dialog.Title>
                    <Flex align="center" gap="2">
                        <CardStackIcon width="24" height="24" style={{ color: '#10b981' }} />
                        <Heading size="5">Process Payout</Heading>
                    </Flex>
                </Dialog.Title>

                <Dialog.Description>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Complete the payout for {partner?.name}
                    </Text>
                </Dialog.Description>

                <Box mt="5">
                    {/* Payout Summary Card */}
                    <Card style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '20px',
                        marginBottom: '24px'
                    }}>
                        <Flex direction="column" gap="3">
                            <Flex justify="between" align="center">
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                    Partner
                                </Text>
                                <Text size="3" weight="bold">
                                    {partner?.name}
                                </Text>
                            </Flex>
                            
                            <Separator size="4" style={{ opacity: 0.2 }} />
                            
                            <Flex justify="between" align="center">
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                    Amount to Pay
                                </Text>
                                <Text size="5" weight="bold" style={{ color: '#10b981' }}>
                                    ${partner?.pending_amount?.toFixed(2) || '0.00'}
                                </Text>
                            </Flex>

                            <Flex justify="between" align="center">
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                    Orders Included
                                </Text>
                                <Badge size="2" color="green">
                                    {partner?.pending_count || 0} orders
                                </Badge>
                            </Flex>

                            {partner?.payment_address && (
                                <>
                                    <Separator size="4" style={{ opacity: 0.2 }} />
                                    <Box>
                                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                                            Payment Address
                                        </Text>
                                        <Flex align="center" gap="2">
                                            <Text size="2" style={{ 
                                                fontFamily: 'monospace',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                flex: 1,
                                                wordBreak: 'break-all'
                                            }}>
                                                {partner.payment_address}
                                            </Text>
                                            <IconButton
                                                size="2"
                                                variant="soft"
                                                onClick={() => copyToClipboard(partner.payment_address)}
                                            >
                                                {copied ? <CheckCircledIcon /> : <CopyIcon />}
                                            </IconButton>
                                        </Flex>
                                    </Box>
                                </>
                            )}
                        </Flex>
                    </Card>

                    {/* Payment Form */}
                    <Flex direction="column" gap="4">
                        {/* Partial Payment Option */}
                        <Card style={{
                            background: 'rgba(139, 92, 246, 0.05)',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            padding: '16px'
                        }}>
                            <Flex align="center" justify="between" mb="3">
                                <Box>
                                    <Text size="2" weight="medium">Partial Payment</Text>
                                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                                        Enable to pay a custom amount
                                    </Text>
                                </Box>
                                <Switch
                                    size="2"
                                    checked={isPartialPayment}
                                    onCheckedChange={(checked) => {
                                        setIsPartialPayment(checked);
                                        if (!checked) {
                                            setPartialAmount(partner?.pending_amount || 0);
                                        }
                                    }}
                                />
                            </Flex>
                            
                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Amount to Pay
                                </Text>
                                <TextField.Root
                                    size="3"
                                    type="number"
                                    min="0.01"
                                    max={partner?.pending_amount}
                                    step="0.01"
                                    value={partialAmount}
                                    onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)}
                                    disabled={!isPartialPayment}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        opacity: isPartialPayment ? 1 : 0.5,
                                        cursor: isPartialPayment ? 'text' : 'not-allowed'
                                    }}
                                />
                                <Flex justify="between" mt="2">
                                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                        Available: ${partner?.pending_amount?.toFixed(2) || '0.00'}
                                    </Text>
                                    <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                                        Paying: ${partialAmount.toFixed(2)}
                                    </Text>
                                </Flex>
                            </Box>
                        </Card>

                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Payment Method *
                            </Text>
                            <Select.Root value={paymentMethod} onValueChange={setPaymentMethod}>
                                <Select.Trigger style={{ width: '100%' }} />
                                <Select.Content>
                                    <Select.Item value="USDT">USDT (TRC20)</Select.Item>
                                    <Select.Item value="USDT_ERC20">USDT (ERC20)</Select.Item>
                                    <Select.Item value="BTC">Bitcoin</Select.Item>
                                    <Select.Item value="ETH">Ethereum</Select.Item>
                                    <Select.Item value="Bank">Bank Transfer</Select.Item>
                                    <Select.Item value="Other">Other</Select.Item>
                                </Select.Content>
                            </Select.Root>
                        </Box>

                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Transaction ID / Reference *
                            </Text>
                            <TextField.Root
                                size="3"
                                placeholder="e.g., 0x1234... or bank reference"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            />
                            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                Enter the blockchain transaction hash or payment reference
                            </Text>
                        </Box>

                        <Box>
                            <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                Notes (Optional)
                            </Text>
                            <TextArea
                                placeholder="Additional notes about this payout..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    minHeight: '80px'
                                }}
                            />
                        </Box>

                        {/* Warning */}
                        <Card style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '12px'
                        }}>
                            <Flex align="center" gap="2">
                                <ExclamationTriangleIcon style={{ color: '#f59e0b' }} />
                                <Text size="2" style={{ color: '#f59e0b' }}>
                                    Please ensure the payment has been sent before marking as paid
                                </Text>
                            </Flex>
                        </Card>

                        {/* Actions */}
                        <Flex gap="3" justify="end" mt="2">
                            <Dialog.Close>
                                <Button variant="soft" size="3">
                                    Cancel
                                </Button>
                            </Dialog.Close>
                            <Button
                                size="3"
                                disabled={processing || !transactionId.trim()}
                                onClick={handleSubmit}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    cursor: processing || !transactionId.trim() ? 'not-allowed' : 'pointer',
                                    opacity: processing || !transactionId.trim() ? 0.7 : 1
                                }}
                            >
                                {processing ? 'Processing...' : 'Confirm Payment'}
                            </Button>
                        </Flex>
                    </Flex>
                </Box>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default PayoutProcess;
