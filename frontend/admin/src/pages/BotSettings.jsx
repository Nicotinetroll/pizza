import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, Flex, Grid, Text, Card, Badge, Button, Select,
    Table, IconButton, Heading, TextField, Dialog,
    Switch, Avatar, Separator, ScrollArea, Code,
    Tabs, Progress, DropdownMenu, TextArea, Tooltip
} from '@radix-ui/themes';
import {
    PlusIcon, Pencil1Icon, TrashIcon, MagnifyingGlassIcon,
    ReloadIcon, CheckCircledIcon, CrossCircledIcon, RocketIcon,
    CopyIcon, ExclamationTriangleIcon, ChatBubbleIcon, InfoCircledIcon,
    TimerIcon, LightningBoltIcon, GearIcon, MagicWandIcon,
    CalendarIcon, ClockIcon, CodeIcon, PlayIcon, StopIcon,
    FileTextIcon, SlashIcon, ArchiveIcon, UpdateIcon
} from '@radix-ui/react-icons';
import { botAPI } from '../services/api';

const VariableHelp = () => (
    <Card style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        padding: '20px',
        marginBottom: '24px'
    }}>
        <Heading size="3" mb="3">
            <InfoCircledIcon width="20" height="20" style={{ marginRight: '8px' }} />
            Available Variables
        </Heading>

        <Grid columns={{ initial: '1', md: '2', lg: '3' }} gap="3">
            <Box>
                <Text size="2" weight="bold" style={{ color: '#06b6d4', display: 'block', marginBottom: '8px' }}>
                    User Variables
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">{`{name}`} - User's first name</Code>
                    <Code size="1">{`{username}`} - Telegram username</Code>
                    <Code size="1">{`{telegram_id}`} - User ID</Code>
                    <Code size="1">{`{total_orders}`} - Total orders</Code>
                    <Code size="1">{`{total_spent}`} - Total spent</Code>
                </Flex>
            </Box>

            <Box>
                <Text size="2" weight="bold" style={{ color: '#06b6d4', display: 'block', marginBottom: '8px' }}>
                    Order Variables
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">{`{order_number}`} - Order number</Code>
                    <Code size="1">{`{total}`} - Total amount</Code>
                    <Code size="1">{`{total_usdt}`} - Total in USDT</Code>
                    <Code size="1">{`{quantity}`} - Item quantity</Code>
                    <Code size="1">{`{order_summary}`} - Order items</Code>
                </Flex>
            </Box>

            <Box>
                <Text size="2" weight="bold" style={{ color: '#06b6d4', display: 'block', marginBottom: '8px' }}>
                    Product Variables
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">{`{product_name}`} - Product name</Code>
                    <Code size="1">{`{price}`} - Product price</Code>
                    <Code size="1">{`{category}`} - Category name</Code>
                    <Code size="1">{`{stock}`} - Stock quantity</Code>
                </Flex>
            </Box>

            <Box>
                <Text size="2" weight="bold" style={{ color: '#06b6d4', display: 'block', marginBottom: '8px' }}>
                    Location Variables
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">{`{country}`} - Delivery country</Code>
                    <Code size="1">{`{city}`} - Delivery city</Code>
                    <Code size="1">{`{delivery_address}`} - Full address</Code>
                </Flex>
            </Box>

            <Box>
                <Text size="2" weight="bold" style={{ color: '#06b6d4', display: 'block', marginBottom: '8px' }}>
                    Payment Variables
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">{`{currency}`} - BTC, ETH, etc.</Code>
                    <Code size="1">{`{crypto_amount}`} - Amount in crypto</Code>
                    <Code size="1">{`{address}`} - Payment address</Code>
                    <Code size="1">{`{exchange_rate}`} - Current rate</Code>
                </Flex>
            </Box>

            <Box>
                <Text size="2" weight="bold" style={{ color: '#06b6d4', display: 'block', marginBottom: '8px' }}>
                    Discount Variables
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">{`{code}`} - Referral code</Code>
                    <Code size="1">{`{discount_text}`} - Discount text</Code>
                    <Code size="1">{`{discount_amount}`} - Discount amount</Code>
                    <Code size="1">{`{new_total}`} - Total after discount</Code>
                    <Code size="1">{`{vip_discount}`} - VIP discount %</Code>
                </Flex>
            </Box>
        </Grid>

        <Separator size="4" style={{ margin: '20px 0' }} />

        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            <strong>Formatting:</strong> Use <Code size="1">*text*</Code> for bold,
            <Code size="1">_text_</Code> for italic, <Code size="1">`code`</Code> for monospace
        </Text>
    </Card>
);

// Common message keys help
const MessageKeysHelp = () => (
    <Card style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        padding: '20px',
        marginBottom: '24px'
    }}>
        <Heading size="3" mb="3">
            <CodeIcon width="20" height="20" style={{ marginRight: '8px' }} />
            Common Message Keys
        </Heading>

        <Grid columns={{ initial: '1', md: '2' }} gap="3">
            <Box>
                <Text size="2" weight="bold" style={{ color: '#8b5cf6', display: 'block', marginBottom: '8px' }}>
                    Main Messages
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">welcome - Welcome message (/start)</Code>
                    <Code size="1">help - Help message (/help)</Code>
                    <Code size="1">shop_categories - Category list header</Code>
                    <Code size="1">no_categories - No categories found</Code>
                    <Code size="1">category_empty - Empty category</Code>
                </Flex>
            </Box>

            <Box>
                <Text size="2" weight="bold" style={{ color: '#8b5cf6', display: 'block', marginBottom: '8px' }}>
                    Cart Messages
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">cart_empty - Empty cart message</Code>
                    <Code size="1">product_added - Product added to cart</Code>
                    <Code size="1">cart_cleared - Cart cleared message</Code>
                    <Code size="1">cart_full - Cart is full</Code>
                </Flex>
            </Box>

            <Box>
                <Text size="2" weight="bold" style={{ color: '#8b5cf6', display: 'block', marginBottom: '8px' }}>
                    Checkout Messages
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">checkout_intro - Checkout start</Code>
                    <Code size="1">ask_location - Ask for country</Code>
                    <Code size="1">ask_city - Ask for city</Code>
                    <Code size="1">ask_referral - Ask for referral code</Code>
                </Flex>
            </Box>

            <Box>
                <Text size="2" weight="bold" style={{ color: '#8b5cf6', display: 'block', marginBottom: '8px' }}>
                    Payment Messages
                </Text>
                <Flex direction="column" gap="1">
                    <Code size="1">payment_select - Select payment method</Code>
                    <Code size="1">payment_instructions - Payment instructions</Code>
                    <Code size="1">payment_confirmed - Payment confirmed</Code>
                    <Code size="1">payment_failed - Payment failed</Code>
                </Flex>
            </Box>
        </Grid>
    </Card>
);

// Message Editor Modal
const MessageEditorModal = ({ message, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        key: '',
        message: '',
        category: 'main',
        enabled: true,
        variables: []
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (message) {
            setFormData({
                key: message.key || '',
                message: message.message || '',
                category: message.category || 'main',
                enabled: message.enabled !== false,
                variables: message.variables || []
            });
        } else {
            setFormData({
                key: '',
                message: '',
                category: 'main',
                enabled: true,
                variables: []
            });
        }
        setErrors({});
    }, [message, isOpen]);

    const detectVariables = (text) => {
        if (!text) return [];
        const regex = /\{(\w+)\}/g;
        const vars = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (!vars.includes(match[1])) {
                vars.push(match[1]);
            }
        }
        return vars;
    };

    const handleMessageChange = (value) => {
        const variables = detectVariables(value);
        setFormData({
            ...formData,
            message: value,
            variables
        });
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.key) newErrors.key = 'Key is required';
        if (!formData.message) newErrors.message = 'Message is required';
        if (!formData.category) newErrors.category = 'Category is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving message:', error);
            alert('Failed to save message');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Content style={{ maxWidth: '800px' }}>
                <Dialog.Title>
                    <Flex align="center" gap="3">
                        <Box style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ChatBubbleIcon width="20" height="20" />
                        </Box>
                        <Heading size="4">
                            {message ? 'Edit Bot Message' : 'Create Bot Message'}
                        </Heading>
                    </Flex>
                </Dialog.Title>

                <Box mt="4">
                    <ScrollArea style={{ maxHeight: '70vh' }}>
                        <Flex direction="column" gap="4">
                            {/* Key and Category */}
                            <Grid columns="2" gap="4">
                                <Box>
                                    <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                        Message Key *
                                    </Text>
                                    <TextField.Root
                                        size="3"
                                        placeholder="e.g., welcome_message"
                                        value={formData.key}
                                        onChange={(e) => setFormData({...formData, key: e.target.value})}
                                        disabled={!!message}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: errors.key ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    />
                                    {errors.key && (
                                        <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                                            {errors.key}
                                        </Text>
                                    )}
                                </Box>

                                <Box>
                                    <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                        Category
                                    </Text>
                                    <Select.Root
                                        value={formData.category}
                                        onValueChange={(value) => setFormData({...formData, category: value})}
                                    >
                                        <Select.Trigger style={{
                                            width: '100%',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                            <Text>{formData.category}</Text>
                                        </Select.Trigger>
                                        <Select.Content>
                                            <Select.Item value="main">Main Messages</Select.Item>
                                            <Select.Item value="cart">Cart Messages</Select.Item>
                                            <Select.Item value="checkout">Checkout Messages</Select.Item>
                                            <Select.Item value="payment">Payment Messages</Select.Item>
                                            <Select.Item value="error">Error Messages</Select.Item>
                                            <Select.Item value="success">Success Messages</Select.Item>
                                            <Select.Item value="help">Help Messages</Select.Item>
                                            <Select.Item value="fun">Fun Messages</Select.Item>
                                        </Select.Content>
                                    </Select.Root>
                                </Box>
                            </Grid>

                            {/* Message Content */}
                            <Box>
                                <Flex align="center" justify="between" mb="2">
                                    <Text size="2" weight="medium">
                                        Message Content *
                                    </Text>
                                    {formData.variables && formData.variables.length > 0 && (
                                        <Flex gap="2">
                                            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                                Variables detected:
                                            </Text>
                                            {formData.variables.map(v => (
                                                <Badge key={v} size="1" color="cyan" variant="soft">
                                                    {`{${v}}`}
                                                </Badge>
                                            ))}
                                        </Flex>
                                    )}
                                </Flex>
                                <TextArea
                                    placeholder="Enter bot message... Use {variable} for dynamic content"
                                    value={formData.message}
                                    onChange={(e) => handleMessageChange(e.target.value)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: errors.message ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                                        minHeight: '200px',
                                        fontFamily: 'monospace',
                                        fontSize: '13px'
                                    }}
                                />
                                {errors.message && (
                                    <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                                        {errors.message}
                                    </Text>
                                )}
                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginTop: '8px' }}>
                                    Tip: Use Markdown formatting. Variables: {`{name}, {total}, {order_number}, etc.`}
                                </Text>
                            </Box>

                            {/* Message Preview */}
                            <Card style={{
                                background: 'rgba(6, 182, 212, 0.05)',
                                border: '1px solid rgba(6, 182, 212, 0.2)'
                            }}>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '12px' }}>
                                    Preview:
                                </Text>
                                <Box style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    whiteSpace: 'pre-wrap',
                                    fontFamily: 'system-ui',
                                    fontSize: '14px',
                                    lineHeight: '1.6'
                                }}>
                                    {formData.message || 'Message preview will appear here...'}
                                </Box>
                            </Card>

                            {/* Active Status */}
                            <Card style={{
                                background: 'rgba(139, 92, 246, 0.05)',
                                border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}>
                                <Flex align="center" justify="between">
                                    <Box>
                                        <Text size="2" weight="medium" style={{ display: 'block' }}>
                                            Message Active
                                        </Text>
                                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                                            {formData.enabled ? 'This message is active' : 'This message is disabled'}
                                        </Text>
                                    </Box>
                                    <Switch
                                        size="3"
                                        checked={formData.enabled}
                                        onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
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
                                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        opacity: saving ? 0.7 : 1
                                    }}
                                >
                                    {saving ? 'Saving...' : (message ? 'Update' : 'Create')} Message
                                </Button>
                            </Flex>
                        </Flex>
                    </ScrollArea>
                </Box>
            </Dialog.Content>
        </Dialog.Root>
    );
};

// Command Editor Modal
const CommandEditorModal = ({ command, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        command: '',
        description: '',
        response: '',
        aliases: [],
        enabled: true,
        private_only: true,
        group_redirect: true
    });
    const [aliasInput, setAliasInput] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (command) {
            setFormData({
                command: command.command || '',
                description: command.description || '',
                response: command.response || '',
                aliases: command.aliases || [],
                enabled: command.enabled !== false,
                private_only: command.private_only !== false,
                group_redirect: command.group_redirect !== false
            });
        } else {
            setFormData({
                command: '',
                description: '',
                response: '',
                aliases: [],
                enabled: true,
                private_only: true,
                group_redirect: true
            });
        }
        setAliasInput('');
        setErrors({});
    }, [command, isOpen]);

    const addAlias = () => {
        if (!aliasInput) return;

        if (!aliasInput.startsWith('/')) {
            alert('Alias must start with /');
            return;
        }

        const currentAliases = formData.aliases || [];
        if (!currentAliases.includes(aliasInput)) {
            setFormData({
                ...formData,
                aliases: [...currentAliases, aliasInput]
            });
            setAliasInput('');
        }
    };

    const removeAlias = (alias) => {
        setFormData({
            ...formData,
            aliases: (formData.aliases || []).filter(a => a !== alias)
        });
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.command || !formData.command.startsWith('/')) {
            newErrors.command = 'Command must start with /';
        }
        if (!formData.description) newErrors.description = 'Description is required';
        if (!formData.response) newErrors.response = 'Response is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving command:', error);
            alert('Failed to save command');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Content style={{ maxWidth: '700px' }}>
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
                            <SlashIcon width="20" height="20" />
                        </Box>
                        <Heading size="4">
                            {command ? 'Edit Bot Command' : 'Create Bot Command'}
                        </Heading>
                    </Flex>
                </Dialog.Title>

                <Box mt="4">
                    <ScrollArea style={{ maxHeight: '70vh' }}>
                        <Flex direction="column" gap="4">
                            {/* Command and Description */}
                            <Grid columns="2" gap="4">
                                <Box>
                                    <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                        Command *
                                    </Text>
                                    <TextField.Root
                                        size="3"
                                        placeholder="/command"
                                        value={formData.command}
                                        onChange={(e) => setFormData({...formData, command: e.target.value})}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: errors.command ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    />
                                    {errors.command && (
                                        <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                                            {errors.command}
                                        </Text>
                                    )}
                                </Box>

                                <Box>
                                    <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                        Description *
                                    </Text>
                                    <TextField.Root
                                        size="3"
                                        placeholder="What this command does"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: errors.description ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    />
                                    {errors.description && (
                                        <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                                            {errors.description}
                                        </Text>
                                    )}
                                </Box>
                            </Grid>

                            {/* Command Aliases */}
                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Command Aliases (optional)
                                </Text>
                                <Flex gap="2" mb="2">
                                    <TextField.Root
                                        size="3"
                                        placeholder="/alias"
                                        value={aliasInput}
                                        onChange={(e) => setAliasInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addAlias()}
                                        style={{
                                            flex: 1,
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    />
                                    <Button
                                        size="3"
                                        variant="soft"
                                        onClick={addAlias}
                                        disabled={!aliasInput}
                                    >
                                        Add
                                    </Button>
                                </Flex>
                                <Flex gap="2" wrap="wrap">
                                    {(formData.aliases || []).map(alias => (
                                        <Badge
                                            key={alias}
                                            size="2"
                                            color="purple"
                                            variant="soft"
                                            style={{ paddingRight: '4px' }}
                                        >
                                            {alias}
                                            <IconButton
                                                size="1"
                                                variant="ghost"
                                                onClick={() => removeAlias(alias)}
                                                style={{ marginLeft: '8px' }}
                                            >
                                                <CrossCircledIcon width="12" height="12" />
                                            </IconButton>
                                        </Badge>
                                    ))}
                                </Flex>
                            </Box>

                            {/* Response Content */}
                            <Box>
                                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                    Response Message *
                                </Text>
                                <TextArea
                                    placeholder="What the bot responds when this command is used..."
                                    value={formData.response}
                                    onChange={(e) => setFormData({...formData, response: e.target.value})}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: errors.response ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                                        minHeight: '150px',
                                        fontFamily: 'monospace',
                                        fontSize: '13px'
                                    }}
                                />
                                {errors.response && (
                                    <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                                        {errors.response}
                                    </Text>
                                )}
                            </Box>

                            {/* Command Scope */}
                            <Card style={{
                                background: 'rgba(99, 102, 241, 0.05)',
                                border: '1px solid rgba(99, 102, 241, 0.2)'
                            }}>
                                <Heading size="2" mb="3">Command Scope</Heading>

                                <Flex direction="column" gap="3">
                                    <Flex align="center" justify="between">
                                        <Box>
                                            <Text size="2" weight="medium">Private Chat Only</Text>
                                            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                                {formData.private_only ? 'Command works only in DM' : 'Command works everywhere'}
                                            </Text>
                                        </Box>
                                        <Switch
                                            size="3"
                                            checked={formData.private_only}
                                            onCheckedChange={(checked) => setFormData({...formData, private_only: checked})}
                                        />
                                    </Flex>

                                    {!formData.private_only && (
                                        <Box style={{
                                            padding: '12px',
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            border: '1px solid rgba(245, 158, 11, 0.2)',
                                            borderRadius: '8px'
                                        }}>
                                            <Flex align="center" gap="2">
                                                <ExclamationTriangleIcon width="16" height="16" style={{ color: '#f59e0b' }} />
                                                <Text size="2" style={{ color: '#f59e0b' }}>
                                                    Command will work in groups/channels too
                                                </Text>
                                            </Flex>
                                        </Box>
                                    )}

                                    {formData.private_only && (
                                        <Flex align="center" justify="between">
                                            <Box>
                                                <Text size="2" weight="medium">Redirect from Groups</Text>
                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                                    Show "Use in DM" message when used in groups
                                                </Text>
                                            </Box>
                                            <Switch
                                                size="3"
                                                checked={formData.group_redirect}
                                                onCheckedChange={(checked) => setFormData({...formData, group_redirect: checked})}
                                            />
                                        </Flex>
                                    )}
                                </Flex>
                            </Card>

                            {/* Active Status */}
                            <Card style={{
                                background: 'rgba(139, 92, 246, 0.05)',
                                border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}>
                                <Flex align="center" justify="between">
                                    <Box>
                                        <Text size="2" weight="medium" style={{ display: 'block' }}>
                                            Command Active
                                        </Text>
                                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                                            {formData.enabled ? 'Command is active' : 'Command is disabled'}
                                        </Text>
                                    </Box>
                                    <Switch
                                        size="3"
                                        checked={formData.enabled}
                                        onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
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
                                    {saving ? 'Saving...' : (command ? 'Update' : 'Create')} Command
                                </Button>
                            </Flex>
                        </Flex>
                    </ScrollArea>
                </Box>
            </Dialog.Content>
        </Dialog.Root>
    );
};

// Main Bot Settings Component
const BotSettings = () => {
    const [activeTab, setActiveTab] = useState('messages');
    const [messages, setMessages] = useState([]);
    const [commands, setCommands] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [commandModalOpen, setCommandModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [selectedCommand, setSelectedCommand] = useState(null);
    const [unsavedChanges, setUnsavedChanges] = useState([]);
    const [savingBulk, setSavingBulk] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [messagesData, commandsData, settingsData] = await Promise.all([
                botAPI.getMessages(),
                botAPI.getCommands(),
                botAPI.getSettings()
            ]);

            setMessages(messagesData.messages || []);
            setCommands(commandsData.commands || []);
            setSettings(settingsData || {});
        } catch (error) {
            console.error('Error fetching bot data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInitialize = async () => {
        if (!confirm('Initialize database with default messages? This will not overwrite existing messages.')) return;

        try {
            const result = await botAPI.initializeMessages();
            alert(result.message);
            await fetchData();
        } catch (error) {
            console.error('Error initializing messages:', error);
            alert('Failed to initialize messages');
        }
    };

    const handleRestartBot = async () => {
        if (!confirm('Restart the bot to apply changes? The bot will be unavailable for a few seconds.')) return;

        try {
            const result = await botAPI.restartBot();
            alert(result.message);
        } catch (error) {
            console.error('Error restarting bot:', error);
            alert('Failed to restart bot');
        }
    };

    const handleSaveMessage = async (formData) => {
        try {
            if (selectedMessage) {
                await botAPI.updateMessage(selectedMessage._id, formData);
            } else {
                await botAPI.createMessage(formData);
            }
            await fetchData();
        } catch (error) {
            console.error('Error saving message:', error);
            alert('Failed to save message');
        }
    };

    const handleDeleteMessage = async (message) => {
        if (!confirm(`Delete message "${message.key}"?`)) return;

        try {
            await botAPI.deleteMessage(message._id);
            await fetchData();
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const handleSaveCommand = async (formData) => {
        try {
            if (selectedCommand) {
                await botAPI.updateCommand(selectedCommand._id, formData);
            } else {
                await botAPI.createCommand(formData);
            }
            await fetchData();
        } catch (error) {
            console.error('Error saving command:', error);
            alert('Failed to save command');
        }
    };

    const handleDeleteCommand = async (command) => {
        if (!confirm(`Delete command "${command.command}"?`)) return;

        try {
            await botAPI.deleteCommand(command._id);
            await fetchData();
        } catch (error) {
            console.error('Error deleting command:', error);
        }
    };

    const handleQuickEdit = (messageId, newValue) => {
        const updatedMessages = messages.map(msg =>
            msg._id === messageId ? { ...msg, message: newValue } : msg
        );
        setMessages(updatedMessages);

        if (!unsavedChanges.includes(messageId)) {
            setUnsavedChanges([...unsavedChanges, messageId]);
        }
    };

    const handleSaveBulkChanges = async () => {
        setSavingBulk(true);

        const updates = unsavedChanges.map(id => {
            const message = messages.find(m => m._id === id);
            return {
                _id: id,
                message: message.message
            };
        });

        try {
            await botAPI.bulkUpdateMessages(updates);
            setUnsavedChanges([]);
            await fetchData();
        } catch (error) {
            console.error('Error saving bulk changes:', error);
        } finally {
            setSavingBulk(false);
        }
    };

    const handleUpdateSettings = async () => {
        try {
            await botAPI.updateSettings(settings);
            alert('Settings updated successfully');
        } catch (error) {
            console.error('Error updating settings:', error);
            alert('Failed to update settings');
        }
    };

    // Filter messages
    const filteredMessages = messages.filter(msg => {
        const matchesSearch =
            msg.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            msg.message.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || msg.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Get unique categories
    const categories = [...new Set(messages.map(m => m.category))];

    if (loading) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <GearIcon width="32" height="32" style={{ color: '#06b6d4' }} />
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
                        Bot Settings
                    </Heading>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Configure bot messages, commands, and behavior
                    </Text>
                </Box>

                <Flex gap="3">
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                            <Button
                                size="3"
                                variant="surface"
                                style={{
                                    background: 'rgba(20, 20, 25, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            >
                                <GearIcon width="18" height="18" />
                                Actions
                            </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                            <DropdownMenu.Item onClick={handleInitialize}>
                                <ArchiveIcon width="16" height="16" />
                                Initialize Default Messages
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item onClick={handleRestartBot} color="orange">
                                <UpdateIcon width="16" height="16" />
                                Restart Bot
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>

                    {activeTab === 'messages' && (
                        <Button
                            size="3"
                            onClick={() => {
                                setSelectedMessage(null);
                                setMessageModalOpen(true);
                            }}
                            style={{
                                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                cursor: 'pointer'
                            }}
                        >
                            <PlusIcon width="18" height="18" />
                            Add Message
                        </Button>
                    )}

                    {activeTab === 'commands' && (
                        <Button
                            size="3"
                            onClick={() => {
                                setSelectedCommand(null);
                                setCommandModalOpen(true);
                            }}
                            style={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                cursor: 'pointer'
                            }}
                        >
                            <PlusIcon width="18" height="18" />
                            Add Command
                        </Button>
                    )}
                </Flex>
            </Flex>

            {/* Tabs */}
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                <Tabs.List size="2">
                    <Tabs.Trigger value="messages">
                        <ChatBubbleIcon width="16" height="16" style={{ marginRight: '8px' }} />
                        Messages ({messages.length})
                    </Tabs.Trigger>
                    <Tabs.Trigger value="commands">
                        <SlashIcon width="16" height="16" style={{ marginRight: '8px' }} />
                        Commands ({commands.length})
                    </Tabs.Trigger>
                    <Tabs.Trigger value="settings">
                        <GearIcon width="16" height="16" style={{ marginRight: '8px' }} />
                        General Settings
                    </Tabs.Trigger>
                </Tabs.List>

                {/* Messages Tab */}
                {/* Messages Tab */}
                <Tabs.Content value="messages">
                    <Box mt="4">
                        <VariableHelp />
                        <MessageKeysHelp />
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
                                            opacity: 0.5
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search messages..."
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
                                            outline: 'none'
                                        }}
                                    />
                                </Box>

                                <Select.Root value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <Select.Trigger
                                        variant="surface"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            minWidth: '150px'
                                        }}
                                    >
                                        <Text>{categoryFilter === 'all' ? 'All Categories' : categoryFilter}</Text>
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Item value="all">All Categories</Select.Item>
                                        <Select.Separator />
                                        {categories.map(cat => (
                                            <Select.Item key={cat} value={cat}>{cat}</Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>

                                {unsavedChanges.length > 0 && (
                                    <Button
                                        size="3"
                                        onClick={handleSaveBulkChanges}
                                        disabled={savingBulk}
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        }}
                                    >
                                        {savingBulk ? 'Saving...' : `Save ${unsavedChanges.length} Changes`}
                                    </Button>
                                )}
                            </Flex>
                        </Card>

                        {/* Messages Table - SPRÁVNA VERZIA */}
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
                                        <Table.ColumnHeaderCell>Key</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Message</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {filteredMessages.map(message => (
                                        <Table.Row key={message._id}>
                                            <Table.Cell>
                                                <Code size="2" style={{
                                                    background: 'rgba(6, 182, 212, 0.1)',
                                                    color: '#06b6d4',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {message.key}
                                                </Code>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge size="2" color="cyan" variant="soft">
                                                    {message.category}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell style={{ maxWidth: '400px' }}>
                                <textarea
                                    value={message.message}
                                    onChange={(e) => handleQuickEdit(message._id, e.target.value)}
                                    style={{
                                        width: '100%',
                                        minHeight: '60px',
                                        padding: '8px',
                                        background: unsavedChanges.includes(message._id)
                                            ? 'rgba(245, 158, 11, 0.1)'
                                            : 'rgba(255, 255, 255, 0.03)',
                                        border: unsavedChanges.includes(message._id)
                                            ? '1px solid rgba(245, 158, 11, 0.3)'
                                            : '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        resize: 'vertical',
                                        outline: 'none'
                                    }}
                                />
                                                {message.variables && message.variables.length > 0 && (
                                                    <Flex gap="1" mt="1">
                                                        {message.variables.map(v => (
                                                            <Badge key={v} size="1" color="purple" variant="soft">
                                                                {`{${v}}`}
                                                            </Badge>
                                                        ))}
                                                    </Flex>
                                                )}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge
                                                    size="2"
                                                    color={message.enabled ? 'green' : 'gray'}
                                                    variant="soft"
                                                >
                                                    {message.enabled ? 'Active' : 'Disabled'}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Flex gap="2">
                                                    <IconButton
                                                        size="2"
                                                        variant="soft"
                                                        onClick={() => {
                                                            setSelectedMessage(message);
                                                            setMessageModalOpen(true);
                                                        }}
                                                        style={{
                                                            background: 'rgba(6, 182, 212, 0.1)',
                                                            border: '1px solid rgba(6, 182, 212, 0.2)'
                                                        }}
                                                    >
                                                        <Pencil1Icon width="16" height="16" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="2"
                                                        variant="soft"
                                                        color="red"
                                                        onClick={() => handleDeleteMessage(message)}
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
                    </Box>
                </Tabs.Content>

                {/* Commands Tab */}
                <Tabs.Content value="commands">
                    <Box mt="4">
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
                                        <Table.ColumnHeaderCell>Command</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Scope</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Aliases</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Response</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {commands.map(command => (
                                        <Table.Row key={command._id}>
                                            <Table.Cell>
                                                <Code size="2" style={{
                                                    background: 'rgba(139, 92, 246, 0.1)',
                                                    color: '#8b5cf6',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {command.command}
                                                </Code>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Text size="2">{command.description}</Text>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Flex gap="1" direction="column">
                                                    {command.private_only !== false ? (
                                                        <Badge size="1" color="blue" variant="soft">
                                                            DM Only
                                                        </Badge>
                                                    ) : (
                                                        <Badge size="1" color="green" variant="soft">
                                                            All Chats
                                                        </Badge>
                                                    )}
                                                    {command.group_redirect && command.private_only !== false && (
                                                        <Badge size="1" color="orange" variant="soft">
                                                            Redirects
                                                        </Badge>
                                                    )}
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell>
                                                {command.aliases && command.aliases.length > 0 ? (
                                                    <Flex gap="1" wrap="wrap">
                                                        {command.aliases.map(alias => (
                                                            <Badge key={alias} size="1" color="purple" variant="soft">
                                                                {alias}
                                                            </Badge>
                                                        ))}
                                                    </Flex>
                                                ) : (
                                                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                        None
                                                    </Text>
                                                )}
                                            </Table.Cell>
                                            <Table.Cell style={{ maxWidth: '300px' }}>
                                                <Text size="2" style={{
                                                    display: 'block',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {command.response}
                                                </Text>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge
                                                    size="2"
                                                    color={command.enabled ? 'green' : 'gray'}
                                                    variant="soft"
                                                >
                                                    {command.enabled ? 'Active' : 'Disabled'}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Flex gap="2">
                                                    <IconButton
                                                        size="2"
                                                        variant="soft"
                                                        onClick={() => {
                                                            setSelectedCommand(command);
                                                            setCommandModalOpen(true);
                                                        }}
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
                                                        onClick={() => handleDeleteCommand(command)}
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
                    </Box>
                </Tabs.Content>

                {/* Settings Tab */}
                <Tabs.Content value="settings">
                    <Box mt="4">
                        <Grid columns={{ initial: '1', md: '2' }} gap="4">
                            <Card style={{
                                background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '24px'
                            }}>
                                <Heading size="3" mb="4">General Settings</Heading>

                                <Flex direction="column" gap="4">
                                    <Box>
                                        <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                            Bot Name
                                        </Text>
                                        <TextField.Root
                                            size="3"
                                            value={settings.bot_name || ''}
                                            onChange={(e) => setSettings({...settings, bot_name: e.target.value})}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                            Welcome Delay (seconds)
                                        </Text>
                                        <TextField.Root
                                            size="3"
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={settings.welcome_delay || 0}
                                            onChange={(e) => setSettings({...settings, welcome_delay: parseInt(e.target.value)})}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                            Typing Delay (seconds)
                                        </Text>
                                        <TextField.Root
                                            size="3"
                                            type="number"
                                            min="0"
                                            max="5"
                                            value={settings.typing_delay || 1}
                                            onChange={(e) => setSettings({...settings, typing_delay: parseInt(e.target.value)})}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                            Max Cart Items
                                        </Text>
                                        <TextField.Root
                                            size="3"
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={settings.max_cart_items || 50}
                                            onChange={(e) => setSettings({...settings, max_cart_items: parseInt(e.target.value)})}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        />
                                    </Box>
                                </Flex>
                            </Card>

                            <Card style={{
                                background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '24px'
                            }}>
                                <Heading size="3" mb="4">Maintenance Mode</Heading>

                                <Flex direction="column" gap="4">
                                    <Card style={{
                                        background: settings.maintenance_mode
                                            ? 'rgba(239, 68, 68, 0.1)'
                                            : 'rgba(16, 185, 129, 0.1)',
                                        border: settings.maintenance_mode
                                            ? '1px solid rgba(239, 68, 68, 0.3)'
                                            : '1px solid rgba(16, 185, 129, 0.3)'
                                    }}>
                                        <Flex align="center" justify="between">
                                            <Box>
                                                <Text size="2" weight="medium" style={{ display: 'block' }}>
                                                    Maintenance Mode
                                                </Text>
                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                                                    {settings.maintenance_mode
                                                        ? 'Bot is in maintenance mode'
                                                        : 'Bot is operational'}
                                                </Text>
                                            </Box>
                                            <Switch
                                                size="3"
                                                checked={settings.maintenance_mode || false}
                                                onCheckedChange={(checked) => setSettings({...settings, maintenance_mode: checked})}
                                            />
                                        </Flex>
                                    </Card>

                                    <Box>
                                        <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                            Maintenance Message
                                        </Text>
                                        <TextArea
                                            placeholder="Message shown when bot is in maintenance mode..."
                                            value={settings.maintenance_message || ''}
                                            onChange={(e) => setSettings({...settings, maintenance_message: e.target.value})}
                                            disabled={!settings.maintenance_mode}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                minHeight: '100px',
                                                opacity: settings.maintenance_mode ? 1 : 0.5
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                                            Session Timeout (seconds)
                                        </Text>
                                        <TextField.Root
                                            size="3"
                                            type="number"
                                            min="300"
                                            max="86400"
                                            value={settings.session_timeout || 3600}
                                            onChange={(e) => setSettings({...settings, session_timeout: parseInt(e.target.value)})}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        />
                                    </Box>

                                    <Button
                                        size="3"
                                        onClick={handleUpdateSettings}
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            marginTop: '16px'
                                        }}
                                    >
                                        <CheckCircledIcon width="18" height="18" />
                                        Save Settings
                                    </Button>
                                </Flex>
                            </Card>
                        </Grid>
                    </Box>
                </Tabs.Content>
            </Tabs.Root>

            {/* Message Editor Modal */}
            <MessageEditorModal
                message={selectedMessage}
                isOpen={messageModalOpen}
                onClose={() => setMessageModalOpen(false)}
                onSave={handleSaveMessage}
            />

            {/* Command Editor Modal */}
            <CommandEditorModal
                command={selectedCommand}
                isOpen={commandModalOpen}
                onClose={() => setCommandModalOpen(false)}
                onSave={handleSaveCommand}
            />
        </Box>
    );
};

export default BotSettings;
