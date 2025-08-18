import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Flex, Grid, Text, Card, Badge, Button, Select,
  Table, IconButton, Heading, TextField, Dialog,
  Switch, Avatar, Separator, ScrollArea, Code, DropdownMenu,
  Tabs, Progress
} from '@radix-ui/themes';
import {
  PlusIcon, Pencil1Icon, TrashIcon, MagnifyingGlassIcon,
  ReloadIcon, CheckCircledIcon, CrossCircledIcon, RocketIcon,
  CubeIcon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon,
  ExclamationTriangleIcon, LayersIcon, CopyIcon, BarChartIcon,
  InfoCircledIcon
} from '@radix-ui/react-icons';

// Mock API for testing
const productsAPI = {
  getAll: async () => ({
    products: [
      { 
        _id: '1', 
        name: 'Test E 250', 
        description: 'Testosterone Enanthate 250mg/ml', 
        price_usdt: 50, 
        purchase_price_usdt: 20,
        profit_usdt: 30,
        profit_margin: 60,
        category_id: '1', 
        category_name: 'Bulking Essentials',
        category_emoji: '💪',
        stock_quantity: 100,
        sold_count: 45,
        is_active: true 
      },
      { 
        _id: '2', 
        name: 'Anavar 50mg', 
        description: 'Premium cutting compound', 
        price_usdt: 139.86, 
        purchase_price_usdt: 70,
        profit_usdt: 69.86,
        profit_margin: 49.9,
        category_id: '2', 
        category_name: 'Cutting Stack',
        category_emoji: '🔥',
        stock_quantity: 5,
        sold_count: 120,
        is_active: true 
      },
      { 
        _id: '3', 
        name: 'PCT Complete', 
        description: 'Post cycle therapy bundle', 
        price_usdt: 89.99, 
        purchase_price_usdt: 45,
        profit_usdt: 44.99,
        profit_margin: 50,
        category_id: '3', 
        category_name: 'PCT Support',
        category_emoji: '💊',
        stock_quantity: 50,
        sold_count: 20,
        is_active: false 
      }
    ]
  }),
  create: async (data) => ({ success: true }),
  update: async (id, data) => ({ success: true }),
  delete: async (id) => ({ success: true })
};

const categoriesAPI = {
  getAll: async () => ({
    categories: [
      { _id: '1', name: 'Bulking Essentials', emoji: '💪', is_active: true },
      { _id: '2', name: 'Cutting Stack', emoji: '🔥', is_active: true },
      { _id: '3', name: 'PCT Support', emoji: '💊', is_active: true }
    ]
  })
};

// Product form modal
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
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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

        <Dialog.Description>
          <ScrollArea style={{ maxHeight: '70vh' }}>
            <Flex direction="column" gap="4" mt="4">
              {/* Name field */}
              <Box>
                <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                  Product Name *
                </Text>
                <TextField.Root
                  size="3"
                  placeholder="e.g., Test E 250"
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
                    <Select.Value placeholder="Select a category" />
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
                  <TextField.Root
                    size="3"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.purchase_price_usdt}
                    onChange={(e) => setFormData({ ...formData, purchase_price_usdt: e.target.value })}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: errors.purchase_price_usdt ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <TextField.Slot>$</TextField.Slot>
                  </TextField.Root>
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
                  <TextField.Root
                    size="3"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price_usdt}
                    onChange={(e) => setFormData({ ...formData, price_usdt: e.target.value })}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: errors.price_usdt ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <TextField.Slot>$</TextField.Slot>
                  </TextField.Root>
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
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <Grid columns="2" gap="4">
                    <Box>
                      <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Profit per Unit
                      </Text>
                      <Text size="5" weight="bold" style={{ color: '#10b981' }}>
                        ${profit.toFixed(2)}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Profit Margin
                      </Text>
                      <Text size="5" weight="bold" style={{ color: '#8b5cf6' }}>
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
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Saving...' : (product ? 'Update' : 'Create')} Product
                </Button>
              </Flex>
            </Flex>
          </ScrollArea>
        </Dialog.Description>
      </Dialog.Content>
    </Dialog.Root>
  );
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or table
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
    totalValue: products.reduce((sum, p) => sum + (p.price_usdt * p.stock_quantity), 0),
    totalProfit: products.reduce((sum, p) => sum + (p.profit_usdt * p.sold_count), 0)
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <CubeIcon width="32" height="32" style={{ color: '#10b981' }} />
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
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
            background: 'rgba(20, 20, 25, 0.6)',
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
                <DollarSignIcon width="20" height="20" style={{ color: '#f59e0b' }} />
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
            background: 'rgba(20, 20, 25, 0.6)',
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
                <TrendingUpIcon width="20" height="20" style={{ color: '#10b981' }} />
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
              placeholder="Search products..."
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
                e.target.style.boxShadow = '0 0 0 1px rgba(16, 185, 129, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                e.target.style.boxShadow = 'none';
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
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Categories</Select.Item>
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

          <Tabs.Root value={viewMode} onValueChange={setViewMode}>
            <Tabs.List>
              <Tabs.Trigger value="grid">Grid</Tabs.Trigger>
              <Tabs.Trigger value="table">Table</Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </Flex>
      </Card>

      {/* Products Grid/Table */}
      {filteredProducts.length === 0 ? (
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '60px',
          textAlign: 'center'
        }}>
          <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {searchTerm || categoryFilter !== 'all' ? 'No products found matching your filters' : 'No products yet. Add your first product!'}
          </Text>
        </Card>
      ) : viewMode === 'grid' ? (
        <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="4">
          {filteredProducts.map((product, idx) => (
            <motion.div
              key={product._id}
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
                opacity: product.is_active ? 1 : 0.6
              }}>
                {/* Stock alert */}
                {product.stock_quantity < 10 && (
                  <Box style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    <Flex align="center" gap="1">
                      <ExclamationTriangleIcon width="12" height="12" style={{ color: '#ef4444' }} />
                      <Text size="1" style={{ color: '#ef4444' }}>Low Stock</Text>
                    </Flex>
                  </Box>
                )}

                <Flex direction="column" gap="3">
                  {/* Header */}
                  <Flex align="center" gap="3">
                    <Box style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                      {product.category_emoji || '📦'}
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Heading size="3" style={{ marginBottom: '4px' }}>
                        {product.name}
                      </Heading>
                      <Badge 
                        size="1"
                        color="purple" 
                        variant="soft"
                      >
                        {product.category_name}
                      </Badge>
                    </Box>
                  </Flex>

                  {/* Description */}
                  <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {product.description}
                  </Text>

                  {/* Pricing info */}
                  <Card style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <Grid columns="2" gap="3">
                      <Box>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                          Cost
                        </Text>
                        <Text size="3" style={{ color: '#ef4444' }}>
                          ${product.purchase_price_usdt.toFixed(2)}
                        </Text>
                      </Box>
                      <Box>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                          Price
                        </Text>
                        <Text size="3" weight="bold" style={{ color: '#10b981' }}>
                          ${product.price_usdt.toFixed(2)}
                        </Text>
                      </Box>
                      <Box>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                          Profit
                        </Text>
                        <Text size="3" style={{ color: '#8b5cf6' }}>
                          ${product.profit_usdt.toFixed(2)}
                        </Text>
                      </Box>
                      <Box>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
                          Margin
                        </Text>
                        <Text size="3" style={{ color: '#f59e0b' }}>
                          {product.profit_margin.toFixed(1)}%
                        </Text>
                      </Box>
                    </Grid>
                  </Card>

                  {/* Stats */}
                  <Flex align="center" justify="between">
                    <Flex align="center" gap="3">
                      <Box>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Stock</Text>
                        <Text size="2" weight="bold">{product.stock_quantity}</Text>
                      </Box>
                      <Separator orientation="vertical" size="1" />
                      <Box>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Sold</Text>
                        <Text size="2" weight="bold">{product.sold_count}</Text>
                      </Box>
                    </Flex>
                    <Text size="2" style={{ color: '#10b981' }}>
                      ${(product.profit_usdt * product.sold_count).toFixed(2)} profit
                    </Text>
                  </Flex>

                  {/* Actions */}
                  <Separator size="4" style={{ opacity: 0.1 }} />
                  <Flex gap="2">
                    <Button
                      size="2"
                      variant="soft"
                      onClick={() => handleEdit(product)}
                      style={{ flex: 1 }}
                    >
                      <Pencil1Icon width="16" height="16" />
                      Edit
                    </Button>
                    <IconButton
                      size="2"
                      variant="soft"
                      color="red"
                      onClick={() => handleDelete(product)}
                    >
                      <TrashIcon width="16" height="16" />
                    </IconButton>
                  </Flex>
                </Flex>
              </Card>
            </motion.div>
          ))}
        </Grid>
      ) : (
        <Card style={{
          background: 'rgba(20, 20, 25, 0.6)',
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
                <Table.ColumnHeaderCell>Total Profit</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredProducts.map(product => (
                <Table.Row key={product._id} style={{ opacity: product.is_active ? 1 : 0.6 }}>
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <Box style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px'
                      }}>
                        {product.category_emoji || '📦'}
                      </Box>
                      <Box>
                        <Text size="2" weight="medium">{product.name}</Text>
                        <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {product.description.slice(0, 30)}...
                        </Text>
                      </Box>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="1" color="purple" variant="soft">
                      {product.category_name}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell style={{ color: '#ef4444' }}>
                    ${product.purchase_price_usdt.toFixed(2)}
                  </Table.Cell>
                  <Table.Cell style={{ color: '#10b981', fontWeight: 'bold' }}>
                    ${product.price_usdt.toFixed(2)}
                  </Table.Cell>
                  <Table.Cell>
                    <Flex direction="column" gap="1">
                      <Text size="2" style={{ color: '#8b5cf6' }}>
                        ${product.profit_usdt.toFixed(2)}
                      </Text>
                      <Text size="1" style={{ color: '#f59e0b' }}>
                        {product.profit_margin.toFixed(1)}%
                      </Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      {product.stock_quantity < 10 && (
                        <ExclamationTriangleIcon width="14" height="14" style={{ color: '#ef4444' }} />
                      )}
                      <Text size="2">{product.stock_quantity}</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{product.sold_count}</Text>
                  </Table.Cell>
                  <Table.Cell style={{ color: '#10b981', fontWeight: 'bold' }}>
                    ${(product.profit_usdt * product.sold_count).toFixed(2)}
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="2">
                      <IconButton
                        size="2"
                        variant="soft"
                        onClick={() => handleEdit(product)}
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
