import React, { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, CreditCard, Plus, Edit, Eye, Link, History, AlertCircle } from 'lucide-react';
import { sellersAPI } from '../services/api';

const Sellers = () => {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSeller, setEditingSeller] = useState(null);
    const [viewingEarnings, setViewingEarnings] = useState(null);
    const [earningsData, setEarningsData] = useState(null);
    const [stats, setStats] = useState(null);
    const [referralCodes, setReferralCodes] = useState([]);
    
    const [formData, setFormData] = useState({
        name: '',
        telegram_username: '',
        commission_percentage: 30,
        payout_address: '',
        notes: '',
        is_active: true
    });

    useEffect(() => {
        fetchSellers();
        fetchStats();
        fetchReferralCodes();
    }, []);

    const fetchSellers = async () => {
        try {
            const response = await sellersAPI.getAll();
            setSellers(response.sellers || []);
        } catch (error) {
            console.error('Error fetching sellers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await sellersAPI.getStats();
            setStats(response);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchReferralCodes = async () => {
        try {
            // Fetch all referral codes to show available ones
            const response = await fetch('/api/referrals', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setReferralCodes(data.referrals || []);
        } catch (error) {
            console.error('Error fetching referral codes:', error);
        }
    };

    const fetchSellerEarnings = async (sellerId) => {
        try {
            const response = await sellersAPI.getEarnings(sellerId);
            setEarningsData(response);
            setViewingEarnings(sellerId);
        } catch (error) {
            console.error('Error fetching earnings:', error);
            alert('Error loading earnings data');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (editingSeller) {
                await sellersAPI.update(editingSeller._id, formData);
                alert('✅ Seller updated successfully!');
            } else {
                await sellersAPI.create(formData);
                alert('✅ Seller created successfully!');
            }
            
            resetForm();
            fetchSellers();
            fetchStats();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const handlePayout = async (sellerId, pendingAmount) => {
        const amount = prompt(`Enter payout amount (Max: $${pendingAmount}):`);
        if (!amount) return;
        
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert('Invalid amount');
            return;
        }
        
        if (parsedAmount > parseFloat(pendingAmount)) {
            alert(`Amount cannot exceed pending earnings ($${pendingAmount})`);
            return;
        }
        
        const notes = prompt('Add notes (optional):');
        
        try {
            await sellersAPI.createPayout(sellerId, {
                amount: parsedAmount,
                payment_method: 'USDT',
                notes: notes || ''
            });
            
            alert(`✅ Payout of $${parsedAmount.toFixed(2)} processed!`);
            fetchSellers();
            fetchStats();
            
            // Refresh earnings if viewing
            if (viewingEarnings === sellerId) {
                fetchSellerEarnings(sellerId);
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const assignReferralCode = async (sellerId, codeId) => {
        if (!confirm('Assign this referral code to the seller?')) return;
        
        try {
            await sellersAPI.assignReferralCode(codeId, sellerId);
            alert('✅ Referral code assigned!');
            fetchSellers();
            fetchReferralCodes();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            telegram_username: '',
            commission_percentage: 30,
            payout_address: '',
            notes: '',
            is_active: true
        });
        setEditingSeller(null);
        setShowForm(false);
    };

    const handleEdit = (seller) => {
        setEditingSeller(seller);
        setFormData({
            name: seller.name,
            telegram_username: seller.telegram_username,
            commission_percentage: seller.commission_percentage,
            payout_address: seller.payout_address || '',
            notes: seller.notes || '',
            is_active: seller.is_active
        });
        setShowForm(true);
    };

    if (loading) {
        return <div className="loading">Loading sellers...</div>;
    }

    return (
        <div className="sellers-section">
            <div className="section-header">
                <h2>👥 Seller Management</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    <Plus size={20} /> Add Seller
                </button>
            </div>

            {/* Stats Overview */}
            {stats && (
                <div className="stats-grid" style={{ marginBottom: '30px' }}>
                    <div className="stat-card">
                        <div className="stat-icon users">
                            <Users />
                        </div>
                        <div className="stat-content">
                            <h3>Active Sellers</h3>
                            <p className="stat-number">{stats.total_sellers}</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon revenue">
                            <DollarSign />
                        </div>
                        <div className="stat-content">
                            <h3>Total Earnings</h3>
                            <p className="stat-number">${stats.total_earnings}</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon" style={{background: 'linear-gradient(135deg, #ffa500 0%, #ff6b6b 100%)'}}>
                            <CreditCard />
                        </div>
                        <div className="stat-content">
                            <h3>Pending Payouts</h3>
                            <p className="stat-number">${stats.total_pending}</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon" style={{background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)'}}>
                            <TrendingUp />
                        </div>
                        <div className="stat-content">
                            <h3>This Month Paid</h3>
                            <p className="stat-number">${stats.monthly_payouts}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Seller Form */}
            {showForm && (
                <div className="product-form" style={{ marginBottom: '30px' }}>
                    <h3>{editingSeller ? 'Edit Seller' : 'Add New Seller'}</h3>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="Seller Name"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                        
                        <input
                            type="text"
                            placeholder="Telegram Username (without @)"
                            value={formData.telegram_username}
                            onChange={(e) => setFormData({...formData, telegram_username: e.target.value})}
                            required
                        />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                            <input
                                type="number"
                                placeholder="Commission %"
                                value={formData.commission_percentage}
                                onChange={(e) => setFormData({...formData, commission_percentage: parseFloat(e.target.value)})}
                                min="0"
                                max="100"
                                step="0.1"
                                required
                            />
                            
                            <input
                                type="text"
                                placeholder="USDT Payout Address (optional)"
                                value={formData.payout_address}
                                onChange={(e) => setFormData({...formData, payout_address: e.target.value})}
                            />
                        </div>
                        
                        <textarea
                            placeholder="Notes (optional)"
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        />
                        
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                            />
                            Active Seller
                        </label>
                        
                        <div className="form-buttons">
                            <button type="submit" className="btn-success">
                                {editingSeller ? 'Update' : 'Create'} Seller
                            </button>
                            <button type="button" className="btn-cancel" onClick={resetForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Sellers Table */}
            <div className="sellers-table" style={{ marginBottom: '30px' }}>
                {sellers.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                        No sellers yet. Add your first seller to start the referral program!
                    </div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Telegram</th>
                                <th>Commission</th>
                                <th>Referral Codes</th>
                                <th>Total Earned</th>
                                <th>Pending</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sellers.map(seller => (
                                <tr key={seller._id}>
                                    <td style={{ fontWeight: 'bold' }}>{seller.name}</td>
                                    <td>@{seller.telegram_username}</td>
                                    <td>
                                        <span style={{
                                            background: '#667eea',
                                            padding: '5px 10px',
                                            borderRadius: '20px',
                                            fontSize: '12px'
                                        }}>
                                            {seller.commission_percentage}%
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {seller.referral_codes?.map(code => (
                                                <span key={code.code} style={{
                                                    background: '#2a2a2a',
                                                    padding: '3px 8px',
                                                    borderRadius: '5px',
                                                    fontSize: '11px'
                                                }}>
                                                    {code.code} ({code.uses} uses)
                                                </span>
                                            ))}
                                            {seller.referral_codes?.length === 0 && (
                                                <span style={{ color: '#666', fontSize: '12px' }}>No codes</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ color: '#00c896', fontWeight: 'bold' }}>
                                        ${seller.total_earnings}
                                    </td>
                                    <td style={{ color: '#ffa500', fontWeight: 'bold' }}>
                                        ${seller.pending_earnings}
                                    </td>
                                    <td>
                                        <span className={`status status-${seller.is_active ? 'active' : 'inactive'}`}>
                                            {seller.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                onClick={() => fetchSellerEarnings(seller._id)}
                                                className="btn-edit"
                                                style={{ padding: '5px 10px' }}
                                                title="View Earnings"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(seller)}
                                                className="btn-edit"
                                                style={{ padding: '5px 10px' }}
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            {parseFloat(seller.pending_earnings) > 0 && (
                                                <button
                                                    onClick={() => handlePayout(seller._id, seller.pending_earnings)}
                                                    style={{
                                                        padding: '5px 10px',
                                                        background: '#00c896',
                                                        border: 'none',
                                                        borderRadius: '5px',
                                                        color: '#fff',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Process Payout"
                                                >
                                                    <CreditCard size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Earnings Detail Modal */}
            {viewingEarnings && earningsData && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#1a1a1a',
                        borderRadius: '20px',
                        padding: '30px',
                        maxWidth: '900px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        width: '90%'
                    }}>
                        <h3 style={{ marginBottom: '20px' }}>
                            💰 Earnings Report: {earningsData.seller.name}
                        </h3>
                        
                        {/* Summary */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '15px',
                            marginBottom: '30px'
                        }}>
                            <div style={{
                                background: '#2a2a2a',
                                padding: '15px',
                                borderRadius: '10px'
                            }}>
                                <div style={{ color: '#888', fontSize: '12px' }}>Total Earned</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#00c896' }}>
                                    ${earningsData.summary.total_earnings}
                                </div>
                            </div>
                            <div style={{
                                background: '#2a2a2a',
                                padding: '15px',
                                borderRadius: '10px'
                            }}>
                                <div style={{ color: '#888', fontSize: '12px' }}>Total Paid</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
                                    ${earningsData.summary.total_paid}
                                </div>
                            </div>
                            <div style={{
                                background: '#2a2a2a',
                                padding: '15px',
                                borderRadius: '10px'
                            }}>
                                <div style={{ color: '#888', fontSize: '12px' }}>Pending</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffa500' }}>
                                    ${earningsData.summary.pending_payout}
                                </div>
                            </div>
                            <div style={{
                                background: '#2a2a2a',
                                padding: '15px',
                                borderRadius: '10px'
                            }}>
                                <div style={{ color: '#888', fontSize: '12px' }}>Total Orders</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                                    {earningsData.summary.total_orders}
                                </div>
                            </div>
                        </div>
                        
                        {/* Earnings Details */}
                        <h4 style={{ marginBottom: '15px' }}>📊 Order Commissions</h4>
                        <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            marginBottom: '30px'
                        }}>
                            {earningsData.earnings.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                    No earnings yet
                                </div>
                            ) : (
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr style={{ background: '#2a2a2a' }}>
                                            <th style={{ padding: '10px' }}>Date</th>
                                            <th>Order</th>
                                            <th>Code</th>
                                            <th>Order Total</th>
                                            <th>Profit</th>
                                            <th>Rate</th>
                                            <th>Commission</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {earningsData.earnings.map((earning, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '10px', fontSize: '12px' }}>
                                                    {new Date(earning.date).toLocaleDateString()}
                                                </td>
                                                <td style={{ fontSize: '12px' }}>
                                                    {earning.order_number}
                                                </td>
                                                <td>
                                                    <code style={{
                                                        background: '#3a3a3a',
                                                        padding: '2px 6px',
                                                        borderRadius: '3px',
                                                        fontSize: '11px'
                                                    }}>
                                                        {earning.referral_code}
                                                    </code>
                                                </td>
                                                <td>${earning.order_total}</td>
                                                <td style={{ color: '#888' }}>${earning.order_profit}</td>
                                                <td>{earning.commission_rate}%</td>
                                                <td style={{ color: '#00c896', fontWeight: 'bold' }}>
                                                    ${earning.commission_earned}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        {/* Payout History */}
                        <h4 style={{ marginBottom: '15px' }}>💳 Payout History</h4>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {earningsData.payout_history.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                    No payouts yet
                                </div>
                            ) : (
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr style={{ background: '#2a2a2a' }}>
                                            <th style={{ padding: '10px' }}>Date</th>
                                            <th>Amount</th>
                                            <th>Method</th>
                                            <th>Transaction ID</th>
                                            <th>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {earningsData.payout_history.map((payout, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '10px', fontSize: '12px' }}>
                                                    {new Date(payout.created_at).toLocaleDateString()}
                                                </td>
                                                <td style={{ color: '#00c896', fontWeight: 'bold' }}>
                                                    ${payout.amount.toFixed(2)}
                                                </td>
                                                <td>{payout.payment_method}</td>
                                                <td style={{ fontSize: '11px' }}>
                                                    {payout.transaction_id || '—'}
                                                </td>
                                                <td style={{ fontSize: '11px', color: '#888' }}>
                                                    {payout.notes || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        <button
                            onClick={() => {
                                setViewingEarnings(null);
                                setEarningsData(null);
                            }}
                            style={{
                                marginTop: '20px',
                                padding: '12px 24px',
                                background: '#3a3a3a',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                cursor: 'pointer',
                                width: '100%'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Top Sellers */}
            {stats && stats.top_sellers && stats.top_sellers.length > 0 && (
                <div style={{
                    background: '#1a1a1a',
                    borderRadius: '15px',
                    padding: '25px',
                    border: '1px solid #2a2a2a'
                }}>
                    <h3 style={{ marginBottom: '20px' }}>🏆 Top Performing Sellers</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {stats.top_sellers.map((seller, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '15px',
                                background: '#2a2a2a',
                                borderRadius: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{
                                        width: '30px',
                                        height: '30px',
                                        background: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#667eea',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold'
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <span style={{ fontWeight: 'bold' }}>{seller.name}</span>
                                </div>
                                <span style={{ color: '#00c896', fontWeight: 'bold', fontSize: '18px' }}>
                                    ${seller.earnings}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sellers;
