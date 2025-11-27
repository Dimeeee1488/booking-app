import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './AttractionAvailability.css';
import { useTranslation } from './hooks/useTranslation';

const DETAIL_CACHE_PREFIX = 'attractionDetail';

type TicketKey = 'adult' | 'teen' | 'child' | 'infant';

// TICKET_TYPES will be created inside component to use translations

interface TicketSelectionSummary {
  slug: string;
  currency: string;
  basePrice: number;
  selectedLanguage: string | null;
  total: number;
  ticketCounts: Record<TicketKey, number>;
  breakdown: Array<{
    type: TicketKey;
    label: string;
    count: number;
    pricePerTicket: number;
    subtotal: number;
  }>;
  timestamp: number;
}

const SELECTION_STORAGE_KEY = 'attraction_ticket_selection';

const AttractionAvailability: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const slug = searchParams.get('id');
  const { t } = useTranslation();

  const [attraction, setAttraction] = React.useState<any>(null);
  const [ticketCounts, setTicketCounts] = React.useState<Record<TicketKey, number>>({
    adult: 0,
    teen: 0,
    child: 0,
    infant: 0,
  });
  const [selectedLanguage, setSelectedLanguage] = React.useState<string | null>(null);

  const TICKET_TYPES = React.useMemo(() => ({
    adult: { label: t('adultLabel'), ageRange: t('adultAgeRange'), multiplier: 1 },
    teen: { label: t('teenLabel'), ageRange: t('teenAgeRange'), multiplier: 0.9 },
    child: { label: t('childLabel'), ageRange: t('childAgeRange'), multiplier: 0.85 },
    infant: { label: t('infantLabel'), ageRange: t('infantAgeRange'), multiplier: 0 },
  }), [t]);

  React.useEffect(() => {
    if (!slug) return;
    try {
      const cached = sessionStorage.getItem(`${DETAIL_CACHE_PREFIX}:${slug}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setAttraction(parsed?.data ?? parsed);
        return;
      }
      const fallback = sessionStorage.getItem('selectedAttraction');
      if (fallback) {
        setAttraction(JSON.parse(fallback));
      }
    } catch (err) {
      console.error('Unable to load attraction data for availability', err);
    }
  }, [slug]);

  // Нормализуем базовую цену с точностью до 2 знаков после запятой для согласованности
  // Используем publicAmount как приоритетную цену, chargeAmount как fallback
  const rawBasePrice = attraction?.representativePrice?.publicAmount ?? attraction?.representativePrice?.chargeAmount ?? 0;
  const basePrice = Number(rawBasePrice.toFixed(2));
  const currency = attraction?.representativePrice?.currency ?? 'USD';

  const languageOptions = React.useMemo(() => {
    if (!Array.isArray(attraction?.guideSupportedLanguages)) {
      return [];
    }
    return attraction.guideSupportedLanguages.filter(
      (lang: string) => typeof lang === 'string' && lang.trim().length > 0
    );
  }, [attraction]);

  React.useEffect(() => {
    if (languageOptions.length > 0) {
      setSelectedLanguage((prev) => prev && languageOptions.includes(prev) ? prev : languageOptions[0]);
    } else if (selectedLanguage) {
      setSelectedLanguage(null);
    }
  }, [languageOptions, selectedLanguage]);

  React.useEffect(() => {
    try {
      const savedRaw = sessionStorage.getItem(SELECTION_STORAGE_KEY);
      if (!savedRaw) return;
      const saved = JSON.parse(savedRaw) as TicketSelectionSummary;
      if (saved?.slug && saved.slug === slug && saved.ticketCounts) {
        setTicketCounts(saved.ticketCounts);
      }
    } catch (err) {
      console.warn('Failed to restore ticket selection', err);
    }
  }, [slug]);

  const getTicketPrice = (type: TicketKey) => {
    if (type === 'infant') return 0;
    // Умножаем нормализованную базовую цену на multiplier и нормализуем результат
    const price = basePrice * TICKET_TYPES[type].multiplier;
    return Number(price.toFixed(2));
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  // Вычисляем итоговую цену с точностью до 2 знаков после запятой
  // Каждая цена билета уже нормализована в getTicketPrice
  const total = Number(((Object.keys(ticketCounts) as TicketKey[]).reduce((sum, type) => {
    const pricePerTicket = getTicketPrice(type);
    const subtotal = ticketCounts[type] * pricePerTicket;
    return sum + subtotal;
  }, 0)).toFixed(2));

  const selectionBreakdown = React.useMemo(() => {
    return (Object.keys(ticketCounts) as TicketKey[]).map((type) => {
      const count = ticketCounts[type];
      const pricePerTicket = getTicketPrice(type);
      return {
        type,
        label: TICKET_TYPES[type].label,
        count,
        pricePerTicket: Number(pricePerTicket.toFixed(2)),
        subtotal: Number((count * pricePerTicket).toFixed(2)),
      };
    });
  }, [ticketCounts, basePrice]);

  const increment = (type: TicketKey, delta: 1 | -1) => {
    setTicketCounts((prev) => ({
      ...prev,
      [type]: Math.max(0, prev[type] + delta),
    }));
  };

  const handleNext = () => {
    if (total === 0) return;
    const summary: TicketSelectionSummary = {
      slug: slug || attraction.slug,
      currency,
      basePrice,
      selectedLanguage,
      total,
      ticketCounts,
      breakdown: selectionBreakdown.filter((item) => item.count > 0 && item.subtotal > 0),
      timestamp: Date.now(),
    };
    try {
      sessionStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(summary));
    } catch (err) {
      console.warn('Unable to persist ticket selection', err);
    }
    navigate(
      `/attraction-checkout?id=${slug || attraction.slug}&name=${encodeURIComponent(
        attraction.name || ''
      )}`
    );
  };

  if (!attraction) {
    return (
      <div className="availability-page">
        <div className="availability-header">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label={t('back')}>
            ←
          </button>
          <h1>{t('availability')}</h1>
          <div className="header-spacer" />
        </div>
        <div className="availability-empty">
          <p>{t('attractionDataUnavailable')}</p>
        </div>
      </div>
    );
  }

  const heroImage =
    attraction.photos?.[0]?.small ||
    attraction.primaryPhoto?.small ||
    attraction.gallery?.[0]?.small ||
    '';

  return (
    <div className="availability-page">
      <div className="availability-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <h1>{t('availability')}</h1>
        <div className="header-spacer" />
      </div>

      <div className="availability-content">
        <section className="availability-hero">
          <div className="hero-labels">
            {attraction.flags?.slice(0, 1).map((flag: any) => (
              <span key={flag.flag} className="hero-chip">
                {flag.flag.replace(/_/g, ' ')}
              </span>
            ))}
            {attraction.cancellationPolicy?.hasFreeCancellation && (
              <span className="hero-chip positive">{t('freeCancellationAvailable')}</span>
            )}
          </div>
          <div className="hero-body">
            <div className="hero-info">
              <h2>{attraction.name}</h2>
              <div className="hero-meta">
                <span className="rating-pill">
                  ⭐ {attraction.reviewsStats?.combinedNumericStats?.average?.toFixed(1) ?? 'New'} ·{' '}
                  {attraction.reviewsStats?.combinedNumericStats?.total
                    ? `${attraction.reviewsStats.combinedNumericStats.total} ${t('reviews')}`
                    : t('brandNew')}
                </span>
                {languageOptions.length > 0 && (
                  <span className="hero-languages">
                    {languageOptions.slice(0, 2).join(' • ')}
                    {languageOptions.length > 2 && ` +${languageOptions.length - 2} more`}
                  </span>
                )}
              </div>
            </div>
            {heroImage && (
              <div className="hero-photo">
                <img src={heroImage} alt={attraction.name} />
              </div>
            )}
          </div>
        </section>

        <section className="ticket-card">
          <header>
            <div>
              <p className="ticket-title">{attraction.name}</p>
              <p className="ticket-subtitle">
                {attraction.cancellationPolicy?.hasFreeCancellation
                  ? t('freeCancellationAvailable')
                  : t('flexibleBookingOptions')}
              </p>
            </div>
            <div className="ticket-badge">{t('availableTicket')}</div>
          </header>

          <div className="ticket-meta">
            <div className="meta-card">
              <span className="detail-label">{t('startsAt')}</span>
              <span className="detail-value">{attraction.startTimes?.[0] || '14:00'}</span>
            </div>
            <div className="meta-card">
              <span className="detail-label">{t('pickup')}</span>
              <span className="detail-value">
                {attraction.whatsIncluded?.some((item: string) =>
                  item.toLowerCase().includes('pickup')
                )
                  ? t('pickupIncluded')
                  : t('meetOnLocation')}
              </span>
            </div>
            {attraction.cancellationPolicy?.hasFreeCancellation && (
              <div className="meta-card">
                <span className="detail-label">{t('cancellationPolicy')}</span>
                <span className="detail-value">
                  {t('cancellationBeforeStartTime')}
                </span>
              </div>
            )}
            {languageOptions.length > 0 && selectedLanguage && (
              <div className="meta-card meta-card-language">
                <span className="detail-label">{t('languageOptions')}</span>
                <div className="language-chips">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang}
                      className={`language-chip ${
                        selectedLanguage === lang ? 'active' : ''
                      }`}
                      onClick={() => setSelectedLanguage(lang)}
                      type="button"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ticket-quantity">
            <p className="section-label">{t('howManyTickets')}</p>
            <div className="ticket-rows">
              {(Object.keys(TICKET_TYPES) as TicketKey[]).map((type) => (
                <div key={type} className="ticket-row">
                  <div className="ticket-row-info">
                    <p className="ticket-row-title">
                      {TICKET_TYPES[type].label}{' '}
                      <span className="ticket-age">({TICKET_TYPES[type].ageRange})</span>
                    </p>
                    {type === 'infant' ? (
                      <p className="ticket-price">{t('freeLabel')}</p>
                    ) : (
                      <span className="ticket-price">
                        {formatPrice(getTicketPrice(type))}
                      </span>
                    )}
                  </div>
                  <div className="ticket-counter">
                    <button onClick={() => increment(type, -1)}>-</button>
                    <span>{ticketCounts[type]}</span>
                    <button onClick={() => increment(type, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ticket-total">
            <div>
              <p className="total-label">{t('total')}</p>
              <p className="total-value">{formatPrice(total)}</p>
            </div>
            <button className="next-btn" onClick={handleNext} disabled={total === 0}>
              {t('next')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AttractionAvailability;

