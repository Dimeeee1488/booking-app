import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './AuthPage.css';

type AuthMode = 'signin' | 'signup';

interface AuthUser {
  name: string;
  email: string;
  avatarUrl?: string;
}

// Remove default avatar URL to allow initials display

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as AuthMode) || 'signin';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (mode === 'signup') return Boolean(name.trim() && email.trim() && password.trim());
    return Boolean(email.trim() && password.trim());
  }, [mode, name, email, password]);

  useEffect(() => {
    setError('');
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setLoading(true);
      setError('');

      // Fake async for UX
      await new Promise(res => setTimeout(res, 600));

      const storedUser: AuthUser = mode === 'signup'
        ? { name: name.trim() || 'Guest', email: email.trim() }
        : { name: 'Guest', email: email.trim() };

      localStorage.setItem('auth_user', JSON.stringify(storedUser));
      window.dispatchEvent(new Event('auth-changed'));
      navigate('/profile', { replace: true });
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button className="back-button-auth" onClick={() => navigate(-1)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="auth-container">
        <div className="auth-hero">
          <div className="booking-logo">
            <span className="booking-text">Booking</span>
            <span className="booking-dot">.com</span>
          </div>
          <h1 className="hero-title">
            {mode === 'signin' ? 'WELCOME' : 'GET STARTED'}
          </h1>
          <div className="hero-accent"></div>
        </div>

        <div className="modern-card">
          <div className="auth-tabs">
            <button 
              className={mode === 'signin' ? 'tab active' : 'tab'} 
              onClick={() => setMode('signin')}
              type="button"
            >
              <svg className="tab-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 17a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm8-1v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              SIGN IN
            </button>
            <button 
              className={mode === 'signup' ? 'tab active' : 'tab'} 
              onClick={() => setMode('signup')}
              type="button"
            >
              <svg className="tab-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 12v8M8 16h8M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              REGISTER
            </button>
          </div>

          <form className="modern-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className={`form-group ${focusedField === 'name' ? 'focused' : ''} ${name ? 'filled' : ''}`}>
                <label htmlFor="name">FULL NAME</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="currentColor"/>
                      <path d="M10 12C4.477 12 0 14.686 0 18V20H20V18C20 14.686 15.523 12 10 12Z" fill="currentColor"/>
                    </svg>
                  </span>
                  <input 
                    id="name"
                    type="text"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div className={`form-group ${focusedField === 'email' ? 'focused' : ''} ${email ? 'filled' : ''}`}>
              <label htmlFor="email">EMAIL</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M2 4L10 11L18 4M2 4H18M2 4V16H18V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <input 
                  id="email"
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className={`form-group ${focusedField === 'password' ? 'focused' : ''} ${password ? 'filled' : ''}`}>
              <label htmlFor="password">PASSWORD</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M6 9V6C6 3.79086 7.79086 2 10 2C12.2091 2 14 3.79086 14 6V9" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 5V9M9 13H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <button className="hero-submit" disabled={!canSubmit || loading} type="submit">
              {loading ? (
                <>
                  <span className="spinner"></span>
                  PROCESSING
                </>
              ) : (
                <>
                  {mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 10H15M15 10L11 6M15 10L11 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>

            {mode === 'signin' && (
              <div className="auth-footer">
                <a href="#" className="forgot-password">Forgot password?</a>
              </div>
            )}

            {mode === 'signup' && (
              <p className="terms-text">
                By creating an account, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
              </p>
            )}
          </form>
        </div>

        {/* Benefits strip removed as requested */}
      </div>
    </div>
  );
};

export default AuthPage;




