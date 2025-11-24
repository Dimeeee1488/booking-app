import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FavoritesPage.css';

// Favorites storage utility
const FAVORITES_KEY = 'hotel_favorites';

interface FavoriteHotel {
  hotel_id: string;
  name: string;
  address: string;
  city: string;
  rating?: number;
  stars?: number;
  price?: number;
  currency?: string;
  photoUrl?: string;
  addedAt: number;
}

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteHotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(parsed);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = (hotelId: string) => {
    try {
      const updated = favorites.filter(fav => fav.hotel_id !== hotelId);
      setFavorites(updated);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const clearAllFavorites = () => {
    try {
      setFavorites([]);
      localStorage.removeItem(FAVORITES_KEY);
    } catch (error) {
      console.error('Failed to clear favorites:', error);
    }
  };

  const handleHotelClick = (hotel: FavoriteHotel) => {
    // Navigate to hotel details with basic parameters (API will load details)
    navigate(`/hotel-details?hotel_id=${hotel.hotel_id}&arrival_date=2025-10-25&departure_date=2025-10-26&adults=2&room_qty=1&currency_code=${hotel.currency || 'USD'}`);
  };

  // Navigation Icons
  const SearchNavIcon = () => (
    <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
      <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
    </svg>
  );

  const BookingsNavIcon = () => (
    <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
  );

  const FavoritesNavIcon = () => (
    <svg className="bottom-nav-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  );

  const SignInNavIcon = () => (
    <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="favorites-header">
          <div className="favorites-header-inner">
            <h1>Favorites</h1>
          </div>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading favorites...</p>
        </div>
        
        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          <div className="bottom-nav-item" onClick={() => navigate('/')}>
            <SearchNavIcon />
            <span className="bottom-nav-label">Search</span>
          </div>
          <div className="bottom-nav-item" onClick={() => navigate('/bookings')}>
            <BookingsNavIcon />
            <span className="bottom-nav-label">Bookings</span>
          </div>
          <div className="bottom-nav-item active">
            <FavoritesNavIcon />
            <span className="bottom-nav-label">Favorites</span>
          </div>
          {(() => {
            try {
              return localStorage.getItem('auth_user') ? (
                <div className="bottom-nav-item" onClick={() => navigate('/profile')}>
                  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/>
                  </svg>
                  <span className="bottom-nav-label">Profile</span>
                </div>
              ) : (
                <div className="bottom-nav-item" onClick={() => navigate('/auth?mode=signin')}>
                  <SignInNavIcon />
                  <span className="bottom-nav-label">Sign in</span>
                </div>
              );
            } catch {
              return (
                <div className="bottom-nav-item" onClick={() => navigate('/auth?mode=signin')}>
                  <SignInNavIcon />
                  <span className="bottom-nav-label">Sign in</span>
                </div>
              );
            }
          })()}
        </nav>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <div className="favorites-header">
        <div className="favorites-header-inner">
          <h1>Favorites</h1>
          {favorites.length > 0 && (
            <button className="clear-all-btn" onClick={clearAllFavorites}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="empty-favorites">
          <div className="illustration-container">
            <div className="empty-illustration">
              <div className="heart-icon-large">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" fill="#E74C3C"/>
                </svg>
              </div>
              <div className="animated-hearts">
                <div className="heart heart-1"></div>
                <div className="heart heart-2"></div>
                <div className="heart heart-3"></div>
              </div>
            </div>
          </div>
          <h2 className="empty-title">No favorites yet</h2>
          <p className="empty-subtitle">Start exploring and save hotels you love</p>
          <button className="explore-btn" onClick={() => navigate('/')}>
            Explore hotels
          </button>
        </div>
      ) : (
        <div className="favorites-list">
          {favorites.map((hotel) => (
            <div key={hotel.hotel_id} className="favorite-hotel-card" onClick={() => handleHotelClick(hotel)}>
              <div className="hotel-image">
                {hotel.photoUrl ? (
                  <img src={hotel.photoUrl} alt={hotel.name} />
                ) : (
                  <div className="no-image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21,15 16,10 5,21"/>
                    </svg>
                  </div>
                )}
                <button 
                  className="remove-favorite-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(hotel.hotel_id);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </button>
              </div>
              
              <div className="hotel-info">
                <h3 className="hotel-name">{hotel.name}</h3>
                <p className="hotel-location">{hotel.address}</p>
                
                <div className="hotel-meta">
                  {hotel.stars && (
                    <div className="hotel-stars">
                      {Array.from({ length: hotel.stars }, (_, i) => (
                        <span key={i} className="star">★</span>
                      ))}
                    </div>
                  )}
                  {hotel.rating && (
                    <div className="hotel-rating">
                      <span className="rating-score">{hotel.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {hotel.price && (
                  <div className="hotel-price">
                    <span className="price-currency">{hotel.currency || 'USD'}</span>
                    <span className="price-amount">{hotel.price.toFixed(0)}</span>
                    <span className="price-period">per night</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="bottom-nav-item" onClick={() => navigate('/')}>
          <SearchNavIcon />
          <span className="bottom-nav-label">Search</span>
        </div>
        <div className="bottom-nav-item" onClick={() => navigate('/bookings')}>
          <BookingsNavIcon />
          <span className="bottom-nav-label">Bookings</span>
        </div>
        <div className="bottom-nav-item active">
          <FavoritesNavIcon />
          <span className="bottom-nav-label">Favorites</span>
        </div>
        {(() => {
          try {
            return localStorage.getItem('auth_user') ? (
              <div className="bottom-nav-item" onClick={() => navigate('/profile')}>
                <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/>
                </svg>
                <span className="bottom-nav-label">Profile</span>
              </div>
            ) : (
              <div className="bottom-nav-item" onClick={() => navigate('/auth?mode=signin')}>
                <SignInNavIcon />
                <span className="bottom-nav-label">Sign in</span>
              </div>
            );
          } catch {
            return (
              <div className="bottom-nav-item" onClick={() => navigate('/auth?mode=signin')}>
                <SignInNavIcon />
                <span className="bottom-nav-label">Sign in</span>
              </div>
            );
          }
        })()}
      </nav>
    </div>
  );
};

export default FavoritesPage;


