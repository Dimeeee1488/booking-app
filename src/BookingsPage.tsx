import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BookingsPage.css';
import { useTranslation } from './hooks/useTranslation';

// Icons
const SearchNavIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
  </svg>
);

const BookingsNavIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
    <path d="M160-120q-33 0-56.5-23.5T80-200v-440q0-33 23.5-56.5T160-720h160v-80q0-33 23.5-56.5T400-880h160q33 0 56.5 23.5T640-800v80h160q33 0 56.5 23.5T880-640v440q0 33-23.5 56.5T800-120H160Zm240-600h160v-80H400v80Zm-160 80h-80v440h80v-440Zm400 440v-440H320v440h320Zm80-440v440h80v-440h-80ZM480-420Z"/>
  </svg>
);

const FavoritesNavIcon = () => (
  <svg className="bottom-nav-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

const SignInNavIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
    <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/>
  </svg>
);

const BookingsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<'active' | 'past' | 'canceled'>('active');

  return (
    <div className="bookings-page">
      {/* Header */}
      <header className="bookings-header">
        <h1 className="bookings-title">{t('trips')}</h1>
        <div className="header-icons">
          <button className="icon-button">
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </button>
          <button className="icon-button">
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bookings-tabs">
        <button
          className={`bookings-tab ${activeTab === 'active' ? 'bookings-tab-active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button
          className={`bookings-tab ${activeTab === 'past' ? 'bookings-tab-active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
        <button
          className={`bookings-tab ${activeTab === 'canceled' ? 'bookings-tab-active' : ''}`}
          onClick={() => setActiveTab('canceled')}
        >
          Canceled
        </button>
      </div>

      {/* Empty State */}
      <div className="bookings-empty">
        {/* Illustration Container */}
        <div className="illustration-container">
          {activeTab === 'active' && (
            <div className="empty-illustration active-empty">
              <div className="plane-icon-large">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="#4A90E2"/>
                </svg>
              </div>
              <div className="animated-circles">
                <div className="circle circle-1"></div>
                <div className="circle circle-2"></div>
                <div className="circle circle-3"></div>
              </div>
            </div>
          )}
          
          {activeTab === 'past' && (
            <div className="empty-illustration past-empty">
              <div className="stamp-icon-large">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM17 12H7V10H17V12ZM15 16H7V14H15V16ZM17 8H7V6H17V8Z" fill="#6C757D"/>
                </svg>
              </div>
              <div className="animated-check">
                <div className="check-circle"></div>
                <div className="check-mark">✓</div>
              </div>
            </div>
          )}
          
          {activeTab === 'canceled' && (
            <div className="empty-illustration canceled-empty">
              <div className="cancel-icon-large">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM17 15.59L15.59 17L12 13.41L8.41 17L7 15.59L10.59 12L7 8.41L8.41 7L12 10.59L15.59 7L17 8.41L13.41 12L17 15.59Z" fill="#DC3545"/>
                </svg>
              </div>
              <div className="animated-x">
                <div className="x-line x-line-1"></div>
                <div className="x-line x-line-2"></div>
              </div>
            </div>
          )}
        </div>

        {/* Text Content */}
        <h2 className="bookings-empty-title">
          {activeTab === 'active' && t('noBookingsYet')}
          {activeTab === 'past' && t('noPastBookings')}
          {activeTab === 'canceled' && t('noCanceledBookings')}
        </h2>
        <p className="bookings-empty-subtitle">{t('signInOrCreateAccount')}</p>
        
        {/* Sign In Button */}
        <button className="bookings-signin-button">{t('signIn')}</button>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="bottom-nav-item" onClick={() => navigate('/')}>
          <SearchNavIcon />
          <span className="bottom-nav-label">{t('searchLabel')}</span>
        </div>
        <div className="bottom-nav-item active">
          <BookingsNavIcon />
          <span className="bottom-nav-label">{t('bookings')}</span>
        </div>
        <div className="bottom-nav-item" onClick={() => navigate('/favorites')}>
          <FavoritesNavIcon />
          <span className="bottom-nav-label">{t('favorites')}</span>
        </div>
        {(() => {
          try {
            return localStorage.getItem('auth_user') ? (
              <div className="bottom-nav-item" onClick={() => navigate('/profile')}>
                <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/>
                </svg>
                <span className="bottom-nav-label">{t('profileLabel')}</span>
              </div>
            ) : (
              <div className="bottom-nav-item" onClick={() => navigate('/auth?mode=signin')}>
                <SignInNavIcon />
                <span className="bottom-nav-label">{t('signIn')}</span>
              </div>
            );
          } catch {
            return (
              <div className="bottom-nav-item" onClick={() => navigate('/auth?mode=signin')}>
                <SignInNavIcon />
                <span className="bottom-nav-label">{t('signIn')}</span>
              </div>
            );
          }
        })()}
      </nav>
    </div>
  );
};

export default BookingsPage;
