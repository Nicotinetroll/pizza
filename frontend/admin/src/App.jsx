import React, { useState, useEffect } from 'react';
import {
  TrendingUp, ShoppingCart, Package, Users as UsersIcon,
  Grid, Gift, Menu, X, Home, LogOut
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Users from './pages/Users';
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

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'categories', label: 'Categories', icon: Grid },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'referrals', label: 'Referrals', icon: Gift },
    { id: 'users', label: 'Users', icon: UsersIcon },
  ];

  return (
      <div className="admin-panel">
        <header>
          <div className="header-content">
            <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <h1>🍕 Quatroformaggi</h1>

            <div className="header-actions">
              <span className="user-info">{user?.email}</span>
              <button className="logout-icon" onClick={logout}>
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
            <button className="logout" onClick={logout}>
              Logout ({user?.email})
            </button>
          </nav>

          {/* Mobile Navigation Slider */}
          <div className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="mobile-nav-header">
              <h2>Menu</h2>
              <button onClick={toggleMobileMenu}>
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

        <main className={`main-content ${mobileMenuOpen ? 'menu-open' : ''}`}>
          <div className="page-transition">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'orders' && <Orders />}
            {activeTab === 'categories' && <Categories />}
            {activeTab === 'products' && <Products />}
            {activeTab === 'referrals' && <Referrals />}
            {activeTab === 'users' && <Users />}
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
              onClick={toggleMobileMenu}
          >
            <Menu size={20} />
            <span>More</span>
          </button>
        </nav>

        <style jsx>{`
        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .mobile-menu-toggle {
          display: none;
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 8px;
          margin: -8px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-info {
          font-size: 14px;
          color: var(--text-secondary);
          display: none;
        }

        .logout-icon {
          background: none;
          border: none;
          color: var(--accent-danger);
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-small);
          transition: var(--transition);
        }

        .logout-icon:hover {
          background: rgba(255, 69, 58, 0.1);
        }

        .desktop-nav {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .mobile-nav {
          position: fixed;
          top: 0;
          left: -300px;
          width: 300px;
          height: 100%;
          background: var(--bg-secondary);
          z-index: 1000;
          transition: transform 0.3s ease;
          display: none;
          flex-direction: column;
        }

        .mobile-nav.open {
          transform: translateX(300px);
        }

        .mobile-nav-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          display: none;
        }

        .mobile-nav-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--separator);
        }

        .mobile-nav-header h2 {
          font-size: 24px;
          font-weight: 700;
        }

        .mobile-nav-header button {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 8px;
          margin: -8px;
        }

        .mobile-nav-items {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .mobile-nav-item {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          padding: 16px;
          margin-bottom: 8px;
          background: transparent;
          border: none;
          border-radius: var(--radius-small);
          color: var(--text-primary);
          font-size: 17px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
          text-align: left;
        }

        .mobile-nav-item:hover {
          background: var(--bg-tertiary);
        }

        .mobile-nav-item.active {
          background: var(--accent-primary);
          color: white;
        }

        .mobile-logout {
          display: flex;
          align-items: center;
          gap: 12px;
          width: calc(100% - 40px);
          margin: 20px;
          padding: 16px;
          background: var(--accent-danger);
          border: none;
          border-radius: var(--radius-small);
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
        }

        .mobile-logout:hover {
          background: #D70015;
        }

        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(28, 28, 30, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid var(--separator);
          padding: 8px 0 env(safe-area-inset-bottom);
          z-index: 100;
        }

        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition);
        }

        .bottom-nav-item:active {
          transform: scale(0.95);
        }

        .bottom-nav-item.active {
          color: var(--accent-primary);
        }

        .main-content {
          transition: var(--transition);
        }

        .page-transition {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { 
            opacity: 0;
            transform: translateY(10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile Styles */
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: block;
          }

          .user-info {
            display: none;
          }

          .desktop-nav {
            display: none;
          }

          .mobile-nav {
            display: flex;
          }

          .mobile-nav-overlay {
            display: block;
          }

          .mobile-bottom-nav {
            display: flex;
          }

          main {
            padding-bottom: calc(60px + env(safe-area-inset-bottom));
          }

          header h1 {
            font-size: 20px;
          }
        }

        @media (min-width: 769px) {
          .user-info {
            display: inline;
          }
        }

        /* Dark mode adjustments */
        @media (prefers-color-scheme: dark) {
          .mobile-nav {
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.5);
          }
        }

        /* Safe area handling */
        .mobile-nav {
          padding-top: env(safe-area-inset-top);
          padding-left: env(safe-area-inset-left);
        }

        .mobile-bottom-nav {
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
      `}</style>
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