import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, Copy, Check } from 'lucide-react';
import { referralsAPI } from '../services/api';

const Referrals = () => {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingReferral, setEditingReferral] = useState(null);
    const [copiedCode, setCopiedCode] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        usage_limit: '',
        valid_from: '',
        valid_until: '',
        is_active: true
    });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchReferrals();
    }, []);

    const fetchReferrals = async () => {
        try {
            const response = await referralsAPI.getAll();
            setReferrals(response.referrals || []);
        } catch (error) {
            console.error('Error fetching referrals:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        setFormData({...formData, code});
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const validateForm = () => {
        if (!formData.code || formData.code.length < 3) {
            setFormError('Code must be at least 3 characters');
            return false;
        }
        if (!/^[A-Z0-9]+$/.test(formData.code.toUpperCase())) {
            setFormError('Code must be alphanumeric only');
            return false;
        }
        if (!formData.description) {
            setFormError('Description is required');
            return false;
        }
        if (formData.discount_type === 'percentage' && (formData.discount_value < 0 || formData.discount_value > 100)) {
            setFormError('Percentage must be between 0 and 100');
            return false;
        }
        if (formData.discount_type === 'fixed' && formData.discount_value < 0) {
            setFormError('Fixed discount must be positive');
            return false;
        }
        setFormError('');
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            const data = {
                ...formData,
                code: formData.code.toUpperCase(),
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
                valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
                valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
            };

            if (editingReferral) {
                await referralsAPI.update(editingReferral._id, data);
                alert('✅ Referral code updated successfully!');
            } else {
                await referralsAPI.create(data);
                alert('✅ Referral code created successfully!');
            }

            resetForm();
            fetchReferrals();
        } catch (error) {
            setFormError(error.response?.data?.detail || error.message || 'Error saving referral');
        }
    };

    const handleDelete = async (referral) => {
        if (!confirm(`Delete referral code "${referral.code}"?\n\nThis cannot be undone!`)) return;

        try {
            await referralsAPI.delete(referral._id);
            alert('✅ Referral code deleted!');
            fetchReferrals();
        } catch (error) {
            alert('❌ Error: ' + (error.response?.data?.detail || error.message));
        }
    };

    const handleEdit = (referral) => {
        setEditingReferral(referral);
        setFormData({
            code: referral.code,
            description: referral.description,
            discount_type: referral.discount_type,
            discount_value: referral.discount_value,
            usage_limit: referral.usage_limit || '',
            valid_from: referral.valid_from ? new Date(referral.valid_from).toISOString().split('T')[0] : '',
            valid_until: referral.valid_until ? new Date(referral.valid_until).toISOString().split('T')[0] : '',
            is_active: referral.is_active
        });
        setShowForm(true);
        setFormError('');
    };

    const resetForm = () => {
        setFormData({
            code: '',
            description: '',
            discount_type: 'percentage',
            discount_value: 10,
            usage_limit: '',
            valid_from: '',
            valid_until: '',
            is_active: true
        });
        setEditingReferral(null);
        setShowForm(false);
        setFormError('');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No limit';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'Invalid date';
        }
    };

    if (loading) {
        return <div className="loading">Loading referral codes...</div>;
    }

    return (
        <div className="referrals-section">
            <div className="section-header">
                <h2>Referral Codes ({referrals.length})</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    <Plus size={20} /> Create Code
                </button>
            </div>

            {showForm && (
                <div className="product-form">
                    <h3>{editingReferral ? 'Edit Referral Code' : 'Create New Referral Code'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="Code (e.g., GAINS20)"
                                value={formData.code}
                                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                required
                                maxLength={20}
                                style={{ flex: 1 }}
                            />
                            <button
                                type="button"
                                onClick={generateRandomCode}
                                style={{
                                    padding: '15px 20px',
                                    background: '#667eea',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                Generate
                            </button>
                        </div>

                        <textarea
                            placeholder="Description (e.g., 20% off for new customers)"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            required
                            maxLength={200}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <select
                                value={formData.discount_type}
                                onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                                style={{
                                    padding: '15px',
                                    background: '#2a2a2a',
                                    border: '1px solid #3a3a3a',
                                    borderRadius: '10px',
                                    color: '#fff'
                                }}
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount ($)</option>
                            </select>

                            <input
                                type="number"
                                placeholder={formData.discount_type === 'percentage' ? 'Discount %' : 'Discount $'}
                                value={formData.discount_value}
                                onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                                min="0"
                                max={formData.discount_type === 'percentage' ? "100" : "9999"}
                                step="0.01"
                                required
                            />
                        </div>

                        <input
                            type="number"
                            placeholder="Usage Limit (leave empty for unlimited)"
                            value={formData.usage_limit}
                            onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                            min="0"
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#888', fontSize: '12px' }}>
                                    Valid From (optional)
                                </label>
                                <input
                                    type="date"
                                    value={formData.valid_from}
                                    onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#888', fontSize: '12px' }}>
                                    Valid Until (optional)
                                </label>
                                <input
                                    type="date"
                                    value={formData.valid_until}
                                    onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                                />
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                            />
                            Active (can be used by customers)
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
                                {editingReferral ? 'Update' : 'Create'} Code
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

            <div className="referrals-grid" style={{ marginTop: '20px' }}>
                {referrals.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                        No referral codes yet. Create your first code to offer discounts!
                    </div>
                ) : (
                    <table style={{ width: '100%', background: '#1a1a1a', borderRadius: '15px', overflow: 'hidden' }}>
                        <thead>
                        <tr style={{ background: '#2a2a2a' }}>
                            <th style={{ padding: '15px' }}>Code</th>
                            <th>Description</th>
                            <th>Discount</th>
                            <th>Used / Limit</th>
                            <th>Valid Until</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {referrals.map(referral => (
                            <tr key={referral._id}>
                                <td style={{ padding: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <code style={{
                                            background: '#2a2a2a',
                                            padding: '5px 10px',
                                            borderRadius: '5px',
                                            fontWeight: 'bold'
                                        }}>
                                            {referral.code}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(referral.code)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: copiedCode === referral.code ? '#00c896' : '#888'
                                            }}
                                        >
                                            {copiedCode === referral.code ? <Check size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </td>
                                <td style={{ color: '#888' }}>{referral.description}</td>
                                <td>
                    <span style={{
                        background: referral.discount_type === 'percentage' ? '#667eea' : '#00c896',
                        padding: '5px 10px',
                        borderRadius: '20px',
                        fontSize: '12px'
                    }}>
                      {referral.discount_type === 'percentage'
                          ? `${referral.discount_value}%`
                          : `$${referral.discount_value}`}
                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {referral.used_count || 0} / {referral.usage_limit || '∞'}
                                </td>
                                <td>
                                    {referral.is_expired ? (
                                        <span style={{ color: '#ff6bob' }}>Expired</span>
                                    ) : (
                                        formatDate(referral.valid_until)
                                    )}
                                </td>
                                <td>
                    <span className={`status status-${referral.is_active && !referral.is_expired ? 'active' : 'inactive'}`}>
                      {referral.is_expired ? 'Expired' : (referral.is_active ? 'Active' : 'Inactive')}
                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button
                                            onClick={() => handleEdit(referral)}
                                            className="btn-edit"
                                            style={{ padding: '5px 10px' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(referral)}
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

export default Referrals;