import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, X, Grid } from 'lucide-react';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        emoji: '📦',
        description: '',
        order: 1,
        is_active: true
    });
    const [formError, setFormError] = useState('');

    // API helper functions
    const apiCall = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                ...options.headers
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/';
            }
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    };

    const categoriesAPI = {
        getAll: () => apiCall('/api/categories'),
        create: (data) => apiCall('/api/categories', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => apiCall(`/api/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => apiCall(`/api/categories/${id}`, {
            method: 'DELETE'
        })
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await categoriesAPI.getAll();
            setCategories(response.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            showToast('❌ Error loading categories', 'error');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        if (!formData.name || formData.name.length < 2) {
            setFormError('Category name must be at least 2 characters');
            return false;
        }
        if (!formData.description || formData.description.length < 10) {
            setFormError('Description must be at least 10 characters');
            return false;
        }
        if (!formData.emoji) {
            setFormError('Please select an emoji for the category');
            return false;
        }
        setFormError('');
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            if (editingCategory) {
                await categoriesAPI.update(editingCategory._id, formData);
                showToast('✅ Category updated successfully!', 'success');
            } else {
                await categoriesAPI.create(formData);
                showToast('✅ Category created successfully!', 'success');
            }

            resetForm();
            fetchCategories();
        } catch (error) {
            setFormError(error.message || 'Error saving category');
        }
    };

    const handleDelete = async (category) => {
        if (category.product_count > 0) {
            showToast(`❌ Cannot delete category with ${category.product_count} products!`, 'error');
            return;
        }

        if (!window.confirm(`Delete category "${category.name}"?\n\nThis cannot be undone!`)) return;

        try {
            await categoriesAPI.delete(category._id);
            showToast('✅ Category deleted!', 'success');
            fetchCategories();
        } catch (error) {
            showToast('❌ Error: ' + error.message, 'error');
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            emoji: category.emoji || '📦',
            description: category.description,
            order: category.order || 1,
            is_active: category.is_active !== false
        });
        setShowForm(true);
        setFormError('');
    };

    const resetForm = () => {
        setFormData({
            name: '',
            emoji: '📦',
            description: '',
            order: categories.length + 1,
            is_active: true
        });
        setEditingCategory(null);
        setShowForm(false);
        setFormError('');
    };

    const showToast = (message, type) => {
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

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

    const commonEmojis = ['💪', '🏋️', '💉', '💊', '🔥', '⚡', '🚀', '⭐', '💯', '🎯', '📦', '🛡️'];

    if (loading) {
        return (
            <div className="categories-section">
                <div className="section-header">
                    <h2 className="skeleton" style={{width: '150px', height: '36px'}}></h2>
                    <div className="skeleton" style={{width: '140px', height: '44px', borderRadius: '12px'}}></div>
                </div>
                <div className="categories-list">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="category-card skeleton" style={{height: '120px'}}></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="categories-section">
            <div className="section-header">
                <h2>Categories ({categories.length})</h2>
                <button
                    className="btn btn-primary desktop-only"
                    onClick={() => setShowForm(!showForm)}
                >
                    <Plus size={20} /> Add Category
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <div className="form-header">
                        <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                        <button className="close-button" onClick={resetForm}>
                            <X size={24} />
                        </button>
                    </div>

                    <div>
                        <div className="form-group">
                            <label>Category Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Bulking Essentials"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                maxLength={50}
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                placeholder="Category description (min 10 characters)"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                minLength={10}
                                maxLength={200}
                                rows={3}
                            />
                        </div>

                        <div className="form-group">
                            <label>Select Emoji</label>
                            <div className="emoji-picker">
                                {commonEmojis.map(emoji => (
                                    <button
                                        key={emoji}
                                        className={`emoji-option ${formData.emoji === emoji ? 'selected' : ''}`}
                                        onClick={() => setFormData({...formData, emoji})}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Or type custom emoji"
                                value={formData.emoji}
                                onChange={(e) => setFormData({...formData, emoji: e.target.value})}
                                maxLength={2}
                                style={{ marginTop: '12px' }}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Display Order</label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={formData.order}
                                    onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 1})}
                                    min="1"
                                    max="99"
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                    />
                                    <span>Active</span>
                                </label>
                            </div>
                        </div>

                        {formError && (
                            <div className="error-message">
                                <AlertCircle size={16} />
                                {formError}
                            </div>
                        )}

                        <div className="form-buttons">
                            <button className="btn btn-success" onClick={handleSubmit}>
                                {editingCategory ? 'Update' : 'Add'} Category
                            </button>
                            <button className="btn btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {categories.length === 0 ? (
                <div className="empty-state">
                    <Grid size={48} />
                    <h3>No categories yet</h3>
                    <p>Create your first category to organize products!</p>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={20} /> Create Category
                    </button>
                </div>
            ) : (
                <div className="categories-list">
                    {categories.map(category => (
                        <div key={category._id} className="category-card">
                            <div className="category-header">
                                <div className="category-emoji">{category.emoji || '📦'}</div>
                                <div className="category-info">
                                    <h3>{category.name}</h3>
                                    <p>{category.description}</p>
                                </div>
                                <div className="category-order">
                                    <span className="order-badge">{category.order}</span>
                                </div>
                            </div>

                            <div className="category-stats">
                                <div className="stat">
                                    <span className="stat-label">Products</span>
                                    <span className="stat-value">{category.product_count || 0}</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-label">Status</span>
                                    <span className={`status status-${category.is_active ? 'active' : 'inactive'}`}>
                                        {category.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            <div className="category-actions">
                                <button onClick={() => handleEdit(category)} className="btn btn-secondary">
                                    <Edit size={16} /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(category)}
                                    className="btn btn-danger"
                                    disabled={category.product_count > 0}
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floating Action Button for Mobile */}
            <button className="fab" onClick={() => setShowForm(true)}>
                <Plus size={24} />
            </button>

            <style>{`
                .categories-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 20px;
                    margin-top: 24px;
                }

                .category-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--separator);
                    border-radius: var(--radius);
                    padding: 24px;
                    transition: var(--transition);
                }

                .category-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                }

                .category-header {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 20px;
                    align-items: flex-start;
                }

                .category-emoji {
                    font-size: 48px;
                    width: 64px;
                    height: 64px;
                    background: var(--bg-tertiary);
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .category-info {
                    flex: 1;
                }

                .category-info h3 {
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }

                .category-info p {
                    font-size: 14px;
                    color: var(--text-secondary);
                    line-height: 1.5;
                }

                .category-order {
                    flex-shrink: 0;
                }

                .order-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    background: var(--accent-primary);
                    color: white;
                    border-radius: 50%;
                    font-weight: 700;
                    font-size: 16px;
                }

                .category-stats {
                    display: flex;
                    gap: 24px;
                    padding: 16px 0;
                    border-top: 1px solid var(--separator);
                    border-bottom: 1px solid var(--separator);
                    margin-bottom: 20px;
                }

                .stat {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .stat-label {
                    font-size: 12px;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .stat-value {
                    font-size: 18px;
                    font-weight: 600;
                }

                .category-actions {
                    display: flex;
                    gap: 12px;
                }

                .category-actions button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .emoji-picker {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 8px;
                }

                .emoji-option {
                    width: 56px;
                    height: 56px;
                    font-size: 28px;
                    background: var(--bg-tertiary);
                    border: 2px solid transparent;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: var(--transition);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .emoji-option:hover {
                    background: var(--bg-elevated);
                }

                .emoji-option.selected {
                    background: var(--accent-primary);
                    border-color: var(--accent-primary);
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 12px 0;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                .form-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
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

                @media (max-width: 768px) {
                    .categories-list {
                        grid-template-columns: 1fr;
                    }
                    
                    .emoji-picker {
                        grid-template-columns: repeat(4, 1fr);
                    }
                    
                    .category-actions {
                        flex-direction: column;
                    }
                    
                    .category-actions button {
                        width: 100%;
                    }
                }

                @media (max-width: 640px) {
                    .category-header {
                        flex-wrap: wrap;
                    }
                    
                    .category-order {
                        position: absolute;
                        top: 24px;
                        right: 24px;
                    }
                    
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default Categories;