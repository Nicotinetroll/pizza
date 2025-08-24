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
  BellIcon, ChatBubbleIcon, GearIcon, ExclamationTriangleIcon
} from '@radix-ui/react-icons';
import { AuthProvider, useAuth } from './context/AuthContext';
import { customOrdersAPI } from './services/api';
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
import BotSettings from './pages/BotSettings';
import CustomerRequests from './pages/CustomerRequests';

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, color: '#8b5cf6', mobileShow: true },
  { id: 'orders', label: 'Orders', icon: BackpackIcon, color: '#ec4899', mobileShow: true },
  { id: 'categories', label: 'Categories', icon: LayersIcon, color: '#06b6d4', mobileShow: true },
  { id: 'products', label: 'Products', icon: CubeIcon, color: '#10b981', mobileShow: true },
  { id: 'referrals', label: 'Referrals', icon: StarIcon, color: '#f59e0b', mobileShow: false },
  { id: 'sellers', label: 'Sellers', icon: IdCardIcon, color: '#14b8a6', mobileShow: false },
  { id: 'users', label: 'Users', icon: PersonIcon, color: '#6366f1', mobileShow: false },
  { id: 'chat', label: 'Chat', icon: ChatBubbleIcon, color: '#ec4899', mobileShow: false },
  { id: 'requests', label: 'Requests', icon: ExclamationTriangleIcon, color: '#ef4444', mobileShow: false },
  { id: 'notifications', label: 'Notifs', icon: BellIcon, color: '#f59e0b', mobileShow: false },
  { id: 'botsettings', label: 'Bot Settings', icon: GearIcon, color: '#06b6d4', mobileShow: false },
];

const SecurityStatus = () => {
  const [encryptionKey, setEncryptionKey] = useState('');
  const [statusText, setStatusText] = useState('INITIALIZING');
  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const key = Array.from({ length: 16 }, () =>
          Math.random().toString(16).substr(2, 1).toUpperCase()
      ).join('');
      setEncryptionKey(key);
    }, 3000);

    const statuses = [
      'XK9#mN2$vP8@fL5*qR7!wT3&dG6',
      '0xDEADBEEF#7F3A9C2E$8B4D6A1F',
      'SHA256:aF9$kL2#mN8*pQ5!vX3&zB7',
      '::ffff:192.168.1.1#SECURE$NODE'
    ];

    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      setStatusText(statuses[statusIndex % statuses.length]);
      statusIndex++;
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
            textTransform: 'uppercase',
            display: window.innerWidth < 640 ? 'none' : 'block'
          }}>
            {statusText}
          </Code>
        </Flex>

        <Separator orientation="vertical" size="1" style={{ opacity: 0.3, display: window.innerWidth < 768 ? 'none' : 'block' }} />

        <Code size="1" style={{
          color: '#8b5cf6',
          fontFamily: 'monospace',
          fontSize: '10px',
          opacity: 0.8,
          display: window.innerWidth < 1024 ? 'none' : 'block'
        }}>
          0x{encryptionKey.slice(0, 8)}
        </Code>
      </Flex>
  );
};

const MobileBottomNav = ({ activeTab, setActiveTab, unreadMessages, unreadRequests }) => {
  const [showMore, setShowMore] = useState(false);

  const primaryItems = navigationItems.filter(item => item.mobileShow);
  const moreItems = navigationItems.filter(item => !item.mobileShow);

  return (
      <>
        <AnimatePresence>
          {showMore && (
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    zIndex: 998,
                    backdropFilter: 'blur(10px)'
                  }}
                  onClick={() => setShowMore(false)}
              >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(20, 20, 25, 0.98)',
                      borderRadius: '20px 20px 0 0',
                      padding: '20px',
                      paddingBottom: '90px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                  <Box style={{
                    width: '40px',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '2px',
                    margin: '0 auto 20px'
                  }} />

                  <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {moreItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      const hasUnread = (item.id === 'chat' && unreadMessages > 0) || 
                                       (item.id === 'requests' && unreadRequests > 0);

                      return (
                          <Button
                              key={item.id}
                              variant="ghost"
                              onClick={() => {
                                setActiveTab(item.id);
                                setShowMore(false);
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '16px',
                                background: isActive ? `${item.color}20` : 'transparent',
                                border: isActive ? `1px solid ${item.color}40` : '1px solid transparent',
                                borderRadius: '12px',
                                position: 'relative'
                              }}
                          >
                            <Icon width="24" height="24" style={{ color: isActive ? item.color : 'rgba(255, 255, 255, 0.7)' }} />
                            {hasUnread && (
                                <Box style={{
                                  position: 'absolute',
                                  top: '12px',
                                  right: '20px',
                                  width: '8px',
                                  height: '8px',
                                  background: '#ef4444',
                                  borderRadius: '50%'
                                }} />
                            )}
                            <Text size="1">{item.label}</Text>
                          </Button>
                      );
                    })}
                  </Box>
                </motion.div>
              </motion.div>
          )}
        </AnimatePresence>

        <Box style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(20, 20, 25, 0.98)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 999,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}>
          <Flex style={{ height: '65px', padding: '8px 4px' }}>
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                  <Button
                      key={item.id}
                      variant="ghost"
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 4px',
                        background: 'transparent',
                        border: 'none',
                        position: 'relative'
                      }}
                      onClick={() => setActiveTab(item.id)}
                  >
                    <Icon
                        width="20"
                        height="20"
                        style={{
                          color: isActive ? item.color : 'rgba(255, 255, 255, 0.6)',
                          transition: 'color 0.2s'
                        }}
                    />
                    <Text
                        size="1"
                        style={{
                          color: isActive ? item.color : 'rgba(255, 255, 255, 0.6)',
                          fontSize: '10px',
                          fontWeight: isActive ? '600' : '400'
                        }}
                    >
                      {item.label}
                    </Text>
                    {isActive && (
                        <motion.div
                            layoutId="activeMobileTab"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: '20%',
                              right: '20%',
                              height: '2px',
                              background: item.color,
                              borderRadius: '0 0 2px 2px'
                            }}
                        />
                    )}
                  </Button>
              );
            })}

            {moreItems.length > 0 && (
                <Button
                    variant="ghost"
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 4px',
                      background: 'transparent',
                      border: 'none',
                      position: 'relative'
                    }}
                    onClick={() => setShowMore(true)}
                >
                  <Box style={{ position: 'relative' }}>
                    <MixIcon
                        width="20"
                        height="20"
                        style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                    />
                    {(unreadMessages > 0 || unreadRequests > 0) && (
                        <Box style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          width: '6px',
                          height: '6px',
                          background: '#ef4444',
                          borderRadius: '50%'
                        }} />
                    )}
                  </Box>
                  <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '10px' }}>
                    More
                  </Text>
                </Button>
            )}
          </Flex>
        </Box>
      </>
  );
};

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { isAuthenticated, logout, user } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const fetchUnreadRequests = async () => {
    try {
      const response = await customOrdersAPI.getUnreadCount();
      setUnreadRequests(response.count || 0);
    } catch (error) {
      console.error('Error fetching unread requests:', error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchUnreadCount();
    fetchUnreadRequests();

    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchUnreadRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
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
      requests: CustomerRequests,
      notifications: Notifications,
      botsettings: BotSettings,
    };

    const Component = components[activeTab];
    return <Component />;
  };

  if (isMobile) {
    return (
        <Box style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0a0a0b 0%, #1a1a1b 100%)',
          paddingBottom: '75px',
          position: 'relative'
        }}>
          <Box style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(20, 20, 25, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <Flex
                align="center"
                justify="between"
                style={{
                  padding: '12px 16px',
                  minHeight: '56px'
                }}
            >
              <Flex align="center" gap="2">
                <Box style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0
                }}>
                  🍕
                </Box>
                <Box>
                  <Text size="3" weight="bold" style={{ display: 'block' }}>
                    AnabolicPizza
                  </Text>
                  <Flex align="center" gap="1">
                    <Box style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: '#10b981',
                      animation: 'pulse 2s infinite'
                    }} />
                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px' }}>
                      Admin v2.0
                    </Text>
                  </Flex>
                </Box>
                {activeTab === 'chat' && unreadMessages > 0 && (
                    <Badge size="1" color="red" style={{ marginLeft: '8px' }}>
                      {unreadMessages}
                    </Badge>
                )}
                {activeTab === 'requests' && unreadRequests > 0 && (
                    <Badge size="1" color="red" style={{ marginLeft: '8px' }}>
                      {unreadRequests}
                    </Badge>
                )}
              </Flex>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <IconButton size="2" variant="ghost" style={{ cursor: 'pointer' }}>
                    <Avatar
                        size="1"
                        fallback="A"
                        radius="full"
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                        }}
                    />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item disabled>
                    <Text size="1">{user?.email?.split('@')[0]}</Text>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item onClick={logout} color="red">
                    <ExitIcon width="14" height="14" />
                    Logout
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Flex>
          </Box>

          <Box style={{
            padding: '16px',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </Box>

          <MobileBottomNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              unreadMessages={unreadMessages}
              unreadRequests={unreadRequests}
          />
        </Box>
    );
  }

  return (
      <Box style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0b 0%, #1a1a1b 100%)',
        position: 'relative'
      }}>
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
          <Box
              style={{
                width: '320px',
                minWidth: '320px',
                height: '100vh',
                position: 'sticky',
                top: 0,
                left: 0
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

              <Box style={{ flex: 1 }}>
                <Flex direction="column" gap="3">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isChat = item.id === 'chat';
                    const isRequests = item.id === 'requests';
                    const hasUnread = (isChat && unreadMessages > 0) || (isRequests && unreadRequests > 0);
                    const unreadCount = isChat ? unreadMessages : isRequests ? unreadRequests : 0;

                    return (
                        <Box key={item.id} style={{ position: 'relative' }}>
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
                                          ? `${item.color}15`
                                          : 'transparent',
                                  border: isActive
                                      ? `1px solid ${item.color}40`
                                      : hasUnread
                                          ? `1px solid ${item.color}30`
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
                                          {unreadCount > 99 ? '99+' : unreadCount}
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

          <Box style={{ flex: 1, minHeight: '100vh', position: 'relative' }}>
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
                  <Flex align="center" gap="3">
                    <Text size="5" weight="bold">
                      {navigationItems.find(item => item.id === activeTab)?.label}
                    </Text>
                    {activeTab === 'chat' && unreadMessages > 0 && (
                        <Badge size="2" color="red">
                          {unreadMessages} new
                        </Badge>
                    )}
                    {activeTab === 'requests' && unreadRequests > 0 && (
                        <Badge size="2" color="red">
                          {unreadRequests} pending
                        </Badge>
                    )}
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
                  <SecurityStatus />

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
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item onClick={logout} color="red">
                        <ExitIcon width="16" height="16" />
                        Secure Logout
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </Flex>
              </Flex>
            </Box>

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
