import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BookingsPage.css';

// Icons
const SearchNavIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
    <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/>
  </svg>
);

const BookingsNavIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
    <path d="M160-120q-33 0-56.5-23.5T80-200v-440q0-33 23.5-56.5T160-720h160v-80q0-33 23.5-56.5T400-880h160q33 0 56.5 23.5T640-800v80h160q33 0 56.5 23.5T880-640v440q0 33-23.5 56.5T800-120H160Zm240-600h160v-80H400v80Zm-160 80h-80v440h80v-440Zm400 440v-440H320v440h320Zm80-440v440h80v-440h-80ZM480-420Z"/>
  </svg>
);

const SignInNavIcon = () => (
  <svg className="bottom-nav-icon" fill="currentColor" viewBox="0 -960 960 960">
    <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/>
  </svg>
);

const BookingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'active' | 'past' | 'canceled'>('active');

  return (
    <div className="bookings-page">
      {/* Header */}
      <header className="bookings-header">
        <h1 className="bookings-title">Trips</h1>
        <div className="header-icons">
          <button className="icon-button">
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </button>
          <button className="icon-button">
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bookings-tabs">
        <button
          className={`bookings-tab ${activeTab === 'active' ? 'bookings-tab-active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button
          className={`bookings-tab ${activeTab === 'past' ? 'bookings-tab-active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
        <button
          className={`bookings-tab ${activeTab === 'canceled' ? 'bookings-tab-active' : ''}`}
          onClick={() => setActiveTab('canceled')}
        >
          Canceled
        </button>
      </div>

      {/* Empty State */}
      <div className="bookings-empty">
        {/* Illustration Container */}
        <div className="illustration-container">
          {activeTab === 'active' && (
            <svg className="booking-illustration active-flight" viewBox="0 0 300 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Clouds background */}
              <g className="clouds-layer">
                <ellipse cx="80" cy="100" rx="40" ry="18" fill="#E3F2FD" opacity="0.6" />
                <ellipse cx="60" cy="110" rx="35" ry="16" fill="#E3F2FD" opacity="0.5" />
                <ellipse cx="100" cy="105" rx="30" ry="14" fill="#E3F2FD" opacity="0.5" />
              </g>
              
              <g className="clouds-layer-2">
                <ellipse cx="220" cy="140" rx="45" ry="20" fill="#BBDEFB" opacity="0.5" />
                <ellipse cx="200" cy="148" rx="38" ry="17" fill="#BBDEFB" opacity="0.4" />
                <ellipse cx="245" cy="145" rx="32" ry="15" fill="#BBDEFB" opacity="0.4" />
              </g>
              
              <g className="clouds-layer-3">
                <ellipse cx="150" cy="200" rx="42" ry="19" fill="#E3F2FD" opacity="0.5" />
                <ellipse cx="130" cy="207" rx="36" ry="16" fill="#E3F2FD" opacity="0.4" />
                <ellipse cx="172" cy="204" rx="30" ry="14" fill="#E3F2FD" opacity="0.4" />
              </g>
              
              {/* Main airplane */}
              <g className="main-airplane">
                <g transform="translate(150, 130)">
                  {/* Airplane shadow */}
                  <ellipse cx="2" cy="25" rx="25" ry="5" fill="black" opacity="0.1" />
                  
                  {/* Airplane body */}
                  <path d="M-20 0 L20 0 L28 3 L20 6 L-20 6 Z" fill="#2196F3" />
                  <path d="M-20 0 L20 0 L28 3 L20 6 L-20 6 Z" fill="url(#planeGradient)" />
                  
                  {/* Wings */}
                  <path d="M-5 0 L-5 -18 L8 -15 L10 0 Z" fill="#1976D2" />
                  <path d="M-5 6 L-5 24 L8 21 L10 6 Z" fill="#1976D2" />
                  
                  {/* Tail */}
                  <path d="M-20 0 L-28 -8 L-22 -3 Z" fill="#1565C0" />
                  <path d="M-20 6 L-28 14 L-22 9 Z" fill="#1565C0" />
                  
                  {/* Windows */}
                  <circle cx="5" cy="3" r="2" fill="#E3F2FD" opacity="0.8" />
                  <circle cx="10" cy="3" r="2" fill="#E3F2FD" opacity="0.8" />
                  <circle cx="15" cy="3" r="2" fill="#E3F2FD" opacity="0.8" />
                  
                  {/* Engine highlight */}
                  <ellipse cx="25" cy="3" rx="3" ry="2" fill="#42A5F5" opacity="0.7" />
                </g>
              </g>
              
              {/* Flying path - dotted line */}
              <path d="M50 160 Q100 120, 150 130 T250 100" 
                stroke="#90CAF9" strokeWidth="2" strokeDasharray="8,6" fill="none" opacity="0.6" className="flight-path" />
              
              {/* Departure point */}
              <g className="location-start">
                <circle cx="50" cy="160" r="8" fill="#4CAF50" opacity="0.3" />
                <circle cx="50" cy="160" r="5" fill="#66BB6A" />
                <circle cx="50" cy="160" r="2" fill="white" />
                <text x="50" y="182" fontSize="12" fill="#999" textAnchor="middle">Start</text>
              </g>
              
              {/* Destination point */}
              <g className="location-end">
                <circle cx="250" cy="100" r="8" fill="#FF9800" opacity="0.3" />
                <circle cx="250" cy="100" r="5" fill="#FFA726" />
                <circle cx="250" cy="100" r="2" fill="white" />
                <text x="250" y="88" fontSize="12" fill="#999" textAnchor="middle">End</text>
              </g>
              
              {/* Small decorative airplanes */}
              <g className="small-plane-1" opacity="0.4">
                <path d="M40 60 L50 60 L52 61 L50 62 L40 62 Z" fill="#64B5F6" />
                <path d="M43 60 L43 56 L47 57 L47 60 Z" fill="#42A5F5" />
              </g>
              
              <g className="small-plane-2" opacity="0.4">
                <path d="M260 180 L270 180 L272 181 L270 182 L260 182 Z" fill="#64B5F6" />
                <path d="M263 180 L263 176 L267 177 L267 180 Z" fill="#42A5F5" />
              </g>
              
              {/* Travel icons */}
              <g className="travel-icon-1">
                <circle cx="100" cy="240" r="8" fill="#FFA726" opacity="0.8" />
                <path d="M97 237 L100 234 L103 237 L103 243 L97 243 Z" fill="white" stroke="#FF9800" strokeWidth="0.5" />
              </g>
              
              <g className="travel-icon-2">
                <circle cx="200" cy="240" r="8" fill="#66BB6A" opacity="0.8" />
                <path d="M197 237 L200 234 L203 237 L203 243 L197 243 Z" fill="white" stroke="#4CAF50" strokeWidth="0.5" />
              </g>
              
              <defs>
                <linearGradient id="planeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1976D2" />
                  <stop offset="100%" stopColor="#42A5F5" />
                </linearGradient>
              </defs>
            </svg>
          )}
          
          {activeTab === 'past' && (
            <svg className="booking-illustration past-travel" viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Globe shadow */}
              <ellipse cx="150" cy="240" rx="50" ry="8" fill="black" opacity="0.15" />
              
              {/* Globe stand base */}
              <ellipse cx="150" cy="222" rx="25" ry="6" fill="#4A90E2" />
              <rect x="142" y="200" width="16" height="22" fill="#5B9BD5" rx="2" />
              
              {/* Globe sphere */}
              <circle cx="150" cy="110" r="75" fill="url(#globeGradient)" />
              
              {/* Globe shine effect */}
              <ellipse cx="130" cy="85" rx="30" ry="35" fill="white" opacity="0.15" />
              
              {/* Texture dots on ocean */}
              <g opacity="0.3">
                <circle cx="110" cy="90" r="1" fill="#1E5A8F" />
                <circle cx="125" cy="105" r="1" fill="#1E5A8F" />
                <circle cx="145" cy="85" r="1" fill="#1E5A8F" />
                <circle cx="160" cy="120" r="1" fill="#1E5A8F" />
                <circle cx="175" cy="95" r="1" fill="#1E5A8F" />
                <circle cx="135" cy="130" r="1" fill="#1E5A8F" />
                <circle cx="155" cy="145" r="1" fill="#1E5A8F" />
                <circle cx="120" cy="115" r="1" fill="#1E5A8F" />
                <circle cx="140" cy="155" r="1" fill="#1E5A8F" />
                <circle cx="185" cy="115" r="1" fill="#1E5A8F" />
              </g>
              
              {/* Continents - More detailed */}
              {/* North America */}
              <path d="M95 75 Q98 68, 105 70 L115 75 Q120 78, 125 82 L130 88 Q132 93, 128 98 L122 102 Q118 100, 115 96 L108 90 Q102 85, 98 82 Z" 
                fill="#FFD97D" stroke="#F4B235" strokeWidth="0.5" />
              
              {/* South America */}
              <path d="M120 115 Q123 110, 128 112 L133 118 Q136 125, 135 132 L132 140 Q128 145, 123 143 L118 138 Q115 130, 117 122 Z" 
                fill="#FFD97D" stroke="#F4B235" strokeWidth="0.5" />
              
              {/* Europe */}
              <path d="M155 65 Q160 62, 165 65 L170 70 Q173 74, 170 78 L165 80 Q160 78, 158 73 Z" 
                fill="#FFD97D" stroke="#F4B235" strokeWidth="0.5" />
              
              {/* Africa */}
              <path d="M158 85 Q163 82, 168 85 L175 92 Q180 100, 182 110 L183 122 Q182 132, 177 140 L170 145 Q165 143, 162 137 L158 125 Q155 112, 155 100 Z" 
                fill="#FFD97D" stroke="#F4B235" strokeWidth="0.5" />
              
              {/* Asia - larger */}
              <path d="M178 60 Q185 55, 195 58 L205 65 Q215 72, 220 82 L223 95 Q225 108, 220 120 L212 130 Q205 133, 198 128 L188 118 Q182 108, 180 95 L178 80 Q176 70, 178 63 Z" 
                fill="#FFD97D" stroke="#F4B235" strokeWidth="0.5" />
              
              {/* Australia */}
              <path d="M208 148 Q213 145, 218 148 L223 153 Q226 158, 223 163 L218 165 Q213 163, 210 158 Z" 
                fill="#FFD97D" stroke="#F4B235" strokeWidth="0.5" />
              
              {/* Globe ring/meridian */}
              <ellipse cx="150" cy="110" rx="78" ry="25" fill="none" stroke="#5B9BD5" strokeWidth="3" opacity="0.7" />
              
              {/* Airplane flying */}
              <g className="airplane-flying">
                <g transform="translate(200, 65) rotate(-15)">
                  {/* Airplane body */}
                  <path d="M0 0 L12 0 L14 2 L12 4 L0 4 Z" fill="#FF6B35" />
                  {/* Wings */}
                  <path d="M4 0 L4 -5 L8 -4 L8 0 Z" fill="#FF6B35" />
                  <path d="M4 4 L4 9 L8 8 L8 4 Z" fill="#FF6B35" />
                  {/* Tail */}
                  <path d="M0 0 L-2 -3 L0 -2 Z" fill="#FF8C61" />
                  <path d="M0 4 L-2 7 L0 6 Z" fill="#FF8C61" />
                  {/* Window */}
                  <circle cx="8" cy="2" r="1" fill="#FFF3E0" />
                </g>
                {/* Contrails */}
                <line x1="185" y1="68" x2="165" y2="72" stroke="#90CAF9" strokeWidth="1.5" opacity="0.5" strokeDasharray="3,3" className="contrail-1" />
                <line x1="187" y1="65" x2="170" y2="68" stroke="#90CAF9" strokeWidth="1.5" opacity="0.5" strokeDasharray="3,3" className="contrail-2" />
              </g>
              
              {/* Decorative elements */}
              <g className="deco-active-1">
                <circle cx="40" cy="100" r="5" fill="#FF9800" />
                <path d="M32 92 Q40 82, 48 92" stroke="#FFB74D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </g>
              
              <g className="deco-active-2">
                <circle cx="260" cy="80" r="4" fill="#FFA726" />
                <circle cx="268" cy="75" r="3" fill="#FFD54F" opacity="0.6" />
                <line x1="264" y1="72" x2="268" y2="65" stroke="#FFB74D" strokeWidth="2" strokeLinecap="round" />
              </g>
              
              <g className="deco-active-3">
                <path d="M240 160 Q245 152, 253 155 L260 160" stroke="#FF9800" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <circle cx="248" cy="156" r="3" fill="#FFB300" />
              </g>
              
              <defs>
                <radialGradient id="globeGradient" cx="40%" cy="35%">
                  <stop offset="0%" stopColor="#64B5F6" />
                  <stop offset="50%" stopColor="#42A5F5" />
                  <stop offset="100%" stopColor="#1976D2" />
                </radialGradient>
              </defs>
            </svg>
          )}
          
          {activeTab === 'past' && (
            <svg className="map-illustration tilted" viewBox="0 0 340 260" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Shadow under map */}
              <ellipse cx="175" cy="195" rx="80" ry="12" fill="black" opacity="0.1" transform="rotate(-8 175 195)" />
              
              {/* Tilted Map Frame */}
              <g transform="rotate(-8 170 130)">
                {/* Cream/Beige border (photo style) */}
                <rect x="50" y="40" width="240" height="180" rx="3" fill="#FFF9E6" />
                
                {/* Inner white frame */}
                <rect x="58" y="48" width="224" height="164" rx="2" fill="white" />
                
                {/* Map content with gradient ocean */}
                <rect x="65" y="55" width="210" height="150" rx="1" fill="url(#pastMapGradient)" />
                
                {/* Texture dots on ocean */}
                <g opacity="0.2">
                  <circle cx="100" cy="80" r="1" fill="#0D47A1" />
                  <circle cx="130" cy="95" r="1" fill="#0D47A1" />
                  <circle cx="160" cy="75" r="1" fill="#0D47A1" />
                  <circle cx="190" cy="110" r="1" fill="#0D47A1" />
                  <circle cx="220" cy="90" r="1" fill="#0D47A1" />
                  <circle cx="145" cy="125" r="1" fill="#0D47A1" />
                  <circle cx="175" cy="140" r="1" fill="#0D47A1" />
                  <circle cx="115" cy="105" r="1" fill="#0D47A1" />
                  <circle cx="205" cy="125" r="1" fill="#0D47A1" />
                  <circle cx="235" cy="100" r="1" fill="#0D47A1" />
                </g>
                
                {/* Detailed continents */}
                {/* North America */}
                <path d="M105 80 Q110 73, 118 76 L128 82 Q134 86, 138 92 L142 100 Q143 107, 138 112 L130 115 Q125 112, 120 107 L112 98 Q106 90, 105 83 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" />
                
                {/* South America */}
                <path d="M135 125 Q139 119, 145 121 L151 128 Q154 137, 153 146 L149 156 Q144 161, 138 158 L132 151 Q129 141, 131 132 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" />
                
                {/* Europe */}
                <path d="M175 68 Q181 65, 187 68 L193 74 Q197 79, 194 84 L188 87 Q182 85, 178 80 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" />
                
                {/* Africa */}
                <path d="M182 92 Q188 88, 195 92 L203 100 Q209 110, 211 122 L212 136 Q210 148, 204 157 L195 163 Q189 160, 185 152 L180 138 Q177 122, 178 108 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" />
                
                {/* Asia */}
                <path d="M205 63 Q214 58, 225 62 L237 70 Q248 79, 253 91 L257 106 Q259 121, 252 135 L242 145 Q233 147, 224 140 L212 128 Q206 115, 204 99 L203 82 Q202 71, 205 65 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" />
                
                {/* Australia */}
                <path d="M240 165 Q246 162, 252 166 L258 172 Q261 178, 257 184 L250 187 Q244 184, 241 178 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" />
                
                {/* Location pins with circles */}
                <g>
                  <circle cx="125" cy="95" r="5" fill="#FF6B6B" opacity="0.3" />
                  <circle cx="125" cy="95" r="3" fill="#FF5252" />
                  <circle cx="125" cy="95" r="1.5" fill="white" />
                </g>
                
                <g>
                  <circle cx="195" cy="105" r="5" fill="#FFA726" opacity="0.3" />
                  <circle cx="195" cy="105" r="3" fill="#FF9800" />
                  <circle cx="195" cy="105" r="1.5" fill="white" />
                </g>
                
                <g>
                  <circle cx="150" cy="140" r="5" fill="#FFB300" opacity="0.3" />
                  <circle cx="150" cy="140" r="3" fill="#FFA000" />
                  <circle cx="150" cy="140" r="1.5" fill="white" />
                </g>
              </g>
              
              {/* Decorative pins around map */}
              <g className="pin-past-1">
                <circle cx="295" cy="55" r="6" fill="#FFB84D" />
                <circle cx="295" cy="55" r="3" fill="#FF9800" />
                <line x1="295" y1="49" x2="295" y2="38" stroke="#FFB74D" strokeWidth="2.5" strokeLinecap="round" />
              </g>
              
              <g className="pin-past-2">
                <circle cx="35" cy="195" r="5" fill="#FFA726" />
                <path d="M28 185 Q35 175, 42 185" stroke="#FFB74D" strokeWidth="3" fill="none" strokeLinecap="round" />
              </g>
              
              <g className="pin-past-3">
                <path d="M305 215 Q312 205, 320 210 L328 218" stroke="#FF9800" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <circle cx="315" cy="212" r="4" fill="#FFB300" />
                <circle cx="323" cy="205" r="3" fill="#FFD54F" opacity="0.7" />
              </g>
              
              <defs>
                <linearGradient id="pastMapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#42A5F5" />
                  <stop offset="50%" stopColor="#2196F3" />
                  <stop offset="100%" stopColor="#1976D2" />
                </linearGradient>
              </defs>
            </svg>
          )}
          
          {activeTab === 'canceled' && (
            <svg className="map-illustration tilted-alt" viewBox="0 0 360 270" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Shadow */}
              <ellipse cx="185" cy="200" rx="85" ry="13" fill="black" opacity="0.12" transform="rotate(5 185 200)" />
              
              {/* Folded Map (slightly different angle) */}
              <g transform="rotate(6 180 130)">
                {/* Paper border */}
                <rect x="45" y="35" width="260" height="190" rx="3" fill="#FFFEF7" />
                
                {/* Fold line effect */}
                <line x1="175" y1="35" x2="175" y2="225" stroke="#E0E0E0" strokeWidth="1.5" opacity="0.5" />
                
                {/* Map ocean background */}
                <rect x="55" y="45" width="240" height="170" rx="2" fill="url(#canceledMapGradient)" />
                
                {/* Texture pattern */}
                <g opacity="0.15">
                  <circle cx="90" cy="75" r="1" fill="#01579B" />
                  <circle cx="120" cy="90" r="1" fill="#01579B" />
                  <circle cx="150" cy="70" r="1" fill="#01579B" />
                  <circle cx="180" cy="105" r="1" fill="#01579B" />
                  <circle cx="210" cy="85" r="1" fill="#01579B" />
                  <circle cx="240" cy="115" r="1" fill="#01579B" />
                  <circle cx="135" cy="125" r="1" fill="#01579B" />
                  <circle cx="165" cy="145" r="1" fill="#01579B" />
                  <circle cx="195" cy="160" r="1" fill="#01579B" />
                  <circle cx="225" cy="135" r="1" fill="#01579B" />
                </g>
                
                {/* Continents with more detail */}
                {/* North America */}
                <path d="M100 75 Q105 68, 113 71 L124 77 Q131 82, 136 89 L140 98 Q141 106, 136 112 L128 116 Q122 113, 116 107 L108 97 Q102 87, 100 78 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" opacity="0.95" />
                
                {/* South America */}
                <path d="M130 125 Q135 118, 142 121 L149 129 Q152 139, 151 149 L147 160 Q141 166, 134 162 L127 154 Q124 143, 126 133 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" opacity="0.95" />
                
                {/* Europe */}
                <path d="M188 65 Q194 62, 200 65 L207 71 Q211 77, 208 82 L201 85 Q195 82, 191 77 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" opacity="0.95" />
                
                {/* Africa */}
                <path d="M195 90 Q202 86, 210 90 L219 99 Q226 110, 228 124 L229 140 Q227 153, 220 163 L210 170 Q203 166, 198 157 L192 141 Q189 124, 190 106 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" opacity="0.95" />
                
                {/* Asia */}
                <path d="M220 60 Q230 54, 242 59 L256 68 Q268 78, 273 92 L277 109 Q279 126, 271 141 L259 152 Q248 154, 238 146 L224 132 Q217 117, 215 99 L214 79 Q215 67, 220 61 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" opacity="0.95" />
                
                {/* Australia */}
                <path d="M255 175 Q262 172, 269 176 L276 183 Q279 190, 274 196 L266 199 Q259 195, 256 188 Z" 
                  fill="#B3E5FC" stroke="#81D4FA" strokeWidth="0.5" opacity="0.95" />
                
                {/* Flight route with dashed line */}
                <path d="M120 95 Q145 80, 175 90 Q205 100, 225 110" 
                  stroke="#FFB300" strokeWidth="2" strokeDasharray="5,3" fill="none" opacity="0.8" />
                
                {/* Starting point */}
                <g>
                  <circle cx="120" cy="95" r="6" fill="#4CAF50" opacity="0.3" />
                  <circle cx="120" cy="95" r="4" fill="#66BB6A" />
                  <circle cx="120" cy="95" r="2" fill="white" />
                </g>
                
                {/* End point with big red X (canceled) */}
                <g>
                  <circle cx="225" cy="110" r="12" fill="#FF5252" opacity="0.2" />
                  <circle cx="225" cy="110" r="8" fill="#FF5252" opacity="0.4" />
                  {/* Big X mark */}
                  <line x1="219" y1="104" x2="231" y2="116" stroke="#FF1744" strokeWidth="3" strokeLinecap="round" />
                  <line x1="231" y1="104" x2="219" y2="116" stroke="#FF1744" strokeWidth="3" strokeLinecap="round" />
                  {/* White outline for X */}
                  <line x1="219" y1="104" x2="231" y2="116" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                  <line x1="231" y1="104" x2="219" y2="116" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
                </g>
              </g>
              
              {/* Decorative pins */}
              <g className="deco-cancel-1">
                <circle cx="35" cy="60" r="6" fill="#FFB84D" />
                <path d="M26 48 Q35 38, 44 48" stroke="#FF9800" strokeWidth="3" fill="none" strokeLinecap="round" />
                <circle cx="35" cy="52" r="3" fill="#FFA726" />
              </g>
              
              <g className="deco-cancel-2">
                <path d="M315 195 Q322 185, 332 190 L340 198" stroke="#FF9800" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <circle cx="325" cy="192" r="5" fill="#FFB300" />
                <circle cx="335" cy="185" r="3.5" fill="#FFD54F" opacity="0.7" />
              </g>
              
              <g className="deco-cancel-3">
                <circle cx="320" cy="50" r="4" fill="#FFA726" />
                <line x1="320" y1="44" x2="320" y2="34" stroke="#FFB74D" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="326" cy="45" r="2.5" fill="#FFD54F" opacity="0.6" />
              </g>
              
              <defs>
                <linearGradient id="canceledMapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4FC3F7" />
                  <stop offset="50%" stopColor="#29B6F6" />
                  <stop offset="100%" stopColor="#0288D1" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>

        {/* Text Content */}
        <h2 className="bookings-empty-title">
          {activeTab === 'active' && 'No bookings yet'}
          {activeTab === 'past' && 'No past bookings'}
          {activeTab === 'canceled' && 'No canceled bookings'}
        </h2>
        <p className="bookings-empty-subtitle">Sign in or create an account to get started.</p>
        
        {/* Sign In Button */}
        <button className="bookings-signin-button">Sign in</button>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="bottom-nav-item" onClick={() => navigate('/')}>
          <SearchNavIcon />
          <span className="bottom-nav-label">Search</span>
        </div>
        <div className="bottom-nav-item active">
          <BookingsNavIcon />
          <span className="bottom-nav-label">Bookings</span>
        </div>
        <div className="bottom-nav-item">
          <SignInNavIcon />
          <span className="bottom-nav-label">Sign in</span>
        </div>
      </nav>
    </div>
  );
};

export default BookingsPage;

