import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';

// Mock API for demo
const mockAPI = {
  products: {
    getAll: async () => ({
      products: [
        {
          _id: '1',
          name: 'Test E 250',
          description: 'Testosterone Enanthate 250mg/ml',
          price_usdt: 65,
          purchase_price_usdt: 35,
          profit_usdt: 30,
          profit_margin: 85.71,
          category_id: '1',
          category_name: 'Bulking',
          stock_quantity: 150,
          sold_count: 45,
          is_active: true
        },
        {
          _id: '2',
          name: 'Deca 300',
          description: 'Nandrolone Decanoate 300mg/ml',
          price_usdt: 75,
          purchase_price_usdt: 40,
          profit_usdt: 35,
          profit_margin: 87.5,
          category_id: '1',
          category_name: 'Bulking',
          stock_quantity: 120,
          sold_count: 38,
          is_active: true
        }
      ]
    }),
    create: async (product) => ({ id: 'new-id', message: 'Product created' }),
    update: async (id, product) => ({ message: 'Product updated' }),
    delete: async (id) => ({ message: 'Product deleted' })
  },
  categories: {
    getAll: async () => ({
      categories: [
        { _id: '1', name: 'Bulking', emoji: '💪' },
        { _id: '2', name: 'Cutting', emoji: '✂️' },
        { _id: '3', name: 'PCT', emoji: '🛡️' }
      ]
    })
  }
};

// Use mock API if real API not available
const productsAPI = window.productsAPI || mockAPI.products;
const categoriesAPI = window.categoriesAPI || mockAPI.categories;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_usdt: '',
    purchase_price_usdt: '',
    category_id: '',
    stock_quantity: 999
  });
  const [formError, setFormError] = useState('');

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
    }
  };

  const validateForm = () => {
    if (!formData.name || formData.name.length < 2) {
      setFormError('Product name must be at least 2 characters');
      return false;
    }
    if (!formData.description || formData.description.length < 10) {
      setFormError('Description must be at least 10 characters');
      return false;
    }
    if (!formData.price_usdt || formData.price_usdt <= 0) {
      setFormError('Selling price must be greater than 0');
      return false;
    }
    if (!formData.purchase_price_usdt || formData.purchase_price_usdt <= 0) {
      setFormError('Purchase price must be greater than 0');
      return false;
    }
    if (parseFloat(formData.purchase_price_usdt) >= parseFloat(formData.price_usdt)) {
      setFormError('Selling price must be higher than purchase price');
      return false;
    }
    if (formData.price_usdt > 99999) {
      setFormError('Price cannot exceed $99,999');
      return false;
    }
    if (!formData.category_id) {
      setFormError('Please select a category');
      return false;
    }
    setFormError('');
    return true;
  };

  const calculateProfitMetrics = () => {
    const selling = parseFloat(formData.price_usdt) || 0;
    const purchase = parseFloat(formData.purchase_price_usdt) || 0;
    const profit = selling - purchase;
    const margin = purchase > 0 ? ((profit / purchase) * 100) : 0;
    return { profit, margin };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct._id, formData);
        alert('✅ Product updated successfully!');
      } else {
        await productsAPI.create({
          ...formData,
          is_active: true
        });
        alert('✅ Product created successfully!');
      }

      resetForm();
      fetchData();
    } catch (error) {
      setFormError(error.message || 'Error saving product');
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?\n\nThis cannot be undone!`)) return;

    try {
      await productsAPI.delete(product._id);
      alert('✅ Product deleted!');
      fetchData();
    } catch (error) {
      alert('❌ Error deleting product: ' + error.message);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price_usdt: product.price_usdt,
      purchase_price_usdt: product.purchase_price_usdt || '',
      category_id: product.category_id || '',
      stock_quantity: product.stock_quantity || 999
    });
    setShowForm(true);
    setFormError('');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_usdt: '',
      purchase_price_usdt: '',
      category_id: categories.length > 0 ? categories[0]._id : '',
      stock_quantity: 999
    });
    setEditingProduct(null);
    setShowForm(false);
    setFormError('');
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  // Filter products by category
  const filteredProducts = selectedCategory === 'all'
      ? products
      : products.filter(p => p.category_id === selectedCategory);

  // Calculate total profit potential
  const totalPotentialProfit = filteredProducts.reduce((sum, product) => {
    return sum + (product.profit_usdt * product.stock_quantity);
  }, 0);

  const totalRealizedProfit = filteredProducts.reduce((sum, product) => {
    return sum + (product.profit_usdt * (product.sold_count || 0));
  }, 0);

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  if (categories.length === 0) {
    return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={48} style={{ color: '#ff6b6b', marginBottom: '20px' }} />
          <h2 style={{ color: '#ff6b6b' }}>No Categories Found!</h2>
          <p style={{ color: '#888', marginTop: '10px' }}>
            You need to create at least one category before adding products.
          </p>
          <p style={{ color: '#888' }}>
            Go to the Categories tab to create your first category.
          </p>
        </div>
    );
  }

  const { profit: currentProfit, margin: currentMargin } = calculateProfitMetrics();

  return (
      <div className="products-section">
        <div className="section-header">
          <h2>Products ({filteredProducts.length})</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Profit Summary */}
            <div style={{
              display: 'flex',
              gap: '15px',
              padding: '10px 20px',
              background: '#2a2a2a',
              borderRadius: '10px',
              marginRight: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <TrendingUp size={16} style={{ color: '#00c896' }} />
                <span style={{ fontSize: '12px', color: '#888' }}>Realized:</span>
                <span style={{ fontSize: '14px', color: '#00c896', fontWeight: 'bold' }}>
                  ${formatPrice(totalRealizedProfit)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <DollarSign size={16} style={{ color: '#667eea' }} />
                <span style={{ fontSize: '12px', color: '#888' }}>Potential:</span>
                <span style={{ fontSize: '14px', color: '#667eea', fontWeight: 'bold' }}>
                  ${formatPrice(totalPotentialProfit)}
                </span>
              </div>
            </div>

            <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '12px 20px',
                  background: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  borderRadius: '10px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.emoji} {cat.name}
                  </option>
              ))}
            </select>
            <button
                className="btn-primary"
                onClick={() => setShowForm(!showForm)}
            >
              <Plus size={20} /> Add Product
            </button>
          </div>
        </div>

        {showForm && (
            <div className="product-form">
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Product Name (e.g., Test E 250)"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    maxLength={100}
                />

                <textarea
                    placeholder="Description (min 10 characters)"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                    minLength={10}
                    maxLength={500}
                />

                <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '15px',
                      margin: '10px 0',
                      background: '#2a2a2a',
                      border: '1px solid #3a3a3a',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '16px'
                    }}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>
                        {cat.emoji} {cat.name}
                      </option>
                  ))}
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="99999"
                      placeholder="Purchase Price (Cost) USDT"
                      value={formData.purchase_price_usdt}
                      onChange={(e) => setFormData({...formData, purchase_price_usdt: e.target.value})}
                      required
                      style={{ background: '#1a1a1a' }}
                  />

                  <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="99999"
                      placeholder="Selling Price USDT"
                      value={formData.price_usdt}
                      onChange={(e) => setFormData({...formData, price_usdt: e.target.value})}
                      required
                      style={{ background: '#1a1a1a' }}
                  />
                </div>

                {/* Live Profit Calculator */}
                {formData.price_usdt && formData.purchase_price_usdt && (
                    <div style={{
                      padding: '15px',
                      background: 'linear-gradient(135deg, rgba(0, 200, 150, 0.1) 0%, rgba(102, 126, 234, 0.1) 100%)',
                      borderRadius: '10px',
                      border: '1px solid #3a3a3a',
                      margin: '10px 0'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <span style={{ fontSize: '12px', color: '#888' }}>Profit per Unit:</span>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#00c896' }}>
                            ${formatPrice(currentProfit)}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', color: '#888' }}>Profit Margin:</span>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
                            {formatPrice(currentMargin)}%
                          </div>
                        </div>
                      </div>
                    </div>
                )}

                <input
                    type="number"
                    min="0"
                    max="9999"
                    placeholder="Stock Quantity (default: 999)"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value) || 999})}
                />

                {formError && (
                    <div style={{
                      color: '#ff6b6b',
                      padding: '10px',
                      background: 'rgba(255, 107, 107, 0.1)',
                      borderRadius: '5px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <AlertCircle size={16} />
                      {formError}
                    </div>
                )}

                <div className="form-buttons">
                  <button type="submit" className="btn-success">
                    {editingProduct ? 'Update' : 'Add'} Product
                  </button>
                  <button
                      type="button"
                      className="btn-cancel"
                      onClick={resetForm}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
        )}

        <div className="products-grid">
          {filteredProducts.length === 0 ? (
              <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#888'}}>
                {selectedCategory !== 'all'
                    ? 'No products in this category. Add some!'
                    : 'No products yet. Add your first product!'}
              </div>
          ) : (
              filteredProducts.map(product => (
                  <div key={product._id} className="product-card">
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px'
                    }}>
                      <h3>{product.name}</h3>
                      <span style={{
                        background: '#667eea',
                        padding: '4px 8px',
                        borderRadius: '20px',
                        fontSize: '12px'
                      }}>
                        {product.category_name || 'Uncategorized'}
                      </span>
                    </div>
                    <p className="product-desc">{product.description}</p>

                    {/* Pricing and Profit Info */}
                    <div style={{
                      background: '#2a2a2a',
                      borderRadius: '10px',
                      padding: '10px',
                      marginBottom: '15px'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#888' }}>Cost:</span>
                          <div style={{ color: '#ff6b6b' }}>${formatPrice(product.purchase_price_usdt)}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#888' }}>Sell:</span>
                          <div style={{ color: '#00c896', fontWeight: 'bold' }}>${formatPrice(product.price_usdt)}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#888' }}>Profit:</span>
                          <div style={{ color: '#667eea' }}>${formatPrice(product.profit_usdt)}</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#888' }}>Margin:</span>
                          <div style={{ color: '#ffa500' }}>{formatPrice(product.profit_margin)}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="product-info">
                      <div>
                        <span className="sold">Sold: {product.sold_count || 0}</span>
                        <span style={{ marginLeft: '10px', color: '#00c896', fontSize: '12px' }}>
                          (${formatPrice((product.profit_usdt || 0) * (product.sold_count || 0))} profit)
                        </span>
                      </div>
                      {product.stock_quantity < 10 && (
                          <span style={{
                            color: '#ff6b6b',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}>
                            Low: {product.stock_quantity}
                          </span>
                      )}
                    </div>

                    <div className="product-actions">
                      <button onClick={() => handleEdit(product)} className="btn-edit">
                        <Edit size={16} /> Edit
                      </button>
                      <button onClick={() => handleDelete(product)} className="btn-delete">
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
              ))
          )}
        </div>
      </div>
  );
};

export default Products;