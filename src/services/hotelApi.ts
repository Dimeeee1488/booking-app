// Hotel API service for booking.com integration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface HotelDestination {
  dest_id: string;
  dest_type: string;
  city_name: string;
  country: string;
  label: string;
  region: string;
  name: string;
  type: string;
  nr_hotels: number;
  cc1: string;
  latitude: number;
  longitude: number;
  hotels: number;
  roundtrip: string;
  image_url: string;
  // Additional computed fields
  displayName?: string;
  fullLocation?: string;
}

export interface HotelSearchResponse {
  status: boolean;
  message: string;
  timestamp: number;
  data: HotelDestination[];
}

// Search hotel destinations using booking.com API
export const searchHotelDestinations = async (query: string, signal?: AbortSignal): Promise<HotelDestination[]> => {
  try {
    console.log('Searching for hotels with query:', query);
    
    const response = await fetch(
      `${API_BASE_URL}/hotels/searchDestination?query=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        mode: 'cors',
        signal,
      }
    );

    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: HotelSearchResponse = await response.json();
    console.log('API response:', data);
    
    if (!data.status || !data.data) {
      console.log('No data in response');
      return [];
    }

    // Filter and format the results
    const filteredResults = data.data
      .filter((destination: any) => 
        destination.dest_type === 'city' || 
        destination.dest_type === 'landmark' ||
        destination.dest_type === 'region' ||
        destination.dest_type === 'district'
      )
      .slice(0, 8) // Limit to 8 results for better UX
      .map((destination: any) => ({
        ...destination,
        // Ensure we have a proper display name
        displayName: destination.label || destination.name || destination.city_name,
        // Add country info for better context
        fullLocation: destination.country ? 
          `${destination.city_name || destination.name}, ${destination.country}` : 
          destination.city_name || destination.name
      })) as HotelDestination[];

    console.log('Filtered results:', filteredResults);
    return filteredResults;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Hotel search aborted');
      throw error;
    }
    console.error('Error searching hotel destinations:', error);
    return [];
  }
};

// Cache for search results to avoid repeated API calls
const searchCache = new Map<string, { data: HotelDestination[]; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes to reduce API usage

// Persistent cache in sessionStorage to survive reloads
const STORAGE_KEY = 'hotel_dest_cache_v1';

// Load persisted cache on module init
(() => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, { data: HotelDestination[]; timestamp: number }>;
    for (const [k, v] of Object.entries(parsed)) {
      searchCache.set(k, v);
    }
  } catch {}
})();

export const searchHotelDestinationsCached = async (query: string, signal?: AbortSignal): Promise<HotelDestination[]> => {
  const cacheKey = query.toLowerCase().trim();
  const now = Date.now();
  if (cacheKey.length < 3) return [];
  
  // Check cache first - возвращаем кеш даже если он немного устарел
  const cached = searchCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  // Если есть старый кеш, используем его как fallback
  let fallbackCache: HotelDestination[] | null = null;
  if (cached) {
    fallbackCache = cached.data;
  }
  
  try {
    // If not in cache or expired, fetch from API
    const results = await searchHotelDestinations(query, signal);
    
    // Cache the results только если получили данные
    if (results.length > 0) {
      searchCache.set(cacheKey, {
        data: results,
        timestamp: now
      });
      try {
        // Persist most recent 50 entries
        const obj: Record<string, { data: HotelDestination[]; timestamp: number }> = {};
        let count = 0;
        // keep newest by iterating in reverse insertion order; Map preserves insertion
        const entries = Array.from(searchCache.entries()).slice(-50);
        for (const [k, v] of entries) { obj[k] = v; count++; if (count >= 50) break; }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      } catch {}
    }
    
    return results;
  } catch (error: any) {
    // При ошибке (429, 500 и т.д.) возвращаем кеш если он есть
    if (fallbackCache && fallbackCache.length > 0) {
      console.log('Using cached results due to API error:', error.message);
      return fallbackCache;
    }
    // Если кеша нет, возвращаем пустой массив
    return [];
  }
};
