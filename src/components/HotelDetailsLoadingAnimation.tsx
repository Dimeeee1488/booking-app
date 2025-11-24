import React from 'react';
import './HotelDetailsLoadingAnimation.css';

const HotelDetailsLoadingAnimation: React.FC = () => {
  return (
    <div className="hotel-details-loading">
      <div className="loading-content">
        {/* Hotel Icon Animation */}
        <div className="hotel-icon-wrapper">
          <svg viewBox="0 0 120 120" className="hotel-svg">
            {/* Building */}
            <rect x="30" y="30" width="60" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="building"/>
            
            {/* Windows with gradient animation */}
            <g className="windows-group">
              <rect x="40" y="40" width="12" height="12" fill="currentColor" className="window" style={{ animationDelay: '0s' }}/>
              <rect x="54" y="40" width="12" height="12" fill="currentColor" className="window" style={{ animationDelay: '0.1s' }}/>
              <rect x="68" y="40" width="12" height="12" fill="currentColor" className="window" style={{ animationDelay: '0.2s' }}/>
              
              <rect x="40" y="56" width="12" height="12" fill="currentColor" className="window" style={{ animationDelay: '0.3s' }}/>
              <rect x="54" y="56" width="12" height="12" fill="currentColor" className="window" style={{ animationDelay: '0.4s' }}/>
              <rect x="68" y="56" width="12" height="12" fill="currentColor" className="window" style={{ animationDelay: '0.5s' }}/>
              
              <rect x="40" y="72" width="12" height="12" fill="currentColor" className="window" style={{ animationDelay: '0.6s' }}/>
              <rect x="54" y="72" width="12" height="12" fill="currentColor" className="window" style={{ animationDelay: '0.7s' }}/>
              <rect x="68" y="72" width="12" height="12" fill="currentColor" className="window" style={{ animationDelay: '0.8s' }}/>
            </g>
            
            {/* Door */}
            <rect x="52" y="88" width="16" height="12" fill="currentColor" className="door"/>
            
            {/* Star for hotel rating */}
            <path d="M60 15 l4 8 l8 1 l-6 6 l1 8 l-7-4 l-7 4 l1-8 l-6-6 l8-1 z" fill="currentColor" className="star"/>
          </svg>
          
          {/* Pulsing ring */}
          <div className="pulse-ring"></div>
          <div className="pulse-ring" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Loading Text */}
        <h3 className="loading-title">Loading hotel details...</h3>
        <p className="loading-description">Getting the best information for you</p>

        {/* Progress Dots */}
        <div className="progress-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>

        {/* Loading Info Cards */}
        <div className="info-cards">
          <div className="info-card">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
            <span>Loading photos</span>
          </div>
          <div className="info-card">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <span>Loading amenities</span>
          </div>
          <div className="info-card">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
            </div>
            <span>Checking availability</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailsLoadingAnimation;





