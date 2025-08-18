import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, Select,
  Table, IconButton, Heading, TextField, Dialog,
  Switch, Avatar, Separator, ScrollArea, Code,
  Tabs, Progress, DropdownMenu
} from '@radix-ui/themes';
import {
  PlusIcon, Pencil1Icon, TrashIcon, MagnifyingGlassIcon,
  ReloadIcon, CheckCircledIcon, CrossCircledIcon, RocketIcon,
  CubeIcon, TokensIcon, ArrowUpIcon, ArrowDownIcon,
  ExclamationTriangleIcon, LayersIcon, CopyIcon, BarChartIcon,
  InfoCircledIcon, DotsVerticalIcon, EyeOpenIcon, EyeNoneIcon,
  HeartIcon, StarIcon, LightningBoltIcon, UpdateIcon
} from '@radix-ui/react-icons';
import { productsAPI, categoriesAPI } from '../services/api';
const ProductFormModal = ({ product, categories, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_usdt: '',
    purchase_price_usdt: '',
    category_id: '',
    stock_quantity: 999,
    is_active: true
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price_usdt: product.price_usdt,
        purchase_price_usdt: product.purchase_price_usdt,
        category_id: product.category_id,
        stock_quantity: product.stock_quantity,
        is_active: product.is_active !== false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price_usdt: '',
        purchase_price_usdt: '',
        category_id: categories.length > 0 ? categories[0]._id : '',
        stock_quantity: 999,
        is_active: true
      });
    }
    setErrors({});
  }, [product, categories, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!formData.description || formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    if (!formData.price_usdt || formData.price_usdt <= 0) {
      newErrors.price_usdt = 'Selling price must be greater than 0';
    }
    if (!formData.purchase_price_usdt || formData.purchase_price_usdt <= 0) {
      newErrors.purchase_price_usdt = 'Purchase price must be greater than 0';
    }
    if (parseFloat(formData.purchase_price_usdt) >= parseFloat(formData.price_usdt)) {
      newErrors.price_usdt = 'Selling price must be higher than purchase price';
    }
    if (!formData.category_id) {
      newErrors.category_id = 'Please select a category';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateProfit = () => {
    const selling = parseFloat(formData.price_usdt) || 0;
    const purchase = parseFloat(formData.purchase_price_usdt) || 0;
    const profit = selling - purchase;
    const margin = purchase > 0 ? ((profit / purchase) * 100) : 0;
    return { profit, margin };
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
  };

  const { profit, margin } = calculateProfit();

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: '600px' }}>
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
              <CubeIcon width="20" height="20" />
            </Box>
            <Heading size="4">
              {product ? 'Edit Product' : 'Create New Product'}
            </Heading>
          </Flex>
        </Dialog.Title>

        <Box mt="4">
          <ScrollArea style={{ maxHeight: '70vh' }}>
            <Flex direction="column" gap="4">
              {/* Name field */}
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Product Name *
                </Text>
                <TextField.Root
                  size="3"
                  placeholder="e.g., Premium Product"
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
                  placeholder="Product description (min 10 characters)"
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

              {/* Category field */}
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Category *
                </Text>
                <Select.Root 
                  value={formData.category_id} 
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <Select.Trigger 
                    style={{ 
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: errors.category_id ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <Text>
                      {formData.category_id ? 
                        categories.find(c => c._id === formData.category_id)?.name || 'Select Category' : 
                        'Select Category'}
                    </Text>
                  </Select.Trigger>
                  <Select.Content>
                    {categories.map(cat => (
                      <Select.Item key={cat._id} value={cat._id}>
                        <Flex align="center" gap="2">
                          <Text>{cat.emoji}</Text>
                          <Text>{cat.name}</Text>
                        </Flex>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                {errors.category_id && (
                  <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                    {errors.category_id}
                  </Text>
                )}
              </Box>

              {/* Pricing */}
              <Grid columns="2" gap="4">
                <Box>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    Purchase Price (Cost) *
                  </Text>
                  <Box style={{ position: 'relative' }}>
                    <Text size="1" style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.6)',
                      zIndex: 1
                    }}>
                      $
                    </Text>
                    <TextField.Root
                      size="3"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.purchase_price_usdt}
                      onChange={(e) => setFormData({ ...formData, purchase_price_usdt: e.target.value })}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: errors.purchase_price_usdt ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                        paddingLeft: '32px'
                      }}
                    />
                  </Box>
                  {errors.purchase_price_usdt && (
                    <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                      {errors.purchase_price_usdt}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    Selling Price *
                  </Text>
                  <Box style={{ position: 'relative' }}>
                    <Text size="1" style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.6)',
                      zIndex: 1
                    }}>
                      $
                    </Text>
                    <TextField.Root
                      size="3"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price_usdt}
                      onChange={(e) => setFormData({ ...formData, price_usdt: e.target.value })}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: errors.price_usdt ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                        paddingLeft: '32px'
                      }}
                    />
                  </Box>
                  {errors.price_usdt && (
                    <Text size="1" style={{ color: '#ef4444', marginTop: '4px' }}>
                      {errors.price_usdt}
                    </Text>
                  )}
                </Box>
              </Grid>

              {/* Live profit calculator */}
              {formData.price_usdt && formData.purchase_price_usdt && (
                <Card style={{
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  border: '1px solid rgba(102, 126, 234, 0.2)'
                }}>
                  <Grid columns="2" gap="4">
                    <Box>
                      <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Profit per Unit
                      </Text>
                      <Text size="5" weight="bold" style={{ color: '#667eea' }}>
                        ${profit.toFixed(2)}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Profit Margin
                      </Text>
                      <Text size="5" weight="bold" style={{ color: '#764ba2' }}>
                        {margin.toFixed(1)}%
                      </Text>
                    </Box>
                  </Grid>
                </Card>
              )}

              {/* Stock and status */}
              <Grid columns="2" gap="4">
                <Box>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    Stock Quantity
                  </Text>
                  <TextField.Root
                    size="3"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
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
                  {saving ? 'Saving...' : (product ? 'Update' : 'Create')} Product
                </Button>
              </Flex>
            </Flex>
          </ScrollArea>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
};

// Modern Product Card Component
const ProductCard = ({ product, products, onEdit, onDelete }) => {
  const [imageError, setImageError] = useState(false);
  
  const stockStatus = product.stock_quantity < 10 ? 'low' : product.stock_quantity < 50 ? 'medium' : 'high';
  const stockColor = stockStatus === 'low' ? '#ef4444' : stockStatus === 'medium' ? '#f59e0b' : '#10b981';
  
  // CSS for pulse animation
  const pulseAnimation = stockStatus === 'low' ? {
    animation: 'pulse 2s infinite'
  } : {};

  // Define keyframes in component styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
    >
      <Card style={{
        background: 'rgba(20, 20, 25, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: 0,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        opacity: product.is_active ? 1 : 0.7
      }}>

        {/* Status badge */}
        {!product.is_active && (
          <Box style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10
          }}>
            <Badge color="gray" variant="soft" size="2">
              <EyeNoneIcon width="12" height="12" />
              Inactive
            </Badge>
          </Box>
        )}

        <Box p="5">
          {/* Header with icon */}
          <Flex align="start" justify="between" mb="4">
            <Flex align="center" gap="3">
              <Box style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)'
              }}>
                {product.category_emoji || '📦'}
              </Box>
              <Box>
                <Heading size="3" style={{ marginBottom: '4px', fontWeight: '600' }}>
                  {product.name}
                </Heading>
                <Badge 
                  size="1"
                  variant="surface"
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}
                >
                  {product.category_name}
                </Badge>
              </Box>
            </Flex>

            {/* Actions dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton 
                  size="2" 
                  variant="ghost"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <DotsVerticalIcon />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onClick={() => onEdit(product)}>
                  <Pencil1Icon /> Edit Product
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item color="red" onClick={() => onDelete(product)}>
                  <TrashIcon /> Delete Product
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Flex>

          {/* Description */}
          <Text size="2" style={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'block',
            marginBottom: '16px',
            lineHeight: '1.5'
          }}>
            {product.description}
          </Text>

          {/* Pricing Grid */}
          <Card style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <Grid columns="2" gap="3">
              <Box>
                <Flex align="center" gap="1" mb="1">
                  <ArrowDownIcon width="12" height="12" style={{ color: '#ef4444' }} />
                  <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Cost
                  </Text>
                </Flex>
                <Text size="3" weight="medium" style={{ color: '#ef4444' }}>
                  ${product.purchase_price_usdt?.toFixed(2) || '0.00'}
                </Text>
              </Box>
              
              <Box>
                <Flex align="center" gap="1" mb="1">
                  <ArrowUpIcon width="12" height="12" style={{ color: '#10b981' }} />
                  <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Price
                  </Text>
                </Flex>
                <Text size="3" weight="bold" style={{ color: '#10b981' }}>
                  ${product.price_usdt?.toFixed(2) || '0.00'}
                </Text>
              </Box>
              
              <Box>
                <Flex align="center" gap="1" mb="1">
                  <LightningBoltIcon width="12" height="12" style={{ color: '#8b5cf6' }} />
                  <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Profit
                  </Text>
                </Flex>
                <Text size="3" weight="medium" style={{ color: '#8b5cf6' }}>
                  ${product.profit_usdt?.toFixed(2) || '0.00'}
                </Text>
              </Box>
              
              <Box>
                <Flex align="center" gap="1" mb="1">
                  <BarChartIcon width="12" height="12" style={{ color: '#f59e0b' }} />
                  <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Margin
                  </Text>
                </Flex>
                <Text size="3" weight="medium" style={{ color: '#f59e0b' }}>
                  {product.profit_margin?.toFixed(1) || '0.0'}%
                </Text>
              </Box>
            </Grid>
          </Card>

          {/* Stock and Sales Info */}
          <Flex align="center" justify="between" mb="4">
            <Flex align="center" gap="4">
              <Box>
                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px' }}>
                  Stock
                </Text>
                <Flex align="center" gap="1">
                  <Box style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: stockColor,
                    ...pulseAnimation
                  }} />
                  <Text size="2" weight="bold" style={{ color: stockColor }}>
                    {product.stock_quantity || 0}
                  </Text>
                </Flex>
              </Box>
              
              <Separator orientation="vertical" size="1" style={{ opacity: 0.2 }} />
              
              <Box>
                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px' }}>
                  Sold
                </Text>
                <Text size="2" weight="bold">
                  {product.sold_count || 0}
                </Text>
              </Box>

              <Separator orientation="vertical" size="1" style={{ opacity: 0.2 }} />

              <Box>
                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px' }}>
                  Revenue
                </Text>
                <Text size="2" weight="bold" style={{ color: '#10b981' }}>
                  ${((product.profit_usdt || 0) * (product.sold_count || 0)).toFixed(0)}
                </Text>
              </Box>
            </Flex>
          </Flex>


        </Box>


      </Card>
    </motion.div>
  );
};

// Main Products Component
const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showInactive, setShowInactive] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productsAPI.getAll(),
        categoriesAPI.getAll()
      ]);
      setProducts(productsRes.products || []);
      setCategories(categoriesRes.categories || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSave = async (formData) => {
    try {
      if (selectedProduct) {
        await productsAPI.update(selectedProduct._id, formData);
      } else {
        await productsAPI.create(formData);
      }
      await fetchData();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone!`)) return;

    try {
      await productsAPI.delete(product._id);
      await fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    const matchesActive = showInactive || product.is_active;
    return matchesSearch && matchesCategory && matchesActive;
  });

  // Calculate stats
  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => p.stock_quantity < 10).length,
    totalValue: products.reduce((sum, p) => sum + ((p.price_usdt || 0) * (p.stock_quantity || 0)), 0),
    totalProfit: products.reduce((sum, p) => sum + ((p.profit_usdt || 0) * (p.sold_count || 0)), 0)
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <CubeIcon width="32" height="32" style={{ color: '#8b5cf6' }} />
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
            Products Management
          </Heading>
          <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Manage your product inventory and pricing
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
            Add Product
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
      <Grid columns={{ initial: '2', sm: '3', lg: '5' }} gap="4" mb="6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
        >
          <Card style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '20px'
          }}>
            <Flex align="center" justify="between">
              <Box>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                  Total Products
                </Text>
                <Text size="6" weight="bold">{stats.total}</Text>
              </Box>
              <Box style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CubeIcon width="20" height="20" style={{ color: '#8b5cf6' }} />
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
            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
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
            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '20px'
          }}>
            <Flex align="center" justify="between">
              <Box>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                  Low Stock
                </Text>
                <Text size="6" weight="bold" style={{ color: stats.lowStock > 0 ? '#ef4444' : undefined }}>
                  {stats.lowStock}
                </Text>
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
                <ExclamationTriangleIcon width="20" height="20" style={{ color: '#ef4444' }} />
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
            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '20px'
          }}>
            <Flex align="center" justify="between">
              <Box>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                  Inventory Value
                </Text>
                <Text size="6" weight="bold">${stats.totalValue.toFixed(0)}</Text>
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
                <TokensIcon width="20" height="20" style={{ color: '#f59e0b' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -2 }}
          transition={{ delay: 0.4 }}
        >
          <Card style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '20px'
          }}>
            <Flex align="center" justify="between">
              <Box>
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'block', marginBottom: '4px' }}>
                  Total Profit
                </Text>
                <Text size="6" weight="bold" style={{ color: '#10b981' }}>
                  ${stats.totalProfit.toFixed(0)}
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
                <ArrowUpIcon width="20" height="20" style={{ color: '#10b981' }} />
              </Box>
            </Flex>
          </Card>
        </motion.div>
      </Grid>

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
                opacity: 0.5,
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Search products..."
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
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
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
              <Flex align="center" gap="2">
                <LayersIcon width="16" height="16" />
                <Text>{categoryFilter === 'all' ? 'All Categories' : categories.find(c => c._id === categoryFilter)?.name || 'Select'}</Text>
              </Flex>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">
                <Flex align="center" gap="2">
                  <InfoCircledIcon width="16" height="16" />
                  All Categories
                </Flex>
              </Select.Item>
              <Select.Separator />
              {categories.map(cat => (
                <Select.Item key={cat._id} value={cat._id}>
                  <Flex align="center" gap="2">
                    <Text>{cat.emoji}</Text>
                    <Text>{cat.name}</Text>
                  </Flex>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>

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

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <Card style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.6) 0%, rgba(30, 30, 35, 0.6) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '60px',
          textAlign: 'center'
        }}>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {searchTerm || categoryFilter !== 'all' ? 'No products found matching your filters' : 'No products yet. Add your first product!'}
          </Text>
        </Card>
      ) : (
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
                <Table.ColumnHeaderCell>Product</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Category</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Cost</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Price</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Profit</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Stock</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Sold</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Revenue</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredProducts.map(product => (
                <Table.Row key={product._id} style={{ opacity: product.is_active ? 1 : 0.6 }}>
                  <Table.Cell>
                    <Flex align="center" gap="3">
                      <Box style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0
                      }}>
                        {product.category_emoji || '📦'}
                      </Box>
                      <Box>
                        <Text size="2" weight="medium" style={{ display: 'block' }}>{product.name}</Text>
                        <Text size="1" style={{ 
                          color: 'rgba(255, 255, 255, 0.5)',
                          display: 'block',
                          marginTop: '4px'
                        }}>
                          {product.description?.slice(0, 40)}...
                        </Text>
                      </Box>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Badge size="1" variant="soft" style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: '#8b5cf6'
                    }}>
                      {product.category_name}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell style={{ color: '#ef4444', verticalAlign: 'middle' }}>
                    ${product.purchase_price_usdt?.toFixed(2) || '0.00'}
                  </Table.Cell>
                  <Table.Cell style={{ color: '#10b981', fontWeight: 'bold', verticalAlign: 'middle' }}>
                    ${product.price_usdt?.toFixed(2) || '0.00'}
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Flex direction="column" gap="1">
                      <Text size="2" style={{ color: '#8b5cf6' }}>
                        ${product.profit_usdt?.toFixed(2) || '0.00'}
                      </Text>
                      <Text size="1" style={{ color: '#7c3aed' }}>
                        {product.profit_margin?.toFixed(1) || '0.0'}%
                      </Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Flex align="center" gap="2">
                      {product.stock_quantity < 10 && (
                        <ExclamationTriangleIcon width="14" height="14" style={{ color: '#ef4444' }} />
                      )}
                      <Text size="2">{product.stock_quantity || 0}</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Text size="2">{product.sold_count || 0}</Text>
                  </Table.Cell>
                  <Table.Cell style={{ color: '#10b981', fontWeight: 'bold', verticalAlign: 'middle' }}>
                    ${((product.profit_usdt || 0) * (product.sold_count || 0)).toFixed(2)}
                  </Table.Cell>
                  <Table.Cell style={{ verticalAlign: 'middle' }}>
                    <Flex gap="2">
                      <IconButton
                        size="2"
                        variant="soft"
                        onClick={() => handleEdit(product)}
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
                        onClick={() => handleDelete(product)}
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
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        product={selectedProduct}
        categories={categories}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </Box>
  );
};

export default Products;
