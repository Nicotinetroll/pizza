import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, Flex, Grid, Text, Card, Badge, Button, Switch,
    Heading, TextField, Dialog, ScrollArea, Code, IconButton,
    Separator, TextArea, Tooltip
} from '@radix-ui/themes';
import {
    BellIcon, PaperPlaneIcon, ClockIcon, RocketIcon,
    TrashIcon, PlusIcon, LightningBoltIcon, CheckCircledIcon,
    CrossCircledIcon, GlobeIcon, InfoCircledIcon, MagicWandIcon,
    DownloadIcon, ReloadIcon, FaceIcon, CopyIcon, EyeOpenIcon,
    Pencil1Icon, CheckIcon, Cross2Icon
} from '@radix-ui/react-icons';
import { notificationsAPI } from '../services/api';
import NotificationMedia from './NotificationMedia';

const Notifications = () => {
    const [settings, setSettings] = useState({
        enabled: false,
        channel_id: '',
        delay_min: 60,
        delay_max: 300,
        show_exact_amount: false,
        fake_orders_enabled: false,
        fake_orders_per_hour: 2,
        fake_order_min_amount: 100,
        fake_order_max_amount: 1000
    });
    const [templates, setTemplates] = useState([]);
    const [newTemplate, setNewTemplate] = useState('');
    const [customEmojis, setCustomEmojis] = useState([]);
    const [showEmojiForm, setShowEmojiForm] = useState(false);
    const [emojiPosition, setEmojiPosition] = useState('');
    const [emojiId, setEmojiId] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showTemplateForm, setShowTemplateForm] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('settings');
    const [showTestDialog, setShowTestDialog] = useState(false);
    const [testMessage, setTestMessage] = useState('');
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);

    useEffect(() => {
        fetchSettings();
        fetchLogs();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await notificationsAPI.getSettings();
            setSettings({
                ...data,
                fake_order_min_amount: data.fake_order_min_amount || 100,
                fake_order_max_amount: data.fake_order_max_amount || 3000
            });
            setTemplates(data.message_templates || []);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const data = await notificationsAPI.getLogs();
            setLogs(data.logs || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchSettings();
        fetchLogs();
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            await notificationsAPI.updateSettings(settings);
            alert('✅ Settings saved successfully!');
        } catch (error) {
            alert('❌ Error saving settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const CharacterPositionDisplay = ({ text, onPositionClick }) => {
        const [hoveredPosition, setHoveredPosition] = useState(null);
        
        return (
            <Card style={{ 
                background: 'rgba(139, 92, 246, 0.05)', 
                border: '1px solid rgba(139, 92, 246, 0.2)',
                padding: '12px',
                marginBottom: '12px'
            }}>
                <Text size="2" weight="bold" style={{ 
                    color: '#8b5cf6', 
                    marginBottom: '8px',
                    display: 'block'
                }}>
                    📍 Click character to get position (for custom emoji)
                </Text>
                <Box style={{ 
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    lineHeight: '2.5',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '12px',
                    borderRadius: '4px',
                    overflowX: 'auto',
                    whiteSpace: 'pre'
                }}>
                    {text.split('').map((char, idx) => (
                        <span
                            key={idx}
                            onClick={() => onPositionClick(idx)}
                            onMouseEnter={() => setHoveredPosition(idx)}
                            onMouseLeave={() => setHoveredPosition(null)}
                            style={{
                                cursor: 'pointer',
                                padding: '2px 4px',
                                backgroundColor: hoveredPosition === idx ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                                borderRadius: '2px',
                                position: 'relative',
                                borderBottom: '1px dotted rgba(139, 92, 246, 0.2)'
                            }}
                            title={`Position: ${idx} | Character: "${char}"`}
                        >
                            {char === ' ' ? '␣' : char === '\n' ? '↵\n' : char}
                            <span style={{
                                position: 'absolute',
                                top: '-18px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '9px',
                                color: '#8b5cf6',
                                opacity: hoveredPosition === idx ? 1 : 0.3,
                                fontWeight: hoveredPosition === idx ? 'bold' : 'normal'
                            }}>
                                {idx}
                            </span>
                        </span>
                    ))}
                </Box>
                {hoveredPosition !== null && (
                    <Text size="2" style={{ marginTop: '8px', color: '#8b5cf6' }}>
                        Position {hoveredPosition}: "{text[hoveredPosition]}" 
                        {text[hoveredPosition] === '😈' && ' (perfect for custom emoji!)'}
                    </Text>
                )}
            </Card>
        );
    };

    const calculateEntityOffsets = (text) => {
        const entities = [];
        
        customEmojis.forEach(emoji => {
            if (emoji.position !== undefined && emoji.position >= 0 && emoji.position < text.length) {
                entities.push({
                    offset: emoji.position,
                    length: emoji.length || 2,
                    type: "custom_emoji",
                    custom_emoji_id: emoji.id
                });
            }
        });
        
        return entities;
    };

    const addTemplate = async () => {
        if (!newTemplate.trim()) return;

        try {
            const entities = calculateEntityOffsets(newTemplate);
            
            await notificationsAPI.addTemplate({
                text: newTemplate,
                entities: entities,
                type: 'normal',
                enabled: true
            });
            
            alert('✅ Template added with custom emojis!');
            setNewTemplate('');
            setCustomEmojis([]);
            setShowTemplateForm(false);
            setShowEmojiForm(false);
            fetchSettings();
        } catch (error) {
            alert('❌ Error adding template: ' + error.message);
        }
    };

    const updateTemplate = async () => {
        if (!editingTemplate || editingIndex === null) return;

        try {
            const entities = calculateEntityOffsets(editingTemplate.text);
            
            await notificationsAPI.updateTemplate(editingIndex, {
                text: editingTemplate.text,
                entities: entities,
                type: editingTemplate.type || 'normal',
                enabled: editingTemplate.enabled !== false
            });
            
            alert('✅ Template updated!');
            setEditingTemplate(null);
            setEditingIndex(null);
            setCustomEmojis([]);
            fetchSettings();
        } catch (error) {
            alert('❌ Error updating template: ' + error.message);
        }
    };

    const startEditingTemplate = (template, index) => {
        setEditingTemplate({...template});
        setEditingIndex(index);
        
        // Load existing entities as custom emojis
        if (template.entities && template.entities.length > 0) {
            const emojis = template.entities
                .filter(e => e.type === 'custom_emoji')
                .map(e => ({
                    position: e.offset,
                    id: e.custom_emoji_id,
                    length: e.length || 2
                }));
            setCustomEmojis(emojis);
        }
    };

    const cancelEditing = () => {
        setEditingTemplate(null);
        setEditingIndex(null);
        setCustomEmojis([]);
    };

    const addCustomEmoji = () => {
        const pos = parseInt(emojiPosition);
        if (isNaN(pos) || !emojiId) {
            alert('Please enter valid position and emoji ID');
            return;
        }
        
        setCustomEmojis([...customEmojis, {
            position: pos,
            id: emojiId,
            length: 2
        }]);
        
        setEmojiPosition('');
        setEmojiId('');
        setShowEmojiForm(false);
    };

    const removeCustomEmoji = (index) => {
        setCustomEmojis(customEmojis.filter((_, i) => i !== index));
    };

    const deleteTemplate = async (index) => {
        if (!confirm('Delete this template?')) return;

        try {
            await notificationsAPI.deleteTemplate(index);
            alert('✅ Template deleted!');
            fetchSettings();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const sendFakeOrder = async () => {
        try {
            await notificationsAPI.sendFakeOrder();
            alert('✅ Smart fake order sent!');
            fetchLogs();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const sendTestNotification = async () => {
        try {
            if (testMessage) {
                await notificationsAPI.sendTest(testMessage);
            } else {
                await notificationsAPI.sendTest();
            }
            alert('✅ Test notification sent!');
            setShowTestDialog(false);
            setTestMessage('');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const defaultTemplates = [
        {
            text: "🔥 *BOOM!* {flag} {country} just dropped {amount} on gains\n\n_Another warrior joins the anabolic army_ 💪",
            example: "Simple template with regular emojis"
        },
        {
            text: "😈 *INJECTION COMPLETE* 😈\n\n{flag} {country} secured {amount} in anabolic excellence",
            example: "Template ready for custom emojis at positions 0 and 25",
            customEmojiPositions: [0, 25]
        },
        {
            text: "⚡ *BEAST MODE ACTIVATED*\n\n{country} unleashed {amount} on premium gear {flag}\n\n_Tren hard, eat clen, anavar give up!_ 💯",
            example: "Mixed regular and custom emoji template"
        },
        {
            text: "💀 *{country} KNOWS THE WAY* 💀\n\n{amount} invested in leaving humanity behind {flag}",
            example: "Custom emoji positions: 0 and 28",
            customEmojiPositions: [0, 28]
        },
        {
            text: "🎯 *ORDER SECURED*\n\n{flag} {country} → {amount}\n\n_Another satisfied warrior_ 🔥",
            example: "Clean template with fire emoji"
        }
    ];

    const commonCustomEmojis = [
        { id: "5875309033778322415", name: "Your Custom", preview: "😈" },
        { id: "5877377834838761408", name: "Fire", preview: "🔥" },
        { id: "5875452388063182935", name: "100", preview: "💯" },
        { id: "5877610436388110336", name: "Muscle", preview: "💪" },
        { id: "5875566962267299045", name: "Skull", preview: "💀" }
    ];

    if (loading) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <BellIcon width="32" height="32" style={{ color: '#f59e0b' }} />
                </motion.div>
            </Flex>
        );
    }

    return (
        <Box>
            <Flex align="center" justify="between" mb="6">
                <Box>
                    <Heading size="8" weight="bold" style={{ marginBottom: '8px' }}>
                        Notification Settings
                    </Heading>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Configure public channel notifications with custom emoji support
                    </Text>
                </Box>

                <Flex gap="3">
                    <Button
                        size="3"
                        variant="surface"
                        onClick={() => setShowTestDialog(true)}
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                        }}
                    >
                        <LightningBoltIcon width="18" height="18" />
                        Test Notification
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

            <Flex gap="2" mb="6">
                <Button
                    size="3"
                    variant={activeTab === 'settings' ? 'solid' : 'soft'}
                    onClick={() => setActiveTab('settings')}
                    style={{
                        background: activeTab === 'settings' ? 
                            'linear-gradient(135deg, #f59e0b 0%, #f59e0b90 100%)' : 
                            'rgba(20, 20, 25, 0.6)'
                    }}
                >
                    Settings
                </Button>
                <Button
                    size="3"
                    variant={activeTab === 'media' ? 'solid' : 'soft'}
                    onClick={() => setActiveTab('media')}
                    style={{
                        background: activeTab === 'media' ? 
                            'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 
                            'rgba(20, 20, 25, 0.6)'
                    }}
                >
                    Media Gallery
                </Button>
            </Flex>

            {activeTab === 'settings' ? (
                <>
                    <Grid columns={{ initial: '2', sm: '2', lg: '4' }} gap="4" mb="6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -2 }}
                        >
                            <Card style={{
                                background: 'rgba(20, 20, 25, 0.6)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '20px'
                            }}>
                                <Flex align="center" justify="between">
                                    <Box>
                                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                                            Status
                                        </Text>
                                        <Badge size="3" color={settings.enabled ? 'green' : 'red'}>
                                            {settings.enabled ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </Box>
                                    <Box style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: settings.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {settings.enabled ? (
                                            <CheckCircledIcon width="20" height="20" style={{ color: '#10b981' }} />
                                        ) : (
                                            <CrossCircledIcon width="20" height="20" style={{ color: '#ef4444' }} />
                                        )}
                                    </Box>
                                </Flex>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -2 }}
                        >
                            <Card style={{
                                background: 'rgba(20, 20, 25, 0.6)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '20px'
                            }}>
                                <Flex align="center" justify="between">
                                    <Box>
                                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                                            Templates
                                        </Text>
                                        <Text size="6" weight="bold">
                                            {templates.length}
                                        </Text>
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
                                        <InfoCircledIcon width="20" height="20" style={{ color: '#8b5cf6' }} />
                                    </Box>
                                </Flex>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -2 }}
                        >
                            <Card style={{
                                background: 'rgba(20, 20, 25, 0.6)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '20px'
                            }}>
                                <Flex align="center" justify="between">
                                    <Box>
                                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                                            Fake Orders
                                        </Text>
                                        <Badge size="3" color={settings.fake_orders_enabled ? 'amber' : 'gray'}>
                                            {settings.fake_orders_per_hour}/hour
                                        </Badge>
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
                                        <MagicWandIcon width="20" height="20" style={{ color: '#f59e0b' }} />
                                    </Box>
                                </Flex>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -2 }}
                        >
                            <Card style={{
                                background: 'rgba(20, 20, 25, 0.6)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '20px'
                            }}>
                                <Flex align="center" justify="between">
                                    <Box>
                                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                                            Recent Sent
                                        </Text>
                                        <Text size="6" weight="bold">
                                            {logs.length}
                                        </Text>
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
                                        <PaperPlaneIcon width="20" height="20" style={{ color: '#10b981' }} />
                                    </Box>
                                </Flex>
                            </Card>
                        </motion.div>
                    </Grid>

                    <Card style={{
                        background: 'rgba(20, 20, 25, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '24px',
                        marginBottom: '24px'
                    }}>
                        <Flex align="center" gap="3" mb="4">
                            <Box style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #f59e0b90 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <BellIcon width="20" height="20" />
                            </Box>
                            <Heading size="4">Public Channel Settings</Heading>
                        </Flex>

                        <Grid columns={{ initial: '1', md: '2' }} gap="4">
                            <Box>
                                <Flex direction="column" gap="4">
                                    <Flex align="center" justify="between" style={{
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '8px'
                                    }}>
                                        <Text size="2">Enable Notifications</Text>
                                        <Switch
                                            checked={settings.enabled}
                                            onCheckedChange={(checked) => setSettings({...settings, enabled: checked})}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </Flex>

                                    <Box>
                                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', display: 'block' }}>
                                            Channel/Group ID
                                        </Text>
                                        <TextField.Root
                                            placeholder="e.g., -1001234567890"
                                            value={settings.channel_id || ''}
                                            onChange={(e) => setSettings({...settings, channel_id: e.target.value})}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.03)'
                                            }}
                                        />
                                    </Box>

                                    <Flex align="center" justify="between" style={{
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '8px'
                                    }}>
                                        <Text size="2">Show Exact Amounts</Text>
                                        <Switch
                                            checked={settings.show_exact_amount}
                                            onCheckedChange={(checked) => setSettings({...settings, show_exact_amount: checked})}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </Flex>
                                </Flex>
                            </Box>

                            <Box>
                                <Flex direction="column" gap="4">
                                    <Box>
                                        <Flex align="center" gap="2" mb="2">
                                            <ClockIcon width="14" height="14" style={{ opacity: 0.6 }} />
                                            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                                Random Delay (seconds)
                                            </Text>
                                        </Flex>
                                        <Flex gap="2" align="center">
                                            <TextField.Root
                                                type="number"
                                                placeholder="Min"
                                                value={settings.delay_min}
                                                onChange={(e) => setSettings({...settings, delay_min: parseInt(e.target.value) || 0})}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    width: '100px'
                                                }}
                                            />
                                            <Text size="2" style={{ opacity: 0.6 }}>to</Text>
                                            <TextField.Root
                                                type="number"
                                                placeholder="Max"
                                                value={settings.delay_max}
                                                onChange={(e) => setSettings({...settings, delay_max: parseInt(e.target.value) || 0})}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    width: '100px'
                                                }}
                                            />
                                        </Flex>
                                    </Box>

                                    <Button
                                        size="3"
                                        onClick={saveSettings}
                                        disabled={saving}
                                        style={{
                                            background: 'linear-gradient(135deg, #f59e0b 0%, #f59e0b90 100%)',
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            opacity: saving ? 0.5 : 1
                                        }}
                                    >
                                        {saving ? 'Saving...' : 'Save All Settings'}
                                    </Button>
                                </Flex>
                            </Box>
                        </Grid>
                    </Card>

                    <Card style={{
                        background: 'rgba(20, 20, 25, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        padding: '24px',
                        marginBottom: '24px'
                    }}>
                        <Flex align="center" gap="3" mb="4">
                            <Box style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <MagicWandIcon width="20" height="20" />
                            </Box>
                            <Heading size="4">Smart Fake Orders</Heading>
                        </Flex>

                        <Grid columns={{ initial: '1', md: '2' }} gap="4">
                            <Box>
                                <Flex direction="column" gap="4">
                                    <Flex align="center" justify="between" style={{
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '8px'
                                    }}>
                                        <Text size="2">Enable Automatic Fake Orders</Text>
                                        <Switch
                                            checked={settings.fake_orders_enabled}
                                            onCheckedChange={(checked) => setSettings({...settings, fake_orders_enabled: checked})}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </Flex>

                                    <Box>
                                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', display: 'block' }}>
                                            Orders Per Hour
                                        </Text>
                                        <TextField.Root
                                            type="number"
                                            min="0"
                                            value={settings.fake_orders_per_hour}
                                            onChange={(e) => setSettings({...settings, fake_orders_per_hour: parseInt(e.target.value) || 0})}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.03)'
                                            }}
                                        />
                                    </Box>

                                    <Box>
                                        <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px', display: 'block' }}>
                                            Amount Range ($)
                                        </Text>
                                        <Flex gap="2" align="center">
                                            <TextField.Root
                                                type="number"
                                                min="0"
                                                placeholder="Min"
                                                value={settings.fake_order_min_amount}
                                                onChange={(e) => setSettings({...settings, fake_order_min_amount: parseInt(e.target.value) || 100})}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)'
                                                }}
                                            />
                                            <Text size="2" style={{ opacity: 0.6 }}>to</Text>
                                            <TextField.Root
                                                type="number"
                                                min="0"
                                                placeholder="Max"
                                                value={settings.fake_order_max_amount}
                                                onChange={(e) => setSettings({...settings, fake_order_max_amount: parseInt(e.target.value) || 3000})}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)'
                                                }}
                                            />
                                        </Flex>
                                    </Box>
                                </Flex>
                            </Box>

                            <Box>
                                <Flex direction="column" gap="3">
                                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                        Manual Test
                                    </Text>

                                    <Button
                                        size="3"
                                        onClick={sendFakeOrder}
                                        style={{
                                            background: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <LightningBoltIcon width="18" height="18" />
                                        Send Smart Fake Order Now
                                    </Button>

                                    <Button
                                        size="3"
                                        onClick={saveSettings}
                                        disabled={saving}
                                        variant="soft"
                                        color="green"
                                        style={{
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            opacity: saving ? 0.5 : 1
                                        }}
                                    >
                                        Save Fake Order Settings
                                    </Button>
                                </Flex>
                            </Box>
                        </Grid>
                    </Card>

                    <Card style={{
                        background: 'rgba(20, 20, 25, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '24px',
                        marginBottom: '24px'
                    }}>
                        <Flex align="center" justify="between" mb="4">
                            <Flex align="center" gap="3">
                                <Box style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <FaceIcon width="20" height="20" />
                                </Box>
                                <Heading size="4">Notification Messages with Custom Emojis</Heading>
                            </Flex>

                            <Button
                                size="2"
                                onClick={() => setShowTemplateForm(!showTemplateForm)}
                                style={{
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                    cursor: 'pointer'
                                }}
                            >
                                <PlusIcon width="16" height="16" />
                                Add Custom Message
                            </Button>
                        </Flex>

                        <AnimatePresence>
                            {showTemplateForm && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Card style={{
                                        background: 'rgba(139, 92, 246, 0.05)',
                                        border: '1px solid rgba(139, 92, 246, 0.2)',
                                        marginBottom: '16px',
                                        padding: '16px'
                                    }}>
                                        <TextArea
                                            placeholder="Create epic message... Use {amount}, {country}, {flag} as variables"
                                            value={newTemplate}
                                            onChange={(e) => setNewTemplate(e.target.value)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                minHeight: '100px',
                                                marginBottom: '12px'
                                            }}
                                        />

                                        {/* Position Helper */}
                                        {newTemplate && (
                                            <CharacterPositionDisplay 
                                                text={newTemplate}
                                                onPositionClick={(position) => {
                                                    setEmojiPosition(position.toString());
                                                    setShowEmojiForm(true);
                                                }}
                                            />
                                        )}

                                        {/* Custom Emoji Section */}
                                        <Card style={{
                                            background: 'rgba(139, 92, 246, 0.1)',
                                            border: '1px solid rgba(139, 92, 246, 0.15)',
                                            padding: '12px',
                                            marginBottom: '12px'
                                        }}>
                                            <Flex align="center" justify="between" mb="3">
                                                <Text size="2" weight="bold" style={{ color: '#8b5cf6' }}>
                                                    🎨 Custom Emoji Configuration
                                                </Text>
                                                <Button
                                                    size="1"
                                                    variant="soft"
                                                    onClick={() => setShowEmojiForm(!showEmojiForm)}
                                                >
                                                    {showEmojiForm ? 'Hide' : 'Add'} Custom Emoji
                                                </Button>
                                            </Flex>

                                            {showEmojiForm && (
                                                <Card style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    padding: '12px',
                                                    marginBottom: '12px'
                                                }}>
                                                    <Grid columns="2" gap="3" mb="3">
                                                        <Box>
                                                            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', display: 'block' }}>
                                                                Position in text
                                                            </Text>
                                                            <TextField.Root
                                                                placeholder="e.g., 0"
                                                                type="number"
                                                                value={emojiPosition}
                                                                onChange={(e) => setEmojiPosition(e.target.value)}
                                                                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                                            />
                                                        </Box>
                                                        <Box>
                                                            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px', display: 'block' }}>
                                                                Custom Emoji ID
                                                            </Text>
                                                            <TextField.Root
                                                                placeholder="e.g., 5875309033778322415"
                                                                value={emojiId}
                                                                onChange={(e) => setEmojiId(e.target.value)}
                                                                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                                            />
                                                        </Box>
                                                    </Grid>

                                                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px', display: 'block' }}>
                                                        Quick Select Common Emojis:
                                                    </Text>
                                                    <Flex gap="2" wrap="wrap" mb="3">
                                                        {commonCustomEmojis.map((emoji) => (
                                                            <Tooltip content={`ID: ${emoji.id}`} key={emoji.id}>
                                                                <Button
                                                                    size="1"
                                                                    variant="soft"
                                                                    onClick={() => setEmojiId(emoji.id)}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    {emoji.preview} {emoji.name}
                                                                </Button>
                                                            </Tooltip>
                                                        ))}
                                                    </Flex>

                                                    <Button
                                                        size="2"
                                                        onClick={addCustomEmoji}
                                                        color="green"
                                                        style={{ width: '100%' }}
                                                    >
                                                        Add This Emoji
                                                    </Button>
                                                </Card>
                                            )}

                                            {customEmojis.length > 0 && (
                                                <Box>
                                                    <Text size="2" style={{ marginBottom: '8px', display: 'block' }}>
                                                        Added Custom Emojis:
                                                    </Text>
                                                    <Flex gap="2" wrap="wrap">
                                                        {customEmojis.map((emoji, idx) => (
                                                            <Badge 
                                                                key={idx} 
                                                                size="2"
                                                                style={{ 
                                                                    padding: '4px 8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                Pos: {emoji.position} | ID: {emoji.id.substring(0, 8)}...
                                                                <IconButton
                                                                    size="1"
                                                                    variant="ghost"
                                                                    color="red"
                                                                    onClick={() => removeCustomEmoji(idx)}
                                                                    style={{ marginLeft: '4px', cursor: 'pointer' }}
                                                                >
                                                                    <CrossCircledIcon width="12" height="12" />
                                                                </IconButton>
                                                            </Badge>
                                                        ))}
                                                    </Flex>
                                                </Box>
                                            )}
                                        </Card>

                                        <details style={{ marginBottom: '12px' }}>
                                            <summary style={{
                                                cursor: 'pointer',
                                                color: 'rgba(255, 255, 255, 0.6)',
                                                fontSize: '14px',
                                                marginBottom: '8px'
                                            }}>
                                                View Example Templates (click to use)
                                            </summary>
                                            <ScrollArea style={{ maxHeight: '200px', marginTop: '8px' }}>
                                                <Flex direction="column" gap="2">
                                                    {defaultTemplates.map((template, i) => (
                                                        <Card
                                                            key={i}
                                                            onClick={() => setNewTemplate(template.text)}
                                                            style={{
                                                                padding: '12px',
                                                                background: 'rgba(255, 255, 255, 0.03)',
                                                                cursor: 'pointer',
                                                                borderLeft: '3px solid #8b5cf6',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                            }}
                                                        >
                                                            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                                                                {template.text.substring(0, 100)}...
                                                            </Text>
                                                            <Text size="1" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>
                                                                {template.example}
                                                            </Text>
                                                            {template.customEmojiPositions && (
                                                                <Badge size="1" color="purple" style={{ marginTop: '4px' }}>
                                                                    Custom emoji ready at positions: {template.customEmojiPositions.join(', ')}
                                                                </Badge>
                                                            )}
                                                        </Card>
                                                    ))}
                                                </Flex>
                                            </ScrollArea>
                                        </details>

                                        <Flex gap="3">
                                            <Button
                                                size="2"
                                                onClick={addTemplate}
                                                color="green"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                Save Template
                                            </Button>
                                            <Button
                                                size="2"
                                                variant="soft"
                                                onClick={() => {
                                                    setShowTemplateForm(false);
                                                    setNewTemplate('');
                                                    setCustomEmojis([]);
                                                    setShowEmojiForm(false);
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </Flex>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {templates.length === 0 ? (
                            <Card style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                textAlign: 'center',
                                padding: '40px'
                            }}>
                                <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    No custom templates yet. System uses default epic messages!
                                </Text>
                            </Card>
                        ) : (
                            <ScrollArea style={{ maxHeight: '400px' }}>
                                <Flex direction="column" gap="3">
                                    {templates.map((template, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            {editingIndex === index ? (
                                                // Edit Mode
                                                <Card style={{
                                                    background: 'rgba(139, 92, 246, 0.1)',
                                                    border: '2px solid rgba(139, 92, 246, 0.3)',
                                                    padding: '16px'
                                                }}>
                                                    <TextArea
                                                        value={editingTemplate.text}
                                                        onChange={(e) => setEditingTemplate({...editingTemplate, text: e.target.value})}
                                                        style={{
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            minHeight: '100px',
                                                            marginBottom: '12px'
                                                        }}
                                                    />

                                                    {editingTemplate.text && (
                                                        <CharacterPositionDisplay 
                                                            text={editingTemplate.text}
                                                            onPositionClick={(position) => {
                                                                setEmojiPosition(position.toString());
                                                                setShowEmojiForm(true);
                                                            }}
                                                        />
                                                    )}

                                                    {customEmojis.length > 0 && (
                                                        <Box mb="3">
                                                            <Text size="2" style={{ marginBottom: '8px', display: 'block' }}>
                                                                Custom Emojis:
                                                            </Text>
                                                            <Flex gap="2" wrap="wrap">
                                                                {customEmojis.map((emoji, idx) => (
                                                                    <Badge key={idx} size="2">
                                                                        Pos: {emoji.position} | ID: {emoji.id.substring(0, 8)}...
                                                                        <IconButton
                                                                            size="1"
                                                                            variant="ghost"
                                                                            color="red"
                                                                            onClick={() => removeCustomEmoji(idx)}
                                                                            style={{ marginLeft: '4px', cursor: 'pointer' }}
                                                                        >
                                                                            <CrossCircledIcon width="12" height="12" />
                                                                        </IconButton>
                                                                    </Badge>
                                                                ))}
                                                            </Flex>
                                                        </Box>
                                                    )}

                                                    <Flex gap="2">
                                                        <Button
                                                            size="2"
                                                            onClick={updateTemplate}
                                                            color="green"
                                                        >
                                                            <CheckIcon width="14" height="14" />
                                                            Save Changes
                                                        </Button>
                                                        <Button
                                                            size="2"
                                                            variant="soft"
                                                            onClick={cancelEditing}
                                                        >
                                                            <Cross2Icon width="14" height="14" />
                                                            Cancel
                                                        </Button>
                                                    </Flex>
                                                </Card>
                                            ) : (
                                                // View Mode
                                                <Card style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    padding: '16px'
                                                }}>
                                                    <Flex justify="between" align="start" gap="3">
                                                        <Box style={{ flex: 1 }}>
                                                            <Code size="1" style={{
                                                                color: 'rgba(255, 255, 255, 0.7)',
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                                display: 'block',
                                                                marginBottom: '8px'
                                                            }}>
                                                                {template.text}
                                                            </Code>
                                                            {template.entities && template.entities.length > 0 && (
                                                                <Flex gap="2" wrap="wrap">
                                                                    {template.entities.map((entity, idx) => (
                                                                        <Badge key={idx} size="1" color="purple">
                                                                            {entity.type === 'custom_emoji' ? '🎨' : '📝'} 
                                                                            Pos: {entity.offset}
                                                                        </Badge>
                                                                    ))}
                                                                </Flex>
                                                            )}
                                                        </Box>
                                                        <Flex gap="2">
                                                            <IconButton
                                                                size="2"
                                                                variant="soft"
                                                                color="blue"
                                                                onClick={() => startEditingTemplate(template, index)}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                <Pencil1Icon width="14" height="14" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="2"
                                                                variant="soft"
                                                                color="red"
                                                                onClick={() => deleteTemplate(index)}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                <TrashIcon width="14" height="14" />
                                                            </IconButton>
                                                        </Flex>
                                                    </Flex>
                                                </Card>
                                            )}
                                        </motion.div>
                                    ))}
                                </Flex>
                            </ScrollArea>
                        )}
                    </Card>

                    <Card style={{
                        background: 'rgba(20, 20, 25, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '24px'
                    }}>
                        <Flex align="center" gap="3" mb="4">
                            <Box style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <ClockIcon width="20" height="20" />
                            </Box>
                            <Heading size="4">Recent Notifications</Heading>
                        </Flex>

                        {logs.length === 0 ? (
                            <Card style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                textAlign: 'center',
                                padding: '40px'
                            }}>
                                <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    No notifications sent yet
                                </Text>
                            </Card>
                        ) : (
                            <ScrollArea style={{ maxHeight: '400px' }}>
                                <Flex direction="column" gap="2">
                                    {logs.map((log, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.02 }}
                                        >
                                            <Card style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                padding: '12px'
                                            }}>
                                                <Flex align="center" justify="between">
                                                    <Flex align="center" gap="3">
                                                        <Badge
                                                            size="2"
                                                            color={log.type === 'fake_order' ? 'amber' : 'green'}
                                                        >
                                                            {log.type === 'fake_order' ? '🎭 Fake' : '✅ Real'}
                                                        </Badge>

                                                        {log.amount && (
                                                            <Text size="2" weight="bold" style={{ color: '#8b5cf6' }}>
                                                                ${log.amount.toFixed(2)}
                                                            </Text>
                                                        )}

                                                        {log.country && (
                                                            <Flex align="center" gap="1">
                                                                <GlobeIcon width="14" height="14" style={{ opacity: 0.6 }} />
                                                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                                                    {log.country}
                                                                </Text>
                                                            </Flex>
                                                        )}

                                                        {log.entities && log.entities.length > 0 && (
                                                            <Badge size="1" color="purple">
                                                                🎨 Custom
                                                            </Badge>
                                                        )}
                                                    </Flex>

                                                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                                        {new Date(log.sent_at).toLocaleString()}
                                                    </Text>
                                                </Flex>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </Flex>
                            </ScrollArea>
                        )}
                    </Card>

                    {/* Test Notification Dialog */}
                    <Dialog.Root open={showTestDialog} onOpenChange={setShowTestDialog}>
                        <Dialog.Content style={{ maxWidth: 450 }}>
                            <Dialog.Title>Send Test Notification</Dialog.Title>
                            <Dialog.Description size="2" mb="4">
                                Send a test notification to your channel to verify everything works.
                            </Dialog.Description>

                            <TextArea
                                placeholder="Custom test message (optional)... Leave empty for default test"
                                value={testMessage}
                                onChange={(e) => setTestMessage(e.target.value)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    minHeight: '100px',
                                    marginBottom: '16px'
                                }}
                            />

                            <Flex gap="3" mt="4" justify="end">
                                <Dialog.Close>
                                    <Button variant="soft" color="gray">
                                        Cancel
                                    </Button>
                                </Dialog.Close>
                                <Button onClick={sendTestNotification} color="green">
                                    Send Test
                                </Button>
                            </Flex>
                        </Dialog.Content>
                    </Dialog.Root>
                </>
            ) : (
                <NotificationMedia />
            )}
        </Box>
    );
};

export default Notifications;