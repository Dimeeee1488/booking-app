import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HotelDetailsLoadingAnimation from './components/HotelDetailsLoadingAnimation';
import './HotelDetails.css';

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

  // Build a stable cache key for sessionStorage
  const getDetailsCacheKey = () =>
    `hotel_details_${hotelId}_${checkIn}_${checkOut}_${adults}_${children}_${rooms}_${currency}`;

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
    const fetchHotelDetails = async () => {
      try {
        setLoading(true);
        // Try cache first to avoid unnecessary API calls when reopening the same hotel
        const cacheKey = getDetailsCacheKey();
        try {
          const cachedRaw = sessionStorage.getItem(cacheKey);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            // TTL 15 minutes
            const TTL_MS = 15 * 60 * 1000;
            if (cached?.data && typeof cached?.ts === 'number' && Date.now() - cached.ts < TTL_MS) {
              setHotel(cached.data as HotelDetailsData);
              setLoading(false);
              return;
            }
          }
        } catch {}

        // Fetch fresh details from API if not in cache or expired
        // Правильно формируем параметры для детей
        const childrenParam = children ? `&children_age=${children}` : '';
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const response = await fetch(
          `${apiBaseUrl}/hotels/getHotelDetails?hotel_id=${hotelId}&arrival_date=${checkIn}&departure_date=${checkOut}&adults=${adults}${childrenParam}&room_qty=${rooms}&units=metric&temperature_unit=c&languagecode=en-us&currency_code=${currency}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch hotel details');
        }

        const data = await response.json();
        console.log('Hotel details response:', data);
        console.log('Request params:', {
          hotelId,
          checkIn,
          checkOut,
          adults,
          children,
          rooms,
          currency
        });
        
        if (data.status && data.data) {
          setHotel(data.data);
          // Save to cache for quick reopen within TTL
          try {
            sessionStorage.setItem(getDetailsCacheKey(), JSON.stringify({ ts: Date.now(), data: data.data }));
          } catch {}
          console.log('Hotel data loaded successfully');
        } else {
          console.error('Invalid hotel data structure');
        }
      } catch (err) {
        console.error('Error fetching hotel details:', err);
        setError('Failed to load hotel details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (hotelId && checkIn && checkOut) {
      fetchHotelDetails();
    }
  }, [hotelId, checkIn, checkOut, adults, children, rooms, currency]);

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

  const getFacilitiesFromAPI = (): Facility[] => {
    if (!hotel?.facilities_block?.facilities) {
      return [
        { name: 'Free parking', icon: 'parking' },
        { name: 'Swimming pool', icon: 'pool' },
        { name: 'Restaurant', icon: 'restaurant' },
        { name: 'Spa & wellness', icon: 'spa' },
        { name: 'Air conditioning', icon: 'ac' },
        { name: 'Free WiFi', icon: 'wifi' },
      ];
    }
    
    const facilityMap: { [key: string]: { name: string; icon: string } } = {
      'parking': { name: 'Free parking', icon: 'parking' },
      'pool': { name: 'Swimming pool', icon: 'pool' },
      'restaurant': { name: 'Restaurant', icon: 'restaurant' },
      'spa': { name: 'Spa & wellness', icon: 'spa' },
      'air conditioning': { name: 'Air conditioning', icon: 'ac' },
      'wifi': { name: 'Free WiFi', icon: 'wifi' },
      'fitness': { name: 'Fitness center', icon: 'fitness' },
      'bar': { name: 'Bar', icon: 'bar' },
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
      { name: 'Free parking', icon: 'parking' },
      { name: 'Swimming pool', icon: 'pool' },
      { name: 'Restaurant', icon: 'restaurant' },
      { name: 'Spa & wellness', icon: 'spa' },
      { name: 'Air conditioning', icon: 'ac' },
      { name: 'Free WiFi', icon: 'wifi' },
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
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
                <div className="photo-overlay">
                  <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                  <span>Show all {photos.length} photos</span>
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
                      <span className="more-text">More photos</span>
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
          {hotel.rawData?.accuratePropertyClass && (
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
            <span className="review-word">{hotel.rawData.reviewScoreWord || 'Good'}</span>
            {' '}
            <span className="review-count">
              {hotel.rawData.reviewCount?.toLocaleString() || '0'} reviews
            </span>
          </div>
        )}

        {/* Highlight strip (icons like parking, pool, etc.) */}
        {Array.isArray((hotel as any).property_highlight_strip) && (
          <div className="facilities-wrapper">
            <h3 className="section-title">Highlights</h3>
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
            <h3 className="section-title">Family facilities</h3>
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
              Show on map
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Facilities */}
        <div className="facilities-wrapper">
          <h3 className="section-title">Most popular facilities</h3>
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
            <div className="date-label">Check-in</div>
            <div className="date-value">{formatDate(checkIn)}</div>
          </div>
          <div className="date-item">
            <div className="date-label">Check-out</div>
            <div className="date-value">{formatDate(checkOut)}</div>
          </div>
        </div>

        {/* Search info */}
        <div className="search-info">
          <div className="search-info-title">You searched for</div>
          <div className="search-info-details">
            {adults} adult{adults !== '1' ? 's' : ''} • {rooms} room{rooms !== '1' ? 's' : ''}
          </div>
        </div>

        {/* Price Section - nightly, total, excluded taxes */}
        {hotel.composite_price_breakdown && (
          <div className="price-details-section">
            <div className="price-row">
              <span className="price-label">Total price</span>
              <div className="price-amount">
                {hotel.composite_price_breakdown.gross_amount?.currency || currency} {hotel.composite_price_breakdown.gross_amount?.value?.toFixed(2) || '—'}
              </div>
            </div>
            {((hotel as any).product_price_breakdown?.gross_amount_per_night) && (
              <div className="price-row">
                <span className="price-label">Price per night</span>
                <div className="price-amount">
                  {(hotel as any).product_price_breakdown.gross_amount_per_night.currency} {((hotel as any).product_price_breakdown.gross_amount_per_night.value)?.toFixed(2)}
                </div>
              </div>
            )}
            {hotel.composite_price_breakdown.excluded_amount && (
              <div className="price-row taxes-row">
                <span className="price-label">Includes taxes and charges</span>
                <span className="price-value">
                  {hotel.composite_price_breakdown.excluded_amount.currency} {hotel.composite_price_breakdown.excluded_amount.value?.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Policies: cancellation & prepayment (from first block if available) */}
        {Array.isArray((hotel as any).block) && (hotel as any).block[0]?.block_text?.policies && (
          <div className="facilities-wrapper">
            <h3 className="section-title">Policies</h3>
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
                <h3>How are we doing?</h3>
                <span className="survey-step">1 of 1</span>
              </div>
              <div className="survey-question">It's easy to compare accommodation options</div>
              <div className="survey-inline-options">
                {['Strongly agree','Agree','Neutral','Disagree','Strongly disagree'].map(opt => (
                  <label key={opt} className={`survey-inline-option ${surveyAnswer===opt?'active':''}`}>
                    <input type="radio" name="survey-inline" value={opt} onChange={()=> setSurveyAnswer(opt)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              <button className="survey-inline-submit" disabled={!surveyAnswer} onClick={()=> setSurveySubmitted(true)}>Submit</button>
            </>
          ) : (
            <div className="survey-thanks">Thank you for your feedback! 💙</div>
          )}
        </div>

        {/* No charge message */}
        <div className="no-charge-message">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
          </svg>
          <span>You won't be charged yet • Free cancellation available</span>
        </div>

        {/* Select rooms button */}
        {(!checkIn || !checkOut) && (
          <div className="inline-warning">{dateWarning || 'Please select check-in and check-out dates'}</div>
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
              price: hotel.composite_price_breakdown?.gross_amount?.value,
              currency: hotel.composite_price_breakdown?.gross_amount?.currency || currency,
              photo: photos[0]?.url_max750 || photos[0]?.url_max300,
              stars: hotel.rawData?.accuratePropertyClass,
              reviewScore: hotel.rawData?.reviewScore,
              reviewScoreWord: hotel.rawData?.reviewScoreWord
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
          <span>Select rooms</span>
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
              <span>Photo gallery</span>
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
                <span className="close-label">Close</span>
              </button>
            </div>
          </div>
          
          <div className="photo-modal-content">
            <button 
              className="nav-btn prev-btn"
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
              className="nav-btn next-btn"
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

