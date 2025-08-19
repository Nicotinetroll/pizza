import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, Flex, Text, Card, Badge, Button, TextField, IconButton,
    Heading, Avatar, ScrollArea, Separator, TextArea, DropdownMenu,
    Dialog, Tooltip
} from '@radix-ui/themes';
import {
    PaperPlaneIcon, MagnifyingGlassIcon, ReloadIcon, TrashIcon,
    PersonIcon, ClockIcon, CheckIcon, DoubleArrowUpIcon,
    ChatBubbleIcon, BellIcon, DotsHorizontalIcon, StarIcon,
    ExclamationTriangleIcon, LockClosedIcon
} from '@radix-ui/react-icons';
import { chatAPI } from '../services/api';

// WebSocket Manager Class - simplified and more robust
class ChatWebSocketManager {
    constructor(onMessage) {
        this.ws = null;
        this.onMessage = onMessage;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.pingInterval = null;
        this.isIntentionalDisconnect = false;
        this.connectionPromise = null;
    }

    async connect() {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve) => {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No token found, skipping WebSocket connection');
                resolve(false);
                return;
            }

            try {
                // Parse token to get email
                const payload = JSON.parse(atob(token.split('.')[1]));
                const email = payload.email;

                // Build WebSocket URL - smart detection
                const isLocalDev = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';

                let wsUrl;
                if (isLocalDev) {
                    // Local development - use localhost:3000 with Vite proxy
                    wsUrl = `ws://localhost:3000/ws/chat/${encodeURIComponent(email)}`;
                } else {
                    // Production or remote access - use the actual host
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    const host = window.location.hostname;
                    const port = window.location.port ? `:${window.location.port}` : '';
                    wsUrl = `${protocol}//${host}${port}/ws/chat/${encodeURIComponent(email)}`;
                }

                console.log('🔌 Connecting to WebSocket:', wsUrl);

                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('✅ Chat WebSocket connected successfully');
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;

                    // Start ping to keep alive
                    this.pingInterval = setInterval(() => {
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({ type: 'ping' }));
                        }
                    }, 30000);

                    resolve(true);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('📨 WebSocket message received:', data);

                        if (data.type !== 'pong' && this.onMessage) {
                            this.onMessage(data);
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                this.ws.onclose = (event) => {
                    console.log('🔌 WebSocket disconnected', event.code, event.reason);
                    this.cleanup();
                    this.connectionPromise = null;

                    if (!this.isIntentionalDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        setTimeout(() => this.reconnect(), this.reconnectDelay);
                    }

                    resolve(false);
                };

                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket error:', error);
                    this.connectionPromise = null;
                    resolve(false);
                };

            } catch (error) {
                console.error('Error setting up WebSocket:', error);
                this.connectionPromise = null;
                resolve(false);
            }
        });

        return this.connectionPromise;
    }

    async reconnect() {
        if (this.isIntentionalDisconnect) return;

        this.reconnectAttempts++;
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);

        console.log(`🔄 Reconnecting WebSocket (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        await this.connect();
    }

    cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    disconnect() {
        this.isIntentionalDisconnect = true;
        this.cleanup();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

const Chat = () => {
    // State
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sending, setSending] = useState(false);
    const [typing, setTyping] = useState(false);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [quickReplies, setQuickReplies] = useState([]);
    const [stats, setStats] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const wsManagerRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const selectedConversationRef = useRef(null);

    // Update ref when selectedConversation changes
    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
    }, [selectedConversation]);

    // WebSocket message handler - memoized without dependencies
    const handleWebSocketMessage = useCallback((data) => {
        console.log('📨 Processing WebSocket message:', data);

        if (data.type === 'new_message' && data.message) {
            const message = data.message;

            // ALWAYS update conversations list
            setConversations(prev => {
                const updatedConvs = [...prev];
                const convIndex = updatedConvs.findIndex(c => c.telegram_id === message.telegram_id);

                if (convIndex >= 0) {
                    // Update existing conversation
                    const updatedConv = {
                        ...updatedConvs[convIndex],
                        last_message: message.message,
                        last_message_time: message.timestamp
                    };

                    // Increment unread only if incoming and not selected
                    if (message.direction === 'incoming') {
                        const currentSelected = selectedConversationRef.current;
                        if (!currentSelected || currentSelected.telegram_id !== message.telegram_id) {
                            updatedConv.unread_count = (updatedConvs[convIndex].unread_count || 0) + 1;
                        }
                    }

                    updatedConvs[convIndex] = updatedConv;
                    // Move to top
                    const [updated] = updatedConvs.splice(convIndex, 1);
                    updatedConvs.unshift(updated);
                } else if (message.direction === 'incoming') {
                    // New conversation for incoming messages
                    updatedConvs.unshift({
                        telegram_id: message.telegram_id,
                        username: message.username || `user${message.telegram_id}`,
                        first_name: message.first_name || '',
                        last_name: message.last_name || '',
                        last_message: message.message,
                        last_message_time: message.timestamp,
                        unread_count: 1,
                        total_messages: 1
                    });
                }

                return updatedConvs;
            });

            // ALWAYS update messages if this conversation is selected
            const currentSelected = selectedConversationRef.current;
            if (currentSelected && currentSelected.telegram_id === message.telegram_id) {
                setMessages(prev => {
                    // Avoid duplicates by checking _id
                    const exists = prev.some(m => m._id === message._id);
                    if (!exists) {
                        console.log('✅ Adding new message to chat');
                        return [...prev, message];
                    }
                    return prev;
                });

                // Auto-mark as read if incoming to selected conversation
                if (message.direction === 'incoming') {
                    chatAPI.markAsRead(message.telegram_id).catch(console.error);
                    // Update unread count to 0
                    setConversations(prev =>
                        prev.map(conv =>
                            conv.telegram_id === message.telegram_id
                                ? { ...conv, unread_count: 0 }
                                : conv
                        )
                    );
                }
            }

            // Show notification only for messages not in selected conversation
            if (message.direction === 'incoming') {
                const currentSelected = selectedConversationRef.current;
                if (!currentSelected || currentSelected.telegram_id !== message.telegram_id) {
                    // Browser notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(`New message from @${message.username || 'User'}`, {
                            body: message.message.substring(0, 100),
                            icon: '/icon.png',
                            tag: `msg-${message.telegram_id}`
                        });
                    }

                    // Play sound
                    try {
                        const audio = new Audio('/notification.mp3');
                        audio.volume = 0.3;
                        audio.play().catch(() => {});
                    } catch (e) {}
                }
            }

            // Update stats for unread messages
            setStats(prev => {
                if (!prev) return prev;

                if (message.direction === 'incoming') {
                    const currentSelected = selectedConversationRef.current;
                    if (!currentSelected || currentSelected.telegram_id !== message.telegram_id) {
                        return {
                            ...prev,
                            unread_messages: (prev.unread_messages || 0) + 1,
                            today_messages: (prev.today_messages || 0) + 1
                        };
                    }
                }
                return prev;
            });
        } else if (data.type === 'messages_read') {
            // Mark conversation as read
            setConversations(prev =>
                prev.map(conv =>
                    conv.telegram_id === data.telegram_id
                        ? { ...conv, unread_count: 0 }
                        : conv
                )
            );
        }
    }, []); // No dependencies - use refs for latest values

    // Long polling for instant updates when new messages arrive
    useEffect(() => {
        let mounted = true;

        const waitForMessages = async () => {
            while (mounted) {
                try {
                    const response = await fetch('/api/chat/wait-for-messages?timeout=30', {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch');
                    }

                    const data = await response.json();

                    if (data.new_message && mounted) {
                        console.log('📨 New message notification received! Refreshing...');

                        // Refresh conversations list
                        const convResponse = await chatAPI.getConversations(unreadOnly);
                        setConversations(convResponse.conversations);

                        // If message is for selected conversation, refresh messages
                        if (selectedConversationRef.current &&
                            selectedConversationRef.current.telegram_id === data.telegram_id) {
                            const msgResponse = await chatAPI.getMessages(data.telegram_id);
                            setMessages(msgResponse.messages);
                        }
                    }
                } catch (error) {
                    // Silently handle errors and retry
                    console.log('Long polling reconnecting...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        };

        // Start long polling
        waitForMessages();

        return () => {
            mounted = false;
        };
    }, []);
    

    // Initialize data on mount
    useEffect(() => {
        let mounted = true;

        const initializeApp = async () => {
            if (!mounted) return;

            // Load initial data
            await fetchConversations();
            await fetchQuickReplies();
            await fetchStats();
        };

        initializeApp();

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => {
            mounted = false;
        };
    }, []); // Empty dependency array - run only once on mount

    // Auto-scroll to bottom when new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

// Auto-scroll to bottom when new messages
useEffect(() => {
    scrollToBottom();
}, [messages]);

const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
};

const fetchConversations = async () => {
    try {
        const response = await chatAPI.getConversations(unreadOnly);
        setConversations(response.conversations);
        return response.conversations;
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
    } finally {
        setLoading(false);
    }
};

const fetchQuickReplies = async () => {
    try {
        const response = await chatAPI.getQuickReplies();
        setQuickReplies(response.replies);
    } catch (error) {
        console.error('Error fetching quick replies:', error);
    }
};

const fetchStats = async () => {
    try {
        const response = await chatAPI.getStats();
        setStats(response);
        return response;
    } catch (error) {
        console.error('Error fetching stats:', error);
        return null;
    }
};

const fetchMessagesForConversation = async (telegramId) => {
    try {
        const response = await chatAPI.getMessages(telegramId);
        if (selectedConversationRef.current?.telegram_id === telegramId) {
            setMessages(response.messages);
        }
        return response.messages;
    } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
    }
};

const handleRefresh = async () => {
    setRefreshing(true);

    try {
        // Refresh everything
        const [newConversations, newStats] = await Promise.all([
            fetchConversations(),
            fetchStats()
        ]);

        // Refresh messages for selected conversation
        if (selectedConversation) {
            await fetchMessagesForConversation(selectedConversation.telegram_id);
        }

        // Try to reconnect WebSocket if disconnected
        if (wsManagerRef.current && !wsManagerRef.current.isConnected()) {
            const connected = await wsManagerRef.current.connect();
            setWsConnected(connected);
        }

        console.log('✅ Refresh complete');
    } catch (error) {
        console.error('Error during refresh:', error);
    } finally {
        setRefreshing(false);
    }
};

const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    selectedConversationRef.current = conversation;

    try {
        const response = await chatAPI.getMessages(conversation.telegram_id);
        setMessages(response.messages);

        // Mark as read
        if (conversation.unread_count > 0) {
            await chatAPI.markAsRead(conversation.telegram_id);

            // Update local state
            setConversations(prev =>
                prev.map(conv =>
                    conv.telegram_id === conversation.telegram_id
                        ? { ...conv, unread_count: 0 }
                        : conv
                )
            );

            // Update stats
            if (stats) {
                setStats(prev => ({
                    ...prev,
                    unread_messages: Math.max(0, (prev.unread_messages || 0) - conversation.unread_count)
                }));
            }
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
};

const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const tempId = 'temp-' + Date.now();
    const tempMessage = {
        _id: tempId,
        telegram_id: selectedConversation.telegram_id,
        message: messageInput,
        direction: 'outgoing',
        timestamp: new Date().toISOString(),
        read: true
    };

    // Optimistically add message
    setMessages(prev => [...prev, tempMessage]);
    setConversations(prev =>
        prev.map(c =>
            c.telegram_id === selectedConversation.telegram_id
                ? { ...c, last_message: messageInput, last_message_time: tempMessage.timestamp }
                : c
        )
    );

    const messageText = messageInput;
    setMessageInput('');
    setSending(true);

    try {
        const response = await chatAPI.sendMessage(selectedConversation.telegram_id, messageText);
        console.log('✅ Message sent successfully');

        // Replace temp message ID with real one
        if (response.message_id) {
            setMessages(prev =>
                prev.map(m =>
                    m._id === tempId
                        ? { ...m, _id: response.message_id }
                        : m
                )
            );
        }
    } catch (error) {
        console.error('❌ Error sending message:', error);
        // Remove optimistic message
        setMessages(prev => prev.filter(m => m._id !== tempId));
        setMessageInput(messageText);
        alert('Failed to send message');
    } finally {
        setSending(false);
    }
};

const handleTyping = () => {
    if (!typing) {
        setTyping(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
    }, 1000);
};

const deleteConversation = async (telegramId) => {
    if (!confirm('Delete entire conversation?')) return;

    try {
        await chatAPI.deleteConversation(telegramId);
        fetchConversations();
        if (selectedConversation?.telegram_id === telegramId) {
            setSelectedConversation(null);
            selectedConversationRef.current = null;
            setMessages([]);
        }
    } catch (error) {
        console.error('Error deleting conversation:', error);
    }
};

// Filter conversations by search
const filteredConversations = conversations.filter(conv =>
    conv.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
);

// Format time
const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
};

if (loading) {
    return (
        <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
                <ChatBubbleIcon width="32" height="32" style={{ color: '#8b5cf6' }} />
            </motion.div>
        </Flex>
    );
}

return (
    <Box style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Flex align="center" justify="between" mb="4">
            <Box>
                <Heading size="8" weight="bold" style={{ marginBottom: '8px' }}>
                    Customer Chat
                </Heading>
                <Flex align="center" gap="3">
                    {stats && (
                        <>
                            <Badge size="2" color="blue">
                                {stats.total_conversations} Conversations
                            </Badge>
                            <Badge size="2" color="red">
                                {stats.unread_messages} Unread
                            </Badge>
                            <Badge size="2" color="green">
                                {stats.today_messages} Today
                            </Badge>
                            {wsConnected && (
                                <Badge size="2" color="green">
                                    🟢 Live
                                </Badge>
                            )}
                        </>
                    )}
                </Flex>
            </Box>

            <Button
                size="3"
                variant="surface"
                onClick={handleRefresh}
                disabled={refreshing}
                style={{
                    background: refreshing
                        ? 'rgba(139, 92, 246, 0.2)'
                        : 'rgba(20, 20, 25, 0.6)',
                    border: refreshing
                        ? '1px solid rgba(139, 92, 246, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: refreshing ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    transform: refreshing ? 'scale(0.98)' : 'scale(1)'
                }}
            >
                <ReloadIcon width="18" height="18" style={{
                    opacity: refreshing ? 0.7 : 1
                }} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
        </Flex>

        {/* Main Chat Container */}
        <Card style={{
            background: 'rgba(20, 20, 25, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            flex: 1,
            padding: 0,
            display: 'flex',
            overflow: 'hidden'
        }}>
            <Flex style={{ height: '100%', width: '100%' }}>
                {/* Conversations Sidebar */}
                <Box style={{
                    width: '320px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Search */}
                    <Box style={{ padding: '16px' }}>
                        <TextField.Root
                            placeholder="Search conversations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                        >
                            <TextField.Slot>
                                <MagnifyingGlassIcon height="16" width="16" />
                            </TextField.Slot>
                        </TextField.Root>

                        <Flex align="center" justify="between" mt="3">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={unreadOnly}
                                    onChange={(e) => {
                                        setUnreadOnly(e.target.checked);
                                        fetchConversations();
                                    }}
                                />
                                <Text size="2">Unread only</Text>
                            </label>
                        </Flex>
                    </Box>

                    <Separator />

                    {/* Conversations List */}
                    <ScrollArea style={{ flex: 1 }}>
                        <Box style={{ padding: '8px' }}>
                            {filteredConversations.length === 0 ? (
                                <Text size="2" style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    padding: '20px',
                                    color: 'rgba(255, 255, 255, 0.5)'
                                }}>
                                    No conversations found
                                </Text>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <motion.div
                                        key={conv.telegram_id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Card
                                            onClick={() => selectConversation(conv)}
                                            style={{
                                                background: selectedConversation?.telegram_id === conv.telegram_id
                                                    ? 'rgba(139, 92, 246, 0.1)'
                                                    : 'rgba(255, 255, 255, 0.03)',
                                                border: selectedConversation?.telegram_id === conv.telegram_id
                                                    ? '1px solid rgba(139, 92, 246, 0.3)'
                                                    : '1px solid transparent',
                                                marginBottom: '8px',
                                                cursor: 'pointer',
                                                padding: '12px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Flex align="start" justify="between">
                                                <Flex align="center" gap="3">
                                                    <Avatar
                                                        size="3"
                                                        fallback={conv.username?.slice(0, 2).toUpperCase() || 'U'}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                                                        }}
                                                    />
                                                    <Box>
                                                        <Flex align="center" gap="2">
                                                            <Text size="2" weight="medium">
                                                                @{conv.username || `user${conv.telegram_id}`}
                                                            </Text>
                                                            {conv.unread_count > 0 && (
                                                                <Badge size="1" color="red">
                                                                    {conv.unread_count}
                                                                </Badge>
                                                            )}
                                                        </Flex>
                                                        <Text size="1" style={{
                                                            color: 'rgba(255, 255, 255, 0.5)',
                                                            display: 'block',
                                                            marginTop: '2px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '180px'
                                                        }}>
                                                            {conv.last_message || 'No messages'}
                                                        </Text>
                                                    </Box>
                                                </Flex>

                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                                    {formatTime(conv.last_message_time)}
                                                </Text>
                                            </Flex>
                                        </Card>
                                    </motion.div>
                                ))
                            )}
                        </Box>
                    </ScrollArea>
                </Box>

                {/* Chat Area */}
                {selectedConversation ? (
                    <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Chat Header */}
                        <Flex align="center" justify="between" style={{
                            padding: '16px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <Flex align="center" gap="3">
                                <Avatar
                                    size="3"
                                    fallback={selectedConversation.username?.slice(0, 2).toUpperCase() || 'U'}
                                    style={{
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                                    }}
                                />
                                <Box>
                                    <Text size="3" weight="medium">
                                        @{selectedConversation.username}
                                    </Text>
                                    <Flex align="center" gap="2">
                                        <Badge size="1" color="green">
                                            ID: {selectedConversation.telegram_id}
                                        </Badge>
                                        {selectedConversation.total_orders > 0 && (
                                            <Badge size="1" color="blue">
                                                {selectedConversation.total_orders} orders
                                            </Badge>
                                        )}
                                        {selectedConversation.total_spent > 0 && (
                                            <Badge size="1" color="purple">
                                                ${selectedConversation.total_spent}
                                            </Badge>
                                        )}
                                    </Flex>
                                </Box>
                            </Flex>

                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                    <IconButton size="2" variant="ghost">
                                        <DotsHorizontalIcon width="16" height="16" />
                                    </IconButton>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                    <DropdownMenu.Item>
                                        <PersonIcon width="14" height="14" />
                                        View Profile
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item>
                                        <StarIcon width="14" height="14" />
                                        Mark Important
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Separator />
                                    <DropdownMenu.Item
                                        color="red"
                                        onClick={() => deleteConversation(selectedConversation.telegram_id)}
                                    >
                                        <TrashIcon width="14" height="14" />
                                        Delete Conversation
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu.Root>
                        </Flex>

                        {/* Messages Area */}
                        <ScrollArea style={{ flex: 1, padding: '16px' }}>
                            <Box>
                                {messages.map((msg, idx) => (
                                    <motion.div
                                        key={msg._id || idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.01 }}
                                    >
                                        <Flex
                                            justify={msg.direction === 'outgoing' ? 'end' : 'start'}
                                            style={{ marginBottom: '12px' }}
                                        >
                                            <Box
                                                style={{
                                                    maxWidth: '70%',
                                                    padding: '10px 14px',
                                                    borderRadius: '12px',
                                                    background: msg.direction === 'outgoing'
                                                        ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                                                        : 'rgba(255, 255, 255, 0.1)',
                                                    color: '#fff'
                                                }}
                                            >
                                                <Text size="2" style={{ wordBreak: 'break-word' }}>
                                                    {msg.message}
                                                </Text>
                                                <Flex align="center" gap="1" mt="1">
                                                    <Text size="1" style={{
                                                        color: msg.direction === 'outgoing'
                                                            ? 'rgba(255, 255, 255, 0.7)'
                                                            : 'rgba(255, 255, 255, 0.5)'
                                                    }}>
                                                        {formatTime(msg.timestamp)}
                                                    </Text>
                                                    {msg.direction === 'outgoing' && msg.read && (
                                                        <CheckIcon width="12" height="12" style={{ color: '#10b981' }} />
                                                    )}
                                                </Flex>
                                            </Box>
                                        </Flex>
                                    </motion.div>
                                ))}
                                <div ref={messagesEndRef} />
                            </Box>
                        </ScrollArea>

                        {/* Quick Replies */}
                        {quickReplies.length > 0 && (
                            <Box style={{ padding: '8px 16px' }}>
                                <ScrollArea>
                                    <Flex gap="2" style={{ paddingBottom: '8px' }}>
                                        {quickReplies.map((reply, idx) => (
                                            <Button
                                                key={idx}
                                                size="1"
                                                variant="soft"
                                                onClick={() => setMessageInput(reply.message)}
                                                style={{ flexShrink: 0 }}
                                            >
                                                {reply.title}
                                            </Button>
                                        ))}
                                    </Flex>
                                </ScrollArea>
                            </Box>
                        )}

                        {/* Message Input */}
                        <Box style={{
                            padding: '16px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <Flex gap="3">
                                <TextArea
                                    placeholder="Type a message..."
                                    value={messageInput}
                                    onChange={(e) => {
                                        setMessageInput(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        minHeight: '40px',
                                        maxHeight: '120px'
                                    }}
                                />

                                <Button
                                    onClick={sendMessage}
                                    disabled={!messageInput.trim() || sending}
                                    style={{
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                        cursor: !messageInput.trim() || sending ? 'not-allowed' : 'pointer',
                                        opacity: !messageInput.trim() || sending ? 0.5 : 1
                                    }}
                                >
                                    <PaperPlaneIcon width="16" height="16" />
                                    Send
                                </Button>
                            </Flex>
                        </Box>
                    </Box>
                ) : (
                    // No conversation selected
                    <Flex align="center" justify="center" style={{ flex: 1 }}>
                        <Box style={{ textAlign: 'center' }}>
                            <ChatBubbleIcon
                                width="64"
                                height="64"
                                style={{
                                    color: 'rgba(139, 92, 246, 0.3)',
                                    marginBottom: '16px'
                                }}
                            />
                            <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                Select a conversation to start chatting
                            </Text>
                        </Box>
                    </Flex>
                )}
            </Flex>
        </Card>
    </Box>
);
};

export default Chat;
