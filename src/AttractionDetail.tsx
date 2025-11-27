import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './AttractionDetail.css';
import { getPreferredLanguageCode, subscribeToPreferredLanguage } from './utils/language';
import { useTranslation } from './hooks/useTranslation';
import { fetchWithTimeout } from './utils/fetchWithTimeout';

const DETAIL_CACHE_PREFIX = 'attractionDetail';
const DETAIL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface AttractionDetailCachePayload {
  timestamp: number;
  data: any;
}

const AttractionDetail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const attractionId = searchParams.get('id');
  const attractionName = searchParams.get('name');
  
  const [attraction, setAttraction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [languageCode, setLanguageCode] = useState(getPreferredLanguageCode());

  useEffect(() => {
    const unsubscribe = subscribeToPreferredLanguage((language) => {
      setLanguageCode(language.code);
    });
    return unsubscribe;
  }, []);

  const detailCacheKey = React.useMemo(
    () => (attractionId ? `${attractionId}|lang:${languageCode}` : null),
    [attractionId, languageCode]
  );

  const readDetailCache = React.useCallback((slug: string | null): AttractionDetailCachePayload | null => {
    if (!slug) return null;
    try {
      const raw = sessionStorage.getItem(`${DETAIL_CACHE_PREFIX}:${slug}`);
      if (!raw) return null;
      return JSON.parse(raw) as AttractionDetailCachePayload;
    } catch (err) {
      console.error('Failed to parse attraction detail cache', err);
      return null;
    }
  }, []);

  const saveDetailCache = React.useCallback((slug: string, dataToSave: any) => {
    try {
      const payload: AttractionDetailCachePayload = {
        timestamp: Date.now(),
        data: dataToSave,
      };
      sessionStorage.setItem(`${DETAIL_CACHE_PREFIX}:${slug}`, JSON.stringify(payload));
    } catch (err) {
      console.warn('Unable to cache attraction detail', err);
    }
  }, []);

  useEffect(() => {
    console.log('AttractionDetail useEffect - attractionId:', attractionId);
    console.log('AttractionDetail useEffect - attractionName:', attractionName);
    if (!attractionId) return;

    const cached = readDetailCache(detailCacheKey);
    if (cached?.data) {
      console.log('Restoring attraction detail from cache');
      setAttraction(cached.data);
      setLoading(false);
      const isFresh = Date.now() - cached.timestamp < DETAIL_CACHE_TTL;
      if (isFresh) {
        return;
      }
      console.log('Cached attraction detail is stale, refreshing silently');
      fetchAttractionDetails({ silent: true, cacheKey: detailCacheKey, saveDetailCache });
      return;
    }

    fetchAttractionDetails({ cacheKey: detailCacheKey, saveDetailCache });
  }, [attractionId, attractionName, detailCacheKey, readDetailCache, saveDetailCache]);

  const fetchAttractionDetails = async ({
    silent = false,
    cacheKey,
    saveDetailCache: saveFn,
  }: {
    silent?: boolean;
    cacheKey?: string | null;
    saveDetailCache?: (slug: string, data: any) => void;
  } = {}) => {
    console.log('=== fetchAttractionDetails START ===');
    console.log('attractionId:', attractionId);
    console.log('attractionName:', attractionName);
    
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      
      // Всегда запрашиваем полные детали по slug
      if (attractionId) {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
        console.log('Fetching attraction details for slug:', attractionId);
        const apiUrl = `${API_BASE_URL}/attractions/getAttractionDetails?slug=${encodeURIComponent(attractionId)}&currency_code=USD&languagecode=${languageCode}`;
        console.log('API URL:', apiUrl);
        
        const response = await fetchWithTimeout(apiUrl, { timeoutMs: 30000 });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        const apiAttraction = data?.data || data;
        if (apiAttraction && apiAttraction.name) {
          console.log('Using API data:', apiAttraction);
          setAttraction(apiAttraction);
          // кэшируем полные детали, чтобы можно было использовать оффлайн / при ошибке
          sessionStorage.setItem('selectedAttraction', JSON.stringify({ ...apiAttraction, fetchedAt: Date.now() }));
          if (cacheKey && saveFn) {
            saveFn(cacheKey, apiAttraction);
          }
          return;
        } else {
          throw new Error('No valid data in API response');
        }
      } else {
        console.log('No attractionId provided');
      }
      
      // Fallback to stored data if API fails
      const storedAttractionFallback = sessionStorage.getItem('selectedAttraction');
      if (storedAttractionFallback) {
        console.log('Using stored attraction data (fallback)');
        const attractionData = JSON.parse(storedAttractionFallback);
        setAttraction(attractionData);
        return;
      }
      
      // Final fallback to mock data
      const mockAttraction = {
        id: attractionId,
        name: attractionName || 'Attraction',
        shortDescription: 'Experience this amazing attraction with our guided tour. Perfect for all ages and interests.',
        primaryPhoto: {
          small: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
        },
        representativePrice: {
          chargeAmount: 25.99,
          currency: 'USD',
          publicAmount: 25.99
        },
        reviewsStats: {
          combinedNumericStats: {
            average: 4.5,
            total: 127
          }
        },
        cancellationPolicy: {
          hasFreeCancellation: true
        },
        flags: [
          { flag: 'bestseller', value: true, rank: 1 }
        ],
        ufiDetails: {
          bCityName: 'Paris'
        }
      };
      
      setAttraction(mockAttraction);
    } catch (err: any) {
      if (!silent) {
        if (err?.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else {
        setError('Failed to load attraction details');
        }
      }
      console.error('Error fetching attraction details:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const getImages = () => {
    const images: string[] = [];
    console.log('Getting images for attraction:', attraction);
    
    // Показываем ТОЛЬКО фото из ответа API деталей, без primaryPhoto
    // Используем Set для удаления дубликатов по нормализованным URL
    const seen = new Set<string>();
    
    const addImage = (url?: string) => {
      if (!url) return;
      // Нормализуем URL для сравнения (убираем параметры запроса и приводим к нижнему регистру)
      const normalizedUrl = url.split('?')[0].toLowerCase();
      if (seen.has(normalizedUrl)) {
        console.log('Skipping duplicate image:', url);
        return;
      }
      seen.add(normalizedUrl);
      images.push(url);
    };

    // ТОЛЬКО фото из photos массива (из ответа деталей)
    if (Array.isArray(attraction?.photos)) {
      attraction.photos.forEach((photo: any) => {
        const url = photo.medium || photo.small;
        if (url) {
          addImage(url);
        }
      });
    }
    
    // ТОЛЬКО фото из gallery массива (если есть)
    if (Array.isArray(attraction?.gallery)) {
      attraction.gallery.forEach((photo: any) => {
        const url = photo.medium || photo.small;
        if (url) {
          addImage(url);
        }
      });
    }
    
    // НЕ используем primaryPhoto - он может дублировать фото из photos
    // Показываем только то, что пришло в ответе деталей

    console.log('Total unique images from API response:', images.length);
    console.log('Image URLs:', images);
    
    return images.length > 0 ? images : ['/placeholder-image.jpg'];
  };

  const formatPrice = (price: any) => {
    if (!price) return 'Price not available';
    // Используем publicAmount как приоритетную цену, chargeAmount как fallback
    // Нормализуем цену с точностью до 2 знаков после запятой для согласованности
    const amount = price.publicAmount ?? price.chargeAmount ?? 0;
    return `${price.currency} ${Number(amount.toFixed(2))}`;
  };

  const getDuration = () => {
    // duration может приходить в разных полях, поэтому показываем только если явно есть
    if (attraction?.duration) return attraction.duration;
    if (attraction?.durationLabel) return attraction.durationLabel;
    return null;
  };

  const getCancellationPolicy = () => {
    if (attraction?.cancellationPolicy?.hasFreeCancellation) {
      return t('freeCancellationAvailable');
    }
    return t('cancellationPolicyVaries');
  };

  const getFlagLabel = (flag: string) => {
    const flagLabels: { [key: string]: string } = {
      'bestseller': t('bestsellerLabel'),
      'popularFor1Traveler': t('popularForTrips').replace('{count}', '1'),
      'popularFor2Travelers': t('popularForTrips').replace('{count}', '2'),
      'popularFor3Travelers': t('popularForTrips').replace('{count}', '3'),
      'aiBadgesExpertGuide': t('expertGuide'),
      'aiBadgesAdmissionIncluded': t('included'),
      'aiBadgesPickup': t('pickupIncluded'),
      'aiBadgesAudio': t('audioGuide')
    };
    return flagLabels[flag] || flag;
  };

  const getFlagColor = (flag: string) => {
    if (flag === 'bestseller') return '#ff6b35';
    if (flag.startsWith('popularFor')) return '#4caf50';
    if (flag.startsWith('aiBadges')) return '#2196f3';
    return '#666';
  };

  const images = getImages();

  // Move useEffect before any conditional returns to fix "Rendered more hooks" error
  useEffect(() => {
    if (!showAllPhotos || images.length === 0) return;

    const preloadImage = (url: string) => {
      const img = new Image();
      img.src = url;
    };

    const nextIndex = (selectedPhotoIndex + 1) % images.length;
    const prevIndex = (selectedPhotoIndex - 1 + images.length) % images.length;

    if (images[nextIndex]) preloadImage(images[nextIndex]);
    if (images[prevIndex]) preloadImage(images[prevIndex]);
  }, [selectedPhotoIndex, showAllPhotos, images]);

  // Ensure all variables used in debug/logging are defined BEFORE usage or conditionals
  const rating = attraction?.reviewsStats?.combinedNumericStats?.average || 0;
  const reviewCount = attraction?.reviewsStats?.combinedNumericStats?.total || 0;
  const duration = getDuration();
  const guideLanguages = Array.isArray(attraction?.guideSupportedLanguages)
    ? attraction.guideSupportedLanguages.join(', ')
    : null;
  const cityName = attraction?.ufiDetails?.bCityName || attraction?.addresses?.arrival?.[0]?.city;

  // Debug information
  console.log('AttractionDetail render:', {
    attractionId,
    attractionName,
    attraction: attraction,
    images: images,
    rating: rating
  });

  if (loading) {
    return (
      <div className="attraction-detail">
        <div className="attraction-detail-header">
          <div className="skeleton-circle"></div>
          <div className="skeleton-header-actions">
            <div className="skeleton-circle small"></div>
            <div className="skeleton-circle small"></div>
          </div>
        </div>

        <div className="attraction-badge skeleton-line short"></div>
        <div className="skeleton-title"></div>
        <div className="skeleton-subtitle"></div>

        <div className="attraction-photo-gallery">
          <div className="main-photos">
            <div className="large-photo skeleton-block"></div>
            <div className="small-photo skeleton-block"></div>
          </div>
          <div className="bottom-photos">
            <div className="bottom-photo skeleton-block"></div>
            <div className="bottom-photo skeleton-block"></div>
            <div className="bottom-photo skeleton-block"></div>
          </div>
        </div>

        <div className="key-info">
          <div className="info-item skeleton-line"></div>
          <div className="info-item skeleton-line"></div>
        </div>

        <div className="description-section">
          <div className="skeleton-line wide"></div>
          <div className="skeleton-line wide"></div>
          <div className="skeleton-line"></div>
        </div>
      </div>
    );
  }

  if (error || !attraction) {
    return (
      <div className="attraction-detail-error">
        <h2>Error</h2>
        <p>{error || 'Attraction not found'}</p>
        <p>Debug info:</p>
        <p>Attraction ID: {attractionId}</p>
        <p>Attraction Name: {attractionName}</p>
        <p>Error: {error}</p>
        <p>Attraction data: {JSON.stringify(attraction, null, 2)}</p>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="attraction-detail">
      {/* Header */}
      <div className="attraction-detail-header">
        <button onClick={() => navigate(-1)} className="back-btn" aria-label="Back">
          ←
        </button>
        <div className="header-actions">
          <button className="action-btn" aria-label="Share">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 6l-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 2v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="action-btn" aria-label="Save">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {cityName && (
        <div className="attraction-badge">
          {t('inLabel')} {cityName}
        </div>
      )}

        <h1 className="attraction-title">{attraction.name}</h1>

      {/* short lead description if present */}
      {(attraction.shortDescription || attraction.description) && (
        <p className="attraction-description">
          {attraction.shortDescription || (attraction.description ? attraction.description.split('\n')[0] : '')}
        </p>
      )}
      
      {/* Labels (Free cancellation, etc.) */}
      {Array.isArray(attraction.labels) && attraction.labels.length > 0 && (
        <div className="attraction-labels">
          {attraction.labels.map((label: any, idx: number) => (
            <span key={idx} className="label-badge">
              {label.text || label}
            </span>
          ))}
        </div>
      )}
        
        {/* Rating */}
        <div className="attraction-rating">
          <div className="rating-stars">
            {'★'.repeat(Math.floor(rating))}
            {'☆'.repeat(5 - Math.floor(rating))}
          </div>
          <span className="rating-score">{rating.toFixed(1)}</span>
        <span className="rating-text">
          {reviewCount > 0 ? `${reviewCount} ${t('reviews')}` : t('newOnPlatform')}
        </span>
      </div>

      {/* Photo gallery in Booking.com style layout */}
      <div className="attraction-photo-gallery">
        {images.length > 0 && (
          <>
            <div className="main-photos">
              <div className="large-photo" onClick={() => { setSelectedPhotoIndex(0); setShowAllPhotos(true); }}>
                <img
                  src={images[0]}
                  alt={attraction.name}
                />
                {images.length > 1 && (
                  <div className="photo-overlay">
                    <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                    <span>{t('showAllPhotos').replace('{count}', String(images.length))}</span>
                  </div>
                )}
              </div>
              {images[1] && (
                <div className="small-photo" onClick={() => { setSelectedPhotoIndex(1); setShowAllPhotos(true); }}>
                  <img
                    src={images[1]}
            alt={attraction.name}
                  />
                </div>
              )}
            </div>

            {images.length > 2 && (
              <div className="bottom-photos">
                {images.slice(2, 5).map((url, index) => (
                  <div 
                    key={index} 
                    className="bottom-photo"
                    onClick={() => { setSelectedPhotoIndex(index + 2); setShowAllPhotos(true); }}
                  >
                    <img src={url} alt={`${attraction.name} photo ${index + 3}`} />
                    {index === 2 && images.length > 5 && (
                      <div className="more-photos-overlay">
                        <span className="more-count">+{images.length - 5}</span>
                        <span className="more-text">{t('morePhotos')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Full screen photo gallery modal */}
      {showAllPhotos && images.length > 0 && (
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
                {selectedPhotoIndex + 1} / {images.length}
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
                setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
              }}
            >
              <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            
            <div className="photo-container">
              <img 
                src={images[selectedPhotoIndex]} 
                alt={`${attraction.name} - Photo ${selectedPhotoIndex + 1}`}
                className="modal-photo"
              />
        </div>
        
              <button
              className="gallery-nav-btn gallery-next-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhotoIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
              }}
            >
              <svg viewBox="0 0 24 24" fill="white" width="32" height="32">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          </div>
          
          {/* Thumbnails */}
          <div className="photo-thumbnails">
            {images.map((url, index) => (
              <div 
                key={index}
                className={`thumbnail ${index === selectedPhotoIndex ? 'active' : ''}`}
                onClick={() => setSelectedPhotoIndex(index)}
              >
                <img 
                  src={url} 
                  alt={`Thumbnail ${index + 1}`}
                />
              </div>
            ))}
          </div>
          </div>
        )}

      {/* Key Information */}
      <div className="key-info">
        {duration && (
        <div className="info-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
            <span>{duration}</span>
        </div>
        )}
        
        <div className="info-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" stroke="currentColor" strokeWidth="2"/>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 3c0 1-1 3-3 3s-3-2-3-3 1-3 3-3 3 2 3 3" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 21c0-1 1-3 3-3s3 2 3 3-1 3-3 3-3-2-3-3" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span>{getCancellationPolicy()}</span>
        </div>
        
        {guideLanguages && (
          <div className="info-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="9" x2="9.01" y2="9" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" y1="9" x2="15.01" y2="9" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>{t('guideLanguage')} {guideLanguages}</span>
          </div>
        )}
        
        {attraction?.operatedBy && (
          <div className="info-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>{t('operatedBy')} {attraction.operatedBy}</span>
          </div>
        )}
        
        {attraction?.groupSize && (
          <div className="info-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>{t('groupSize')} {attraction.groupSize}</span>
          </div>
        )}
      </div>

      {/* Description Section */}
      <div className="description-section">
        <h3>{t('description')}</h3>
        <p>{attraction.description || attraction.shortDescription || t('noDescriptionAvailable')}</p>
        
        {/* Additional information from API */}
        {attraction.flags && attraction.flags.length > 0 && (
          <div className="attraction-features">
            <h4>{t('attractionFeatures')}</h4>
            <div className="features-list">
              {attraction.flags.slice(0, 5).map((flag: any, index: number) => (
                <div key={index} className="feature-item">
                  <span className="feature-badge" style={{ backgroundColor: getFlagColor(flag.flag) }}>
                    {getFlagLabel(flag.flag)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Included / Not included */}
        {Array.isArray(attraction.whatsIncluded) && attraction.whatsIncluded.length > 0 && (
          <div className="additional-info">
            <h4>{t('whatsIncluded')}</h4>
            <ul>
              {attraction.whatsIncluded.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        
        {Array.isArray(attraction.notIncluded) && attraction.notIncluded.length > 0 && (
          <div className="additional-info">
            <h4>{t('notIncluded')}</h4>
            <ul>
              {attraction.notIncluded.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        
        {attraction.highlights && Array.isArray(attraction.highlights) && attraction.highlights.length > 0 && (
          <div className="additional-info">
            <h4>Highlights</h4>
            <ul>
              {attraction.highlights.map((highlight: string, index: number) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Unique Selling Points */}
        {attraction.uniqueSellingPoints && Array.isArray(attraction.uniqueSellingPoints) && attraction.uniqueSellingPoints.length > 0 && (
          <div className="additional-info">
            <h4>{t('whyChooseThisExperience')}</h4>
            <ul>
              {attraction.uniqueSellingPoints.map((point: string, index: number) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Important info from additionalInfo */}
        {attraction.additionalInfo && (
          <div className="additional-info">
            <h4>{t('attractionImportantInfo')}</h4>
            {String(attraction.additionalInfo)
              .split('\n')
              .filter((line: string) => line.trim().length > 0)
              .map((line: string, idx: number) => (
                <p key={idx}>{line}</p>
              ))}
          </div>
        )}
        
        {/* On-site Requirements */}
        {attraction.onSiteRequirements && (
          <div className="additional-info">
            <h4>{t('onSiteRequirements')}</h4>
            {attraction.onSiteRequirements.voucherPrintingRequired !== null && (
              <p>{t('voucherPrinting')}: {attraction.onSiteRequirements.voucherPrintingRequired ? t('voucherPrintingRequired') : t('voucherPrintingNotRequired')}</p>
            )}
          </div>
        )}
        
        {/* Location addresses with embedded Google Maps - only show if addresses exist */}
        {attraction.addresses && (
          (Array.isArray(attraction.addresses.attraction) && attraction.addresses.attraction.length > 0) ||
          (Array.isArray(attraction.addresses.departure) && attraction.addresses.departure.length > 0) ||
          (Array.isArray(attraction.addresses.arrival) && attraction.addresses.arrival.length > 0)
        ) && (
          <div className="addresses-section">
            <h3 className="section-title">{t('locationAndMeetingPoints')}</h3>
            
            {/* Attraction Location (main address) */}
            {Array.isArray(attraction.addresses.attraction) && attraction.addresses.attraction.length > 0 && (
              <div className="address-block">
                <div className="address-header">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <h4>{t('location')}</h4>
                </div>
                {attraction.addresses.attraction.map((addr: any, idx: number) => (
                  <div key={idx} className="address-content">
                    <div className="address-info">
                      <p className="address-main"><strong>{addr.address || addr.city}</strong></p>
                      {addr.city && addr.address && <p className="address-secondary">{addr.city}, {addr.country?.toUpperCase()}</p>}
                      {addr.instructions && (
                        <div className="address-instructions">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                          <span>{addr.instructions}</span>
                        </div>
                      )}
                      {addr.latitude && addr.longitude && (
                        <div className="map-actions">
                          <a
                            href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="map-link-btn"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            Open in Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                    {addr.latitude && addr.longitude && (
                      <div className="map-container">
                        <iframe
                          width="100%"
                          height="200"
                          style={{ border: 0, borderRadius: '8px' }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}&hl=en&z=15&output=embed`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Departure Point */}
            {Array.isArray(attraction.addresses.departure) && attraction.addresses.departure.length > 0 && (
              <div className="address-block">
                <div className="address-header">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <h4>{t('departurePoint')}</h4>
                </div>
                {attraction.addresses.departure.map((addr: any, idx: number) => (
                  <div key={idx} className="address-content">
                    <div className="address-info">
                      <p className="address-main"><strong>{addr.address || addr.city}</strong></p>
                      {addr.city && addr.address && <p className="address-secondary">{addr.city}, {addr.country?.toUpperCase()}</p>}
                      {addr.instructions && (
                        <div className="address-instructions">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                          <span>{addr.instructions}</span>
                        </div>
                      )}
                      {addr.latitude && addr.longitude && (
                        <div className="map-actions">
                          <a
                            href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="map-link-btn"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            Open in Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                    {addr.latitude && addr.longitude && (
                      <div className="map-container">
                        <iframe
                          width="100%"
                          height="200"
                          style={{ border: 0, borderRadius: '8px' }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}&hl=en&z=15&output=embed`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Arrival/End Point */}
            {Array.isArray(attraction.addresses.arrival) && attraction.addresses.arrival.length > 0 && (
              <div className="address-block">
                <div className="address-header">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <h4>{t('endPoint')}</h4>
                </div>
                {attraction.addresses.arrival.map((addr: any, idx: number) => (
                  <div key={idx} className="address-content">
                    <div className="address-info">
                      <p className="address-main"><strong>{addr.address || addr.city}</strong></p>
                      {addr.city && addr.address && <p className="address-secondary">{addr.city}, {addr.country?.toUpperCase()}</p>}
                      {addr.instructions && (
                        <div className="address-instructions">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                          <span>{addr.instructions}</span>
                        </div>
                      )}
                      {addr.latitude && addr.longitude && (
                        <div className="map-actions">
                          <a
                            href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="map-link-btn"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            Open in Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                    {addr.latitude && addr.longitude && (
                      <div className="map-container">
                        <iframe
                          width="100%"
                          height="200"
                          style={{ border: 0, borderRadius: '8px' }}
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}&hl=en&z=15&output=embed`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {attraction.cancellationPolicy && (
          <div className="additional-info">
            <h4>{t('cancellationPolicy')}</h4>
            <p>{getCancellationPolicy()}</p>
          </div>
        )}
        
        {/* Recent reviews from nested structure */}
        {attraction.reviews?.reviews && Array.isArray(attraction.reviews.reviews) && attraction.reviews.reviews.length > 0 && (
          <div className="additional-info">
            <h4>{t('recentReviews')}</h4>
            <div className="reviews-list">
              {attraction.reviews.reviews.slice(0, 3).map((review: any, index: number) => (
                <div key={index} className="review-item">
                  <div className="review-rating">
                    {'★'.repeat(Math.round(review.numericRating || 0))}
                  </div>
                  <p className="review-text">"{review.content || t('noReviewText')}"</p>
                  <p className="review-author">
                    - {review.user?.name || t('anonymous')}
                    {review.user?.cc1 && ` (${review.user.cc1.toUpperCase()})`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="bottom-action-bar">
        <div className="price-info">
          <span className="price-amount">{formatPrice(attraction.representativePrice)}</span>
          <span className="price-per">{t('perPerson')}</span>
        </div>
        <button
          className="book-button"
          onClick={() =>
            navigate(
              `/attraction-availability?id=${attractionId || attraction.slug}&name=${encodeURIComponent(
                attraction.name || ''
              )}`
            )
          }
        >
          {t('bookNow')}
        </button>
      </div>
    </div>
  );
};

export default AttractionDetail;