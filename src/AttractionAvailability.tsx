import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './AttractionAvailability.css';

const DETAIL_CACHE_PREFIX = 'attractionDetail';

type TicketKey = 'adult' | 'teen' | 'child' | 'infant';

const TICKET_TYPES: Record<
  TicketKey,
  { label: string; ageRange: string; multiplier: number; description?: string }
> = {
  adult: { label: 'Adult', ageRange: '13 – 99', multiplier: 1 },
  teen: { label: 'Teen', ageRange: '9 – 12', multiplier: 0.9 },
  child: { label: 'Child', ageRange: '4 – 8', multiplier: 0.85 },
  infant: { label: 'Infant', ageRange: '0 – 3', multiplier: 0 },
};

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

  const [attraction, setAttraction] = React.useState<any>(null);
  const [ticketCounts, setTicketCounts] = React.useState<Record<TicketKey, number>>({
    adult: 0,
    teen: 0,
    child: 0,
    infant: 0,
  });
  const [selectedLanguage, setSelectedLanguage] = React.useState<string | null>(null);

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

  const basePrice =
    attraction?.representativePrice?.publicAmount ??
    attraction?.representativePrice?.chargeAmount ??
    0;
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
    return basePrice * TICKET_TYPES[type].multiplier;
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const total = (Object.keys(ticketCounts) as TicketKey[]).reduce((sum, type) => {
    const price = getTicketPrice(type);
    return sum + ticketCounts[type] * price;
  }, 0);

  const selectionBreakdown = React.useMemo(() => {
    return (Object.keys(ticketCounts) as TicketKey[]).map((type) => {
      const count = ticketCounts[type];
      const pricePerTicket = getTicketPrice(type);
      return {
        type,
        label: TICKET_TYPES[type].label,
        count,
        pricePerTicket,
        subtotal: count * pricePerTicket,
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
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
            ←
          </button>
          <h1>Availability</h1>
          <div className="header-spacer" />
        </div>
        <div className="availability-empty">
          <p>Attraction data is unavailable. Please reopen the detail page.</p>
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
        <h1>Availability</h1>
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
              <span className="hero-chip positive">Free cancellation</span>
            )}
          </div>
          <div className="hero-body">
            <div className="hero-info">
              <h2>{attraction.name}</h2>
              <div className="hero-meta">
                <span className="rating-pill">
                  ⭐ {attraction.reviewsStats?.combinedNumericStats?.average?.toFixed(1) ?? 'New'} ·{' '}
                  {attraction.reviewsStats?.combinedNumericStats?.total
                    ? `${attraction.reviewsStats.combinedNumericStats.total} reviews`
                    : 'Brand new'}
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
                  ? 'Free cancellation available'
                  : 'Flexible booking options'}
              </p>
            </div>
            <div className="ticket-badge">Available ticket</div>
          </header>

          <div className="ticket-meta">
            <div className="meta-card">
              <span className="detail-label">Starts at</span>
              <span className="detail-value">{attraction.startTimes?.[0] || '14:00'}</span>
            </div>
            <div className="meta-card">
              <span className="detail-label">Pickup</span>
              <span className="detail-value">
                {attraction.whatsIncluded?.some((item: string) =>
                  item.toLowerCase().includes('pickup')
                )
                  ? 'Pickup included'
                  : 'Meet on location'}
              </span>
            </div>
            {attraction.cancellationPolicy?.hasFreeCancellation && (
              <div className="meta-card">
                <span className="detail-label">Cancellation</span>
                <span className="detail-value">
                  Free cancellation before start time
                </span>
              </div>
            )}
            {languageOptions.length > 0 && selectedLanguage && (
              <div className="meta-card meta-card-language">
                <span className="detail-label">Language options</span>
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
            <p className="section-label">How many tickets?</p>
            <div className="ticket-rows">
              {(Object.keys(TICKET_TYPES) as TicketKey[]).map((type) => (
                <div key={type} className="ticket-row">
                  <div className="ticket-row-info">
                    <p className="ticket-row-title">
                      {TICKET_TYPES[type].label}{' '}
                      <span className="ticket-age">({TICKET_TYPES[type].ageRange})</span>
                    </p>
                    {type === 'infant' ? (
                      <p className="ticket-price">Free</p>
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
              <p className="total-label">Total</p>
              <p className="total-value">{formatPrice(total)}</p>
            </div>
            <button className="next-btn" onClick={handleNext} disabled={total === 0}>
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AttractionAvailability;

