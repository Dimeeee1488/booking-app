import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './AttractionsResults.css';
import AttractionResultsLoadingAnimation from './components/AttractionResultsLoadingAnimation';

interface AttractionProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  representativePrice: {
    chargeAmount: number;
    currency: string;
    publicAmount: number;
  };
  primaryPhoto: {
    small: string;
  };
  reviewsStats: {
    allReviewsCount: number;
    percentage: string;
    combinedNumericStats: {
      average: number;
      total: number;
    };
  } | null;
  cancellationPolicy: {
    hasFreeCancellation: boolean;
  };
  flags: Array<{
    flag: string;
    value: boolean;
    rank: number;
  }>;
}

interface AttractionsResultsCachePayload {
  timestamp: number;
  attractions: AttractionProduct[];
  totalPages: number;
}

const resolveApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

const AttractionsResults: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [attractions, setAttractions] = React.useState<AttractionProduct[]>([]);
  const [filteredAttractions, setFilteredAttractions] = React.useState<AttractionProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState('trending');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [showFiltersModal, setShowFiltersModal] = React.useState(false);
  const [showSortModal, setShowSortModal] = React.useState(false);
  const [filters, setFilters] = React.useState({
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minRating: undefined as number | undefined,
    freeCancellation: false,
    bestseller: false,
  });

  const locationId = searchParams.get('id');
  const locationName = searchParams.get('name') || 'Attractions';
  const date = searchParams.get('date');

  console.log('AttractionsResults - URL params:', { locationId, locationName, date });
  
  // Парсим дату и создаем startDate и endDate
  const getDateRange = (dateString: string | null) => {
    if (!dateString) return { startDate: null, endDate: null };
    
    try {
      // Проверяем, содержит ли строка диапазон дат (например, "2025-10-21 to 2025-10-23")
      if (dateString.includes(' to ')) {
        const [startDateStr, endDateStr] = dateString.split(' to ');
        const startDate = new Date(startDateStr.trim()).toISOString().split('T')[0];
        const endDate = new Date(endDateStr.trim()).toISOString().split('T')[0];
        return { startDate, endDate };
      } else {
        // Одна дата - передаем только startDate, endDate = null
        const date = new Date(dateString);
        const startDate = date.toISOString().split('T')[0];
        return { startDate, endDate: null };
      }
    } catch (error) {
      console.error('Error parsing date:', error);
      return { startDate: null, endDate: null };
    }
  };

  // Helper functions for filtering and sorting
  const getAttractionPrice = (attraction: AttractionProduct) => {
    return attraction.representativePrice?.publicAmount || 0;
  };

  const getAttractionRating = (attraction: AttractionProduct) => {
    return attraction.reviewsStats?.combinedNumericStats?.average || 0;
  };

  const isBestseller = (attraction: AttractionProduct) => {
    return attraction.flags?.some(flag => flag.flag === 'bestseller') || false;
  };

  const hasFreeCancellation = (attraction: AttractionProduct) => {
    return attraction.cancellationPolicy?.hasFreeCancellation || false;
  };

  const RESULTS_CACHE_PREFIX = 'attractionsResults';
  const RESULTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const currentCacheKey = React.useMemo(() => {
    const identifier = locationId ? `id:${locationId}` : `name:${(locationName || '').toLowerCase()}`;
    return `${identifier}|sort:${sortBy}|page:${currentPage}`;
  }, [locationId, locationName, sortBy, currentPage]);

  const readResultsCache = React.useCallback(
    (key: string): AttractionsResultsCachePayload | null => {
      try {
        const raw = sessionStorage.getItem(`${RESULTS_CACHE_PREFIX}:${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AttractionsResultsCachePayload;
        if (!parsed?.timestamp) return null;
        return parsed;
      } catch (err) {
        console.error('Failed to parse attractions cache:', err);
        return null;
      }
    },
    []
  );

  const saveResultsCache = React.useCallback(
    (key: string, payload: Omit<AttractionsResultsCachePayload, 'timestamp'>) => {
      try {
        const toStore: AttractionsResultsCachePayload = {
          ...payload,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(`${RESULTS_CACHE_PREFIX}:${key}`, JSON.stringify(toStore));
      } catch (err) {
        console.warn('Unable to cache attractions results:', err);
      }
    },
    []
  );

  const applyCachedResults = React.useCallback((cache?: AttractionsResultsCachePayload | null) => {
    if (!cache) return false;
    setAttractions(cache.attractions || []);
    setTotalPages(cache.totalPages || 1);
    setLoading(false);
    return true;
  }, []);

  React.useEffect(() => {
    console.log('useEffect triggered:', { locationId, locationName, sortBy, currentPage });
    if (!(locationId || locationName)) {
      console.log('No locationId or locationName, not fetching');
      return;
    }

    const freezeRequested = sessionStorage.getItem('attractionsResults_freeze') === '1';
    const cachedPayload = readResultsCache(currentCacheKey);

    if (freezeRequested) {
      sessionStorage.removeItem('attractionsResults_freeze');
      if (applyCachedResults(cachedPayload)) {
        console.log('Restored attractions from cache due to freeze flag');
        return;
      }
    }

    if (cachedPayload) {
      const isFresh = Date.now() - cachedPayload.timestamp < RESULTS_CACHE_TTL;
      applyCachedResults(cachedPayload);
      if (isFresh) {
        console.log('Cache is fresh, skipping API fetch');
        return;
      }
      console.log('Cache stale, refreshing silently');
      fetchAttractions(currentCacheKey, { silent: true });
      return;
    }

    console.log('No cache available, fetching from API');
    fetchAttractions(currentCacheKey);
  }, [locationId, locationName, sortBy, currentPage, currentCacheKey, readResultsCache, applyCachedResults]);

  // Filter and sort attractions
  React.useEffect(() => {
    let list = attractions.filter((attraction) => {
      const price = getAttractionPrice(attraction);
      const rating = getAttractionRating(attraction);
      
      if (filters.minPrice !== undefined && (price === undefined || price < filters.minPrice)) return false;
      if (filters.maxPrice !== undefined && (price === undefined || price > filters.maxPrice)) return false;
      if (filters.minRating !== undefined && rating < filters.minRating) return false;
      if (filters.freeCancellation && !hasFreeCancellation(attraction)) return false;
      if (filters.bestseller && !isBestseller(attraction)) return false;
      
      return true;
    });

    // Sort attractions
    list = [...list].sort((a, b) => {
      const priceA = getAttractionPrice(a);
      const priceB = getAttractionPrice(b);
      const ratingA = getAttractionRating(a);
      const ratingB = getAttractionRating(b);

      switch (sortBy) {
        case 'trending':
          return 0; // Keep original order for trending
        case 'lowest_price':
          return priceA - priceB;
        case 'highest_weighted_rating':
          return ratingB - ratingA;
        default:
          return 0;
      }
    });

    setFilteredAttractions(list);
  }, [attractions, sortBy, filters]);

  const fetchAttractions = async (cacheKey?: string, options: { silent?: boolean } = {}) => {
    try {
      if (!options.silent) {
        setLoading(true);
        setError(null);
      }
      
      const { startDate, endDate } = getDateRange(date);
      const apiBaseUrl = resolveApiBaseUrl();
      
      // Если нет ID, используем поиск по названию локации
      if (!locationId) {
        console.log('No location ID provided, searching by name:', locationName);
        // Для ручного ввода показываем сообщение об ошибке
        setError('Please select a destination from the suggestions');
        setLoading(false);
        return;
      }
      
      let url = `${apiBaseUrl}/attractions/searchAttractions?id=${locationId}&sortBy=${sortBy}&page=${currentPage}&currency_code=USD&languagecode=en-us`;
      
      // Добавляем даты если они есть
      if (startDate) {
        url += `&startDate=${startDate}`;
        // Добавляем endDate только если он есть (для диапазона дат)
        if (endDate) {
          url += `&endDate=${endDate}`;
        }
      }
      
      console.log('Fetching attractions with URL:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);
      
      if (data.status && data.data && data.data.products) {
        console.log('Found attractions:', data.data.products.length);
        setAttractions(data.data.products);
        const total = Math.ceil(data.data.filterStats.filteredProductCount / 20);
        setTotalPages(total);
        saveResultsCache(cacheKey || currentCacheKey, {
          attractions: data.data.products,
          totalPages: total,
        });
      } else {
        console.log('No attractions found or API error');
        setAttractions([]);
      }
    } catch (err: any) {
      console.error('Error fetching attractions:', err);
      if (!options.silent) {
        const fallbackCache = readResultsCache(cacheKey || currentCacheKey);
        if (fallbackCache) {
          console.warn('Falling back to cached attractions due to fetch error');
          applyCachedResults(fallbackCache);
          return;
        }
        const isNetworkError = err?.name === 'TypeError';
        setError(
          isNetworkError
            ? 'Unable to reach attractions at the moment. Please check your connection or try again shortly.'
            : 'Failed to load attractions. Please try again.'
        );
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getFlagLabel = (flag: string) => {
    const flagLabels: { [key: string]: string } = {
      'bestseller': 'Bestseller',
      'popularFor1Traveler': 'Popular for 1 traveler',
      'popularFor2Travelers': 'Popular for 2 travelers',
      'popularFor3Travelers': 'Popular for 3 travelers',
      'aiBadgesExpertGuide': 'Expert Guide',
      'aiBadgesAdmissionIncluded': 'Admission Included',
      'aiBadgesPickup': 'Pickup Available',
      'aiBadgesAudio': 'Audio Guide'
    };
    return flagLabels[flag] || flag;
  };

  const getFlagColor = (flag: string) => {
    if (flag === 'bestseller') return '#ff6b35';
    if (flag.startsWith('popularFor')) return '#4caf50';
    if (flag.startsWith('aiBadges')) return '#2196f3';
    return '#666';
  };

  if (loading) {
    return (
      <AttractionResultsLoadingAnimation 
        locationName={locationName}
        date={date || undefined}
        onBack={() => navigate('/')}
      />
    );
  }

  if (error) {
    return (
      <div className="attractions-results">
        <div className="attractions-header">
          <button className="back-button" onClick={() => navigate('/')}>
            ← Back to search
          </button>
          <h1>Attractions in {locationName}</h1>
        </div>
        <div className="error-container">
          <p>{error}</p>
          <button onClick={() => fetchAttractions(currentCacheKey)} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="attractions-results">
      <div className="attractions-header">
        <h1 className="clickable-title" onClick={() => navigate('/')}>
          Attractions in {locationName}
        </h1>
        {date && <p className="search-date">For {date}</p>}
        
        {/* Action Buttons: Sort, Filter */}
        <div className="action-bar">
          <button className="action-btn" onClick={() => setShowSortModal(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 7h6M3 12h12M3 17h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Sort</span>
          </button>
          
          <button className="action-btn" onClick={() => setShowFiltersModal(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="attractions-content">
        <div className="attractions-main">
          {filteredAttractions.length === 0 ? (
            <div className="no-results">
              <h2>No attractions found</h2>
              <p>Try adjusting your search criteria or browse other destinations.</p>
            </div>
          ) : (
            <div className="attractions-grid">
              {filteredAttractions.map((attraction, index) => (
                <div 
                  key={attraction.id} 
                  className="attraction-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => {
                    // Store attraction data in sessionStorage for the detail page
                    sessionStorage.setItem('selectedAttraction', JSON.stringify(attraction));
                    sessionStorage.setItem('attractionsResults_freeze', '1');
                    console.log('Attraction data:', attraction);
                    console.log('Attraction slug:', attraction.slug);
                    console.log('Attraction id:', attraction.id);
                    console.log('Attraction name:', attraction.name);
                    console.log('All attraction keys:', Object.keys(attraction));
                    navigate(`/attraction-detail?id=${attraction.slug}&name=${encodeURIComponent(attraction.name)}`);
                  }}
                >
                  <div className="attraction-image">
                    <img 
                      src={attraction.primaryPhoto?.small || '/placeholder-image.jpg'} 
                      alt={attraction.name}
                      loading="lazy"
                    />
                    {attraction.cancellationPolicy?.hasFreeCancellation && (
                      <div className="free-cancellation-badge">
                        Free cancellation
                      </div>
                    )}
                    <div className="attraction-flags">
                      {attraction.flags && attraction.flags.length > 0 && attraction.flags.slice(0, 2).map((flag, flagIndex) => (
                        <span 
                          key={flagIndex}
                          className="attraction-flag"
                          style={{ backgroundColor: getFlagColor(flag.flag) }}
                        >
                          {getFlagLabel(flag.flag)}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="attraction-content">
                    <h3 className="attraction-title">{attraction.name}</h3>
                    <p className="attraction-description">{attraction.shortDescription}</p>
                    
                    <div className="attraction-rating">
                      {attraction.reviewsStats?.combinedNumericStats && (
                        <>
                          <div className="rating-stars">
                            {'★'.repeat(Math.floor(attraction.reviewsStats.combinedNumericStats.average))}
                            {'☆'.repeat(5 - Math.floor(attraction.reviewsStats.combinedNumericStats.average))}
                          </div>
                          <span className="rating-score">
                            {attraction.reviewsStats.combinedNumericStats.average.toFixed(1)}
                          </span>
                          <span className="rating-count">
                            ({attraction.reviewsStats.combinedNumericStats.total} reviews)
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="attraction-price">
                      <span className="price-amount">
                        {attraction.representativePrice ? 
                          formatPrice(attraction.representativePrice.publicAmount, attraction.representativePrice.currency) :
                          'Price not available'
                        }
                      </span>
                      <span className="price-per">per person</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="pagination-button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="pagination-button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Modal */}
      {showFiltersModal && (
        <div className="modal-overlay" onClick={() => setShowFiltersModal(false)}>
          <div className="currency-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Filters</h3>
              <button className="close-btn" onClick={() => setShowFiltersModal(false)}>×</button>
            </div>
            <div className="currency-list">
              <div className="currency-item">
                <div className="currency-info">
                  <div className="currency-text">
                    <span className="currency-code">Price range</span>
                    <span className="currency-name">Min / Max</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="number" placeholder="Min" style={{ width:90 }}
                         onChange={(e)=> setFilters(f => ({...f, minPrice: e.target.value ? Number(e.target.value) : undefined}))} />
                  <input type="number" placeholder="Max" style={{ width:90 }}
                         onChange={(e)=> setFilters(f => ({...f, maxPrice: e.target.value ? Number(e.target.value) : undefined}))} />
                </div>
              </div>

              <div className="currency-item" onClick={()=> setFilters(f => ({...f, freeCancellation: !f.freeCancellation}))}>
                <div className="currency-info">
                  <div className="currency-text">
                    <span className="currency-code">Free cancellation</span>
                  </div>
                </div>
                {filters.freeCancellation && <span className="check-icon">✓</span>}
              </div>

              <div className="currency-item" onClick={()=> setFilters(f => ({...f, bestseller: !f.bestseller}))}>
                <div className="currency-info">
                  <div className="currency-text">
                    <span className="currency-code">Bestseller only</span>
                  </div>
                </div>
                {filters.bestseller && <span className="check-icon">✓</span>}
              </div>

              <div className="currency-item">
                <div className="currency-info">
                  <div className="currency-text">
                    <span className="currency-code">Minimum rating</span>
                  </div>
                </div>
                <select defaultValue="" onChange={(e)=> setFilters(f => ({...f, minRating: e.target.value ? Number(e.target.value) : undefined}))}>
                  <option value="">Any</option>
                  <option value="4.5">4.5+</option>
                  <option value="4.0">4.0+</option>
                  <option value="3.5">3.5+</option>
                  <option value="3.0">3.0+</option>
                </select>
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
              <h3>Sort by</h3>
              <button className="close-btn" onClick={() => setShowSortModal(false)}>×</button>
            </div>
            <div className="sort-list">
              {[
                { value: 'trending', label: 'Our top picks' },
                { value: 'lowest_price', label: 'Price (lowest first)' },
                { value: 'highest_weighted_rating', label: 'Best reviewed' },
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
    </div>
  );
};

export default AttractionsResults;
