import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { formatAircraftType } from '../utils/aircraft';

interface SegmentDetailsModalProps {
  segment: any;
  title?: string;
  onClose: () => void;
}

const SegmentDetailsModal: React.FC<SegmentDetailsModalProps> = ({ segment, title, onClose }) => {
  const { t } = useTranslation();
  const legs: any[] = Array.isArray(segment?.legs) ? segment.legs : [];

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' });
  const fmtDur = (mins: number) => `${Math.floor(mins/60)}h ${mins%60}m`;

  const segMins = (() => {
    const secs = Number(segment?.totalTime||0);
    if (secs > 0) return Math.round(secs/60);
    const t = Math.max(0, Math.round((new Date(segment?.arrivalTime||0).getTime() - new Date(segment?.departureTime||0).getTime())/60000));
    return t;
  })();
  const stopsCount = Math.max(0, legs.length - 1);
  const stopsLabel = stopsCount === 0 ? t('directLabel') : (stopsCount === 1 ? t('oneStop') : `${stopsCount} ${t('stopsLabel')}`);
  const cabin = String(legs?.[0]?.cabinClass || 'Economy').replace('_',' ');

  return (
    <div role="dialog" aria-modal="true" aria-label="Segment details"
      style={{ position:'fixed', inset:0, zIndex:3000, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'rgba(0,0,0,0.5)'}}
      onClick={(e)=>{ if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width:'100%', maxWidth:640, background:'#1f1f1f', borderTopLeftRadius:16, borderTopRightRadius:16, border:'1px solid #333', padding:'12px 16px', maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ alignSelf:'center', width:36, height:4, borderRadius:2, background:'#666' }} />
          <div style={{ color:'#fff', fontWeight:800, fontSize:20 }}>{title || t('flightDetailsLabel')}</div>
          <div style={{ color:'#bbb' }}>{stopsLabel} · {fmtDur(segMins)} · {cabin}</div>
        </div>

        <div style={{ marginTop:12 }}>
          {/* Departure node */}
          <div style={{ display:'grid', gridTemplateColumns:'20px 1fr', gap:12, alignItems:'start', marginBottom:12 }}>
            <div style={{ width:12, height:12, background:'#2997ff', borderRadius:6, marginTop:4 }} />
            <div>
              <div style={{ color:'#bbb' }}>{fmtDate(segment?.departureTime)} • {fmtTime(segment?.departureTime)}</div>
              <div style={{ color:'#fff', fontWeight:800 }}>{segment?.departureAirport?.code} • {segment?.departureAirport?.name}</div>
            </div>
          </div>

          {/* Legs */}
          {legs.map((leg:any, idx:number) => {
            const airline = leg?.carriersData?.[0] || {};
            const marketing = leg?.flightInfo?.carrierInfo?.marketingCarrier;
            const operating = leg?.flightInfo?.carrierInfo?.operatingCarrier;
            const code = String(airline?.code || marketing || operating || '').toUpperCase();
            const flightNumber = leg?.flightInfo?.flightNumber;
            const plane = formatAircraftType(leg?.flightInfo?.planeType || (leg as any)?.flightInfo?.aircraft?.code || (leg as any)?.planeType || (leg as any)?.aircraftType);
            const legMins = Math.round((Number(leg?.totalTime||0))/60);
            const logo = airline?.logo || airline?.logoUrl || (code?`https://r-xx.bstatic.com/data/airlines_logo/${code}.png`: '');
            return (
              <div key={idx} style={{ borderLeft:'2px dashed #444', marginLeft:5, paddingLeft:25, marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {logo ? <img src={logo} alt={airline?.name || code || 'Airline'} style={{ maxWidth:28, maxHeight:28 }} onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none'; }} /> : null}
                  </div>
                  <div>
                    <div style={{ color:'#ddd', fontWeight:600 }}>{airline?.name || code || 'Airline'}</div>
                    <div style={{ color:'#bbb' }}>{t('flightNumberLabel')} {code} {flightNumber} · {cabin}{plane?` · ${plane}`:''}</div>
                    <div style={{ color:'#bbb' }}>{t('flightTimeLabel')} {fmtDur(legMins)}</div>
                  </div>
                </div>

                {/* Layover before next leg */}
                {idx < legs.length - 1 && (()=>{
                  const next = legs[idx+1];
                  const prevArr = new Date(leg.arrivalTime).getTime();
                  const nextDep = new Date(next.departureTime).getTime();
                  const minutes = Math.max(0, Math.round((nextDep - prevArr)/60000));
                  const lay = fmtDur(minutes);
                  const atCode = leg.arrivalAirport?.code || next.departureAirport?.code || '';
                  const atName = leg.arrivalAirport?.name || next.departureAirport?.name || '';
                  return (
                    <div style={{ margin:'10px 0 0 0' }}>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#2a2a2a', border:'1px solid #3a3a3a', borderRadius:12, color:'#ddd' }}>
                        <svg width="16" height="16" fill="#ccc" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm.75 5h-1.5v6l5 3 .75-1.23-4.25-2.52V7z"/></svg>
                        <span>{t('layoverLabel')} {lay} {t('atLabel')} {atCode}{atName?` · ${atName}`:''}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {/* Arrival node */}
          <div style={{ display:'grid', gridTemplateColumns:'20px 1fr', gap:12, alignItems:'start', marginTop:4 }}>
            <div style={{ width:12, height:12, background:'#2997ff', borderRadius:6, marginTop:4 }} />
            <div>
              <div style={{ color:'#bbb' }}>{fmtDate(segment?.arrivalTime)} • {fmtTime(segment?.arrivalTime)}</div>
              <div style={{ color:'#fff', fontWeight:800 }}>{segment?.arrivalAirport?.code} • {segment?.arrivalAirport?.name}</div>
            </div>
          </div>
        </div>

        <div style={{ height:16 }} />
        <div style={{ display:'flex', justifyContent:'center', paddingBottom:8 }}>
          <button className="ghost-link" onClick={onClose}>{t('closeLabel')}</button>
        </div>
      </div>
    </div>
  );
};

export default SegmentDetailsModal;


