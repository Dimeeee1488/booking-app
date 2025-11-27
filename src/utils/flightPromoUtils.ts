export interface FlightPromoParams {
  basePrice: number;
  currency: string;
  durationHours: number;
}

export interface FlightPromoDiscount {
  originalPrice: number;
  discountedPrice: number;
  discountAmount: number;
  discountPercent: number; // фактическая скидка
  displayPercent: number; // то, что показываем пользователю
  appliedPromos: string[];
  bonuses: string[];
  promoCode: 'longHaul65' | 'shortHaul45' | 'budget30';
}

const LONG_HAUL_THRESHOLD_HOURS = 4; // 4+ часов — long-haul
const LONG_HAUL_ACTUAL_DISCOUNT = 0.55; // применяем 55%
const LONG_HAUL_DISPLAY_DISCOUNT = 0.55; // показываем реальный 55%
const SHORT_HAUL_ACTUAL_DISCOUNT = 0.55; // применяем 55%
const SHORT_HAUL_DISPLAY_DISCOUNT = 0.55; // показываем реальный 55%
const BUDGET_THRESHOLD = 35; // билеты до $35/эквивалент
const BUDGET_DISCOUNT = 0.55; // применяем и показываем 55%

export function calculateFlightPromoDiscount(params: FlightPromoParams): FlightPromoDiscount {
  const { basePrice, durationHours } = params;

  let promoCode: FlightPromoDiscount['promoCode'] = 'shortHaul45';
  let actualRate = SHORT_HAUL_ACTUAL_DISCOUNT;
  let displayRate = SHORT_HAUL_DISPLAY_DISCOUNT;

  if (basePrice <= BUDGET_THRESHOLD) {
    promoCode = 'budget30';
    actualRate = BUDGET_DISCOUNT;
    displayRate = BUDGET_DISCOUNT;
  } else if (durationHours >= LONG_HAUL_THRESHOLD_HOURS) {
    promoCode = 'longHaul65';
    actualRate = LONG_HAUL_ACTUAL_DISCOUNT;
    displayRate = LONG_HAUL_DISPLAY_DISCOUNT;
  }

  const discountAmount = Number((basePrice * actualRate).toFixed(2));
  const discountedPrice = Math.max(0, Number((basePrice - discountAmount).toFixed(2)));

  const bonuses = ['freeCheckedBag', 'freeCarryOn'];

  return {
    originalPrice: Number(basePrice.toFixed(2)),
    discountedPrice,
    discountAmount,
    discountPercent: Math.round(actualRate * 100),
    displayPercent: Math.round(displayRate * 100),
    appliedPromos: [promoCode],
    bonuses,
    promoCode,
  };
}

