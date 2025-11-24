import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getSeatMap } from './services/flightApi';
import './Luggage.css';
import { formatAircraftType, calculateTotalSeatPrice } from './utils/aircraft';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
);

const Seat: React.FC<{ selected: boolean; available: boolean; blocked?: boolean; price?: {units:number;nanos:number;currency:string}|null; onClick: () => void }>=({ selected, available, blocked, price, onClick })=>{
  const bg = blocked ? '#2c2c2c' : (!available ? '#3b3b3b' : (selected ? '#1db954' : '#4da3ff'));
  const title = blocked ? 'Not assignable' : (price ? `${price.currency} ${Math.round(price.units + (price.nanos||0)/1e9)}` : (available ? 'Free' : 'Unavailable'));
  return (
    <div onClick={() => onClick()} style={{ width: 'min(9.5vw, 30px)', height: 'min(9.5vw, 30px)', borderRadius: 8, background: bg, cursor: available && !blocked ? 'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color: blocked ? '#888' : '#000' }} title={title}>
      {blocked ? '×' : (price && Math.round(price.units + (price.nanos||0)/1e9) > 0 ? '$' : '')}
    </div>
  );
};

const SeatMap: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const currency: string = (location?.state?.currency || 'USD').toUpperCase();
  const travellers: number = Number(location?.state?.travellers || 1);
  const totalPerTraveller: number = Number(location?.state?.totalPerTraveller || 0);

  const [params] = useSearchParams();
  // Базовый токен оффера (один на весь билет)
  const baseOfferId = React.useMemo(() => {
    // 1) приоритет: offerId из state/URL — чтобы разные направления имели свои токены
    const idFromState = (location as any)?.state?.offerId || '';
    let id = idFromState || params.get('offerId') || sessionStorage.getItem('current_offer_id') || '';
    if (!id) {
      try { id = localStorage.getItem('current_offer_id') || id; } catch {}
      if (id) try { sessionStorage.setItem('current_offer_id', id); } catch {}
    }
    return id;
  }, [params, location?.state?.offerId]);
  // Ключ для кэша/выбранных мест с учетом сегмента (визуально «разные карты»)
  const offerId = React.useMemo(() => {
    if (!baseOfferId) return '';
    const idx = Number(location?.state?.segIdx);
    return (Number.isFinite(idx) && idx > 0) ? `${baseOfferId}_S${idx + 1}` : baseOfferId;
  }, [baseOfferId, location?.state?.segIdx]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');
  const [grid, setGrid] = React.useState<{ rowIds: number[]; cols: string[]; slots: Array<{ key: string; seatCol?: string; isGap: boolean }>; seats: Record<string, { available: boolean; price: {units:number;nanos:number;currency:string}|null; info?: { row:number; col:string; exit?: boolean; columnDesc?: string[]; description?: string; rawPriceBreakdown?: any } }>}>({ rowIds: [], cols: [], slots: [], seats: {} });
  // Определяем класс обслуживания для правил выбора мест
  const cabinClass: string = React.useMemo(() => {
    try {
      if (!baseOfferId) return 'ECONOMY';
      let raw = sessionStorage.getItem(`selectedFlightOffer:${baseOfferId}`);
      if (!raw) {
        try { raw = localStorage.getItem(`selectedFlightOffer:${baseOfferId}`) || raw; } catch {}
        if (raw) try { sessionStorage.setItem(`selectedFlightOffer:${baseOfferId}`, raw); } catch {}
      }
      if (raw) {
        const flight = JSON.parse(raw);
        const leg = flight?.segments?.[0]?.legs?.[0];
        const cc = (leg?.cabinClass || '').toString().toUpperCase();
        if (cc) return cc;
      }
    } catch {}
    return 'ECONOMY';
  }, []);

  const [apiBacked, setApiBacked] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [eligibility, setEligibility] = React.useState<{eligible:boolean; reason?: string}>({ eligible: true });
  // Получаем индекс сегмента из state для мультисегментных рейсов
  const segIdx = React.useMemo(() => {
    const idxFromState = Number(location?.state?.segIdx);
    const idxFromUrl = Number(params.get('seg'));
    const idx = Number.isFinite(idxFromState) && idxFromState >= 0 ? idxFromState : (Number.isFinite(idxFromUrl) && idxFromUrl >= 0 ? idxFromUrl : 0);
    return idx;
  }, [location?.state?.segIdx, params]);
  const [previewId, setPreviewId] = React.useState<string>('');
  const [sheetIn, setSheetIn] = React.useState(false);
  const [hasSelectable, setHasSelectable] = React.useState(true);

  // Aircraft type label for seat page header
  const aircraftLabel = React.useMemo(() => {
    try {
      if (!baseOfferId) return '';
      const rawOffer = sessionStorage.getItem(`selectedFlightOffer:${baseOfferId}`);
      if (rawOffer) {
        const offer = JSON.parse(rawOffer);
        for (const seg of (offer?.segments||[])) {
          for (const leg of (seg?.legs||[])) {
            const t = String(
              leg?.flightInfo?.planeType
              || leg?.flightInfo?.aircraft?.code
              || leg?.planeType
              || leg?.aircraftType
              || ''
            ).trim();
            if (t) return formatAircraftType(t);
          }
        }
      }
    } catch {}
    return '';
  }, []);

  const closePreview = () => setPreviewId('');

  const persistSelection = React.useCallback((list: string[]) => {
    try { 
      if (offerId) {
        localStorage.setItem(`seat_selection_${offerId}`, JSON.stringify(list));
      }
    } catch {}
  }, [offerId]);

  // Сохраняем точную показанную цену для конкретного места этого сегмента
  const persistSeatPrice = React.useCallback((seatId: string, amountShown: number | null) => {
    try {
      if (!offerId) return;
      const key = `seat_selection_price_${offerId}`;
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      if (amountShown === null) {
        delete map[seatId];
      } else {
        map[seatId] = Number(amountShown) || 0;
      }
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  }, [offerId]);

  // Чистим цены для мест, которых больше нет в выборе
  const syncSeatPricesWithSelection = React.useCallback((selectedList: string[]) => {
    try {
      if (!offerId) return;
      const key = `seat_selection_price_${offerId}`;
      const raw = localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      const sel = new Set(selectedList);
      Object.keys(map).forEach(k => { if (!sel.has(k)) delete map[k]; });
      localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  }, [offerId]);

  // Load persisted selection per offer and segment
  React.useEffect(() => {
    try {
      if (offerId) {
        const saved = localStorage.getItem(`seat_selection_${offerId}`);
        if (saved) setSelected(JSON.parse(saved));
      }
    } catch {}
  }, [offerId]);

  // Проверка правил доступности выбора мест (Adults>1, есть Children, сегментов>3)
  React.useEffect(() => {
    try {
      let pax: any = null;
      const raw = sessionStorage.getItem('flow_pax') || localStorage.getItem('flow_pax') || '';
      if (raw) pax = JSON.parse(raw);
      if (!pax) {
        const adultsFromState = Number((location as any)?.state?.travellers || travellers || 1);
        pax = { adults: adultsFromState, childrenAges: [], segments: 0 };
      }
      const adultsNum = Number(pax?.adults || 1);
      const childrenCount = Array.isArray(pax?.childrenAges) ? pax.childrenAges.length : 0;
      const segmentsNum = Number(pax?.segments || 0);
      const ineligible = adultsNum > 1 || childrenCount > 0 || segmentsNum > 3;
      setEligibility(ineligible ? { eligible:false, reason:'INELIGIBLE_RULE' } : { eligible:true });
    } catch { setEligibility({ eligible:true }); }
  }, [location?.state, travellers]);

  React.useEffect(() => {
    const run = async () => {
      if (!offerId) { setLoading(false); return; }
      // Зафиксируем текущий offerId как активный для всех последующих экранов
      // Важно: хранить в current_offer_id базовый ID оффера, без суффикса сегмента
      try { sessionStorage.setItem('current_offer_id', baseOfferId); localStorage.setItem('current_offer_id', baseOfferId); } catch {}
      try {
        setLoading(true);

        // Получаем токен конкретного сегмента из flight data
        let segmentToken = baseOfferId;
        try {
          let rawOffer: string | null = sessionStorage.getItem(`selectedFlightOffer:${baseOfferId}`) || sessionStorage.getItem('selectedFlightOffer');
          if (!rawOffer) {
            const rawLS = localStorage.getItem(`selectedFlightOffer:${baseOfferId}`) || localStorage.getItem('selectedFlightOffer');
            if (rawLS) {
              rawOffer = rawLS;
              try { sessionStorage.setItem(`selectedFlightOffer:${baseOfferId}`, rawLS); } catch {}
            }
          }
          if (rawOffer) {
            const offer = JSON.parse(rawOffer);
            if (offer?.segments && Array.isArray(offer.segments) && offer.segments[segIdx]) {
              // Используем токен сегмента если есть, иначе базовый токен
              segmentToken = offer.segments[segIdx].token || baseOfferId;
              console.log(`SeatMap: Using segment token for segIdx ${segIdx}:`, segmentToken);
            }
          }
        } catch (e) {
          console.error('SeatMap: Error getting segment token:', e);
        }

        // Cache-first порядок: raw_by_offer -> cache_by_token -> API (валидация токена)
        let resp: any | null = null;
        const rawOfferKey = `seatmap_raw_${offerId}`;
        const rawBaseKey = `seatmap_raw_${baseOfferId}`;
        const tokenCacheKey = `seatmap_cache_${segmentToken}`; // формат { ts, data }

        // 1) Кэш по offerId (пер‑сегментный снимок)
        try {
          const cachedRaw = sessionStorage.getItem(rawOfferKey) || sessionStorage.getItem(rawBaseKey) || localStorage.getItem(rawOfferKey) || localStorage.getItem(rawBaseKey);
          if (cachedRaw) resp = JSON.parse(cachedRaw);
        } catch {}

        // 2) Встроенный TTL-кэш по токену сегмента (если ничего не нашли)
        if (!resp) {
          try {
            const tokenRaw = sessionStorage.getItem(tokenCacheKey);
            if (tokenRaw) {
              const parsed = JSON.parse(tokenRaw);
              if (parsed && parsed.data) resp = parsed.data;
            }
          } catch {}
        }

        // 2.5) Если стоит префетч-лок, подождать его завершения и повторно проверить кэш (до 2500мс)
        if (!resp) {
          try {
            const lockKey = `seatmap_prefetch_lock:${baseOfferId}`;
            const started = Date.now();
            // Подождём максимум 2.5 секунды, чтобы не дублировать вызов API
            while (sessionStorage.getItem(lockKey) === '1' && Date.now() - started < 2500) {
              await new Promise(r => setTimeout(r, 120));
              const cachedRaw = sessionStorage.getItem(rawOfferKey) || sessionStorage.getItem(rawBaseKey) || localStorage.getItem(rawOfferKey) || localStorage.getItem(rawBaseKey);
              if (cachedRaw) { resp = JSON.parse(cachedRaw); break; }
            }
          } catch {}
        }

        // Валидация: проверяем, что ответ относится к текущему segmentToken (если в данных доступен URL)
        const urlOk = (() => {
          try { 
            const u = String(resp?._debugRequestUrl || resp?.debugUrl || '');
            // При префетче по baseOfferId URL содержит базовый токен — считаем валидным для всех сегментов этого оффера
            if (!u) return true;
            if (u.includes(encodeURIComponent(String(segmentToken)))) return true;
            if (u.includes(encodeURIComponent(String(baseOfferId)))) return true;
            return false;
          } catch { return true; }
        })();
        if (resp && !urlOk) resp = null;

        // 3) Если в кэше нет — только тогда проверяем rate-limit и обращаемся к API
        if (!resp) {
          try {
            const untilStr = sessionStorage.getItem('seatmap_rate_limited_until');
            if (untilStr && Date.now() < Number(untilStr)) {
              throw new Error('RATE_LIMITED');
            }
          } catch {}
          resp = await getSeatMap(segmentToken, currency);
          try { sessionStorage.setItem(rawOfferKey, JSON.stringify(resp)); } catch {}
          try { sessionStorage.setItem(rawBaseKey, JSON.stringify(resp)); } catch {}
          try { localStorage.setItem(rawOfferKey, JSON.stringify(resp)); } catch {}
          try { localStorage.setItem(rawBaseKey, JSON.stringify(resp)); } catch {}
        }

        const data = resp?.data;
        // Нормализуем к виду: берём cabins того seat map, который относится к текущему сегменту
        const pickCabinsForSegment = (root: any, segmentIndex: number) => {
          // seatMap.seatMapOption (массив вариантов, в каждом есть cabins и segmentIndex)
          const opts = root?.seatMap?.seatMapOption || root?.seatMapOption;
          if (Array.isArray(opts) && opts.length) {
            const bySeg = opts.find((o:any) => Number(o?.segmentIndex) === segmentIndex);
            if (bySeg?.cabins) return bySeg.cabins;
            if (opts[segmentIndex]?.cabins) return opts[segmentIndex].cabins;
            if (opts[0]?.cabins) return opts[0].cabins;
          }
          // seatMaps[] (массив карт по сегментам)
          const mapsArr = root?.seatMaps || root?.seatMap;
          if (Array.isArray(mapsArr) && mapsArr.length) {
            if (mapsArr[segmentIndex]?.cabins) return mapsArr[segmentIndex].cabins;
            if (mapsArr[0]?.cabins) return mapsArr[0].cabins;
          }
          // Прямая форма
          if (Array.isArray(root?.cabins)) return root.cabins;
          if (Array.isArray(root?.seatMap?.cabins)) return root.seatMap.cabins;
          return [];
        };
        const cabinsAny = pickCabinsForSegment(data, segIdx);

        const cabin = Array.isArray(cabinsAny) ? cabinsAny[0] : undefined;

        if (cabin && (Array.isArray(cabin.columns) || Array.isArray(cabin.rows) || Array.isArray((cabin as any).seats))) {
          setApiBacked(true);
          // cols/colDescMap вычисляются ниже после нормализации wide-body
          const seats: Record<string, { available: boolean; price: {units:number;nanos:number;currency:string}|null; info?: { row:number; col:string; exit?: boolean; columnDesc?: string[]; description?: string; rawPriceBreakdown?: any } }> = {};

          const isGapCol = (c:any) => {
            const desc = Array.isArray(c?.description) ? c.description.map((d:string)=>d.toUpperCase()) : [];
            // "AISLE" и "BETWEEN" — это не разрывы, это характеристики положения. Гэпами считаем только явные технические/пустые столбцы
            const GAP_TAGS = ['GAP','SPACE','WALKWAY','EMPTY','VOID'];
            return desc.some((tag: string) => GAP_TAGS.includes(tag));
          };
          const letterOrder = ['A','B','C','D','E','F','G','H','J','K'];
          const buildSlots = (orderedCols: string[]) => {
            const out: Array<{ key: string; seatCol?: string; isGap: boolean }> = [];
            const pushGap = (k:string) => out.push({ key: `gap-${k}`, isGap: true });
            // 6 колонок → разрыв между 3 и 4; 9 колонок → между 3/4 и 6/7; 10 колонок (3‑4‑3) → между 3/4 и 7/8
            orderedCols.forEach((id, idx) => {
              out.push({ key: id, seatCol: id, isGap: false });
              const next = orderedCols[idx+1];
              if (!next) return;
              const splitIndices: number[] = [];
              if (orderedCols.length === 6) splitIndices.push(2); // after index 2 (0-based) → between 3 and 4
              if (orderedCols.length === 9) { splitIndices.push(2); splitIndices.push(5); }
              if (orderedCols.length === 10) { splitIndices.push(2); splitIndices.push(6); }
              if (splitIndices.includes(idx)) pushGap(`${id}-${next}`);
            });
            return out;
          };

          // 1) Собираем кандидатов колонок
          const fromColumns: string[] = Array.isArray(cabin.columns)
            ? (cabin.columns || []).filter((c:any)=>!isGapCol(c)).map((c:any)=>String(c.id).toUpperCase())
            : [];
          const fromRows: string[] = Array.isArray(cabin.rows)
            ? (cabin.rows as any[]).flatMap((r:any) => Array.isArray(r?.seats) ? r.seats.map((s:any)=> String(s?.colId||'').toUpperCase()).filter(Boolean) : [])
            : [];
          const fromFlat: string[] = Array.isArray((cabin as any).seats)
            ? ((cabin as any).seats as any[]).map((s:any)=> String(s?.column||'').toUpperCase()).filter(Boolean)
            : [];
          const candidatesRaw = [...fromColumns, ...fromRows, ...fromFlat];
          let colOrder: string[] = Array.from(new Set(candidatesRaw));

          // 2) Сортировка
          const allLetters = colOrder.every(c => /^[A-Z]$/.test(c));
          const allDigits = colOrder.every(c => /^\d+$/.test(c));
          if (allLetters) {
            colOrder.sort((a,b)=>{
              const ia = letterOrder.indexOf(a);
              const ib = letterOrder.indexOf(b);
              if (ia === -1 && ib === -1) return a.localeCompare(b);
              if (ia === -1) return 1;
              if (ib === -1) return -1;
              return ia - ib;
            });
          } else if (allDigits) {
            colOrder.sort((a,b)=> Number(a) - Number(b));
          } else {
            colOrder.sort();
          }

          // 3) Карта описаний колонок
          const colDescMap: Record<string, string[]> = {};
          if (Array.isArray(cabin.columns) && cabin.columns.length) {
            cabin.columns.forEach((c:any)=>{ const id=String(c.id).toUpperCase(); if (!isGapCol(c)) colDescMap[id] = Array.isArray(c?.description)? c.description.map((d:string)=>String(d).toUpperCase()) : []; });
          }
          // Ensure every column has desc entry; apply heuristics for windows/aisles
          colOrder.forEach(c => { if (!colDescMap[c]) colDescMap[c] = []; });
          if (colOrder.length >= 2) {
            if (!colDescMap[colOrder[0]].includes('WINDOW')) colDescMap[colOrder[0]].push('WINDOW');
            if (!colDescMap[colOrder[colOrder.length-1]].includes('WINDOW')) colDescMap[colOrder[colOrder.length-1]].push('WINDOW');
          }
          if (colOrder.length === 6) {
            if (!colDescMap[colOrder[2]].includes('AISLE')) colDescMap[colOrder[2]].push('AISLE');
            if (!colDescMap[colOrder[3]].includes('AISLE')) colDescMap[colOrder[3]].push('AISLE');
          }
          if (colOrder.length === 9) {
            if (!colDescMap[colOrder[2]].includes('AISLE')) colDescMap[colOrder[2]].push('AISLE');
            if (!colDescMap[colOrder[3]].includes('AISLE')) colDescMap[colOrder[3]].push('AISLE');
            if (!colDescMap[colOrder[5]].includes('AISLE')) colDescMap[colOrder[5]].push('AISLE');
            if (!colDescMap[colOrder[6]].includes('AISLE')) colDescMap[colOrder[6]].push('AISLE');
          }
          if (colOrder.length === 10) {
            if (!colDescMap[colOrder[2]].includes('AISLE')) colDescMap[colOrder[2]].push('AISLE');
            if (!colDescMap[colOrder[3]].includes('AISLE')) colDescMap[colOrder[3]].push('AISLE');
            if (!colDescMap[colOrder[6]].includes('AISLE')) colDescMap[colOrder[6]].push('AISLE');
            if (!colDescMap[colOrder[7]].includes('AISLE')) colDescMap[colOrder[7]].push('AISLE');
          }

          // 4) Slots и cols
          const slots: Array<{ key: string; seatCol?: string; isGap: boolean }> = buildSlots(colOrder);
          const cols: string[] = colOrder;

          const isAvailable = (s:any, exists:boolean = true) => {
            // если в данных вообще нет такого места под эту колонку — считать недоступным
            if (!exists) return false;
            if (typeof s?.available === 'boolean') return s.available;
            if (typeof s?.isAvailable === 'boolean') return s.isAvailable;
            if (typeof s?.status === 'string') return String(s.status).toUpperCase() === 'AVAILABLE';
            if (typeof s?.seatAvailability === 'string') return String(s.seatAvailability).toUpperCase() === 'AVAILABLE';
            // если явно указана цена (включая 0), считаем, что место можно выбрать
            const pb = s?.priceBreakdown?.total;
            if (pb && (typeof pb.units === 'number')) return true;
            const p = s?.price || s?.seatPrice || s?.pricing || s?.amount;
            if (p && (typeof p.units === 'number')) return true;
            // иначе — это проход/служебное место/блок сырых данных → недоступно
            return false;
          };

          const isSelectableByCabin = (rawAvailable:boolean, seatObj:any) => {
            const upper = cabinClass;
            const pb = seatObj?.priceBreakdown?.total;
            const p = seatObj?.price || seatObj?.seatPrice || seatObj?.pricing || seatObj?.amount;
            const hasPrice = (pb && typeof pb.units === 'number') || (p && typeof p.units === 'number');
            if (upper === 'BUSINESS' || upper === 'FIRST') {
              return rawAvailable; // бесплатный выбор для доступных мест
            }
            // ECONOMY / PREMIUM_ECONOMY — только если есть цена (включая 0)
            return rawAvailable && hasPrice;
          };

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

          // Вариант A: rows[].seats[] (как в твоем JSON)
          if (Array.isArray(cabin.rows)) {
            const rowIdSet: Set<number> = new Set();
            cabin.rows.forEach((rowObj: any) => {
              const rowId = Number(rowObj?.id);
              if (!isFinite(rowId) || rowId <= 0) return; // отбрасываем -1 и нули
              rowIdSet.add(rowId);
              const rowSeats = Array.isArray(rowObj?.seats) ? rowObj.seats : [];
              const byCol: Record<string, any> = {};
              rowSeats.forEach((s: any) => { if (s?.colId) byCol[String(s.colId)] = s; });
              const isBulkhead = Array.isArray(rowObj?.description) && rowObj.description.some((d:string)=>/BULKHEAD|BASSINET|PARTITION/i.test(d));
              cols.forEach((colId: string) => {
                const exists = Boolean(byCol[colId]);
                const s = byCol[colId] || {};
                const id = `${String(rowId).padStart(2,'0')}${colId}`;
                const rawAvail = isAvailable(s, exists);
                const priced = Boolean((s?.priceBreakdown?.total && typeof s.priceBreakdown.total.units==='number') || (s?.price && typeof s.price.units==='number') || (s?.seatPrice && typeof s.seatPrice.units==='number'));
                // В первом ряду/перегородке часто нельзя выбирать: разрешим только если есть явная цена или бизнес/первый
                const bulkheadRule = isBulkhead && !(priced || cabinClass==='BUSINESS' || cabinClass==='FIRST');
                seats[id] = { 
                  available: !bulkheadRule && isSelectableByCabin(rawAvail, s), 
                  price: takePrice(s),
                  info: { row: rowId, col: colId, exit: Array.isArray(rowObj?.description) ? rowObj.description.some((d:string)=>/(EXIT|EMERGENCY|OVERWING|DOOR)/i.test(d)) : false, columnDesc: colDescMap[colId]||[], description: s?.description, rawPriceBreakdown: s?.priceBreakdown?.total || null }
                };
              });
            });

            const rowIds = Array.from(rowIdSet).filter(n=>n>0).sort((a,b)=>a-b);
            setGrid({ rowIds, cols, slots, seats });
            setHasSelectable(Object.values(seats).some(s => s.available));
          } else if (Array.isArray((cabin as any).seats)) {
            // Вариант B: плоский список seats[] с row/column
            const rowIdSet: Set<number> = new Set();
            const flat: Record<string, any> = {};
            (cabin as any).seats.forEach((s: any) => {
              const r = Number(s.row);
              const c = String(s.column);
              if (!r || r <= 0 || !c) return;
              const id = `${String(r).padStart(2,'0')}${c}`;
              flat[id] = s;
              const rawAvail = isAvailable(s, true);
              seats[id] = { available: isSelectableByCabin(rawAvail, s), price: takePrice(s), info: { row: r, col: c, exit: Array.isArray(s?.description) ? s.description.some((d:string)=>/(EXIT|EMERGENCY|OVERWING|DOOR)/i.test(d)) : false, columnDesc: colDescMap[c]||[], description: s?.description, rawPriceBreakdown: s?.priceBreakdown?.total || null } };
              rowIdSet.add(r);
            });
            // Заполним отсутствующие колонки только для существующих рядов
            Array.from(rowIdSet).forEach((r: number) => {
              cols.forEach((c: string) => {
                const id = `${String(r).padStart(2,'0')}${c}`;
                if (!seats[id]) {
                  seats[id] = { available: false, price: null, info: { row: r, col: c, exit: false, columnDesc: colDescMap[c]||[], description: 'BLOCKED' } } as any;
                }
              });
            });
            const rowIds = Array.from(rowIdSet).sort((a,b) => a-b);
            setGrid({ rowIds, cols, slots, seats });
            setHasSelectable(Object.values(seats).some(s => s.available));
          } else {
            // Неожиданная структура
            setApiBacked(false);
            const colsF = ['A','B','C','D','E','F'];
            const seatsF: Record<string, { available: boolean; price: {units:number;nanos:number;currency:string}|null; info?: any }> = {};
            for (let r=1;r<=20;r++){ colsF.forEach(c=> seatsF[`${String(r).padStart(2,'0')}${c}`] = { available: true, price: null } ); }
            const rowIds = Array.from({length: 20}, (_,i)=> i+1);
            const slotsF = colsF.map(id => ({ key: id, seatCol: id, isGap: false }));
            setGrid({ rowIds, cols: colsF, slots: slotsF, seats: seatsF });
          }
        } else {
          setApiBacked(false);
          // Fallback: без данных рисуем 20x6 свободных мест
          const cols = ['A','B','C','D','E','F'];
          const seats: Record<string, { available: boolean; price: {units:number;nanos:number;currency:string}|null; info?: any }> = {};
          for (let r=1;r<=20;r++){ cols.forEach(c=> seats[`${String(r).padStart(2,'0')}${c}`] = { available: true, price: null } ); }
          const rowIds = Array.from({length: 20}, (_,i)=> i+1);
          const slots = cols.map(id => ({ key: id, seatCol: id, isGap: false }));
          setGrid({ rowIds, cols, slots, seats });
          setHasSelectable(Object.values(seats).some(s => s.available));
        }
      } catch (e:any) {
        const msg = e?.message === 'RATE_LIMITED' ? 'Rate limit reached. Try again shortly.' : (e?.message || 'Failed to load seat map');
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [offerId, currency, segIdx]);

  const assignSeat = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev;
      let next: string[];
      let removed: string | null = null;
      if (prev.length < travellers) next = [...prev, id];
      else { removed = prev[0]; next = [id, ...prev.slice(1)]; } // replace first if at limit
      persistSelection(next);
      // Сохраняем цену ровно как показано в UI
      try {
        const p = grid.seats[id]?.price;
        const shown = p ? Math.round((p.units || 0) + (p.nanos || 0) / 1e9) : 0;
        persistSeatPrice(id, shown);
        if (removed) persistSeatPrice(removed, null);
        syncSeatPricesWithSelection(next);
      } catch {}
      // Триггерим локальное событие, чтобы SeatSelection/другие карточки обновили сумму мгновенно
      try { window.dispatchEvent(new Event('seat-selection-changed')); } catch {}
      return next;
    });
  };

  const fmt = (n: number) => `${currency} ${Math.round(n).toLocaleString()}`;
  const fmtPriceObj = (p?: {units:number;nanos:number;currency:string}|null) => {
    if (!p) return 'Free';
    const val = Math.round(p.units + (p.nanos||0)/1e9);
    return `${p.currency} ${val.toLocaleString()}`;
  };

  // Используем централизованную функцию для расчета общей суммы за все сегменты
  const selectedSeatsTotal = React.useMemo(() => {
    try {
      return calculateTotalSeatPrice(baseOfferId, currency);
    } catch { return 0; }
  }, [baseOfferId, currency, selected]);

  React.useEffect(() => {
    if (previewId) {
      // animate bottom sheet in
      requestAnimationFrame(() => setSheetIn(true));
    } else {
      setSheetIn(false);
    }
  }, [previewId]);

  // Санитизация: удаляем старые выбранные места, которых нет в текущей раскладке, и обрезаем до лимита пассажиров
  React.useEffect(() => {
    if (!grid || !grid.rowIds || grid.rowIds.length === 0) return;
    setSelected(prev => {
      const filtered = prev.filter(id => Boolean(grid.seats[id]?.available));
      const trimmed = filtered.slice(0, Math.max(0, travellers));
      if (trimmed.length !== prev.length || trimmed.some((v,i)=>v!==prev[i])) {
        persistSelection(trimmed);
        syncSeatPricesWithSelection(trimmed);
        return trimmed;
      }
      return prev;
    });
  }, [grid, travellers, persistSelection]);

  // Эффект для синхронизации общей суммы при изменении выбранных мест в других сегментах
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('seat_selection_')) {
        try { window.dispatchEvent(new Event('seat-selection-changed')); } catch {}
      }
    };

    // Слушаем события storage для синхронизации между вкладками
    window.addEventListener('storage', handleStorageChange);

    // Также проверяем изменения в localStorage каждые 500мс для синхронизации в рамках одной вкладки
    const interval = setInterval(() => {
      try {
        if (offerId && baseOfferId) {
          const currentTotal = calculateTotalSeatPrice(baseOfferId, currency);
          // Пингуем событие, чтобы родительские экраны подхватили
          try { window.dispatchEvent(new Event('seat-selection-changed')); } catch {}
        }
      } catch (error) {
        console.error('Error checking seat price sync:', error);
      }
    }, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [offerId, baseOfferId, currency]);

  // Проверка: является ли ряд аварийным (выход / overwing). Используем для меток в проходах
  const isExitRow = React.useCallback((row: number) => {
    try {
      return grid.cols.some((c) => Boolean(grid.seats[`${String(row).padStart(2,'0')}${c}`]?.info?.exit));
    } catch { return false; }
  }, [grid]);

  return (
    <div className="luggage-page">
      <div className="luggage-header">
        <button className="back-button" onClick={() => navigate(-1)}><BackIcon/></button>
        <h1>Select seats</h1>
        <div style={{ width: 24 }}></div>
      </div>
      {aircraftLabel && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ marginTop: 6, display:'inline-flex', alignItems:'center', gap:6, background:'#2e2e2e', border:'1px solid #404040', borderRadius: 12, padding:'6px 10px', color:'#ddd', fontSize:12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
            <span>{aircraftLabel}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 16 }}>Loading seat map...</div>
      ) : error ? (
        <div style={{ padding: 16, color: '#ff7676' }}>
          {error}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => { setError(''); setLoading(true); setTimeout(()=>{ window.location.reload(); }, 50); }} style={{ background:'#0071c2', color:'#fff', border:'none', borderRadius:8, padding:'10px 16px', fontWeight:600 }}>Retry</button>
          </div>
        </div>
      ) : apiBacked ? (
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 8, color: '#ccc' }}>
            Select seats for flight {segIdx + 1}
          </div>
          {(!hasSelectable || !eligibility.eligible) && (
            <div style={{ background:'#2f2f2f', border:'1px solid #444', color:'#ffcc66', padding:'10px 12px', borderRadius:8, marginBottom:12 }}>
              Seat selection for this itinerary is temporarily unavailable due to airline policy. For bookings with multiple adult passengers, accompanying children, or itineraries exceeding three flight segments, advance seat assignment is not offered at this stage. You will be able to select seats during online check‑in or at airport check‑in, subject to availability and fare conditions.
            </div>
          )}
          
          {/* Legend */}
          <div style={{ display:'flex', gap:8, alignItems:'center', color:'#bbb', fontSize:12, marginBottom: 10 }}>
            <div style={{ width:14, height:14, borderRadius:3, background:'#4da3ff' }}></div>
            <span>Available</span>
            <div style={{ width:14, height:14, borderRadius:3, background:'#3b3b3b', marginLeft:8 }}></div>
            <span>Unavailable</span>
            <div style={{ width:14, height:14, borderRadius:3, background:'#2c2c2c', display:'flex', alignItems:'center', justifyContent:'center', color:'#888', fontSize:10, marginLeft:8 }}>×</div>
            <span>Not assignable</span>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `40px ${grid.slots.map(s=> s.isGap? '16px' : '32px').join(' ')} 40px`, gap: 10 }}>
              {/* Header row */}
              <div></div>
              {grid.slots.map((slot) => (
                <div key={`h-${slot.key}`} style={{ color: '#bbb', textAlign: 'center' }}>{slot.isGap ? '' : slot.seatCol}</div>
              ))}
              <div></div>
              {grid.rowIds.map((r, rowIndex) => (
                <React.Fragment key={`row-${r}`}>
                  <div style={{ 
                    color: '#bbb', 
                    textAlign: 'center', 
                    display:'flex', 
                    flexDirection:'column', 
                    alignItems:'center', 
                    gap:4,
                    borderBottom: rowIndex < grid.rowIds.length - 1 ? '1px solid #444' : 'none',
                    paddingBottom: rowIndex < grid.rowIds.length - 1 ? '8px' : '0',
                    marginBottom: rowIndex < grid.rowIds.length - 1 ? '8px' : '0'
                  }}>
                    <span>{String(r).padStart(2,'0')}</span>
                    {isExitRow(r) ? <span style={{ color:'#ffcc66', fontSize:10 }}>Exit</span> : null}
                  </div>
                  {grid.slots.map((slot) => {
                    if (slot.isGap) {
                      return (
                        <div key={`${r}-${slot.key}`} style={{ 
                          width:16, 
                          height: 30, 
                          display:'flex', 
                          alignItems:'center', 
                          justifyContent:'center',
                          borderBottom: rowIndex < grid.rowIds.length - 1 ? '1px solid #444' : 'none',
                          paddingBottom: rowIndex < grid.rowIds.length - 1 ? '8px' : '0',
                          marginBottom: rowIndex < grid.rowIds.length - 1 ? '8px' : '0'
                        }}>
                          {/* center EXIT label removed */}
                        </div>
                      );
                    }
                    const c = slot.seatCol as string;
                    const id = `${String(r).padStart(2,'0')}${c}`;
                    const seat = grid.seats[id] || { available: false, price: null, info:{ description:'BLOCKED' } } as any;
                    const isSelected = selected.includes(id);
                    return (
                      <div key={`${r}-${c}`} style={{
                        borderBottom: rowIndex < grid.rowIds.length - 1 ? '1px solid #444' : 'none',
                        paddingBottom: rowIndex < grid.rowIds.length - 1 ? '8px' : '0',
                        marginBottom: rowIndex < grid.rowIds.length - 1 ? '8px' : '0'
                      }}>
                        <Seat 
                          available={eligibility.eligible && seat.available} 
                          blocked={seat.info?.description==='BLOCKED'} 
                          price={seat.price} 
                          selected={isSelected} 
                          onClick={() => { if (eligibility.eligible) setPreviewId(id); }} 
                        />
                      </div>
                    );
                  })}
                  {/* Right side row label duplicate for large aircraft */}
                  <div style={{ 
                    color: '#bbb', 
                    textAlign: 'center', 
                    display:'flex', 
                    flexDirection:'column', 
                    alignItems:'center', 
                    gap:4,
                    borderBottom: rowIndex < grid.rowIds.length - 1 ? '1px solid #444' : 'none',
                    paddingBottom: rowIndex < grid.rowIds.length - 1 ? '8px' : '0',
                    marginBottom: rowIndex < grid.rowIds.length - 1 ? '8px' : '0'
                  }}>
                    <span>{String(r).padStart(2,'0')}</span>
                    {isExitRow(r) ? <span style={{ color:'#ffcc66', fontSize:10 }}>Exit</span> : null}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          <div style={{ color: '#bbb', marginBottom: 12 }}>This airline didn't return a seat map for this flight. Seat selection may be unavailable or only at check‑in.</div>
        </div>
      )}

      {/* Bottom sheet preview */}
      {previewId && grid.seats[previewId] && (
        <div onClick={closePreview} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex: 3000 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ position:'fixed', left:0, right:0, bottom:0, background:'#2a2a2a', borderTopLeftRadius:16, borderTopRightRadius:16, padding:'16px', zIndex: 3001, maxHeight:'70vh', overflowY:'auto', transform: sheetIn? 'translateY(0%)' : 'translateY(100%)', transition:'transform 200ms ease' }}>
            <div style={{ height:4, width:40, borderRadius:2, background:'#555', margin:'0 auto 12px' }}></div>
            {(() => {
              const s = grid.seats[previewId] as any;
              const price = s?.price as {units:number;nanos:number;currency:string}|null;
              const meta = s?.info || {};
              return (
                <>
                  <div style={{ color:'#fff', fontSize:20, fontWeight:700 }}>Seat {String(meta?.row||Number(previewId.slice(0,2))).padStart(2,'0')}{meta?.col||previewId.slice(-1)}</div>
                  <div style={{ color:'#9fd66f', marginTop:6, fontSize:18 }}>{fmtPriceObj(price)}</div>
                  <div style={{ color:'#ccc', marginTop:8, fontSize:14 }}>
                    {Array.isArray(meta?.columnDesc) && meta.columnDesc.join(' / ')}
                  </div>
                  {meta?.rawPriceBreakdown && (
                    <div style={{ color:'#bbb', marginTop:10, fontSize:12 }}>
                      Price breakdown: total {fmtPriceObj(price)}
                    </div>
                  )}
                  <div style={{ color:'#ccc', marginTop:12, fontSize:14 }}>Assign seat to</div>
                  <div style={{ color:'#fff', fontWeight:600, marginTop:4 }}>Traveler 1 (adult)</div>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 }}>
                    <button onClick={() => closePreview()} style={{ background:'#444', color:'#fff', border:'none', borderRadius:8, padding:'12px 16px', fontWeight:600 }}>Close</button>
                    <button onClick={() => { const can = eligibility.eligible && grid.seats[previewId]?.available; if (can) { assignSeat(previewId); closePreview(); } }} disabled={!(eligibility.eligible && grid.seats[previewId]?.available)} style={{ background: (eligibility.eligible && grid.seats[previewId]?.available) ? '#0071c2' : '#555', color:'#fff', border:'none', borderRadius:8, padding:'12px 20px', fontWeight:600, cursor: (eligibility.eligible && grid.seats[previewId]?.available) ? 'pointer' : 'not-allowed' }}>Assign</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="luggage-footer">
        <div className="price-box">
          <div className="price-label">{fmt(totalPerTraveller + selectedSeatsTotal)}</div>
          <div className="price-sub">{travellers} traveler{travellers>1?'s':''} · Seats {selected.length} {selectedSeatsTotal>0?`· +${currency} ${Math.round(selectedSeatsTotal).toLocaleString()}`:''}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="next-button" style={{ background:'#444' }} onClick={() => { setSelected([]); try { if (offerId) { localStorage.setItem(`seat_selection_${offerId}`, JSON.stringify([])); localStorage.setItem(`seat_selection_price_${offerId}`, JSON.stringify({})); } } catch {} }}>Clear selection</button>
        <button className="next-button" onClick={() => navigate(-1)}>Next</button>
        </div>
      </div>
      {/* dev debug overlay removed to avoid blocking clicks */}
    </div>
  );
};

export default SeatMap;


