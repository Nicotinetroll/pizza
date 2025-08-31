import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, TextField,
  Table, IconButton, Heading, TextArea, Dialog, Select,
  Avatar, ScrollArea, DropdownMenu, Separator, Code
} from '@radix-ui/themes';
import {
  ChatBubbleIcon, ClockIcon, CheckCircledIcon, CrossCircledIcon,
  ExclamationTriangleIcon, PersonIcon, CalendarIcon, ReloadIcon,
  MagnifyingGlassIcon, PaperPlaneIcon, DotsHorizontalIcon, TrashIcon,
  ChevronRightIcon, ChevronDownIcon, ExternalLinkIcon, InfoCircledIcon,
  ChevronLeftIcon, DoubleArrowLeftIcon, DoubleArrowRightIcon, IdCardIcon
} from '@radix-ui/react-icons';
import { ticketsAPI } from '../services/api';

const statusConfig = {
  open: { color: 'amber', icon: ClockIcon, label: 'Open' },
  in_progress: { color: 'blue', icon: ClockIcon, label: 'In Progress' },
  waiting_customer: { color: 'orange', icon: ClockIcon, label: 'Waiting Customer' },
  waiting_admin: { color: 'purple', icon: ClockIcon, label: 'Waiting Admin' },
  resolved: { color: 'green', icon: CheckCircledIcon, label: 'Resolved' },
  closed: { color: 'gray', icon: CrossCircledIcon, label: 'Closed' }
};

const priorityConfig = {
  low: { color: 'green', label: 'Low' },
  medium: { color: 'amber', label: 'Medium' },
  high: { color: 'orange', label: 'High' },
  urgent: { color: 'red', label: 'Urgent' }
};

const categoryConfig = {
  order_issue: { label: 'Order Issue', icon: '📦' },
  payment: { label: 'Payment', icon: '💳' },
  delivery: { label: 'Delivery', icon: '🚚' },
  product: { label: 'Product', icon: '📦' },
  account: { label: 'Account', icon: '👤' },
  other: { label: 'Other', icon: '❓' }
};

const Pagination = ({ currentPage, totalPages, itemsPerPage, totalItems, onPageChange, onItemsPerPageChange, isMobile }) => {
  const pageNumbers = [];
  const maxVisiblePages = isMobile ? 3 : 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <Card style={{
      background: 'rgba(20, 20, 25, 0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      padding: isMobile ? '12px' : '16px',
      marginTop: '20px'
    }}>
      <Flex 
        align="center" 
        justify="between"
        direction={isMobile ? 'column' : 'row'}
        gap={isMobile ? '3' : '0'}
      >
        <Flex align="center" gap={isMobile ? '2' : '3'}>
          <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Showing {startItem}-{endItem} of {totalItems} tickets
          </Text>
          
          {!isMobile && (
            <Select.Root value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
              <Select.Trigger size="1" variant="soft">
                <Text size="2">{itemsPerPage} per page</Text>
              </Select.Trigger>
              <Select.Content>
                {[10, 20, 30, 50, 100].map(value => (
                  <Select.Item key={value} value={value.toString()}>
                    {value} per page
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </Flex>
        
        <Flex align="center" gap={isMobile ? '1' : '2'}>
          <IconButton
            size={isMobile ? '1' : '2'}
            variant="soft"
            disabled={currentPage === 1}
            onClick={() => onPageChange(1)}
            style={{ opacity: currentPage === 1 ? 0.3 : 1 }}
          >
            <DoubleArrowLeftIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
          </IconButton>
          
          <IconButton
            size={isMobile ? '1' : '2'}
            variant="soft"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            style={{ opacity: currentPage === 1 ? 0.3 : 1 }}
          >
            <ChevronLeftIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
          </IconButton>
          
          <Flex gap={isMobile ? '1' : '2'}>
            {startPage > 1 && (
              <>
                <Button
                  size={isMobile ? '1' : '2'}
                  variant="soft"
                  onClick={() => onPageChange(1)}
                >
                  1
                </Button>
                {startPage > 2 && (
                  <Text size={isMobile ? '1' : '2'} style={{ padding: '0 4px', color: 'rgba(255, 255, 255, 0.3)' }}>
                    ...
                  </Text>
                )}
              </>
            )}
            
            {pageNumbers.map(number => (
              <Button
                key={number}
                size={isMobile ? '1' : '2'}
                variant={currentPage === number ? 'solid' : 'soft'}
                onClick={() => onPageChange(number)}
                style={{
                  background: currentPage === number ? 
                    'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 
                    'rgba(255, 255, 255, 0.05)',
                  minWidth: isMobile ? '28px' : '36px'
                }}
              >
                {number}
              </Button>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <Text size={isMobile ? '1' : '2'} style={{ padding: '0 4px', color: 'rgba(255, 255, 255, 0.3)' }}>
                    ...
                  </Text>
                )}
                <Button
                  size={isMobile ? '1' : '2'}
                  variant="soft"
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </Flex>
          
          <IconButton
            size={isMobile ? '1' : '2'}
            variant="soft"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            style={{ opacity: currentPage === totalPages ? 0.3 : 1 }}
          >
            <ChevronRightIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
          </IconButton>
          
          <IconButton
            size={isMobile ? '1' : '2'}
            variant="soft"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            style={{ opacity: currentPage === totalPages ? 0.3 : 1 }}
          >
            <DoubleArrowRightIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
          </IconButton>
        </Flex>
        
        {isMobile && (
          <Select.Root value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
            <Select.Trigger size="2" variant="soft" style={{ width: '100%' }}>
              <Text size="2">{itemsPerPage} per page</Text>
            </Select.Trigger>
            <Select.Content>
              {[10, 20, 30, 50].map(value => (
                <Select.Item key={value} value={value.toString()}>
                  {value} per page
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
      </Flex>
    </Card>
  );
};

const MobileTicketCard = ({ ticket, onStatusUpdate, onViewDetails, onDelete }) => {
  const StatusIcon = statusConfig[ticket.status]?.icon || ClockIcon;
  const isMobile = window.innerWidth < 768;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isMobile ? { scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
    >
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: isMobile ? '12px' : '16px',
        marginBottom: '12px'
      }}>
        <Flex align="center" justify="between" mb="3">
          <Flex align="center" gap="2">
            <Avatar
              size={isMobile ? '1' : '2'}
              fallback={ticket.username?.slice(0, 2).toUpperCase() || '??'}
              style={{
                background: `linear-gradient(135deg, ${priorityConfig[ticket.priority]?.color || '#ef4444'} 0%, ${priorityConfig[ticket.priority]?.color || '#ef4444'}90 100%)`
              }}
            />
            <Box>
              <Code size={isMobile ? '1' : '2'} style={{ color: '#ef4444' }}>
                {ticket.ticket_number}
              </Code>
              <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                {new Date(ticket.created_at).toLocaleDateString()}
              </Text>
            </Box>
          </Flex>
          
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton size="1" variant="ghost">
                <DotsHorizontalIcon width="16" height="16" />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => onViewDetails(ticket)}>
                <ExternalLinkIcon width="14" height="14" />
                View Details
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              {Object.entries(statusConfig).map(([value, config]) => (
                <DropdownMenu.Item
                  key={value}
                  onClick={() => onStatusUpdate(ticket._id, value)}
                  disabled={ticket.status === value}
                >
                  <Flex align="center" gap="2">
                    <config.icon width="14" height="14" />
                    Set as {config.label}
                  </Flex>
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                onClick={() => onDelete(ticket._id)}
                style={{ color: 'var(--red-9)' }}
              >
                <TrashIcon width="14" height="14" />
                Delete Ticket
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>

        <Box mb="3">
          <Text size={isMobile ? '2' : '3'} weight="medium" style={{ display: 'block', marginBottom: '4px' }}>
            {ticket.subject || 'No subject'}
          </Text>
          <Flex align="center" gap="2">
            <PersonIcon width="14" height="14" style={{ opacity: 0.6 }} />
            <Text size={isMobile ? '1' : '2'}>
              @{ticket.username || `user${ticket.telegram_id}`}
            </Text>
          </Flex>
        </Box>

        <Flex align="center" justify="between">
          <Flex align="center" gap="2">
            <Badge 
              size={isMobile ? '1' : '2'}
              color={statusConfig[ticket.status]?.color}
              variant="soft"
            >
              <StatusIcon width="12" height="12" />
              {statusConfig[ticket.status]?.label}
            </Badge>
            <Badge 
              size={isMobile ? '1' : '2'}
              color={priorityConfig[ticket.priority]?.color}
              variant="soft"
            >
              {priorityConfig[ticket.priority]?.label}
            </Badge>
          </Flex>
          
          <Badge size={isMobile ? '1' : '2'} variant="soft">
            {categoryConfig[ticket.category]?.icon} {categoryConfig[ticket.category]?.label || ticket.category}
          </Badge>
        </Flex>
      </Card>
    </motion.div>
  );
};

const TicketDetailModal = ({ ticket, isOpen, onClose, onStatusUpdate, onDelete, onReply }) => {
  const [newStatus, setNewStatus] = useState(ticket?.status || 'open');
  const [replyText, setReplyText] = useState('');
  const [updating, setUpdating] = useState(false);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (ticket) {
      setNewStatus(ticket.status);
      setReplyText('');
    }
  }, [ticket]);

  const handleStatusUpdate = async () => {
    if (newStatus === ticket.status) return;
    
    setUpdating(true);
    await onStatusUpdate(ticket._id, newStatus);
    setUpdating(false);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    
    await onReply(ticket._id || ticket.ticket_number, replyText);
    setReplyText('');
  };

  if (!ticket) return null;

  const StatusIcon = statusConfig[ticket.status]?.icon || ClockIcon;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ 
        maxWidth: isMobile ? '95%' : '700px',
        maxHeight: '90vh',
        margin: isMobile ? '10px' : 'auto',
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}>
        <Dialog.Title>
          <Flex align="center" gap={isMobile ? '2' : '3'}>
            <Avatar
              size={isMobile ? '2' : '3'}
              fallback={ticket.ticket_number?.slice(-2) || 'TK'}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              }}
            />
            <Box>
              <Heading size={isMobile ? '3' : '4'}>Ticket Details</Heading>
              <Code size={isMobile ? '1' : '2'} style={{ color: '#ef4444' }}>{ticket.ticket_number}</Code>
            </Box>
          </Flex>
        </Dialog.Title>

        <Box>
          <ScrollArea style={{ maxHeight: isMobile ? '60vh' : '60vh' }}>
            <Flex direction="column" gap={isMobile ? '3' : '4'} mt={isMobile ? '3' : '4'}>
              <Card style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: isMobile ? '12px' : '16px'
              }}>
                <Flex align="center" justify="between">
                  <Flex align="center" gap="2">
                    <StatusIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: `var(--${statusConfig[ticket.status]?.color}-9)` }} />
                    <Text size={isMobile ? '2' : '3'} weight="medium">Current Status</Text>
                  </Flex>
                  <Badge size={isMobile ? '1' : '2'} color={statusConfig[ticket.status]?.color}>
                    {statusConfig[ticket.status]?.label}
                  </Badge>
                </Flex>
              </Card>

              <Card style={{ padding: isMobile ? '12px' : '16px' }}>
                <Heading size={isMobile ? '2' : '3'} mb={isMobile ? '2' : '3'}>Ticket Information</Heading>
                <Grid columns={isMobile ? '1' : '2'} gap={isMobile ? '2' : '3'}>
                  <Flex align="center" gap="2">
                    <PersonIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ opacity: 0.6 }} />
                    <Text size={isMobile ? '1' : '2'}>
                      User: <Code size="1">@{ticket.username || `user${ticket.telegram_id}`}</Code>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <IdCardIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ opacity: 0.6 }} />
                    <Text size={isMobile ? '1' : '2'}>
                      ID: <Code size="1">{ticket.telegram_id}</Code>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <ChatBubbleIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ opacity: 0.6 }} />
                    <Text size={isMobile ? '1' : '2'}>
                      Category: <Badge>{categoryConfig[ticket.category]?.label || ticket.category}</Badge>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <ExclamationTriangleIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ opacity: 0.6 }} />
                    <Text size={isMobile ? '1' : '2'}>
                      Priority: <Badge color={priorityConfig[ticket.priority]?.color}>{priorityConfig[ticket.priority]?.label}</Badge>
                    </Text>
                  </Flex>
                  <Flex align="center" gap="2">
                    <CalendarIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} style={{ opacity: 0.6 }} />
                    <Text size={isMobile ? '1' : '2'}>
                      Created: {new Date(ticket.created_at).toLocaleString()}
                    </Text>
                  </Flex>
                </Grid>
                {ticket.subject && (
                  <Box mt={isMobile ? '2' : '3'}>
                    <Text size={isMobile ? '1' : '2'} weight="medium" style={{ display: 'block', marginBottom: '4px' }}>
                      Subject:
                    </Text>
                    <Text size={isMobile ? '2' : '3'}>{ticket.subject}</Text>
                  </Box>
                )}
              </Card>

              <Card style={{ padding: isMobile ? '12px' : '16px' }}>
                <Heading size={isMobile ? '2' : '3'} mb={isMobile ? '2' : '3'}>Conversation</Heading>
                <ScrollArea style={{ maxHeight: '300px' }}>
                  {ticket.messages && ticket.messages.length > 0 ? (
                    <Flex direction="column" gap="2">
                      {ticket.messages.map((msg, idx) => (
                        <Box key={idx} style={{
                          padding: '10px',
                          background: msg.sender_type === 'customer' 
                            ? 'rgba(239, 68, 68, 0.05)' 
                            : 'rgba(16, 185, 129, 0.05)',
                          borderRadius: '6px',
                          border: msg.sender_type === 'customer'
                            ? '1px solid rgba(239, 68, 68, 0.1)'
                            : '1px solid rgba(16, 185, 129, 0.1)'
                        }}>
                          <Flex justify="between" mb="1">
                            <Text size="2" weight="medium">
                              {msg.sender_type === 'customer' ? ticket.username : 'Admin'}
                            </Text>
                            <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                              {new Date(msg.timestamp).toLocaleString()}
                            </Text>
                          </Flex>
                          <Text size="2">{msg.message}</Text>
                        </Box>
                      ))}
                    </Flex>
                  ) : (
                    <Box style={{
                      padding: '20px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {ticket.description || 'No messages yet'}
                      </Text>
                    </Box>
                  )}
                </ScrollArea>
              </Card>

              <Card style={{
                background: 'rgba(20, 20, 25, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: isMobile ? '12px' : '16px'
              }}>
                <Heading size={isMobile ? '2' : '3'} mb={isMobile ? '2' : '3'}>Reply to Ticket</Heading>
                <TextArea
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{ 
                    minHeight: '100px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
                <Flex gap={isMobile ? '2' : '3'} mt={isMobile ? '2' : '3'} justify="between" direction={isMobile ? 'column' : 'row'}>
                  <Button
                    onClick={handleReply}
                    disabled={!replyText.trim()}
                    style={{
                      background: replyText.trim() ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255, 255, 255, 0.1)',
                      width: isMobile ? '100%' : 'auto'
                    }}
                  >
                    <PaperPlaneIcon />
                    Send Reply
                  </Button>
                  
                  <Flex gap={isMobile ? '2' : '3'} style={{ width: isMobile ? '100%' : 'auto' }}>
                    <Select.Root value={newStatus} onValueChange={setNewStatus} style={{ flex: 1 }}>
                      <Select.Trigger style={{ width: '100%' }}>
                        <Flex align="center" gap="2">
                          {React.createElement(statusConfig[newStatus]?.icon || ClockIcon, { width: 16, height: 16 })}
                          <Text>{statusConfig[newStatus]?.label}</Text>
                        </Flex>
                      </Select.Trigger>
                      <Select.Content>
                        {Object.entries(statusConfig).map(([value, config]) => (
                          <Select.Item key={value} value={value}>
                            <Flex align="center" gap="2">
                              <config.icon width="16" height="16" />
                              {config.label}
                            </Flex>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                    
                    <Button
                      onClick={handleStatusUpdate}
                      disabled={updating || newStatus === ticket.status}
                      style={{
                        background: newStatus !== ticket.status ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255, 255, 255, 0.1)',
                        cursor: updating || newStatus === ticket.status ? 'not-allowed' : 'pointer',
                        opacity: updating || newStatus === ticket.status ? 0.5 : 1
                      }}
                    >
                      {updating ? 'Updating...' : 'Update'}
                    </Button>
                  </Flex>
                </Flex>
              </Card>
            </Flex>
          </ScrollArea>
        </Box>

        <Flex gap="3" mt={isMobile ? '4' : '6'} justify="space-between">
          <Button 
            color="red" 
            variant="soft"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this ticket?')) {
                onDelete(ticket._id);
                onClose();
              }
            }}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            <TrashIcon />
            Delete Ticket
          </Button>
          <Dialog.Close>
            <Button variant="soft" style={{ width: isMobile ? '100%' : 'auto' }}>Close</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(isMobile ? 10 : 20);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setItemsPerPage(mobile ? 10 : 20);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      const data = await ticketsAPI.getAll(params);
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchStats = async () => {
    try {
      const data = await ticketsAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchTickets();
    fetchStats();
  };

  const updateStatus = async (ticketId, newStatus) => {
    try {
      await ticketsAPI.updateStatus(ticketId, { status: newStatus });
      
      setTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket._id === ticketId ? { ...ticket, status: newStatus } : ticket
        )
      );
      
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket({...selectedTicket, status: newStatus});
      }
      
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const deleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) {
      return;
    }
    
    try {
      await ticketsAPI.delete(ticketId);
      fetchTickets();
      fetchStats();
      
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket(null);
        setModalOpen(false);
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    }
  };

  const sendReply = async (ticketId, message) => {
    try {
      await ticketsAPI.reply(ticketId, { message });
      
      const updatedTicket = tickets.find(t => t._id === ticketId);
      if (updatedTicket) {
        const newMessage = {
          sender_type: 'admin',
          message: message,
          timestamp: new Date().toISOString()
        };
        
        const updatedMessages = [...(updatedTicket.messages || []), newMessage];
        
        setTickets(prevTickets => 
          prevTickets.map(ticket => 
            ticket._id === ticketId 
              ? { ...ticket, messages: updatedMessages }
              : ticket
          )
        );
        
        if (selectedTicket && selectedTicket._id === ticketId) {
          setSelectedTicket({
            ...selectedTicket,
            messages: updatedMessages
          });
        }
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const toggleRowExpansion = (ticketId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedRows(newExpanded);
  };

  const openTicketModal = (ticket) => {
    setSelectedTicket(ticket);
    setModalOpen(true);
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        ticket.ticket_number?.toLowerCase().includes(searchLower) ||
        ticket.username?.toLowerCase().includes(searchLower) ||
        ticket.subject?.toLowerCase().includes(searchLower) ||
        ticket.category?.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTickets.slice(startIndex, endIndex);
  }, [filteredTickets, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <ChatBubbleIcon width="32" height="32" style={{ color: '#ef4444' }} />
        </motion.div>
      </Flex>
    );
  }

  return (
    <Box style={{ paddingBottom: isMobile ? '80px' : '0' }}>
      <Flex 
        align={isMobile ? 'start' : 'center'} 
        justify="between" 
        mb={isMobile ? '4' : '6'}
        direction={isMobile ? 'column' : 'row'}
        gap={isMobile ? '3' : '0'}
      >
        <Box>
          <Heading size={isMobile ? '6' : '8'} weight="bold" style={{ marginBottom: '8px' }}>
            Support Tickets
          </Heading>
          {!isMobile && (
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Manage customer support requests
            </Text>
          )}
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

      {stats && (
        <Grid 
          columns={{ 
            initial: '2',
            xs: '2',
            sm: '3',
            lg: '5'
          }} 
          gap={isMobile ? '2' : '4'} 
          mb={isMobile ? '4' : '6'}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={!isMobile ? { y: -2 } : {}}
          >
            <Card style={{
              background: 'rgba(20, 20, 25, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: isMobile ? '12px' : '20px'
            }}>
              <Flex align="center" justify="between">
                <Box>
                  <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                    Total
                  </Text>
                  <Text size={isMobile ? '5' : '6'} weight="bold">
                    {stats.total || 0}
                  </Text>
                </Box>
                <Box style={{
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  borderRadius: isMobile ? '8px' : '10px',
                  background: '#ef444420',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ChatBubbleIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: '#ef4444' }} />
                </Box>
              </Flex>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={!isMobile ? { y: -2 } : {}}
          >
            <Card style={{
              background: 'rgba(20, 20, 25, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: isMobile ? '12px' : '20px'
            }}>
              <Flex align="center" justify="between">
                <Box>
                  <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                    Open
                  </Text>
                  <Text size={isMobile ? '5' : '6'} weight="bold" style={{ color: '#f59e0b' }}>
                    {stats.open || 0}
                  </Text>
                </Box>
                <Box style={{
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  borderRadius: isMobile ? '8px' : '10px',
                  background: '#f59e0b20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClockIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: '#f59e0b' }} />
                </Box>
              </Flex>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={!isMobile ? { y: -2 } : {}}
          >
            <Card style={{
              background: 'rgba(20, 20, 25, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: isMobile ? '12px' : '20px'
            }}>
              <Flex align="center" justify="between">
                <Box>
                  <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                    In Progress
                  </Text>
                  <Text size={isMobile ? '5' : '6'} weight="bold" style={{ color: '#3b82f6' }}>
                    {stats.in_progress || 0}
                  </Text>
                </Box>
                <Box style={{
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  borderRadius: isMobile ? '8px' : '10px',
                  background: '#3b82f620',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClockIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: '#3b82f6' }} />
                </Box>
              </Flex>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={!isMobile ? { y: -2 } : {}}
          >
            <Card style={{
              background: 'rgba(20, 20, 25, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: isMobile ? '12px' : '20px'
            }}>
              <Flex align="center" justify="between">
                <Box>
                  <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                    Resolved
                  </Text>
                  <Text size={isMobile ? '5' : '6'} weight="bold" style={{ color: '#10b981' }}>
                    {stats.resolved || 0}
                  </Text>
                </Box>
                <Box style={{
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  borderRadius: isMobile ? '8px' : '10px',
                  background: '#10b98120',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircledIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: '#10b981' }} />
                </Box>
              </Flex>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={!isMobile ? { y: -2 } : {}}
          >
            <Card style={{
              background: 'rgba(20, 20, 25, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: isMobile ? '12px' : '20px'
            }}>
              <Flex align="center" justify="between">
                <Box>
                  <Text size={isMobile ? '1' : '2'} style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                    Avg Resolution
                  </Text>
                  <Text size={isMobile ? '5' : '6'} weight="bold">
                    {stats.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : 'N/A'}
                  </Text>
                </Box>
                <Box style={{
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  borderRadius: isMobile ? '8px' : '10px',
                  background: '#8b5cf620',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClockIcon width={isMobile ? '16' : '20'} height={isMobile ? '16' : '20'} style={{ color: '#8b5cf6' }} />
                </Box>
              </Flex>
            </Card>
          </motion.div>
        </Grid>
      )}

      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: isMobile ? '12px' : '20px',
        marginBottom: isMobile ? '16px' : '24px'
      }}>
        <Flex 
          gap={isMobile ? '2' : '3'} 
          align="center"
          direction={isMobile ? 'column' : 'row'}
        >
          <Box style={{ flex: 1, position: 'relative', width: '100%' }}>
            <MagnifyingGlassIcon 
              width={isMobile ? '14' : '16'}
              height={isMobile ? '14' : '16'}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.5,
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              placeholder={isMobile ? "Search tickets..." : "Search by ticket number, username, subject, or category..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: isMobile ? '10px 10px 10px 36px' : '12px 12px 12px 40px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: isMobile ? '14px' : '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.boxShadow = '0 0 0 1px rgba(239, 68, 68, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </Box>

          <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger
              size={isMobile ? '2' : '3'}
              variant="surface"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                minWidth: isMobile ? '100%' : '150px'
              }}
            >
              <Flex align="center" gap="2">
                {statusFilter === 'all' ? (
                  <>
                    <InfoCircledIcon width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} />
                    <Text size={isMobile ? '2' : '3'}>All Status</Text>
                  </>
                ) : (
                  <>
                    {React.createElement(statusConfig[statusFilter]?.icon || ClockIcon, { width: isMobile ? 14 : 16, height: isMobile ? 14 : 16 })}
                    <Text size={isMobile ? '2' : '3'}>{statusConfig[statusFilter]?.label}</Text>
                  </>
                )}
              </Flex>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">
                <Flex align="center" gap="2">
                  <InfoCircledIcon width="16" height="16" />
                  All Status
                </Flex>
              </Select.Item>
              <Select.Separator />
              {Object.entries(statusConfig).map(([value, config]) => (
                <Select.Item key={value} value={value}>
                  <Flex align="center" gap="2">
                    <config.icon width="16" height="16" />
                    {config.label}
                  </Flex>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <Select.Root value={priorityFilter} onValueChange={setPriorityFilter}>
            <Select.Trigger
              size={isMobile ? '2' : '3'}
              variant="surface"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                minWidth: isMobile ? '100%' : '150px'
              }}
            >
              <Text size={isMobile ? '2' : '3'}>
                {priorityFilter === 'all' ? 'All Priority' : priorityConfig[priorityFilter]?.label}
              </Text>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Priority</Select.Item>
              <Select.Separator />
              {Object.entries(priorityConfig).map(([value, config]) => (
                <Select.Item key={value} value={value}>
                  <Badge color={config.color}>{config.label}</Badge>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      </Card>

      {filteredTickets.length === 0 ? (
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: isMobile ? '40px 20px' : '60px'
        }}>
          <Flex align="center" justify="center">
            <Text size={isMobile ? '2' : '3'} style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' ? 
                'No tickets found matching your filters' : 
                'No support tickets yet'}
            </Text>
          </Flex>
        </Card>
      ) : (
        <>
          {isMobile ? (
            <Box>
              {paginatedTickets.map((ticket) => (
                <MobileTicketCard
                  key={ticket._id}
                  ticket={ticket}
                  onStatusUpdate={updateStatus}
                  onViewDetails={openTicketModal}
                  onDelete={deleteTicket}
                />
              ))}
            </Box>
          ) : (
            <Card style={{
              background: 'rgba(20, 20, 25, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: 0,
              overflow: 'hidden'
            }}>
              <Box style={{ overflowX: 'auto' }}>
                <Table.Root variant="surface">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell width="40px"></Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Ticket #</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Subject</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Priority</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell width="60px">View</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {paginatedTickets.map((ticket) => {
                      const isExpanded = expandedRows.has(ticket._id);
                      const StatusIcon = statusConfig[ticket.status]?.icon || ClockIcon;
                      
                      return (
                        <React.Fragment key={ticket._id}>
                          <Table.Row
                            onClick={() => toggleRowExpansion(ticket._id)}
                            style={{
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              background: isExpanded ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                            }}
                          >
                            <Table.Cell>
                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronRightIcon width="16" height="16" />
                              </motion.div>
                            </Table.Cell>
                            <Table.Cell>
                              <Code size="2" style={{ color: '#ef4444' }}>
                                {ticket.ticket_number}
                              </Code>
                            </Table.Cell>
                            <Table.Cell>
                              <Flex direction="column" gap="1">
                                <Text size="2">{new Date(ticket.created_at).toLocaleDateString()}</Text>
                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                  {new Date(ticket.created_at).toLocaleTimeString()}
                                </Text>
                              </Flex>
                            </Table.Cell>
                            <Table.Cell>
                              <Flex align="center" gap="2">
                                <Avatar
                                  size="1"
                                  fallback={ticket.username?.slice(0, 2).toUpperCase() || '??'}
                                  style={{
                                    background: `linear-gradient(135deg, ${priorityConfig[ticket.priority]?.color || '#ef4444'} 0%, ${priorityConfig[ticket.priority]?.color || '#ef4444'}90 100%)`
                                  }}
                                />
                                <Text size="2">@{ticket.username || `user${ticket.telegram_id}`}</Text>
                              </Flex>
                            </Table.Cell>
                            <Table.Cell>
                              <Text size="2">{ticket.subject || 'No subject'}</Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge variant="soft">
                                {categoryConfig[ticket.category]?.icon} {categoryConfig[ticket.category]?.label || ticket.category}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge color={priorityConfig[ticket.priority]?.color} variant="soft">
                                {priorityConfig[ticket.priority]?.label}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger>
                                  <Button
                                    variant="soft"
                                    color={statusConfig[ticket.status]?.color}
                                    size="2"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <Flex align="center" gap="2">
                                      <StatusIcon width="14" height="14" />
                                      <Text size="2">{statusConfig[ticket.status]?.label}</Text>
                                      <ChevronDownIcon width="14" height="14" />
                                    </Flex>
                                  </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                  {Object.entries(statusConfig).map(([value, config]) => (
                                    <DropdownMenu.Item
                                      key={value}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateStatus(ticket._id, value);
                                      }}
                                    >
                                      <Flex align="center" gap="2">
                                        <config.icon width="14" height="14" />
                                        {config.label}
                                      </Flex>
                                    </DropdownMenu.Item>
                                  ))}
                                </DropdownMenu.Content>
                              </DropdownMenu.Root>
                            </Table.Cell>
                            <Table.Cell>
                              <IconButton
                                size="2"
                                variant="soft"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTicketModal(ticket);
                                }}
                              >
                                <ExternalLinkIcon width="16" height="16" />
                              </IconButton>
                            </Table.Cell>
                          </Table.Row>

                          <AnimatePresence>
                            {isExpanded && (
                              <Table.Row>
                                <Table.Cell colSpan={9} style={{ padding: 0 }}>
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <Box style={{
                                      padding: '20px',
                                      background: 'rgba(239, 68, 68, 0.02)',
                                      borderTop: '1px solid rgba(239, 68, 68, 0.1)',
                                      borderBottom: '1px solid rgba(239, 68, 68, 0.1)'
                                    }}>
                                      <Grid columns="2" gap="4">
                                        <Box>
                                          <Heading size="3" mb="3">Description</Heading>
                                          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                            {ticket.description || ticket.messages?.[0]?.message || 'No description available'}
                                          </Text>
                                        </Box>
                                        
                                        <Box>
                                          <Heading size="3" mb="3">Latest Activity</Heading>
                                          {ticket.messages && ticket.messages.length > 0 ? (
                                            <Box style={{
                                              padding: '10px',
                                              background: 'rgba(255, 255, 255, 0.02)',
                                              borderRadius: '8px'
                                            }}>
                                              <Flex justify="between" mb="1">
                                                <Text size="2" weight="medium">
                                                  {ticket.messages[ticket.messages.length - 1].sender_type === 'customer' ? 
                                                    ticket.username : 'Admin'}
                                                </Text>
                                                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                                  {new Date(ticket.messages[ticket.messages.length - 1].timestamp).toLocaleString()}
                                                </Text>
                                              </Flex>
                                              <Text size="2">
                                                {ticket.messages[ticket.messages.length - 1].message}
                                              </Text>
                                            </Box>
                                          ) : (
                                            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                              No messages yet
                                            </Text>
                                          )}
                                        </Box>
                                      </Grid>
                                    </Box>
                                  </motion.div>
                                </Table.Cell>
                              </Table.Row>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Card>
          )}
          
          {filteredTickets.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredTickets.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              isMobile={isMobile}
            />
          )}
        </>
      )}

      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onStatusUpdate={updateStatus}
        onDelete={deleteTicket}
        onReply={sendReply}
      />
    </Box>
  );
};

export default Tickets;