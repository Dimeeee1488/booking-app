import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HotelDetailsLoadingAnimation from './components/HotelDetailsLoadingAnimation';
import HotelResultsLoadingAnimation from './components/HotelResultsLoadingAnimation';
import './HotelResults.css';
import { getPreferredLanguageCode, subscribeToPreferredLanguage } from './utils/language';
import { useTranslation } from './hooks/useTranslation';
import { calculatePromoDiscount, getPromoBadgeText } from './utils/promoUtils';

// Favorites storage utility
const FAVORITES_KEY = 'hotel_favorites';

interface FavoriteHotel {
  hotel_id: string;
  name: string;
  address: string;
  city: string;
  rating?: number;
  stars?: number;
  price?: number;
  currency?: string;
  photoUrl?: string;
  addedAt: number;
}

interface HotelProperty {
  hotel_id: number;
  property: {
    photoUrls?: string[];
    name: string;
    isPreferred?: boolean;
    reviewScore?: number;
    reviewScoreWord?: string;
    reviewCount?: number;
    accuratePropertyClass?: number;
    wishlistName?: string;
  };
  accessibilityLabel: string;
  priceBreakdown?: {
    grossPrice?: {
      value?: number;
      currency?: string;
      isTotal?: boolean; // true если цена уже включает все комнаты
    };
    strikethroughPrice?: {
      value?: number;
      isTotal?: boolean; // true если цена уже включает все комнаты
    };
    excludedPrice?: {
      value?: number;
      currency?: string;
    };
    benefitBadges?: Array<{
      text?: string;
      variant?: string;
    }>;
  };
  position?: number;
  destinationName?: string;
  cityName?: string;
}

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar' },
];

const getCacheKey = (params: any) => {
  return `hotel_search_${params.dest_id}_${params.arrival_date}_${params.departure_date}_${params.adults}_${params.children}_${params.rooms}_${params.currency}_${params.language || 'en-us'}`;
};

// Normalize different API schemas to our internal HotelProperty shape
const normalizeApiHotel = (raw: any, index: number): HotelProperty => {
  // Photo url candidates across schemas
  const photoUrl = raw?.property?.photoUrls?.[0]
    || raw?.main_photo_url
    || raw?.max_1440_photo_url
    || raw?.photoMainUrl
    || raw?.photo_url
    || '';

  // Name candidates
  const name = raw?.property?.name
    || raw?.hotel_name
    || raw?.hotel_name_trans
    || raw?.name
    || 'Hotel';

  // Ratings
  const reviewScore = raw?.property?.reviewScore ?? raw?.review_score;
  const reviewScoreWord = raw?.property?.reviewScoreWord ?? raw?.review_score_word;
  const reviewCount = raw?.property?.reviewCount ?? raw?.review_count ?? raw?.review_nr;
  const accuratePropertyClass = raw?.property?.accuratePropertyClass ?? raw?.class;

  // Price breakdown across schemas
  // ПРОБЛЕМА: API для списка и деталей может возвращать разные форматы цен
  // В списке: priceBreakdown.grossPrice.value обычно за одну комнату
  // В деталях: composite_price_breakdown.gross_amount.value уже включает все комнаты (room_qty передается в запрос)
  // РЕШЕНИЕ: В списке всегда используем priceBreakdown если есть, и умножаем на room_qty
  // В деталях используем composite_price_breakdown как есть (уже включает room_qty)
  
  // Приоритет: priceBreakdown > composite_price_breakdown > min_total_price
  const priceValue = raw?.priceBreakdown?.grossPrice?.value
    || raw?.property?.priceBreakdown?.grossPrice?.value
    || raw?.price_breakdown?.gross_price?.value
    || undefined;
  
  // composite_price_breakdown используем только если нет priceBreakdown
  // В списке результатов composite_price_breakdown обычно тоже за одну комнату
  const compositePrice = priceValue === undefined 
    ? (raw?.composite_price_breakdown?.gross_amount?.value || raw?.min_total_price)
    : undefined;

  // Сначала пробуем priceBreakdown.strikethroughPrice (обычно за одну комнату)
  const strikethroughValue = raw?.priceBreakdown?.strikethroughPrice?.value
    || raw?.property?.priceBreakdown?.strikethroughPrice?.value
    || raw?.price_breakdown?.strikethrough_price?.value
    || raw?.crossed_out_price
    || undefined;
  
  // composite_price_breakdown.strikethrough_amount используем только если нет priceBreakdown
  const compositeStrikethrough = strikethroughValue === undefined
    ? raw?.composite_price_breakdown?.strikethrough_amount?.value
    : undefined;

  const benefitBadges = (raw?.priceBreakdown?.benefitBadges)
    || (raw?.property?.priceBreakdown?.benefitBadges)
    || [];

  const excludedPrice = raw?.priceBreakdown?.excludedPrice
    || raw?.property?.priceBreakdown?.excludedPrice
    || undefined;
  if (raw?.is_genius_deal) benefitBadges.push({ text: 'Genius', variant: 'genius' });
  if (raw?.is_mobile_deal) benefitBadges.push({ text: 'Mobile-only price', variant: 'mobile' });

  const destinationName = raw?.destinationName || raw?.district || undefined;
  const cityName = raw?.cityName || raw?.city_name || raw?.city || undefined;
  const accessibilityLabel = raw?.accessibilityLabel || raw?.unit_configuration_label || '';

  return {
    hotel_id: Number(raw?.hotel_id || raw?.id || index),
    property: {
      photoUrls: photoUrl ? [String(photoUrl)] : [],
      name: String(name),
      isPreferred: !!raw?.property?.isPreferred || !!raw?.is_preferred,
      reviewScore: typeof reviewScore === 'number' ? reviewScore : undefined,
      reviewScoreWord: reviewScoreWord,
      reviewCount: typeof reviewCount === 'number' ? reviewCount : undefined,
      accuratePropertyClass: typeof accuratePropertyClass === 'number' ? accuratePropertyClass : undefined,
      wishlistName: raw?.wishlistName,
    },
    accessibilityLabel,
    priceBreakdown: (priceValue || compositePrice || strikethroughValue || benefitBadges.length > 0) ? {
      // ВАЖНО: В списке результатов API обычно возвращает цену за одну комнату
      // composite_price_breakdown в списке результатов тоже обычно за одну комнату
      // Поэтому НЕ помечаем compositePrice как isTotal, чтобы он умножился на количество комнат
      // Это обеспечит совпадение с деталями, где composite_price_breakdown уже включает все комнаты
      grossPrice: priceValue !== undefined
        ? { value: Number(priceValue), currency: raw?.currency_code } 
        : compositePrice !== undefined
          ? { value: Number(compositePrice), currency: raw?.currency_code || raw?.composite_price_breakdown?.gross_amount?.currency, isTotal: false }
          : undefined,
      strikethroughPrice: strikethroughValue !== undefined 
        ? { value: Number(strikethroughValue), isTotal: false } 
        : compositeStrikethrough !== undefined
          ? { value: Number(compositeStrikethrough), isTotal: false }
          : undefined,
      excludedPrice: excludedPrice ? { value: Number(excludedPrice.value), currency: excludedPrice.currency } : undefined,
      benefitBadges,
    } : undefined,
    position: raw?.position ?? index,
    destinationName,
    cityName,
  } as HotelProperty;
};

const HotelResults = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState<HotelProperty[]>([]);
  const [allHotels, setAllHotels] = useState<HotelProperty[]>([]);
  const [displayCount, setDisplayCount] = useState(10);
  const [showAllHotels, setShowAllHotels] = useState(true); // Показываем все отели по умолчанию
  const [filteredHotels, setFilteredHotels] = useState<HotelProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHotelDetails, setLoadingHotelDetails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [sortBy, setSortBy] = useState('recommended');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [filters, setFilters] = useState({
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minRating: undefined as number | undefined,
    stars: [] as number[],
    preferredOnly: false,
    mobileOnly: false,
  });
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const destId = searchParams.get('dest_id') || '';
  const searchType = searchParams.get('search_type') || 'CITY';
  const cityName = searchParams.get('city_name') || '';
  // coordinates no longer used
  const checkIn = searchParams.get('arrival_date') || '';
  const checkOut = searchParams.get('departure_date') || '';
  const adults = searchParams.get('adults') || '1';
  const children = searchParams.get('children_age') || '';
  const rooms = searchParams.get('room_qty') || '1';
  const currency = searchParams.get('currency_code') || 'AED';
  const [languageCode, setLanguageCode] = useState(getPreferredLanguageCode());

  useEffect(() => {
    const unsubscribe = subscribeToPreferredLanguage((language) => {
      setLanguageCode(language.code);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setSelectedCurrency(currency);
  }, [currency]);

  // Load favorites on component mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed: FavoriteHotel[] = JSON.parse(stored);
        const favoriteIds = new Set(parsed.map(fav => fav.hotel_id));
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, []);

  const searchKey = getCacheKey({ dest_id: destId, arrival_date: checkIn, departure_date: checkOut, adults, children, rooms, currency, language: languageCode });

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const cached = sessionStorage.getItem(searchKey);
        const cachedScrollPosition = sessionStorage.getItem(`${searchKey}_scroll`);
        const cachedDisplayCount = sessionStorage.getItem(`${searchKey}_displayCount`);
        
        if (cached) {
          const cachedData = JSON.parse(cached);
          const displayCountToUse = cachedDisplayCount ? parseInt(cachedDisplayCount) : displayCount;
          
          setAllHotels(cachedData);
          setHotels(cachedData.slice(0, displayCountToUse));
          setDisplayCount(displayCountToUse);
          setLoading(false);
          
          if (cachedScrollPosition) {
            setTimeout(() => {
              window.scrollTo(0, parseInt(cachedScrollPosition));
            }, 100);
          }
          return;
        }

        setLoading(true);
        
        // Правильно формируем параметры для детей
        const childrenParam = children ? `&children_age=${children}` : '';
        // Загружаем только первую страницу при первоначальном поиске
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const apiUrl = `${apiBaseUrl}/hotels/searchHotels?dest_id=${destId}&search_type=${searchType}&arrival_date=${checkIn}&departure_date=${checkOut}&adults=${adults}${childrenParam}&room_qty=${rooms}&page_number=1&page_size=100&units=metric&temperature_unit=c&languagecode=${languageCode}&currency_code=${currency}&location=US`;
        
        console.log('🔍 Hotel search parameters:', {
          destId,
          checkIn,
          checkOut,
          adults,
          children,
          rooms,
          currency,
          languageCode,
        });
        console.log('🌐 API URL:', apiUrl);
        console.log('📱 User Agent:', navigator.userAgent);
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('📱 Is Mobile:', isMobile);
        
        let finalApiUrl = apiUrl;
        
        // Добавляем таймаут для запроса (30 секунд)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
          const response = await fetch(finalApiUrl, {
            method: 'GET',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          console.log('Response status:', response.status);
          console.log('Response headers:', response.headers);
          console.log('Response ok:', response.ok);

          if (!response.ok) {
            console.error('API request failed:', response.status, response.statusText);
            throw new Error(`Failed to fetch hotels: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
        
          console.log('📊 API response:', data);
          console.log('✅ Response status:', data.status);
          console.log('📋 Response data:', data.data);
          
          if (data.status && data.data) {
          // В API byCoordinates данные лежат в data.result
          // Приводим к единому виду и нормализуем
          const rawList = Array.isArray(data.data?.hotels)
            ? data.data.hotels
            : Array.isArray(data.data?.result)
              ? data.data.result
              : (Array.isArray(data.data) ? data.data : []);

          // Детальная диагностика для London
          if (destId === '2280') {
            console.log('🏴󠁧󠁢󠁥󠁮󠁧󠁿 London data processing:');
            console.log('📋 Raw list length:', rawList.length);
            console.log('📋 Raw list type:', typeof rawList);
            console.log('📋 Raw list sample:', rawList.slice(0, 2));
            
            if (rawList.length === 0) {
              console.log('❌ London: No hotels in raw list');
              console.log('🔍 Data structure analysis:', {
                hasData: !!data.data,
                dataKeys: Object.keys(data.data || {}),
                hotelsKey: data.data?.hotels,
                resultKey: data.data?.result,
                otherKeys: Object.keys(data.data || {}).filter(key => key !== 'hotels' && key !== 'result')
              });
            }
          }
          
          const normalized: HotelProperty[] = rawList.map((item: any, idx: number) => normalizeApiHotel(item, idx));


          // Убираем дубликаты по hotel_id
          const uniqueHotels = normalized.filter((hotel, index, self) => 
            index === self.findIndex(h => h.hotel_id === hotel.hotel_id)
          );

          const hotelsWithPrice = uniqueHotels.filter(h => h.priceBreakdown?.grossPrice?.value);

          if (uniqueHotels.length > 0) {
            setAllHotels(uniqueHotels);
            // Кэшируем только если данных не слишком много
            try {
              if (uniqueHotels.length <= 1000) {
                sessionStorage.setItem(searchKey, JSON.stringify(uniqueHotels));
              } else {
              }
            } catch (error) {
            }
            // Always set hasMorePages to true initially to allow loading more
            setHasMorePages(true);
          } else {
            console.error('❌ No hotels found in response, trying cache fallback');
            const cached = sessionStorage.getItem(searchKey);
            if (cached) {
              try {
                const cachedData: HotelProperty[] = JSON.parse(cached);
                if (Array.isArray(cachedData) && cachedData.length > 0) {
                  setAllHotels(cachedData);
                  setHotels(cachedData.slice(0, displayCount));
                  setHasMorePages(false);
                  return;
                }
              } catch (parseErr) {
                console.error('Failed to parse cached hotels:', parseErr);
              }
            }
            setError('No hotels found for your search criteria.');
            setHasMorePages(false);
            setLoading(false);
          }
        } else {
          setError('Invalid response from server. Please try again.');
          setLoading(false);
          setHasMorePages(false);
        }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timeout. Please try again.');
          }
          throw fetchError;
        }
      } catch (err: any) {
        console.error('Error fetching hotels:', err);
        console.error('Error details:', {
          message: err?.message || 'Unknown error',
          stack: err?.stack,
          userAgent: navigator.userAgent,
          isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        });

        // Пытаемся использовать кеш как фолбэк при ошибке API/сети
        const cached = sessionStorage.getItem(searchKey);
        if (cached) {
          try {
            const cachedData: HotelProperty[] = JSON.parse(cached);
            if (Array.isArray(cachedData) && cachedData.length > 0) {
              console.warn('Using cached hotels due to fetch error');
              setAllHotels(cachedData);
              setHotels(cachedData.slice(0, displayCount));
              setHasMorePages(false);
              const errorMessage = err?.name === 'AbortError' 
                ? 'Request timeout. Showing previously loaded hotels.'
                : 'Unable to refresh hotels. Showing previously loaded results.';
              setError(errorMessage);
              return;
            }
          } catch (parseErr) {
            console.error('Failed to parse cached hotels in error handler:', parseErr);
          }
        }

        const errorMessage = err?.name === 'AbortError' 
          ? 'Request timeout. Please try again.' 
          : `Failed to load hotels. Please try again. Error: ${err?.message || 'Load failed'}`;
        setError(errorMessage);
        setHasMorePages(false);
        // Если кеша нет, очищаем чтобы явно показать отсутствие результатов
        setAllHotels([]);
        setHotels([]);
      } finally {
        setLoading(false);
      }
    };

    if (destId && checkIn && checkOut) {
      fetchHotels();
    }
  }, [destId, checkIn, checkOut, adults, children, rooms, currency, searchKey, displayCount, languageCode]);

  // Helper to get numeric values safely
  const getHotelPrice = (h: HotelProperty): number | undefined => {
    return h.priceBreakdown?.grossPrice?.value !== undefined
      ? Number(h.priceBreakdown?.grossPrice?.value)
      : undefined;
  };

  const getHotelStars = (h: HotelProperty): number => Number(h.property?.accuratePropertyClass || 0);
  const getHotelRating = (h: HotelProperty): number => Number(h.property?.reviewScore || 0);

  const applyFiltersAndSorting = () => {
    // 1) Filter
    let list = allHotels.filter((h) => {
      const price = getHotelPrice(h);
      if (filters.minPrice !== undefined && (price === undefined || price < filters.minPrice)) return false;
      if (filters.maxPrice !== undefined && (price === undefined || price > filters.maxPrice)) return false;
      if (filters.minRating !== undefined && getHotelRating(h) < filters.minRating) return false;
      if (filters.stars.length > 0 && !filters.stars.includes(getHotelStars(h))) return false;
      if (filters.preferredOnly && !h.property?.isPreferred) return false;
      if (filters.mobileOnly && !(h.priceBreakdown?.benefitBadges || []).some(b => (b.text || '').toLowerCase().includes('mobile'))) return false;
      return true;
    });

    // 2) Sort
    const sortKey = sortBy;
    list = [...list].sort((a, b) => {
      const priceA = getHotelPrice(a) ?? Number.POSITIVE_INFINITY;
      const priceB = getHotelPrice(b) ?? Number.POSITIVE_INFINITY;
      const ratingA = getHotelRating(a);
      const ratingB = getHotelRating(b);
      const starsA = getHotelStars(a);
      const starsB = getHotelStars(b);
      switch (sortKey) {
        case 'price_low':
          return priceA - priceB;
        case 'price_high':
          return priceB - priceA;
        case 'rating':
          return ratingB - ratingA;
        case 'stars':
          return starsB - starsA;
        default:
          return 0;
      }
    });

    setFilteredHotels(list);
    setHotels(list); // Всегда показываем все отели
  };

  useEffect(() => {
    applyFiltersAndSorting();
  }, [allHotels, sortBy, filters]);

  // Update displayed hotels when filteredHotels changes
  useEffect(() => {
    if (filteredHotels.length > 0) {
      setHotels(filteredHotels); // Всегда показываем все отели
    }
  }, [filteredHotels]);

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`${searchKey}_scroll`, window.scrollY.toString());
      sessionStorage.setItem(`${searchKey}_displayCount`, displayCount.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchKey, displayCount]);

  const loadMoreHotels = async () => {
    
    if (loadingMore) {
      return;
    }
    
    // Принудительно обновляем hasMorePages перед загрузкой
    setHasMorePages(true);
    setLoadingMore(true);
    
    try {
      // Загружаем только одну страницу за раз
      const nextPage = currentPage + 1;
      
      const childrenParam = children ? `&children_age=${children}` : '';
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const apiUrl = `${apiBaseUrl}/hotels/searchHotels?dest_id=${destId}&search_type=${searchType}&arrival_date=${checkIn}&departure_date=${checkOut}&adults=${adults}${childrenParam}&room_qty=${rooms}&page_number=${nextPage}&page_size=100&units=metric&temperature_unit=c&languagecode=${languageCode}&currency_code=${currency}&location=US`;
      
      // Добавляем таймаут для запроса (30 секунд)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch more hotels: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.status && data.data) {
          const rawList = Array.isArray(data.data?.hotels)
            ? data.data.hotels
            : Array.isArray(data.data?.result)
              ? data.data.result
              : (Array.isArray(data.data) ? data.data : []);

          if (rawList.length === 0) {
            setHasMorePages(false);
            alert('Все отели загружены!');
          } else {
            const newHotels: HotelProperty[] = rawList.map((item: any, idx: number) => normalizeApiHotel(item, idx));
            
            // Добавляем новые отели к существующим, избегая дубликатов
            setAllHotels(prev => {
              const existingIds = new Set(prev.map(hotel => hotel.hotel_id));
              const uniqueNewHotels = newHotels.filter(hotel => !existingIds.has(hotel.hotel_id));
              
              // Дополнительная проверка на дубликаты внутри новых отелей
              const finalUniqueHotels = uniqueNewHotels.filter((hotel, index, self) => 
                index === self.findIndex(h => h.hotel_id === hotel.hotel_id)
              );
              
              const updated = [...prev, ...finalUniqueHotels];
              // Обновляем кэш только если данных не слишком много
              try {
                if (updated.length <= 1000) { // Ограничиваем кэш до 1000 отелей
                  sessionStorage.setItem(searchKey, JSON.stringify(updated));
                }
              } catch (error) {
              }
              return updated;
            });
            setCurrentPage(nextPage);
            
            // Просто обновляем отображаемые отели
            setAllHotels(currentAllHotels => {
              // Применяем фильтры и сортировку к обновленному списку
              let list = currentAllHotels.filter((h) => {
                const price = getHotelPrice(h);
                if (filters.minPrice !== undefined && (price === undefined || price < filters.minPrice)) return false;
                if (filters.maxPrice !== undefined && (price === undefined || price > filters.maxPrice)) return false;
                if (filters.minRating !== undefined && getHotelRating(h) < filters.minRating) return false;
                if (filters.stars.length > 0 && !filters.stars.includes(getHotelStars(h))) return false;
                if (filters.preferredOnly && !h.property?.isPreferred) return false;
                if (filters.mobileOnly && !(h.priceBreakdown?.benefitBadges || []).some(b => (b.text || '').toLowerCase().includes('mobile'))) return false;
                return true;
              });

              // Сортируем
              const sortKey = sortBy;
              list = [...list].sort((a, b) => {
                const priceA = getHotelPrice(a) ?? Number.POSITIVE_INFINITY;
                const priceB = getHotelPrice(b) ?? Number.POSITIVE_INFINITY;
                const ratingA = getHotelRating(a);
                const ratingB = getHotelRating(b);
                const starsA = getHotelStars(a);
                const starsB = getHotelStars(b);
                switch (sortKey) {
                  case 'price_low':
                    return priceA - priceB;
                  case 'price_high':
                    return priceB - priceA;
                  case 'rating':
                    return ratingB - ratingA;
                  case 'stars':
                    return starsB - starsA;
                  default:
                    return 0;
                }
              });

              setFilteredHotels(list);
              setHotels(list);
              
              return currentAllHotels;
            });
          
            // Всегда оставляем возможность загрузить еще больше отелей
            setHasMorePages(true);
          }
        } else {
          setHasMorePages(false);
        }
      } catch (fetchErrorInner: any) {
        clearTimeout(timeoutId);
        if (fetchErrorInner.name === 'AbortError') {
          throw new Error('Request timeout. Please try again.');
        }
        throw fetchErrorInner;
      }
    } catch (error: any) {
      console.error('Error loading more hotels:', error);
      const errorMessage = error?.name === 'AbortError' 
        ? 'Request timeout. Please try again.' 
        : `Failed to load more hotels. Please try again. Error: ${error?.message || 'Unknown error'}`;
      setError(errorMessage);
      setHasMorePages(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleHotelClick = (hotel: HotelProperty) => {
    setLoadingHotelDetails(true);
    setTimeout(() => {
      // Cache selected hotel to avoid extra API request on details page
      const selKey = `selected_hotel_${hotel.hotel_id}_${checkIn}_${checkOut}_${currency}_${adults}_${children}_${rooms}`;
      try {
        sessionStorage.setItem(selKey, JSON.stringify(hotel));
      } catch {}
      navigate(`/hotel-details?hotel_id=${hotel.hotel_id}&arrival_date=${checkIn}&departure_date=${checkOut}&adults=${adults}&children_age=${children}&room_qty=${rooms}&currency_code=${currency}`);
    }, 100);
  };

  const toggleFavorite = (hotel: HotelProperty, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent hotel click
    
    try {
      const hotelId = hotel.hotel_id.toString();
      const stored = localStorage.getItem(FAVORITES_KEY);
      let favoritesList: FavoriteHotel[] = stored ? JSON.parse(stored) : [];
      
      const isFavorite = favorites.has(hotelId);
      
      if (isFavorite) {
        // Remove from favorites
        favoritesList = favoritesList.filter(fav => fav.hotel_id !== hotelId);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(hotelId);
          return newSet;
        });
      } else {
        // Add to favorites
        const favoriteHotel: FavoriteHotel = {
          hotel_id: hotelId,
          name: hotel.property?.name || 'Hotel',
          address: hotel.destinationName || hotel.cityName || '',
          city: hotel.cityName || '',
          rating: hotel.property?.reviewScore,
          stars: hotel.property?.accuratePropertyClass,
          price: getHotelPrice(hotel),
          currency: currency,
          photoUrl: hotel.property?.photoUrls?.[0],
          addedAt: Date.now(),
        };
        
        favoritesList.push(favoriteHotel);
        setFavorites(prev => new Set([...prev, hotelId]));
      }
      
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoritesList));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setSelectedCurrency(newCurrency);
    const params = new URLSearchParams(searchParams);
    params.set('currency_code', newCurrency);
    setSearchParams(params);
    setShowCurrencyModal(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatDateRange = () => {
    if (!checkIn || !checkOut) return '';
    return `${formatDate(checkIn)} - ${formatDate(checkOut)}`;
  };

  const formatGuestsAndRooms = () => {
    const adultsCount = parseInt(adults) || 1;
    const childrenCount = children ? children.split(',').length : 0;
    const roomsCount = parseInt(rooms) || 1;
    
    let result = `${adultsCount} adult${adultsCount > 1 ? 's' : ''}`;
    
    if (childrenCount > 0) {
      result += ` · ${childrenCount} child${childrenCount > 1 ? 'ren' : ''}`;
    }
    
    result += ` · ${roomsCount} room${roomsCount > 1 ? 's' : ''}`;
    
    return result;
  };

  const renderStars = (count: number) => {
    return '⭐'.repeat(count);
  };

  const getCurrencySymbol = (code: string) => {
    const curr = CURRENCIES.find(c => c.code === code);
    return curr?.symbol || code + ' ';
  };

  if (loading) {
    return <HotelResultsLoadingAnimation />;
  }

  if (loadingHotelDetails) {
    return <HotelDetailsLoadingAnimation />;
  }

  if (error) {
    return (
      <div className="hotel-results">
        <div className="hotel-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="header-info">
            <h1 className="city-name">{t('hotels')}</h1>
          </div>
        </div>
        <div className="error-message">
          <p>{error}</p>
          <button className="retry-btn" onClick={() => window.location.reload()}>
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hotel-results">
      {/* Header */}
      <div className="hotel-header">
        <div
          className="header-info clickable-title"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/'); }}
          title="Go to Home"
        >
          <h1 className="city-name">{cityName || 'Hotels'}</h1>
          <p className="date-range">{formatDateRange()}</p>
          <p className="guests-rooms">{formatGuestsAndRooms()}</p>
        </div>
      </div>

      {/* Action Buttons: Sort, Filter, Map */}
      <div className="action-bar">
        <button className="action-btn" onClick={() => setShowSortModal(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 7h6M3 12h12M3 17h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>{t('sort')}</span>
        </button>
        
        <button className="action-btn" onClick={() => setShowFiltersModal(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>{t('filter')}</span>
        </button>
        
        {/* Map button removed to avoid extra UI and API usage */}
      </div>

      {/* Properties Count (use meta title if available in cache) */}
      <div className="properties-count">
        {allHotels.length} {t('properties')}
      </div>

      {/* Hotel Cards */}
      <div className="hotel-list">
        {hotels.length === 0 ? (
          <div className="no-results">
            <p>{t('noHotelsFound')}</p>
            <button className="retry-btn" onClick={() => navigate(-1)}>
              {t('modifySearch')}
            </button>
          </div>
        ) : (
          <>
            {hotels.map((hotel, index) => {
              const price = hotel.priceBreakdown?.grossPrice?.value;
              const strikePrice = hotel.priceBreakdown?.strikethroughPrice?.value;
              const rawPhoto = hotel.property?.photoUrls?.[0] || '';
              const photoUrl = rawPhoto ? rawPhoto.replace('square60', 'max300') : '';
              const isGenius = (hotel.property?.wishlistName || '').toLowerCase().includes('genius');
              const benefitBadges = hotel.priceBreakdown?.benefitBadges || [];
              
              // Создаем уникальный ключ, комбинируя hotel_id и индекс
              const uniqueKey = `${hotel.hotel_id}_${index}`;
              
              return (
                <div
                  key={uniqueKey}
                  className="hotel-card"
                  onClick={() => handleHotelClick(hotel)}
                >
                  {/* Left: Photo */}
                  <div className="hotel-image-wrapper">
                    {photoUrl ? (
                      <img src={photoUrl} alt={hotel.property?.name || 'Hotel'} className="hotel-image" />
                    ) : (
                      <div className="hotel-image-placeholder">🏨</div>
                    )}
                    {/* Heart icon for favorites */}
                    <button 
                      className={`favorite-btn ${favorites.has(hotel.hotel_id.toString()) ? 'favorited' : ''}`}
                      onClick={(e) => toggleFavorite(hotel, e)}
                      title={favorites.has(hotel.hotel_id.toString()) ? t('removeFromFavorites') : t('addToFavorites')}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                  </div>
                  
                  {/* Right: Info and Price */}
                  <div className="hotel-info">
                    <div className="hotel-info-left">
                      <h3 className="hotel-name">{hotel.property?.name || 'Hotel'}</h3>
                      
                      {hotel.property?.accuratePropertyClass && (
                        <div className="hotel-stars">
                          {renderStars(hotel.property?.accuratePropertyClass || 0)}
                        </div>
                      )}
                      
                      {hotel.property?.reviewScore && (
                        <div className="hotel-rating-row">
                          <div className="rating-badge">{hotel.property?.reviewScore?.toFixed(1)}</div>
                          <div className="rating-info">
                            <span className="rating-word">{hotel.property?.reviewScoreWord}</span>
                            {hotel.property?.reviewCount && (
                              <span className="rating-sep"> · </span>
                            )}
                            {hotel.property?.reviewCount && (
                              <span className="rating-count">{hotel.property?.reviewCount?.toLocaleString()} {t('reviews')}</span>
                            )}
                          </div>
                        </div>
                      )}
                    
                      {(hotel.destinationName || hotel.cityName) && (
                        <div className="hotel-location">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z" stroke="currentColor" strokeWidth="2"/>
                            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          <span>{hotel.destinationName || hotel.cityName}</span>
                        </div>
                      )}
                      
                      {(isGenius || benefitBadges.length > 0 || hotel.property?.isPreferred) && (
                        <div className="hotel-badges">
                          {hotel.property?.isPreferred && (
                            <span className="hotel-badge" style={{ background:'#2a2a2a', border:'1px solid #3a3a3a' }}>Preferred</span>
                          )}
                          {isGenius && (
                            <span className="hotel-badge badge-genius">Genius</span>
                          )}
                          {benefitBadges.slice(0, 1).map((badge, idx) => (
                            <span key={idx} className="hotel-badge badge-mobile">
                              {badge.text}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="hotel-room-info">
                        <div className="room-type">
                          {hotel.accessibilityLabel?.includes('shared') ? 'Room with shared bathroom' : 'Standard Room'}
                        </div>
                        <div className="room-beds">
                          {parseInt(rooms) > 1 ? `${rooms} ${t('rooms')}` : `1 ${t('room')}`} · {hotel.roomType || t('standardRoom')}
                        </div>
                      </div>
                      
                      {/* Price information - на мобильных внизу, на десктопе справа */}
                      <div className="hotel-price-bottom hotel-price-mobile">
                        {(() => {
                          const nights = checkIn && checkOut ? 
                            Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))) : 1;
                          const roomsCount = parseInt(rooms) || 1;
                          // Проверяем, является ли цена общей (уже включает все комнаты) или за одну комнату
                          const isTotalPrice = (hotel.priceBreakdown?.grossPrice as any)?.isTotal === true;
                          const basePrice = typeof price === 'number' && !isNaN(price) ? price : null;
                          // Если цена общая, используем как есть; если за одну комнату, умножаем на количество комнат
                          const originalTotal = basePrice ? (isTotalPrice ? basePrice : basePrice * roomsCount) : null;
                          
                          // Apply promo discounts
                          let promoDiscount = null;
                          let totalForRooms = originalTotal;
                          let perNightForRooms = null;
                          
                          if (originalTotal && nights > 0) {
                            promoDiscount = calculatePromoDiscount({
                              basePrice: originalTotal,
                              nights,
                              currency,
                            });
                            totalForRooms = promoDiscount.discountedPrice;
                            const effectiveNights = nights - promoDiscount.freeNights;
                            perNightForRooms = effectiveNights > 0 ? Number((totalForRooms / effectiveNights).toFixed(2)) : null;
                          }

                          const promoBadgeText = promoDiscount ? getPromoBadgeText(promoDiscount.appliedPromos) : '';

                          return (
                            <>
                              <div className="price-duration-info">
                                {nights} night{nights > 1 ? 's' : ''}, {adults} adult{adults > '1' ? 's' : ''}
                                {roomsCount > 1 && (
                                  <span className="rooms-count"> · {roomsCount} {t('rooms')}</span>
                                )}
                              </div>
                              
                              {/* Promo badge */}
                              {promoBadgeText && (
                                <div className="promo-badge">
                                  <span className="promo-badge-text">{promoBadgeText}</span>
                                </div>
                              )}
                              
                              {/* Original price (strikethrough) */}
                              {promoDiscount && originalTotal && (
                                <div className="price-strike promo-strike">
                                  {getCurrencySymbol(currency)} {originalTotal.toFixed(2)}
                                </div>
                              )}
                              
                              {/* Discounted price */}
                              <div className={totalForRooms ? "price-main promo-price" : "price-main no-price"}>
                                {totalForRooms ? (
                                  <>
                                    {getCurrencySymbol(currency)} {totalForRooms.toFixed(2)}
                                    {roomsCount > 1 && (
                                      <span className="price-for-rooms"> {t('forRooms')} {roomsCount} {t('rooms')}</span>
                                    )}
                                  </>
                                ) : (
                                  <>{t('seeAvailability')}</>
                                )}
                              </div>
                              
                              {/* Price per night */}
                              <div className="price-per-night">
                                {perNightForRooms ? (
                                  <>
                                    {getCurrencySymbol(currency)} {perNightForRooms.toFixed(2)} {t('perNight')}
                                    {promoDiscount?.freeNights > 0 && (
                                      <span className="promo-nights-info"> · {promoDiscount.freeNights} {t('nightsFree') || 'nights free'}</span>
                                    )}
                                  </>
                                ) : '—'}
                                {roomsCount > 1 && perNightForRooms && (
                                  <span className="per-night-rooms"> {t('forRooms')} {roomsCount} {t('rooms')}</span>
                                )}
                              </div>
                              
                              {/* Savings info - показываем 35% скидку и 2 ночи бесплатно отдельно */}
                              {promoDiscount && promoDiscount.discountAmount > 0 && (
                                <div className="promo-savings">
                                  <div>{t('youSave') || 'You save'} {getCurrencySymbol(currency)} {promoDiscount.discountAmount.toFixed(2)}</div>
                                  <div style={{ fontSize: '0.9em', marginTop: 2, opacity: 0.9 }}>
                                    {promoDiscount.promoDiscountPercent || 45}% {t('discount') || 'discount'}
                                    {promoDiscount.freeNights > 0 && ` + ${promoDiscount.freeNights} ${t('nightsFree') || 'nights free'}`}
                                  </div>
                                </div>
                              )}
                              
                              {hotel.priceBreakdown?.excludedPrice?.value && (
                                <div className="price-per-night">
                                  + {getCurrencySymbol(hotel.priceBreakdown?.excludedPrice?.currency || currency)} {Number(((hotel.priceBreakdown?.excludedPrice?.value || 0) * roomsCount).toFixed(2)).toFixed(2)} {t('taxesAndCharges')}
                                </div>
                              )}
                              <div className="price-note">{t('includesTaxesAndFees')}</div>
                              {benefitBadges.some(b => b.text?.toLowerCase().includes('child')) && (
                                <div className="badge-free-child">🍃 {t('freeStayForChild')}</div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Price Section - Desktop: справа */}
                    <div className="hotel-price-right">
                      {(() => {
                        const nights = checkIn && checkOut ? 
                          Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))) : 1;
                        const roomsCount = parseInt(rooms) || 1;
                        const isTotalPrice = (hotel.priceBreakdown?.grossPrice as any)?.isTotal === true;
                        const basePrice = typeof price === 'number' && !isNaN(price) ? price : null;
                        const originalTotal = basePrice ? (isTotalPrice ? basePrice : basePrice * roomsCount) : null;
                        
                        let promoDiscount = null;
                        let totalForRooms = originalTotal;
                        let perNightForRooms = null;
                        
                        if (originalTotal && nights > 0) {
                          promoDiscount = calculatePromoDiscount({
                            basePrice: originalTotal,
                            nights,
                            currency,
                          });
                          totalForRooms = promoDiscount.discountedPrice;
                          const effectiveNights = nights - promoDiscount.freeNights;
                          perNightForRooms = effectiveNights > 0 ? Number((totalForRooms / effectiveNights).toFixed(2)) : null;
                        }

                        const promoBadgeText = promoDiscount ? getPromoBadgeText(promoDiscount.appliedPromos) : '';

                        return (
                          <>
                            <div className="price-duration-info">
                              {nights} night{nights > 1 ? 's' : ''}, {adults} adult{adults > '1' ? 's' : ''}
                              {roomsCount > 1 && (
                                <span className="rooms-count"> · {roomsCount} {t('rooms')}</span>
                              )}
                            </div>
                            
                            {promoBadgeText && (
                              <div className="promo-badge">
                                <span className="promo-badge-text">{promoBadgeText}</span>
                              </div>
                            )}
                            
                            {promoDiscount && originalTotal && (
                              <div className="price-strike promo-strike">
                                {getCurrencySymbol(currency)} {originalTotal.toFixed(2)}
                              </div>
                            )}
                            
                            <div className={totalForRooms ? "price-main promo-price" : "price-main no-price"}>
                              {totalForRooms ? (
                                <>
                                  {getCurrencySymbol(currency)} {totalForRooms.toFixed(2)}
                                  {roomsCount > 1 && (
                                    <span className="price-for-rooms"> {t('forRooms')} {roomsCount} {t('rooms')}</span>
                                  )}
                                </>
                              ) : (
                                <>{t('seeAvailability')}</>
                              )}
                            </div>
                            
                            <div className="price-per-night">
                              {perNightForRooms ? (
                                <>
                                  {getCurrencySymbol(currency)} {perNightForRooms.toFixed(2)} {t('perNight')}
                                  {promoDiscount?.freeNights > 0 && (
                                    <span className="promo-nights-info"> · {promoDiscount.freeNights} {t('nightsFree') || 'nights free'}</span>
                                  )}
                                </>
                              ) : '—'}
                            </div>
                            
                            {promoDiscount && promoDiscount.discountAmount > 0 && (
                              <div className="promo-savings">
                                <div>{t('youSave') || 'You save'} {getCurrencySymbol(currency)} {promoDiscount.discountAmount.toFixed(2)}</div>
                                <div style={{ fontSize: '0.9em', marginTop: 2, opacity: 0.9 }}>
                                  {promoDiscount.promoDiscountPercent || 45}% {t('discount') || 'discount'}
                                  {promoDiscount.freeNights > 0 && ` + ${promoDiscount.freeNights} ${t('nightsFree') || 'nights free'}`}
                                </div>
                              </div>
                            )}
                            
                            {hotel.priceBreakdown?.excludedPrice?.value && (
                              <div className="price-per-night">
                                + {getCurrencySymbol(hotel.priceBreakdown?.excludedPrice?.currency || currency)} {Number(((hotel.priceBreakdown?.excludedPrice?.value || 0) * roomsCount).toFixed(2)).toFixed(2)} {t('taxesAndCharges')}
                              </div>
                            )}
                            <div className="price-note">{t('includesTaxesAndFees')}</div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Show more button */}
            {hasMorePages && (
              <div className="load-more-wrapper">
                <button 
                  className="load-more-btn" 
                  onClick={loadMoreHotels}
                  disabled={loadingMore}
                >
                  {loadingMore ? t('loading') : t('showMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filters Modal - client-side */}
      {showFiltersModal && (
        <div className="modal-overlay" onClick={() => setShowCurrencyModal(false)}>
          <div className="currency-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('filter')}</h3>
              <button className="close-btn" onClick={() => setShowFiltersModal(false)}>×</button>
            </div>
            <div className="currency-list">
              <div className="currency-item">
                <div className="currency-info">
                  <div className="currency-text">
                    <span className="currency-code">{t('priceRange')}</span>
                    <span className="currency-name">{t('min')} / {t('max')}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="number" placeholder={t('min')} style={{ width:90 }}
                         onChange={(e)=> setFilters(f => ({...f, minPrice: e.target.value ? Number(e.target.value) : undefined}))} />
                  <input type="number" placeholder={t('max')} style={{ width:90 }}
                         onChange={(e)=> setFilters(f => ({...f, maxPrice: e.target.value ? Number(e.target.value) : undefined}))} />
                </div>
              </div>

              <div className="currency-item" onClick={()=> setFilters(f => ({...f, preferredOnly: !f.preferredOnly}))}>
                <div className="currency-info">
                  <div className="currency-text">
                    <span className="currency-code">{t('preferredOnly')}</span>
                  </div>
                </div>
                {filters.preferredOnly && <span className="check-icon">✓</span>}
              </div>

              <div className="currency-item" onClick={()=> setFilters(f => ({...f, mobileOnly: !f.mobileOnly}))}>
                <div className="currency-info">
                  <div className="currency-text">
                    <span className="currency-code">{t('mobileOnlyDeals')}</span>
                  </div>
                </div>
                {filters.mobileOnly && <span className="check-icon">✓</span>}
              </div>

              <div className="currency-item">
                <div className="currency-info">
                  <div className="currency-text">
                    <span className="currency-code">{t('minimumRating')}</span>
                  </div>
                </div>
                <select defaultValue="" onChange={(e)=> setFilters(f => ({...f, minRating: e.target.value ? Number(e.target.value) : undefined}))}>
                  <option value="">{t('any')}</option>
                  <option value="9">9+</option>
                  <option value="8">8+</option>
                  <option value="7">7+</option>
                  <option value="6">6+</option>
                </select>
              </div>

              <div className="currency-item">
                <div className="currency-info">
                  <div className="currency-text">
                    <span className="currency-code">{t('stars')}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {[5,4,3,2,1].map(s => (
                    <button key={s} onClick={(e)=> { e.stopPropagation(); setFilters(f => ({...f, stars: f.stars.includes(s) ? f.stars.filter(x=>x!==s) : [...f.stars, s]})); }}
                            style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #444', background: filters.stars.includes(s)?'#003b95':'transparent', color:'#fff' }}>{s}★</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sort Modal */}
      {showSortModal && (
        <div className="modal-overlay" onClick={() => setShowSortModal(false)}>
          <div className="sort-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('sortBy')}</h3>
              <button className="close-btn" onClick={() => setShowSortModal(false)}>×</button>
            </div>
            <div className="sort-list">
              {[
                { value: 'recommended', label: t('ourTopPicks') },
                { value: 'price_low', label: t('priceLowestFirst') },
                { value: 'price_high', label: t('priceHighestFirst') },
                { value: 'rating', label: t('guestRating') },
                { value: 'stars', label: t('starRating') },
              ].map((option) => (
                <div
                  key={option.value}
                  className={`sort-item ${sortBy === option.value ? 'selected' : ''}`}
                  onClick={() => { setSortBy(option.value); setShowSortModal(false); }}
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && <span className="check-icon">✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Survey removed from results per request */}
    </div>
  );
};

export default HotelResults;
