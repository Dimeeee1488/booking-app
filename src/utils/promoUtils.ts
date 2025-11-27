/**
 * Promo utilities for hotel discounts
 * - 45% discount on all hotels for any dates
 * - 2 free nights when booking 7+ nights (plus 45% discount)
 */

export interface PromoDiscount {
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  discountPercent: number; // Общий процент экономии (для внутренних расчетов)
  promoDiscountPercent: number; // Процент скидки промо (45%)
  freeNights: number;
  appliedPromos: string[];
}

export interface PromoCalculationParams {
  basePrice: number;
  nights: number;
  currency: string;
}

/**
 * Calculate promo discounts for hotels
 * @param params - Calculation parameters
 * @returns PromoDiscount object with all discount details
 */
export function calculatePromoDiscount(params: PromoCalculationParams): PromoDiscount {
  const { basePrice, nights } = params;
  
  let discountedPrice = basePrice;
  let discountAmount = 0;
  let discountPercent = 0;
  let freeNights = 0;
  const appliedPromos: string[] = [];
  
  // If 7+ nights, first subtract 2 free nights (don't count 2 nights)
  if (nights >= 7) {
    const pricePerNight = basePrice / nights;
    const twoNightsValue = pricePerNight * 2;
    
    // Subtract 2 nights from the base price
    discountedPrice = basePrice - twoNightsValue;
    discountAmount = twoNightsValue;
    freeNights = 2;
    appliedPromos.push('2 nights free');
  }
  
  // Then apply 45% discount on the remaining price (after free nights)
  const fortyFivePercentDiscount = discountedPrice * 0.45;
  discountedPrice = discountedPrice - fortyFivePercentDiscount;
  discountAmount = discountAmount + fortyFivePercentDiscount;
  const promoDiscountPercent = 45; // Показываем и применяем 45%
  appliedPromos.push('45% OFF');
  
  // Ensure price doesn't go negative
  if (discountedPrice < 0) {
    discountedPrice = 0;
  }
  
  // Recalculate total discount percentage based on original price (для внутренних расчетов)
  if (basePrice > 0) {
    discountPercent = Math.round((discountAmount / basePrice) * 100);
  }
  
  return {
    originalPrice: Number(basePrice.toFixed(2)),
    discountedPrice: Number(discountedPrice.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    discountPercent, // Общий процент (для внутренних расчетов)
    promoDiscountPercent, // Процент промо-скидки (45%)
    freeNights,
    appliedPromos,
  };
}

/**
 * Get promo badge text based on applied promos
 */
export function getPromoBadgeText(appliedPromos: string[]): string {
  if (appliedPromos.includes('2 nights free') && appliedPromos.includes('45% OFF')) {
    return 'Week Deal';
  }
  if (appliedPromos.includes('2 nights free')) {
    return '2 nights free';
  }
  if (appliedPromos.includes('45% OFF')) {
    return '45% OFF';
  }
  return '';
}

/**
 * Check if promo is applicable
 */
export function isPromoApplicable(nights: number): boolean {
  // Promo applies to all bookings (35% always), and 2 free nights for 7+ nights
  return true;
}

