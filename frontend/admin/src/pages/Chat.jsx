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
import { chatAPI, ChatWebSocket } from '../services/api';

const Chat = () => {
    // State
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [typing, setTyping] = useState(false);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [quickReplies, setQuickReplies] = useState([]);
    const [stats, setStats] = useState(null);

    // Refs
    const messagesEndRef = useRef(null);
    const wsRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Load initial data
    useEffect(() => {
        fetchConversations();
        fetchQuickReplies();
        fetchStats();

        // Connect to WebSocket
        wsRef.current = new ChatWebSocket(handleWebSocketMessage);
        wsRef.current.connect();

        return () => {
            if (wsRef.current) {
                wsRef.current.disconnect();
            }
        };
    }, []);

    // Auto-scroll to bottom when new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleWebSocketMessage = useCallback((data) => {
        if (data.type === 'new_message') {
            // Add new message to current conversation if it matches
            if (selectedConversation?.telegram_id === data.message.telegram_id) {
                setMessages(prev => [...prev, data.message]);
            }

            // Update conversations list
            fetchConversations();

            // Show notification
            if (data.message.direction === 'incoming') {
                showNotification(data.message);
            }
        } else if (data.type === 'messages_read') {
            // Update read status
            fetchConversations();
        }
    }, [selectedConversation]);

    const showNotification = (message) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Message', {
                body: message.message.substring(0, 100),
                icon: '/icon.png'
            });
        }
    };

    const fetchConversations = async () => {
        try {
            const response = await chatAPI.getConversations(unreadOnly);
            setConversations(response.conversations);
        } catch (error) {
            console.error('Error fetching conversations:', error);
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
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const selectConversation = async (conversation) => {
        setSelectedConversation(conversation);

        try {
            const response = await chatAPI.getMessages(conversation.telegram_id);
            setMessages(response.messages);

            // Mark as read
            if (conversation.unread_count > 0) {
                await chatAPI.markAsRead(conversation.telegram_id);
                fetchConversations();
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedConversation) return;

        setSending(true);
        try {
            await chatAPI.sendMessage(selectedConversation.telegram_id, messageInput);
            setMessageInput('');

            // Message will be added via WebSocket
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleTyping = () => {
        if (!typing) {
            setTyping(true);
            if (wsRef.current && selectedConversation) {
                wsRef.current.sendTyping(selectedConversation.telegram_id);
            }
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
                            </>
                        )}
                    </Flex>
                </Box>

                <Button
                    size="3"
                    variant="surface"
                    onClick={fetchConversations}
                    style={{
                        background: 'rgba(20, 20, 25, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <ReloadIcon width="18" height="18" />
                    Refresh
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