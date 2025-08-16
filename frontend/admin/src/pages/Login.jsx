import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();

  // Auto-focus email field on mount
  useEffect(() => {
    const emailInput = document.getElementById('email-input');
    if (emailInput) emailInput.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate inputs
    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      // Shake animation on error
      const form = document.querySelector('.login-form');
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 500);
    }
  };

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
      <div className="login-container">
        {/* Animated background */}
        <div className="login-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        <div className="login-content">
          {/* Logo and Title */}
          <div className="login-header">
            <div className="logo-container">
              <span className="logo">🍕</span>
            </div>
            <h1>Quatroformaggi</h1>
            <p className="subtitle">Admin Dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email-input">Email</label>
              <div className="input-wrapper">
                <Mail size={20} className="input-icon" />
                <input
                    id="email-input"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={handleInputChange(setEmail)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    maxLength={100}
                    className="input-field"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password-input">Password</label>
              <div className="input-wrapper">
                <Lock size={20} className="input-icon" />
                <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={handleInputChange(setPassword)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    maxLength={100}
                    className="input-field"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            {error && (
                <div className="error-message">
                  <div className="error-icon">!</div>
                  <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="login-button"
            >
              {isLoading ? (
                  <>
                    <Loader size={20} className="spinner" />
                    <span>Signing in...</span>
                  </>
              ) : (
                  <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer">
            <p>Secure admin access</p>
            <div className="security-badges">
              <span className="badge">🔒 SSL</span>
              <span className="badge">🛡️ 2FA Ready</span>
              <span className="badge">🔐 Encrypted</span>
            </div>
          </div>
        </div>

        <style jsx>{`
        .login-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          padding: 20px;
          background: #000;
          overflow: hidden;
        }

        /* Animated Background */
        .login-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: float 20s infinite ease-in-out;
        }

        .orb-1 {
          width: 600px;
          height: 600px;
          background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
          top: -200px;
          left: -200px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #BF5AF2 0%, #FF453A 100%);
          bottom: -150px;
          right: -150px;
          animation-delay: 7s;
        }

        .orb-3 {
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #64D2FF 0%, #30D158 100%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 14s;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          33% {
            transform: translate(100px, -100px) rotate(120deg) scale(1.1);
          }
          66% {
            transform: translate(-100px, 100px) rotate(240deg) scale(0.9);
          }
        }

        /* Login Content */
        .login-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 400px;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Header */
        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logo {
          font-size: 48px;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .login-header h1 {
          font-size: 32px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .subtitle {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 500;
        }

        /* Form */
        .login-form {
          background: rgba(28, 28, 30, 0.8);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .login-form.shake {
          animation: shake 0.5s ease-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: rgba(255, 255, 255, 0.4);
          pointer-events: none;
          transition: color 0.3s ease;
        }

        .input-field {
          width: 100%;
          padding: 16px 16px 16px 48px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #fff;
          font-size: 16px;
          transition: all 0.3s ease;
          -webkit-appearance: none;
        }

        .input-field:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
        }

        .input-field:focus + .input-icon {
          color: var(--accent-primary);
        }

        .input-field::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .password-toggle {
          position: absolute;
          right: 16px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          padding: 8px;
          margin: -8px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .password-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
        }

        /* Form Options */
        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .remember-me {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }

        .remember-me input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .forgot-password {
          font-size: 14px;
          color: var(--accent-primary);
          text-decoration: none;
          transition: opacity 0.3s ease;
        }

        .forgot-password:hover {
          opacity: 0.8;
        }

        /* Error Message */
        .error-message {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(255, 69, 58, 0.1);
          border: 1px solid rgba(255, 69, 58, 0.3);
          border-radius: 12px;
          margin-bottom: 24px;
          animation: slideDown 0.3s ease-out;
        }

        .error-icon {
          width: 20px;
          height: 20px;
          background: var(--accent-danger);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .error-message span {
          color: #ff6b6b;
          font-size: 14px;
        }

        /* Login Button */
        .login-button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 17px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .login-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .login-button:active::before {
          width: 300px;
          height: 300px;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 122, 255, 0.4);
        }

        .login-button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .login-footer {
          text-align: center;
          margin-top: 32px;
        }

        .login-footer p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.4);
          margin-bottom: 12px;
        }

        .security-badges {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .badge {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          padding: 4px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Mobile Optimizations */
        @media (max-width: 640px) {
          .login-form {
            padding: 32px 24px;
          }

          .gradient-orb {
            filter: blur(60px);
          }

          .orb-1 {
            width: 400px;
            height: 400px;
          }

          .orb-2 {
            width: 350px;
            height: 350px;
          }

          .orb-3 {
            width: 300px;
            height: 300px;
          }
        }

        /* Touch device optimizations */
        @media (hover: none) {
          .login-button:hover {
            transform: none;
            box-shadow: none;
          }

          .password-toggle:hover {
            background: none;
            color: rgba(255, 255, 255, 0.4);
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .gradient-orb,
          .logo,
          .spinner {
            animation: none;
          }

          .login-content,
          .error-message {
            animation-duration: 0.01ms;
          }
        }

        /* High contrast */
        @media (prefers-contrast: high) {
          .input-field {
            border-width: 2px;
          }

          .login-button {
            background: var(--accent-primary);
          }
        }
      `}</style>
      </div>
  );
};

export default Login;