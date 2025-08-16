import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, Search, Filter, X, Package } from 'lucide-react';
import { productsAPI, categoriesAPI } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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

      // Set default category if available and form is empty
      if (categoriesRes.categories?.length > 0 && !formData.category_id) {
        setFormData(prev => ({ ...prev, category_id: categoriesRes.categories[0]._id }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('❌ Error loading data', 'error');
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

    const price = parseFloat(formData.price_usdt);
    if (!formData.price_usdt || isNaN(price) || price <= 0) {
      setFormError('Price must be greater than 0');
      return false;
    }
    if (price > 99999) {
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
      const dataToSubmit = {
        ...formData,
        price_usdt: parseFloat(formData.price_usdt),
        stock_quantity: parseInt(formData.stock_quantity) || 999
      };

      if (editingProduct) {
        await productsAPI.update(editingProduct._id, dataToSubmit);
        showToast('✅ Product updated successfully!', 'success');
      } else {
        await productsAPI.create({
          ...dataToSubmit,
          is_active: true
        });
        showToast('✅ Product created successfully!', 'success');
      }

      resetForm();
      fetchData();
    } catch (error) {
      setFormError(error.response?.data?.detail || error.message || 'Error saving product');
    }
  };

  const handleDelete = async (product) => {
    // Custom confirm dialog would be better, but using native for now
    const confirmMessage = `Delete "${product.name}"?\n\nThis action cannot be undone!`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await productsAPI.delete(product._id);
      showToast('✅ Product deleted successfully!', 'success');
      fetchData();
    } catch (error) {
      showToast('❌ Error deleting product: ' + (error.response?.data?.detail || error.message), 'error');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price_usdt: product.price_usdt.toString(),
      category_id: product.category_id || '',
      stock_quantity: product.stock_quantity || 999
    });
    setShowForm(true);
    setFormError('');

    // Scroll to form on mobile
    setTimeout(() => {
      document.querySelector('.form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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

  const showToast = (message, type) => {
    // Check if toast already exists
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)'};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: 500;
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
      max-width: 90vw;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00';
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
        <div className="products-section">
          <div className="section-header">
            <h2 className="skeleton" style={{width: '150px', height: '36px'}}></h2>
            <div className="skeleton" style={{width: '140px', height: '44px', borderRadius: '12px'}}></div>
          </div>
          <div className="products-grid">
            {[1,2,3,4,5,6].map(i => (
                <div key={i} className="product-card">
                  <div className="skeleton" style={{width: '100%', height: '24px', marginBottom: '12px'}}></div>
                  <div className="skeleton" style={{width: '100%', height: '60px', marginBottom: '16px'}}></div>
                  <div className="skeleton" style={{width: '80px', height: '32px'}}></div>
                </div>
            ))}
          </div>
        </div>
    );
  }

  if (categories.length === 0) {
    return (
        <div className="empty-state" style={{ marginTop: '60px' }}>
          <AlertCircle size={48} />
          <h3>No Categories Found!</h3>
          <p>You need to create at least one category before adding products.</p>
          <button
              className="btn btn-primary"
              style={{ marginTop: '20px' }}
              onClick={() => {
                // Better navigation handling
                if (window.location.hash !== '#categories') {
                  window.location.hash = '#categories';
                }
              }}
          >
            Go to Categories
          </button>
        </div>
    );
  }

  return (
      <div className="products-section">
        <div className="section-header">
          <h2>Products ({filteredProducts.length})</h2>
          <button
              className="btn btn-primary desktop-only"
              onClick={() => setShowForm(!showForm)}
          >
            <Plus size={20} /> Add Product
          </button>
        </div>

        {/* Search and Filters Bar */}
        <div className="search-filter-bar">
          <div className="search-box">
            <Search size={20} />
            <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
                <button
                    className="clear-search"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                >
                  <X size={16} />
                </button>
            )}
          </div>

          <button
              className="filter-button"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
          >
            <Filter size={20} />
            <span>Filter</span>
            {selectedCategory !== 'all' && (
                <span className="filter-badge">1</span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
            <div className="filters-panel">
              <div className="filter-group">
                <label htmlFor="category-filter">Category</label>
                <select
                    id="category-filter"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="filter-select"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>
                        {cat.emoji} {cat.name}
                      </option>
                  ))}
                </select>
              </div>
              <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedCategory('all');
                    setShowFilters(false);
                  }}
              >
                Clear Filters
              </button>
            </div>
        )}

        {/* Add/Edit Product Form */}
        {showForm && (
            <div className="form-container">
              <div className="form-header">
                <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <button
                    className="close-button"
                    onClick={resetForm}
                    aria-label="Close form"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="product-name">Product Name</label>
                  <input
                      id="product-name"
                      type="text"
                      placeholder="e.g., Test E 250"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      maxLength={100}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="product-description">Description</label>
                  <textarea
                      id="product-description"
                      placeholder="Enter product description (min 10 characters)"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                      minLength={10}
                      maxLength={500}
                      rows={4}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="product-category">Category</label>
                    <select
                        id="product-category"
                        value={formData.category_id}
                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                        required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                          <option key={cat._id} value={cat._id}>
                            {cat.emoji} {cat.name}
                          </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="product-price">Price (USDT)</label>
                    <input
                        id="product-price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="99999"
                        placeholder="0.00"
                        value={formData.price_usdt}
                        onChange={(e) => setFormData({...formData, price_usdt: e.target.value})}
                        required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="product-stock">Stock Quantity</label>
                  <input
                      id="product-stock"
                      type="number"
                      min="0"
                      max="9999"
                      placeholder="999"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value) || 999})}
                  />
                </div>

                {formError && (
                    <div className="error-message">
                      <AlertCircle size={16} />
                      {formError}
                    </div>
                )}

                <div className="form-buttons">
                  <button type="submit" className="btn btn-success">
                    {editingProduct ? 'Update' : 'Add'} Product
                  </button>
                  <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetForm}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
        )}

        {/* Products Grid */}
        <div className="products-grid">
          {filteredProducts.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <Package size={48} />
                <h3>No products found</h3>
                <p>
                  {searchQuery
                      ? 'Try adjusting your search terms'
                      : selectedCategory !== 'all'
                          ? 'No products in this category'
                          : 'Start by adding your first product'}
                </p>
              </div>
          ) : (
              filteredProducts.map(product => {
                const category = categories.find(c => c._id === product.category_id);

                return (
                    <div key={product._id} className="product-card">
                      <div className="product-header">
                        <h3>{product.name}</h3>
                        <span className="product-category">
                    {category?.emoji || '📦'}
                          {' '}
                          {category?.name || 'Uncategorized'}
                  </span>
                      </div>

                      <p className="product-desc">{product.description}</p>

                      <div className="product-info">
                        <div className="price-info">
                          <span className="price">${formatPrice(product.price_usdt)}</span>
                          <span className="sold">Sold: {product.sold_count || 0}</span>
                        </div>

                        {product.stock_quantity < 10 && (
                            <div className="stock-warning">
                              <AlertCircle size={16} />
                              <span>Low Stock: {product.stock_quantity}</span>
                            </div>
                        )}
                      </div>

                      <div className="product-actions">
                        <button
                            onClick={() => handleEdit(product)}
                            className="btn btn-secondary"
                            aria-label={`Edit ${product.name}`}
                        >
                          <Edit size={16} /> Edit
                        </button>
                        <button
                            onClick={() => handleDelete(product)}
                            className="btn btn-danger"
                            aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                );
              })
          )}
        </div>

        {/* Floating Action Button for Mobile */}
        <button
            className="fab"
            onClick={() => setShowForm(true)}
            aria-label="Add new product"
        >
          <Plus size={24} />
        </button>

        <style jsx>{`
          .desktop-only {
            display: flex;
          }

          @media (max-width: 768px) {
            .desktop-only {
              display: none;
            }
          }

          .search-filter-bar {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
          }

          .search-box {
            flex: 1;
            position: relative;
            display: flex;
            align-items: center;
          }

          .search-box svg {
            position: absolute;
            left: 16px;
            color: var(--text-secondary);
            pointer-events: none;
          }

          .search-box input {
            width: 100%;
            padding: 12px 44px;
            background: var(--bg-secondary);
            border: 1px solid var(--separator);
            border-radius: var(--radius-small);
            color: var(--text-primary);
            font-size: 16px;
          }

          .clear-search {
            position: absolute;
            right: 12px;
            background: var(--bg-tertiary);
            border: none;
            padding: 6px;
            border-radius: 50%;
            cursor: pointer;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: var(--transition);
          }

          .clear-search:hover {
            background: var(--bg-elevated);
          }

          .filter-button {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--separator);
            border-radius: var(--radius-small);
            color: var(--text-primary);
            cursor: pointer;
            position: relative;
            transition: var(--transition);
          }

          .filter-button:hover {
            background: var(--bg-tertiary);
          }

          .filter-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: var(--accent-primary);
            color: white;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 10px;
            min-width: 16px;
            text-align: center;
          }

          .filters-panel {
            background: var(--bg-secondary);
            border: 1px solid var(--separator);
            border-radius: var(--radius-small);
            padding: 20px;
            margin-bottom: 20px;
            display: flex;
            gap: 16px;
            align-items: flex-end;
            animation: slideDown 0.3s ease-out;
          }

          .filter-group {
            flex: 1;
          }

          .filter-group label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
          }

          .filter-select {
            width: 100%;
            padding: 12px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--separator);
            border-radius: var(--radius-small);
            color: var(--text-primary);
            font-size: 16px;
            cursor: pointer;
          }

          .form-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }

          .close-button {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 8px;
            margin: -8px;
            border-radius: var(--radius-small);
            transition: var(--transition);
          }

          .close-button:hover {
            background: var(--bg-tertiary);
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .product-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            gap: 12px;
          }

          .product-category {
            font-size: 12px;
            padding: 4px 8px;
            background: var(--bg-tertiary);
            border-radius: 20px;
            color: var(--text-secondary);
            white-space: nowrap;
          }

          .price-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .sold {
            font-size: 13px;
            color: var(--text-secondary);
          }

          .stock-warning {
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--accent-danger);
            font-size: 13px;
            font-weight: 600;
          }

          @media (max-width: 640px) {
            .form-row {
              grid-template-columns: 1fr;
            }

            .filters-panel {
              flex-direction: column;
            }

            .product-actions {
              flex-direction: column;
            }

            .product-actions button {
              width: 100%;
            }
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes slideOutRight {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}</style>
      </div>
  );
};

export default Products;