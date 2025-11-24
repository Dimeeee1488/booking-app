import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchFlights, searchAirports } from './services/flightApi';
import { setCache, getCache } from './services/cache';
import './FlightResults.css';
import { formatAircraftType } from './utils/aircraft';

// Локальные типы данных (без импорта из API)
interface Airport {
  id: string;
  code: string;
  name: string;
}

interface FlightLeg {
  departureTime: string;
  arrivalTime: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  cabinClass: string;
  flightInfo: {
    flightNumber: number;
    planeType: string;
    carrierInfo: {
      operatingCarrier: string;
      marketingCarrier: string;
    };
  };
  carriersData: Array<{
    name: string;
    code: string;
    logo?: string;
    logoUrl?: string;
  }>;
  totalTime: number;
  flightStops: any[];
}

interface FlightSegment {
  departureAirport: Airport;
  arrivalAirport: Airport;
  departureTime: string;
  arrivalTime: string;
  totalTime: number;
  legs: FlightLeg[];
}

interface FlightOffer {
  token: string;
  segments: FlightSegment[];
  priceBreakdown: {
    total: {
      currencyCode: string;
      units: number;
      nanos: number;
    };
  };
}

// Локальные функции форматирования
const formatPrice = (units: number, nanos: number, currency: string = 'AED'): string => {
  const total = units + (nanos / 1000000000);
  return `${currency} ${Math.round(total).toLocaleString()}`;
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const formatDateTime = (isoString: string): { time: string; date: string } => {
  const date = new Date(isoString);
  const time = date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  const dateStr = date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short' 
  });
  return { time, date: dateStr };
};

// removed unused getStopsText

// Deduplicate flights by token to prevent React key collisions (hoisted)
function dedupeByToken(list: any[]): any[] {
  try {
    const seen = new Set<string>();
    const out: any[] = [];
    for (const f of (list || [])) {
      const t = String(f?.token || '');
      if (t && seen.has(t)) continue;
      if (t) seen.add(t);
      out.push(f);
    }
    return out;
  } catch {
    return list;
  }
}

// Безопасная запись в sessionStorage с защитой от QuotaExceeded
const safeSessionSet = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    // Пытаемся освободить место, удаляя самые тяжелые ключи. ВАЖНО: НЕ трогаем flightResults снапшоты
    try {
      const candidates: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i) || '';
        if (/^(seatmap_raw_|seatmap_snapshot|seatmap_snapshot_all|seatmap_cache_)/.test(k)) {
          candidates.push(k);
        }
      }
      // Удалим до 10 тяжёлых ключей seatmap, чтобы освободить место для снапшотов результатов
      candidates.slice(0, 10).forEach(k => sessionStorage.removeItem(k));
    } catch {}
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
};

// Триммер данных рейсов для снапшота (убираем тяжелые поля)
const buildLiteFlights = (flights: any[]) => {
  try {
    return (flights || []).map((f: any) => ({
      token: f?.token,
      priceBreakdown: { total: f?.priceBreakdown?.total },
      segments: (f?.segments || []).map((s: any) => ({
        departureAirport: s?.departureAirport,
        arrivalAirport: s?.arrivalAirport,
        departureTime: s?.departureTime,
        arrivalTime: s?.arrivalTime,
        totalTime: s?.totalTime,
        // Берем только первый leg и только нужные поля
        legs: Array.isArray(s?.legs) && s.legs.length ? [{
          flightInfo: s.legs[0]?.flightInfo,
          carriersData: s.legs[0]?.carriersData ? [s.legs[0]?.carriersData?.[0]] : [],
          totalTime: s.legs[0]?.totalTime
        }] : []
      }))
    }));
  } catch {
    return flights;
  }
};


// Иконки
const ArrowBackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
    <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
  </svg>
);

const GeniusIcon = () => (
  <svg width="20" height="20" fill="#0071c2" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

// Иконки авиакомпаний
// removed unused AirIndiaIcon





const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
  <div 
    onClick={() => onChange(!checked)}
    style={{
      width: '51px',
      height: '31px',
      borderRadius: '16px',
      background: checked ? '#0071c2' : '#404040',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 0.2s'
    }}
  >
    <div 
      style={{
        width: '27px',
        height: '27px',
        borderRadius: '50%',
        background: 'white',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'left 0.2s'
      }}
    />
  </div>
);



// Новый компонент для реальных данных API
const RealFlightCard = ({ flight }: { flight: FlightOffer }) => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  // removed unused logo error state
  const [showPriceInfo, setShowPriceInfo] = React.useState(false);
  
  const handleCardClick = () => {
    try {
      sessionStorage.setItem('selectedFlightOffer', JSON.stringify(flight));
      // Также сохраняем оффер под ключом токена, чтобы однозначно восстанавливать выбранный рейс
      try { sessionStorage.setItem(`selectedFlightOffer:${flight.token}`, JSON.stringify(flight)); } catch {}
      // Синхронизируем текущий offer_id сразу при открытии деталей
      try { sessionStorage.setItem('current_offer_id', flight.token || ''); } catch {}
      // Freeze results to avoid any refetch when returning from details
      sessionStorage.setItem('flightResults_freeze', '1');
      // Дополнительно помечаем возврат, чтобы пропустить эффекты загрузки
      sessionStorage.setItem('flightResults_back', '1');
      // Жёсткий флаг полного запрета перезапроса на следующий маунт
      sessionStorage.setItem('flightResults_no_fetch', '1');
    } catch (_) {}
    navigate(`/flight-detail/${flight.token}`, { state: { flight, search: {
      from: sp.get('from') || '',
      to: sp.get('to') || '',
      departDate: sp.get('departDate') || '',
      returnDate: sp.get('returnDate') || '',
      adults: sp.get('adults') || '1',
      children: sp.get('children') || '',
      cabinClass: sp.get('cabinClass') || 'ECONOMY',
      currency: sp.get('currency') || flight.priceBreakdown?.total?.currencyCode || 'USD',
      stops: sp.get('stops') || '2'
    } } });
  };

  // Получаем информацию из первого сегмента для заголовка/иконки
  const firstSegment = flight.segments[0];
  // lastSegment not used
  
  // Общая длительность всех сегментов (API отдаёт секунды → переводим в минуты)
  // const totalSeconds = flight.segments.reduce((acc, seg) => acc + (seg.totalTime || 0), 0);
  // totalDuration not used
  
  // Количество пересадок по всей поездке (для бэйджа, если понадобится)
  // stops breakdown not used here; keep per-segment rendering below
  /* const stopsCount = flight.segments.reduce((total, segment) => {
    const legs = segment.legs || [];
    const stopsByLegArray = legs.map(leg => (leg.flightStops ? leg.flightStops.length : 0));
    const stopsByLeg = stopsByLegArray.reduce((a, b) => a + b, 0);
    const structuralStops = Math.max(0, legs.length - 1);
    return total + (stopsByLeg > 0 ? stopsByLeg : structuralStops);
  }, 0); */
  
  // Цена за одного (как приходит из API)
  const unitCurrency = flight.priceBreakdown.total.currencyCode;
  const unitAmount = (flight.priceBreakdown.total.units || 0) + (flight.priceBreakdown.total.nanos || 0) / 1_000_000_000;
  const price = formatPrice(
    flight.priceBreakdown.total.units,
    flight.priceBreakdown.total.nanos,
    unitCurrency
  );

  // Оценка общей стоимости для всех пассажиров с правилами для младенцев
  const adultsCount = Math.max(1, parseInt(sp.get('adults') || '1'));
  const childrenAgesStr = (sp.get('children') || '').trim();
  const childAges = childrenAgesStr ? childrenAgesStr.split(',').filter(Boolean) : [];
  const infantCount = childAges.filter(a => {
    const n = parseInt(a || '0');
    return !isNaN(n) && n <= 1; // 0–1 лет = младенец
  }).length;
  const paidChildrenCount = Math.max(0, childAges.length - infantCount);
  const travellersCount = adultsCount + paidChildrenCount + infantCount;

  // Фиксированная надбавка за младенца в THB, иначе 10% от цены
  const infantFeePerInfant = unitCurrency === 'THB' ? 3500 : unitAmount * 0.1;
  const estimatedTotalAmount = unitAmount * (adultsCount + paidChildrenCount) + infantFeePerInfant * infantCount;
  const estimatedLabel = `${travellersCount} traveller${travellersCount > 1 ? 's' : ''}`;
  const estimatedTotal = formatPrice(Math.floor(estimatedTotalAmount), Math.round((estimatedTotalAmount % 1) * 1_000_000_000), unitCurrency);

  // Информация об авиакомпании из первого рейса
  const airline = firstSegment.legs[0]?.carriersData?.[0];
  // const computedLogo = airlineCode ? `https://r-xx.bstatic.com/data/airlines_logo/${airlineCode}.png` : '';
  // airlineLogo unused; we compute per-segment below
  const flightNumber = firstSegment.legs[0]?.flightInfo.flightNumber;
  const aircraft = (() => {
    const pick = (leg: any): string => {
      const candidates = [
        leg?.flightInfo?.planeType,
        leg?.flightInfo?.plane,
        leg?.planeType,
        leg?.aircraftType,
        leg?.flightInfo?.aircraft?.code,
        leg?.flightInfo?.aircraftCode
      ];
      for (const v of candidates) {
        if (v && String(v).trim().length > 0) return String(v).trim();
      }
      return '';
    };
    try {
      for (const seg of flight.segments) {
        for (const leg of (seg.legs || [])) {
          const raw = pick(leg);
          if (raw) return formatAircraftType(raw);
        }
      }
    } catch {}
    return '';
  })();

  // Аггрегируем все пересадки (между ногами внутри сегмента и между сегментами)
  /* const { totalLayoverMinutes } = (() => {
    try {
      let total = 0;
      const airports: string[] = [];
      for (let s = 0; s < flight.segments.length; s++) {
        const seg = flight.segments[s];
        const legs = seg.legs || [];
        for (let i = 0; i < legs.length - 1; i++) {
          const prevArr = new Date(legs[i].arrivalTime).getTime();
          const nextDep = new Date(legs[i + 1].departureTime).getTime();
          const mins = Math.max(0, Math.round((nextDep - prevArr) / 60000));
          total += mins;
          const code = legs[i].arrivalAirport?.code || legs[i + 1].departureAirport?.code;
          if (code && !airports.includes(code)) airports.push(code);
        }
        // Между сегментами
        if (s < flight.segments.length - 1) {
          const lastLeg = legs[legs.length - 1] || seg as any;
          const nextSeg = flight.segments[s + 1];
          const nextFirstLeg = nextSeg.legs?.[0] || nextSeg as any;
          const prevArr = new Date((lastLeg.arrivalTime || seg.arrivalTime)).getTime();
          const nextDep = new Date((nextFirstLeg.departureTime || nextSeg.departureTime)).getTime();
          const mins = Math.max(0, Math.round((nextDep - prevArr) / 60000));
          total += mins;
          const code = (lastLeg.arrivalAirport?.code || nextFirstLeg.departureAirport?.code);
          if (code && !airports.includes(code)) airports.push(code);
        }
      }
      return { totalLayoverMinutes: total, layoverAirports: airports };
    } catch { return { totalLayoverMinutes: 0, layoverAirports: [] as string[] }; }
  })(); */
  // layoverText unused here

  return (
    <div className="flight-card flight-card-appear" onClick={handleCardClick}>
      <div className="flight-header">
        <div style={{ display:'grid', gap: 12, flex: 1 }}>
          {flight.segments.map((seg, idx) => {
            const dep = formatDateTime(seg.departureTime);
            const arr = formatDateTime(seg.arrivalTime);
            const legs = seg.legs || [];
            const segStops = Math.max(0, legs.length - 1);
            let layMinutes = 0; const layAirports: string[] = [];
            for (let i=0;i<legs.length-1;i++){
              const prevArr = new Date(legs[i].arrivalTime).getTime();
              const nextDep = new Date(legs[i+1].departureTime).getTime();
              const m = Math.max(0, Math.round((nextDep - prevArr)/60000));
              layMinutes += m; const code = legs[i].arrivalAirport?.code || legs[i+1].departureAirport?.code; if (code && !layAirports.includes(code)) layAirports.push(code);
            }
            const layText = layMinutes>0 ? `${Math.floor(layMinutes/60)}h ${layMinutes%60}m` : '';
            // per-segment airline logo
            const sLeg = legs[0] as any;
            const sA = sLeg?.carriersData?.[0] || {};
            const sCode = (sA.code || sLeg?.flightInfo?.carrierInfo?.marketingCarrier || sLeg?.flightInfo?.carrierInfo?.operatingCarrier || '').toUpperCase();
            const sLogo = sA.logo || sA.logoUrl || (sCode?`https://r-xx.bstatic.com/data/airlines_logo/${sCode}.png`: '');
            return (
              <div key={idx} style={{ padding: idx>0? '12px 0 0': '0 0 12px', borderTop: idx>0? '1px solid #333':'none' }}>
                <div style={{ display:'grid', gridTemplateColumns:'40px 1fr', gap:8, alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {sLogo ? (
                      <img src={sLogo} alt={sA.name || sCode || 'Airline'}
                           style={{ width:40, height:40, borderRadius:8, objectFit:'contain', background:'#fff' }}
                           onError={(e)=>{ const img=e.currentTarget as HTMLImageElement; const fb = sCode?`https://r-xx.bstatic.com/data/airlines_logo/${sCode}.png`:''; if (fb && img.src!==fb) img.src=fb; else img.style.display='none'; }} />
                    ) : null}
                  </div>
                  <div className="flight-times">
                <div className="departure">
                  <span className="time">{dep.time}</span>
                  <span className="airport">{seg.departureAirport.code} · {dep.date}</span>
                </div>
                <div className="flight-duration">
                  <div className="duration-line">
                    <div className="line">
                      <div className="dot start"></div>
                      <div className="duration-info">
                        {segStops === 0 ? (
                          <span className="direct">Direct</span>
                        ) : (
                          <span className="stops">{segStops === 1 ? '1 stop' : `${segStops} stops`}</span>
                        )}
                        <span className="duration">{formatDuration(Math.round((seg.totalTime||0)/60))}</span>
                        {layMinutes>0 && (
                          <span className="layover" style={{ marginLeft: 8, color: '#bbb', fontSize: 12 }}>
                            Layover {layText}{layAirports.length?` · ${layAirports.slice(0,3).join(', ')}${layAirports.length>3?'…':''}`:''}
                          </span>
                        )}
                      </div>
                      <div className="dot end"></div>
                    </div>
                  </div>
                </div>
                <div className="arrival">
                  <span className="time">{arr.time}</span>
                  <span className="airport">{seg.arrivalAirport.code} · {arr.date}</span>
                </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="footer-row">
        <div className="airline-name">{airline?.name || 'Unknown Airline'}</div>
        <div className="price-bar">
          <div className="price-row" style={{ position: 'relative' }}>
            <button className="info-button" onClick={(e) => { e.stopPropagation(); setShowPriceInfo(v => !v); }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </button>
            <span className="price">{price}</span>
            {showPriceInfo && (
              <div style={{ position: 'absolute', right: 0, top: 28, background: '#2a2a2a', border: '1px solid #404040', borderRadius: 10, padding: '12px 14px', width: 260, zIndex: 3 }} onClick={(e)=>e.stopPropagation()}>
                <div style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>Price breakdown</div>
                <div style={{ display: 'grid', gap: 6, color: '#ddd', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Base (per traveller)</span>
                    <span>{price}</span>
                  </div>
                  {infantCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Infant fee × {infantCount}</span>
                      <span>{formatPrice(Math.floor(infantFeePerInfant), Math.round((infantFeePerInfant % 1) * 1_000_000_000), unitCurrency)}</span>
                    </div>
                  )}
                  <div style={{ height: 1, background: '#404040', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 600 }}>
                    <span>Estimated total</span>
                    <span>{estimatedTotal}</span>
                  </div>
                  <div style={{ color: '#999', fontSize: 12 }}>{estimatedLabel}</div>
                </div>
              </div>
            )}
          </div>
          <div style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>
            {estimatedTotal} · {estimatedLabel}
          </div>
          <span className="total">Total</span>
        </div>
      </div>

      <div className="flight-bottom">
      <div className="flight-details">
        <div className="flight-info-chips">
          {aircraft && (
            <div className="info-chip">
              <svg className="chip-icon" width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
              <span className="chip-text">{aircraft}</span>
            </div>
          )}
          {flightNumber && (
            <div className="info-chip">
              <svg className="chip-icon" width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3.25-4H6.75V4h6.5v12z"/>
              </svg>
              <span className="chip-text">{airline?.code} {flightNumber}</span>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

interface FlightResultsProps {
  onBack: () => void;
}

const SortModal = ({ isOpen, onClose, sortBy, setSortBy }: {
  isOpen: boolean;
  onClose: () => void;
  sortBy: string;
  setSortBy: (value: string) => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sort-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Sort by</h3>
        </div>
        
        <div className="sort-options">
          <div className="sort-option" onClick={() => setSortBy('best')}>
            <div className="sort-option-content">
              <div className="sort-option-title">Best</div>
              <div className="sort-option-description">
                We look at the price, travel time, number of stops, and baggage allowance to determine which options you might like best.
              </div>
            </div>
            <div className={`radio-button ${sortBy === 'best' ? 'active' : ''}`}>
              {sortBy === 'best' && <div className="radio-dot"></div>}
            </div>
          </div>
          
          <div className="sort-option" onClick={() => setSortBy('cheapest')}>
            <div className="sort-option-content">
              <div className="sort-option-title">Cheapest</div>
            </div>
            <div className={`radio-button ${sortBy === 'cheapest' ? 'active' : ''}`}>
              {sortBy === 'cheapest' && <div className="radio-dot"></div>}
            </div>
          </div>
          
          <div className="sort-option" onClick={() => setSortBy('fastest')}>
            <div className="sort-option-content">
              <div className="sort-option-title">Fastest</div>
            </div>
            <div className={`radio-button ${sortBy === 'fastest' ? 'active' : ''}`}>
              {sortBy === 'fastest' && <div className="radio-dot"></div>}
            </div>
          </div>
        </div>
        
        <button className="done-button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};

// Beautiful Loading Animation Component
const FlightLoadingAnimation: React.FC = () => {
  const [progress, setProgress] = React.useState(0);
  const [loadingText, setLoadingText] = React.useState('Searching for flights...');

  React.useEffect(() => {
    // Smooth progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // Stop at 95% until real data loads
        return prev + Math.random() * 8;
      });
    }, 300);

    // Change loading text with many more stages
    const textTimer1 = setTimeout(() => setLoadingText('Connecting to airlines...'), 1000);
    const textTimer2 = setTimeout(() => setLoadingText('Checking seat availability...'), 2000);
    const textTimer3 = setTimeout(() => setLoadingText('Searching 500+ routes...'), 3000);
    const textTimer4 = setTimeout(() => setLoadingText('Comparing prices...'), 4000);
    const textTimer5 = setTimeout(() => setLoadingText('Analyzing flight times...'), 5000);
    const textTimer6 = setTimeout(() => setLoadingText('Checking baggage options...'), 6000);
    const textTimer7 = setTimeout(() => setLoadingText('Finding best connections...'), 7000);
    const textTimer8 = setTimeout(() => setLoadingText('Calculating total costs...'), 8000);
    const textTimer9 = setTimeout(() => setLoadingText('Verifying schedules...'), 9000);
    const textTimer10 = setTimeout(() => setLoadingText('Finding best deals...'), 10000);
    const textTimer11 = setTimeout(() => setLoadingText('Sorting results...'), 11000);
    const textTimer12 = setTimeout(() => setLoadingText('Preparing your flights...'), 12000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(textTimer1);
      clearTimeout(textTimer2);
      clearTimeout(textTimer3);
      clearTimeout(textTimer4);
      clearTimeout(textTimer5);
      clearTimeout(textTimer6);
      clearTimeout(textTimer7);
      clearTimeout(textTimer8);
      clearTimeout(textTimer9);
      clearTimeout(textTimer10);
      clearTimeout(textTimer11);
      clearTimeout(textTimer12);
    };
  }, []);

  return (
    <div className="loading-animation-container">
      <div className="plane-animation">
        <svg className="plane-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
        <div className="plane-trail"></div>
      </div>
      
      <p className="loading-text">{loadingText}</p>
      
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
      
      <div className="loading-dots">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
    </div>
  );
};

const FlightResults: React.FC<FlightResultsProps> = ({ onBack }) => {
  
  const [searchParams] = useSearchParams();
  
  // УЛУЧШЕННАЯ ПРОВЕРКА: если возвращаемся с карточки - используем кэш
  const getInitialState = () => {
    const force = sessionStorage.getItem('flightResults_force_refresh') === '1';
    const back = sessionStorage.getItem('flightResults_back') === '1';
    const freeze = sessionStorage.getItem('flightResults_freeze') === '1';
    console.log('getInitialState: back =', back, 'freeze =', freeze);
    
    // Если есть флаг возврата или заморозки - пытаемся восстановить из кэша
    if (back || freeze) {
      try {
        // Сначала пробуем снапшот
        const snapRaw = sessionStorage.getItem('flightResults_snapshot');
        const snap = snapRaw ? JSON.parse(snapRaw) : null;
        
        // Проверяем соответствие ключа
        const params = new URLSearchParams(window.location.search);
        params.delete('page');
        const entries = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const stable = new URLSearchParams(entries).toString();
        const key = `flightResults:${stable}`;
        
        console.log('getInitialState: snap key =', snap?.key, 'current key =', key);
        
        if (snap && snap.key === key && Array.isArray(snap.flights) && snap.flights.length > 0) {
          console.log('getInitialState: Используем снапшот с', snap.flights.length, 'рейсами');
          return {
            flights: dedupeByToken(snap.flights as any) as FlightOffer[],
            totalCount: snap.totalCount || snap.flights.length || 0,
            pageNo: snap.pageNo || 1,
            loading: false,
            isBackFromCard: true
          };
        }
        
        // Если снапшот не подошел, пробуем общий кэш
        const cacheKey = key;
        const cached = getCache(cacheKey, 30 * 60 * 1000); // 30 минут TTL
        if (cached && Array.isArray(cached.flights) && cached.flights.length > 0) {
          console.log('getInitialState: Используем кэш с', cached.flights.length, 'рейсами');
          return {
            flights: dedupeByToken(cached.flights as any) as FlightOffer[],
            totalCount: cached.totalCount || cached.flights.length || 0,
            pageNo: cached.pageNo || 1,
            loading: false,
            isBackFromCard: true
          };
        }

        // Если ни снапшот ни кэш по ключу не подошли — используем последний успешный снапшот вне зависимости от ключа
        const lastRaw = sessionStorage.getItem('flightResults_last');
        const last = lastRaw ? JSON.parse(lastRaw) : null;
        if (last && Array.isArray(last.flights) && last.flights.length > 0) {
          console.log('getInitialState: Используем последний снапшот (fallback) с', last.flights.length, 'рейсами');
          return {
            flights: dedupeByToken(last.flights as any) as FlightOffer[],
            totalCount: last.totalCount || last.flights.length || 0,
            pageNo: last.pageNo || 1,
            loading: false,
            isBackFromCard: true
          };
        }
      } catch (e) {
        console.error('getInitialState: Ошибка при восстановлении из кэша:', e);
      }
      
      // Если ничего не найдено — оставляем флаги как есть, чтобы эффект на маунте мог их учесть
    }
    
    // Без флагов: если НЕ force и текущий URL совпадает с последним успешным — используем last snapshot и НЕ перезапрашиваем
    if (!force) {
      try {
        const params = new URLSearchParams(window.location.search);
        params.delete('page');
        const entries = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const stable = new URLSearchParams(entries).toString();
        const lastUrl = sessionStorage.getItem('flightResults_last_url') || '';
        if (stable && lastUrl && stable === lastUrl) {
          const lastRaw = sessionStorage.getItem('flightResults_last');
          const last = lastRaw ? JSON.parse(lastRaw) : null;
        if (last && Array.isArray(last.flights) && last.flights.length > 0) {
            console.log('getInitialState: URL совпадает с последним — используем last snapshot без запроса');
            return {
            flights: dedupeByToken(last.flights as any) as FlightOffer[],
              totalCount: last.totalCount || last.flights.length || 0,
              pageNo: last.pageNo || 1,
              loading: false,
              isBackFromCard: true
            };
          }
        }
      } catch {}
    }
    
    // Без флагов: мягкое восстановление — если есть свежий снапшот и нет явного принудительного обновления
    try {
      const force = sessionStorage.getItem('flightResults_force_refresh') === '1';
      if (!force) {
        const snapRaw = sessionStorage.getItem('flightResults_snapshot');
        const snap = snapRaw ? JSON.parse(snapRaw) : null;
        if (snap && Array.isArray(snap.flights) && snap.flights.length > 0) {
          console.log('getInitialState: используем имеющийся снапшот без запроса (мягкое восстановление)');
          return {
            flights: snap.flights as FlightOffer[],
            totalCount: snap.totalCount || snap.flights.length || 0,
            pageNo: snap.pageNo || 1,
            loading: false,
            isBackFromCard: true
          };
        }
        const lastRaw = sessionStorage.getItem('flightResults_last');
        const last = lastRaw ? JSON.parse(lastRaw) : null;
        if (last && Array.isArray(last.flights) && last.flights.length > 0) {
          console.log('getInitialState: используем последний успешный снапшот без запроса (мягкое восстановление)');
          return {
            flights: last.flights as FlightOffer[],
            totalCount: last.totalCount || last.flights.length || 0,
            pageNo: last.pageNo || 1,
            loading: false,
            isBackFromCard: true
          };
        }
      }
    } catch {}

    console.log('getInitialState: Инициализация пустым состоянием');
    return {
      flights: [] as FlightOffer[],
      totalCount: 0,
      pageNo: 1,
      loading: true,
      isBackFromCard: false
    };
  };
  
  const initialState = getInitialState();
  
  const [geniusBenefit, setGeniusBenefit] = React.useState(false);
  const [sortBy, setSortBy] = React.useState('best');
  const [showSortModal, setShowSortModal] = React.useState(false);
  const [showStopsModal, setShowStopsModal] = React.useState(false);
  const [showDurationModal, setShowDurationModal] = React.useState(false);
  const [showTimesModal, setShowTimesModal] = React.useState(false);

  const [flights, setFlights] = React.useState<FlightOffer[]>(initialState.flights);
  const [pageNo, setPageNo] = React.useState(initialState.pageNo);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [loading, setLoading] = React.useState(initialState.loading);
  const [totalCount, setTotalCount] = React.useState(initialState.totalCount);
  const [isBackFromCard] = React.useState(initialState.isBackFromCard);
  const standardPageSize = 20;
  const [hasMorePages, setHasMorePages] = React.useState(
    initialState.flights.length >= 15 && initialState.flights.length < initialState.totalCount
  );

  // Client-side filters
  const [stopsFilter, setStopsFilter] = React.useState<'any' | '0' | '1' | '2+'>('any');
  const [maxDurationMins, setMaxDurationMins] = React.useState<number | null>(null);
  const [depWindows, setDepWindows] = React.useState<string[]>([]); // ['00-06','06-12','12-18','18-24']
  const [arrWindows, setArrWindows] = React.useState<string[]>([]);

  // temp values inside modals; commit on Apply
  const [tmpStops, setTmpStops] = React.useState<'any' | '0' | '1' | '2+'>('any');
  const [tmpDuration, setTmpDuration] = React.useState<number>(1800);
  const [tmpDepWins, setTmpDepWins] = React.useState<string[]>([]);
  const [tmpArrWins, setTmpArrWins] = React.useState<string[]>([]);
  
  const buildCacheKey = (): string => {
    const params = new URLSearchParams(window.location.search);
    // ключ без page и со стабильной сортировкой параметров
    params.delete('page');
    const entries = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const stable = new URLSearchParams(entries).toString();
    return `flightResults:${stable}`;
  };

  // removed duplicate dedupeByToken; using top-level function

  // Пытаемся мгновенно восстановить список из снапшота по текущему URL-ключу
  const restoreFromSnapshot = React.useCallback((): boolean => {
    try {
      // Если установлен принудительный флаг обновления — не восстанавливаем и даём эффекту сделать запрос
      if (sessionStorage.getItem('flightResults_force_refresh') === '1') return false;
      const params = new URLSearchParams(window.location.search);
      params.delete('page');
      const entries = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const stable = new URLSearchParams(entries).toString();
      const key = `flightResults:${stable}`;
      let snap: any = null;
      try {
        snap = JSON.parse(sessionStorage.getItem('flightResults_snapshot') || 'null');
      } catch {}
      if (!snap) {
        try { snap = JSON.parse(localStorage.getItem('flightResults_snapshot') || 'null'); } catch {}
      }
      if (snap && snap.key === key && Array.isArray(snap.flights) && snap.flights.length > 0) {
        const flightsArray = snap.flights as FlightOffer[];
        const total = snap.totalCount || snap.flights.length || 0;
        setFlights(flightsArray);
        setTotalCount(total);
        setPageNo(snap.pageNo || 1);
        setHasMorePages(flightsArray.length >= 15 && flightsArray.length < total);
        setLoading(false);
        return true;
      }
      const lastUrl = sessionStorage.getItem('flightResults_last_url') || localStorage.getItem('flightResults_last_url') || '';
      if (stable && lastUrl && stable === lastUrl) {
        let last: any = null;
        try { last = JSON.parse(sessionStorage.getItem('flightResults_last') || 'null'); } catch {}
        if (!last) { try { last = JSON.parse(localStorage.getItem('flightResults_last') || 'null'); } catch {} }
        if (last && Array.isArray(last.flights) && last.flights.length > 0) {
          const flightsArray = last.flights as FlightOffer[];
          const total = last.totalCount || last.flights.length || 0;
          setFlights(flightsArray);
          setTotalCount(total);
          setPageNo(last.pageNo || 1);
          setHasMorePages(flightsArray.length >= 15 && flightsArray.length < total);
          setLoading(false);
          return true;
        }
      }
    } catch {}
    return false;
  }, [searchParams]);

  // Загрузка данных при монтировании компонента - ТОЛЬКО если НЕ возвращаемся с карточки
  React.useEffect(() => {
    console.log('useEffect запущен');
    
    // КРИТИЧЕСКИ ВАЖНО: ВСЕГДА проверяем флаги первым делом (не зависим от isBackFromCard)
    const force = sessionStorage.getItem('flightResults_force_refresh') === '1';
    const back = sessionStorage.getItem('flightResults_back') === '1';
    const freeze = sessionStorage.getItem('flightResults_freeze') === '1';
    const noFetch = sessionStorage.getItem('flightResults_no_fetch') === '1';
    
    console.log('Флаги: force =', force, 'back =', back, 'freeze =', freeze, 'noFetch =', noFetch);
    
    // Если есть ЛЮБОЙ флаг возврата/заморозки - восстанавливаем из кэша без запроса
    if (!force && (back || freeze || noFetch || isBackFromCard)) {
      console.log('СТОП! Возврат с карточки - восстанавливаем из кэша');
      restoreFromSnapshot();
      // Очищаем все флаги после использования
      sessionStorage.removeItem('flightResults_back');
      sessionStorage.removeItem('flightResults_freeze');
      sessionStorage.removeItem('flightResults_no_fetch');
      setLoading(false);
      return;
    }
    
    console.log('Начинаем загрузку рейсов...');
    
    const loadFlights = async () => {
      console.log('loadFlights: начало функции');
      
      // Получаем параметры из URL
      const fromRaw = searchParams.get('from');
      const toRaw = searchParams.get('to');
      
      console.log('loadFlights: from =', fromRaw, 'to =', toRaw);
      
      // Если нет параметров поиска, не делаем запрос
      if (!fromRaw || !toRaw) {
        console.log('loadFlights: нет параметров поиска');
        setLoading(false);
        return;
      }
      
      console.log('loadFlights: делаем API запрос...');
      
      const departDateParam = searchParams.get('departDate');
      const normalizeDate = (dateStr?: string) => {
        const today = new Date();
        const d = dateStr ? new Date(dateStr) : new Date(today.getTime() + 30 * 86400000);
        if (isNaN(d.getTime()) || d < today) {
          const nd = new Date(today.getTime() + 30 * 86400000);
          return nd.toISOString().slice(0, 10);
        }
        return d.toISOString().slice(0, 10);
      };
      const departDate = normalizeDate(departDateParam || undefined);
      const returnDate = searchParams.get('returnDate') || '';
      const adults = parseInt(searchParams.get('adults') || '1');
      const childrenAges = searchParams.get('children') || '';
      const cabinClass = searchParams.get('cabinClass') || 'ECONOMY';
      const stops = (searchParams.get('stops') || '2') as '0' | '1' | '2';
      const sort = (searchParams.get('sort') || 'BEST') as 'BEST' | 'CHEAPEST' | 'FASTEST';
      const currency = searchParams.get('currency') || 'USD';

      setLoading(true);

      try {
        // Резолвим корректные ID через searchDestination
        const resolveId = async (value: string): Promise<string> => {
          if (value.includes('.')) return value; // уже валидный id
          const results = await searchAirports(value);
          const airport = results.find(r => r.type === 'AIRPORT');
          return (airport?.id) || (results[0]?.id) || value;
        };

        const from = await resolveId(fromRaw);
        const to = await resolveId(toRaw);

        console.log('loadFlights: вызываем searchFlights API');
        const resp = await searchFlights(
          from,
          to,
          departDate,
          returnDate || undefined,
          adults,
          childrenAges,
          cabinClass,
          stops,
          sort,
          currency,
          1
        );

        const apiData = resp?.data;
        const apiFlights = apiData?.flightOffers || [];
        console.log('loadFlights: получили', apiFlights.length, 'рейсов');
        console.log('loadFlights: первый рейс имеет', apiFlights[0]?.segments?.length || 0, 'сегментов');
        if (apiFlights[0]?.segments) {
          console.log('loadFlights: сегменты:', apiFlights[0].segments.map((s:any, i:number) => 
            `${i+1}: ${s?.departureAirport?.code} → ${s?.arrivalAirport?.code}`
          ));
        }
        const deduped = dedupeByToken(apiFlights as unknown as FlightOffer[]);
        setFlights(deduped);
        const totalFromAPI = apiData?.aggregation?.totalCount || apiFlights.length;
        setTotalCount(totalFromAPI);
        setPageNo(1);
        // Есть еще страницы если получили достаточно результатов (>=15) И их меньше чем общий счет
        setHasMorePages(deduped.length >= 15 && deduped.length < totalFromAPI);
        // Сохраняем в кэш (TTL применяется на чтении)
        try {
          const cacheKey = buildCacheKey();
          setCache(cacheKey, { flights: apiFlights, totalCount: apiData?.aggregation?.totalCount || apiFlights.length, pageNo: 1 });
          const lite = { key: cacheKey, flights: buildLiteFlights(apiFlights), totalCount: apiData?.aggregation?.totalCount || apiFlights.length, pageNo: 1 };
          safeSessionSet('flightResults_snapshot', JSON.stringify(lite));
          // фиксируем текущие параметры как "последние показанные"
          const p = new URLSearchParams(window.location.search); p.delete('page');
          const es = Array.from(p.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
          safeSessionSet('flightResults_last_url', new URLSearchParams(es).toString());
        } catch {}
      } catch (error) {
        // При ошибке показываем пустой список
        setFlights([]);
        setTotalCount(0);
        console.error('Ошибка загрузки рейсов:', error);
      }

      setLoading(false);
      // Сброс однократного флага принудительного обновления
      try { sessionStorage.removeItem('flightResults_force_refresh'); } catch {}
    };

    // Если есть валидный снапшот по текущему URL — используем его и пропускаем запрос
    if (!force && restoreFromSnapshot()) return;
    loadFlights();
  }, [searchParams, isBackFromCard, restoreFromSnapshot]);

  // После первой отрисовки, если данные уже есть (из снапшота или кэша), зафиксируем снапшот для последующих возвратов
  React.useEffect(() => {
    try {
      if (flights && flights.length > 0) {
        const cacheKey = buildCacheKey();
        const snapshot = { key: cacheKey, flights, totalCount, pageNo };
        
        // Сохраняем снапшот для быстрого восстановления (lite-версия + safe set) + дублируем в localStorage
        const lite = { ...snapshot, flights: buildLiteFlights(flights as any) };
        safeSessionSet('flightResults_snapshot', JSON.stringify(lite));
        safeSessionSet('flightResults_last', JSON.stringify(lite));
        try { localStorage.setItem('flightResults_snapshot', JSON.stringify(lite)); } catch {}
        try { localStorage.setItem('flightResults_last', JSON.stringify(lite)); } catch {}
        
        // Сохраняем в кэш с TTL
        setCache(cacheKey, { flights, totalCount, pageNo });
        
        // Сохраняем URL для проверки соответствия
        const p = new URLSearchParams(window.location.search); 
        p.delete('page');
        const es = Array.from(p.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
        const stable = new URLSearchParams(es).toString();
        safeSessionSet('flightResults_last_url', stable);
        try { localStorage.setItem('flightResults_last_url', stable); } catch {}
        
        console.log('Сохранен снапшот с', flights.length, 'рейсами для ключа:', cacheKey);
      }
    } catch (e) {
      console.error('Ошибка при сохранении снапшота:', e);
    }
    // выполняется при изменении списка
  }, [flights, totalCount, pageNo]);


  const loadMore = async () => {
    const fromRaw = searchParams.get('from');
    const toRaw = searchParams.get('to');
    
    // Если нет параметров поиска, не загружаем больше
    if (!fromRaw || !toRaw) {
      return;
    }
    
    // Используем нормализацию даты как в основном запросе
    const departDateParam = searchParams.get('departDate');
    const normalizeDate = (dateStr?: string) => {
      const today = new Date();
      const d = dateStr ? new Date(dateStr) : new Date(today.getTime() + 30 * 86400000);
      if (isNaN(d.getTime()) || d < today) {
        const nd = new Date(today.getTime() + 30 * 86400000);
        return nd.toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    };
    const departDate = normalizeDate(departDateParam || undefined);
    
    const returnDate = searchParams.get('returnDate') || '';
    const adults = parseInt(searchParams.get('adults') || '1');
    const childrenAges = searchParams.get('children') || '';
    const cabinClass = searchParams.get('cabinClass') || 'ECONOMY';
    const stops = (searchParams.get('stops') || '2') as '0' | '1' | '2';
    const sort = (searchParams.get('sort') || 'BEST') as 'BEST' | 'CHEAPEST' | 'FASTEST';
    const currency = searchParams.get('currency') || 'USD';

    setIsLoadingMore(true);
    try {
          const resolveId = async (value: string): Promise<string> => {
        if (value.includes('.')) return value;
        const results = await searchAirports(value);
        const airport = results.find(r => r.type === 'AIRPORT');
        return (airport?.id) || (results[0]?.id) || value;
      };

      const from = await resolveId(fromRaw);
      const to = await resolveId(toRaw);

      const nextPage = pageNo + 1;
      const resp = await searchFlights(
        from,
        to,
        departDate, // Используем оригинальную дату вылета из поисковых параметров
        returnDate || undefined,
        adults,
        childrenAges,
        cabinClass,
        stops,
        sort,
        currency,
        nextPage
      );

      const apiFlights = (resp?.data?.flightOffers || []) as unknown as FlightOffer[];
      
      setFlights(prev => {
        const combined = dedupeByToken([...prev, ...apiFlights]);
        
        // Проверяем есть ли еще страницы: если получили полную страницу И не достигли totalCount
        setHasMorePages(apiFlights.length >= 10 && combined.length < totalCount);
        
        // Обновляем кэш
        try {
          const cacheKey = buildCacheKey();
          setCache(cacheKey, { flights: combined, totalCount, pageNo: nextPage });
          const lite = { key: cacheKey, flights: buildLiteFlights(combined as any), totalCount, pageNo: nextPage };
          safeSessionSet('flightResults_snapshot', JSON.stringify(lite));
        } catch {}
        return combined;
      });
      setPageNo(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Helpers for client-side filtering/sorting
  const getStopsCountForOffer = React.useCallback((offer: FlightOffer): number => {
    try {
      return offer.segments.reduce((total, segment) => {
        const legs = segment.legs || [];
        const explicitStops = legs.reduce((acc, l) => acc + (l.flightStops ? l.flightStops.length : 0), 0);
        const structural = Math.max(0, legs.length - 1);
        return total + (explicitStops > 0 ? explicitStops : structural);
      }, 0);
    } catch { return 0; }
  }, []);

  const getTotalDurationMins = React.useCallback((offer: FlightOffer): number => {
    const sec = offer.segments.reduce((acc, s) => acc + (s.totalTime || 0), 0);
    return Math.round(sec / 60);
  }, []);

  const getHour = (iso?: string) => {
    if (!iso) return -1;
    const d = new Date(iso);
    return d.getHours();
  };

  const inWindow = (hour: number, windowKey: string): boolean => {
    if (hour < 0) return false;
    const map: Record<string, [number, number]> = {
      '00-06': [0, 6],
      '06-12': [6, 12],
      '12-18': [12, 18],
      '18-24': [18, 24]
    };
    const [start, end] = map[windowKey] || [0, 24];
    return hour >= start && hour < end;
  };

  // Derived visible list
  const visibleFlights = React.useMemo(() => {
    let list = flights.slice();

    // Stops filter
    if (stopsFilter !== 'any') {
      list = list.filter(f => {
        const c = getStopsCountForOffer(f);
        if (stopsFilter === '0') return c === 0;
        if (stopsFilter === '1') return c === 1;
        return c >= 2;
      });
    }

    // Duration filter
    if (typeof maxDurationMins === 'number') {
      list = list.filter(f => getTotalDurationMins(f) <= maxDurationMins);
    }

    // Flight times filter (departure/arrival windows)
    if (depWindows.length > 0) {
      list = list.filter(f => {
        const first = f.segments?.[0];
        const h = getHour(first?.departureTime);
        return depWindows.some(w => inWindow(h, w));
      });
    }
    if (arrWindows.length > 0) {
      list = list.filter(f => {
        const last = f.segments?.[f.segments.length - 1];
        const h = getHour(last?.arrivalTime);
        return arrWindows.some(w => inWindow(h, w));
      });
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'cheapest') {
        const ap = (a.priceBreakdown.total.units || 0) + (a.priceBreakdown.total.nanos || 0) / 1_000_000_000;
        const bp = (b.priceBreakdown.total.units || 0) + (b.priceBreakdown.total.nanos || 0) / 1_000_000_000;
        return ap - bp;
      }
      if (sortBy === 'fastest') {
        return getTotalDurationMins(a) - getTotalDurationMins(b);
      }
      // best: simple heuristic: price rank + duration rank + stops rank
      const ap = (a.priceBreakdown.total.units || 0) + (a.priceBreakdown.total.nanos || 0) / 1_000_000_000;
      const bp = (b.priceBreakdown.total.units || 0) + (b.priceBreakdown.total.nanos || 0) / 1_000_000_000;
      const ad = getTotalDurationMins(a);
      const bd = getTotalDurationMins(b);
      const as = getStopsCountForOffer(a);
      const bs = getStopsCountForOffer(b);
      const aScore = ap * 0.6 + ad * 0.3 + as * 30;
      const bScore = bp * 0.6 + bd * 0.3 + bs * 30;
      return aScore - bScore;
    });

    return list;
  }, [flights, stopsFilter, maxDurationMins, depWindows, arrWindows, sortBy, getStopsCountForOffer, getTotalDurationMins]);

  const filteredCount = visibleFlights.length;

  if (loading) {
    return (
      <div className="flight-results">
        <FlightLoadingAnimation />
      </div>
    );
  }


  return (
    <div className="flight-results">
      {/* Header */}
      <div className="results-header">
        <div className="search-info" onClick={() => onBack()}>
          <div className="route">
            {(() => {
              const from = searchParams.get('from');
              const to = searchParams.get('to');
              if (!from || !to) return 'Flight Search';
              return `${from.split('.')[0]} → ${to.split('.')[0]}`;
            })()}
          </div>
          <div className="details">
            {(() => {
              const depart = searchParams.get('departDate') || '';
              const ret = searchParams.get('returnDate') || '';
              const adults = Math.max(1, parseInt(searchParams.get('adults') || '1'));
              const childrenAges = (searchParams.get('children') || '').trim();
              const childrenCount = childrenAges ? childrenAges.split(',').filter(Boolean).length : 0;
              const cabinParam = ((searchParams.get('cabinClass') || 'ECONOMY')).toUpperCase();
              const cabinLabel = ({
                ECONOMY: 'Economy',
                PREMIUM_ECONOMY: 'Premium economy',
                BUSINESS: 'Business',
                FIRST: 'First'
              } as Record<string, string>)[cabinParam] || 'Economy';
              const currency = (searchParams.get('currency') || '').toUpperCase();
              const stopsParam = (searchParams.get('stops') || '2');
              const stopsLabel = stopsParam === '0' ? ' · Non-stop' : (stopsParam === '1' ? ' · Up to 1 stop' : '');
              const dateStr = depart + (ret ? ` · Return ${ret}` : '');
              const pax = ` · ${adults} adult${adults>1?'s':''}` + (childrenCount>0?` · ${childrenCount} child${childrenCount>1?'ren':''}`:'');
              const cabin = ` · ${cabinLabel}`;
              const curr = currency ? ` · ${currency}` : '';
              return `${dateStr}${pax}${cabin}${curr}${stopsLabel}`;
            })()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-chips">
          <button className="filter-chip" onClick={() => setShowSortModal(true)}>
            Sort by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} <FilterIcon />
          </button>
          <button className="filter-chip" onClick={() => { setTmpStops(stopsFilter); setShowStopsModal(true); }}>
            Stops{stopsFilter!=='any'?` · ${stopsFilter==='0'?'Non‑stop':(stopsFilter==='1'?'1 stop':'2+ stops')}`:''} <FilterIcon />
          </button>
          <button className="filter-chip" onClick={() => { setTmpDuration(typeof maxDurationMins==='number'? maxDurationMins : 1800); setShowDurationModal(true); }}>
            Duration{typeof maxDurationMins==='number'?` · ≤ ${formatDuration(maxDurationMins)}`:''} <FilterIcon />
          </button>
          <button className="filter-chip" onClick={() => { setTmpDepWins(depWindows); setTmpArrWins(arrWindows); setShowTimesModal(true); }}>
            Flight times{(depWindows.length||arrWindows.length)?' · set':''} <FilterIcon />
          </button>
        </div>
      </div>

      {/* Genius Benefit */}
      <div className="genius-benefit">
        <div className="genius-content">
          <GeniusIcon />
          <div className="genius-text">
            <span className="genius-title">Genius benefit</span>
            <span className="genius-subtitle">Get price alerts on your device</span>
          </div>
        </div>
        <ToggleSwitch checked={geniusBenefit} onChange={setGeniusBenefit} />
      </div>

      {/* Results Count */}
      <div className="results-count">
        {!hasMorePages 
          ? `${filteredCount} flight${filteredCount !== 1 ? 's' : ''}` 
          : `${filteredCount} of ${totalCount} flights`
        }
      </div>

      {/* Flight Cards */}
      <div className="flight-list">
        {visibleFlights.length > 0 ? (
          visibleFlights.map((flight) => (
            <RealFlightCard key={flight.token} flight={flight} />
          ))
        ) : (
          <div className="no-flights">No flights found</div>
        )}
      </div>

      {/* Show more button */}
      {hasMorePages && flights.length < totalCount && (
        <div style={{ padding: '16px' }}>
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            style={{
              width: '100%',
              padding: '12px',
              background: '#0071c2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: isLoadingMore ? 0.6 : 1
            }}
          >
            {isLoadingMore ? 'Loading…' : 'Show more'}
          </button>
        </div>
      )}

      {/* Sort Modal */}
      <SortModal 
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Stops Modal */}
      {showStopsModal && (
        <div className="modal-overlay" onClick={() => setShowStopsModal(false)}>
          <div className="travellers-modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h3>Stops</h3></div>
            <div className="radio-list">
              {([
                {k:'any',label:'Any'},
                {k:'0',label:'Non‑stop'},
                {k:'1',label:'1 stop'},
                {k:'2+',label:'2+ stops'}
              ] as const).map(opt => (
                <div key={opt.k} className="radio-item" onClick={()=>setTmpStops(opt.k as any)}>
                  <span style={{ color: 'white' }}>{opt.label}</span>
                  <span className={`radio-dot ${tmpStops===opt.k? 'active':''}`}></span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={()=>{ setTmpStops('any'); }}>Clear</button>
              <button className="done-button" onClick={()=>{ setStopsFilter(tmpStops); setShowStopsModal(false); }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Duration Modal */}
      {showDurationModal && (
        <div className="modal-overlay" onClick={() => setShowDurationModal(false)}>
          <div className="travellers-modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h3>Max duration</h3></div>
            <div style={{ color:'#ccc', marginBottom:8 }}>Limit total journey time</div>
            <input type="range" min={60} max={1800} step={30} value={typeof tmpDuration==='number' ? tmpDuration : 1800} onChange={(e)=>setTmpDuration(Number(e.target.value))} style={{ width:'100%'}} />
            <div style={{ color:'#fff', marginTop:8 }}>{tmpDuration ? formatDuration(tmpDuration) : 'No limit'}</div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={()=>{ setTmpDuration(1800); }}>Clear</button>
              <button className="done-button" onClick={()=>{ setMaxDurationMins(tmpDuration === 1800 ? null : tmpDuration); setShowDurationModal(false); }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Flight times Modal */}
      {showTimesModal && (
        <div className="modal-overlay" onClick={() => setShowTimesModal(false)}>
          <div className="travellers-modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header"><h3>Flight times</h3></div>
            <div style={{ color:'#ccc', marginBottom:6 }}>Departure</div>
            <div className="chips-row" style={{ marginBottom:12 }}>
              {['00-06','06-12','12-18','18-24'].map(win => (
                <button key={win} className={`chip ${tmpDepWins.includes(win)?'active':''}`} onClick={()=> setTmpDepWins(prev => prev.includes(win)? prev.filter(x=>x!==win) : [...prev, win])}>{win}</button>
              ))}
            </div>
            <div style={{ color:'#ccc', marginBottom:6 }}>Arrival</div>
            <div className="chips-row" style={{ marginBottom:12 }}>
              {['00-06','06-12','12-18','18-24'].map(win => (
                <button key={win} className={`chip ${tmpArrWins.includes(win)?'active':''}`} onClick={()=> setTmpArrWins(prev => prev.includes(win)? prev.filter(x=>x!==win) : [...prev, win])}>{win}</button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={()=>{ setTmpDepWins([]); setTmpArrWins([]); }}>Clear</button>
              <button className="done-button" onClick={()=>{ setDepWindows(tmpDepWins); setArrWindows(tmpArrWins); setShowTimesModal(false); }}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightResults;
