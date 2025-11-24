import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './TicketType.css';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const TicketType: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const baseAmount: number = location?.state?.baseAmount || 0;
  const currency: string = (location?.state?.currency || 'USD').toUpperCase();
  const travellers: number = Number(location?.state?.travellers || 1);

  // Оценочный процент надбавки для Flexible ~14.3%
  const flexiblePercent = 0.143; 

  const [type, setType] = React.useState<'standard' | 'flexible'>('standard');

  const formatPrice = (amount: number) => `${currency} ${Math.round(amount).toLocaleString()}`;

  const flexibleDeltaPerTraveller = baseAmount * flexiblePercent;
  const flexiblePerTraveller = baseAmount + flexibleDeltaPerTraveller;

  const totalPerTraveller = type === 'standard' ? baseAmount : flexiblePerTraveller;
  const total = totalPerTraveller * travellers;

  return (
    <div className="ticket-page">
      <div className="ticket-header">
        <button className="back-button" onClick={() => navigate(-1)}><BackIcon/></button>
        <h1>Select your ticket type</h1>
        <div style={{ width: 24 }}></div>
      </div>

      <div className="ticket-list">
        <div className={`ticket-card ${type==='standard' ? 'active' : ''}`} onClick={() => setType('standard')}>
          <div className="ticket-card-header">
            <div className="ticket-title">Standard ticket</div>
            <div className={`radio ${type==='standard' ? 'on' : ''}`}></div>
          </div>
          <div className="ticket-sub">+ {currency} 0 ({formatPrice(baseAmount)} per traveler)</div>
          <ul className="ticket-bullets">
            <li>Cheapest price</li>
            <li>No need for flexibility — you're sure about your plans</li>
          </ul>
        </div>

        <div className={`ticket-card ${type==='flexible' ? 'active' : ''}`} onClick={() => setType('flexible')}>
          <div className="ticket-card-header">
            <div className="ticket-title">Flexible ticket</div>
            <div className={`radio ${type==='flexible' ? 'on' : ''}`}></div>
          </div>
          <div className="ticket-sub">+ {formatPrice(flexibleDeltaPerTraveller)} ({formatPrice(flexiblePerTraveller)} per traveler)</div>
          <div className="badge">Popular for trips like yours</div>
          <ul className="ticket-bullets">
            <li>Stay flexible with a time or date change</li>
            <li>Request a change up to 24 hours before departure time</li>
            <li>No extra fees — only pay the fare difference, if any</li>
          </ul>
        </div>
      </div>

      <div className="ticket-footer">
        <div className="price-box">
          <div className="price-label">{formatPrice(totalPerTraveller)}</div>
          <div className="price-sub">{formatPrice(total)} for {travellers} traveler{travellers>1?'s':''}</div>
        </div>
        <button className="select-button" onClick={() => {
          // Сначала страница багажа, как было ранее
          navigate('/luggage', { state: { currency, totalPerTraveller, travellers, flightSummary: location?.state?.flightSummary || null, offerId: location?.state?.offerId || null } });
        }}>Next</button>
      </div>
    </div>
  );
};

export default TicketType;


