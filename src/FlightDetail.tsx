import React from 'react';
import { useLocation, useParams, useSearchParams, useNavigate } from 'react-router-dom';
// import type { FlightOffer } from './services/flightApi';
import './FlightDetail.css';
import { formatAircraftType } from './utils/aircraft';

// Безопасная запись в storage с попыткой освободить место за счёт seatmap-ключей
function safeSetItem(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
    return true;
  } catch (e) {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i) || '';
        if (/^(seatmap_raw_|seatmap_cache_|seatmap_snapshot|seatmap_snapshot_all)/.test(k)) {
          toRemove.push(k);
        }
      }
      // удалим до 15 тяжёлых ключей
      toRemove.slice(0, 15).forEach(k => storage.removeItem(k));
    } catch {}
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

// Иконки
const ArrowBackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const ShareIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.50-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
  </svg>
);

// Логотипы авиакомпаний
const AirIndiaIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="#E31E24"/>
    <rect x="2" y="2" width="28" height="28" rx="4" fill="white"/>
    <path d="M6 14c0-3 3-6 10-6s10 3 10 6c0 1.5-0.5 3-2 4l-1.5 2h-13l-1.5-2c-1.5-1-2-2.5-2-4z" fill="#E31E24"/>
    <path d="M14 10h4l-0.5 3h-3l-0.5-3z" fill="white"/>
    <text x="16" y="28" textAnchor="middle" fontSize="4" fill="#E31E24" fontWeight="bold">AI</text>
  </svg>
);


// Иконки багажа - Google Material Icons
const BackpackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 -960 960 960">
    <path d="M240-80q-33 0-56.5-23.5T160-160v-480q0-56 34-98t86-56v-86h120v80h160v-80h120v86q52 14 86 56t34 98v480q0 33-23.5 56.5T720-80H240Zm0-80h480v-480q0-33-23.5-56.5T640-720H320q-33 0-56.5 23.5T240-640v480Zm340-160h80v-160H300v80h280v80ZM480-440Z"/>
  </svg>
);

const CarryOnSuitcaseIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 -960 960 960">
    <path d="M640-280q50 0 85 35t35 85q0 50-35 85t-85 35q-38 0-68.5-22T527-120H320q-33 0-56.5-23.5T240-200v-400q0-33 23.5-56.5T320-680h240v-120q-33 0-56.5-23.5T480-880h160v600Zm-280 80v-400h-40v400h40Zm80-400v400h87q4-15 13-27.5t20-22.5v-350H440Zm200 500q25 0 42.5-17.5T700-160q0-25-17.5-42.5T640-220q-25 0-42.5 17.5T580-160q0 25 17.5 42.5T640-100Zm0-60ZM440-400Zm-80 200v-400 400Zm80-400v400-400Z"/>
  </svg>
);

const LargeSuitcaseIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 -960 960 960">
    <path d="M280-80v-40q-33 0-56.5-23.5T200-200v-440q0-33 23.5-56.5T280-720h80v-120q0-17 11.5-28.5T400-880h160q17 0 28.5 11.5T600-840v120h80q33 0 56.5 23.5T760-640v440q0 33-23.5 56.5T680-120v40h-80v-40H360v40h-80Zm160-640h80v-80h-80v80Zm40 240q53 0 103.5-13.5T680-534v-106H280v106q46 27 96.5 40.5T480-480Zm-40 120v-42q-42-5-82-15t-78-27v244h400v-244q-38 17-78 27t-82 15v42h-80Zm40 0Zm0-120Zm0 36Z"/>
  </svg>
);

interface FlightDetailProps {
  onBack: () => void;
}

const FlightDetail: React.FC<FlightDetailProps> = ({ onBack }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [flight, setFlight] = React.useState<any>(location?.state?.flight || null);
  const [loading, setLoading] = React.useState(!flight);
  const [searchParams] = useSearchParams();
  const [showPriceInfo, setShowPriceInfo] = React.useState(false);

  // Определяем тип самолёта по первому легу, если доступно
  const aircraftLabel = React.useMemo(() => {
    try {
      const segs = flight?.segments || [];
      for (const seg of segs) {
        const legs = seg?.legs || [];
        for (const leg of legs) {
          const raw = String(
            leg?.flightInfo?.planeType
            || leg?.flightInfo?.aircraft?.code
            || leg?.planeType
            || leg?.aircraftType
            || ''
          ).trim();
          if (raw) return formatAircraftType(raw);
        }
      }
    } catch {}
    return '';
  }, [flight]);

  React.useEffect(() => {
    console.log('FlightDetail: useEffect, id:', id, 'flight:', !!flight);
    if (!flight) {
      try {
        const offerToken = id || sessionStorage.getItem('current_offer_id');
        console.log('FlightDetail: Looking for offer with token:', offerToken);
        let cached = null;
        if (offerToken) {
          cached = sessionStorage.getItem(`selectedFlightOffer:${offerToken}`);
          console.log('FlightDetail: Found cached by token:', !!cached);
        }
        if (!cached) {
          cached = sessionStorage.getItem('selectedFlightOffer'); // Fallback to global
          console.log('FlightDetail: Found cached global:', !!cached);
        }
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('FlightDetail: Parsed flight data:', parsed);
          setFlight(parsed);
        }
      } catch (e) {
        console.error('FlightDetail: Error loading flight:', e);
      }
    }
    setLoading(false);
    // На размонтирование: зафиксировать freeze, чтобы экран результатов не делал повторный поиск
    return () => {
      try {
        sessionStorage.setItem('flightResults_freeze','1');
        sessionStorage.setItem('flightResultsMulti_freeze','1');
        // Флаг безопасного возврата без повторного запроса
        sessionStorage.setItem('flightResults_back','1');
      } catch {}
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flight-detail">
        <div className="loading">Loading flight details...</div>
      </div>
    );
  }

  // Хелперы форматирования
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' });
  const fmtDur = (mins: number) => `${Math.floor(mins/60)}h ${mins%60}m`;
  const fmtPrice = (units: number, nanos: number, currency: string) => `${currency} ${Math.round(units + nanos/1_000_000_000).toLocaleString()}`;

  const allLegs = flight.segments.flatMap((s: any) => s.legs || []);
  const firstSeg = flight.segments[0];
  const lastSeg = flight.segments[flight.segments.length - 1];
  const totalMinutes = flight.segments.reduce((acc: number, s: any) => acc + Math.round((s.totalTime || 0)/60), 0);
  const totalStops = flight.segments.reduce((acc: number, s: any) => acc + Math.max(0, (s.legs?.length || 1) - 1), 0);

  // Price breakdown based on travellers from URL
  const unitCurrency = (location?.state?.search?.currency || flight.priceBreakdown?.total?.currencyCode || 'USD');
  const unitAmount = (flight.priceBreakdown?.total?.units || 0) + (flight.priceBreakdown?.total?.nanos || 0) / 1_000_000_000;
  const basePriceLabel = fmtPrice(flight.priceBreakdown?.total?.units || 0, flight.priceBreakdown?.total?.nanos || 0, unitCurrency);
  const adults = Math.max(1, parseInt((location?.state?.search?.adults) || searchParams.get('adults') || '1'));
  const childrenAgesStr = ((location?.state?.search?.children) || searchParams.get('children') || '').trim();
  const childAges = childrenAgesStr ? childrenAgesStr.split(',').filter(Boolean) : [];
  const infantCount = childAges.filter((a: string) => { const n = parseInt(a || '0'); return !isNaN(n) && n <= 1; }).length;
  const paidChildren = Math.max(0, childAges.length - infantCount);
  const travellersCount = adults + paidChildren + infantCount;
  const childrenCountLabel = childAges.length;
  const travellersLabel = `${adults} adult${adults>1?'s':''}` + (childrenCountLabel?`, ${childrenCountLabel} child${childrenCountLabel>1?'ren':''}`:'');
  const infantFeePerInfant = unitCurrency === 'THB' ? 3500 : unitAmount * 0.1;
  const estimatedTotalAmount = unitAmount * (adults + paidChildren) + infantFeePerInfant * infantCount;
  const estimatedTotalLabel = fmtPrice(Math.floor(estimatedTotalAmount), Math.round((estimatedTotalAmount % 1) * 1_000_000_000), unitCurrency);

  return (
    <div className="flight-detail">
      {/* Header */}
      <div className="flight-detail-header">
        <button className="back-button" onClick={() => { try { sessionStorage.setItem('flightResults_freeze','1'); sessionStorage.setItem('flightResultsMulti_freeze','1'); sessionStorage.setItem('flightResults_back','1'); sessionStorage.setItem('flightResults_no_fetch','1'); } catch {}; onBack(); }}>
          <ArrowBackIcon />
        </button>
        <h1>{firstSeg?.departureAirport?.code} → {lastSeg?.arrivalAirport?.code}</h1>
        <button className="share-button">
          <ShareIcon />
        </button>
      </div>

      {/* Flight Info */}
      <div className="flight-summary">
        <h2>{fmtDate(firstSeg?.departureTime)} • {fmtTime(firstSeg?.departureTime)} – {fmtTime(lastSeg?.arrivalTime)}</h2>
        <p className="flight-type">{totalStops === 0 ? 'Direct' : (totalStops === 1 ? '1 stop' : `${totalStops} stops`)} • {fmtDur(totalMinutes)}</p>
        {aircraftLabel && (
          <div style={{ marginTop: 4, display:'inline-flex', alignItems:'center', gap:6, background:'#2e2e2e', border:'1px solid #404040', borderRadius: 12, padding:'6px 10px', color:'#ddd', fontSize:12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
            <span>{aircraftLabel}</span>
          </div>
        )}
        {/* Search params summary like results header */}
        <div style={{ color: '#ccc', marginTop: 4, fontSize: 14 }}>
          {(() => {
            const depart = searchParams.get('departDate') || '';
            const ret = searchParams.get('returnDate') || '';
            const cabinParam = ((location?.state?.search?.cabinClass) || searchParams.get('cabinClass') || 'ECONOMY').toUpperCase();
            const cabinLabel = ({ ECONOMY: 'Economy', PREMIUM_ECONOMY: 'Premium economy', BUSINESS: 'Business', FIRST: 'First' } as Record<string,string>)[cabinParam] || 'Economy';
            const currency = (searchParams.get('currency') || unitCurrency).toUpperCase();
            const stopsLabel = totalStops === 0 ? 'Direct' : (totalStops === 1 ? '1 stop' : `${totalStops} stops`);
            const chCount = childrenCountLabel;
            const parts: string[] = [];
            parts.push(depart + (ret ? ` · Return ${ret}` : ''));
            parts.push(`${adults} adult${adults>1?'s':''}`);
            if (chCount) parts.push(`${chCount} child${chCount>1?'ren':''}`);
            parts.push(cabinLabel);
            parts.push(currency);
            parts.push(stopsLabel);
            return parts.filter(Boolean).join(' · ');
          })()}
        </div>
      </div>

      {/* Flight Timelines split by direction */}
      <div className="flight-timeline">
        {(() => {
          const segments = flight.segments || [];
          if (segments.length === 0) return null;
          const outbound = segments[0];
          const inbound = segments.length > 1 ? segments[1] : null;

          const renderSegment = (seg: any, title: string) => {
            const dep = seg.departureAirport;
            const arr = seg.arrivalAirport;
            const legs = seg.legs || [];
            return (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ margin: '0 0 12px 0', color:'#fff', fontSize:18, fontWeight:600 }}>{title}</h3>
                <div className="timeline-segment">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="time-date">{fmtDate(seg.departureTime)} • {fmtTime(seg.departureTime)}</div>
                    <div className="airport">{dep?.code} • {dep?.name}</div>
                  </div>
                </div>
                {legs.map((leg: any, lidx: number) => {
                  const airline = leg.carriersData?.[0];
                  const marketing = leg.flightInfo?.carrierInfo?.marketingCarrier;
                  const operating = leg.flightInfo?.carrierInfo?.operatingCarrier;
                  const code = (airline?.code || marketing || operating || '').toUpperCase();
                  const computedLogo = code ? `https://r-xx.bstatic.com/data/airlines_logo/${code}.png` : '';
                  const primaryLogo = airline?.logo || airline?.logoUrl || computedLogo;
                  const aircraft = formatAircraftType(leg?.flightInfo?.planeType);
                  return (
                    <div className="timeline-segment" key={lidx}>
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <div className="airline-info">
                          <div className="airline-logo-small">
                            {primaryLogo ? (
                              <img src={primaryLogo} alt={airline?.name || code || 'Airline'} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain', background: '#fff' }}
                                onError={(e) => { const img = e.currentTarget as HTMLImageElement; if (computedLogo && img.src !== computedLogo) { img.src = computedLogo; } else { img.style.display = 'none'; } }} />
                            ) : (
                              <AirIndiaIcon />
                            )}
                          </div>
                          <div className="airline-details">
                            <div className="airline-name">{airline?.name || code || 'Airline'}</div>
                            {(() => {
                              const cabinParam = (leg?.cabinClass || (searchParams.get('cabinClass') || 'ECONOMY')).toUpperCase();
                              const cabinLabel = ({ ECONOMY: 'Economy', PREMIUM_ECONOMY: 'Premium economy', BUSINESS: 'Business', FIRST: 'First' } as Record<string,string>)[cabinParam] || 'Economy';
                              const durationLabel = fmtDur(Math.round((leg.totalTime || 0)/60));
                              const planeLabel = formatAircraftType(leg?.flightInfo?.planeType || (leg as any)?.flightInfo?.aircraft?.code || (leg as any)?.planeType || (leg as any)?.aircraftType);
                              return (
                                <div className="airline-meta" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                                  <div className="flight-number">Flight {code} {leg.flightInfo?.flightNumber} • {cabinLabel}{aircraft?` • ${aircraft}`:''}</div>
                                  <div className="flight-duration">Flight time {durationLabel}</div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        {(() => {
                          const plane = formatAircraftType(leg?.flightInfo?.planeType || (leg as any)?.flightInfo?.aircraft?.code || (leg as any)?.planeType || (leg as any)?.aircraftType);
                          return plane ? (
                            <div style={{ marginTop: 8 }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#2e2e2e', border:'1px solid #404040', borderRadius:12, padding:'4px 8px', color:'#ddd', fontSize:12 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
                                {plane}
                              </span>
                            </div>
                          ) : null;
                        })()}
                        {lidx < legs.length - 1 && (
                          (() => {
                            const next = legs[lidx + 1];
                            const prevArr = new Date(leg.arrivalTime).getTime();
                            const nextDep = new Date(next.departureTime).getTime();
                            const minutes = Math.max(0, Math.round((nextDep - prevArr) / 60000));
                            const layover = fmtDur(minutes);
                            const atAirport = leg.arrivalAirport?.code || next.departureAirport?.code || '';
                            const atName = leg.arrivalAirport?.name || next.departureAirport?.name || '';
                            return (
                              <div className="layover" style={{ marginTop: 12 }}>
                                <div className="layover-info" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 12px', background:'#2e2e2e', borderRadius:16 }}>
                                  <svg width="16" height="16" fill="#ccc" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm.75 5h-1.5v6l5 3 .75-1.23-4.25-2.52V7z"/></svg>
                                  <span style={{ color:'#ddd', fontSize:14 }}>Layover {layover} at {atAirport}{atName?` · ${atName}`:''}</span>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="timeline-segment">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="time-date">{fmtDate(seg.arrivalTime)} • {fmtTime(seg.arrivalTime)}</div>
                    <div className="airport">{arr?.code} • {arr?.name}</div>
                  </div>
                </div>
              </div>
            );
          };

          const outTitle = `Flight to ${segments[0]?.arrivalAirport?.cityName || segments[0]?.arrivalAirport?.name || segments[0]?.arrivalAirport?.code || ''}`;
          const inTitle = inbound ? `Flight to ${inbound?.arrivalAirport?.cityName || inbound?.arrivalAirport?.name || inbound?.arrivalAirport?.code || ''}` : '';
          return (
            <>
              {renderSegment(outbound, outTitle)}
              {inbound && renderSegment(inbound, inTitle)}
            </>
          );
        })()}
      </div>

      {/* Baggage moved to Luggage page */}

      {/* Price and Select with breakdown */}
      <div className="select-section" style={{ position: 'relative' }}>
        <div className="price-info" style={{ position: 'relative' }}>
          <div className="total-price" style={{ display:'flex', alignItems:'center' }}>{basePriceLabel}
            <button aria-label="Price breakdown" onClick={()=>setShowPriceInfo(v=>!v)}
              style={{ marginLeft: 8, width: 32, height: 32, border:'1px solid #404040', borderRadius: 16, background:'#2a2a2a', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src={new URL('./assets/info_i_24dp.svg', import.meta.url).toString()} alt="info" style={{ width: 18, height: 18 }} />
            </button>
          </div>
          <div className="price-subtitle">{estimatedTotalLabel} for {travellersCount} traveler{travellersCount>1?'s':''}</div>
        </div>
        <button className="select-button" onClick={() => {
          const baseAmount = unitAmount; // цена за путешественника
          const currencyCode = unitCurrency;
          const travellers = travellersCount;
          try {
            console.log('FlightDetail: Setting current_offer_id to:', id);
            console.log('FlightDetail: Flight data before storing:', flight);
            console.log('FlightDetail: Flight token:', flight?.token);

            // Очищаем старые данные
            try { sessionStorage.removeItem('selectedFlightOffer'); } catch {}
            try {
              const keys = Object.keys(sessionStorage).filter(k => k.startsWith('selectedFlightOffer:'));
              keys.forEach(k => sessionStorage.removeItem(k));
            } catch {}

            // Use flight.token if available, otherwise use id
            const offerToken = flight?.token || id || '';
            safeSetItem(sessionStorage, 'current_offer_id', offerToken);
            safeSetItem(sessionStorage, 'flow_price', JSON.stringify({ currency: currencyCode, totalPerTraveller: baseAmount, travellers }));
            // Сохраняем параметры пассажиров для правил выбора мест (Adults/Children/Multi‑city) — используется на /seat и /seat-map
            try {
              const pax = { adults, childrenAges: childAges, segments: Array.isArray(flight?.segments) ? flight.segments.length : 0 };
              safeSetItem(sessionStorage, 'flow_pax', JSON.stringify(pax));
              safeSetItem(localStorage, 'flow_pax', JSON.stringify(pax));
            } catch {}
            // Дублируем в localStorage как резервный источник
            safeSetItem(localStorage, 'current_offer_id', offerToken);
            safeSetItem(localStorage, 'flow_price', JSON.stringify({ currency: currencyCode, totalPerTraveller: baseAmount, travellers }));
            console.log('FlightDetail: Stored current_offer_id:', offerToken);
            console.log('FlightDetail: Stored flow_price:', JSON.stringify({ currency: currencyCode, totalPerTraveller: baseAmount, travellers }));

            safeSetItem(sessionStorage, 'selectedFlightOffer', JSON.stringify(flight));
            safeSetItem(sessionStorage, `selectedFlightOffer:${offerToken}`, JSON.stringify(flight));
            // Дублируем оффер и под токеном в localStorage
            safeSetItem(localStorage, 'selectedFlightOffer', JSON.stringify(flight));
            safeSetItem(localStorage, `selectedFlightOffer:${offerToken}`, JSON.stringify(flight));
            // Компактный summary (минимум полей) для надёжного восстановления экранов выбора мест
            try {
              const summary = {
                token: offerToken,
                segments: (flight?.segments||[]).map((seg:any)=>({
                  departureAirport: {
                    code: seg?.departureAirport?.code,
                    cityName: seg?.departureAirport?.cityName,
                    name: seg?.departureAirport?.name
                  },
                  arrivalAirport: {
                    code: seg?.arrivalAirport?.code,
                    cityName: seg?.arrivalAirport?.cityName,
                    name: seg?.arrivalAirport?.name
                  },
                  departureTime: seg?.departureTime,
                  arrivalTime: seg?.arrivalTime,
                  totalTime: seg?.totalTime,
                  token: seg?.token,
                  legs: Array.isArray(seg?.legs) && seg.legs.length ? [{
                    cabinClass: seg.legs[0]?.cabinClass,
                    totalTime: seg.legs[0]?.totalTime,
                    flightInfo: seg.legs[0]?.flightInfo,
                    carriersData: seg.legs[0]?.carriersData ? [seg.legs[0]?.carriersData?.[0]] : []
                  }] : []
                }))
              };
              safeSetItem(sessionStorage, 'selectedFlightOffer_summary', JSON.stringify(summary));
              safeSetItem(sessionStorage, `selectedFlightOffer_summary:${offerToken}`, JSON.stringify(summary));
              safeSetItem(localStorage, 'selectedFlightOffer_summary', JSON.stringify(summary));
              safeSetItem(localStorage, `selectedFlightOffer_summary:${offerToken}`, JSON.stringify(summary));
          } catch {}
            console.log('FlightDetail: Stored flight data under both keys');
          } catch (e) {
            console.error('FlightDetail: Error storing data:', e);
          }
          // Передаём компактный summary через state для надёжного восстановления на /seat
          const offerToken = (flight?.token || id || '') as string;
          const flightSummary = {
            token: offerToken,
            segments: (flight?.segments||[]).map((seg:any)=>({
              departureAirport: seg?.departureAirport,
              arrivalAirport: seg?.arrivalAirport,
              departureTime: seg?.departureTime,
              arrivalTime: seg?.arrivalTime,
              totalTime: seg?.totalTime,
              token: seg?.token,
              legs: seg?.legs?.length ? [seg.legs[0]] : []
            }))
          };
          navigate('/ticket-type', { state: { baseAmount, currency: currencyCode, travellers, offerId: offerToken, flightSummary } });
        }}>Select</button>

        {showPriceInfo && (
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 70, background: '#2a2a2a', border: '1px solid #404040', borderRadius: 12, padding: '12px 14px', zIndex: 2000 }}>
            <div style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>Price breakdown</div>
            <div style={{ display: 'grid', gap: 6, color: '#ddd', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Tickets ({travellersLabel})</span>
                <span>{estimatedTotalLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Base (per traveller)</span>
                <span>{basePriceLabel}</span>
              </div>
              {infantCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Infant fee × {infantCount}</span>
                  <span>{fmtPrice(Math.floor(infantFeePerInfant), Math.round((infantFeePerInfant % 1) * 1_000_000_000), unitCurrency)}</span>
                </div>
              )}
              <div style={{ height: 1, background: '#404040', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 600 }}>
                <span>Estimated total</span>
                <span>{estimatedTotalLabel}</span>
              </div>
              <div style={{ color: '#999', fontSize: 12 }}>{travellersCount} traveller{travellersCount>1?'s':''}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightDetail;
