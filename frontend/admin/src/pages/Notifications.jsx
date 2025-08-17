import React, { useState, useEffect } from 'react';
import { Bell, Send, Clock, DollarSign, Hash, AlertCircle, Plus, Trash2, TestTube, Zap } from 'lucide-react';
import { notificationsAPI } from '../services/api';

const Notifications = () => {
    const [settings, setSettings] = useState({
        enabled: false,
        channel_id: '',
        delay_min: 60,
        delay_max: 300,
        show_exact_amount: false,
        fake_orders_enabled: false,
        fake_orders_per_hour: 2
    });
    const [templates, setTemplates] = useState([]);
    const [newTemplate, setNewTemplate] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showTemplateForm, setShowTemplateForm] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchLogs();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await notificationsAPI.getSettings();
            setSettings(data);
            setTemplates(data.message_templates || []);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const data = await notificationsAPI.getLogs();
            setLogs(data.logs || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            await notificationsAPI.updateSettings(settings);
            alert('✅ Settings saved successfully!');
        } catch (error) {
            alert('❌ Error saving settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const addTemplate = async () => {
        if (!newTemplate.trim()) return;
        
        try {
            await notificationsAPI.addTemplate({
                text: newTemplate,
                type: 'normal',
                enabled: true
            });
            alert('✅ Template added!');
            setNewTemplate('');
            setShowTemplateForm(false);
            fetchSettings();
        } catch (error) {
            alert('❌ Error adding template: ' + error.message);
        }
    };

    const deleteTemplate = async (index) => {
        if (!confirm('Delete this template?')) return;
        
        try {
            await notificationsAPI.deleteTemplate(index);
            alert('✅ Template deleted!');
            fetchSettings();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const sendTestNotification = async () => {
        try {
            await notificationsAPI.sendTest();
            alert('✅ Test notification sent! Check your channel.');
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const sendFakeOrder = async () => {
        try {
            await notificationsAPI.sendFakeOrder();
            alert('✅ Fake order sent!');
            fetchLogs();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    if (loading) {
        return <div className="loading">Loading notification settings...</div>;
    }

    return (
        <div className="notifications-section">
            <div className="section-header">
                <h2><Bell size={24} /> Notification Settings</h2>
            </div>

            {/* Main Settings */}
            <div style={{
                background: '#1a1a1a',
                borderRadius: '15px',
                padding: '25px',
                marginBottom: '20px',
                border: '1px solid #2a2a2a'
            }}>
                <h3 style={{ marginBottom: '20px' }}>📢 Public Channel Settings</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="checkbox"
                                checked={settings.enabled}
                                onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
                            />
                            <span>Enable Notifications</span>
                        </label>

                        <input
                            type="text"
                            placeholder="Channel/Group ID (e.g., -1001234567890)"
                            value={settings.channel_id || ''}
                            onChange={(e) => setSettings({...settings, channel_id: e.target.value})}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#2a2a2a',
                                border: '1px solid #3a3a3a',
                                borderRadius: '8px',
                                color: '#fff',
                                marginBottom: '15px'
                            }}
                        />

                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                checked={settings.show_exact_amount}
                                onChange={(e) => setSettings({...settings, show_exact_amount: e.target.checked})}
                            />
                            <span>Show Exact Amounts (vs Ranges)</span>
                        </label>
                    </div>

                    <div>
                        <h4 style={{ marginBottom: '10px' }}>⏱️ Random Delay (Privacy)</h4>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="number"
                                placeholder="Min (sec)"
                                value={settings.delay_min}
                                onChange={(e) => setSettings({...settings, delay_min: parseInt(e.target.value) || 0})}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: '#2a2a2a',
                                    border: '1px solid #3a3a3a',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                            <span style={{ alignSelf: 'center' }}>to</span>
                            <input
                                type="number"
                                placeholder="Max (sec)"
                                value={settings.delay_max}
                                onChange={(e) => setSettings({...settings, delay_max: parseInt(e.target.value) || 0})}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: '#2a2a2a',
                                    border: '1px solid #3a3a3a',
                                    borderRadius: '8px',
                                    color: '#fff'
                                }}
                            />
                        </div>

                        <button
                            onClick={saveSettings}
                            disabled={saving}
                            style={{
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                width: '100%'
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Fake Orders Settings */}
            <div style={{
                background: '#1a1a1a',
                borderRadius: '15px',
                padding: '25px',
                marginBottom: '20px',
                border: '1px solid #ffa500'
            }}>
                <h3 style={{ marginBottom: '20px' }}>🎭 Fake Orders (Marketing)</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="checkbox"
                                checked={settings.fake_orders_enabled}
                                onChange={(e) => setSettings({...settings, fake_orders_enabled: e.target.checked})}
                            />
                            <span>Enable Automatic Fake Orders</span>
                        </label>

                        <label style={{ display: 'block', marginBottom: '5px', color: '#888' }}>
                            Orders Per Hour:
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            value={settings.fake_orders_per_hour}
                            onChange={(e) => setSettings({...settings, fake_orders_per_hour: parseInt(e.target.value) || 0})}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#2a2a2a',
                                border: '1px solid #3a3a3a',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                        />
                        <small style={{ color: '#666' }}>
                            Will send {settings.fake_orders_per_hour} fake orders per hour randomly
                        </small>
                    </div>

                    <div>
                        <h4 style={{ marginBottom: '10px' }}>Manual Actions</h4>
                        <button
                            onClick={sendFakeOrder}
                            style={{
                                padding: '12px 24px',
                                background: '#ffa500',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#000',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                width: '100%',
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            <Zap size={20} /> Send Fake Order Now
                        </button>

                        <button
                            onClick={sendTestNotification}
                            style={{
                                padding: '12px 24px',
                                background: '#00c896',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            <TestTube size={20} /> Send Test Notification
                        </button>
                    </div>
                </div>
            </div>

            {/* Message Templates */}
            <div style={{
                background: '#1a1a1a',
                borderRadius: '15px',
                padding: '25px',
                marginBottom: '20px',
                border: '1px solid #2a2a2a'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>📝 Message Templates</h3>
                    <button
                        onClick={() => setShowTemplateForm(!showTemplateForm)}
                        style={{
                            padding: '10px 20px',
                            background: '#667eea',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <Plus size={20} /> Add Template
                    </button>
                </div>

                {showTemplateForm && (
                    <div style={{ marginBottom: '20px', padding: '15px', background: '#2a2a2a', borderRadius: '10px' }}>
                        <textarea
                            placeholder="Template text... Use {amount}, {country}, {flag} as variables"
                            value={newTemplate}
                            onChange={(e) => setNewTemplate(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#1a1a1a',
                                border: '1px solid #3a3a3a',
                                borderRadius: '8px',
                                color: '#fff',
                                minHeight: '100px',
                                marginBottom: '10px'
                            }}
                        />
                        <button
                            onClick={addTemplate}
                            style={{
                                padding: '10px 20px',
                                background: '#00c896',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                cursor: 'pointer'
                            }}
                        >
                            Save Template
                        </button>
                    </div>
                )}

                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {templates.map((template, index) => (
                        <div
                            key={index}
                            style={{
                                padding: '15px',
                                background: '#2a2a2a',
                                borderRadius: '8px',
                                marginBottom: '10px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <pre style={{ margin: 0, color: '#ccc', fontSize: '12px', flex: 1 }}>
                                {template.text}
                            </pre>
                            <button
                                onClick={() => deleteTemplate(index)}
                                style={{
                                    padding: '5px 10px',
                                    background: '#ff4444',
                                    border: 'none',
                                    borderRadius: '5px',
                                    color: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Logs */}
            <div style={{
                background: '#1a1a1a',
                borderRadius: '15px',
                padding: '25px',
                border: '1px solid #2a2a2a'
            }}>
                <h3 style={{ marginBottom: '20px' }}>📊 Recent Notifications</h3>
                
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {logs.length === 0 ? (
                        <p style={{ color: '#666', textAlign: 'center' }}>No notifications sent yet</p>
                    ) : (
                        logs.map((log, index) => (
                            <div
                                key={index}
                                style={{
                                    padding: '10px',
                                    borderBottom: '1px solid #2a2a2a',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span style={{ color: log.type === 'fake_order' ? '#ffa500' : '#00c896' }}>
                                    {log.type === 'fake_order' ? '🎭' : '✅'} {log.type}
                                </span>
                                <span style={{ color: '#666', fontSize: '12px' }}>
                                    {new Date(log.sent_at).toLocaleString()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;
