// Utility to map aircraft type codes to human-friendly names
// Covers common Airbus, Boeing, Embraer, Bombardier, ATR codes.

const EXACT_MAP: Record<string, string> = {
  // Boeing 777
  "77W": "Boeing 777-300ER",
  "77L": "Boeing 777-200LR",
  "772": "Boeing 777-200",
  "773": "Boeing 777-300",
  // Boeing 787
  "788": "Boeing 787-8",
  "789": "Boeing 787-9",
  "78X": "Boeing 787-10",
  // Boeing 737 family
  "73H": "Boeing 737-800",
  "738": "Boeing 737-800",
  "73G": "Boeing 737-700",
  "739": "Boeing 737-900",
  "73J": "Boeing 737-900",
  "737": "Boeing 737",
  // Boeing others
  "744": "Boeing 747-400",
  "748": "Boeing 747-8",
  "752": "Boeing 757-200",
  "753": "Boeing 757-300",
  "763": "Boeing 767-300",
  "764": "Boeing 767-400",

  // Airbus A320 family
  "318": "Airbus A318",
  "319": "Airbus A319",
  "320": "Airbus A320",
  "321": "Airbus A321",
  "32N": "Airbus A320neo family",
  "32Q": "Airbus A321neo",
  "32A": "Airbus A320neo",
  // Airbus widebody
  "332": "Airbus A330-200",
  "333": "Airbus A330-300",
  "338": "Airbus A330-800neo",
  "339": "Airbus A330-900neo",
  "359": "Airbus A350-900",
  "35K": "Airbus A350-1000",
  "388": "Airbus A380-800",

  // Embraer E-Jets
  "E70": "Embraer 170",
  "E75": "Embraer 175",
  "E90": "Embraer 190",
  "E95": "Embraer 195",

  // Bombardier CRJ
  "CR2": "Bombardier CRJ200",
  "CR7": "Bombardier CRJ700",
  "CR9": "Bombardier CRJ900",

  // ATR turboprops
  "AT7": "ATR 72",
  "AT5": "ATR 42",
};

export function formatAircraftType(raw?: string): string {
  if (!raw) return '';
  const code = String(raw).trim().toUpperCase();
  if (!code) return '';

  // Exact matches first
  if (EXACT_MAP[code]) return EXACT_MAP[code];

  // Heuristics
  // Pure numeric 3-digit that looks like Airbus A31x / A32x
  if (/^31\d$/.test(code)) {
    return `Airbus A3${code.slice(1)}`; // 318/319/310
  }
  if (/^32\d$/.test(code)) {
    return `Airbus A3${code.slice(1)}`; // 320/321
  }

  // 77X (other than explicit) → Boeing 777 series
  if (/^77[A-Z0-9]$/.test(code)) {
    return 'Boeing 777';
  }

  // 78X variants → Boeing 787 series
  if (/^78[A-Z0-9]$/.test(code)) {
    return 'Boeing 787 Dreamliner';
  }

  // 73X variants → Boeing 737 series
  if (/^73[A-Z0-9]$/.test(code)) {
    return 'Boeing 737';
  }

  // Fallback: return the raw code
  return code;
}

export default formatAircraftType;

/**
 * Централизованная функция для расчета общей суммы за выбранные места во всех сегментах
 * @param baseOfferId - ID оффера для получения данных о сегментах
 * @param currency - Валюта для расчета
 * @returns Общая сумма за все выбранные места во всех сегментах
 */
export const calculateTotalSeatPrice = (baseOfferId: string, currency: string): number => {
  try {
    if (!baseOfferId) return 0;

    // Получаем данные о полете из sessionStorage
    const rawOffer = sessionStorage.getItem(`selectedFlightOffer:${baseOfferId}`) ||
                     sessionStorage.getItem('selectedFlightOffer');

    if (!rawOffer) return 0;

    const offer = JSON.parse(rawOffer);
    const segments = offer?.segments || [];

    let total = 0;

    // Проходим по всем сегментам и суммируем стоимость выбранных мест
    for (let segIdx = 0; segIdx < segments.length; segIdx++) {
      const segmentOfferId = segIdx > 0 ? `${baseOfferId}_S${segIdx + 1}` : baseOfferId;

      // Получаем выбранные места для этого сегмента
      const selectedSeatsRaw = localStorage.getItem(`seat_selection_${segmentOfferId}`);
      if (!selectedSeatsRaw) continue;

      const selectedIds: string[] = JSON.parse(selectedSeatsRaw) || [];
      if (!Array.isArray(selectedIds) || selectedIds.length === 0) continue;
      const selectedSet = new Set<string>(selectedIds);

      // Попытка №1: используем цены, сохранённые в момент выбора (ровно как показано в UI)
      try {
        const pricesRaw = localStorage.getItem(`seat_selection_price_${segmentOfferId}`);
        if (pricesRaw) {
          const priceMap = JSON.parse(pricesRaw) || {};
          selectedIds.forEach(id => {
            const val = Number(priceMap[id]);
            if (Number.isFinite(val)) total += val;
          });
          continue; // уже посчитали для сегмента, переходим к следующему
        }
      } catch {}

      // Получаем данные о карте мест для этого сегмента (Fallback)
      const seatMapData = sessionStorage.getItem(`seatmap_raw_${segmentOfferId}`);
      if (!seatMapData) continue;

      const seatMap = JSON.parse(seatMapData);
      const data = seatMap?.data;

      // Извлекаем цены только для выбранных мест
      if (data) {
        const takePrice = (seat: any) => {
          const pb = seat?.priceBreakdown?.total;
          if (pb && typeof pb.units === 'number') {
            return { units: pb.units, nanos: pb.nanos || 0, currency: (pb.currencyCode || currency).toUpperCase() };
          }
          const p = seat?.price || seat?.seatPrice || seat?.pricing || seat?.amount;
          if (p && typeof p.units === 'number') {
            return { units: p.units, nanos: p.nanos || 0, currency: (p.currencyCode || currency).toUpperCase() };
          }
          return null;
        };

        const considerIfSelected = (seat: any, rowId?: number, colId?: string) => {
          // Восстанавливаем идентификатор места как в SeatMap: YY + COL
          let seatId = '';
          const r = typeof rowId === 'number' ? rowId : Number(seat?.row);
          const c = String(colId || seat?.column || seat?.colId || '').toUpperCase();
          if (r && c) seatId = `${String(r).padStart(2,'0')}${c}`;
          if (!seatId || !selectedSet.has(seatId)) return;

          const pr = takePrice(seat);
          if (!pr) return;
          if (pr.currency === currency.toUpperCase()) {
            total += (pr.units + (pr.nanos || 0) / 1e9);
          }
        };

        // Ищем данные о местах в ответе API
        const cabins = data?.cabins
          || data?.seatMap?.cabins
          || data?.seatMaps?.[0]?.cabins
          || data?.seatMap?.[0]?.cabins
          || data?.seatMap?.seatMapOption?.[0]?.cabins
          || data?.seatMapOption?.[0]?.cabins
          || [];

        if (Array.isArray(cabins) && cabins.length) {
          cabins.forEach((c: any) => {
            if (Array.isArray(c?.rows)) {
              c.rows.forEach((r: any) => Array.isArray(r?.seats) && r.seats.forEach((s:any)=>considerIfSelected(s, Number(r?.id), String(s?.colId||s?.column||'').toUpperCase())));
            }
            if (Array.isArray(c?.seats)) {
              c.seats.forEach((s:any)=>considerIfSelected(s));
            }
          });
        }
      }
    }

    return total;
  } catch (error) {
    console.error('Error calculating total seat price:', error);
    return 0;
  }
};



