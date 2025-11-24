import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Luggage.css';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const BackpackIcon = () => (
  <svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-480q0-56 34-98t86-56v-86h120v80h160v-80h120v86q52 14 86 56t34 98v480q0 33-23.5 56.5T720-80H240Zm0-80h480v-480q0-33-23.5-56.5T640-720H320q-33 0-56.5 23.5T240-640v480Zm340-160h80v-160H300v80h280v80ZM480-440Z"/></svg>
);
const CarryOnIcon = () => (
  <svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M640-280q50 0 85 35t35 85q0 50-35 85t-85 35q-38 0-68.5-22T527-120H320q-33 0-56.5-23.5T240-200v-400q0-33 23.5-56.5T320-680h240v-120q-33 0-56.5-23.5T480-880h160v600Zm-280 80v-400h-40v400h40Zm80-400v400h87q4-15 13-27.5t20-22.5v-350H440Zm200 500q25 0 42.5-17.5T700-160q0-25-17.5-42.5T640-220q-25 0-42.5 17.5T580-160q0 25 17.5 42.5T640-100Zm0-60ZM440-400Zm-80 200v-400 400Zm80-400v400-400Z"/></svg>
);
const CheckedIcon = () => (
  <svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-80v-40q-33 0-56.5-23.5T200-200v-440q0-33 23.5-56.5T280-720h80v-120q0-17 11.5-28.5T400-880h160q17 0 28.5 11.5T600-840v120h80q33 0 56.5 23.5T760-640v440q0 33-23.5 56.5T680-120v40h-80v-40H360v40h-80Zm160-640h80v-80h-80v80Zm40 240q53 0 103.5-13.5T680-534v-106H280v106q46 27 96.5 40.5T480-480Zm-40 120v-42q-42-5-82-15t-78-27v244h400v-244q-38 17-78 27t-82 15v42h-80Zm40 0Zm0-120Zm0 36Z"/></svg>
);

const Luggage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const currency: string = (location?.state?.currency || 'USD').toUpperCase();
  const totalPerTraveller: number = location?.state?.totalPerTraveller || 0;
  const travellers: number = Number(location?.state?.travellers || 1);
  const total = Math.round(totalPerTraveller * travellers);

  const fmt = (n: number) => `${currency} ${Math.round(n).toLocaleString()}`;

  return (
    <div className="luggage-page">
      <div className="luggage-header">
        <button className="back-button" onClick={() => navigate(-1)}><BackIcon/></button>
        <h1>Luggage</h1>
        <div style={{ width: 24 }}></div>
      </div>

      <div className="luggage-list">
        <div className="luggage-card">
          <div className="luggage-title">1 personal item</div>
          <div className="luggage-sub included">Included</div>
          <div className="luggage-desc">Fits under the seat in front of you</div>
          <div className="tick"><BackpackIcon/></div>
        </div>
        <div className="luggage-card">
          <div className="luggage-title">1 carry-on bag</div>
          <div className="luggage-sub included">Included</div>
          <div className="luggage-desc">23 × 36 × 56 cm · Up to 7 kg each</div>
          <div className="tick"><CarryOnIcon/></div>
        </div>
        <div className="luggage-card">
          <div className="luggage-title">1 checked bag</div>
          <div className="luggage-sub included">Included</div>
          <div className="luggage-desc">Max weight 23 kg</div>
          <div className="tick"><CheckedIcon/></div>
        </div>
      </div>

      <div className="luggage-footer">
        <div className="price-box">
          <div className="price-label">{fmt(totalPerTraveller)}</div>
          <div className="price-sub">{fmt(total)} for {travellers} traveler{travellers>1?'s':''}</div>
        </div>
        <button className="next-button" onClick={() => {
          try {
            sessionStorage.setItem('flow_price', JSON.stringify({ currency, totalPerTraveller, travellers }));
          } catch {}
          navigate('/details-hub', { state: { currency, totalPerTraveller, travellers, flightSummary: (location as any)?.state?.flightSummary || null, offerId: (location as any)?.state?.offerId || null } });
        }}>Next</button>
      </div>
    </div>
  );
};

export default Luggage;


