import React from 'react';
import { useNavigate, useSearchParams, useNavigationType } from 'react-router-dom';
import { searchFlightsMultiStops, formatDateTime, formatDuration, formatPrice } from './services/flightApi';
import { getCache, setCache } from './services/cache';
import './FlightResults.css';

const FlightResultsMulti: React.FC = () => {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const [offers, setOffers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const buildCacheKey = React.useCallback(() => {
    const legs = sp.get('legs') || '[]';
    const adults = sp.get('adults') || '1';
    const sort = sp.get('sort') || 'BEST';
    const cabinClass = sp.get('cabinClass') || 'ECONOMY';
    const currency = sp.get('currency') || 'USD';
    return `flightResultsMulti:${legs}:${adults}:${sort}:${cabinClass}:${currency}`;
  }, [sp]);

  React.useEffect(() => {
    const run = async () => {
      const force = sessionStorage.getItem('flightResultsMulti_force_refresh') === '1';
      // Freeze branch: если вернулись с карточки, не делаем запрос, показываем снапшот
      try {
        const freeze = sessionStorage.getItem('flightResultsMulti_freeze') === '1';
        const back = sessionStorage.getItem('flightResults_back') === '1';
        if (freeze || back) {
          const snapRaw = sessionStorage.getItem('flightResultsMulti_snapshot');
          const snap = snapRaw ? JSON.parse(snapRaw) : null;
          const key = buildCacheKey();
          if (!force && snap && snap.key === key && Array.isArray(snap.offers)) {
            setOffers(snap.offers);
            setLoading(false);
            // Очищаем флаги после использования
            sessionStorage.removeItem('flightResultsMulti_freeze');
            sessionStorage.removeItem('flightResults_back');
            sessionStorage.removeItem('flightResults_no_fetch');
            return;
          }
        }
      } catch {}
      // Snapshot first: если вернулись назад, показываем старые результаты без API
      try {
        const snapRaw = sessionStorage.getItem('flightResultsMulti_snapshot');
        const snap = snapRaw ? JSON.parse(snapRaw) : null;
        const key = buildCacheKey();
        if (sessionStorage.getItem('flightResultsMulti_force_refresh') !== '1' && navType === 'POP' && snap && snap.key === key && Array.isArray(snap.offers)) {
          setOffers(snap.offers);
          setLoading(false);
          return;
        }
      } catch {}
      // Если URL совпадает с последним показанным — используем снапшот без сети
      try {
        const params = new URLSearchParams(window.location.search);
        const stable = params.toString();
        const lastUrl = sessionStorage.getItem('flightResultsMulti_last_url');
        if (sessionStorage.getItem('flightResultsMulti_force_refresh') !== '1' && lastUrl && lastUrl === stable) {
          const snapRaw = sessionStorage.getItem('flightResultsMulti_snapshot');
          const snap = snapRaw ? JSON.parse(snapRaw) : null;
          const key = buildCacheKey();
          if (snap && snap.key === key && Array.isArray(snap.offers)) {
            setOffers(snap.offers);
            setLoading(false);
            return;
          }
        }
      } catch {}

      const cacheKey = buildCacheKey();
      try {
        const cached = sessionStorage.getItem('flightResultsMulti_force_refresh') === '1' ? null : getCache<{ offers: any[] }>(cacheKey, 10 * 60 * 1000);
        if (cached && Array.isArray((cached as any).offers)) {
          setOffers(cached.offers);
          setLoading(false);
          return;
        }
      } catch {}

      try {
        setLoading(true);
        const legsStr = sp.get('legs') || '[]';
        const legs = JSON.parse(legsStr);
        const adults = Number(sp.get('adults') || '1');
        const children = (sp.get('children') || '').trim();
        const sort = (sp.get('sort') || 'BEST') as any;
        const cabinClass = (sp.get('cabinClass') || 'ECONOMY') as any;
        const currency = sp.get('currency') || 'USD';
        const resp = await searchFlightsMultiStops(legs, adults, sort, cabinClass, currency, 1, children);
        const list = resp?.data?.flightOffers || [];
        setOffers(list);
        try {
          setCache(cacheKey, { offers: list });
          sessionStorage.setItem('flightResultsMulti_snapshot', JSON.stringify({ key: cacheKey, offers: list }));
          const p = new URLSearchParams(window.location.search);
          sessionStorage.setItem('flightResultsMulti_last_url', p.toString());
        } catch {}
      } catch {
        setOffers([]);
      } finally {
        setLoading(false);
        try { sessionStorage.removeItem('flightResultsMulti_force_refresh'); } catch {}
      }
    };
    run();
  }, [sp, buildCacheKey]);

  if (loading) return <div className="flight-results"><div className="loading">Loading flights...</div></div>;

  return (
    <div className="flight-results">
      <div className="results-header">
        <button className="back-button" onClick={()=>navigate(-1)}>
          <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div className="search-info">
          <div className="route">Multi‑city</div>
          <div className="details"/>
        </div>
      </div>

      <div className="results-count">{offers.length} flights found</div>

      <div className="flight-list">
        {offers.map((offer) => {
          const currency = offer?.priceBreakdown?.total?.currencyCode || 'USD';
          const price = formatPrice(offer?.priceBreakdown?.total?.units||0, offer?.priceBreakdown?.total?.nanos||0, currency);
          // Collect unique airlines across all legs
          const logos: Array<{src:string; alt:string; code:string; name:string}> = [];
          try {
            (offer.segments||[]).forEach((seg:any)=>{
              (seg.legs||[]).forEach((leg:any)=>{
                const a = leg?.carriersData?.[0] || {};
                const code = (a.code || leg?.flightInfo?.carrierInfo?.marketingCarrier || leg?.flightInfo?.carrierInfo?.operatingCarrier || '').toUpperCase();
                if (!code) return;
                if (logos.find(l=>l.code===code)) return;
                const src = (a.logo || a.logoUrl || `https://r-xx.bstatic.com/data/airlines_logo/${code}.png`);
                logos.push({ src, alt: a.name || code, code, name: a.name || code });
              });
            });
          } catch {}
          return (
            <div key={offer.token} className="flight-card" onClick={()=>{
              try {
                sessionStorage.setItem('selectedFlightOffer', JSON.stringify(offer));
                // Ключ по токену для однозначного восстановления маршрута на следующих шагах
                try { sessionStorage.setItem(`selectedFlightOffer:${offer.token}`, JSON.stringify(offer)); } catch {}
                // Текущий оффер для шага SeatSelection/SeatMap
                try { sessionStorage.setItem('current_offer_id', offer.token || ''); } catch {}
                // Устанавливаем флаги для предотвращения повторного запроса при возврате
                sessionStorage.setItem('flightResultsMulti_freeze', '1');
                sessionStorage.setItem('flightResults_back', '1');
                sessionStorage.setItem('flightResults_no_fetch', '1');
              } catch{}
              navigate(`/flight-detail/${offer.token}`, { state:{ flight: offer } });
            }}>
              {/* header logos removed to match screenshot; per-segment logos are shown next to each row */}
              {offer.segments.map((seg: any, idx: number) => {
                const dep = formatDateTime(seg.departureTime);
                const arr = formatDateTime(seg.arrivalTime);
                // stops and layovers within this segment
                const legs = seg.legs || [];
                const stopsCount = Math.max(0, legs.length - 1);
                let layMinutes = 0;
                const layAirports: string[] = [];
                for (let i=0;i<legs.length-1;i++){
                  const prevArr = new Date(legs[i].arrivalTime).getTime();
                  const nextDep = new Date(legs[i+1].departureTime).getTime();
                  const m = Math.max(0, Math.round((nextDep - prevArr)/60000));
                  layMinutes += m; const code = legs[i].arrivalAirport?.code || legs[i+1].departureAirport?.code; if (code && !layAirports.includes(code)) layAirports.push(code);
                }
                const layText = layMinutes>0 ? `${Math.floor(layMinutes/60)}h ${layMinutes%60}m` : '';
                // airline for this segment (first leg)
                const sLeg = legs[0];
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
                               onError={(e)=>{ const img=e.currentTarget as HTMLImageElement; const fallback = sCode?`https://r-xx.bstatic.com/data/airlines_logo/${sCode}.png`:''; if (fallback && img.src!==fallback) img.src=fallback; else img.style.display='none'; }} />
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
                              {stopsCount === 0 ? (
                                <span className="direct">Direct</span>
                              ) : (
                                <span className="stops">{stopsCount === 1 ? '1 stop' : `${stopsCount} stops`}</span>
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
                        {idx === (offer.segments?.length - 1) && (
                          <div className="price-under">
                            <div className="price-row" style={{ position: 'relative' }}>
                              <span className="price">{price}</span>
                            </div>
                            <div style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>Total</div>
                          </div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flight-bottom">
                <div className="flight-details"><div className="airline-name">{logos.map(l=>l.name).slice(0,2).join(' · ')}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FlightResultsMulti;


