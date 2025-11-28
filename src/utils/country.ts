// Кэш для страны по IP
let cachedCountry: string | null = null;
let countryPromise: Promise<string> | null = null;

/**
 * Определяет страну на основе IP-адреса
 */
export const getCountryByIP = async (): Promise<string> => {
  // Если уже есть кэш, возвращаем его
  if (cachedCountry) {
    return cachedCountry;
  }

  // Если запрос уже выполняется, ждем его
  if (countryPromise) {
    return countryPromise;
  }

  // Создаем новый запрос (через серверный прокси для безопасности)
  countryPromise = (async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const resp = await fetch(`${API_BASE_URL}/geo/ip`);
      if (!resp.ok) {
        throw new Error('Failed to fetch country');
      }
      const data = await resp.json();
      const country = data?.country_name || 'United States';
      cachedCountry = country;
      return country;
    } catch (error) {
      console.warn('Failed to detect country by IP, using default', error);
      const defaultCountry = 'United States';
      cachedCountry = defaultCountry;
      return defaultCountry;
    } finally {
      countryPromise = null;
    }
  })();

  return countryPromise;
};

/**
 * Синхронная версия - возвращает кэшированную страну или дефолт
 */
export const getCountryByIPSync = (): string => {
  return cachedCountry || 'United States';
};

// Маппинг стран на телефонные коды
const countryToPhoneCode: Record<string, string> = {
  'United States': '+1',
  'United Kingdom': '+44',
  'Germany': '+49',
  'France': '+33',
  'Spain': '+34',
  'Argentina': '+54',
  'Mexico': '+52',
  'Italy': '+39',
  'Portugal': '+351',
  'Brazil': '+55',
  'Netherlands': '+31',
  'Poland': '+48',
  'Russia': '+7',
  'Japan': '+81',
  'China': '+86',
  'Taiwan': '+886',
  'South Korea': '+82',
  'Saudi Arabia': '+966',
  'Turkey': '+90',
  'Thailand': '+66',
  'Vietnam': '+84',
  'Indonesia': '+62',
  'India': '+91',
  'Czech Republic': '+420',
  'Hungary': '+36',
  'Romania': '+40',
  'Sweden': '+46',
  'Denmark': '+45',
  'Norway': '+47',
  'Finland': '+358',
  'Greece': '+30',
  'Bulgaria': '+359',
  'Ukraine': '+380',
  'Israel': '+972',
  'Slovakia': '+421',
  'Croatia': '+385',
  'Lithuania': '+370',
  'Latvia': '+371',
  'Slovenia': '+386',
  'Serbia': '+381',
  'Estonia': '+372',
  'Iceland': '+354',
  'Philippines': '+63',
  'Malaysia': '+60',
  'United Arab Emirates': '+971',
  'Canada': '+1',
  'Australia': '+61',
  'New Zealand': '+64',
  'Switzerland': '+41',
  'Austria': '+43',
  'Belgium': '+32',
  'Ireland': '+353',
  'Singapore': '+65',
  'Hong Kong': '+852',
  'South Africa': '+27',
  'Egypt': '+20',
  'Morocco': '+212',
  'Nigeria': '+234',
  'Kenya': '+254',
  'Chile': '+56',
  'Colombia': '+57',
  'Peru': '+51',
  'Venezuela': '+58',
  'Ecuador': '+593',
  'Uruguay': '+598',
  'Paraguay': '+595',
  'Bolivia': '+591',
  'Panama': '+507',
  'Costa Rica': '+506',
  'Guatemala': '+502',
  'Dominican Republic': '+1',
  'Puerto Rico': '+1',
  'Jamaica': '+1',
  'Trinidad and Tobago': '+1',
  'Bahamas': '+1',
  'Barbados': '+1',
  'Belize': '+501',
  'Honduras': '+504',
  'El Salvador': '+503',
  'Nicaragua': '+505',
  'Cuba': '+53',
  'Haiti': '+509',
  'Bangladesh': '+880',
  'Pakistan': '+92',
  'Afghanistan': '+93',
  'Sri Lanka': '+94',
  'Nepal': '+977',
  'Myanmar': '+95',
  'Cambodia': '+855',
  'Laos': '+856',
  'Mongolia': '+976',
  'Kazakhstan': '+7',
  'Uzbekistan': '+998',
  'Kyrgyzstan': '+996',
  'Tajikistan': '+992',
  'Turkmenistan': '+993',
  'Azerbaijan': '+994',
  'Armenia': '+374',
  'Georgia': '+995',
  'Belarus': '+375',
  'Moldova': '+373',
  'Albania': '+355',
  'Bosnia and Herzegovina': '+387',
  'Macedonia': '+389',
  'Montenegro': '+382',
  'Kosovo': '+383',
  'Cyprus': '+357',
  'Malta': '+356',
  'Luxembourg': '+352',
  'Monaco': '+377',
  'Liechtenstein': '+423',
  'San Marino': '+378',
  'Vatican City': '+39',
  'Andorra': '+376',
  'Iraq': '+964',
  'Iran': '+98',
  'Jordan': '+962',
  'Lebanon': '+961',
  'Syria': '+963',
  'Yemen': '+967',
  'Oman': '+968',
  'Kuwait': '+965',
  'Qatar': '+974',
  'Bahrain': '+973',
  'United Arab Emirates': '+971',
  'Algeria': '+213',
  'Tunisia': '+216',
  'Libya': '+218',
  'Sudan': '+249',
  'Ethiopia': '+251',
  'Tanzania': '+255',
  'Uganda': '+256',
  'Ghana': '+233',
  'Senegal': '+221',
  'Ivory Coast': '+225',
  'Cameroon': '+237',
  'Angola': '+244',
  'Mozambique': '+258',
  'Madagascar': '+261',
  'Mauritius': '+230',
  'Seychelles': '+248',
  'Maldives': '+960',
  'Brunei': '+673',
  'Papua New Guinea': '+675',
  'Fiji': '+679',
  'New Caledonia': '+687',
  'French Polynesia': '+689',
  'Samoa': '+685',
  'Tonga': '+676',
  'Vanuatu': '+678',
  'Solomon Islands': '+677',
  'Palau': '+680',
  'Micronesia': '+691',
  'Marshall Islands': '+692',
  'Kiribati': '+686',
  'Nauru': '+674',
  'Tuvalu': '+688',
};

/**
 * Определяет телефонный код страны на основе IP
 */
export const getPhoneCodeByIP = async (): Promise<string> => {
  const country = await getCountryByIP();
  return countryToPhoneCode[country] || '+1';
};

/**
 * Синхронная версия - возвращает телефонный код на основе кэшированной страны
 */
export const getPhoneCodeByIPSync = (): string => {
  const country = getCountryByIPSync();
  return countryToPhoneCode[country] || '+1';
};

