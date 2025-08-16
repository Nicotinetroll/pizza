import React, { useState, useEffect } from 'react';
import {
  TrendingUp, ShoppingCart, Package, Users,
  Grid, Gift, Menu, X, LogOut
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import UsersPage from './pages/Users';
import Categories from './pages/Categories';
import Referrals from './pages/Referrals';
import './App.css';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();

  // Close mobile menu when tab changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeTab]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  if (!isAuthenticated) {
    return <Login />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'categories', label: 'Categories', icon: Grid },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'referrals', label: 'Referrals', icon: Gift },
    { id: 'users', label: 'Users', icon: Users },
  ];

  return (
      <div className="admin-panel">
        <header>
          <div className="header-content">
            <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu size={24} />
            </button>

            <div className="header-actions">
              <span className="user-info">{user?.email}</span>
              <button className="logout-icon" onClick={logout} title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            {navItems.map(({ id, label, icon: Icon }) => (
                <button
                    key={id}
                    className={activeTab === id ? 'active' : ''}
                    onClick={() => setActiveTab(id)}
                >
                  <Icon size={20} /> {label}
                </button>
            ))}
          </nav>

          {/* Mobile Navigation Slider */}
          <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="mobile-nav-header">
              <h2>Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="mobile-nav-items">
              {navItems.map(({ id, label, icon: Icon }) => (
                  <button
                      key={id}
                      className={`mobile-nav-item ${activeTab === id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTab(id);
                        setMobileMenuOpen(false);
                      }}
                  >
                    <Icon size={24} />
                    <span>{label}</span>
                  </button>
              ))}
            </div>

            <button className="mobile-logout" onClick={logout}>
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Navigation Overlay */}
          {mobileMenuOpen && (
              <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)} />
          )}
        </header>

        <main>
          <div className="page-transition">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'orders' && <Orders />}
            {activeTab === 'categories' && <Categories />}
            {activeTab === 'products' && <Products />}
            {activeTab === 'referrals' && <Referrals />}
            {activeTab === 'users' && <UsersPage />}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          {navItems.slice(0, 4).map(({ id, label, icon: Icon }) => (
              <button
                  key={id}
                  className={`bottom-nav-item ${activeTab === id ? 'active' : ''}`}
                  onClick={() => setActiveTab(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
          ))}
          <button
              className="bottom-nav-item"
              onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
            <span>More</span>
          </button>
        </nav>
      </div>
  );
};

function App() {
  // Add viewport meta tag for proper mobile scaling
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
  }, []);

  return (
      <AuthProvider>
        <MainApp />
      </AuthProvider>
  );
}

export default App;