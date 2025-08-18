import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, Select,
  Table, IconButton, Heading, TextField, Dialog,
  Switch, Avatar, Separator, ScrollArea, Code, DropdownMenu
} from '@radix-ui/themes';
import {
  PlusIcon, Pencil1Icon, TrashIcon, MagnifyingGlassIcon,
  ReloadIcon, DragHandleDots2Icon, CheckCircledIcon,
  CrossCircledIcon, RocketIcon, CopyIcon, ExclamationTriangleIcon,
  LayersIcon, CubeIcon, ArrowUpIcon, ArrowDownIcon,
  EyeOpenIcon, EyeNoneIcon
} from '@radix-ui/react-icons';
import { categoriesAPI } from '../services/api';

// Emoji picker component
const EmojiPicker = ({ value, onChange }) => {
  const popularEmojis = [
    '💪', '🔥', '💊', '⚡', '🚀', '💉', '🏋️', '💯',
    '⭐', '🎯', '📦', '💎', '🔬', '🧪', '💸', '🌟'
  ];

  return (
    <Grid columns="8" gap="2">
      {popularEmojis.map(emoji => (
        <Button
          key={emoji}
          variant={value === emoji ? 'solid' : 'soft'}
          size="2"
          onClick={() => onChange(emoji)}
          style={{
            fontSize: '20px',
            padding: '8px',
            cursor: 'pointer',
            background: value === emoji ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : undefined
          }}
        >
          {emoji}
        </Button>
      ))}
    </Grid>
  );
};

// Category form modal
const CategoryFormModal = ({ category, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    emoji: '📦',
    description: '',
    order: 1,
    is_active: true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        emoji: category.emoji || '📦',
        description: category.description || '',
        order: category.order || 1,
        is_active: category.is_active !== false
      });
    } else {
      setFormData({
        name: '',
        emoji: '📦',
        description: '',
        order: 1,
        is_active: true
      });
    }
    setErrors({});
  }, [category, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.description || formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    if (!formData.emoji) {
      newErrors.emoji = 'Please select an emoji';
    }
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
      console.error('Error saving category:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '500px' }}>
        <Dialog.Title>
          <Flex align="center" gap="3">
            <Box style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              {formData.emoji}
            </Box>
            <Heading size="4">
              {category ? 'Edit Category' : 'Create New Category'}
            </Heading>
          </Flex>
        </Dialog.Title>

        <Dialog.Description>
          <Box>
            <Flex direction="column" gap="4" mt="4">
              {/* Name field */}
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Category Name *
                </Text>
                <TextField.Root
                  size="3"
                  placeholder="e.g., Bulking Essentials"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.name ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />
                {errors.name && (
                  <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                    {errors.name}
                  </Text>
                )}
              </Box>

              {/* Description field */}
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Description *
                </Text>
                <textarea
                  placeholder="Describe this category (min 10 characters)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.description ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
                {errors.description && (
                  <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                    {errors.description}
                  </Text>
                )}
              </Box>

              {/* Emoji picker */}
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Category Icon *
                </Text>
                <EmojiPicker
                  value={formData.emoji}
                  onChange={(emoji) => setFormData({ ...formData, emoji })}
                />
                {errors.emoji && (
                  <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                    {errors.emoji}
                  </Text>
                )}
              </Box>

              {/* Order and Active */}
              <Grid columns="2" gap="4">
                <Box>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    Display Order
                  </Text>
                  <TextField.Root
                    size="3"
                    type="number"
                    min="1"
                    max="99"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </Box>

                <Box>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    Status
                  </Text>
                  <Flex align="center" gap="3" style={{ height: '40px' }}>
                    <Switch
                      size="3"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Text size="2">
                      {formData.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </Flex>
                </Box>
              </Grid>

              {/* Form actions */}
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
                  {saving ? 'Saving...' : (category ? 'Update' : 'Create')} Category
                </Button>
              </Flex>
            </Flex>
          </Box>
        </Dialog.Description>
      </Dialog.Content>
    </Dialog.Root>
  );
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showInactive, setShowInactive] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      
      // Process categories data
      const categoriesData = response.categories || [];
      
      // Sort by order field
      const sortedCategories = categoriesData.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setCategories(sortedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Show error notification if you have a notification system
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const handleSave = async (formData) => {
    try {
      if (selectedCategory) {
        // Update existing category
        await categoriesAPI.update(selectedCategory._id, formData);
      } else {
        // Create new category
        await categoriesAPI.create(formData);
      }
      // Refresh categories list
      await fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      // Show error notification
      alert('Error saving category. Please try again.');
    }
  };

  const handleDelete = async (category) => {
    // Check if category has products
    if (category.product_count > 0) {
      alert(`Cannot delete category with ${category.product_count} products. Remove all products first.`);
      return;
    }

    // Confirm deletion
    if (!confirm(`Delete category "${category.name}"? This action cannot be undone!`)) return;

    try {
      await categoriesAPI.delete(category._id);
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category. Please try again.');
    }
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedCategory(null);
    setModalOpen(true);
  };

  const moveCategory = async (category, direction) => {
    const currentOrder = category.order || 1;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
    
    if (newOrder < 1) return;
    
    // Find the category to swap with
    const otherCategory = categories.find(c => c.order === newOrder);
    if (otherCategory) {
      try {
        // Update both categories' order
        await Promise.all([
          categoriesAPI.update(category._id, { ...category, order: newOrder }),
          categoriesAPI.update(otherCategory._id, { ...otherCategory, order: currentOrder })
        ]);
        await fetchCategories();
      } catch (error) {
        console.error('Error reordering categories:', error);
        alert('Error reordering categories. Please try again.');
      }
    }
  };

  // Filter categories based on search and active status
  const filteredCategories = categories
    .filter(cat => {
      const matchesSearch = 
        cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActive = showInactive || cat.is_active !== false;
      return matchesSearch && matchesActive;
    });

  // Calculate statistics
  const stats = {
    total: categories.length,
    active: categories.filter(c => c.is_active !== false).length,
    inactive: categories.filter(c => c.is_active === false).length,
    products: categories.reduce((sum, c) => sum + (c.product_count || 0), 0)
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <LayersIcon width="32" height="32" style={{ color: '#8b5cf6' }} />
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
            Categories Management
          </Heading>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Organize your products into categories
          </Text>
        </Box>

        <Flex gap="3">
          <Button
            size="3"
            onClick={handleCreate}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              cursor: 'pointer'
            }}
          >
            <PlusIcon width="18" height="18" />
            Create Category
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

      {/* Stats Cards */}
      <Grid columns={{ initial: '2', sm: '4' }} gap="4" mb="6">
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
                  Total Categories
                </Text>
                <Text size="6" weight="bold">{stats.total}</Text>
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
                <LayersIcon width="20" height="20" style={{ color: '#8b5cf6' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
          transition={{ delay: 0.1 }}
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
                  Active
                </Text>
                <Text size="6" weight="bold">{stats.active}</Text>
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
                <CheckCircledIcon width="20" height="20" style={{ color: '#10b981' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
          transition={{ delay: 0.2 }}
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
                  Inactive
                </Text>
                <Text size="6" weight="bold">{stats.inactive}</Text>
              </Box>
              <Box style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CrossCircledIcon width="20" height="20" style={{ color: '#ef4444' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
          transition={{ delay: 0.3 }}
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
                  Total Products
                </Text>
                <Text size="6" weight="bold">{stats.products}</Text>
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
                <CubeIcon width="20" height="20" style={{ color: '#f59e0b' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>
      </Grid>

      {/* Filters */}
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
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
                opacity: 0.5,
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.boxShadow = '0 0 0 1px rgba(139, 92, 246, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </Box>

          <Flex align="center" gap="2">
            <Switch
              size="2"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Text size="2">Show inactive</Text>
          </Flex>
        </Flex>
      </Card>

      {/* Categories Grid */}
      <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4">
        {filteredCategories.length === 0 ? (
          <Flex 
            align="center" 
            justify="center" 
            style={{ 
              gridColumn: '1 / -1',
              padding: '60px',
              background: 'rgba(20, 20, 25, 0.6)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {searchTerm ? 'No categories found matching your search' : 'No categories yet. Create your first category!'}
            </Text>
          </Flex>
        ) : (
          filteredCategories.map((category, idx) => (
            <motion.div
              key={category._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5 }}
            >
              <Card style={{
                background: 'rgba(20, 20, 25, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '24px',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                opacity: category.is_active !== false ? 1 : 0.6
              }}>
                {/* Order badge */}
                <Box style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  {category.order || 1}
                </Box>

                <Flex direction="column" gap="3">
                  {/* Header */}
                  <Flex align="center" gap="3">
                    <Box style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '12px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}>
                      {category.emoji || '📦'}
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Heading size="3" style={{ marginBottom: '4px' }}>
                        {category.name}
                      </Heading>
                      <Badge 
                        color={category.is_active !== false ? 'green' : 'red'} 
                        variant="soft"
                      >
                        {category.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </Box>
                  </Flex>

                  {/* Description */}
                  <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {category.description || 'No description'}
                  </Text>

                  {/* Stats */}
                  <Flex align="center" justify="between">
                    <Flex align="center" gap="2">
                      <CubeIcon width="16" height="16" style={{ opacity: 0.6 }} />
                      <Text size="2">
                        <strong>{category.product_count || 0}</strong> products
                      </Text>
                    </Flex>
                  </Flex>

                  {/* Actions */}
                  <Separator size="4" style={{ opacity: 0.1 }} />
                  <Flex gap="2" justify="between">
                    <Flex gap="2">
                      <IconButton
                        size="2"
                        variant="soft"
                        onClick={() => moveCategory(category, 'up')}
                        disabled={category.order === 1}
                        style={{ cursor: category.order === 1 ? 'not-allowed' : 'pointer' }}
                      >
                        <ArrowUpIcon width="16" height="16" />
                      </IconButton>
                      <IconButton
                        size="2"
                        variant="soft"
                        onClick={() => moveCategory(category, 'down')}
                        disabled={category.order === categories.length}
                        style={{ cursor: category.order === categories.length ? 'not-allowed' : 'pointer' }}
                      >
                        <ArrowDownIcon width="16" height="16" />
                      </IconButton>
                    </Flex>
                    <Flex gap="2">
                      <IconButton
                        size="2"
                        variant="soft"
                        color="blue"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil1Icon width="16" height="16" />
                      </IconButton>
                      <IconButton
                        size="2"
                        variant="soft"
                        color="red"
                        onClick={() => handleDelete(category)}
                        disabled={(category.product_count || 0) > 0}
                        style={{ 
                          cursor: (category.product_count || 0) > 0 ? 'not-allowed' : 'pointer',
                          opacity: (category.product_count || 0) > 0 ? 0.5 : 1
                        }}
                      >
                        <TrashIcon width="16" height="16" />
                      </IconButton>
                    </Flex>
                  </Flex>
                </Flex>
              </Card>
            </motion.div>
          ))
        )}
      </Grid>

      {/* Category Form Modal */}
      <CategoryFormModal
        category={selectedCategory}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </Box>
  );
};

export default Categories;
