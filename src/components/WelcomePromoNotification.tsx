import React, { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import './WelcomePromoNotification.css';

interface WelcomePromoNotificationProps {
  onClose: () => void;
}

const WelcomePromoNotification: React.FC<WelcomePromoNotificationProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Показываем уведомление с задержкой для плавной анимации
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => {
      clearTimeout(showTimer);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const promos = [
    {
      title: t('promoHotelsTitle') || 'Special Hotel Deals',
      description: t('promoHotelsDesc') || 'Book 7+ nights and get 2 nights FREE + 45% OFF',
      badge: '45% OFF',
      color: '#0071c2',
      gradient: 'linear-gradient(135deg, #0071c2 0%, #005a9e 100%)'
    },
    {
      title: t('promoFlightsTitle') || 'Amazing Flight Deals',
      description: t('promoFlightsDesc') || 'Save up to 55% on flights over 4 hours',
      badge: '55% OFF',
      color: '#00a884',
      gradient: 'linear-gradient(135deg, #00a884 0%, #008a6f 100%)'
    },
    {
      title: t('promoBaggageTitle') || 'Free Baggage Included',
      description: t('promoBaggageDesc') || 'Cabin bag & personal item included with every booking',
      badge: 'FREE',
      color: '#f39c12',
      gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)'
    },
    {
      title: t('promoAttractionsTitle') || 'Amazing Attraction Deals',
      description: t('promoAttractionsDesc') || 'Save 45% on all attractions and experiences',
      badge: '45% OFF',
      color: '#9b59b6',
      gradient: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)'
    }
  ];

  if (!isVisible) return null;

  return (
    <div className={`welcome-promo-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
      <div className="welcome-promo-container" onClick={(e) => e.stopPropagation()}>
        <button className="welcome-promo-close" onClick={handleClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="welcome-promo-header">
          <h2 className="welcome-promo-main-title">{t('promoMainTitle') || 'Special Offers Just For You!'}</h2>
          <p className="welcome-promo-subtitle">{t('promoSubtitle') || 'Discover amazing deals on hotels, flights, and more'}</p>
        </div>

        <div className="welcome-promo-grid">
          {promos.map((promo, index) => (
            <div
              key={index}
              className="welcome-promo-card"
              style={{ 
                '--promo-color': promo.color,
                '--promo-gradient': promo.gradient,
                animationDelay: `${index * 0.1}s`
              } as React.CSSProperties}
            >
              <div className="welcome-promo-card-badge" style={{ background: promo.gradient }}>
                {promo.badge}
              </div>
              <h3 className="welcome-promo-card-title">{promo.title}</h3>
              <p className="welcome-promo-card-description">{promo.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomePromoNotification;

