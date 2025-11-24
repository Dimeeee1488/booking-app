import React from 'react';
import { useNavigate } from 'react-router-dom';

const BookingOverview: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = React.useState<any>(null);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('hotel_booking_summary') || '{}';
      setSummary(JSON.parse(raw));
    } catch { setSummary(null); }
  }, []);

  if (!summary) {
    return (
      <div style={{ color:'#fff', padding:20 }}>
        Nothing to show. <button className="ghost-link" onClick={()=> navigate(-1)}>Go back</button>
      </div>
    );
  }

  const price = Number(summary.price || 0);
  const currency = String(summary.currency || 'EUR');

  return (
    <div className="trav-page">
      <div className="trav-header">
        <button className="back-button" onClick={() => navigate(-1)}>←</button>
        <h1>Booking overview</h1>
        <div style={{ width: 24 }} />
      </div>

      <div className="section" style={{ display:'grid', gap:16 }}>
        <div style={{ display:'flex', gap:12 }}>
          {summary.photo ? (
            <img src={summary.photo} alt="hotel" style={{ width:72, height:72, borderRadius:10, objectFit:'cover' }}/>
          ) : (
            <div style={{ width:72, height:72, borderRadius:10, background:'#2a2a2a' }} />
          )}
          <div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:20 }}>{summary.hotel_name || 'Hotel'}</div>
            <div style={{ color:'#ffcc00', marginTop:6 }}>★★</div>
            <div style={{ color:'#bbb', marginTop:8 }}>{[summary.address, summary.city].filter(Boolean).join(', ')}</div>
          </div>
        </div>

        <div style={{ height:1, background:'#333' }} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ background:'#1f1f1f', border:'1px solid #333', borderRadius:12, padding:12 }}>
            <div style={{ color:'#888', fontWeight:700, textTransform:'uppercase', fontSize:12 }}>Check-in</div>
            <div style={{ color:'#fff', fontWeight:800, marginTop:6 }}>{new Date(summary.checkIn).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</div>
          </div>
          <div style={{ background:'#1f1f1f', border:'1px solid #333', borderRadius:12, padding:12 }}>
            <div style={{ color:'#888', fontWeight:700, textTransform:'uppercase', fontSize:12 }}>Check-out</div>
            <div style={{ color:'#fff', fontWeight:800, marginTop:6 }}>{new Date(summary.checkOut).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</div>
          </div>
        </div>

        <div>
          <div style={{ color:'#888', fontWeight:700, textTransform:'uppercase', fontSize:12 }}>Guests</div>
          <div style={{ color:'#fff', fontWeight:800, marginTop:6 }}>
            {String(summary.adults||1)} adult{Number(summary.adults||1)>1?'s':''}{summary.children?`, children: ${summary.children}`:''}
          </div>
        </div>
      </div>

      <div className="luggage-footer">
        <div className="price-box">
          <div className="price-label">{currency} {Math.round(price).toLocaleString()}</div>
          <div className="price-sub">Includes taxes and fees</div>
        </div>
        <button className="next-button" onClick={()=> navigate('/hotel/guest-info')}>Final step</button>
      </div>
    </div>
  );
};

export default BookingOverview;


