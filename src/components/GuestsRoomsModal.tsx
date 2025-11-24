import { useState, useEffect, useRef } from 'react';
import './GuestsRoomsModal.css';

interface GuestsRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRooms: number;
  initialAdults: number;
  initialChildren: number;
  initialCurrency?: string;
  onApply: (rooms: number, adults: number, children: number, childrenAges: number[], currency: string) => void;
}

const CURRENCIES = [
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
];

const GuestsRoomsModal: React.FC<GuestsRoomsModalProps> = ({
  isOpen,
  onClose,
  initialRooms,
  initialAdults,
  initialChildren,
  initialCurrency = 'USD',
  onApply,
}) => {
  const [rooms, setRooms] = useState(initialRooms);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [childrenAges, setChildrenAges] = useState<number[]>([]);
  const [currency, setCurrency] = useState(initialCurrency);
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [openCurrency, setOpenCurrency] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRooms(initialRooms);
      setAdults(initialAdults);
      setChildren(initialChildren);
      setCurrency(initialCurrency);
      setOpenCurrency(false);
      setCurrencyFilter('');
    }
  }, [isOpen, initialRooms, initialAdults, initialChildren, initialCurrency]);

  useEffect(() => {
    // Initialize ages array when children count changes
    if (children > childrenAges.length) {
      setChildrenAges([...childrenAges, ...Array(children - childrenAges.length).fill(0)]);
    } else if (children < childrenAges.length) {
      setChildrenAges(childrenAges.slice(0, children));
    }
  }, [children]);

  const handleApply = () => {
    onApply(rooms, adults, children, childrenAges, currency);
    onClose();
  };

  if (!isOpen) return null;

  const currencyOptions = CURRENCIES.filter(c => 
    c.toLowerCase().includes(currencyFilter.trim().toLowerCase())
  );

  return (
    <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="travellers-modal" style={{ zIndex: 4000, maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '20px' }}>
          {/* Rooms */}
          <div className="travellers-row">
            <div className="travellers-label">
              <div>Rooms</div>
              <div className="travellers-sublabel">Number of rooms</div>
            </div>
            <div className="counter">
              <button className="stepper" onClick={() => setRooms(Math.max(1, rooms - 1))}>−</button>
              <div className="counter-value">{rooms}</div>
              <button className="stepper" onClick={() => setRooms(rooms + 1)}>+</button>
            </div>
          </div>

          {/* Adults */}
          <div className="travellers-row">
            <div className="travellers-label">
              <div>Adults</div>
              <div className="travellers-sublabel">Ages 18+</div>
            </div>
            <div className="counter">
              <button className="stepper" onClick={() => setAdults(Math.max(1, adults - 1))}>−</button>
              <div className="counter-value">{adults}</div>
              <button className="stepper" onClick={() => setAdults(adults + 1)}>+</button>
            </div>
          </div>

          {/* Children */}
          <div className="travellers-row">
            <div className="travellers-label">
              <div>Children</div>
              <div className="travellers-sublabel">Ages 0–17</div>
            </div>
            <div className="counter">
              <button className="stepper" onClick={() => setChildren(Math.max(0, children - 1))}>−</button>
              <div className="counter-value">{children}</div>
              <button className="stepper" onClick={() => setChildren(children + 1)}>+</button>
            </div>
          </div>

          {/* Children Ages */}
          {children > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#1f1f1f', borderRadius: '8px' }}>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
                Ages of children at check-out
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                {Array.from({ length: children }).map((_, i) => (
                  <div key={i}>
                    <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                      Child {i + 1}
                    </label>
                    <select
                      value={childrenAges[i] || 0}
                      onChange={(e) => {
                        const newAges = [...childrenAges];
                        newAges[i] = parseInt(e.target.value);
                        setChildrenAges(newAges);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '14px'
                      }}
                    >
                      {Array.from({ length: 18 }).map((_, age) => (
                        <option key={age} value={age}>
                          {age} {age === 1 ? 'year' : 'years'}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Currency */}
          <div ref={currencyRef} style={{ marginTop: '20px' }}>
            <button
              onClick={() => setOpenCurrency(v => !v)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 14px',
                background: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: 8,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '16px'
              }}
            >
              <span>Currency: <strong>{currency}</strong></span>
              <span>{openCurrency ? '▲' : '▼'}</span>
            </button>
            {openCurrency && (
              <div style={{ marginTop: 10 }}>
                <input
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  placeholder="Search currency (e.g., USD, EUR)"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #555',
                    borderRadius: 8,
                    background: 'transparent',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: '200px', overflowY: 'auto' }}>
                  {currencyOptions.map(c => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      style={{
                        padding: '10px 12px',
                        border: `1px solid ${currency === c ? '#0071c2' : '#444'}`,
                        borderRadius: 8,
                        background: currency === c ? '#0a64a4' : '#2a2a2a',
                        color: '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: currency === c ? '600' : '400',
                        transition: 'all 0.2s'
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Apply Button */}
          <button
            onClick={handleApply}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '14px',
              background: '#0071c2',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestsRoomsModal;




