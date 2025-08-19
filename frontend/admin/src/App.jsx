import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flex, Box, Button, Text, Avatar, Badge, Tooltip, ScrollArea,
  DropdownMenu, Separator, IconButton, Code
} from '@radix-ui/themes';
import {
  DashboardIcon, CubeIcon, BackpackIcon, PersonIcon,
  MixIcon, RocketIcon, ExitIcon, LayersIcon, StarIcon,
  HamburgerMenuIcon, Cross2Icon, LockClosedIcon, LockOpen1Icon,
  BarChartIcon, IdCardIcon, CheckCircledIcon, CrossCircledIcon,
  BellIcon
} from '@radix-ui/react-icons';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Users from './pages/Users';
import Categories from './pages/Categories';
import Referrals from './pages/Referrals';
import Sellers from './pages/Sellers';
import Notifications from './pages/Notifications';
import Chat from './pages/Chat';
import { ChatBubbleIcon } from '@radix-ui/react-icons';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, color: '#8b5cf6' },
  { id: 'orders', label: 'Orders', icon: BackpackIcon, color: '#ec4899' },
  { id: 'categories', label: 'Categories', icon: LayersIcon, color: '#06b6d4' },
  { id: 'products', label: 'Products', icon: CubeIcon, color: '#10b981' },
  { id: 'referrals', label: 'Referrals', icon: StarIcon, color: '#f59e0b' },
  { id: 'sellers', label: 'Sellers', icon: IdCardIcon, color: '#14b8a6' },
  { id: 'users', label: 'Users', icon: PersonIcon, color: '#6366f1' },
  { id: 'chat', label: 'Chat', icon: ChatBubbleIcon, color: '#ec4899' },
  { id: 'notifications', label: 'Notifications', icon: BellIcon, color: '#f59e0b' },
];

// Security status component
const SecurityStatus = () => {
  const [encryptionKey, setEncryptionKey] = useState('');
  const [statusText, setStatusText] = useState('INITIALIZING');
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    // Generate random encryption key
    const interval = setInterval(() => {
      const key = Array.from({ length: 16 }, () =>
          Math.random().toString(16).substr(2, 1).toUpperCase()
      ).join('');
      setEncryptionKey(key);
    }, 3000);

    // Rotate status text with encrypted hacker-style strings
    const statuses = [
      'XK9#mN2$vP8@fL5*qR7!wT3&dG6',
      '0xDEADBEEF#7F3A9C2E$8B4D6A1F',
      'SHA256:aF9$kL2#mN8*pQ5!vX3&zB7',
      '::ffff:192.168.1.1#SECURE$NODE',
      'QUANTUM#X25519$ECDHE&RSA4096',
      'TOR:6nB8#kP3$mQ9*xV2!fL5&wR7',
      '0xFF00AA55$KERNEL#HARDENED&64',
      'AES512:GCM$POLY1305#CHACHA20',
      'IPTABLES#DROP$0x7FFF&SHIELD::ON'
    ];

    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      setStatusText(statuses[statusIndex % statuses.length]);
      statusIndex++;
      // Random security check
      setIsSecure(Math.random() > 0.1);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  return (
      <Flex align="center" gap="3">
        <Flex align="center" gap="2">
          <motion.div
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [0.95, 1, 0.95]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
          >
            {isSecure ? (
                <CheckCircledIcon width="16" height="16" style={{ color: '#10b981' }} />
            ) : (
                <LockClosedIcon width="16" height="16" style={{ color: '#10b981' }} />
            )}
          </motion.div>
          <Code size="1" style={{
            color: '#10b981',
            fontFamily: 'monospace',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            {statusText}
          </Code>
        </Flex>

        <Separator orientation="vertical" size="1" style={{ opacity: 0.3 }} />

        <Code size="1" style={{
          color: '#8b5cf6',
          fontFamily: 'monospace',
          fontSize: '10px',
          opacity: 0.8
        }}>
          0x{encryptionKey.slice(0, 8)}
        </Code>
      </Flex>
  );
};

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { isAuthenticated, logout, user } = useAuth();

  // Fetch unread messages count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/chat/conversations?unread_only=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const totalUnread = data.conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
        setUnreadMessages(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch unread count on mount and periodically
  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchUnreadCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    // Also check with long polling for instant updates
    let mounted = true;
    
    const checkForNewMessages = async () => {
      while (mounted && isAuthenticated) {
        try {
          const response = await fetch('/api/chat/wait-for-messages?timeout=30', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.new_message) {
              fetchUnreadCount();
              
              // Play notification sound if not on chat tab
              if (activeTab !== 'chat') {
                try {
                  const audio = new Audio('/notification.mp3');
                  audio.volume = 0.3;
                  audio.play().catch(() => {});
                } catch (e) {}
              }
            }
          }
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    };
    
    checkForNewMessages();
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, activeTab]);

  // Reset unread when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat' && unreadMessages > 0) {
      // Clear unread badge when chat is opened
      setTimeout(() => setUnreadMessages(0), 1000);
    }
  }, [activeTab, unreadMessages]);

  useEffect(() => {
    // Close mobile menu when tab changes
    setMobileMenuOpen(false);
  }, [activeTab]);

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    const components = {
      dashboard: Dashboard,
      orders: Orders,
      categories: Categories,
      products: Products,
      referrals: Referrals,
      sellers: Sellers,
      users: Users,
      chat: Chat,
      notifications: Notifications,
    };

    const Component = components[activeTab];
    return <Component />;
  };

  return (
      <Box style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0b 0%, #1a1a1b 100%)',
        position: 'relative'
      }}>
        {/* Background decoration */}
        <Box style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '500px',
          background: 'radial-gradient(ellipse at top, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <Flex style={{ position: 'relative', zIndex: 1 }}>
          {/* Desktop Sidebar - Always visible */}
          <Box
              style={{
                width: '320px',
                minWidth: '320px',
                height: '100vh',
                position: 'sticky',
                top: 0,
                left: 0,
                display: window.innerWidth < 768 ? 'none' : 'block'
              }}
          >
            <Box
                style={{
                  height: '100%',
                  background: 'rgba(20, 20, 25, 0.5)',
                  backdropFilter: 'blur(20px)',
                  borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
            >
              {/* Logo */}
              <Flex align="center" gap="3" mb="6">
                <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                >
                  <Box style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
                  }}>
                    🍕
                  </Box>
                </motion.div>
                <Box>
                  <Text size="4" weight="bold" style={{ display: 'block' }}>
                    AnabolicPizza
                  </Text>
                  <Flex align="center" gap="1">
                    <Box style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      animation: 'pulse 2s infinite'
                    }} />
                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Secure Admin v2.0
                    </Text>
                  </Flex>
                </Box>
              </Flex>

              <Separator size="4" style={{ opacity: 0.1, marginBottom: '24px' }} />

              {/* Navigation with increased spacing */}
              <Box style={{ flex: 1 }}>
                <Flex direction="column" gap="3">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isChat = item.id === 'chat';
                    const hasUnread = isChat && unreadMessages > 0;

                    return (
                        <Box
                            key={item.id}
                            style={{ position: 'relative' }}
                        >
                          <motion.div
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              style={{ position: 'relative' }}
                          >
                            <Button
                                variant={isActive ? 'soft' : 'ghost'}
                                size="3"
                                onClick={() => setActiveTab(item.id)}
                                style={{
                                  width: '100%',
                                  justifyContent: 'flex-start',
                                  background: isActive
                                      ? `linear-gradient(135deg, ${item.color}20 0%, ${item.color}10 100%)`
                                      : hasUnread 
                                        ? 'rgba(236, 72, 153, 0.1)'
                                        : 'transparent',
                                  border: isActive 
                                      ? `1px solid ${item.color}40` 
                                      : hasUnread
                                        ? '1px solid rgba(236, 72, 153, 0.3)'
                                        : '1px solid transparent',
                                  color: isActive ? item.color : 'rgba(255, 255, 255, 0.7)',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  transition: 'all 0.3s ease',
                                  paddingLeft: isActive ? '20px' : '12px',
                                  paddingTop: '12px',
                                  paddingBottom: '12px'
                                }}
                            >
                              {isActive && (
                                  <motion.div
                                      layoutId="activeTab"
                                      style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: '3px',
                                        height: '60%',
                                        background: item.color,
                                        borderRadius: '0 2px 2px 0',
                                        boxShadow: `0 0 20px ${item.color}50`
                                      }}
                                      transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30
                                      }}
                                  />
                              )}
                              <Flex align="center" gap="3" style={{ width: '100%' }}>
                                <Box style={{ position: 'relative' }}>
                                  <Icon width="18" height="18" style={{ flexShrink: 0 }} />
                                  {hasUnread && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                      style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        width: '8px',
                                        height: '8px',
                                        background: '#ef4444',
                                        borderRadius: '50%',
                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                                      }}
                                    />
                                  )}
                                </Box>
                                <Flex align="center" justify="between" style={{ flex: 1 }}>
                                  <Text size="2" weight={isActive ? 'medium' : 'regular'}>
                                    {item.label}
                                  </Text>
                                  {hasUnread && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    >
                                      <Badge 
                                        size="2" 
                                        color="red"
                                        style={{
                                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                          color: '#fff',
                                          fontWeight: 'bold',
                                          animation: 'pulse 2s infinite'
                                        }}
                                      >
                                        {unreadMessages > 99 ? '99+' : unreadMessages}
                                      </Badge>
                                    </motion.div>
                                  )}
                                </Flex>
                              </Flex>
                            </Button>
                          </motion.div>
                        </Box>
                    );
                  })}
                </Flex>
              </Box>

              {/* User section */}
              <Box mt="4">
                <Separator size="4" style={{ opacity: 0.1, marginBottom: '16px' }} />
                <Flex align="center" justify="between">
                  <Flex align="center" gap="3">
                    <Avatar
                        size="2"
                        fallback="A"
                        radius="full"
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                          border: '2px solid rgba(139, 92, 246, 0.3)'
                        }}
                    />
                    <Box>
                      <Text size="2" weight="medium" style={{ display: 'block' }}>
                        Admin
                      </Text>
                      <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {user?.email?.split('@')[0]}
                      </Text>
                    </Box>
                  </Flex>
                  <Tooltip content="Secure Logout">
                    <IconButton
                        size="2"
                        variant="ghost"
                        color="red"
                        onClick={logout}
                        style={{ cursor: 'pointer' }}
                    >
                      <ExitIcon width="16" height="16" />
                    </IconButton>
                  </Tooltip>
                </Flex>
              </Box>
            </Box>
          </Box>

          {/* Main Content */}
          <Box style={{ flex: 1, minHeight: '100vh', position: 'relative' }}>
            {/* Top Bar */}
            <Box
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  background: 'rgba(20, 20, 25, 0.8)',
                  backdropFilter: 'blur(20px)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}
            >
              <Flex
                  align="center"
                  justify="between"
                  style={{
                    padding: '16px 24px',
                  }}
              >
                <Flex align="center" gap="4">
                  {/* Mobile menu toggle */}
                  <IconButton
                      size="2"
                      variant="ghost"
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                      style={{
                        cursor: 'pointer',
                        display: window.innerWidth >= 768 ? 'none' : 'flex'
                      }}
                  >
                    {mobileMenuOpen ? (
                        <Cross2Icon width="18" height="18" />
                    ) : (
                        <HamburgerMenuIcon width="18" height="18" />
                    )}
                  </IconButton>

                  <Flex align="center" gap="3">
                    <Text size="5" weight="bold">
                      {navigationItems.find(item => item.id === activeTab)?.label}
                    </Text>
                    {activeTab === 'chat' && unreadMessages > 0 && (
                      <Badge size="2" color="red">
                        {unreadMessages} new
                      </Badge>
                    )}
                    {/* Static icon - NO ROTATION */}
                    <Box style={{ opacity: 0.6 }}>
                      {React.createElement(
                          navigationItems.find(item => item.id === activeTab)?.icon || DashboardIcon,
                          {
                            width: "20",
                            height: "20",
                            style: {
                              color: navigationItems.find(item => item.id === activeTab)?.color
                            }
                          }
                      )}
                    </Box>
                  </Flex>
                </Flex>

                <Flex align="center" gap="4">
                  {/* Security Status */}
                  <Box style={{ display: window.innerWidth < 1024 ? 'none' : 'block' }}>
                    <SecurityStatus />
                  </Box>

                  {/* User menu */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <IconButton size="2" variant="ghost" style={{ cursor: 'pointer' }}>
                        <Flex align="center" gap="2">
                          <motion.div
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                          >
                            <LockClosedIcon width="16" height="16" style={{ color: '#10b981' }} />
                          </motion.div>
                          <Avatar
                              size="2"
                              fallback="A"
                              radius="full"
                              style={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                              }}
                          />
                        </Flex>
                      </IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item disabled>
                        <Flex align="center" gap="2">
                          <CheckCircledIcon width="14" height="14" style={{ color: '#10b981' }} />
                          <Text size="1">{user?.email}</Text>
                        </Flex>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item disabled>
                        <Code size="1">Session: {Math.random().toString(36).substr(2, 9).toUpperCase()}</Code>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item disabled>
                        <Code size="1">IP: {Math.floor(Math.random() * 255)}.{Math.floor(Math.random() * 255)}.XXX.XXX</Code>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item onClick={logout} color="red">
                        <ExitIcon width="16" height="16" />
                        Secure Logout
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Flex>
              </Flex>

              {/* Mobile Navigation */}
              <AnimatePresence>
                {mobileMenuOpen && window.innerWidth < 768 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                      <Box style={{ padding: '16px' }}>
                        <Flex direction="column" gap="3">
                          {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            const isChat = item.id === 'chat';
                            const hasUnread = isChat && unreadMessages > 0;

                            return (
                                <Button
                                    key={item.id}
                                    variant={isActive ? 'soft' : 'ghost'}
                                    size="3"
                                    onClick={() => setActiveTab(item.id)}
                                    style={{
                                      width: '100%',
                                      justifyContent: 'flex-start',
                                      background: isActive
                                          ? `linear-gradient(135deg, ${item.color}20 0%, ${item.color}10 100%)`
                                          : 'transparent',
                                      border: isActive ? `1px solid ${item.color}40` : '1px solid transparent',
                                      color: isActive ? item.color : 'rgba(255, 255, 255, 0.7)',
                                      paddingTop: '12px',
                                      paddingBottom: '12px'
                                    }}
                                >
                                  <Flex align="center" gap="3" justify="between" style={{ width: '100%' }}>
                                    <Flex align="center" gap="3">
                                      <Icon width="16" height="16" />
                                      <Text size="2">{item.label}</Text>
                                    </Flex>
                                    {hasUnread && (
                                      <Badge size="1" color="red">
                                        {unreadMessages}
                                      </Badge>
                                    )}
                                  </Flex>
                                </Button>
                            );
                          })}
                        </Flex>
                      </Box>
                    </motion.div>
                )}
              </AnimatePresence>
            </Box>

            {/* Page Content */}
            <Box style={{ padding: '24px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </Box>
          </Box>
        </Flex>
      </Box>
  );
};

function App() {
  return (
      <AuthProvider>
        <MainApp />
      </AuthProvider>
  );
}

export default App;
