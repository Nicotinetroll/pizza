import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { categoriesAPI } from '../services/api';

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

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await categoriesAPI.getAll();
            setCategories(response.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            if (editingCategory) {
                await categoriesAPI.update(editingCategory._id, formData);
                alert('✅ Category updated successfully!');
            } else {
                await categoriesAPI.create(formData);
                alert('✅ Category created successfully!');
            }

            resetForm();
            fetchCategories();
        } catch (error) {
            setFormError(error.response?.data?.detail || error.message || 'Error saving category');
        }
    };

    const handleDelete = async (category) => {
        if (category.product_count > 0) {
            alert(`❌ Cannot delete category with ${category.product_count} products!\n\nRemove all products first.`);
            return;
        }

        if (!confirm(`Delete category "${category.name}"?\n\nThis cannot be undone!`)) return;

        try {
            await categoriesAPI.delete(category._id);
            alert('✅ Category deleted!');
            fetchCategories();
        } catch (error) {
            alert('❌ Error: ' + (error.response?.data?.detail || error.message));
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

    const commonEmojis = ['💪', '🍕', '💉', '🏋️', '🔥', '⚡', '💊', '🚀', '📦', '🎯', '💯', '⭐'];

    if (loading) {
        return <div className="loading">Loading categories...</div>;
    }

    return (
        <div className="categories-section">
            <div className="section-header">
                <h2>Categories ({categories.length})</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    <Plus size={20} /> Add Category
                </button>
            </div>

            {showForm && (
                <div className="product-form">
                    <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="Category Name (e.g., Bulking Essentials)"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                            maxLength={50}
                        />

                        <textarea
                            placeholder="Description (min 10 characters)"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            required
                            minLength={10}
                            maxLength={200}
                        />

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', color: '#888' }}>
                                Select Emoji:
                            </label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {commonEmojis.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setFormData({...formData, emoji})}
                                        style={{
                                            padding: '10px',
                                            fontSize: '24px',
                                            background: formData.emoji === emoji ? '#667eea' : '#2a2a2a',
                                            border: '1px solid #3a3a3a',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
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
                                style={{ marginTop: '10px' }}
                            />
                        </div>

                        <input
                            type="number"
                            placeholder="Display Order (1 = first)"
                            value={formData.order}
                            onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 1})}
                            min="1"
                            max="99"
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                            />
                            Active (visible in bot)
                        </label>

                        {formError && (
                            <div style={{
                                color: '#ff6b6b',
                                padding: '10px',
                                background: 'rgba(255, 107, 107, 0.1)',
                                borderRadius: '5px',
                                marginTop: '10px',
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
                                {editingCategory ? 'Update' : 'Add'} Category
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

            <div className="categories-grid" style={{ marginTop: '20px' }}>
                {categories.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                        No categories yet. Create your first category to organize products!
                    </div>
                ) : (
                    <table style={{ width: '100%', background: '#1a1a1a', borderRadius: '15px', overflow: 'hidden' }}>
                        <thead>
                        <tr style={{ background: '#2a2a2a' }}>
                            <th style={{ padding: '15px' }}>Order</th>
                            <th>Emoji</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Products</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {categories.map(category => (
                            <tr key={category._id}>
                                <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span style={{
                        background: '#667eea',
                        padding: '5px 10px',
                        borderRadius: '20px',
                        fontWeight: 'bold'
                    }}>
                      {category.order}
                    </span>
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '24px' }}>
                                    {category.emoji || '📦'}
                                </td>
                                <td style={{ fontWeight: 'bold' }}>{category.name}</td>
                                <td style={{ color: '#888', maxWidth: '300px' }}>{category.description}</td>
                                <td style={{ textAlign: 'center' }}>
                    <span style={{
                        background: category.product_count > 0 ? '#00c896' : '#ff6b6b',
                        padding: '5px 10px',
                        borderRadius: '20px',
                        fontSize: '12px'
                    }}>
                      {category.product_count || 0}
                    </span>
                                </td>
                                <td>
                    <span className={`status status-${category.is_active ? 'active' : 'inactive'}`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="btn-edit"
                                            style={{ padding: '5px 10px' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category)}
                                            className="btn-delete"
                                            style={{ padding: '5px 10px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Categories;