import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import FlightResultsMulti from './FlightResultsMulti';
import FlightResults from './FlightResults';
import { searchAirports, detectCurrencyByIP } from './services/flightApi';
import { searchHotelDestinationsCached } from './services/hotelApi';
import FlightDetail from './FlightDetail';
import TicketType from './TicketType';
import SeatMap from './SeatMap';
import SeatSelection from './SeatSelection';
import Luggage from './Luggage';
import DatePickerModal from './components/DatePickerModal';
import GuestsRoomsModal from './components/GuestsRoomsModal';
import Payment from './Payment';
import BookingOverview from './BookingOverview';
import GuestInfo from './GuestInfo';
import HotelPayment from './HotelPayment';
import NewCard from './NewCard';
import TravelerDetails from './TravelerDetails';
import ContactDetails from './ContactDetails';
import DetailsHub from './DetailsHub';
import BookingsPage from './BookingsPage';
import HotelResults from './HotelResults';
import HotelDetails from './HotelDetails';
import FavoritesPage from './FavoritesPage';
import AuthPage from './AuthPage';
import ProfilePage from './ProfilePage';
import AttractionsResults from './AttractionsResults';
import AttractionDetail from './AttractionDetail';
import AttractionAvailability from './AttractionAvailability';
import AttractionCheckout from './AttractionCheckout';
import './App.css';

// Session utility functions
const initSession = () => {
  try {
    sessionStorage.setItem('session_timestamp', Date.now().toString());
  } catch (e) {
    console.error('Failed to init session:', e);
  }
};

const updateSession = () => {
  try {
    sessionStorage.setItem('session_timestamp', Date.now().toString());
  } catch (e) {
    console.error('Failed to update session:', e);
  }
};

// Enhanced route guard: strict session-only protection
const RouteGuard: React.FC<{ children: React.ReactNode; requireOffer?: boolean; requireFlow?: boolean }> = ({ children, requireOffer = false, requireFlow = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isValid, setIsValid] = React.useState(false);
  
  React.useEffect(() => {
    // Only check sessionStorage - NO localStorage fallback
    const offerId = sessionStorage.getItem('current_offer_id');
    const flow = sessionStorage.getItem('flow_price');
    const hotelSummary = sessionStorage.getItem('hotel_booking_summary');
    const sessionTimestamp = sessionStorage.getItem('session_timestamp');
    const attractionPayload = sessionStorage.getItem('attraction_payment_payload');
    
    // Check if session is still valid (within 30 minutes)
    const now = Date.now();
    let sessionAge = 0;
    let isSessionExpired = false;
    if (sessionTimestamp) {
      sessionAge = now - parseInt(sessionTimestamp, 10);
      isSessionExpired = sessionAge > 30 * 60 * 1000; // 30 minutes
    } else {
      sessionStorage.setItem('session_timestamp', now.toString());
    }
    
    // Check if we have valid data for either flights or hotels
    const hasValidOffer = !!offerId;
    const hasValidFlow = !!flow;
    const hasValidHotel = !!hotelSummary;
    const hasAttractionData = !!attractionPayload;
    
    console.log('RouteGuard: Strict check', { 
      path: location.pathname,
      requireOffer, 
      requireFlow, 
      hasOffer: hasValidOffer, 
      hasFlow: hasValidFlow,
      hasHotel: hasValidHotel,
      hasAttraction: hasAttractionData,
      sessionAge: Math.floor(sessionAge / 1000) + 's',
      expired: isSessionExpired
    });
    
    // If session expired, clear everything
    if (isSessionExpired) {
      console.log('RouteGuard: Session expired, clearing data');
      sessionStorage.clear();
      navigate('/', { replace: true });
      return;
    }
    
    // For payment routes, allow access if we have either flight data OR hotel data OR attraction data
    const isPaymentRoute = location.pathname.includes('/payment');
    
    if (isPaymentRoute) {
      // For payment routes, we need either flight data (offer + flow) OR hotel data OR attraction data
      const hasFlightData = hasValidOffer && hasValidFlow;
      const hasHotelData = hasValidHotel;
      
      if (!hasFlightData && !hasHotelData && !hasAttractionData) {
        console.log('RouteGuard: Access denied - no valid booking data', {
          hasFlightData,
          hasHotelData,
          hasAttractionData,
          attractionPayload: attractionPayload ? 'exists' : 'missing'
        });
        navigate('/', { replace: true });
        return;
      }
    } else {
      // For other routes, use original logic
      if ((requireOffer && !hasValidOffer) || (requireFlow && !hasValidFlow)) {
        console.log('RouteGuard: Access denied - missing required data');
        navigate('/', { replace: true });
        return;
      }
    }
    
    console.log('RouteGuard: Access granted');
    setIsValid(true);
  }, [navigate, requireOffer, requireFlow, location.pathname]);
  
  // Don't render children until validation passes
  return isValid ? <>{children}</> : null;
};

// Иконки как SVG компоненты
const BellIcon = () => (
  <svg className="notification-icon" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
  </svg>
);

const BedIcon = () => (
  <svg className="nav-tab-icon" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V9H1v11h2v-2h18v2h2v-7c0-2.21-1.79-4-4-4z"/>
  </svg>
);

const FlightIcon = () => (
  <svg className="nav-tab-icon" fill="currentColor" viewBox="0 0 24 24">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>
);

const AttractionsIcon = () => (
  <svg className="nav-tab-icon" fill="currentColor" viewBox="0 -960 960 960" width="24" height="24">
    <path d="m233-80 54-122q-14-11-27-21.5T235-246q-8 3-15.5 4.5T203-240q-33 0-56.5-23.5T123-320q0-20 8.5-36.5T155-384q-8-23-11-46.5t-3-49.5q0-26 3-49.5t11-46.5q-15-11-23.5-27.5T123-640q0-33 23.5-56.5T203-720q9 0 16.5 1.5T235-714q33-36 75.5-60t90.5-36q5-30 27.5-50t52.5-20q30 0 52.5 20.5T561-810q48 12 90.5 35.5T727-716q8-3 15-4.5t15-1.5q33 0 56.5 23.5T837-642q0 20-8 35.5T807-580q8 24 11 49t3 51q0 26-3 50.5T807-382q14 11 22 26.5t8 35.5q0 33-23.5 56.5T757-240q-8 0-15-1.5t-15-4.5q-12 12-24.5 23.5T675-200l52 120h-74l-38-88q-14 6-27 10.5t-27 7.5q-5 29-27.5 49.5T481-80q-30 0-52.5-20T401-150q-15-3-28.5-7.5T345-168l-38 88h-74Zm76-174 62-140q-14-18-22-40t-8-46q0-57 41.5-98.5T481-620q57 0 98.5 41.5T621-480q0 24-8.5 47T589-392l62 138q9-8 17.5-14.5T685-284q-5-8-6.5-17.5T677-320q0-32 22-55t54-25q6-20 9-39.5t3-40.5q0-21-3-41.5t-9-40.5q-32-2-54-25t-22-55q0-9 2.5-17.5T685-676q-29-29-64-49t-74-31q-11 17-28 26.5t-38 9.5q-21 0-38-9.5T415-756q-41 11-76 31.5T275-674q3 8 5.5 16.5T283-640q0 32-21 54.5T209-560q-6 20-9 39.5t-3 40.5q0 21 3 40.5t9 39.5q32 2 53 25t21 55q0 9-1.5 17.5T275-286q8 9 16.5 16.5T309-254Zm60 34q11 5 22.5 9t23.5 7q11-17 28-26.5t38-9.5q21 0 38 9.5t28 26.5q12-3 22.5-7t21.5-9l-58-130q-12 5-25 7.5t-27 2.5q-15 0-28.5-3t-25.5-9l-58 132Zm112-200q24 0 42-17t18-43q0-24-18-42t-42-18q-26 0-43 18t-17 42q0 26 17 43t43 17Zm0-60Z"/>
  </svg>
);


const SearchIcon = () => (
  <svg className="search-field-icon" fill="currentColor" viewBox="0 0 24 24">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg className="search-field-icon" fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
  </svg>
);

const PersonIcon = () => (
  <svg className="search-field-icon" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

const SearchNavIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
  </svg>
);

const HeartIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

const SuitcaseIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
);

const UserIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);

// Дополнительные иконки
const SwapIcon = () => (
  <svg width="20" height="20" fill="#0071c2" viewBox="0 0 24 24">
    <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
  </svg>
);


const BookingsNavIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
    <path d="M160-120q-33 0-56.5-23.5T80-200v-440q0-33 23.5-56.5T160-720h160v-80q0-33 23.5-56.5T400-880h160q33 0 56.5 23.5T640-800v80h160q33 0 56.5 23.5T880-640v440q0 33-23.5 56.5T800-120H160Zm240-600h160v-80H400v80Zm-160 80h-80v440h80v-440Zm400 440v-440H320v440h320Zm80-440v440h80v-440h-80ZM480-420Z"/>
  </svg>
);

const FavoritesNavIcon = () => (
  <svg className="bottom-nav-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

const SignInNavIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
    <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/>
  </svg>
);

const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
    <span style={{ color: 'white', fontSize: '16px' }}>{label}</span>
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: '51px',
        height: '31px',
        borderRadius: '16px',
        background: checked ? '#0071c2' : '#404040',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s'
      }}
    >
      <div 
        style={{
          width: '27px',
          height: '27px',
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: '2px',
          left: checked ? '22px' : '2px',
          transition: 'left 0.2s'
        }}
      />
    </div>
  </div>
);

const RadioButton = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={onChange}>
    <div 
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: '2px solid #ccc',
        position: 'relative',
        background: checked ? '#0071c2' : 'transparent',
        borderColor: checked ? '#0071c2' : '#ccc'
      }}
    >
      {checked && (
        <div 
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '4px',
            left: '4px'
          }}
        />
      )}
    </div>
    <span style={{ color: 'white', fontSize: '16px' }}>{label}</span>
  </div>
);

// Genius Logo компонент
const GeniusLogo = () => (
  <div className="genius-logo" style={{
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #fbbf24 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    position: 'relative'
  }}>
    Genius
    <div style={{
      position: 'absolute',
      bottom: '10px',
      right: '10px',
      width: '20px',
      height: '20px',
      background: '#1e40af',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px'
    }}>
      ★
    </div>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('stays');
  const navigationType = 'forward'; // По умолчанию
  
  // Состояния для Attractions
  const [attractionLocation, setAttractionLocation] = React.useState('');
  const [attractionSuggestions, setAttractionSuggestions] = React.useState<any[]>([]);
  const [showAttractionDropdown, setShowAttractionDropdown] = React.useState(false);
  const [selectedAttractionId, setSelectedAttractionId] = React.useState<string>('');
  const [selectedAttractionName, setSelectedAttractionName] = React.useState<string>('');
  const [selectedAttractionType, setSelectedAttractionType] = React.useState<string>('CITY');
  const attractionDebounceRef = React.useRef<any>();
  const attractionAbortRef = React.useRef<AbortController | null>(null);
  const [isSearchingAttraction, setIsSearchingAttraction] = React.useState(false);
  const attractionQueryRef = React.useRef('');
  
  // Attractions date states
  const [attractionDate, setAttractionDate] = React.useState('');
  const [showAttractionDateModal, setShowAttractionDateModal] = React.useState(false);
  React.useEffect(() => {
    if (attractionDate) {
      setAttractionSearchError('');
    }
  }, [attractionDate]);
  
  // Состояния для Flights
  const [flightType, setFlightType] = React.useState('round-trip');
  const [directFlightsOnly, setDirectFlightsOnly] = React.useState(false);
  const [multiLegs, setMultiLegs] = React.useState<Array<{from:string;to:string;date:string}>>([
    { from: '', to: '', date: '' },
    { from: '', to: '', date: '' }
  ]);
  const [multiLegIds, setMultiLegIds] = React.useState<Array<{fromId?:string;toId?:string}>>([{}, {}]);
  const [multiSuggest, setMultiSuggest] = React.useState<any[]>([]);
  const [multiShow, setMultiShow] = React.useState(false);
  const [multiActive, setMultiActive] = React.useState<{idx:number;type:'from'|'to'}|null>(null);
  const multiDebounceRef = React.useRef<any>();
  
      // Состояния для поиска городов (пустые поля по умолчанию)
      const [fromCity, setFromCity] = React.useState('');
      const [toCity, setToCity] = React.useState('');
  
  // Hotel search states
  const [hotelDestination, setHotelDestination] = React.useState('');
  const [hotelSuggestions, setHotelSuggestions] = React.useState<any[]>([]);
  const [showHotelDropdown, setShowHotelDropdown] = React.useState(false);
  const [selectedHotelId, setSelectedHotelId] = React.useState<string>('');
  const [selectedCityName, setSelectedCityName] = React.useState<string>('');
  const [selectedHotelSearchType, setSelectedHotelSearchType] = React.useState<string>('CITY');
  // coordinates removed
  const [isSearchingHotels, setIsSearchingHotels] = React.useState(false);
  const [hotelSearchError, setHotelSearchError] = React.useState<string | null>(null);
  const hotelDebounceRef = React.useRef<any>();
  const hotelAbortRef = React.useRef<AbortController | null>(null);
  const hotelQueryRef = React.useRef('');
  
  // Stays date states
  const [staysCheckIn, setStaysCheckIn] = React.useState('');
  const [staysCheckOut, setStaysCheckOut] = React.useState('');
  const [showStaysDatePicker, setShowStaysDatePicker] = React.useState(false);
  const [staysDateFieldType, setStaysDateFieldType] = React.useState<'checkin' | 'checkout'>('checkin');
  
  // Stays guests & rooms states
  const [staysRooms, setStaysRooms] = React.useState(1);
  const [staysAdults, setStaysAdults] = React.useState(2);
  const [staysChildren, setStaysChildren] = React.useState(0);
  const [staysChildrenAges, setStaysChildrenAges] = React.useState<number[]>([]);
  const [showStaysGuestsModal, setShowStaysGuestsModal] = React.useState(false);
  // Пустые даты по умолчанию - пользователь сам выберет
  const [departDate, setDepartDate] = React.useState('');
  const [returnDate, setReturnDate] = React.useState('');
  const [adults, setAdults] = React.useState(1);
  const [childrenCount, setChildrenCount] = React.useState(0);
  const [childrenAges, setChildrenAges] = React.useState<string[]>([]);
  const [cabinClass, setCabinClass] = React.useState<'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'>('ECONOMY');
  const [currency, setCurrency] = React.useState('USD');
  const [stops, setStops] = React.useState<'0' | '1' | '2'>('2');

  // Autocomplete state
  const [fromSuggestions, setFromSuggestions] = React.useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = React.useState<any[]>([]);
  const [fromSelectedId, setFromSelectedId] = React.useState<string>('');
  const [toSelectedId, setToSelectedId] = React.useState<string>('');
  const [showFromDropdown, setShowFromDropdown] = React.useState(false);
  const [showToDropdown, setShowToDropdown] = React.useState(false);
  const [isSearchingFrom, setIsSearchingFrom] = React.useState(false);
  const [isSearchingTo, setIsSearchingTo] = React.useState(false);
  const fromDebounceRef = React.useRef<any>();
  const toDebounceRef = React.useRef<any>();
  const fromQueryRef = React.useRef('');
  const toQueryRef = React.useRef('');
  const [showTravellersModal, setShowTravellersModal] = React.useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = React.useState(false);
  const [dateFieldType, setDateFieldType] = React.useState<'departure' | 'return'>('departure');
  const [activeLegIndex, setActiveLegIndex] = React.useState<number>(0);
  const [travellersModalSection, setTravellersModalSection] = React.useState<'pax'|'stops'|'currency'>('pax');
  const paxRef = React.useRef<HTMLDivElement>(null);
  const stopsRef = React.useRef<HTMLDivElement>(null);
  const currencyRef = React.useRef<HTMLDivElement>(null);
  const [currencyFilter, setCurrencyFilter] = React.useState('');
  const [openStops, setOpenStops] = React.useState(false);
  const [openCurrency, setOpenCurrency] = React.useState(false);
  const [openClass, setOpenClass] = React.useState(false);

  // Перерисовываем карточку продолжения поиска при возвращении на вкладку/фокусе
  const [lastSearchVersion, setLastSearchVersion] = React.useState(0);
  React.useEffect(() => {
    const refresh = () => setLastSearchVersion(v => v + 1);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Auto-detect currency on first visit using IP-based geolocation
  React.useEffect(() => {
    (async () => {
      try {
        const already = sessionStorage.getItem('currency_autoset');
        if (already === '1') return;
        const res = await detectCurrencyByIP();
        const cc = (res?.currency || '').toUpperCase();
        if (cc && currency !== cc) {
          setCurrency(cc);
        }
        sessionStorage.setItem('currency_autoset','1');
      } catch {}
    })();
  }, []);

  // Функции форматирования дат
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    };
    return date.toLocaleDateString('en-GB', options);
  };

  // Stays date formatting
  const formatStaysDateRange = (checkIn: string, checkOut: string) => {
    if (!checkIn) return '';
    const checkInFormatted = formatDate(checkIn);
    if (checkOut) {
      const checkOutFormatted = formatDate(checkOut);
      return `${checkInFormatted} - ${checkOutFormatted}`;
    }
    return checkInFormatted;
  };

  const formatDateRange = (depart: string, arrive: string) => {
    const departFormatted = formatDate(depart);
    if (flightType === 'round-trip' && arrive) {
      const arriveFormatted = formatDate(arrive);
      return `${departFormatted} - ${arriveFormatted}`;
    }
    return departFormatted;
  };

  const formatSingleDate = (dateStr: string) => {
    return formatDate(dateStr);
  };

  // Обработчик выбора даты из календаря
  const handleDateSelect = (departDateSelected: string, returnDateSelected?: string) => {
    setDepartDate(departDateSelected);
    if (flightType === 'round-trip' && returnDateSelected) {
      setReturnDate(returnDateSelected);
    }
    // Для one-way и случаев когда возврат не указан, просто устанавливаем дату отправления
  };

  // Stays date selection handler
  const handleStaysDateSelect = (checkInDate: string, checkOutDate?: string) => {
    console.log('App: Stays date selection:', {
      checkInDate,
      checkOutDate,
      currentCheckIn: staysCheckIn,
      currentCheckOut: staysCheckOut
    });
    
    setStaysCheckIn(checkInDate);
    if (checkOutDate) {
      setStaysCheckOut(checkOutDate);
    }
    
    console.log('App: Stays dates updated:', {
      newCheckIn: checkInDate,
      newCheckOut: checkOutDate || 'not set'
    });
  };

  // Stays guests summary formatter
  const formatStaysGuestsSummary = () => {
    const roomsText = `${staysRooms} room${staysRooms > 1 ? 's' : ''}`;
    const adultsText = `${staysAdults} adult${staysAdults > 1 ? 's' : ''}`;
    const childrenText = staysChildren > 0 ? `${staysChildren} child${staysChildren > 1 ? 'ren' : ''}` : 'No children';
    return `${roomsText} · ${adultsText} · ${childrenText}`;
  };

  // Handle guests/rooms modal apply
  const handleStaysGuestsApply = (rooms: number, adults: number, children: number, childrenAges: number[], currency: string) => {
    setStaysRooms(rooms);
    setStaysAdults(adults);
    setStaysChildren(children);
    setStaysChildrenAges(childrenAges);
    setCurrency(currency);
  };
  const currencyOptions = React.useMemo(() => ([
    'USD','EUR','GBP','AUD','CAD','CHF','JPY','CNY','INR','KRW',
    'SGD','HKD','NZD','SEK','NOK','DKK','MXN','BRL','ARS','CLP',
    'COP','PEN','BOB','UYU','PYG','VEF','CRC','GTQ','HNL','NIO',
    'PAB','DOP','JMD','BBD','TTD','XCD','BSD','BZD',
    'AED','SAR','QAR','OMR','KWD','BHD','ILS','EGP','JOD','LBP',
    'SYP','IQD','YER','TRY','IRR','AFN','PKR','LKR','BDT','NPR',
    'MVR','BTN','MMK',
    'THB','VND','MYR','IDR','PHP','BND','LAK','KHR','TWD','MOP',
    'PLN','CZK','HUF','RON','BGN','HRK','RSD','BAM','MKD','ALL',
    'ISK','RUB','UAH','BYN','MDL','GEL','ARM','AZN','KZT','UZS',
    'TJS','KGS','TMT','MNT',
    'ZAR','NGN','GHS','KES','TZS','UGX','RWF','BIF','ETB','DJF',
    'SOS','MUR','SCR','MGA','KMF','AOA','MZN','ZMW','BWP','NAD',
    'SZL','LSL','ZWL','MWK','MAD','TND','DZD','LYD','SDG','SSP',
    'ERN','GMD','GNF','LRD','SLL','CVE','STN','XOF','XAF','CDF',
    'XPF','FJD','PGK','SBD','VUV','WST','TOP'
  ]), []);

  const travellersSummary = React.useMemo(() => {
    const ch = childrenCount > 0 ? `, ${childrenCount} child${childrenCount>1?'ren':''}` : '';
    const stopsLabel = stops === '0' ? ' · Non-stop' : (stops === '1' ? ' · Up to 1 stop' : '');
    return `${adults} adult${adults>1?'s':''}${ch} · ${cabinClass.replace('_',' ')} · ${currency}${stopsLabel}`;
  }, [adults, childrenCount, cabinClass, currency, stops]);

  React.useEffect(() => {
    if (!showTravellersModal) return;
    setOpenStops(travellersModalSection === 'stops');
    setOpenCurrency(travellersModalSection === 'currency');
    const ref = travellersModalSection === 'pax' ? paxRef : (travellersModalSection === 'stops' ? stopsRef : currencyRef);
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [showTravellersModal, travellersModalSection]);

  // Функция для очистки полей
  const clearFields = () => {
    setFromCity('');
    setToCity('');
  };

  // Функция для обмена городов
  const swapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  // Функция для преобразования города в код аэропорта
  const getAirportCode = (cityInput: string): string => {
    const input = cityInput.toLowerCase().trim();
    
        // Популярные города и их правильные ID для API
        const cityToCode: { [key: string]: string } = {
          'mumbai': 'BOM.AIRPORT',
          'bom': 'BOM.AIRPORT',
          'delhi': 'DEL.AIRPORT',
          'del': 'DEL.AIRPORT',
          'madrid': 'MAD.AIRPORT',
          'mad': 'MAD.AIRPORT',
          'paris': 'CDG.AIRPORT', 
          'cdg': 'CDG.AIRPORT',
          'london': 'LHR.AIRPORT',
          'lhr': 'LHR.AIRPORT',
          'new york': 'JFK.AIRPORT',
          'jfk': 'JFK.AIRPORT',
          'tokyo': 'NRT.AIRPORT',
          'nrt': 'NRT.AIRPORT',
          'dubai': 'DXB.AIRPORT',
          'dxb': 'DXB.AIRPORT',
          'singapore': 'SIN.AIRPORT',
          'sin': 'SIN.AIRPORT',
          'los angeles': 'LAX.AIRPORT',
          'lax': 'LAX.AIRPORT',
          'frankfurt': 'FRA.AIRPORT',
          'fra': 'FRA.AIRPORT',
          'amsterdam': 'AMS.AIRPORT',
          'ams': 'AMS.AIRPORT',
          'rome': 'FCO.AIRPORT',
          'fco': 'FCO.AIRPORT',
          'moscow': 'SVO.AIRPORT',
          'svo': 'SVO.AIRPORT',
          'istanbul': 'IST.AIRPORT',
          'ist': 'IST.AIRPORT',
          'sydney': 'SYD.AIRPORT',
          'syd': 'SYD.AIRPORT',
          'melbourne': 'MEL.AIRPORT',
          'mel': 'MEL.AIRPORT',
          'toronto': 'YYZ.AIRPORT',
          'yyz': 'YYZ.AIRPORT',
          'vancouver': 'YVR.AIRPORT',
          'yvr': 'YVR.AIRPORT',
          'shanghai': 'PVG.AIRPORT',
          'pvg': 'PVG.AIRPORT',
          'beijing': 'PEK.AIRPORT',
          'pek': 'PEK.AIRPORT',
          'hong kong': 'HKG.AIRPORT',
          'hkg': 'HKG.AIRPORT',
          'seoul': 'ICN.AIRPORT',
          'icn': 'ICN.AIRPORT',
          'taipei': 'TPE.AIRPORT',
          'tpe': 'TPE.AIRPORT',
          'manila': 'MNL.AIRPORT',
          'mnl': 'MNL.AIRPORT',
          'jakarta': 'CGK.AIRPORT',
          'cgk': 'CGK.AIRPORT',
          'kuala lumpur': 'KUL.AIRPORT',
          'kul': 'KUL.AIRPORT',
          'ho chi minh': 'SGN.AIRPORT',
          'sgn': 'SGN.AIRPORT',
          'hanoi': 'HAN.AIRPORT',
          'han': 'HAN.AIRPORT',
          'phuket': 'HKT.AIRPORT',
          'hkt': 'HKT.AIRPORT',
          'chiang mai': 'CNX.AIRPORT',
          'cnx': 'CNX.AIRPORT'
        };

    // Проверяем точное совпадение
    if (cityToCode[input]) {
      return cityToCode[input];
    }

    // Проверяем частичное совпадение
    for (const [city, code] of Object.entries(cityToCode)) {
      if (input.includes(city) || city.includes(input)) {
        return code;
      }
    }

    // Если не найдено, возвращаем как есть (возможно уже код аэропорта)
    return input.toUpperCase() + '.AIRPORT';
  };

  const [searchError, setSearchError] = React.useState<string>('');
  const [attractionSearchError, setAttractionSearchError] = React.useState<string>('');

  const handleSearch = async () => {
    try {
      setSearchError('');
      
      // Initialize session timestamp for security
      initSession();
      
      // Новый поиск должен принудительно игнорировать freeze/снапшот
      try {
        // Новый поиск: снимаем флаги возврата/заморозки/запрета, но не трогаем снапшоты
        sessionStorage.removeItem('flightResults_freeze');
        sessionStorage.removeItem('flightResultsMulti_freeze');
        sessionStorage.removeItem('flightResults_back');
        sessionStorage.removeItem('flightResults_no_fetch');
        sessionStorage.setItem('flightResults_force_refresh','1');
        sessionStorage.setItem('flightResultsMulti_force_refresh','1');
      } catch {}
      // Резолвим ID через API
      const resolveId = async (input: string): Promise<string> => {
        const raw = (input || '').trim();
        if (!raw) return '';
        // Попробовать вытащить IATA из строк вида "TBS · TBILISI INTERNATIONAL AIRPORT" или "TBS - Tbilisi"
        const head = raw.split('·')[0].split('-')[0].trim();
        const iataMatch = head.match(/^[A-Za-z]{3}$/) || raw.match(/\b([A-Za-z]{3})\b/);
        if (iataMatch) return `${(iataMatch[0] || iataMatch[1]).toUpperCase()}.AIRPORT`;
        // Если уже корректный id
        if (raw.includes('.AIRPORT')) {
          // Очистим от лишнего текста перед id
          const m = raw.match(/[A-Z]{3}\.AIRPORT/);
          if (m) return m[0];
          return raw;
        }
        // 3‑буквенный код без суффикса
        if (/^[A-Za-z]{3}$/.test(raw)) return `${raw.toUpperCase()}.AIRPORT`;
        // Сначала локальная карта соответствий [[memory:7924107]]
        const local = getAirportCode(raw);
        if (local && local.includes('.AIRPORT')) return local;
        // Фолбэк через API
        const results = await searchAirports(raw);
        const airport = results.find((r: any) => r.type === 'AIRPORT');
        return airport?.id || `${raw.toUpperCase()}.AIRPORT`;
      };

      if (flightType === 'multi-city') {
        // Валидация: обязательно дата для каждого сегмента
        const missingIdx = multiLegs.findIndex(l => !l.date || String(l.date).trim() === '');
        if (missingIdx !== -1) {
          setSearchError(`Please select a date for segment #${missingIdx + 1}`);
          return;
        }
        const legsResolved: any[] = [];
        for (let i=0;i<multiLegs.length;i++) {
          const leg = multiLegs[i];
          const ids = multiLegIds[i] || {} as any;
          const fromId = ids.fromId || await resolveId(leg.from);
          const toId = ids.toId || await resolveId(leg.to);
          legsResolved.push({ fromId, toId, date: leg.date });
        }
        const params = new URLSearchParams({
          legs: JSON.stringify(legsResolved),
          adults: String(adults),
          cabinClass,
          currency,
          sort: 'BEST'
        });
        if (childrenCount > 0 && childrenAges.length > 0) {
          params.set('children', childrenAges.join(','));
        }
        navigate(`/flight-results-multi?${params.toString()}`);
        return;
      }

      const fromId = fromSelectedId || await resolveId(fromCity);
      const toId = toSelectedId || await resolveId(toCity);

      // Валидация для one-way/round-trip
      if (!departDate || String(departDate).trim() === '') {
        setSearchError('Please select a departure date');
        return;
      }
      if (flightType === 'round-trip' && (!returnDate || String(returnDate).trim() === '')) {
        setSearchError('Please select a return date');
        return;
      }

      const params: Record<string, string> = {
        from: fromId,
        to: toId,
        departDate: departDate,
        returnDate: flightType === 'round-trip' ? returnDate : '',
        adults: String(adults),
        cabinClass: cabinClass,
        currency: currency,
        stops: stops,
        sort: 'BEST'
      };
      if (childrenCount > 0 && childrenAges.length > 0) {
        params.children = childrenAges.join(',');
      }
      Object.keys(params).forEach((k) => { if (params[k] === '') delete params[k]; });

      const searchParams = new URLSearchParams(params);
      if (activeTab !== 'flights') setActiveTab('flights');
      navigate(`/flight-results?${searchParams.toString()}`);
    } catch (_) {}
  };

  // Attractions location search function
  const searchAttractionLocations = async (query: string, normalized?: string) => {
    if (query.length < 3) {
      setAttractionSuggestions([]);
      setShowAttractionDropdown(false);
      setIsSearchingAttraction(false);
      return;
    }

    // Отменяем предыдущий запрос если он есть
    if (attractionAbortRef.current) {
      attractionAbortRef.current.abort();
    }

    // Создаем новый AbortController
    attractionAbortRef.current = new AbortController();

    try {
      const guard = normalized || query.trim().toLowerCase();
      if (guard !== attractionQueryRef.current) {
        return;
      }
      setIsSearchingAttraction(true);
      setShowAttractionDropdown(true);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(
        `${API_BASE_URL}/attractions/searchLocation?query=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          signal: attractionAbortRef.current.signal,
          mode: 'cors',
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Attraction locations API response:', data);
      if (guard !== attractionQueryRef.current) {
        return;
      }
      
      if (data.status && data.data) {
        // Используем destinations из API ответа
        const destinations = data.data.destinations || [];
        console.log('Found destinations:', destinations.length);
        const formattedResults = destinations.map((item: any) => ({
          id: item.id, // Используем закодированный ID
          dest_id: item.ufi,
          label: item.cityName,
          name: item.cityName,
          dest_type: 'city',
          search_type: 'city',
          country: item.country,
          productCount: item.productCount
        }));
        
        console.log('Formatted results:', formattedResults);
        setAttractionSuggestions(formattedResults);
        setShowAttractionDropdown(formattedResults.length > 0);
      } else {
        setAttractionSuggestions([]);
        setShowAttractionDropdown(false);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error searching attraction locations:', error);
        // Не скрываем dropdown если есть кешированные результаты
        // Просто не обновляем их
        if (attractionSuggestions.length === 0) {
          setShowAttractionDropdown(false);
        }
      }
    } finally {
      if ((normalized || query.trim().toLowerCase()) === attractionQueryRef.current) {
        setIsSearchingAttraction(false);
      }
    }
  };

  const searchFormRef = React.useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = React.useState(false);
  
  React.useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          
          // Compact mode activates very early for smooth transition
          const compactThreshold = 50;    // compact when scrolling DOWN past 50px
          const expandThreshold = 20;     // expand when scrolling UP above 20px
          
          setIsScrolled((prevState) => {
            if (prevState) {
              return scrollY > expandThreshold;
            } else {
              return scrollY > compactThreshold;
            }
          });
          
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToSearch = () => {
    searchFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Очищаем данные отелей при переходе к рейсам
    sessionStorage.removeItem('hotel_booking_summary');
    localStorage.removeItem('hotel_guests_info');
    localStorage.removeItem('hotel_contact_info');
    setActiveTab('flights');
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>Booking.com</h1>
      </header>

      {/* (card moved below Trending header) */}

      {/* Navigation Tabs */}
      <div className={`nav-tabs ${isScrolled ? 'nav-tabs-compact' : ''}`}>
        <button 
          className={`nav-tab ${activeTab === 'stays' ? 'active' : ''}`}
          onClick={() => {
            // Очищаем данные рейсов при переключении на отели
            sessionStorage.removeItem('selectedFlightOffer');
            sessionStorage.removeItem('selectedFlightOffer_summary');
            localStorage.removeItem('selectedFlightOffer');
            localStorage.removeItem('selectedFlightOffer_summary');
            sessionStorage.removeItem('flow_pax');
            localStorage.removeItem('flow_pax');
            sessionStorage.removeItem('flow_price');
            localStorage.removeItem('flow_price');
            // Очищаем данные путешественников рейсов
            const offerId = sessionStorage.getItem('current_offer_id');
            if (offerId) {
              localStorage.removeItem(`traveler_details_${offerId}`);
              sessionStorage.removeItem(`traveler_details_${offerId}`);
              localStorage.removeItem(`contact_${offerId}`);
              sessionStorage.removeItem(`contact_${offerId}`);
            }
            setActiveTab('stays');
          }}
        >
          <BedIcon />
          Stays
        </button>
        <button 
          className={`nav-tab ${activeTab === 'flights' ? 'active' : ''}`}
          onClick={() => {
            // Очищаем данные отелей при переключении на рейсы
            sessionStorage.removeItem('hotel_booking_summary');
            localStorage.removeItem('hotel_guests_info');
            localStorage.removeItem('hotel_contact_info');
            setActiveTab('flights');
          }}
        >
          <FlightIcon />
          Flights
        </button>
        <button 
          className={`nav-tab ${activeTab === 'attractions' ? 'active' : ''}`}
          onClick={() => setActiveTab('attractions')}
        >
          <AttractionsIcon />
          Attractions
        </button>
      </div>

      {/* Search Form */}
      <div className="search-container" ref={searchFormRef}>
        {/* Stays Form */}
        {activeTab === 'stays' && (
          <div className="search-card">
            <div style={{ position: 'relative' }}>
              <div className="search-field">
                <SearchIcon />
                <div className="search-field-content">
                  <input
                    type="text"
                    value={hotelDestination}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHotelDestination(v);
                      setSelectedHotelId('');
                      const normalized = v.trim().toLowerCase();
                      hotelQueryRef.current = normalized;
                      setHotelSuggestions([]);
                      setHotelSearchError(null);
                      clearTimeout(hotelDebounceRef.current);
                      if (normalized.length < 3) {
                        setShowHotelDropdown(false);
                        setIsSearchingHotels(false);
                        return;
                      }
                      setIsSearchingHotels(true);
                      setShowHotelDropdown(true);
                      hotelDebounceRef.current = setTimeout(async () => {
                        if (normalized.length < 3) { 
                          console.log('Query too short, clearing suggestions');
                          setHotelSuggestions([]); 
                          setShowHotelDropdown(false);
                          setIsSearchingHotels(false);
                          return; 
                        }
                        if (normalized !== hotelQueryRef.current) return;
                        console.log('Searching for hotels with query:', v.trim());
                        setIsSearchingHotels(true);
                        try {
                          if (hotelAbortRef.current) hotelAbortRef.current.abort();
                          hotelAbortRef.current = new AbortController();
                          setShowHotelDropdown(true);
                          const results = await searchHotelDestinationsCached(v.trim(), hotelAbortRef.current.signal);
                          if (hotelQueryRef.current !== normalized) return;
                          console.log('Got hotel results:', results);
                          console.log('Number of results:', results.length);
                          setHotelSuggestions(results);
                          setHotelSearchError(null);
                          // Показываем dropdown если есть результаты
                          setShowHotelDropdown(results.length > 0);
                        } catch (error: any) {
                          if (error.name !== 'AbortError') {
                            console.error('Error in hotel search:', error);
                            // Показываем ошибку только если нет кешированных результатов
                            if (hotelSuggestions.length === 0) {
                              if (error.message?.includes('429')) {
                                setHotelSearchError('Too many requests. Please wait a moment.');
                              } else {
                                setHotelSearchError('Search temporarily unavailable. Please try again.');
                              }
                              setShowHotelDropdown(true);
                            }
                          }
                        } finally {
                          if (hotelQueryRef.current === normalized) {
                            setIsSearchingHotels(false);
                          }
                        }
                      }, 500);
                    }}
                    placeholder="Where are you going?"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'white',
                      fontSize: '16px',
                      width: '100%'
                    }}
                    onFocus={() => {
                      if (hotelSuggestions.length > 0 || isSearchingHotels) {
                        setShowHotelDropdown(true);
                      }
                    }}
                    onBlur={(e) => {
                      // Не закрываем dropdown если клик был на подсказку
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      if (!relatedTarget || !relatedTarget.closest('.hotel-suggestions')) {
                        setTimeout(() => setShowHotelDropdown(false), 200);
                      }
                    }}
                  />
                </div>
              </div>
              {showHotelDropdown && (hotelSuggestions.length > 0 || isSearchingHotels || hotelSearchError) && (
                <div className="hotel-suggestions" onMouseDown={(e) => e.preventDefault()}>
                {isSearchingHotels ? (
                  <div style={{ padding: '12px 16px', color: '#aaa', textAlign: 'center' }}>
                    Searching...
                  </div>
                ) : hotelSearchError ? (
                  <div style={{ padding: '12px 16px', color: '#ff6b6b', textAlign: 'center', fontSize: '13px' }}>
                    {hotelSearchError}
                    {hotelSuggestions.length > 0 && (
                      <div style={{ marginTop: '8px', color: '#aaa', fontSize: '12px' }}>
                        Showing cached results
                      </div>
                    )}
                  </div>
                ) : hotelSuggestions.length > 0 ? (
                  hotelSuggestions.map((destination: any) => (
                  <div key={destination.dest_id}
                       className="hotel-suggestion-item"
                       onMouseDown={(e) => {
                         e.preventDefault();
                         setSelectedHotelId(destination.dest_id);
                         setSelectedCityName(destination.city_name || destination.name || destination.displayName || '');
                         setSelectedHotelSearchType(destination.search_type || 'CITY');
                         
                         setHotelDestination(destination.displayName || destination.label || destination.name); 
                         setShowHotelDropdown(false);
                       }}>
                    <div className="hotel-suggestion-main">
                      <span className="hotel-suggestion-name">
                        {destination.displayName || destination.label || destination.name}
                      </span>
                      <span className="hotel-suggestion-location">
                        {destination.fullLocation || destination.country}
                      </span>
                    </div>
                    <div className="hotel-suggestion-meta">
                      {destination.nr_hotels && (
                        <span className="hotel-count">
                          {destination.nr_hotels} hotels
                        </span>
                      )}
                      <span className="hotel-type">
                        {destination.dest_type}
                      </span>
                    </div>
                  </div>
                ))
                ) : null}
                {hotelSearchError && hotelSuggestions.length > 0 && (
                  <div style={{ padding: '8px 16px', borderTop: '1px solid #333', color: '#ff6b6b', fontSize: '12px', textAlign: 'center' }}>
                    {hotelSearchError} (showing cached results)
                  </div>
                )}
              </div>
              )}
            </div>
            <div className="search-field" onClick={() => {
              setShowStaysDatePicker(true);
              setStaysDateFieldType('checkin');
            }}>
              <CalendarIcon />
              <div className="search-field-content">
                <div style={{ color: 'white', fontSize: '16px', cursor: 'pointer' }}>
                  {staysCheckIn 
                    ? formatStaysDateRange(staysCheckIn, staysCheckOut)
                    : 'Check-in - Check-out'}
                </div>
              </div>
            </div>
            <div className="search-field" onClick={() => setShowStaysGuestsModal(true)}>
              <PersonIcon />
              <div className="search-field-content">
                <div style={{ color: 'white', fontSize: '16px', cursor: 'pointer' }}>
                  {formatStaysGuestsSummary()}
                </div>
              </div>
            </div>
            <button className="search-button" onClick={() => {
              console.log('🔍 Search button clicked');
              console.log('Hotel destination:', hotelDestination);
              console.log('Selected hotel ID:', selectedHotelId);
              
              if (!hotelDestination || !staysCheckIn || !staysCheckOut) {
                // show inline red warnings instead of alert
                if (!hotelDestination) {
                  setShowHotelDropdown(false);
                }
                const container = document.querySelector('.search-container');
                if (container) {
                  const id = 'stays-inline-error';
                  let el = document.getElementById(id);
                  if (!el) {
                    el = document.createElement('div');
                    el.id = id;
                    el.className = 'inline-error';
                    container.appendChild(el);
                  }
                  el.textContent = !hotelDestination ? 'Please enter a destination' : (!staysCheckIn ? 'Please select a check-in date' : 'Please select a check-out date');
                }
                return;
              }
              
              // Navigate to hotel results page
              const params = new URLSearchParams({
                dest_id: selectedHotelId,
                search_type: selectedHotelSearchType,
                arrival_date: staysCheckIn,
                departure_date: staysCheckOut,
                adults: String(staysAdults),
                room_qty: String(staysRooms),
                currency_code: currency,
                city_name: selectedCityName,
              });
              
              // coordinates no longer passed
              
              if (staysChildren > 0 && staysChildrenAges.length > 0) {
                params.set('children_age', staysChildrenAges.join(','));
              }
              
              console.log('Navigating to:', `/hotel-results?${params.toString()}`);
              navigate(`/hotel-results?${params.toString()}`);
            }}>Search</button>
          </div>
        )}





      {/* Continue your search - Hotels - Show immediately after search form */}
      {activeTab === 'stays' && (() => {
        // Always show default popular destinations instead of recent searches
        const defaultDestinations = [
          {
            city: 'London',
            country: 'United Kingdom',
            image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=400&fit=crop',
            hotels: '2,500+ hotels',
            price: 'From $25/night',
            rating: '4.2',
            badge: 'City'
          },
          {
            city: 'Phuket',
            country: 'Thailand',
            image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&h=400&fit=crop',
            hotels: '1,200+ hotels',
            price: 'From $15/night',
            rating: '4.6',
            badge: 'Beach'
          },
          {
            city: 'Tokyo',
            country: 'Japan',
            image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600&h=400&fit=crop',
            hotels: '3,000+ hotels',
            price: 'From $40/night',
            rating: '4.5',
            badge: 'City'
          },
          {
            city: 'Paris',
            country: 'France',
            image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop',
            hotels: '3,200+ hotels',
            price: 'From $35/night',
            rating: '4.3',
            badge: 'Romantic'
          },
          {
            city: 'Dubai',
            country: 'UAE',
            image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=400&fit=crop',
            hotels: '1,500+ hotels',
            price: 'From $45/night',
            rating: '4.4',
            badge: 'Luxury'
          },
          {
            city: 'Zurich',
            country: 'Switzerland',
            image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
            hotels: '1,800+ hotels',
            price: 'From $55/night',
            rating: '4.7',
            badge: 'Alpine'
          }
        ];
        
        const destinations = defaultDestinations;
        
        return (
          <div className="continue-search-section">
            <div className="continue-search-container">
              <h2 className="continue-search-title">Popular destinations</h2>
              <p className="continue-search-subtitle">Discover amazing destinations</p>
              
              <div className="hotel-destinations-grid">
                {destinations.map((destination: any, index: number) => (
                  <div key={index} className="hotel-destination-card">
                    <div className="destination-image">
                      <img 
                        src={destination.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop'} 
                        alt={destination.city || destination.hotel_name}
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop';
                        }}
                      />
                      <div className="destination-overlay">
                        <div className="destination-badge">{destination.badge || destination.hotel_type || 'Hotel'}</div>
                        <h3>{destination.city || destination.hotel_name || 'Destination'}</h3>
                        <p>{destination.country || destination.city || 'Location'}</p>
                        <div className="destination-rating">
                          <span className="destination-stars">
                            {'★'.repeat(Math.floor(destination.rating || 4))}
                          </span>
                          <span className="destination-rating-value">{destination.rating || '4.0'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="destination-content">
                      <div className="destination-price">
                        {destination.price || `From $${destination.price || '0'}/night`}
                      </div>
                      <div className="destination-stats">
                        {destination.hotels || `${destination.hotel_name || 'Hotels'} available`}
                      </div>
                      {destination.checkIn && destination.checkOut && (
                        <div className="destination-dates">
                          {destination.checkIn} - {destination.checkOut}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}



      {showTravellersModal && (
        <div className="modal-overlay" style={{ alignItems:'center', justifyContent:'center' }} onClick={() => setShowTravellersModal(false)}>
          <div className="travellers-modal" style={{ zIndex: 4000, maxHeight:'80vh', overflowY:'auto' }} onClick={(e)=> e.stopPropagation()}>
            {/* Новый крестик без фона */}
            <div onClick={() => setShowTravellersModal(false)} style={{ position:'absolute', top:'10px', right:'10px', color:'#fff', fontSize:'20px', cursor:'pointer', zIndex:10 }}>✕</div>
            
            <div style={{ padding: '20px' }}>
              <div ref={paxRef} className="travellers-row">
                <div className="travellers-label">
                  <div>Adults</div>
                  <div className="travellers-sublabel">Ages 12+</div>
                </div>
                <div className="counter">
                  <button className="stepper" onClick={()=>setAdults(Math.max(1, adults-1))}>−</button>
                  <div className="counter-value">{adults}</div>
                  <button className="stepper" onClick={()=>setAdults(adults+1)}>+</button>
                </div>
              </div>
              
              <div className="travellers-row">
                <div className="travellers-label">
                  <div>Children</div>
                  <div className="travellers-sublabel">Ages 2–11</div>
                </div>
                <div className="counter">
                  <button className="stepper" onClick={()=>setChildrenCount(Math.max(0, childrenCount-1))}>−</button>
                  <div className="counter-value">{childrenCount}</div>
                  <button className="stepper" onClick={()=>setChildrenCount(childrenCount+1)}>+</button>
                </div>
              </div>
              {childrenCount > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '8px' }}>Children ages</div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {Array.from({ length: childrenCount }, (_, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#ccc', fontSize: '14px', minWidth: '60px' }}>Child {i + 1}</span>
                        <select 
                          value={childrenAges[i] || 2} 
                          onChange={(e) => {
                            const newAges = [...childrenAges];
                            newAges[i] = parseInt(e.target.value);
                            setChildrenAges(newAges);
                          }}
                          style={{ 
                            background: '#333', 
                            border: '1px solid #555', 
                            borderRadius: '4px', 
                            color: 'white', 
                            padding: '4px 8px',
                            fontSize: '14px'
                          }}
                        >
                          {Array.from({ length: 10 }, (_, age) => (
                            <option key={age + 2} value={age + 2}>{age + 2} years old</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div ref={currencyRef} style={{ marginTop: '20px' }}>
                <button onClick={()=> setOpenCurrency(v=>!v)} style={{ width:'100%', textAlign:'left', padding:'12px 14px', background:'#2a2a2a', border:'1px solid #444', borderRadius:8, color:'#fff' }}>
                  Currency {openCurrency ? '▲' : '▼'}
                </button>
                {openCurrency && (
                  <div style={{ marginTop:10 }}>
                    <input
                      value={currencyFilter}
                      onChange={(e)=> setCurrencyFilter(e.target.value)}
                      placeholder="Search currency (e.g., USD, EUR)"
                      style={{ width:'100%', padding:'10px 12px', border:'1px solid #555', borderRadius:8, background:'transparent', color:'#fff' }}
                    />
                    <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
                      {currencyOptions.filter(c => c.toLowerCase().includes(currencyFilter.trim().toLowerCase())).map(c => (
                        <button key={c} onClick={()=> setCurrency(c)}
                                style={{ padding:'10px 12px', border:'1px solid ' + (currency===c?'#0071c2':'#444'), borderRadius:8, background: currency===c? '#0a64a4':'#2a2a2a', color:'#fff', textAlign:'left' }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop:'20px' }}>
                <button onClick={()=> setOpenClass(v=>!v)} style={{ width:'100%', textAlign:'left', padding:'12px 14px', background:'#2a2a2a', border:'1px solid #444', borderRadius:8, color:'#fff' }}>
                  Class {openClass ? '▲' : '▼'}
                </button>
                {openClass && (
                  <div className="radio-list" style={{ marginTop:10 }}>
                    {[
                      { value: 'ECONOMY', label: 'Economy' },
                      { value: 'PREMIUM_ECONOMY', label: 'Premium Economy' },
                      { value: 'BUSINESS', label: 'Business' },
                      { value: 'FIRST', label: 'First' }
                    ].map(option => (
                      <label key={option.value} className="radio-item">
                        <span style={{ color: 'white' }}>{option.label}</span>
                        <div className={`radio-dot ${cabinClass === option.value ? 'active' : ''}`}>
                          {cabinClass === option.value && <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%', margin: 'auto' }}></div>}
                        </div>
                        <input type="radio" name="class" value={option.value} checked={cabinClass === option.value} onChange={(e)=>setCabinClass(e.target.value as any)} style={{ display: 'none' }} />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div ref={stopsRef} style={{ marginTop:'20px' }}>
                <button onClick={()=> setOpenStops(v=>!v)} style={{ width:'100%', textAlign:'left', padding:'12px 14px', background:'#2a2a2a', border:'1px solid #444', borderRadius:8, color:'#fff' }}>
                  Stops {openStops ? '▲' : '▼'}
                </button>
                {openStops && (
                  <div className="radio-list" style={{ marginTop:10 }}>
                    {[
                      { value: '0', label: 'Non-stop' },
                      { value: '1', label: 'Up to 1 stop' },
                      { value: '2', label: 'Up to 2 stops' }
                    ].map(option => (
                      <label key={option.value} className="radio-item">
                        <span style={{ color: 'white' }}>{option.label}</span>
                        <div className={`radio-dot ${stops === option.value ? 'active' : ''}`}>
                          {stops === option.value && <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%', margin: 'auto' }}></div>}
                        </div>
                        <input type="radio" name="stops" value={option.value} checked={stops === option.value} onChange={(e)=>setStops(e.target.value as any)} style={{ display: 'none' }} />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="done-button" onClick={()=> setShowTravellersModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* old separate modals removed; moved into travellers modal */}

        {/* Attractions Form */}
        {activeTab === 'attractions' && (
          <div className="search-card">
            <div className="search-field">
              <SearchIcon />
              <div className="search-field-content">
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={attractionLocation}
                  onChange={(e) => {
                    const v = e.target.value;
                    console.log('Attraction input changed:', v);
                    setAttractionLocation(v);
                    if (attractionSearchError) {
                      setAttractionSearchError('');
                    }
                    const normalized = v.trim().toLowerCase();
                    attractionQueryRef.current = normalized;
                    setAttractionSuggestions([]);
                    
                    // Если пользователь вводит текст вручную, устанавливаем его как выбранную локацию
                    if (v.trim().length > 0) {
                      setSelectedAttractionName(v.trim());
                      setSelectedAttractionId(''); // Очищаем ID, так как это ручной ввод
                    }
                    
                    if (attractionDebounceRef.current) {
                      clearTimeout(attractionDebounceRef.current);
                    }
                    
                    // Проверяем, что пользователь не печатает (нет знаков препинания в конце)
                    const last = v.slice(-1);
                    const isTyping = /[\s,.;:/-]$/.test(last);
                    if (normalized.length < 3 || isTyping) {
                      console.log('Search cancelled - too short or typing');
                      setAttractionSuggestions([]);
                      setShowAttractionDropdown(false);
                      setIsSearchingAttraction(false);
                      return;
                    }
                    setIsSearchingAttraction(true);
                    setShowAttractionDropdown(true);
                    
                    attractionDebounceRef.current = setTimeout(async () => {
                      console.log('Debounced search triggered for:', v);
                      if (normalized !== attractionQueryRef.current) {
                        return;
                      }
                      console.log('Calling searchAttractionLocations with:', v.trim());
                      await searchAttractionLocations(v.trim(), normalized);
                    }, 400);
                  }}
                  onFocus={() => {
                    if (attractionSuggestions.length > 0 || isSearchingAttraction) {
                      setShowAttractionDropdown(true);
                    }
                  }}
                  onBlur={(e) => {
                    // Не закрываем dropdown если клик был на подсказку
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (!relatedTarget || !relatedTarget.closest('.hotel-suggestions')) {
                      setTimeout(() => setShowAttractionDropdown(false), 200);
                    }
                  }}
                  style={{
                    fontSize: '16px',
                    fontWeight: '400',
                    color: '#fff',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    padding: '0',
                    margin: '0'
                  }}
                />
              </div>
              {showAttractionDropdown && (attractionSuggestions.length > 0 || isSearchingAttraction) && (
                <div className="hotel-suggestions" onMouseDown={(e) => e.preventDefault()}>
                  {isSearchingAttraction ? (
                    <div style={{ padding: '12px 16px', color: '#aaa', textAlign: 'center' }}>
                      Searching...
                    </div>
                  ) : attractionSuggestions.length > 0 ? (
                    attractionSuggestions.map((suggestion, index) => (
                      <div key={index}
                           className="hotel-suggestion-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            console.log('Attraction selected:', suggestion);
                            console.log('Available fields:', Object.keys(suggestion));
                            setAttractionLocation(suggestion.label || suggestion.name);
                            setSelectedAttractionId(suggestion.id); // Используем закодированный ID
                            setSelectedAttractionName(suggestion.label || suggestion.name);
                            setSelectedAttractionType(suggestion.dest_type || suggestion.search_type);
                            setAttractionSearchError('');
                            setShowAttractionDropdown(false);
                            console.log('Set values:', {
                              id: suggestion.id,
                              name: suggestion.label || suggestion.name
                            });
                          }}>
                        <div className="hotel-suggestion-main">
                          <span className="hotel-suggestion-name">
                            {suggestion.label || suggestion.name}
                          </span>
                          <span className="hotel-suggestion-location">
                            {suggestion.country}
                          </span>
                        </div>
                        <div className="hotel-suggestion-meta">
                          {suggestion.productCount && (
                            <span className="hotel-count">
                              {suggestion.productCount} attractions
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px 16px', color: '#aaa', textAlign: 'center' }}>
                      No results found
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="search-field" onClick={() => setShowAttractionDateModal(true)}>
              <CalendarIcon />
              <div className="search-field-content">
                <div className="search-field-label">
                  {attractionDate ? 
                    (attractionDate.includes(' to ') ? attractionDate : attractionDate) 
                    : 'Any dates'}
                </div>
              </div>
            </div>
            {attractionSearchError && (
              <div style={{ color:'#ff6b6b', fontSize:14, margin:'8px 0 0 8px' }}>
                {attractionSearchError}
              </div>
            )}
            <button className="search-button" onClick={() => {
              console.log('=== SEARCH BUTTON CLICKED ===');
              console.log('selectedAttractionId:', selectedAttractionId);
              console.log('selectedAttractionName:', selectedAttractionName);
              console.log('attractionDate:', attractionDate);
              console.log('attractionLocation:', attractionLocation);
              
              // Проверяем, что локация выбрана (либо через selectedAttractionId, либо через attractionLocation)
              if (!((selectedAttractionId && selectedAttractionName) || attractionLocation)) {
                setAttractionSearchError('Please select a destination from the list');
                return;
              }
              if (!attractionDate || !attractionDate.trim()) {
                setAttractionSearchError('Please select dates');
                setShowAttractionDateModal(true);
                return;
              }
              setAttractionSearchError('');
              const searchParams = new URLSearchParams({
                id: selectedAttractionId || '',
                name: selectedAttractionName || attractionLocation,
                date: attractionDate || ''
              });
              console.log('Search params:', searchParams.toString());
              console.log('Navigating to:', `/attractions-results?${searchParams.toString()}`);
              navigate(`/attractions-results?${searchParams.toString()}`);
            }}>Search</button>
          </div>
        )}

        {/* Flights Form */}
        {activeTab === 'flights' && (
          <div className="search-card">
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <RadioButton 
                checked={flightType === 'round-trip'}
                onChange={() => setFlightType('round-trip')}
                label="Round-trip"
              />
              <RadioButton 
                checked={flightType === 'one-way'}
                onChange={() => setFlightType('one-way')}
                label="One-way"
              />
              <RadioButton 
                checked={flightType === 'multi-city'}
                onChange={() => setFlightType('multi-city')}
                label="Multi-city"
              />
            </div>
            
            {flightType !== 'multi-city' && (
            <div className="search-field">
              <FlightIcon />
              <div className="search-field-content">
                <input
                  type="text"
                  value={fromCity}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFromCity(v);
                    setFromSelectedId('');
                    const normalized = v.toLowerCase().trim();
                    fromQueryRef.current = normalized;
                    const last = v.slice(-1);
                    const isTyping = /[\s,.;:/-]$/.test(last);
                    setFromSuggestions([]);
                    clearTimeout(fromDebounceRef.current);
                    if (normalized.length < 3 || isTyping) {
                      setIsSearchingFrom(false);
                      setShowFromDropdown(false);
                      return;
                    }
                    setIsSearchingFrom(true);
                    setShowFromDropdown(true);
                    fromDebounceRef.current = setTimeout(async () => {
                      if (normalized !== fromQueryRef.current) return;
                      try {
                        const results = await searchAirports(normalized);
                        if (fromQueryRef.current !== normalized) return;
                        const city = results.find((r: any) => r.type === 'CITY');
                        const airports = results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6);
                        const list = city ? [city, ...airports] : airports;
                        setFromSuggestions(list);
                        setShowFromDropdown(list.length > 0);
                      } catch { 
                        if (fromQueryRef.current === normalized) {
                          setFromSuggestions([]); 
                          setShowFromDropdown(false);
                        }
                      } finally {
                        if (fromQueryRef.current === normalized) {
                          setIsSearchingFrom(false);
                        }
                      }
                    }, 400);
                  }}
                  placeholder="Where from?"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'white',
                    fontSize: '16px',
                    width: '100%'
                  }}
                  onFocus={() => {
                    if (fromSuggestions.length > 0) setShowFromDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowFromDropdown(false), 150)}
                />
              </div>
            </div>
            )}
            {showFromDropdown && (fromSuggestions.length > 0 || isSearchingFrom) && (
              <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                {isSearchingFrom ? (
                  <div style={{ padding: '12px 16px', color: '#aaa', textAlign: 'center' }}>Searching...</div>
                ) : (
                  fromSuggestions.map((s: any) => {
                    const isCity = s.type === 'CITY';
                    const primary = isCity ? `${s.cityName || s.name} · All airports` : `${s.code} · ${s.name}`;
                    const secondary = isCity ? (s.countryName || '') : (s.cityName || '');
                    return (
                      <div key={s.id}
                           onMouseDown={() => { setFromSelectedId(s.id); setFromCity(primary); setShowFromDropdown(false); }}
                           style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                        <span>{primary}</span>
                        <span style={{ color: '#aaa' }}>{secondary}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            
            {flightType !== 'multi-city' && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
              <button 
                onClick={swapCities}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <SwapIcon />
        </button>
            </div>
            )}
            
            {flightType !== 'multi-city' && (
            <div className="search-field">
              <FlightIcon />
              <div className="search-field-content">
                <input
                  type="text"
                  value={toCity}
                  onChange={(e) => {
                    const v = e.target.value;
                    setToCity(v);
                    setToSelectedId('');
                    const normalized = v.toLowerCase().trim();
                    toQueryRef.current = normalized;
                    const last = v.slice(-1);
                    const isTyping = /[\s,.;:/-]$/.test(last);
                    setToSuggestions([]);
                    clearTimeout(toDebounceRef.current);
                    if (normalized.length < 3 || isTyping) {
                      setIsSearchingTo(false);
                      setShowToDropdown(false);
                      return;
                    }
                    setIsSearchingTo(true);
                    setShowToDropdown(true);
                    toDebounceRef.current = setTimeout(async () => {
                      if (normalized !== toQueryRef.current) return;
                      try {
                        const results = await searchAirports(normalized);
                        if (toQueryRef.current !== normalized) return;
                        const city = results.find((r: any) => r.type === 'CITY');
                        const airports = results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6);
                        const list = city ? [city, ...airports] : airports;
                        setToSuggestions(list);
                        setShowToDropdown(list.length > 0);
                      } catch { 
                        if (toQueryRef.current === normalized) {
                          setToSuggestions([]); 
                          setShowToDropdown(false);
                        }
                      } finally {
                        if (toQueryRef.current === normalized) {
                          setIsSearchingTo(false);
                        }
                      }
                    }, 400);
                  }}
                  placeholder="Where to?"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'white',
                    fontSize: '16px',
                    width: '100%'
                  }}
                  onFocus={() => {
                    if (toSuggestions.length > 0) setShowToDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowToDropdown(false), 150)}
                />
              </div>
            </div>
            )}
            {showToDropdown && (toSuggestions.length > 0 || isSearchingTo) && (
              <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                {isSearchingTo ? (
                  <div style={{ padding: '12px 16px', color: '#aaa', textAlign: 'center' }}>Searching...</div>
                ) : (
                  toSuggestions.map((s: any) => {
                    const isCity = s.type === 'CITY';
                    const primary = isCity ? `${s.cityName || s.name} · All airports` : `${s.code} · ${s.name}`;
                    const secondary = isCity ? (s.countryName || '') : (s.cityName || '');
                    return (
                      <div key={s.id}
                           onMouseDown={() => { setToSelectedId(s.id); setToCity(primary); setShowToDropdown(false); }}
                           style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                        <span>{primary}</span>
                        <span style={{ color: '#aaa' }}>{secondary}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
            
            {flightType !== 'multi-city' && (
            <div className="search-field" onClick={() => {
              setShowDatePickerModal(true);
              setDateFieldType('departure');
            }}>
              <CalendarIcon />
              <div className="search-field-content">
                <div style={{ color: 'white', fontSize: '16px', cursor: 'pointer' }}>
                  {departDate 
                    ? (flightType === 'round-trip' 
                        ? formatDateRange(departDate, returnDate) 
                        : formatDate(departDate))
                    : 'When?'}
                </div>
              </div>
            </div>
            )}
            
            {flightType === 'multi-city' && (
              <div style={{ position: 'relative' }}>
                {/* Первый рейс */}
                <div className="multi-flight-block">
                
                <div className="search-field">
                  <FlightIcon />
                  <div className="search-field-content">
                    <input
                      type="text"
                      value={multiLegs[0]?.from || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMultiLegs(x => x.map((l, i) => i === 0 ? { ...l, from: v } : l));
                        setMultiActive({ idx: 0, type: 'from' });
                        setMultiShow(true);
                        clearTimeout(multiDebounceRef.current);
                        multiDebounceRef.current = setTimeout(async () => {
                          if (v.trim().length < 2) { setMultiSuggest([]); return; }
                          try {
                            const results = await searchAirports(v.trim());
                            setMultiSuggest(results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6));
                          } catch { setMultiSuggest([]); }
                        }, 200);
                      }}
                      placeholder="Where from?"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '16px',
                        width: '100%'
                      }}
                      onFocus={() => { setMultiActive({ idx: 0, type: 'from' }); setMultiShow(true); }}
                      onBlur={() => setTimeout(() => setMultiShow(false), 150)}
                    />
                  </div>
                </div>
                {multiShow && multiActive?.idx === 0 && multiActive?.type === 'from' && multiSuggest.length > 0 && (
                  <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                    {multiSuggest.map((s: any) => (
                      <div key={s.id}
                           onMouseDown={() => { 
                             setMultiLegs(v => v.map((l, i) => i === 0 ? { ...l, from: `${s.code} · ${s.name}` } : l)); 
                             setMultiLegIds(v => v.map((l, i) => i === 0 ? { ...l, fromId: s.id } : l)); 
                             setMultiShow(false); 
                           }}
                           style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                        <span>{s.code} · {s.name}</span>
                        <span style={{ color: '#aaa' }}>{s.cityName}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="search-field">
                  <FlightIcon />
                  <div className="search-field-content">
                    <input
                      type="text"
                      value={multiLegs[0]?.to || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMultiLegs(x => x.map((l, i) => i === 0 ? { ...l, to: v } : l));
                        setMultiActive({ idx: 0, type: 'to' });
                        setMultiShow(true);
                        clearTimeout(multiDebounceRef.current);
                        multiDebounceRef.current = setTimeout(async () => {
                          if (v.trim().length < 2) { setMultiSuggest([]); return; }
                          try {
                            const results = await searchAirports(v.trim());
                            setMultiSuggest(results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6));
                          } catch { setMultiSuggest([]); }
                        }, 200);
                      }}
                      placeholder="Where to?"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '16px',
                        width: '100%'
                      }}
                      onFocus={() => { setMultiActive({ idx: 0, type: 'to' }); setMultiShow(true); }}
                      onBlur={() => setTimeout(() => setMultiShow(false), 150)}
                    />
                  </div>
                </div>
                {multiShow && multiActive?.idx === 0 && multiActive?.type === 'to' && multiSuggest.length > 0 && (
                  <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                    {multiSuggest.map((s: any) => (
                      <div key={s.id}
                           onMouseDown={() => { 
                             setMultiLegs(v => v.map((l, i) => i === 0 ? { ...l, to: `${s.code} · ${s.name}` } : l)); 
                             setMultiLegIds(v => v.map((l, i) => i === 0 ? { ...l, toId: s.id } : l)); 
                             setMultiShow(false); 
                           }}
                           style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                        <span>{s.code} · {s.name}</span>
                        <span style={{ color: '#aaa' }}>{s.cityName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Дата */}
                <div className="search-field" onClick={() => {
                  setShowDatePickerModal(true);
                  setActiveLegIndex(0);
                }}>
                  <CalendarIcon />
                  <div className="search-field-content">
                    <div style={{ color: 'white', fontSize: '16px', cursor: 'pointer' }}>
                      {multiLegs[0]?.date ? formatDate(multiLegs[0].date) : 'When?'}
                    </div>
                  </div>
                </div>
                </div>

                {/* Второй рейс */}
                <div className="multi-flight-block">
                
                <div className="search-field">
                  <FlightIcon />
                  <div className="search-field-content">
                    <input
                      type="text"
                      value={multiLegs[1]?.from || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMultiLegs(x => x.map((l, i) => i === 1 ? { ...l, from: v } : l));
                        setMultiActive({ idx: 1, type: 'from' });
                        setMultiShow(true);
                        clearTimeout(multiDebounceRef.current);
                        multiDebounceRef.current = setTimeout(async () => {
                          if (v.trim().length < 2) { setMultiSuggest([]); return; }
                          try {
                            const results = await searchAirports(v.trim());
                            setMultiSuggest(results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6));
                          } catch { setMultiSuggest([]); }
                        }, 200);
                      }}
                      placeholder="Where from?"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '16px',
                        width: '100%'
                      }}
                      onFocus={() => { setMultiActive({ idx: 1, type: 'from' }); setMultiShow(true); }}
                      onBlur={() => setTimeout(() => setMultiShow(false), 150)}
                    />
                  </div>
                </div>
                {multiShow && multiActive?.idx === 1 && multiActive?.type === 'from' && multiSuggest.length > 0 && (
                  <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                    {multiSuggest.map((s: any) => (
                      <div key={s.id}
                           onMouseDown={() => { 
                             setMultiLegs(v => v.map((l, i) => i === 1 ? { ...l, from: `${s.code} · ${s.name}` } : l)); 
                             setMultiLegIds(v => v.map((l, i) => i === 1 ? { ...l, fromId: s.id } : l)); 
                             setMultiShow(false); 
                           }}
                           style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                        <span>{s.code} · {s.name}</span>
                        <span style={{ color: '#aaa' }}>{s.cityName}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="search-field">
                  <FlightIcon />
                  <div className="search-field-content">
                    <input
                      type="text"
                      value={multiLegs[1]?.to || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMultiLegs(x => x.map((l, i) => i === 1 ? { ...l, to: v } : l));
                        setMultiActive({ idx: 1, type: 'to' });
                        setMultiShow(true);
                        clearTimeout(multiDebounceRef.current);
                        multiDebounceRef.current = setTimeout(async () => {
                          if (v.trim().length < 2) { setMultiSuggest([]); return; }
                          try {
                            const results = await searchAirports(v.trim());
                            setMultiSuggest(results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6));
                          } catch { setMultiSuggest([]); }
                        }, 200);
                      }}
                      placeholder="Where to?"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '16px',
                        width: '100%'
                      }}
                      onFocus={() => { setMultiActive({ idx: 1, type: 'to' }); setMultiShow(true); }}
                      onBlur={() => setTimeout(() => setMultiShow(false), 150)}
                    />
                  </div>
                </div>
                {multiShow && multiActive?.idx === 1 && multiActive?.type === 'to' && multiSuggest.length > 0 && (
                  <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                    {multiSuggest.map((s: any) => (
                      <div key={s.id}
                           onMouseDown={() => { 
                             setMultiLegs(v => v.map((l, i) => i === 1 ? { ...l, to: `${s.code} · ${s.name}` } : l)); 
                             setMultiLegIds(v => v.map((l, i) => i === 1 ? { ...l, toId: s.id } : l)); 
                             setMultiShow(false); 
                           }}
                           style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                        <span>{s.code} · {s.name}</span>
                        <span style={{ color: '#aaa' }}>{s.cityName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Дата */}
                <div className="search-field" onClick={() => {
                  setShowDatePickerModal(true);
                  setActiveLegIndex(1);
                }}>
                  <CalendarIcon />
                  <div className="search-field-content">
                    <div style={{ color: 'white', fontSize: '16px', cursor: 'pointer' }}>
                      {multiLegs[1]?.date ? formatDate(multiLegs[1].date) : 'When?'}
                    </div>
                  </div>
                </div>
                </div>


                {/* Третий рейс - добавим время */}
                {multiLegs[2] && (
                  <div className="multi-flight-block">
                  
                  {/* Кнопка удаления третьего рейса в левом верхнем углу */}
                  <div className="remove-flight-container">
                      <button 
                        onClick={() => setMultiLegs(v => v.filter((_, i) => i !== 2))}
                        className="remove-flight-btn"
                        title="Remove flight"
                      >
                        ✕
                      </button>
                    </div>
                  
                  <div className="search-field">
                    <FlightIcon />
                    <div className="search-field-content">
                      <input
                        type="text"
                        value={multiLegs[2]?.from || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMultiLegs(x => x.map((l, i) => i === 2 ? { ...l, from: v } : l));
                          setMultiActive({ idx: 2, type: 'from' });
                          setMultiShow(true);
                          clearTimeout(multiDebounceRef.current);
                          multiDebounceRef.current = setTimeout(async () => {
                            if (v.trim().length < 2) { setMultiSuggest([]); return; }
                            try {
                              const results = await searchAirports(v.trim());
                              setMultiSuggest(results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6));
                            } catch { setMultiSuggest([]); }
                          }, 200);
                        }}
                        placeholder="Where from?"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'white',
                          fontSize: '16px',
                          width: '100%'
                        }}
                        onFocus={() => { setMultiActive({ idx: 2, type: 'from' }); setMultiShow(true); }}
                        onBlur={() => setTimeout(() => setMultiShow(false), 150)}
                      />
                    </div>
                  </div>
                  {multiShow && multiActive?.idx === 2 && multiActive?.type === 'from' && multiSuggest.length > 0 && (
                    <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                      {multiSuggest.map((s: any) => (
                        <div key={s.id}
                             onMouseDown={() => { 
                               setMultiLegs(v => v.map((l, i) => i === 2 ? { ...l, from: `${s.code} · ${s.name}` } : l)); 
                               setMultiLegIds(v => v.map((l, i) => i === 2 ? { ...l, fromId: s.id } : l)); 
                               setMultiShow(false); 
                             }}
                             style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                          <span>{s.code} · {s.name}</span>
                          <span style={{ color: '#aaa' }}>{s.cityName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="search-field">
                    <FlightIcon />
                    <div className="search-field-content">
                      <input
                        type="text"
                        value={multiLegs[2]?.to || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMultiLegs(x => x.map((l, i) => i === 2 ? { ...l, to: v } : l));
                          setMultiActive({ idx: 2, type: 'to' });
                          setMultiShow(true);
                          clearTimeout(multiDebounceRef.current);
                          multiDebounceRef.current = setTimeout(async () => {
                            if (v.trim().length < 2) { setMultiSuggest([]); return; }
                            try {
                              const results = await searchAirports(v.trim());
                              setMultiSuggest(results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6));
                            } catch { setMultiSuggest([]); }
                          }, 200);
                        }}
                        placeholder="Where to?"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'white',
                          fontSize: '16px',
                          width: '100%'
                        }}
                        onFocus={() => { setMultiActive({ idx: 2, type: 'to' }); setMultiShow(true); }}
                        onBlur={() => setTimeout(() => setMultiShow(false), 150)}
                      />
                    </div>
                  </div>
                  {multiShow && multiActive?.idx === 2 && multiActive?.type === 'to' && multiSuggest.length > 0 && (
                    <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                      {multiSuggest.map((s: any) => (
                        <div key={s.id}
                             onMouseDown={() => { 
                               setMultiLegs(v => v.map((l, i) => i === 2 ? { ...l, to: `${s.code} · ${s.name}` } : l)); 
                               setMultiLegIds(v => v.map((l, i) => i === 2 ? { ...l, toId: s.id } : l)); 
                               setMultiShow(false); 
                             }}
                             style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                          <span>{s.code} · {s.name}</span>
                          <span style={{ color: '#aaa' }}>{s.cityName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Дата */}
                  <div className="search-field" onClick={() => {
                    setShowDatePickerModal(true);
                    setActiveLegIndex(2);
                  }}>
                    <CalendarIcon />
                    <div className="search-field-content">
                      <div style={{ color: 'white', fontSize: '16px', cursor: 'pointer' }}>
                        {multiLegs[2]?.date ? formatDate(multiLegs[2].date) : 'When?'}
                      </div>
                    </div>
                  </div>
                  </div>
                )}
                

                {/* Четвертый рейс */}
                {multiLegs[3] && (
                  <div className="multi-flight-block">
                  
                  {/* Кнопка удаления четвертого рейса в левом верхнем углу */}
                  <div className="remove-flight-container">
                    <button 
                      onClick={() => setMultiLegs(v => v.filter((_, i) => i !== 3))}
                      className="remove-flight-btn"
                      title="Remove flight"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="search-field">
                    <FlightIcon />
                    <div className="search-field-content">
                      <input
                        type="text"
                        value={multiLegs[3]?.from || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMultiLegs(x => x.map((l, i) => i === 3 ? { ...l, from: v } : l));
                          setMultiActive({ idx: 3, type: 'from' });
                          setMultiShow(true);
                          clearTimeout(multiDebounceRef.current);
                          multiDebounceRef.current = setTimeout(async () => {
                            if (v.trim().length < 2) { setMultiSuggest([]); return; }
                            try {
                              const results = await searchAirports(v.trim());
                              setMultiSuggest(results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6));
                            } catch { setMultiSuggest([]); }
                          }, 200);
                        }}
                        placeholder="Where from?"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'white',
                          fontSize: '16px',
                          width: '100%'
                        }}
                      onFocus={() => { setMultiActive({ idx: 3, type: 'from' }); setMultiShow(true); }}
                      onBlur={() => setTimeout(() => setMultiShow(false), 150)}
                      />
                    </div>
                  </div>
                  {multiShow && multiActive?.idx === 3 && multiActive?.type === 'from' && multiSuggest.length > 0 && (
                    <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                      {multiSuggest.map((s: any) => (
                        <div key={s.id}
                             onMouseDown={() => { 
                               setMultiLegs(v => v.map((l, i) => i === 3 ? { ...l, from: `${s.code} · ${s.name}` } : l)); 
                               setMultiLegIds(v => v.map((l, i) => i === 3 ? { ...l, fromId: s.id } : l)); 
                               setMultiShow(false); 
                             }}
                             style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                          <span>{s.code} · {s.name}</span>
                          <span style={{ color: '#aaa' }}>{s.cityName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="search-field">
                    <FlightIcon />
                    <div className="search-field-content">
                      <input
                        type="text"
                        value={multiLegs[3]?.to || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMultiLegs(x => x.map((l, i) => i === 3 ? { ...l, to: v } : l));
                          setMultiActive({ idx: 3, type: 'to' });
                          setMultiShow(true);
                          clearTimeout(multiDebounceRef.current);
                          multiDebounceRef.current = setTimeout(async () => {
                            if (v.trim().length < 2) { setMultiSuggest([]); return; }
                            try {
                              const results = await searchAirports(v.trim());
                              setMultiSuggest(results.filter((r: any) => r.type === 'AIRPORT').slice(0, 6));
                            } catch { setMultiSuggest([]); }
                          }, 200);
                        }}
                        placeholder="Where to?"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'white',
                          fontSize: '16px',
                          width: '100%'
                        }}
                        onFocus={() => { setMultiActive({ idx: 3, type: 'to' }); setMultiShow(true); }}
                        onBlur={() => setTimeout(() => setMultiShow(false), 150)}
                      />
                    </div>
                  </div>

                  {multiShow && multiActive?.idx === 3 && multiActive?.type === 'to' && multiSuggest.length > 0 && (
                    <div style={{ background: '#1f1f1f', border: '1px solid #333', borderRadius: 8, marginTop: -8 }}>
                      {multiSuggest.map((s: any) => (
                        <div key={s.id}
                             onMouseDown={() => { 
                               setMultiLegs(v => v.map((l, i) => i === 3 ? { ...l, to: `${s.code} · ${s.name}` } : l)); 
                               setMultiLegIds(v => v.map((l, i) => i === 3 ? { ...l, toId: s.id } : l)); 
                               setMultiShow(false); 
                             }}
                             style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}>
                          <span>{s.code} · {s.name}</span>
                          <span style={{ color: '#aaa' }}>{s.cityName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Дата */}
                  <div className="search-field" onClick={() => {
                    setShowDatePickerModal(true);
                    setActiveLegIndex(3);
                  }}>
                    <CalendarIcon />
                    <div className="search-field-content">
                      <div style={{ color: 'white', fontSize: '16px', cursor: 'pointer' }}>
                        {multiLegs[3]?.date ? formatDate(multiLegs[3].date) : 'When?'}
                      </div>
                    </div>
                  </div>
                  </div>
                )}

                {/* Кнопка добавления рейса */}
                <div className="add-flight-section">
                  <button 
                    onClick={() => setMultiLegs(v => [...v, { from: '', to: '', date: '' }])}
                    className="add-flight-button"
                  >
                    + Add a flight
                  </button>
                </div>
              </div>
            )}
            
      <div className="search-field">
              <PersonIcon />
              <div className="search-field-content" onClick={() => { setTravellersModalSection('pax'); setShowTravellersModal(true); }} style={{ cursor: 'pointer' }}>
                <div style={{ color: 'white', fontSize: '16px' }}>{travellersSummary}</div>
              </div>
            </div>
      {searchError && (
        <div style={{ color:'#ff6b6b', fontSize: 14, margin: '8px 0 0 8px' }}>{searchError}</div>
      )}
            <button className="search-button" onClick={handleSearch}>Search</button>
          </div>
        )}
        
        {/* Continue Search removed by request */}
      </div>



      {/* Continue your search - ровно такие же размеры как Trending destinations */}
      {activeTab === 'flights' && (() => {
        try {
          const raw = sessionStorage.getItem('flightResults_last_url')
            || localStorage.getItem('flightResults_last_url')
            || '';
          if (!raw) return null;
          const params = new URLSearchParams(raw);
          const fromCode = (params.get('from') || '').split('.')[0];
          const toCode = (params.get('to') || '').split('.')[0];
          const departDate = params.get('departDate') || '';
          const adults = params.get('adults') || '1';
          const children = params.get('children') || '';
          if (!fromCode || !toCode) return null;
          const childrenCount = children ? children.split(',').filter(Boolean).length : 0;
          const travellers = parseInt(adults) + childrenCount;
          return (
            <div className="destinations-section" key={`cs_${lastSearchVersion}`}>
              <h2 className="section-title">Continue your search</h2>
              <div className="search-history-card" onClick={() => { window.location.href = `/flight-results?${raw}`; }}>
                <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=120&h=120&fit=crop" alt="Flight" />
                <div className="search-history-content">
                  <div className="search-history-route">
                    <span className="search-history-from">{fromCode}</span>
                    <svg width="20" height="20" fill="#0071c2" viewBox="0 0 24 24" style={{ margin: '0 8px' }}>
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                    </svg>
                    <span className="search-history-to">{toCode}</span>
                  </div>
                  <div className="search-history-details">
                    {departDate && new Date(departDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, {travellers} traveller{travellers > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          );
        } catch {
          return null;
        }
      })()}

      {/* Popular Destinations */}
      {activeTab === 'flights' && (
        <>
          <div className="destinations-section">
            <h2 className="section-title">Trending destinations</h2>
            <p className="section-subtitle">Most popular routes this month</p>
            
            <div className="destinations-grid">
              <div className="destination-card large" onClick={() => {
                setFromCity('');
                setToCity('MAD · MADRID BARAJAS AIRPORT');
                setToSelectedId('MAD.AIRPORT');
                setActiveTab('flights');
                scrollToSearch();
              }}>
                <img src="https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&h=400&fit=crop" alt="Madrid" />
                <div className="destination-overlay">
                  <h3 className="destination-name">Madrid</h3>
                  <p className="destination-desc">Spain</p>
                </div>
              </div>
              
              <div className="destination-card" onClick={() => {
                setFromCity('');
                setToCity('DXB · DUBAI INTERNATIONAL AIRPORT');
                setToSelectedId('DXB.AIRPORT');
                setActiveTab('flights');
                scrollToSearch();
              }}>
                <img src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop" alt="Dubai" />
                <div className="destination-overlay">
                  <h3 className="destination-name">Dubai</h3>
                  <p className="destination-desc">United Arab Emirates</p>
                </div>
              </div>
              
              <div className="destination-card" onClick={() => {
                setFromCity('');
                setToCity('CDG · PARIS CHARLES DE GAULLE AIRPORT');
                setToSelectedId('CDG.AIRPORT');
                setActiveTab('flights');
                scrollToSearch();
              }}>
                <img src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop" alt="Paris" />
                <div className="destination-overlay">
                  <h3 className="destination-name">Paris</h3>
                  <p className="destination-desc">France</p>
                </div>
              </div>
              
              <div className="destination-card" onClick={() => {
                setFromCity('');
                setToCity('JFK · NEW YORK JOHN F KENNEDY AIRPORT');
                setToSelectedId('JFK.AIRPORT');
                setActiveTab('flights');
                scrollToSearch();
              }}>
                <img src="https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop" alt="New York" />
                <div className="destination-overlay">
                  <h3 className="destination-name">New York</h3>
                  <p className="destination-desc">United States</p>
                </div>
              </div>
              
              <div className="destination-card" onClick={() => {
                setFromCity('');
                setToCity('SYD · SYDNEY KINGSFORD SMITH AIRPORT');
                setToSelectedId('SYD.AIRPORT');
                setActiveTab('flights');
                scrollToSearch();
              }}>
                <img src="https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=300&fit=crop" alt="Sydney" />
                <div className="destination-overlay">
                  <h3 className="destination-name">Sydney</h3>
                  <p className="destination-desc">Australia</p>
                </div>
              </div>
              
              <div className="destination-card" onClick={() => {
                setFromCity('');
                setToCity('DPS · NGURAH RAI INTERNATIONAL AIRPORT');
                setToSelectedId('DPS.AIRPORT');
                setActiveTab('flights');
                scrollToSearch();
              }}>
                <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop" alt="Bali" />
                <div className="destination-overlay">
                  <h3 className="destination-name">Bali</h3>
                  <p className="destination-desc">Indonesia</p>
                </div>
              </div>
              
              <div className="destination-card" onClick={() => {
                setFromCity('');
                setToCity('LHR · LONDON HEATHROW AIRPORT');
                setToSelectedId('LHR.AIRPORT');
                setActiveTab('flights');
                scrollToSearch();
              }}>
                <img src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop" alt="London" />
                <div className="destination-overlay">
                  <h3 className="destination-name">London</h3>
                  <p className="destination-desc">United Kingdom</p>
                </div>
              </div>
              
              <div className="destination-card" onClick={() => {
                setFromCity('');
                setToCity('HKT · PHUKET INTERNATIONAL AIRPORT');
                setToSelectedId('HKT.AIRPORT');
                setActiveTab('flights');
                scrollToSearch();
              }}>
                <img src="https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=400&h=300&fit=crop" alt="Phuket" />
                <div className="destination-overlay">
                  <h3 className="destination-name">Phuket</h3>
                  <p className="destination-desc">Thailand</p>
                </div>
              </div>
              
              <div className="destination-card" onClick={() => {
                setFromCity('');
                setToCity('HND · TOKYO HANEDA AIRPORT');
                setToSelectedId('HND.AIRPORT');
                setActiveTab('flights');
                scrollToSearch();
              }}>
                <img src="https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=400&h=300&fit=crop" alt="Tokyo" />
                <div className="destination-overlay">
                  <h3 className="destination-name">Tokyo</h3>
                  <p className="destination-desc">Japan</p>
                </div>
              </div>
            </div>
          </div>

          {/* Offers Section */}
          <div className="offers-section">
            <h2 className="section-title">Offers</h2>
            <p className="section-subtitle">Promotions, deals, and special offers for you</p>
            
            <div className="offers-grid">
              <div className="offer-card">
                <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=300&fit=crop" alt="Travel deals" />
                <div className="offer-content">
                  <h3 className="offer-title">Fly away to your dream holiday</h3>
                  <p className="offer-desc">Get inspired, compare and book flights with more flexibility</p>
                  <button className="offer-button" onClick={scrollToSearch}>Search for flights</button>
                </div>
              </div>
              
              <div className="offer-card">
                <img src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=300&fit=crop" alt="Last minute" />
                <div className="offer-content">
                  <h3 className="offer-title">Save on domestic flights</h3>
                  <p className="offer-desc">Book your next adventure and explore new destinations</p>
                  <button className="offer-button" onClick={scrollToSearch}>Find deals</button>
                </div>
              </div>
            </div>
          </div>

    </>
  )}

      {/* Sign In Section */}
      {/* Sign-in promo removed by request */}

      {/* Continue Search removed by request */}

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={showDatePickerModal}
        onClose={() => setShowDatePickerModal(false)}
        onDateSelect={(departDateSelected, returnDateSelected) => {
          if (flightType === 'multi-city') {
            // Для multi-city обновляем дату конкретного б区块
            setMultiLegs(v => v.map((leg, i) => i === activeLegIndex ? { ...leg, date: departDateSelected } : leg));
          } else {
            // Для обычных рейсов используем старую логику
            setDepartDate(departDateSelected);
            if (flightType === 'round-trip' && returnDateSelected) {
              setReturnDate(returnDateSelected);
            }
          }
        }}
        departDate={flightType === 'multi-city' ? (multiLegs[activeLegIndex]?.date || '') : departDate}
        returnDate={returnDate}
        flightType={flightType as 'round-trip' | 'one-way' | 'multi-city'}
        fieldType={dateFieldType}
      />

      {/* Stays Date Picker Modal */}
      <DatePickerModal
        isOpen={showStaysDatePicker}
        onClose={() => setShowStaysDatePicker(false)}
        onDateSelect={handleStaysDateSelect}
        departDate={staysCheckIn}
        returnDate={staysCheckOut}
        flightType="round-trip"
        fieldType="departure"
      />

      {/* Attractions Date Picker Modal */}
      <DatePickerModal
        isOpen={showAttractionDateModal}
        onClose={() => setShowAttractionDateModal(false)}
        onDateSelect={(date) => {
          console.log('Date selected:', date);
          setAttractionDate(date);
          setShowAttractionDateModal(false);
        }}
        departDate={attractionDate}
        returnDate=""
        flightType="round-trip"
        fieldType="departure"
      />


      {/* Stays Guests & Rooms Modal */}
      <GuestsRoomsModal
        isOpen={showStaysGuestsModal}
        onClose={() => setShowStaysGuestsModal(false)}
        initialRooms={staysRooms}
        initialAdults={staysAdults}
        initialChildren={staysChildren}
        initialCurrency={currency}
        onApply={handleStaysGuestsApply}
      />

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="bottom-nav-item active" onClick={() => navigate('/')}>
          <SearchNavIcon />
          <span className="bottom-nav-label">Search</span>
        </div>
        <div className="bottom-nav-item" onClick={() => navigate('/bookings')}>
          <BookingsNavIcon />
          <span className="bottom-nav-label">Bookings</span>
        </div>
        <div className="bottom-nav-item" onClick={() => navigate('/favorites')}>
          <FavoritesNavIcon />
          <span className="bottom-nav-label">Favorites</span>
        </div>
        {(() => {
          try {
            return localStorage.getItem('auth_user') ? (
              <div className="bottom-nav-item" onClick={() => navigate('/profile')}>
                <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/>
                </svg>
                <span className="bottom-nav-label">Profile</span>
              </div>
            ) : (
              <div className="bottom-nav-item" onClick={() => navigate('/auth?mode=signin')}>
                <SignInNavIcon />
                <span className="bottom-nav-label">Sign in</span>
              </div>
            );
          } catch {
            return (
              <div className="bottom-nav-item" onClick={() => navigate('/auth?mode=signin')}>
                <SignInNavIcon />
                <span className="bottom-nav-label">Sign in</span>
              </div>
            );
          }
        })()}
      </nav>
      
      {/* Кнопка назад в FlightResults */}
      {navigationType === 'back' && (
        <div style={{ padding: '10px', textAlign: 'center' }}>
          <span style={{ color: '#0071c2', cursor: 'pointer' }} onClick={() => navigate('/')}>
            ← Back to search
          </span>
        </div>
      )}
    </div>
  );
}

// Splash Screen Component
const SplashScreen = ({ isVisible }: { isVisible: boolean }) => {
  if (!isVisible) return null;
  
  return (
    <div className={`splash-screen ${!isVisible ? 'fade-out' : ''}`}>
      <div className="splash-content">
        <div className="splash-logo">Booking.com</div>
      </div>
    </div>
  );
};

// Main App component with routing
const App = () => {
  // Check if this is the first load in this session
  const [showSplash, setShowSplash] = React.useState(() => {
    // Check sessionStorage to see if the app has already been loaded
    const hasLoadedBefore = sessionStorage.getItem('app_has_loaded');
    return !hasLoadedBefore; // Show splash only if not loaded before
  });

  React.useEffect(() => {
    if (showSplash) {
      // Mark that the app has been loaded in this session
      sessionStorage.setItem('app_has_loaded', 'true');
      
      // Hide splash screen after 2.5 seconds
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  return (
    <>
      <SplashScreen isVisible={showSplash} />
      <div className={showSplash ? 'app-hidden' : 'app-visible'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/hotel-results" element={<HotelResults />} />
          <Route path="/hotel-details" element={<HotelDetails />} />
          <Route path="/hotel/booking" element={<BookingOverview />} />
          <Route path="/hotel/guest-info" element={<GuestInfo />} />
          <Route path="/hotel/payment" element={<HotelPayment />} />
          <Route path="/attractions-results" element={<AttractionsResults />} />
          <Route path="/attraction-detail" element={<AttractionDetail />} />
          <Route path="/attraction-availability" element={<AttractionAvailability />} />
          <Route path="/attraction-checkout" element={<AttractionCheckout />} />
          <Route path="/flight-results" element={<FlightResults onBack={() => window.history.back()} />} />
          <Route path="/flight-results-multi" element={<FlightResultsMulti onBack={() => window.history.back()} />} />
      <Route path="/flight-detail/:id" element={
        <RouteGuard requireOffer={true}>
          <FlightDetail onBack={() => window.history.back()} />
        </RouteGuard>
      } />
      <Route path="/ticket-type" element={
        <RouteGuard requireOffer={true}>
          <TicketType />
        </RouteGuard>
      } />
      <Route path="/seat-selection" element={
        <RouteGuard requireOffer={true}>
          <SeatSelection />
        </RouteGuard>
      } />
      <Route path="/seat-map" element={
        <RouteGuard requireOffer={true}>
          <SeatMap />
        </RouteGuard>
      } />
      <Route path="/luggage" element={
        <RouteGuard requireOffer={true}>
          <Luggage />
        </RouteGuard>
      } />
      <Route path="/details-hub" element={
        <RouteGuard requireOffer={true} requireFlow={true}>
          <DetailsHub />
        </RouteGuard>
      } />
      <Route path="/traveler-details" element={
        <RouteGuard requireOffer={true} requireFlow={true}>
          <TravelerDetails />
        </RouteGuard>
      } />
      <Route path="/contact-details" element={
        <RouteGuard requireOffer={true} requireFlow={true}>
          <ContactDetails />
        </RouteGuard>
      } />
      <Route path="/payment" element={
        <RouteGuard>
          <Payment />
        </RouteGuard>
      } />
      <Route path="/payment/new-card" element={
        <RouteGuard requireOffer={true} requireFlow={true}>
          <NewCard />
        </RouteGuard>
      } />
        </Routes>
      </div>
    </>
  );
};

export default App;
