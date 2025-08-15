import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { productsAPI } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_usdt: '',
    stock_quantity: 999
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
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
      fetchProducts();
    } catch (error) {
      setFormError(error.message || 'Error saving product');
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?\n\nThis cannot be undone!`)) return;
    
    try {
      await productsAPI.delete(product._id);
      alert('✅ Product deleted!');
      fetchProducts();
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
      stock_quantity: 999
    });
    setEditingProduct(null);
    setShowForm(false);
    setFormError('');
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="products-section">
      <div className="section-header">
        <h2>Products ({products.length})</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={20} /> Add Product
        </button>
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
        {products.length === 0 ? (
          <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#888'}}>
            No products yet. Add your first product!
          </div>
        ) : (
          products.map(product => (
            <div key={product._id} className="product-card">
              <h3>{product.name}</h3>
              <p className="product-desc">{product.description}</p>
              <div className="product-info">
                <span className="price">${formatPrice(product.price_usdt)}</span>
                <span className="sold">Sold: {product.sold_count || 0}</span>
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
