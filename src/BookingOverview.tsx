import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from './hooks/useTranslation';

const BookingOverview: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  // Используем итоговую цену с налогами, если есть, иначе базовую цену
  const price = Number(summary.totalWithTaxes || summary.price || 0);
  const currency = String(summary.currency || 'EUR');
  const promoDiscount = summary.promoDiscount || null;
  const originalPrice = summary.originalPrice || summary.price || 0;

  return (
    <div className="trav-page">
      <div className="trav-header">
        <button className="back-button" onClick={() => navigate(-1)}>←</button>
        <h1>{t('bookingOverview')}</h1>
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
            <div style={{ color:'#888', fontWeight:700, textTransform:'uppercase', fontSize:12 }}>{t('checkInLabel')}</div>
            <div style={{ color:'#fff', fontWeight:800, marginTop:6 }}>{new Date(summary.checkIn).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</div>
          </div>
          <div style={{ background:'#1f1f1f', border:'1px solid #333', borderRadius:12, padding:12 }}>
            <div style={{ color:'#888', fontWeight:700, textTransform:'uppercase', fontSize:12 }}>{t('checkOutLabel')}</div>
            <div style={{ color:'#fff', fontWeight:800, marginTop:6 }}>{new Date(summary.checkOut).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</div>
          </div>
        </div>

        <div>
          <div style={{ color:'#888', fontWeight:700, textTransform:'uppercase', fontSize:12 }}>{t('guestsLabel')}</div>
          <div style={{ color:'#fff', fontWeight:800, marginTop:6 }}>
            {String(summary.adults||1)} adult{Number(summary.adults||1)>1?'s':''}{summary.children?`, children: ${summary.children}`:''}
          </div>
        </div>
        
        {/* Promo discount info - более понятное отображение */}
        {promoDiscount && promoDiscount.discountAmount > 0 && (
          <>
            <div style={{ height:1, background:'#333', marginTop: 8 }} />
            <div style={{ 
              background: 'rgba(0, 168, 132, 0.1)', 
              border: '1px solid rgba(0, 168, 132, 0.2)', 
              borderRadius: 12, 
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              {/* Промо-бейджи */}
              {promoDiscount.appliedPromos.length > 0 && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {promoDiscount.appliedPromos.map((promo: string, idx: number) => (
                    <span key={idx} className="promo-badge-small">
                      {promo}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Оригинальная цена зачеркнутая */}
              {originalPrice > price && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'#999', fontSize:15, textDecoration:'line-through', fontWeight: 500 }}>
                    {t('originalPrice') || 'Original price'}: {currency} {Number(originalPrice.toFixed(2))}
                  </span>
                </div>
              )}
              
              {/* Экономия - показываем 35% скидку и 2 ночи бесплатно отдельно */}
              {promoDiscount.discountAmount > 0 && (
                <div style={{ 
                  display:'flex', 
                  justifyContent:'space-between', 
                  alignItems:'center',
                  padding: '8px 12px',
                  background: 'rgba(0, 168, 132, 0.15)',
                  borderRadius: 8
                }}>
                  <span style={{ color:'#00a884', fontSize:15, fontWeight:700 }}>
                    {t('youSave') || 'You save'}:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ color:'#00a884', fontSize:16, fontWeight:700 }}>
                      {currency} {Number(promoDiscount.discountAmount.toFixed(2))}
                    </span>
                    <span style={{ color:'#00a884', fontSize:13, fontWeight:600, opacity: 0.9 }}>
                      {promoDiscount.promoDiscountPercent || 45}% {t('discount') || 'discount'}
                      {promoDiscount.freeNights > 0 && ` + ${promoDiscount.freeNights} ${t('nightsFree') || 'nights free'}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="luggage-footer">
        <div className="price-box">
          <div className="price-label">{currency} {Number(price.toFixed(2))}</div>
          <div className="price-sub">{t('includesTaxesAndFeesLabel')}</div>
        </div>
        <button className="next-button" onClick={()=> navigate('/hotel/guest-info')}>{t('finalStep')}</button>
      </div>
    </div>
  );
};

export default BookingOverview;


