import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import './HomePromoBanner.css';

type HomePromoBannerProps = {
  activeTab: 'stays' | 'flights' | 'attractions';
};

const HomePromoBanner: React.FC<HomePromoBannerProps> = ({ activeTab }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  let promos: Array<{ text: string; color: string }> = [];

  if (activeTab === 'stays') {
    promos = [
      {
        text: t('promoHotelsDesc') || '2 nights FREE + 45% OFF on stays',
        color: '#0071c2',
      },
    ];
  } else if (activeTab === 'flights') {
    promos = [
      {
        text: t('promoFlightsDesc') || 'Up to 55% OFF on long‑haul flights',
        color: '#00a884',
      },
      {
        text: t('promoBaggageDesc') || 'Cabin bag & personal item included',
        color: '#f39c12',
      },
    ];
  } else if (activeTab === 'attractions') {
    promos = [
      {
        text: t('promoAttractionsDesc') || '45% OFF on attractions and experiences',
        color: '#9b59b6',
      },
    ];
  }

  if (!promos.length) return null;

  return (
    <div className="home-promo-banner">
      <div className="home-promo-banner-content">
        <div className="home-promo-banner-title">
          <span>{t('promoBannerTitle') || 'Special offers for your trip'}</span>
        </div>
        <div className="home-promo-banner-items">
          {promos.map((promo, index) => (
            <div
              key={index}
              className="home-promo-banner-item"
              style={{ '--promo-color': promo.color } as React.CSSProperties}
            >
              <span className="home-promo-banner-item-text">{promo.text}</span>
            </div>
          ))}
        </div>
        <button
          className="home-promo-banner-close"
          onClick={() => setIsVisible(false)}
          aria-label="Close"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default HomePromoBanner;

