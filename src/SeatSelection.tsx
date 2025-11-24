import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// Seat map will be fetched only on the SeatMap page to reduce API calls
import './Luggage.css';
import { calculateTotalSeatPrice } from './utils/aircraft';
// getSeatMap is intentionally NOT imported here to avoid prefetching before user clicks "Select seats"

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
);

const SeatSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const currency: string = (location?.state?.currency || 'USD').toUpperCase();
  const travellers: number = Number(location?.state?.travellers || 1);
  const totalPerTraveller: number = Number(location?.state?.totalPerTraveller || 0);

  const [loading, setLoading] = React.useState(true);
  const [offerId, setOfferId] = React.useState<string>('');
  React.useEffect(() => {
    const readId = () => {
      // 1) Пробуем взять offerId из state (надёжнее при прямой навигации)
      const stateOfferId = (location as any)?.state?.offerId || (location as any)?.state?.flightSummary?.token || '';
      if (stateOfferId) {
        try { sessionStorage.setItem('current_offer_id', stateOfferId); } catch {}
        try { localStorage.setItem('current_offer_id', stateOfferId); } catch {}
        if (stateOfferId !== offerId) setOfferId(stateOfferId);
        return;
      }
      // 2) Иначе — из sessionStorage / localStorage
      let id = sessionStorage.getItem('current_offer_id') || '';
      if (!id) {
        try { id = localStorage.getItem('current_offer_id') || ''; } catch {}
        if (id) try { sessionStorage.setItem('current_offer_id', id); } catch {}
      }
      if (id && id !== offerId) setOfferId(id);
    };
    readId();
    // Re-check shortly after mount to catch RouteGuard write
    const t = setTimeout(readId, 0);
    return () => clearTimeout(t);
  }, [offerId, location?.state]);
  const [flight, setFlight] = React.useState<any>(null);
  const [segmentSeats, setSegmentSeats] = React.useState<Record<number, { seats: string[]; total: number }>>({});
  const [segmentMinPrices, setSegmentMinPrices] = React.useState<Record<number, {units:number;nanos:number;currency:string}|null>>({});
  const [eligibility, setEligibility] = React.useState<{eligible:boolean; reason?: string}>({ eligible: true });

  // Если принесли summary через state — используем сразу и кладём в storage
  React.useEffect(() => {
    const summary = (location as any)?.state?.flightSummary;
    if (summary && Array.isArray(summary?.segments) && summary.segments.length > 0) {
      setFlight(summary);
      try {
        sessionStorage.setItem('selectedFlightOffer', JSON.stringify(summary));
        if (summary?.token) sessionStorage.setItem(`selectedFlightOffer:${summary.token}`, JSON.stringify(summary));
      } catch {}
      setLoading(false);
    }
  }, [location?.state]);

  // Проверка правил доступности выбора мест
  React.useEffect(() => {
    try {
      // Источник: flow_pax из session/local, затем — из summary/flight
      let pax: any = null;
      const raw = sessionStorage.getItem('flow_pax') || localStorage.getItem('flow_pax') || '';
      if (raw) pax = JSON.parse(raw);
      if (!pax) {
        const adultsFromState = Number((location as any)?.state?.travellers || travellers || 1);
        const segsLen = Array.isArray((location as any)?.state?.flightSummary?.segments) ? (location as any).state.flightSummary.segments.length : (Array.isArray(flight?.segments) ? flight.segments.length : 0);
        pax = { adults: adultsFromState, childrenAges: [], segments: segsLen };
      }
      const adultsNum = Number(pax?.adults || 1);
      const childrenCount = Array.isArray(pax?.childrenAges) ? pax.childrenAges.length : 0;
      const segmentsNum = Number(pax?.segments || (Array.isArray(flight?.segments) ? flight.segments.length : 0));
      const ineligible = adultsNum > 1 || childrenCount > 0 || segmentsNum > 3;
      if (ineligible) {
        setEligibility({ eligible: false, reason: 'INELIGIBLE_RULE' });
      } else {
        setEligibility({ eligible: true });
      }
    } catch {
      setEligibility({ eligible: true });
    }
  }, [location?.state, travellers, flight]);

  // Load seat data for each segment
  React.useEffect(() => {
    setLoading(false);
    if (!offerId || !flight?.segments) return;
    
    const segments = flight.segments;
    const newSegmentSeats: Record<number, { seats: string[]; total: number }> = {};
    const newSegmentMinPrices: Record<number, {units:number;nanos:number;currency:string}|null> = {};
    
    segments.forEach((_: any, segIdx: number) => {
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
      
      // Load cached seat map for this segment to get min price
      try {
        // Prefer exact segment key; fallback to base offer (in case API returned all segments in one response)
        const cachedRaw = sessionStorage.getItem(`seatmap_raw_${segmentOfferId}`)
          || sessionStorage.getItem(`seatmap_raw_${offerId}`)
          || localStorage.getItem(`seatmap_raw_${segmentOfferId}`)
          || localStorage.getItem(`seatmap_raw_${offerId}`);
        if (cachedRaw) {
          const resp = JSON.parse(cachedRaw);
          const root = resp?.data || resp;
          let best: { units:number; nanos:number; currency:string } | null = null;
          
          const takePrice = (seat:any) => {
            const pb = seat?.priceBreakdown?.total;
            if (pb && typeof pb.units === 'number') {
              return { units: pb.units, nanos: pb.nanos||0, currency: (pb.currencyCode||currency).toUpperCase() };
            }
            const p = seat?.price || seat?.seatPrice || seat?.pricing || seat?.amount;
            if (p && typeof p.units === 'number') {
              return { units: p.units, nanos: p.nanos||0, currency: (p.currencyCode||currency).toUpperCase() };
            }
            return null;
          };
          
          const consider = (seat:any) => {
            const pr = takePrice(seat);
            if (!pr) return;
            if (!best) best = pr; else {
              const a = best.units + (best.nanos||0)/1e9;
              const b = pr.units + (pr.nanos||0)/1e9;
              if (b < a) best = pr;
            }
          };
          
          // Try to pick cabins of correct segment index if present
          const pickCabinsForSegment = (rootAny: any, segmentIndex: number) => {
            const opts = rootAny?.seatMap?.seatMapOption || rootAny?.seatMapOption;
            if (Array.isArray(opts) && opts.length) {
              const bySeg = opts.find((o:any) => Number(o?.segmentIndex) === segmentIndex);
              if (bySeg?.cabins) return bySeg.cabins;
              if (opts[segmentIndex]?.cabins) return opts[segmentIndex].cabins;
            }
            const mapsArr = rootAny?.seatMaps || rootAny?.seatMap;
            if (Array.isArray(mapsArr) && mapsArr.length) {
              if (mapsArr[segmentIndex]?.cabins) return mapsArr[segmentIndex].cabins;
              if (mapsArr[0]?.cabins) return mapsArr[0].cabins;
            }
            if (Array.isArray(rootAny?.cabins)) return rootAny.cabins;
            if (Array.isArray(rootAny?.seatMap?.cabins)) return rootAny.seatMap.cabins;
            return [];
          };

          const cabins = pickCabinsForSegment(root, segIdx);
            
          if (Array.isArray(cabins) && cabins.length) {
            cabins.forEach((c:any) => {
              if (Array.isArray(c?.rows)) {
                c.rows.forEach((r:any) => Array.isArray(r?.seats) && r.seats.forEach(consider));
              }
              if (Array.isArray(c?.seats)) {
                c.seats.forEach(consider);
              }
            });
          }
          newSegmentMinPrices[segIdx] = best;
        } else {
          newSegmentMinPrices[segIdx] = null;
        }
      } catch {
        newSegmentMinPrices[segIdx] = null;
      }
    });
    
    setSegmentSeats(newSegmentSeats);
    setSegmentMinPrices(newSegmentMinPrices);
  }, [offerId, currency, flight]);

  // Removed prefetch: seat maps should load ONLY after user clicks "Select seats" (navigates to SeatMap)

  // Эффект для синхронизации общей суммы при изменении выбранных мест в других сегментах
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('seat_selection_')) {
        // Принудительно обновляем totalSeatsPrice при изменении выбранных мест
        // Это заставит компонент пересчитать общую сумму
      }
    };

    // Слушаем события storage для синхронизации между вкладками
    window.addEventListener('storage', handleStorageChange);

    // Также проверяем изменения в localStorage каждые 500мс для синхронизации в рамках одной вкладки
    const interval = setInterval(() => {
      try {
        if (offerId) {
          const currentTotal = calculateTotalSeatPrice(offerId, currency);
          // Если сумма изменилась, компонент автоматически обновится благодаря зависимости в useMemo
        }
      } catch (error) {
        console.error('Error checking seat price sync:', error);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [offerId, currency]);

  const fmt = (u:number, n:number, cur:string) => `${cur} ${Math.round(u + (n||0)/1e9).toLocaleString()}`;
  const fmtDur = (mins:number) => {
    const h = Math.floor(mins/60), m = Math.round(mins%60); return `${h}h ${m}m`;
  };
  
  // Используем централизованную функцию для расчета общей суммы за все сегменты
  const totalSeatsPrice = React.useMemo(() => {
    return calculateTotalSeatPrice(offerId, currency);
  }, [offerId, currency]);

  // Слушаем кастомные события мгновенно (без интервала)
  const [seatVersion, setSeatVersion] = React.useState(0);
  const forceRecalc = React.useCallback(() => setSeatVersion(v => v + 1), []);
  React.useEffect(() => {
    const onChanged = () => { forceRecalc(); };
    window.addEventListener('seat-selection-changed', onChanged as any);
    window.addEventListener('storage', onChanged as any);
    document.addEventListener('visibilitychange', onChanged as any);
    return () => {
      window.removeEventListener('seat-selection-changed', onChanged as any);
      window.removeEventListener('storage', onChanged as any);
      document.removeEventListener('visibilitychange', onChanged as any);
    };
  }, []);

  // Привязываем версию к пересчету
  const totalSeatsPriceVersioned = React.useMemo(() => {
    return calculateTotalSeatPrice(offerId, currency);
  }, [offerId, currency, seatVersion]);

  return (
    <div className="luggage-page">
      <div className="luggage-header">
        <button className="back-button" onClick={() => navigate(-1)}><BackIcon/></button>
        <h1>Select seats</h1>
        <div style={{ width: 24 }}></div>
      </div>

      <div style={{ padding: 16 }}>
        
        {!flight && (
          <div style={{ color:'#bbb', marginBottom: 12 }}>No flight data found. Please go back and pick an offer again.</div>
        )}
        {flight && !flight?.segments && (
          <div style={{ color:'#bbb', marginBottom: 12 }}>
            Flight data found but no segments. Flight keys: {Object.keys(flight || {}).join(', ')}
          </div>
        )}
        {flight?.segments && !Array.isArray(flight.segments) && (
          <div style={{ color:'#bbb', marginBottom: 12 }}>
            Flight segments found but not an array. Type: {typeof flight.segments}
          </div>
        )}
        {Array.isArray(flight?.segments) && flight.segments.length === 0 && (
          <div style={{ color:'#bbb', marginBottom: 12 }}>Flight segments array is empty.</div>
        )}
        {!eligibility.eligible && (
          <div style={{ background:'#2f2f2f', border:'1px solid #444', color:'#ffcc66', padding:'10px 12px', borderRadius:8, marginBottom:12 }}>
            Seat selection for this itinerary is temporarily unavailable due to airline policy. For bookings with multiple adult passengers, accompanying children, or itineraries exceeding three flight segments, advance seat assignment is not offered at this stage. You will be able to select seats during online check‑in or at airport check‑in, subject to availability and fare conditions.
          </div>
        )}
        {Array.isArray(flight?.segments) && flight.segments.length > 0 && flight.segments.map((segment: any, segIdx: number) => {
          const from = segment?.departureAirport?.cityName || segment?.departureAirport?.code || '';
          const to = segment?.arrivalAirport?.cityName || segment?.arrivalAirport?.code || '';
          const duration = Math.round((segment?.totalTime || 0) / 60);
          const airline = segment?.legs?.[0]?.carriersData?.[0]?.name || 'Airline';
          const selectedSeats = segmentSeats[segIdx]?.seats || [];
          const minPrice = segmentMinPrices[segIdx];
          
          return (
            <div key={segIdx} style={{ background:'#1f1f1f', border:'1px solid #333', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                {from && to ? `${from} → ${to}` : `Flight ${segIdx + 1}`}
              </div>
              <div style={{ color: '#aaa', fontSize: 14, marginBottom: 8 }}>
                {fmtDur(duration)} · {airline}
              </div>
              <div style={{ color: '#bbb', marginBottom: 12 }}>
                {selectedSeats.length === 0 ? 'No seats selected' : `Selected: ${selectedSeats.join(', ')}`}
              </div>
              <div role="button" 
                   onClick={() => { if (eligibility.eligible) navigate(`/seat-map?seg=${segIdx}&offerId=${encodeURIComponent(offerId)}`, { state: { currency, travellers, totalPerTraveller, segIdx, offerId } }); }}
                   style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', cursor: eligibility.eligible ? 'pointer' : 'not-allowed', opacity: eligibility.eligible ? 1 : 0.6 }}>
                <div style={{ color:'#2997ff', fontWeight: 700 }}>
                  Select seats {minPrice ? `from ${fmt(minPrice.units, minPrice.nanos, minPrice.currency)}` : ''}
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 6l6 6-6 6" stroke="#2997ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      <div className="luggage-footer">
        <div className="price-box">
          <div className="price-label">{`${currency} ${Math.round(totalPerTraveller + totalSeatsPriceVersioned).toLocaleString()}`}</div>
          <div className="price-sub">
            {travellers} traveler{travellers>1?'s':''}
            {totalSeatsPriceVersioned>0 ? ` · +${currency} ${Math.round(totalSeatsPriceVersioned).toLocaleString()} seats` : ''}
          </div>
        </div>
        <button className="next-button" onClick={() => navigate('/payment', { state: { currency, travellers, totalPerTraveller } })}>Next</button>
      </div>
    </div>
  );
};

export default SeatSelection;


