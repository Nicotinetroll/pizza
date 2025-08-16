import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, Copy, Check, Gift, Calendar, Percent, DollarSign } from 'lucide-react';
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
            showToast('❌ Error loading referral codes', 'error');
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

    const copyToClipboard = async (code) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            showToast('✅ Code copied to clipboard!', 'success');
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (error) {
            showToast('❌ Failed to copy code', 'error');
        }
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
                showToast('✅ Referral code updated successfully!', 'success');
            } else {
                await referralsAPI.create(data);
                showToast('✅ Referral code created successfully!', 'success');
            }

            resetForm();
            fetchReferrals();
        } catch (error) {
            setFormError(error.response?.data?.detail || error.message || 'Error saving referral');
        }
    };

    const handleDelete = async (referral) => {
        if (!window.confirm(`Delete referral code "${referral.code}"?\n\nThis cannot be undone!`)) return;

        try {
            await referralsAPI.delete(referral._id);
            showToast('✅ Referral code deleted!', 'success');
            fetchReferrals();
        } catch (error) {
            showToast('❌ Error: ' + (error.response?.data?.detail || error.message), 'error');
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

    const formatDate = (dateString) => {
        if (!dateString) return 'No limit';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return 'Invalid date';
        }
    };

    if (loading) {
        return (
            <div className="referrals-section">
                <div className="section-header">
                    <h2 className="skeleton" style={{width: '180px', height: '36px'}}></h2>
                    <div className="skeleton" style={{width: '140px', height: '44px', borderRadius: '12px'}}></div>
                </div>
                <div className="referrals-grid">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="referral-card skeleton" style={{height: '200px'}}></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="referrals-section">
            <div className="section-header">
                <h2>Referral Codes ({referrals.length})</h2>
                <button
                    className="btn btn-primary desktop-only"
                    onClick={() => setShowForm(!showForm)}
                >
                    <Plus size={20} /> Create Code
                </button>
            </div>

            {showForm && (
                <div className="form-container">
                    <div className="form-header">
                        <h3>{editingReferral ? 'Edit Referral Code' : 'Create New Referral Code'}</h3>
                        <button className="close-button" onClick={resetForm}>
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Referral Code</label>
                            <div className="input-with-button">
                                <input
                                    type="text"
                                    placeholder="e.g., GAINS20"
                                    value={formData.code}
                                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                    required
                                    maxLength={20}
                                />
                                <button
                                    type="button"
                                    onClick={generateRandomCode}
                                    className="btn btn-secondary"
                                >
                                    Generate
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                placeholder="e.g., 20% off for new customers"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                required
                                maxLength={200}
                                rows={3}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Discount Type</label>
                                <select
                                    value={formData.discount_type}
                                    onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount ($)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Discount Value</label>
                                <div className="input-with-suffix">
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.discount_value}
                                        onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                                        min="0"
                                        max={formData.discount_type === 'percentage' ? "100" : "9999"}
                                        step="0.01"
                                        required
                                    />
                                    <span className="input-suffix">
                                        {formData.discount_type === 'percentage' ? '%' : '$'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Usage Limit (Optional)</label>
                            <input
                                type="number"
                                placeholder="Leave empty for unlimited"
                                value={formData.usage_limit}
                                onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                                min="0"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Valid From (Optional)</label>
                                <input
                                    type="date"
                                    value={formData.valid_from}
                                    onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>Valid Until (Optional)</label>
                                <input
                                    type="date"
                                    value={formData.valid_until}
                                    onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                                />
                            </div>
                        </div>

                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                            />
                            <span>Active (can be used by customers)</span>
                        </label>

                        {formError && (
                            <div className="error-message">
                                <AlertCircle size={16} />
                                {formError}
                            </div>
                        )}

                        <div className="form-buttons">
                            <button type="submit" className="btn btn-success">
                                {editingReferral ? 'Update' : 'Create'} Code
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {referrals.length === 0 ? (
                <div className="empty-state">
                    <Gift size={48} />
                    <h3>No referral codes yet</h3>
                    <p>Create your first code to offer discounts!</p>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={20} /> Create Code
                    </button>
                </div>
            ) : (
                <div className="referrals-grid">
                    {referrals.map(referral => (
                        <div key={referral._id} className="referral-card">
                            <div className="referral-header">
                                <div className="code-section">
                                    <code className="referral-code">{referral.code}</code>
                                    <button
                                        onClick={() => copyToClipboard(referral.code)}
                                        className="copy-button"
                                        aria-label="Copy code"
                                    >
                                        {copiedCode === referral.code ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                                <span className={`status status-${referral.is_active && !referral.is_expired ? 'active' : 'inactive'}`}>
                                    {referral.is_expired ? 'Expired' : (referral.is_active ? 'Active' : 'Inactive')}
                                </span>
                            </div>

                            <p className="referral-description">{referral.description}</p>

                            <div className="referral-stats">
                                <div className="stat">
                                    <div className="stat-icon">
                                        {referral.discount_type === 'percentage' ? <Percent size={16} /> : <DollarSign size={16} />}
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Discount</span>
                                        <span className="stat-value">
                                            {referral.discount_type === 'percentage'
                                                ? `${referral.discount_value}%`
                                                : `$${referral.discount_value}`}
                                        </span>
                                    </div>
                                </div>

                                <div className="stat">
                                    <div className="stat-icon">
                                        <Gift size={16} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Usage</span>
                                        <span className="stat-value">
                                            {referral.used_count || 0} / {referral.usage_limit || '∞'}
                                        </span>
                                    </div>
                                </div>

                                <div className="stat">
                                    <div className="stat-icon">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Valid Until</span>
                                        <span className="stat-value">
                                            {formatDate(referral.valid_until)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="referral-actions">
                                <button onClick={() => handleEdit(referral)} className="btn btn-secondary">
                                    <Edit size={16} /> Edit
                                </button>
                                <button onClick={() => handleDelete(referral)} className="btn btn-danger">
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

            <style jsx>{`
                .referrals-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 20px;
                    margin-top: 24px;
                }

                .referral-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--separator);
                    border-radius: var(--radius);
                    padding: 24px;
                    transition: var(--transition);
                }

                .referral-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                }

                .referral-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .code-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .referral-code {
                    background: var(--bg-tertiary);
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--accent-primary);
                }

                .copy-button {
                    background: var(--bg-tertiary);
                    border: none;
                    padding: 8px;
                    border-radius: 8px;
                    cursor: pointer;
                    color: var(--text-secondary);
                    transition: var(--transition);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .copy-button:hover {
                    background: var(--bg-elevated);
                    color: var(--text-primary);
                }

                .referral-description {
                    color: var(--text-secondary);
                    margin-bottom: 20px;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .referral-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    padding: 20px 0;
                    border-top: 1px solid var(--separator);
                    border-bottom: 1px solid var(--separator);
                    margin-bottom: 20px;
                }

                .stat {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .stat-icon {
                    width: 36px;
                    height: 36px;
                    background: var(--bg-tertiary);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary);
                }

                .stat-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .stat-label {
                    font-size: 12px;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .stat-value {
                    font-size: 16px;
                    font-weight: 600;
                }

                .referral-actions {
                    display: flex;
                    gap: 12px;
                }

                .input-with-button {
                    display: flex;
                    gap: 12px;
                }

                .input-with-button input {
                    flex: 1;
                }

                .input-with-suffix {
                    position: relative;
                }

                .input-suffix {
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-secondary);
                    font-weight: 600;
                    pointer-events: none;
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 12px 0;
                    margin-bottom: 20px;
                }

                @media (max-width: 768px) {
                    .referrals-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .referral-stats {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }
                    
                    .referral-actions {
                        flex-direction: column;
                    }
                    
                    .referral-actions button {
                        width: 100%;
                    }
                }

                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default Referrals;