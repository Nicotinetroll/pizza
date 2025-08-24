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
    ExclamationTriangleIcon, LockClosedIcon, ArrowLeftIcon,
    Cross2Icon, CheckCircledIcon
} from '@radix-ui/react-icons';
import { chatAPI } from '../services/api';

// Avatar color generator - creates vibrant, high-contrast colors
const getAvatarGradient = (id) => {
    // Convert ID to a number for consistent color generation
    const numId = typeof id === 'string' ? 
        id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 
        id;
    
    // Define vibrant color pairs for gradients
    const gradients = [
        ['#FF6B6B', '#FF3838'], // Red
        ['#4ECDC4', '#44A99C'], // Teal
        ['#FFD93D', '#FFB830'], // Yellow
        ['#A8E6CF', '#7FD1B9'], // Mint
        ['#FF8CC3', '#FF6AAC'], // Pink
        ['#95E1D3', '#6BC7B5'], // Turquoise
        ['#FFA502', '#FF8C00'], // Orange
        ['#C56CF0', '#A55EC3'], // Purple
        ['#4834D4', '#3742FA'], // Blue
        ['#22A6B3', '#1E8C96'], // Cyan
        ['#F8B500', '#E5A200'], // Gold
        ['#EB4D4B', '#C23633'], // Coral
        ['#686DE0', '#5A5FCF'], // Indigo
        ['#30336B', '#282C5F'], // Navy
        ['#BADC58', '#A4C948'], // Lime
        ['#FF6348', '#FF4234'], // Tomato
        ['#7BED9F', '#5ED17C'], // Emerald
        ['#DFE4EA', '#C7CDD6'], // Silver
        ['#FFA07A', '#FF8A65'], // Light Salmon
        ['#20BF6B', '#1AA156']  // Green
    ];
    
    const index = Math.abs(numId) % gradients.length;
    return gradients[index];
};

// Get single color for badges/borders
const getAvatarBorderColor = (id) => {
    const colors = getAvatarGradient(id);
    return colors[0];
};

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
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showMobileChat, setShowMobileChat] = useState(false);

    // Refs
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const selectedConversationRef = useRef(null);

    // Detect mobile
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Update ref when selectedConversation changes
    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
    }, [selectedConversation]);

    // Initialize data on mount
    useEffect(() => {
        let mounted = true;

        const initializeApp = async () => {
            if (!mounted) return;

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
    }, []);

    // Long polling for instant updates
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
                        console.log('📨 New message notification received!');

                        // Refresh conversations list
                        const convResponse = await chatAPI.getConversations(unreadOnly);
                        setConversations(convResponse.conversations || []);

                        // If message is for selected conversation, refresh messages
                        if (selectedConversationRef.current &&
                            selectedConversationRef.current.telegram_id === data.telegram_id) {
                            const msgResponse = await chatAPI.getMessages(data.telegram_id);
                            setMessages(msgResponse.messages || []);
                        }

                        // Play notification sound if not active conversation
                        if (!selectedConversationRef.current || 
                            selectedConversationRef.current.telegram_id !== data.telegram_id) {
                            try {
                                const audio = new Audio('/notification.mp3');
                                audio.volume = 0.3;
                                audio.play().catch(() => {});
                            } catch (e) {}
                        }
                    }
                } catch (error) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        };

        waitForMessages();

        return () => {
            mounted = false;
        };
    }, [unreadOnly]);

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
            setConversations(response.conversations || []);
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
            setQuickReplies(response.replies || []);
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

    const handleRefresh = async () => {
        setRefreshing(true);

        try {
            await Promise.all([
                fetchConversations(),
                fetchStats()
            ]);

            if (selectedConversation) {
                const response = await chatAPI.getMessages(selectedConversation.telegram_id);
                setMessages(response.messages || []);
            }
        } catch (error) {
            console.error('Error during refresh:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const selectConversation = async (conversation) => {
        setSelectedConversation(conversation);
        selectedConversationRef.current = conversation;
        
        if (isMobile) {
            setShowMobileChat(true);
        }

        try {
            const response = await chatAPI.getMessages(conversation.telegram_id);
            setMessages(response.messages || []);

            // Mark as read
            if (conversation.unread_count > 0) {
                await chatAPI.markAsRead(conversation.telegram_id);

                setConversations(prev =>
                    prev.map(conv =>
                        conv.telegram_id === conversation.telegram_id
                            ? { ...conv, unread_count: 0 }
                            : conv
                    )
                );

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
            console.error('Error sending message:', error);
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
            await fetchConversations();
            if (selectedConversation?.telegram_id === telegramId) {
                setSelectedConversation(null);
                selectedConversationRef.current = null;
                setMessages([]);
                if (isMobile) {
                    setShowMobileChat(false);
                }
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    };

    const handleBackToConversations = () => {
        setShowMobileChat(false);
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

    // Loading state
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

    // Mobile Conversation Card Component
    const ConversationCard = ({ conv, isSelected }) => {
        const [color1, color2] = getAvatarGradient(conv.telegram_id);
        const borderColor = getAvatarBorderColor(conv.telegram_id);
        
        return (
            <motion.div
                whileHover={!isMobile ? { scale: 1.02 } : {}}
                whileTap={{ scale: 0.98 }}
            >
                <Card
                    onClick={() => selectConversation(conv)}
                    style={{
                        background: isSelected
                            ? 'rgba(139, 92, 246, 0.1)'
                            : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected
                            ? '1px solid rgba(139, 92, 246, 0.3)'
                            : '1px solid transparent',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        padding: isMobile ? '10px' : '12px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Flex align="start" justify="between">
                        <Flex align="center" gap={isMobile ? '2' : '3'}>
                            <Avatar
                                size={isMobile ? '2' : '3'}
                                fallback={conv.username?.slice(0, 2).toUpperCase() || conv.telegram_id?.toString().slice(0, 2) || 'U'}
                                style={{
                                    background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
                                    border: `2px solid ${borderColor}30`,
                                    boxShadow: `0 2px 8px ${borderColor}40`,
                                    color: '#FFFFFF',
                                    fontWeight: 'bold'
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
                                    maxWidth: isMobile ? '160px' : '180px'
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
        );
    };

    // Mobile Chat View
    if (isMobile && showMobileChat && selectedConversation) {
        const [color1, color2] = getAvatarGradient(selectedConversation.telegram_id);
        const borderColor = getAvatarBorderColor(selectedConversation.telegram_id);
        
        return (
            <Box style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                height: '100vh',
                display: 'flex', 
                flexDirection: 'column',
                background: 'linear-gradient(180deg, #0a0a0b 0%, #1a1a1b 100%)',
                zIndex: 1000
            }}>
                {/* Mobile Chat Header */}
                <Card style={{
                    background: 'rgba(20, 20, 25, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 0,
                    padding: '12px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <Flex align="center" justify="between">
                        <Flex align="center" gap="3">
                            <IconButton
                                size="2"
                                variant="ghost"
                                onClick={handleBackToConversations}
                            >
                                <ArrowLeftIcon width="18" height="18" />
                            </IconButton>
                            <Avatar
                                size="2"
                                fallback={selectedConversation.username?.slice(0, 2).toUpperCase() || selectedConversation.telegram_id?.toString().slice(0, 2) || 'U'}
                                style={{
                                    background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
                                    border: `2px solid ${borderColor}30`,
                                    boxShadow: `0 2px 8px ${borderColor}40`,
                                    color: '#FFFFFF',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Box>
                                <Text size="2" weight="medium">
                                    @{selectedConversation.username || `user${selectedConversation.telegram_id}`}
                                </Text>
                                <Flex align="center" gap="2">
                                    <Badge size="1" color="green">
                                        ID: {selectedConversation.telegram_id}
                                    </Badge>
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
                                <DropdownMenu.Item
                                    color="red"
                                    onClick={() => deleteConversation(selectedConversation.telegram_id)}
                                >
                                    <TrashIcon width="14" height="14" />
                                    Delete Chat
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </Flex>
                </Card>

                {/* Messages Area */}
                <Box style={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    padding: '12px',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={msg._id || idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Flex
                                justify={msg.direction === 'outgoing' ? 'end' : 'start'}
                                style={{ marginBottom: '8px' }}
                            >
                                <Box
                                    style={{
                                        maxWidth: '80%',
                                        padding: '8px 12px',
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
                                            <CheckCircledIcon width="12" height="12" style={{ color: '#10b981' }} />
                                        )}
                                    </Flex>
                                </Box>
                            </Flex>
                        </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                </Box>

                {/* Quick Replies - Mobile */}
                {quickReplies.length > 0 && (
                    <Box style={{ 
                        padding: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <ScrollArea>
                            <Flex gap="2" style={{ paddingBottom: '4px' }}>
                                {quickReplies.map((reply, idx) => (
                                    <Button
                                        key={idx}
                                        size="1"
                                        variant="soft"
                                        onClick={() => setMessageInput(reply.message)}
                                        style={{ flexShrink: 0, fontSize: '12px' }}
                                    >
                                        {reply.title}
                                    </Button>
                                ))}
                            </Flex>
                        </ScrollArea>
                    </Box>
                )}

                {/* Message Input - Mobile */}
                <Box style={{
                    padding: '12px',
                    paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(20, 20, 25, 0.95)',
                    backdropFilter: 'blur(20px)'
                }}>
                    <Flex gap="2">
                        <TextField.Root
                            placeholder="Type a message..."
                            value={messageInput}
                            onChange={(e) => {
                                setMessageInput(e.target.value);
                                handleTyping();
                            }}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            style={{
                                flex: 1,
                                background: 'rgba(255, 255, 255, 0.05)'
                            }}
                        />

                        <IconButton
                            size="3"
                            onClick={sendMessage}
                            disabled={!messageInput.trim() || sending}
                            style={{
                                background: messageInput.trim() && !sending
                                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                                    : 'rgba(255, 255, 255, 0.1)',
                                cursor: !messageInput.trim() || sending ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <PaperPlaneIcon width="16" height="16" />
                        </IconButton>
                    </Flex>
                </Box>
            </Box>
        );
    }

    // Desktop Layout OR Mobile Conversations List
    return (
        <Box style={{ 
            position: isMobile ? 'fixed' : 'relative',
            top: isMobile ? 0 : 'auto',
            left: isMobile ? 0 : 'auto',
            right: isMobile ? 0 : 'auto',
            bottom: isMobile ? 0 : 'auto',
            height: isMobile ? '100vh' : 'calc(100vh - 140px)',
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            background: isMobile ? 'linear-gradient(180deg, #0a0a0b 0%, #1a1a1b 100%)' : 'transparent',
            paddingTop: isMobile ? '56px' : 0,
            paddingBottom: isMobile ? '65px' : 0
        }}>
            {/* Header */}
            <Box style={{
                padding: isMobile ? '12px 16px' : '0 0 16px 0',
                background: isMobile ? 'rgba(20, 20, 25, 0.95)' : 'transparent',
                backdropFilter: isMobile ? 'blur(20px)' : 'none',
                borderBottom: isMobile ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
            }}>
                <Flex 
                    align={isMobile ? 'start' : 'center'} 
                    justify="between" 
                    direction={isMobile ? 'column' : 'row'}
                    gap={isMobile ? '2' : '0'}
                >
                    <Box>
                        <Heading size={isMobile ? '6' : '8'} weight="bold" style={{ marginBottom: '8px' }}>
                            Customer Chat
                        </Heading>
                        <Flex align="center" gap={isMobile ? '2' : '3'} wrap="wrap">
                            {stats && (
                                <>
                                    <Badge size={isMobile ? '1' : '2'} color="blue">
                                        {stats.total_conversations} Chats
                                    </Badge>
                                    <Badge size={isMobile ? '1' : '2'} color="red">
                                        {stats.unread_messages} Unread
                                    </Badge>
                                    <Badge size={isMobile ? '1' : '2'} color="green">
                                        {stats.today_messages} Today
                                    </Badge>
                                </>
                            )}
                        </Flex>
                    </Box>

                    <Button
                        size={isMobile ? '2' : '3'}
                        variant="surface"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{
                            background: 'rgba(20, 20, 25, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            width: isMobile ? '100%' : 'auto'
                        }}
                    >
                        <motion.div
                            animate={refreshing ? { rotate: 360 } : {}}
                            transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <ReloadIcon width={isMobile ? '16' : '18'} height={isMobile ? '16' : '18'} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </motion.div>
                    </Button>
                </Flex>
            </Box>

            {/* Main Container */}
            {isMobile ? (
                // Mobile Layout - Conversations List
                <Box style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Search and Filter */}
                    <Card style={{
                        background: 'rgba(20, 20, 25, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '12px',
                        marginBottom: '12px',
                        marginLeft: '12px',
                        marginRight: '12px'
                    }}>
                        <TextField.Root
                            placeholder="Search conversations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                background: 'rgba(255, 255, 255, 0.03)',
                                marginBottom: '8px'
                            }}
                        >
                            <TextField.Slot>
                                <MagnifyingGlassIcon height="14" width="14" />
                            </TextField.Slot>
                        </TextField.Root>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={unreadOnly}
                                onChange={(e) => {
                                    setUnreadOnly(e.target.checked);
                                    fetchConversations();
                                }}
                            />
                            <Text size="2">Show unread only</Text>
                        </label>
                    </Card>

                    {/* Conversations List */}
                    <Box style={{ 
                        flex: 1, 
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                        padding: '0 12px'
                    }}>
                        {filteredConversations.length === 0 ? (
                            <Card style={{
                                background: 'rgba(20, 20, 25, 0.6)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '40px 20px',
                                textAlign: 'center'
                            }}>
                                <ChatBubbleIcon
                                    width="48"
                                    height="48"
                                    style={{
                                        color: 'rgba(139, 92, 246, 0.3)',
                                        margin: '0 auto 16px'
                                    }}
                                />
                                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                    No conversations found
                                </Text>
                            </Card>
                        ) : (
                            filteredConversations.map(conv => (
                                <ConversationCard
                                    key={conv.telegram_id}
                                    conv={conv}
                                    isSelected={selectedConversation?.telegram_id === conv.telegram_id}
                                />
                            ))
                        )}
                    </Box>
                </Box>
            ) : (
                // Desktop Layout
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
                        {/* Conversations Sidebar - Desktop */}
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
                                        filteredConversations.map(conv => (
                                            <ConversationCard
                                                key={conv.telegram_id}
                                                conv={conv}
                                                isSelected={selectedConversation?.telegram_id === conv.telegram_id}
                                            />
                                        ))
                                    )}
                                </Box>
                            </ScrollArea>
                        </Box>

                        {/* Chat Area - Desktop */}
                        {selectedConversation ? (
                            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {/* Chat Header */}
                                <Flex align="center" justify="between" style={{
                                    padding: '16px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                    <Flex align="center" gap="3">
                                        {(() => {
                                            const [color1, color2] = getAvatarGradient(selectedConversation.telegram_id);
                                            const borderColor = getAvatarBorderColor(selectedConversation.telegram_id);
                                            
                                            return (
                                                <Avatar
                                                    size="3"
                                                    fallback={selectedConversation.username?.slice(0, 2).toUpperCase() || selectedConversation.telegram_id?.toString().slice(0, 2) || 'U'}
                                                    style={{
                                                        background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
                                                        border: `2px solid ${borderColor}30`,
                                                        boxShadow: `0 2px 12px ${borderColor}40`,
                                                        color: '#FFFFFF',
                                                        fontWeight: 'bold',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            );
                                        })()}
                                        <Box>
                                            <Text size="3" weight="medium">
                                                @{selectedConversation.username || `user${selectedConversation.telegram_id}`}
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
                                                                <CheckCircledIcon width="12" height="12" style={{ color: '#10b981' }} />
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
                            // No conversation selected - Desktop
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
            )}
        </Box>
    );
};

export default Chat;
