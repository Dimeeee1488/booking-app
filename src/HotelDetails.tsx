import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HotelDetailsLoadingAnimation from './components/HotelDetailsLoadingAnimation';
import './HotelDetails.css';
import { getPreferredLanguageCode, subscribeToPreferredLanguage } from './utils/language';
import { useTranslation } from './hooks/useTranslation';
import { calculatePromoDiscount, getPromoBadgeText } from './utils/promoUtils';
import { fetchWithTimeout } from './utils/fetchWithTimeout';

interface HotelPhoto {
  url_max300?: string;
  url_max750?: string;
  url_max1280?: string;
  url_original?: string;
  photo_id?: number;
  ratio?: number;
}

interface Facility {
  name: string;
  icon: string;
}

interface HotelDetailsData {
  hotel_id: number;
  hotel_name: string;
  hotel_name_trans?: string;
  address: string;
  city: string;
  countrycode: string;
  latitude: number;
  longitude: number;
  review_nr?: number;
  url?: string;
  rooms?: {
    [key: string]: {
      photos?: HotelPhoto[];
      facilities?: any[];
      description?: string;
    };
  };
  rawData?: {
    reviewScore?: number;
    reviewScoreWord?: string;
    reviewCount?: number;
    accuratePropertyClass?: number;
    photoUrls?: string[];
  };
  facilities_block?: {
    facilities?: Array<{
      name: string;
      facilitytype_name?: string;
    }>;
  };
  composite_price_breakdown?: {
    gross_amount?: {
      value: number;
      currency: string;
    };
    excluded_amount?: {
      value: number;
      currency: string;
    };
  };
  arrival_date?: string;
  departure_date?: string;
}

// Favorites storage
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

const HotelDetails = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [hotel, setHotel] = useState<HotelDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  // Inline survey (no modal)
  const [surveyAnswer, setSurveyAnswer] = useState<string | null>(null);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [dateWarning, setDateWarning] = useState('');

  const hotelId = searchParams.get('hotel_id') || '';
  const checkIn = searchParams.get('arrival_date') || '';
  const checkOut = searchParams.get('departure_date') || '';
  const adults = searchParams.get('adults') || '1';
  const children = searchParams.get('children_age') || '';
  const rooms = searchParams.get('room_qty') || '1';
  const currency = searchParams.get('currency_code') || 'EUR';
  const [languageCode, setLanguageCode] = useState(getPreferredLanguageCode());

  useEffect(() => {
    const unsubscribe = subscribeToPreferredLanguage((language) => {
      setLanguageCode(language.code);
    });
    return unsubscribe;
  }, []);

  const DEFAULT_HOTEL_LANGUAGE = 'en-us';

  const getDetailsCacheKey = (lang: string) =>
    `hotel_details_${hotelId}_${checkIn}_${checkOut}_${adults}_${children}_${rooms}_${currency}_${lang}`;

  const readCachedHotelDetails = (lang: string) => {
    const cacheKey = getDetailsCacheKey(lang);
    try {
      const cachedRaw = sessionStorage.getItem(cacheKey);
      if (!cachedRaw) return null;
      const cached = JSON.parse(cachedRaw);
      const TTL_MS = 15 * 60 * 1000;
      if (cached?.data && typeof cached?.ts === 'number' && Date.now() - cached.ts < TTL_MS) {
        return cached.data as HotelDetailsData;
      }
    } catch {}
    return null;
  };

  const writeCachedHotelDetails = (lang: string, dataToSave: HotelDetailsData) => {
    const cacheKey = getDetailsCacheKey(lang);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: dataToSave }));
    } catch {}
  };

  // Check if hotel is in favorites
  useEffect(() => {
    if (hotelId) {
      try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        if (stored) {
          const favorites: FavoriteHotel[] = JSON.parse(stored);
          setIsFavorite(favorites.some(fav => fav.hotel_id === hotelId));
        }
      } catch (error) {
        console.error('Failed to load favorites:', error);
      }
    }
  }, [hotelId]);

  useEffect(() => {
    if (!hotelId || !checkIn || !checkOut) {
      return;
    }

    let isMounted = true;

    // Проверяем, есть ли сохраненный отель из списка результатов
    const getSavedHotelFromList = (): any => {
      try {
        const selKey = `selected_hotel_${hotelId}_${checkIn}_${checkOut}_${currency}_${adults}_${children}_${rooms}`;
        const saved = sessionStorage.getItem(selKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (err) {
        console.warn('Failed to read saved hotel from list', err);
      }
      return null;
    };

    const requestHotelDetails = async (lang: string): Promise<boolean> => {
      const normalized = lang || DEFAULT_HOTEL_LANGUAGE;

      const cached = readCachedHotelDetails(normalized);
      if (cached) {
        if (isMounted) {
          // Проверяем сохраненный отель из списка для использования его цены
          const savedHotel = getSavedHotelFromList();
          if (savedHotel) {
            // Используем цену из списка, но данные из кэша деталей
            const mergedHotel = { ...cached };
            
            // Если в сохраненном отеле есть priceBreakdown, используем его
            if (savedHotel.priceBreakdown?.grossPrice) {
              const roomsCount = parseInt(rooms) || 1;
              const isTotalPrice = (savedHotel.priceBreakdown?.grossPrice as any)?.isTotal === true;
              const basePrice = savedHotel.priceBreakdown.grossPrice.value;
              const totalPrice = isTotalPrice ? basePrice : basePrice * roomsCount;
              
              // Обновляем composite_price_breakdown ценой из списка
              if (!mergedHotel.composite_price_breakdown) {
                mergedHotel.composite_price_breakdown = {} as any;
              }
              mergedHotel.composite_price_breakdown.gross_amount = {
                value: totalPrice,
                currency: savedHotel.priceBreakdown.grossPrice.currency || currency
              };
              
              // Если есть strikethroughPrice, тоже обновляем
              if (savedHotel.priceBreakdown?.strikethroughPrice) {
                const strikeIsTotal = (savedHotel.priceBreakdown?.strikethroughPrice as any)?.isTotal === true;
                const baseStrikePrice = savedHotel.priceBreakdown.strikethroughPrice.value;
                const totalStrikePrice = strikeIsTotal ? baseStrikePrice : baseStrikePrice * roomsCount;
                mergedHotel.composite_price_breakdown.strikethrough_amount = {
                  value: totalStrikePrice,
                  currency: savedHotel.priceBreakdown.strikethroughPrice.currency || currency
                };
              }
              
              // Если есть excludedPrice, добавляем его (умножаем на количество комнат)
              if (savedHotel.priceBreakdown?.excludedPrice) {
                const excludedPerRoom = savedHotel.priceBreakdown.excludedPrice.value;
                const excludedTotal = excludedPerRoom * roomsCount;
                mergedHotel.composite_price_breakdown.excluded_amount = {
                  value: Number(excludedTotal.toFixed(2)),
                  currency: savedHotel.priceBreakdown.excludedPrice.currency || currency
                };
              } else if (cached.composite_price_breakdown?.excluded_amount) {
                // Если нет excludedPrice в savedHotel, но есть в кэше, используем его
                mergedHotel.composite_price_breakdown.excluded_amount = cached.composite_price_breakdown.excluded_amount;
              }
            }
            
            setHotel(mergedHotel);
          } else {
            setHotel(cached);
          }
        }
        return true;
      }

      try {
        const childrenParam = children ? `&children_age=${children}` : '';
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const url = `${apiBaseUrl}/hotels/getHotelDetails?hotel_id=${hotelId}&arrival_date=${checkIn}&departure_date=${checkOut}&adults=${adults}${childrenParam}&room_qty=${rooms}&units=metric&temperature_unit=c&languagecode=${normalized}&currency_code=${currency}`;
        
        const response = await fetchWithTimeout(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          timeoutMs: 30000,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch hotel details (${response.status})`);
        }

        let data: any = null;
        try {
          data = await response.json();
        } catch (err) {
          console.error('Failed to parse hotel details response', err);
          return false;
        }

        if (data?.status && data?.data) {
          if (isMounted) {
            const hotelData = data.data;
            
            // Проверяем сохраненный отель из списка для использования его цены
            const savedHotel = getSavedHotelFromList();
            if (savedHotel && savedHotel.priceBreakdown?.grossPrice) {
              // Используем цену из списка, но данные из API деталей
              const roomsCount = parseInt(rooms) || 1;
              const isTotalPrice = (savedHotel.priceBreakdown?.grossPrice as any)?.isTotal === true;
              const basePrice = savedHotel.priceBreakdown.grossPrice.value;
              const totalPrice = isTotalPrice ? basePrice : basePrice * roomsCount;
              
              // Обновляем composite_price_breakdown ценой из списка
              if (!hotelData.composite_price_breakdown) {
                hotelData.composite_price_breakdown = {} as any;
              }
              hotelData.composite_price_breakdown.gross_amount = {
                value: Number(totalPrice.toFixed(2)),
                currency: savedHotel.priceBreakdown.grossPrice.currency || currency
              };
              
              // Если есть strikethroughPrice, тоже обновляем
              if (savedHotel.priceBreakdown?.strikethroughPrice) {
                const strikeIsTotal = (savedHotel.priceBreakdown?.strikethroughPrice as any)?.isTotal === true;
                const baseStrikePrice = savedHotel.priceBreakdown.strikethroughPrice.value;
                const totalStrikePrice = strikeIsTotal ? baseStrikePrice : baseStrikePrice * roomsCount;
                hotelData.composite_price_breakdown.strikethrough_amount = {
                  value: Number(totalStrikePrice.toFixed(2)),
                  currency: savedHotel.priceBreakdown.strikethroughPrice.currency || currency
                };
              }
              
              // Если есть excludedPrice, добавляем его (умножаем на количество комнат)
              if (savedHotel.priceBreakdown?.excludedPrice) {
                const excludedPerRoom = savedHotel.priceBreakdown.excludedPrice.value;
                const excludedTotal = excludedPerRoom * roomsCount;
                hotelData.composite_price_breakdown.excluded_amount = {
                  value: Number(excludedTotal.toFixed(2)),
                  currency: savedHotel.priceBreakdown.excludedPrice.currency || currency
                };
              } else if (hotelData.composite_price_breakdown?.excluded_amount) {
                // Если нет excludedPrice в savedHotel, но есть в API деталей, используем его
                // API деталей уже возвращает excluded_amount с учетом всех комнат
                // Оставляем как есть
              }
            } else if (hotelData.composite_price_breakdown?.excluded_amount) {
              // Если нет savedHotel, но API деталей вернул excluded_amount, используем его
              // API деталей уже возвращает excluded_amount с учетом всех комнат
            }
            
            setHotel(hotelData);
            writeCachedHotelDetails(normalized, hotelData);
          }
          return true;
        }

        console.warn('Invalid hotel data structure', { lang: normalized, data });
        return false;
      } catch (err) {
        console.error('Error fetching hotel details:', err);
        return false;
      }
    };

    const loadDetails = async () => {
      if (isMounted) {
        setLoading(true);
        setError('');
      }

      const preferredLang = languageCode || DEFAULT_HOTEL_LANGUAGE;
      let success = await requestHotelDetails(preferredLang);

      if (!success && preferredLang !== DEFAULT_HOTEL_LANGUAGE) {
        console.warn('Retrying hotel details with default language (en-us)');
        success = await requestHotelDetails(DEFAULT_HOTEL_LANGUAGE);
      }

      if (!success && isMounted) {
        setError(t('errorLoading') + '. ' + t('tryAgain'));
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [hotelId, checkIn, checkOut, adults, children, rooms, currency, languageCode]);

  const renderStars = (count: number) => {
    return '⭐'.repeat(count);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getAllPhotos = (): HotelPhoto[] => {
    if (!hotel) return [];
    
    const photos: HotelPhoto[] = [];
    
    // Add main photo from rawData
    if (hotel.rawData?.photoUrls && hotel.rawData.photoUrls.length > 0) {
      photos.push({
        url_max1280: hotel.rawData.photoUrls[0].replace('square60', '1280x900'),
        url_max750: hotel.rawData.photoUrls[0].replace('square60', 'max750'),
        url_max300: hotel.rawData.photoUrls[0].replace('square60', 'max300'),
        url_original: hotel.rawData.photoUrls[0].replace('square60', 'max500'),
      });
    }
    
    // Add room photos
    if (hotel.rooms) {
      Object.values(hotel.rooms).forEach(room => {
        if (room.photos) {
          photos.push(...room.photos);
        }
      });
    }
    
    return photos;
  };

  const photos = getAllPhotos();

  // Preload next/previous images for smoother navigation
  useEffect(() => {
    if (!showAllPhotos || photos.length === 0) return;

    const preloadImage = (url: string) => {
      const img = new Image();
      img.src = url;
    };

    const nextIndex = (selectedPhotoIndex + 1) % photos.length;
    const prevIndex = (selectedPhotoIndex - 1 + photos.length) % photos.length;

    const nextUrl = photos[nextIndex]?.url_max1280 || photos[nextIndex]?.url_max750;
    const prevUrl = photos[prevIndex]?.url_max1280 || photos[prevIndex]?.url_max750;

    if (nextUrl) preloadImage(nextUrl);
    if (prevUrl) preloadImage(prevUrl);
  }, [selectedPhotoIndex, showAllPhotos, photos]);

  const getFacilitiesFromAPI = (): Facility[] => {
    if (!hotel?.facilities_block?.facilities) {
      return [
        { name: t('facilityFreeParking'), icon: 'parking' },
        { name: t('facilitySwimmingPool'), icon: 'pool' },
        { name: t('facilityRestaurant'), icon: 'restaurant' },
        { name: t('facilitySpaWellness'), icon: 'spa' },
        { name: t('facilityAirConditioning'), icon: 'ac' },
        { name: t('facilityFreeWiFi'), icon: 'wifi' },
      ];
    }
    
    const facilityMap: { [key: string]: { name: string; icon: string } } = {
      'parking': { name: t('facilityFreeParking'), icon: 'parking' },
      'pool': { name: t('facilitySwimmingPool'), icon: 'pool' },
      'restaurant': { name: t('facilityRestaurant'), icon: 'restaurant' },
      'spa': { name: t('facilitySpaWellness'), icon: 'spa' },
      'air conditioning': { name: t('facilityAirConditioning'), icon: 'ac' },
      'wifi': { name: t('facilityFreeWiFi'), icon: 'wifi' },
      'fitness': { name: t('facilityFitnessCenter'), icon: 'fitness' },
      'bar': { name: t('facilityBar'), icon: 'bar' },
    };
    
    const facilities: Facility[] = [];
    hotel.facilities_block.facilities.forEach(fac => {
      const name = fac.name.toLowerCase();
      Object.keys(facilityMap).forEach(key => {
        if (name.includes(key) && facilities.length < 6) {
          facilities.push(facilityMap[key]);
        }
      });
    });
    
    return facilities.length > 0 ? facilities : [
      { name: t('facilityFreeParking'), icon: 'parking' },
      { name: t('facilitySwimmingPool'), icon: 'pool' },
      { name: t('facilityRestaurant'), icon: 'restaurant' },
      { name: t('facilitySpaWellness'), icon: 'spa' },
      { name: t('facilityAirConditioning'), icon: 'ac' },
      { name: t('facilityFreeWiFi'), icon: 'wifi' },
    ];
  };

  const renderFacilityIcon = (icon: string) => {
    const icons: { [key: string]: React.ReactElement } = {
      parking: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="16" height="16" rx="2"/>
          <path d="M9 9h3a3 3 0 0 1 0 6H9V9z"/>
        </svg>
      ),
      pool: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 15c1.67-1.33 3.33-2 5-2s3.33.67 5 2c1.67 1.33 3.33 2 5 2s3.33-.67 5-2"/>
          <path d="M2 19c1.67-1.33 3.33-2 5-2s3.33.67 5 2c1.67 1.33 3.33 2 5 2s3.33-.67 5-2"/>
          <path d="M12 12V6.5"/>
          <circle cx="12" cy="4" r="2"/>
        </svg>
      ),
      restaurant: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
          <path d="M7 2v20"/>
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3"/>
          <path d="M19 2v20"/>
        </svg>
      ),
      spa: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 2v6a3 3 0 1 0 6 0V2"/>
          <path d="M12 10v12"/>
          <path d="M6 12c0 3 2 4 6 4s6-1 6-4"/>
        </svg>
      ),
      ac: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 2v4M16 2v4M3 10h18M3 14h18M8 18v4M16 18v4"/>
          <rect x="3" y="6" width="18" height="12" rx="2"/>
        </svg>
      ),
      wifi: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
          <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <circle cx="12" cy="20" r="1"/>
        </svg>
      ),
      fitness: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.4 14.4L9.6 9.6"/>
          <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/>
          <path d="M21.5 21.5l-1.4-1.4"/>
          <path d="M3.9 3.9l1.4 1.4"/>
        </svg>
      ),
      bar: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
          <path d="M6 1v3M10 1v3M14 1v3"/>
        </svg>
      ),
    };
    
    return icons[icon] || icons.parking;
  };

  const toggleFavorite = () => {
    if (!hotel) return;
    
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      let favorites: FavoriteHotel[] = stored ? JSON.parse(stored) : [];
      
      if (isFavorite) {
        // Remove from favorites
        favorites = favorites.filter(fav => fav.hotel_id !== hotelId);
        setIsFavorite(false);
      } else {
        // Add to favorites
        const photos = getAllPhotos();
        const favoriteHotel: FavoriteHotel = {
          hotel_id: hotelId,
          name: hotel.hotel_name || 'Hotel',
          address: hotel.address || '',
          city: hotel.city || '',
          rating: hotel.rawData?.reviewScore,
          stars: hotel.rawData?.accuratePropertyClass,
          price: hotel.composite_price_breakdown?.gross_amount?.value,
          currency: currency,
          photoUrl: photos[0]?.url_max750 || photos[0]?.url_max300,
          addedAt: Date.now(),
        };
        
        favorites.push(favoriteHotel);
        setIsFavorite(true);
      }
      
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const openInMaps = () => {
    if (!hotel) return;
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(`https://maps.apple.com/?q=${hotel.latitude},${hotel.longitude}&ll=${hotel.latitude},${hotel.longitude}&z=15`);
    } else if (isAndroid) {
      window.open(`https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}&z=15`);
    } else {
      window.open(`https://www.google.com/maps?q=${hotel.latitude},${hotel.longitude}&z=15`);
    }
  };

  if (loading) {
    return <HotelDetailsLoadingAnimation />;
  }

  if (error || !hotel) {
    return (
      <div className="hotel-details">
        <div className="hotel-details-header">
          <button className="back-button" onClick={() => navigate(-1)}>←</button>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#ff6b6b' }}>
          {error || 'Hotel not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="hotel-details">
      {/* Header */}
      <div className="hotel-details-header">
        <button className="back-button" onClick={() => navigate(-1)}>←</button>
      </div>

      {/* Photo Gallery */}
      <div className="photo-gallery">
        {photos.length > 0 && (
          <>
            <div className="main-photos">
              <div className="large-photo" onClick={() => setShowAllPhotos(true)}>
                <img 
                  src={photos[0]?.url_max1280 || photos[0]?.url_max750 || photos[0]?.url_original} 
                  alt={hotel.hotel_name}
                />
                {/* Favorite button over photo (top-right) */}
                <button
                  className={`favorite-overlay-btn ${isFavorite ? 'favorited' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(); }}
                  title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                  aria-label={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                >
                  <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
                <div className="photo-overlay">
                  <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  <span>{t('showAllPhotos').replace('{count}', String(photos.length))}</span>
                </div>
              </div>
              <div className="small-photo" onClick={() => setShowAllPhotos(true)}>
                <img 
                  src={photos[1]?.url_max750 || photos[1]?.url_max300 || photos[1]?.url_original} 
                  alt={hotel.hotel_name}
                />
              </div>
            </div>
            <div className="bottom-photos">
              {photos.slice(2, 5).map((photo, index) => (
                <div key={index} className="bottom-photo" onClick={() => {
                  setSelectedPhotoIndex(index + 2);
                  setShowAllPhotos(true);
                }}>
                  <img 
                    src={photo.url_max750 || photo.url_max300 || photo.url_original} 
                    alt={hotel.hotel_name}
                  />
                  {index === 2 && photos.length > 5 && (
                    <div className="more-photos-overlay">
                      <span className="more-count">+{photos.length - 5}</span>
                      <span className="more-text">{t('morePhotos')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Hotel Info */}
      <div className="hotel-info-section">
        <h1 className="hotel-title">{hotel.hotel_name}</h1>
        
        {/* Stars and rating */}
        <div className="hotel-meta">
          {!!hotel.rawData?.accuratePropertyClass && (
            <div className="hotel-stars-detail">
              {renderStars(hotel.rawData.accuratePropertyClass)}
            </div>
          )}
          {hotel.rawData?.reviewScore && (
            <div className="hotel-rating-badge">
              <span className="rating-score">{hotel.rawData.reviewScore.toFixed(1)}</span>
            </div>
          )}
        </div>

        {hotel.rawData?.reviewScore && (
          <div className="review-summary">
            <span className="review-word">{hotel.rawData.reviewScoreWord ? t(hotel.rawData.reviewScoreWord.toLowerCase() as any) || hotel.rawData.reviewScoreWord : t('good')}</span>
            {' '}
            <span className="review-count">
              {hotel.rawData.reviewCount?.toLocaleString() || '0'} {t('reviewsCount')}
            </span>
          </div>
        )}

        {/* Highlight strip (icons like parking, pool, etc.) */}
        {Array.isArray((hotel as any).property_highlight_strip) && (
          <div className="facilities-wrapper">
            <h3 className="section-title">{t('highlights')}</h3>
            <div className="facilities-section">
              {((hotel as any).property_highlight_strip as any[]).slice(0, 8).map((hi: any, idx: number) => (
                <div key={idx} className="facility-item">
                  <div className="facility-icon">{renderFacilityIcon((hi?.icon_list?.[0]?.icon || '').split('/').pop() || 'parking')}</div>
                  <div className="facility-name">{hi?.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Family facilities short list */}
        {Array.isArray((hotel as any).family_facilities) && ((hotel as any).family_facilities as string[]).length > 0 && (
          <div className="facilities-wrapper">
            <h3 className="section-title">{t('familyFacilities')}</h3>
            <div className="facilities-section">
              {((hotel as any).family_facilities as string[]).slice(0, 6).map((name: string, idx: number) => (
                <div key={idx} className="facility-item">
                  <div className="facility-icon">{renderFacilityIcon('family')}</div>
                  <div className="facility-name">{name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        <div className="location-section">
          <div className="location-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="location-info">
            <div className="location-name">{hotel.address}</div>
            <button className="show-map-btn" onClick={openInMaps}>
              {t('showOnMap')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Facilities */}
        <div className="facilities-wrapper">
          <h3 className="section-title">{t('mostPopularFacilities')}</h3>
          <div className="facilities-section">
            {getFacilitiesFromAPI().map((facility, index) => (
              <div key={index} className="facility-item">
                <div className="facility-icon">{renderFacilityIcon(facility.icon)}</div>
                <div className="facility-name">{facility.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Check-in/out dates */}
        <div className="dates-section">
          <div className="date-item">
            <div className="date-label">{t('checkIn')}</div>
            <div className="date-value">{formatDate(checkIn)}</div>
          </div>
          <div className="date-item">
            <div className="date-label">{t('checkOut')}</div>
            <div className="date-value">{formatDate(checkOut)}</div>
          </div>
        </div>

        {/* Search info */}
        <div className="search-info">
          <div className="search-info-title">{t('youSearchedFor')}</div>
          <div className="search-info-details">
            {adults} adult{adults !== '1' ? 's' : ''} • {rooms} room{rooms !== '1' ? 's' : ''}
          </div>
        </div>

        {/* Price Section - nightly, total, excluded taxes */}
        {hotel.composite_price_breakdown && (() => {
          // Используем точные значения без округления до финального отображения
          const basePrice = Number((hotel.composite_price_breakdown.gross_amount?.value || 0).toFixed(2));
          const excludedAmountRaw = Number((hotel.composite_price_breakdown.excluded_amount?.value || 0).toFixed(2));
          const currencyCode = hotel.composite_price_breakdown.gross_amount?.currency || currency;
          
          // Вычисляем количество ночей
          const nights = checkIn && checkOut ? 
            Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))) : 1;
          
          // Apply promo discounts
          const promoDiscount = calculatePromoDiscount({
            basePrice,
            nights,
            currency: currencyCode,
          });
          
          const discountedPrice = promoDiscount.discountedPrice;
          const effectiveNights = nights - promoDiscount.freeNights;
          const perNight = effectiveNights > 0 ? Number((discountedPrice / effectiveNights).toFixed(2)) : 0;
          
          // Применяем скидку 45% к налогам напрямую (так же, как к цене)
          const excludedAmount = Number((excludedAmountRaw * 0.55).toFixed(2)); // 45% скидка = остаётся 55%
          const totalWithTaxes = Number((discountedPrice + excludedAmount).toFixed(2));
          const promoBadgeText = getPromoBadgeText(promoDiscount.appliedPromos);
          
          return (
            <div className="price-details-section">
              {/* Promo badge */}
              {promoBadgeText && (
                <div className="promo-badge-detail">
                  <span className="promo-badge-text">{promoBadgeText}</span>
                </div>
              )}
              
              {/* Original price (strikethrough) */}
              <div className="price-row promo-original-row">
                <span className="price-label" style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                  {t('totalPrice')}
                </span>
                <div className="price-amount" style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                  {currencyCode} {basePrice.toFixed(2)}
                </div>
              </div>
              
              {/* Discounted price */}
              <div className="price-row">
                <span className="price-label">{t('totalPrice')}</span>
                <div className="price-amount promo-price-amount">
                  {currencyCode} {discountedPrice.toFixed(2)}
                </div>
              </div>
              
              {/* Price per night */}
              <div className="price-row">
                <span className="price-label">{t('perNight')}</span>
                <div className="price-amount">
                  {currencyCode} {perNight.toFixed(2)}
                  {promoDiscount.freeNights > 0 && (
                    <span className="promo-nights-info"> · {promoDiscount.freeNights} {t('nightsFree') || 'nights free'}</span>
                  )}
                </div>
              </div>
              
              {/* Savings info - показываем 35% скидку и 2 ночи бесплатно отдельно */}
              {promoDiscount.discountAmount > 0 && (
                <div className="price-row promo-savings-row">
                  <span className="price-label" style={{ color: '#00a884', fontWeight: 600 }}>
                    {t('youSave') || 'You save'}
                  </span>
                  <div className="price-amount" style={{ color: '#00a884', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span>{currencyCode} {promoDiscount.discountAmount.toFixed(2)}</span>
                    <span style={{ fontSize: '0.85em', opacity: 0.9 }}>
                      {promoDiscount.promoDiscountPercent || 45}% {t('discount') || 'discount'}
                      {promoDiscount.freeNights > 0 && ` + ${promoDiscount.freeNights} ${t('nightsFree') || 'nights free'}`}
                    </span>
                  </div>
                </div>
              )}
              
              {(excludedAmountRaw > 0 || excludedAmount > 0) && (
                <div className="price-row taxes-row">
                  <span className="price-label">{t('includesTaxesAndFeesLabel')}</span>
                  <div className="price-value" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    {excludedAmountRaw > 0 && excludedAmountRaw !== excludedAmount && (
                      <span style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: '0.9em' }}>
                        {hotel.composite_price_breakdown.excluded_amount?.currency || currencyCode} {excludedAmountRaw.toFixed(2)}
                      </span>
                    )}
                    <span>
                      {hotel.composite_price_breakdown.excluded_amount?.currency || currencyCode} {excludedAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {(excludedAmountRaw > 0 || excludedAmount > 0) && (
                <div className="price-row total-with-taxes-row" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #444' }}>
                  <span className="price-label" style={{ fontWeight: 700 }}>{t('totalWithTaxesAndFees')}</span>
                  <div className="price-amount" style={{ fontWeight: 700, fontSize: '1.1em' }}>
                    {currencyCode} {totalWithTaxes.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Policies: cancellation & prepayment (from first block if available) */}
        {Array.isArray((hotel as any).block) && (hotel as any).block[0]?.block_text?.policies && (
          <div className="facilities-wrapper">
            <h3 className="section-title">{t('policies')}</h3>
            <div className="facilities-section">
              {((hotel as any).block[0].block_text.policies as any[]).slice(0,3).map((p, idx:number)=> (
                <div key={idx} className="facility-item" style={{ alignItems:'flex-start' }}>
                  <div className="facility-icon">{renderFacilityIcon('clean')}</div>
                  <div className="facility-name">{p.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inline Survey (below policies) */}
        <div className="survey-inline">
          {!surveySubmitted ? (
            <>
              <div className="survey-inline-header">
                <h3>{t('howAreWeDoing')}</h3>
                <span className="survey-step">1 of 1</span>
              </div>
              <div className="survey-question">{t('easyToCompareAccommodation')}</div>
              <div className="survey-inline-options">
                {[t('stronglyAgree'), t('agree'), t('neutral'), t('disagree'), t('stronglyDisagree')].map(opt => (
                  <label key={opt} className={`survey-inline-option ${surveyAnswer===opt?'active':''}`}>
                    <input type="radio" name="survey-inline" value={opt} onChange={()=> setSurveyAnswer(opt)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              <button className="survey-inline-submit" disabled={!surveyAnswer} onClick={()=> setSurveySubmitted(true)}>{t('submit')}</button>
            </>
          ) : (
            <div className="survey-thanks">{t('thankYouForFeedback')}</div>
          )}
        </div>

        {/* No charge message */}
        <div className="no-charge-message">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
          </svg>
          <span>{t('youWontBeChargedYet')} • {t('freeCancellationAvailable')}</span>
        </div>

        {/* Select rooms button */}
        {(!checkIn || !checkOut) && (
          <div className="inline-warning">{dateWarning || t('selectDate')}</div>
        )}
        <button className="select-rooms-btn" onClick={() => {
          if (!checkIn || !checkOut) {
            setDateWarning('Please choose dates before continuing');
            setTimeout(() => setDateWarning(''), 2000);
            return;
          }
          // Persist minimal hotel booking summary to session for the forms
          try { 
            // Очищаем предыдущие данные гостей
            localStorage.removeItem('hotel_guests_info');
            localStorage.removeItem('hotel_contact_info');
            
            // Вычисляем итоговую цену с налогами и сборами
            const basePrice = Number((hotel.composite_price_breakdown?.gross_amount?.value || 0).toFixed(2));
            const excludedAmountRaw = Number((hotel.composite_price_breakdown?.excluded_amount?.value || 0).toFixed(2));
            
            // Apply promo discounts
            const nights = checkIn && checkOut ? 
              Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))) : 1;
            const promoDiscount = calculatePromoDiscount({
              basePrice,
              nights,
              currency: hotel.composite_price_breakdown?.gross_amount?.currency || currency,
            });
            
            const discountedPrice = promoDiscount.discountedPrice;
            // Применяем скидку 45% к налогам напрямую (так же, как к цене)
            const excludedAmount = Number((excludedAmountRaw * 0.55).toFixed(2)); // 45% скидка = остаётся 55%
            const totalWithTaxes = Number((discountedPrice + excludedAmount).toFixed(2));
            
            sessionStorage.setItem('hotel_booking_summary', JSON.stringify({
              hotel_id: hotelId,
              hotel_name: hotel.hotel_name, 
              address: hotel.address, 
              city: hotel.city,
              checkIn, 
              checkOut, 
              adults, 
              children, 
              rooms,
              price: discountedPrice, // Цена со скидкой без налогов
              originalPrice: basePrice, // Оригинальная цена для отображения
              excludedAmount: excludedAmount, // Налоги и сборы
              totalWithTaxes: totalWithTaxes, // Итоговая цена с налогами
              currency: hotel.composite_price_breakdown?.gross_amount?.currency || currency,
              photo: photos[0]?.url_max750 || photos[0]?.url_max300,
              stars: hotel.rawData?.accuratePropertyClass,
              reviewScore: hotel.rawData?.reviewScore,
              reviewScoreWord: hotel.rawData?.reviewScoreWord,
              promoDiscount: {
                discountAmount: promoDiscount.discountAmount,
                discountPercent: promoDiscount.discountPercent,
                freeNights: promoDiscount.freeNights,
                appliedPromos: promoDiscount.appliedPromos,
              }
            }));
            
            // Save to recent searches
            const recentSearches = JSON.parse(localStorage.getItem('recent_hotel_searches') || '[]');
            const newSearch = {
              hotel_id: hotelId,
              hotel_name: hotel.hotel_name,
              city: hotel.city,
              checkIn,
              checkOut,
              price: hotel.composite_price_breakdown?.gross_amount?.value,
              currency: hotel.composite_price_breakdown?.gross_amount?.currency || currency,
              rating: hotel.rawData?.reviewScore || 4.0,
              hotel_type: hotel.rawData?.reviewScoreWord || 'Hotel',
              timestamp: Date.now()
            };
            
            // Remove existing search for same hotel to avoid duplicates
            const filteredSearches = recentSearches.filter((s: any) => s.hotel_id !== hotelId);
            
            // Add new search to beginning and keep only last 10
            const updatedSearches = [newSearch, ...filteredSearches].slice(0, 10);
            
            localStorage.setItem('recent_hotel_searches', JSON.stringify(updatedSearches));
            
            // Создаем offer ID сразу для совместимости с Payment
            const offerId = `hotel_${hotelId}_${Date.now()}`;
            sessionStorage.setItem('current_offer_id', offerId);
            
            // Добавляем timestamp для RouteGuard
            sessionStorage.setItem('session_timestamp', Date.now().toString());
          } catch {}
          setSurveySubmitted(true);
          navigate('/hotel/booking');
        }}>
          <span>{t('select')} {t('rooms')}</span>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
          </svg>
        </button>
      </div>

      {/* Modal survey removed */}

      {/* Full screen photo gallery modal */}
      {showAllPhotos && (
        <div className="photo-modal">
          <div className="photo-modal-header">
            <div className="modal-title">
              <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
              <span>{t('photoGallery')}</span>
            </div>
            <div className="modal-actions">
              <div className="photo-counter">
                <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                {selectedPhotoIndex + 1} / {photos.length}
              </div>
              <button className="close-modal-btn" onClick={() => setShowAllPhotos(false)}>
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.3 5.7a1 1 0 0 0-1.4-1.4L12 9.17 7.1 4.3A1 1 0 1 0 5.7 5.7L10.59 10.6 5.7 15.49a1 1 0 1 0 1.41 1.41L12 12.01l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 10.6 18.3 5.7z"/>
                </svg>
                <span className="close-label">{t('closeLabel')}</span>
              </button>
            </div>
          </div>
          
          <div className="photo-modal-content">
            <button 
              className="gallery-nav-btn gallery-prev-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
              }}
            >
              <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            
            <div className="photo-container">
              <img 
                src={photos[selectedPhotoIndex]?.url_max1280 || photos[selectedPhotoIndex]?.url_max750} 
                alt={`${hotel.hotel_name} - Photo ${selectedPhotoIndex + 1}`}
                className="modal-photo"
              />
            </div>
            
            <button 
              className="gallery-nav-btn gallery-next-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
              }}
            >
              <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          </div>
          
          {/* Thumbnails */}
          <div className="photo-thumbnails">
            {photos.map((photo, index) => (
              <div 
                key={index}
                className={`thumbnail ${index === selectedPhotoIndex ? 'active' : ''}`}
                onClick={() => setSelectedPhotoIndex(index)}
              >
                <img 
                  src={photo.url_max300 || photo.url_original} 
                  alt={`Thumbnail ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelDetails;

