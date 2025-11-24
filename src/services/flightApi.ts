// API конфигурация
import { getCache, setCache } from './cache';

// Простая клиентская защита от спама: троттлинг и дедупликация in-flight
const __rate_state: Record<string, number> = {};
const __inflight: Partial<Record<string, Promise<any>>> = {};

function throttleKey(key: string, minIntervalMs: number): boolean {
  const now = Date.now();
  const last = __rate_state[key] || 0;
  if (now - last < minIntervalMs) return true; // ещё рано
  __rate_state[key] = now;
  return false;
}
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api'
};

/*
API Documentation для searchFlights:

Обязательные параметры (*):
- fromId: String - From/Departure location Id (получить из searchDestination endpoint)
- toId: String - To/Arrival location Id (получить из searchDestination endpoint)  
- departDate: Date (yyyy-mm-dd) - Departure date

Опциональные параметры:
- returnDate: Date (yyyy-mm-dd) - Return date
- stops: Enum (none, 0, 1, 2) - Number of stops (default: none)
- pageNo: Number - Page number (default: 1)
- adults: Number - Adults 18+ (default: 1)
- children: String - Children ages format "age1,age2,age3" (example: "0,1,17")
- sort: Enum (BEST, CHEAPEST, FASTEST) - Sort order (default: BEST)
- cabinClass: Enum (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST) - Cabin class (default: ECONOMY)
- currency_code: String - Currency code (получить из getCurrency endpoint)

Пример запроса:
GET /api/v1/flights/searchFlights?fromId=BOM.AIRPORT&toId=DEL.AIRPORT&departDate=2024-10-25&stops=none&pageNo=1&adults=1&children=0,17&sort=BEST&cabinClass=ECONOMY&currency_code=AED
*/

// Типы данных
export interface Airport {
  id: string;
  type: 'AIRPORT' | 'CITY';
  name: string;
  code: string;
  city?: string;
  cityName: string;
  country: string;
  countryName: string;
}

export interface FlightSegment {
  departureAirport: Airport;
  arrivalAirport: Airport;
  departureTime: string;
  arrivalTime: string;
  legs: FlightLeg[];
  totalTime: number;
}

export interface FlightLeg {
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
    logo: string;
  }>;
  totalTime: number;
  flightStops: any[];
  departureTerminal?: string;
  arrivalTerminal?: string;
}

export interface FlightOffer {
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

export interface ApiResponse<T> {
  status: boolean;
  data: T;
}

export interface FlightSearchResponse {
  flightOffers: FlightOffer[];
  aggregation: {
    totalCount: number;
    airlines: Array<{
      name: string;
      logoUrl: string;
      iataCode: string;
      count: number;
    }>;
  };
}

// Функции API
export const searchFlights = async (
  originCode: string,
  destinationCode: string,
  departureDate: string,
  returnDate?: string,
  adults: number = 1,
  childrenAges?: string,
  cabinClass: string = 'ECONOMY',
  stops: 'none' | '0' | '1' | '2' = 'none',
  sort: 'BEST' | 'CHEAPEST' | 'FASTEST' = 'BEST',
  currencyCode: string = 'USD',
  pageNo: number = 1
): Promise<ApiResponse<FlightSearchResponse>> => {
  const throttleId = `sf:${originCode}:${destinationCode}:${departureDate}:${returnDate||''}:${adults}:${childrenAges||''}:${cabinClass}:${stops}:${sort}:${currencyCode}`;
  if (throttleKey(throttleId, 600) && __inflight[throttleId]) {
    return __inflight[throttleId] as any;
  }
  const cacheKey = `flights:${originCode}:${destinationCode}:${departureDate}:${returnDate||''}:${adults}:${childrenAges||''}:${cabinClass}:${stops}:${sort}:${currencyCode}:p${pageNo}`;
  // Флаг принудительного обновления (когда пользователь нажал Search)
  const force = (()=>{ try { return sessionStorage.getItem('flightResults_force_refresh') === '1'; } catch { return false; } })();
  // Жёсткий стоп: если выставлен freeze, отдаем снапшот без сети (но не при force)
  try {
    const freeze = sessionStorage.getItem('flightResults_freeze') === '1';
    if (freeze && !force) {
      const snapRaw = sessionStorage.getItem('flightResults_snapshot');
      if (snapRaw) {
        const snap = JSON.parse(snapRaw);
        // Строгая проверка: ключ снапшота должен совпадать по критическим параметрам
        try {
          const keyStr = String(snap?.key || '');
          const prefix = 'flightResults:';
          const queryStr = keyStr.startsWith(prefix) ? keyStr.slice(prefix.length) : keyStr;
          const sp = new URLSearchParams(queryStr);
          const matches = (
            sp.get('from') === originCode &&
            sp.get('to') === destinationCode &&
            sp.get('departDate') === departureDate &&
            (
              // Если в URL есть returnDate, он должен совпадать. Если его нет — аргумент тоже должен быть пустым
              (sp.has('returnDate') ? sp.get('returnDate') === (returnDate || '') : !returnDate)
            ) &&
            (sp.get('adults') ? sp.get('adults') === String(adults) : true) &&
            (sp.get('children') ? sp.get('children') === (childrenAges || '') : true) &&
            (sp.get('cabinClass') ? sp.get('cabinClass') === cabinClass : true) &&
            (sp.get('currency') ? sp.get('currency') === currencyCode : true) &&
            (sp.get('stops') ? sp.get('stops') === String(stops) : true) &&
            (sp.get('sort') ? sp.get('sort') === sort : true)
          );
          if (!matches) {
            sessionStorage.removeItem('flightResults_freeze');
            throw new Error('Snapshot key mismatch');
          }
        } catch {
          sessionStorage.removeItem('flightResults_freeze');
          throw new Error('Invalid snapshot key');
        }
        const resp: ApiResponse<FlightSearchResponse> = {
          status: true,
          data: {
            flightOffers: snap.flights || [],
            aggregation: { totalCount: snap.totalCount || (snap.flights?.length || 0), airlines: [] }
          } as any
        };
        // снимаем флаг freeze, чтобы не зависнуть навсегда
        sessionStorage.removeItem('flightResults_freeze');
        return resp;
      }
    }
  } catch {}
  if (!force) {
    const cached = getCache<ApiResponse<FlightSearchResponse>>(cacheKey, 10 * 60 * 1000);
    if (cached) return cached;
  }

  // Собираем строку запроса через URLSearchParams, чтобы не использовать new URL с относительным путём
  const params = new URLSearchParams();
  // Параметры запроса согласно документации API
  params.append('fromId', originCode);           // * String - From/Departure location Id
  params.append('toId', destinationCode);       // * String - To/Arrival location Id  
  params.append('departDate', departureDate);   // * Date (yyyy-mm-dd) - Departure date
  
  // Опциональные параметры
  if (returnDate) {
    params.append('returnDate', returnDate);    // Date (yyyy-mm-dd) - Return date
  }
  
  params.append('stops', String(stops));        // Enum: none, 0, 1, 2 - Number of stops
  params.append('pageNo', String(pageNo));      // Number - Page number (default: 1)
  params.append('adults', adults.toString());   // Number - Adults 18+ (default: 1)
  if (childrenAges && childrenAges.trim().length > 0) {
    params.append('children', childrenAges);    // String - ages comma-separated
  }
  params.append('sort', sort);                  // Enum: BEST, CHEAPEST, FASTEST
  params.append('cabinClass', cabinClass);      // Enum: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
  params.append('currency_code', currencyCode); // String - Currency code

  const base = API_CONFIG.baseUrl || '/api';
  const url = `${base}/flights/searchFlights?${params.toString()}`;

  const run = async (params: { omitReturn?: boolean } = {}) => {
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Мягкая обработка: если API вернул "NO_FLIGHTS_FOUND" — пробуем фоллбек без returnDate, потом отдаём пустой список
    const errCode = data?.data?.error?.code || data?.error?.code || '';
    if (errCode && /NO_FLIGHTS_FOUND/i.test(String(errCode))) {
      if (returnDate && !params.omitReturn) {
        // Повторяем запрос как one‑way
        const p2 = new URLSearchParams();
        p2.append('fromId', originCode);
        p2.append('toId', destinationCode);
        p2.append('departDate', departureDate);
        p2.append('stops', String(stops));
        p2.append('pageNo', String(pageNo));
        p2.append('adults', adults.toString());
        if (childrenAges && childrenAges.trim().length > 0) p2.append('children', childrenAges);
        p2.append('sort', sort);
        p2.append('cabinClass', cabinClass);
        p2.append('currency_code', currencyCode);
        const base2 = API_CONFIG.baseUrl || '/api';
        const url2 = `${base2}/flights/searchFlights?${p2.toString()}`;
        const r2 = await fetch(url2, { method: 'GET' });
        if (r2.ok) {
          const d2 = await r2.json();
          const e2 = d2?.data?.error?.code || d2?.error?.code || '';
          if (!e2) return d2;
        }
      }
      // Возвращаем пустой результат вместо исключения
      return { status: true, data: { flightOffers: [], aggregation: { totalCount: 0, airlines: [] } } } as any;
    }

    if (data.data && data.data.error) {
      throw new Error(`API Error: ${data.data.error.code}`);
    }

    try { setCache(cacheKey, data); } catch {}
    return data;
  };
  try {
    const p = run();
    __inflight[throttleId] = p;
    const res = await p;
    delete __inflight[throttleId];
    return res;
  } catch (e) {
    delete __inflight[throttleId];
    throw e;
  }
};

export const searchAirports = async (query: string): Promise<Airport[]> => {
  const q = (query || '').trim().toLowerCase();
  const cacheKey = `airports:${q}`;
  const cached = getCache<Airport[]>(cacheKey, 24 * 60 * 60 * 1000);
  if (cached) return cached;
  const params = new URLSearchParams();
  params.append('query', query);
  const base = API_CONFIG.baseUrl || '/api';
  const url = `${base}/flights/searchDestination?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const list = data.data || [];
    setCache(cacheKey, list);
    return list;
  } catch (error) {
    throw error as Error;
  }
};

// Geolocation-based currency
export const detectCurrencyByIP = async (): Promise<{ country?: string; currency?: string } | null> => {
  try {
    const resp = await fetch('https://ipapi.co/json/');
    if (!resp.ok) return null;
    const data = await resp.json();
    // ipapi returns currency like "USD", country_code, country_name
    return { country: data?.country_name, currency: data?.currency };
  } catch {
    return null;
  }
};

// Утилиты для форматирования
export const formatPrice = (units: number, nanos: number, currency: string = 'AED'): string => {
  const total = units + (nanos / 1000000000);
  return `${currency} ${Math.round(total).toLocaleString('en-US')}`;
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatDateTime = (isoString: string): { time: string; date: string } => {
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

export const getStopsText = (segments: FlightSegment[]): string => {
  const totalStops = segments.reduce((acc, segment) => {
    return acc + segment.legs.reduce((legAcc, leg) => legAcc + leg.flightStops.length, 0);
  }, 0);
  
  if (totalStops === 0) return 'Direct';
  if (totalStops === 1) return '1 stop';
  return `${totalStops} stops`;
};

// Multi-city search
export interface MultiLeg { fromId: string; toId: string; date: string }

export const searchFlightsMultiStops = async (
  legs: MultiLeg[],
  adults: number = 1,
  sort: 'BEST' | 'CHEAPEST' | 'FASTEST' = 'BEST',
  cabinClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST' = 'ECONOMY',
  currency: string = 'USD',
  pageNo: number = 1,
  childrenAges?: string
): Promise<ApiResponse<FlightSearchResponse>> => {
  const legsKey = JSON.stringify(legs);
  const cacheKey = `multi:${legsKey}:${adults}:${sort}:${cabinClass}:${currency}:p${pageNo}`;
  const force = (()=>{ try { return sessionStorage.getItem('flightResultsMulti_force_refresh') === '1'; } catch { return false; } })();
  if (!force) {
    const cached = getCache<ApiResponse<FlightSearchResponse>>(cacheKey, 10 * 60 * 1000);
    if (cached) return cached;
  }
  const params = new URLSearchParams();
  params.set('legs', legsKey);
  params.set('pageNo', String(pageNo));
  params.set('adults', String(adults));
  if (childrenAges && childrenAges.trim()) params.set('children', childrenAges);
  params.set('sort', sort);
  params.set('cabinClass', cabinClass);
  params.set('currency_code', currency);
  const base = API_CONFIG.baseUrl || '/api';
  const url = `${base}/flights/searchFlightsMultiStops?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
    });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  try { setCache(cacheKey, data); } catch {}
  return data;
};

// Seat map API
export interface SeatMapSeat {
  id: string;
  row: number;
  column: string;
  available: boolean;
  price?: { currencyCode: string; units: number; nanos: number } | null;
}

export interface SeatMapCabin {
  cabinClass: string;
  rows: number;
  columns: string[];
  seats: SeatMapSeat[];
}

export interface SeatMapResponse {
  cabins?: SeatMapCabin[];
}

export const getSeatMap = async (offerToken: string, currency: string = 'USD'): Promise<ApiResponse<SeatMapResponse> | any> => {
  // In-flight deduplication to prevent parallel duplicate requests
  const inflightKey = `seatmap:${offerToken}:${currency.toLowerCase()}`;
  // @ts-ignore
  if (!(window as any).__seat_inflight) { try { (window as any).__seat_inflight = {}; } catch {} }
  // @ts-ignore
  const inflight: Record<string, Promise<any>> = (window as any).__seat_inflight || {};
  if (inflight[inflightKey]) {
    return inflight[inflightKey];
  }
  // TTL cache (24h) to reduce API usage
  try {
    const cachedStr = sessionStorage.getItem(`seatmap_cache_${offerToken}`);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      const ttlMs = 24 * 60 * 60 * 1000;
      if (cached && cached.ts && Date.now() - cached.ts < ttlMs && cached.data) {
        return cached.data;
      }
    }
  } catch {}

  const params = new URLSearchParams();
  params.append('offerToken', offerToken);
  params.append('currency_code', currency.toLowerCase());
  const base = API_CONFIG.baseUrl || '/api';
  const requestUrl = `${base}/flights/getSeatMap?${params.toString()}`;
  const requestedAt = new Date().toISOString();

  let response: Response;
  try {
    const p = fetch(requestUrl, {
      method: 'GET',
    });
    // @ts-ignore
    (window as any).__seat_inflight[inflightKey] = p as any;
    response = await p;
  } catch (e) {
    // Network error: bubble up
    throw e;
  }

  if (!response.ok) {
    try { sessionStorage.setItem('seatmap_debug_last', JSON.stringify({ offerToken, requestUrl, requestedAt, status: response.status })); } catch {}
    if (response.status === 429) {
      try { sessionStorage.setItem('seatmap_rate_limited_until', String(Date.now() + 2 * 60 * 1000)); } catch {}
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  try {
    sessionStorage.setItem('seatmap_debug_last', JSON.stringify({ offerToken, requestUrl, requestedAt, status: 200 }));
    sessionStorage.setItem(`seatmap_cache_${offerToken}`, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
  (data as any)._debugRequestUrl = requestUrl;
  (data as any)._debugRequestedAt = requestedAt;
  try { // clear inflight
    // @ts-ignore
    if ((window as any).__seat_inflight) delete (window as any).__seat_inflight[inflightKey];
  } catch {}
  return data;
};
