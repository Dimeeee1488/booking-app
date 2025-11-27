export const getPaymentStorageKey = (): string => {
  try {
    const offerId = sessionStorage.getItem('current_offer_id');
    if (offerId) {
      return offerId;
    }

    const attractionRaw = sessionStorage.getItem('attraction_payment_payload');
    if (attractionRaw) {
      try {
        const parsed = JSON.parse(attractionRaw);
        const attractionId = parsed?.attraction?.id || parsed?.attraction?.slug;
        if (attractionId) {
          return `attraction:${attractionId}`;
        }
      } catch {
        // ignore parse errors, fall through to default
      }
      return 'attraction:default';
    }
  } catch {
    // ignore storage access issues
  }
  return 'payment:default';
};


