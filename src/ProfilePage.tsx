import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilePage.css';

interface AuthUser {
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  country?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  address?: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<AuthUser>({
    name: '',
    email: '',
    phone: '',
    country: '',
    dateOfBirth: '',
    passportNumber: '',
    address: ''
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      const userData = stored ? JSON.parse(stored) : null;
      setUser(userData);
      if (userData) {
        setFormData(userData);
      }
    } catch {
      setUser(null);
    }
  }, []);

  const handleSave = () => {
    const updatedUser = { ...formData };
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setEditing(false);
    window.dispatchEvent(new Event('auth-changed'));
  };

  const handleCancel = () => {
    if (user) {
      setFormData(user);
    }
    setEditing(false);
  };

  const signOut = () => {
    localStorage.removeItem('auth_user');
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/', { replace: true });
  };

  const handleInputChange = (field: keyof AuthUser, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="profile-page">
      <button className="back-button-profile" onClick={() => navigate(-1)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      <div className="profile-container">
        {/* Header with Avatar */}
        <div className="profile-hero">
          <div className="profile-hero-bg"></div>
          <div className="profile-header-content">
            <div className="avatar-wrapper">
              <div className="avatar-large">
                <div className="avatar-circle">
                  {(() => {
                    const name = (formData.name || '').trim();
                    const words = name.split(/\s+/).filter(Boolean);
                    // Always show initials if a name exists (even if avatarUrl stored earlier)
                    if (words.length > 0) {
                      const initials = words.length >= 2
                        ? (words[0][0] + words[1][0])
                        : words[0].substring(0, 2);
                      return (
                        <div className="avatar-initials" aria-label="User initials">
                          {initials.toUpperCase()}
                        </div>
                      );
                    }
                    // No name: fallback to image if provided, else generic initials
                    if (formData.avatarUrl) {
                      return <img src={formData.avatarUrl} alt="avatar" />;
                    }
                    return (
                      <div className="avatar-initials" aria-label="User initials">GU</div>
                    );
                  })()}
                </div>
                <div className="genius-badge">
                  <svg className="genius-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 0L10.163 5.673L16 6.58L12 10.49L12.944 16L8 13.673L3.056 16L4 10.49L0 6.58L5.837 5.673L8 0Z" fill="currentColor"/>
                  </svg>
                  Genius Level 1
                </div>
              </div>
            </div>
            <div className="profile-header-info">
              <h1 className="profile-name">Hi, {formData.name || 'Guest'}</h1>
              <p className="profile-email">{formData.email || 'Not signed in'}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button className="quick-action-card" onClick={() => navigate('/bookings')}>
            <div className="action-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M21 3H7C5.89543 3 5 3.89543 5 5V25C5 26.1046 5.89543 27 7 27H21C22.1046 27 23 26.1046 23 25V5C23 3.89543 22.1046 3 21 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 8H18M10 13H18M10 18H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>My Bookings</h3>
              <p>View and manage trips</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/favorites')}>
            <div className="action-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 24.5L12.55 23.2C6.4 17.64 2.5 14.16 2.5 9.9C2.5 6.42 5.22 3.7 8.7 3.7C10.74 3.7 12.69 4.66 14 6.14C15.31 4.66 17.26 3.7 19.3 3.7C22.78 3.7 25.5 6.42 25.5 9.9C25.5 14.16 21.6 17.64 15.45 23.2L14 24.5Z" fill="currentColor"/>
              </svg>
            </div>
            <div className="action-content">
              <h3>Saved Lists</h3>
              <p>Your favorite places</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Personal Information Card */}
        <div className="profile-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Personal Information</h2>
              <p className="card-subtitle">Update your details and preferences</p>
            </div>
            {!editing ? (
              <button className="edit-button" onClick={() => setEditing(true)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M8 3H3C2.44772 3 2 3.44772 2 4V15C2 15.5523 2.44772 16 3 16H14C14.5523 16 15 15.5523 15 15V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M11 2L16 7L7 16H2V11L11 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
                Edit
              </button>
            ) : null}
          </div>

          <div className="profile-form">
            <div className="form-grid">
              {/* Full Name */}
              <div className={`profile-field ${focusedField === 'name' ? 'focused' : ''} ${formData.name ? 'filled' : ''}`}>
                <label htmlFor="name">Full Name</label>
                <div className="input-group">
                  <span className="field-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="currentColor"/>
                      <path d="M10 12C4.477 12 0 14.686 0 18V20H20V18C20 14.686 15.523 12 10 12Z" fill="currentColor"/>
                    </svg>
                  </span>
                  <input
                    id="name"
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    disabled={!editing}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className={`profile-field ${focusedField === 'email' ? 'focused' : ''} ${formData.email ? 'filled' : ''}`}>
                <label htmlFor="email">Email Address</label>
                <div className="input-group">
                  <span className="field-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 4L10 11L18 4M2 4H18M2 4V16H18V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    disabled={!editing}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className={`profile-field ${focusedField === 'phone' ? 'focused' : ''} ${formData.phone ? 'filled' : ''}`}>
                <label htmlFor="phone">Phone Number</label>
                <div className="input-group">
                  <span className="field-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2 3C2 2.44772 2.44772 2 3 2H6.15287C6.64171 2 7.0589 2.35341 7.13927 2.8356L8.35284 10.1644C8.43862 10.6805 8.11121 11.1667 7.59379 11.2525L5.5 11.5833C6.16667 14.5 8.5 16.8333 11.4167 17.5L11.7475 15.4062C11.8333 14.8888 12.3195 14.5614 12.8356 14.6472L20.1644 15.8607C20.6466 15.9411 21 16.3583 21 16.8471V20C21 20.5523 20.5523 21 20 21H17C8.16344 21 1 13.8366 1 5V2Z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    disabled={!editing}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Country */}
              <div className={`profile-field ${focusedField === 'country' ? 'focused' : ''} ${formData.country ? 'filled' : ''}`}>
                <label htmlFor="country">Country</label>
                <div className="input-group">
                  <span className="field-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/>
                      <path d="M2 10H18M10 2C11.5 4 12 7 12 10C12 13 11.5 16 10 18M10 2C8.5 4 8 7 8 10C8 13 8.5 16 10 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input
                    id="country"
                    type="text"
                    value={formData.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    onFocus={() => setFocusedField('country')}
                    onBlur={() => setFocusedField(null)}
                    disabled={!editing}
                    placeholder="United States"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className={`profile-field ${focusedField === 'dateOfBirth' ? 'focused' : ''} ${formData.dateOfBirth ? 'filled' : ''}`}>
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <div className="input-group">
                  <span className="field-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M7 2V6M13 2V6M3 8H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="10" cy="13" r="2" fill="currentColor"/>
                    </svg>
                  </span>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth || ''}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    onFocus={() => setFocusedField('dateOfBirth')}
                    onBlur={() => setFocusedField(null)}
                    disabled={!editing}
                  />
                </div>
              </div>

              {/* Passport Number */}
              <div className={`profile-field ${focusedField === 'passportNumber' ? 'focused' : ''} ${formData.passportNumber ? 'filled' : ''}`}>
                <label htmlFor="passportNumber">Passport Number</label>
                <div className="input-group">
                  <span className="field-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="2" y="3" width="16" height="14" rx="1" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="7" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M3 15C3 13.3431 5 12 7 12C9 12 11 13.3431 11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M13 7H16M13 10H16M13 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                  <input
                    id="passportNumber"
                    type="text"
                    value={formData.passportNumber || ''}
                    onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                    onFocus={() => setFocusedField('passportNumber')}
                    onBlur={() => setFocusedField(null)}
                    disabled={!editing}
                    placeholder="A12345678"
                  />
                </div>
              </div>
            </div>

            {/* Address - Full Width */}
            <div className={`profile-field profile-field-full ${focusedField === 'address' ? 'focused' : ''} ${formData.address ? 'filled' : ''}`}>
              <label htmlFor="address">Address</label>
              <div className="input-group">
                <span className="field-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C6.68629 2 4 4.68629 4 8C4 12 10 18 10 18C10 18 16 12 16 8C16 4.68629 13.3137 2 10 2Z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                <input
                  id="address"
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField(null)}
                  disabled={!editing}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
            </div>

            {/* Action Buttons */}
            {editing && (
              <div className="form-actions">
                <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
                <button className="save-btn" onClick={handleSave}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15 5L7 13L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="profile-card danger-zone">
          <h3 className="danger-title">Account Actions</h3>
          <button className="signout-btn" onClick={signOut}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 14L17 10M17 10L13 6M17 10H7M7 3H5C3.89543 3 3 3.89543 3 5V15C3 16.1046 3.89543 17 5 17H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;




