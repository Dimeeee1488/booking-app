import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Luggage.css';
import { useTranslation } from './hooks/useTranslation';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const BackpackIcon = () => (
  <svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-480q0-56 34-98t86-56v-86h120v80h160v-80h120v86q52 14 86 56t34 98v480q0 33-23.5 56.5T720-80H240Zm0-80h480v-480q0-33-23.5-56.5T640-720H320q-33 0-56.5 23.5T240-640v480Zm340-160h80v-160H300v80h280v80ZM480-440Z"/></svg>
);
const CarryOnIcon = () => (
  <svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M640-280q50 0 85 35t35 85q0 50-35 85t-85 35q-38 0-68.5-22T527-120H320q-33 0-56.5-23.5T240-200v-400q0-33 23.5-56.5T320-680h240v-120q-33 0-56.5-23.5T480-880h160v600Zm-280 80v-400h-40v400h40Zm80-400v400h87q4-15 13-27.5t20-22.5v-350H440Zm200 500q25 0 42.5-17.5T700-160q0-25-17.5-42.5T640-220q-25 0-42.5 17.5T580-160q0 25 17.5 42.5T640-100Zm0-60ZM440-400Zm-80 200v-400 400Zm80-400v400-400Z"/></svg>
);
const CheckedIcon = () => (
  <svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-80v-40q-33 0-56.5-23.5T200-200v-440q0-33 23.5-56.5T280-720h80v-120q0-17 11.5-28.5T400-880h160q17 0 28.5 11.5T600-840v120h80q33 0 56.5 23.5T760-640v440q0 33-23.5 56.5T680-120v40h-80v-40H360v40h-80Zm160-640h80v-80h-80v80Zm40 240q53 0 103.5-13.5T680-534v-106H280v106q46 27 96.5 40.5T480-480Zm-40 120v-42q-42-5-82-15t-78-27v244h400v-244q-38 17-78 27t-82 15v42h-80Zm40 0Zm0-120Zm0 36Z"/></svg>
);

interface TicketExtrasPayload {
  includedBaggage?: Array<{
    type: string;
    maxPiece?: number;
    maxWeight?: number;
    massUnit?: string;
    size?: { maxLength?: number; maxWidth?: number; maxHeight?: number; sizeUnit?: string };
  }>;
  baggageOptions?: Array<{
    type: string;
    price: number;
    currency: string;
    selected?: boolean;
  }>;
}

const Luggage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { t } = useTranslation();
  const currency: string = (location?.state?.currency || 'USD').toUpperCase();
  const baseTotalPerTraveller: number = Number(location?.state?.totalPerTraveller || 0);
  const travellers: number = Number(location?.state?.travellers || 1);
  const offerId: string = location?.state?.offerId || sessionStorage.getItem('current_offer_id') || '';

  const [extras, setExtras] = React.useState<TicketExtrasPayload | null>(location?.state?.ticketExtras || null);
  const [extrasLoading, setExtrasLoading] = React.useState(!extras && !!offerId);
  const [optionalSelections, setOptionalSelections] = React.useState<Record<string, boolean>>({});

  const optionalList = React.useMemo(() => {
    return (extras?.baggageOptions || [])
      .map((opt: any) => ({
        ...opt,
        type: String(opt?.type || '').toUpperCase(),
        currency: opt?.currency || currency,
      }))
      .filter((opt: any) => opt.type === 'CHECKED_IN');
  }, [extras, currency]);

  React.useEffect(() => {
    if (extras || !offerId) {
      setExtrasLoading(false);
      return;
    }
    try {
      const raw = sessionStorage.getItem(`ticket_extras_${offerId}`);
      if (raw) {
        setExtras(JSON.parse(raw));
      }
    } catch (err) {
      console.warn('Luggage: unable to load extras', err);
    } finally {
      setExtrasLoading(false);
    }
  }, [extras, offerId]);

  React.useEffect(() => {
    if (!optionalList.length) {
      setOptionalSelections({});
      return;
    }
    const mapped: Record<string, boolean> = {};
    optionalList.forEach((opt) => {
      mapped[opt.type] = !!opt.selected;
    });
    setOptionalSelections(mapped);
  }, [optionalList]);

  const persistExtras = (nextExtras: TicketExtrasPayload) => {
    if (!offerId) return;
    try {
      sessionStorage.setItem(`ticket_extras_${offerId}`, JSON.stringify(nextExtras));
    } catch (err) {
      console.warn('Luggage: unable to persist extras', err);
    }
  };

  const includedItems = React.useMemo(() => {
    return (extras?.includedBaggage || []).map((item) => ({
      type: String(item.type || '').toUpperCase(),
      maxPiece: item.maxPiece,
      maxWeight: item.maxWeight,
      massUnit: item.massUnit,
      size: item.size,
      personalItem: item.personalItem,
    }));
  }, [extras]);

  // Если багаж платный, не добавляем его к цене (скидка уже применена, багаж "бесплатный")
  // Показываем багаж как бесплатный, но не считаем в финальной цене
  const baggageExtraPerTraveller = 0; // Не добавляем платный багаж к цене, так как скидка уже применена
  
  const finalTotalPerTraveller = Number(baseTotalPerTraveller.toFixed(2));
  const finalTotal = Number((finalTotalPerTraveller * travellers).toFixed(2));

  const formatPrice = (n: number, curr: string = currency) => `${curr} ${Number(n.toFixed(2))}`;

  const getTitle = (type: string) => {
    switch (type) {
      case 'PERSONAL_ITEM':
        return t('personalItem');
      case 'HAND':
        return t('carryOnBag');
      case 'CHECKED_IN':
        return t('checkedBag');
      default:
        return type;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'PERSONAL_ITEM':
        return <BackpackIcon />;
      case 'HAND':
        return <CarryOnIcon />;
      default:
        return <CheckedIcon />;
    }
  };

  const formatDescription = (item: any) => {
    if (item.type === 'PERSONAL_ITEM' || item.personalItem) {
      return t('fitsUnderSeat');
    }
    if (item.type === 'HAND') {
      return t('carryOnDescription');
    }
    const segments: string[] = [];
    if (item.size) {
      const dims = [item.size.maxLength, item.size.maxWidth, item.size.maxHeight]
        .filter((value) => typeof value === 'number')
        .join(' × ');
      if (dims) {
        segments.push(`${dims}${item.size.sizeUnit ? ` ${item.size.sizeUnit}` : ''}`);
      }
    }
    if (item.maxWeight && item.massUnit) {
      segments.push(`${t('maxWeight')} ${item.maxWeight} ${item.massUnit}`);
    } else if (item.maxWeight) {
      segments.push(`${t('maxWeight')} ${item.maxWeight} kg`);
    }
    if (!segments.length && item.type === 'CHECKED_IN') {
      segments.push(t('checkedBagDescription'));
    }
    return segments.join(' · ');
  };

  const toggleOptional = (type: string) => {
    const next = {
      ...optionalSelections,
      [type]: !optionalSelections[type],
    };
    setOptionalSelections(next);
    if (!extras) return;
    const nextExtras: TicketExtrasPayload = {
      ...extras,
      baggageOptions: optionalList.map((opt) => ({
        ...opt,
        selected: next[opt.type] || false,
      })),
    };
    setExtras(nextExtras);
    persistExtras(nextExtras);
  };

  return (
    <div className="luggage-page">
      <div className="luggage-header">
        <button className="back-button" onClick={() => navigate(-1)}><BackIcon/></button>
        <h1>{t('luggage')}</h1>
        <div style={{ width: 24 }}></div>
      </div>

      <div className="luggage-section">
        <h2>{t('included')}</h2>
      <div className="luggage-list">
          {includedItems.map((item, idx) => (
            <div key={`${item.type}-${idx}`} className="luggage-card">
              <div className="luggage-title">{getTitle(item.type)}</div>
              <div className="luggage-sub included">{t('included')}</div>
              <div className="luggage-desc">{formatDescription(item)}</div>
              <div className="tick">{getIcon(item.type)}</div>
        </div>
          ))}
        </div>
      </div>

      {optionalList.length > 0 && (
        <div className="luggage-section">
          <h2>{t('addBaggageOption') || t('luggage')}</h2>
          <div className="luggage-list optional">
            {optionalList.map((opt) => {
              const active = !!optionalSelections[opt.type];
              return (
                <div key={opt.type} className={`luggage-card optional-card ${active ? 'active' : ''}`}>
                  <div className="optional-card-icon">{getIcon(opt.type)}</div>
                  <div className="optional-card-content">
                    <div className="luggage-title">{getTitle(opt.type)}</div>
                    <div className="luggage-desc">{t('checkedBagDescription')}</div>
                    <div className="luggage-price" style={{ color: '#00a884', fontWeight: 600 }}>
                      {t('included')}
                    </div>
                  </div>
                  <div className="optional-card-toggle">
                    <div className={`toggle ${active ? 'on' : ''}`} onClick={() => toggleOptional(opt.type)}>
                      <div className="toggle__knob" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="luggage-footer">
        <div className="price-box">
          <div className="price-label">{formatPrice(finalTotalPerTraveller)}</div>
          <div className="price-sub">
            {formatPrice(finalTotal)} {t('forTravelers')} {travellers} {travellers>1 ? t('travelers') : t('traveler')}
          </div>
        </div>
        <button className="next-button" disabled={extrasLoading} onClick={() => {
          try {
            sessionStorage.setItem('flow_price', JSON.stringify({ currency, totalPerTraveller: finalTotalPerTraveller, travellers }));
          } catch {}
          navigate('/details-hub', {
            state: {
              currency,
              totalPerTraveller: finalTotalPerTraveller,
              travellers,
              flightSummary: location?.state?.flightSummary || null,
              offerId,
            },
          });
        }}>{t('next')}</button>
      </div>
    </div>
  );
};

export default Luggage;

