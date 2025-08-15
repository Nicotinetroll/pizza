import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { productsAPI, categoriesAPI } from '../services/api';

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
      setFormError('Price must be greater than 0');
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

  return (
      <div className="products-section">
        <div className="section-header">
          <h2>Products ({filteredProducts.length})</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
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

                <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="99999"
                    placeholder="Price (USDT)"
                    value={formData.price_usdt}
                    onChange={(e) => setFormData({...formData, price_usdt: e.target.value})}
                    required
                />

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
                    <div className="product-info">
                      <span className="price">${formatPrice(product.price_usdt)}</span>
                      <div>
                        <span className="sold">Sold: {product.sold_count || 0}</span>
                        {product.stock_quantity < 10 && (
                            <span style={{
                              marginLeft: '10px',
                              color: '#ff6b6b',
                              fontWeight: 'bold'
                            }}>
                      Low Stock: {product.stock_quantity}
                    </span>
                        )}
                      </div>
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