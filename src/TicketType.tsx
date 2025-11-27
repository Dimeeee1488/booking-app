import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './TicketType.css';
import { useTranslation } from './hooks/useTranslation';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

interface TicketExtrasPayload {
  flexible?: {
    delta: number;
    perTraveller: number;
    currency: string;
  };
  travelProtection?: {
    price: number;
    currency: string;
    title?: string;
    subtitle?: string;
  };
}

const TicketType: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { t } = useTranslation();
  const baseAmount: number = Number(location?.state?.baseAmount || 0);
  const currency: string = String(location?.state?.currency || 'USD').toUpperCase();
  const travellers: number = Number(location?.state?.travellers || 1);
  const offerId: string = location?.state?.offerId || sessionStorage.getItem('current_offer_id') || '';
  const extrasFromState: TicketExtrasPayload | null = location?.state?.ticketExtras || null;
  const [extras, setExtras] = React.useState<TicketExtrasPayload | null>(extrasFromState);
  const [extrasLoading, setExtrasLoading] = React.useState(!extrasFromState && !!offerId);
  const [withProtection, setWithProtection] = React.useState(false);

  // Оценочный процент надбавки для Flexible ~14.3%
  const flexiblePercent = 0.143; 

  const [type, setType] = React.useState<'standard' | 'flexible'>('standard');

  React.useEffect(() => {
    if (extras || !offerId) {
      setExtrasLoading(false);
      return;
    }
    try {
      const cached = sessionStorage.getItem(`ticket_extras_${offerId}`);
      if (cached) {
        setExtras(JSON.parse(cached));
      }
    } catch (err) {
      console.warn('TicketType: unable to restore extras', err);
    } finally {
      setExtrasLoading(false);
    }
  }, [extras, offerId]);
  
  const baggageOptions = Array.isArray(extras?.baggageOptions) ? extras!.baggageOptions : [];
  const baggageSelections = baggageOptions.filter((opt: any) => opt?.selected);
  const baggagePerTraveller = baggageSelections.reduce((sum: number, opt: any) => {
    const price = Number(opt?.price || 0);
    return sum + price;
  }, 0);
  const baggageCurrency = baggageSelections[0]?.currency || currency;

  const formatPrice = (amount: number, customCurrency?: string) => `${(customCurrency || currency)} ${Number(amount.toFixed(2))}`;

  const flexibleData = extras?.flexible;
  const fallbackDelta = Number((baseAmount * flexiblePercent).toFixed(2));
  const flexibleDeltaPerTraveller = flexibleData ? Number(flexibleData.delta.toFixed(2)) : fallbackDelta;
  const flexiblePerTraveller = flexibleData ? Number(flexibleData.perTraveller.toFixed(2)) : Number((baseAmount + flexibleDeltaPerTraveller).toFixed(2));
  const flexibleCurrency = flexibleData?.currency || currency;
  const protectionData = extras?.travelProtection;
  const protectionPerTraveller = protectionData ? Number(protectionData.price.toFixed(2)) : 0;
  const protectionCurrency = protectionData?.currency || currency;
  const protectionActive = Boolean(protectionData && withProtection);
  const totalPerTraveller =
    (type === 'standard' ? baseAmount : flexiblePerTraveller) +
    (protectionActive ? protectionPerTraveller : 0) +
    baggagePerTraveller;
  const total = Number((totalPerTraveller * travellers).toFixed(2));
  const travellersCopy = (t('forTraveler') || 'for {count} traveler').replace('{count}', String(travellers));
  const selectDisabled = extrasLoading;

  return (
    <div className="ticket-page">
      <div className="ticket-header">
        <button className="back-button" onClick={() => navigate(-1)}><BackIcon/></button>
        <h1>{t('selectYourTicketType')}</h1>
        <div style={{ width: 24 }}></div>
      </div>

      <div className="ticket-list">
        <div className={`ticket-card ${type==='standard' ? 'active' : ''}`} onClick={() => setType('standard')}>
          <div className="ticket-card-header">
            <div className="ticket-title">{t('standardTicket')}</div>
            <div className={`radio ${type==='standard' ? 'on' : ''}`}></div>
          </div>
          <div className="ticket-sub">+ {formatPrice(0)} ({formatPrice(baseAmount)} {t('perTraveler')})</div>
          <div className="ticket-note">{t('cheapestPrice')}</div>
          <ul className="ticket-bullets">
            <li>{t('cheapestPrice')}</li>
            <li>{t('noNeedForFlexibility')}</li>
          </ul>
        </div>

        <div className={`ticket-card ${type==='flexible' ? 'active' : ''}`} onClick={() => setType('flexible')}>
          <div className="ticket-card-header">
            <div className="ticket-title">{t('flexibleTicket')}</div>
            <div className={`radio ${type==='flexible' ? 'on' : ''}`}></div>
          </div>
          <div className="ticket-sub">
            + {formatPrice(flexibleDeltaPerTraveller, flexibleCurrency)} ({formatPrice(flexiblePerTraveller, flexibleCurrency)} {t('perTraveler')})
          </div>
          <div className="badge">{t('popularForTrips')}</div>
          <div className="ticket-note">{t('stayFlexible')}</div>
          <ul className="ticket-bullets">
            <li>{t('stayFlexible')}</li>
            <li>{t('requestChange')}</li>
            <li>{t('noExtraFees')}</li>
          </ul>
        </div>
      </div>

      {protectionData && (
        <div className={`ticket-addon ${protectionActive ? 'active' : ''}`} onClick={() => setWithProtection((prev) => !prev)}>
          <div className="ticket-card-header">
            <div className="ticket-title">{protectionData.title || 'Travel protection'}</div>
            <div className={`toggle ${protectionActive ? 'on' : ''}`}>
              <div className="toggle__knob" />
            </div>
          </div>
          <div className="ticket-sub">+ {formatPrice(protectionPerTraveller, protectionCurrency)} {t('perTraveler')}</div>
          <div className="ticket-note">{protectionData.subtitle || 'Protect yourself from the unexpected.'}</div>
          <ul className="ticket-bullets">
            <li>{t('travelProtectionBenefit1') || 'Trip cancellation & interruption coverage'}</li>
            <li>{t('travelProtectionBenefit2') || 'Baggage and delay protection'}</li>
            <li>{t('travelProtectionBenefit3') || 'Emergency assistance 24/7'}</li>
          </ul>
        </div>
      )}

      {extrasLoading && (
        <div className="ticket-loader">
          <div className="ticket-loader__spinner" aria-hidden="true" />
          <div className="ticket-loader__text">{t('loadingFlightDetails') || 'Loading ticket options...'}</div>
        </div>
      )}

      <div className="ticket-footer">
        <div className="price-box">
          <div className="price-label">{formatPrice(totalPerTraveller)}</div>
          <div className="price-sub">{formatPrice(total)} {travellersCopy}</div>
          {baggageSelections.length > 0 && (
            <div className="price-note">
              + {formatPrice(baggagePerTraveller, baggageCurrency)} {t('perTraveler')} · {t('luggage')}
            </div>
          )}
        </div>
        <button className="select-button" disabled={selectDisabled} onClick={() => {
          if (selectDisabled) return;
          navigate('/luggage', { state: { currency, totalPerTraveller, travellers, flightSummary: location?.state?.flightSummary || null, offerId: location?.state?.offerId || null } });
        }}>{t('next')}</button>
      </div>
    </div>
  );
};

export default TicketType;


