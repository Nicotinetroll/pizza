// Update your App.jsx to include Sellers tab

import React, { useState } from 'react';
import { TrendingUp, ShoppingCart, Package, Users as UsersIcon, Grid, Gift, Bell, UserCheck } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Users from './pages/Users';
import Categories from './pages/Categories';
import Referrals from './pages/Referrals';
import Sellers from './pages/Sellers';  // NEW IMPORT
import Notifications from './pages/Notifications';
import './App.css';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated, logout, user } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="admin-panel">
      <header>
        <h1>🍕 Quatroformaggi</h1>
        <nav>
          <button
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            <TrendingUp size={20} /> Dashboard
          </button>
          <button
            className={activeTab === 'orders' ? 'active' : ''}
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingCart size={20} /> Orders
          </button>
          <button
            className={activeTab === 'categories' ? 'active' : ''}
            onClick={() => setActiveTab('categories')}
          >
            <Grid size={20} /> Categories
          </button>
          <button
            className={activeTab === 'products' ? 'active' : ''}
            onClick={() => setActiveTab('products')}
          >
            <Package size={20} /> Products
          </button>
          <button
            className={activeTab === 'referrals' ? 'active' : ''}
            onClick={() => setActiveTab('referrals')}
          >
            <Gift size={20} /> Referrals
          </button>
          <button
            className={activeTab === 'sellers' ? 'active' : ''}
            onClick={() => setActiveTab('sellers')}
            style={{
              background: activeTab === 'sellers' ? 'linear-gradient(135deg, #00c896 0%, #00a77a 100%)' : ''
            }}
          >
            <UserCheck size={20} /> Sellers
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            <UsersIcon size={20} /> Users
          </button>
          <button
            className={activeTab === 'notifications' ? 'active' : ''}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={20} /> Notifications
          </button>
          <button
            className="logout"
            onClick={logout}
          >
            Logout ({user?.email})
          </button>
        </nav>
      </header>

      <main>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'orders' && <Orders />}
        {activeTab === 'categories' && <Categories />}
        {activeTab === 'products' && <Products />}
        {activeTab === 'referrals' && <Referrals />}
        {activeTab === 'sellers' && <Sellers />}  {/* NEW TAB */}
        {activeTab === 'users' && <Users />}
        {activeTab === 'notifications' && <Notifications />}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
