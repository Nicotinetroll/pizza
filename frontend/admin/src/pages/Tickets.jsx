import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, TextField,
  Table, IconButton, Heading, TextArea, Dialog, Select,
  Tabs, Avatar, ScrollArea, DropdownMenu
} from '@radix-ui/themes';
import {
  ChatBubbleIcon, ClockIcon, CheckCircledIcon, CrossCircledIcon,
  ExclamationTriangleIcon, PersonIcon, CalendarIcon, ReloadIcon,
  MagnifyingGlassIcon, PaperPlaneIcon, DotsHorizontalIcon
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

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      
      const data = await ticketsAPI.getAll(params);
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await ticketsAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    
    try {
      await ticketsAPI.reply(selectedTicket._id || selectedTicket.ticket_number, { message: replyText });
      
      setReplyText('');
      fetchTickets();
      
      if (selectedTicket.messages) {
        setSelectedTicket({
          ...selectedTicket,
          messages: [...selectedTicket.messages, {
            sender_type: 'admin',
            message: replyText,
            timestamp: new Date().toISOString()
          }]
        });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const updateStatus = async (ticketId, newStatus) => {
    try {
      await ticketsAPI.updateStatus(ticketId, { status: newStatus });
      
      fetchTickets();
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket({...selectedTicket, status: newStatus});
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <Box>
      <Flex align="center" justify="between" mb="6">
        <Box>
          <Heading size="8" weight="bold" mb="2">Support Tickets</Heading>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Manage customer support requests
          </Text>
        </Box>
        <Button onClick={fetchTickets} disabled={loading}>
          <ReloadIcon />
          Refresh
        </Button>
      </Flex>

      {stats && (
        <Grid columns="5" gap="4" mb="6">
          <Card>
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Total</Text>
            <Text size="6" weight="bold">{stats.total || 0}</Text>
          </Card>
          <Card>
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Open</Text>
            <Text size="6" weight="bold" style={{ color: '#f59e0b' }}>{stats.open || 0}</Text>
          </Card>
          <Card>
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>In Progress</Text>
            <Text size="6" weight="bold" style={{ color: '#3b82f6' }}>{stats.in_progress || 0}</Text>
          </Card>
          <Card>
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Resolved</Text>
            <Text size="6" weight="bold" style={{ color: '#10b981' }}>{stats.resolved || 0}</Text>
          </Card>
          <Card>
            <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Avg Resolution</Text>
            <Text size="6" weight="bold">{stats.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : 'N/A'}</Text>
          </Card>
        </Grid>
      )}

      <Card mb="4">
        <Flex gap="3" align="center">
          <TextField.Root
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon />
            </TextField.Slot>
          </TextField.Root>

          <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger>
              <Text>Status: {statusFilter}</Text>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Status</Select.Item>
              {Object.entries(statusConfig).map(([value, config]) => (
                <Select.Item key={value} value={value}>
                  {config.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

          <Select.Root value={priorityFilter} onValueChange={setPriorityFilter}>
            <Select.Trigger>
              <Text>Priority: {priorityFilter}</Text>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Priority</Select.Item>
              {Object.entries(priorityConfig).map(([value, config]) => (
                <Select.Item key={value} value={value}>
                  {config.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      </Card>

      <Card>
        {loading ? (
          <Box p="5">
            <Text>Loading tickets...</Text>
          </Box>
        ) : filteredTickets.length === 0 ? (
          <Box p="5">
            <Text>No tickets found</Text>
          </Box>
        ) : (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Ticket #</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Subject</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Priority</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredTickets.map((ticket) => {
                const StatusIcon = statusConfig[ticket.status]?.icon || ClockIcon;
                
                return (
                  <Table.Row key={ticket._id}>
                    <Table.Cell>
                      <Text size="2" weight="medium">{ticket.ticket_number}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex align="center" gap="2">
                        <Avatar size="1" fallback={ticket.username?.slice(0, 2) || '?'} />
                        <Text size="2">@{ticket.username || 'Unknown'}</Text>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2">{ticket.subject || 'No subject'}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge>{ticket.category || 'other'}</Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={priorityConfig[ticket.priority]?.color || 'gray'}>
                        {priorityConfig[ticket.priority]?.label || ticket.priority}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={statusConfig[ticket.status]?.color || 'gray'}>
                        <StatusIcon width="14" height="14" />
                        {statusConfig[ticket.status]?.label || ticket.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="1">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="2">
                        <IconButton
                          size="1"
                          variant="soft"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setModalOpen(true);
                          }}
                        >
                          <ChatBubbleIcon />
                        </IconButton>
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger>
                            <IconButton size="1" variant="ghost">
                              <DotsHorizontalIcon />
                            </IconButton>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content>
                            {Object.entries(statusConfig).map(([value, config]) => (
                              <DropdownMenu.Item
                                key={value}
                                onClick={() => updateStatus(ticket._id, value)}
                              >
                                Set as {config.label}
                              </DropdownMenu.Item>
                            ))}
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        )}
      </Card>

      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Content style={{ maxWidth: '600px' }}>
          <Dialog.Title>
            Ticket {selectedTicket?.ticket_number}
          </Dialog.Title>
          
          <Box mb="3">
            <Flex gap="3" align="center">
              <Text size="2" weight="bold">User:</Text>
              <Text size="2">@{selectedTicket?.username} ({selectedTicket?.telegram_id})</Text>
            </Flex>
            <Flex gap="3" align="center" mt="2">
              <Text size="2" weight="bold">Category:</Text>
              <Badge>{selectedTicket?.category || 'other'}</Badge>
            </Flex>
            <Flex gap="3" align="center" mt="2">
              <Text size="2" weight="bold">Priority:</Text>
              <Badge color={priorityConfig[selectedTicket?.priority]?.color}>
                {priorityConfig[selectedTicket?.priority]?.label || selectedTicket?.priority}
              </Badge>
            </Flex>
            <Flex gap="3" align="center" mt="2">
              <Text size="2" weight="bold">Subject:</Text>
              <Text size="2">{selectedTicket?.subject || 'No subject'}</Text>
            </Flex>
          </Box>
          
          <ScrollArea style={{ height: '300px', marginBottom: '16px' }}>
            {selectedTicket?.messages && selectedTicket.messages.length > 0 ? (
              selectedTicket.messages.map((msg, idx) => (
                <Box key={idx} mb="3" style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: msg.sender_type === 'customer' 
                    ? 'var(--blue-3)' 
                    : 'var(--green-3)'
                }}>
                  <Flex align="center" gap="2" mb="1">
                    <Text size="2" weight="bold">
                      {msg.sender_type === 'customer' ? selectedTicket.username : 'Admin'}
                    </Text>
                    <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      {new Date(msg.timestamp).toLocaleString()}
                    </Text>
                  </Flex>
                  <Text size="2">{msg.message}</Text>
                </Box>
              ))
            ) : (
              <Box p="3">
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  {selectedTicket?.description || 'No messages yet'}
                </Text>
              </Box>
            )}
          </ScrollArea>
          
          <Box mt="4">
            <TextArea
              placeholder="Type your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              style={{ minHeight: '100px' }}
            />
            <Flex gap="3" mt="3" justify="between">
              <Button onClick={sendReply} disabled={!replyText.trim()}>
                <PaperPlaneIcon />
                Send Reply
              </Button>
              <Select.Root
                value={selectedTicket?.status}
                onValueChange={(value) => {
                  if (selectedTicket) {
                    updateStatus(selectedTicket._id, value);
                  }
                }}
              >
                <Select.Trigger>
                  <Text>Status: {selectedTicket?.status}</Text>
                </Select.Trigger>
                <Select.Content>
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <Select.Item key={value} value={value}>
                      {config.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
          </Box>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default Tickets;