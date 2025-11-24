import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './DetailsHub.css';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
);

const ArrowIcon = () => (
  <svg width="20" height="20" fill="#999" viewBox="0 0 24 24"><path d="M10 17l5-5-5-5v10z"/></svg>
);

type TravCard = { label: string; sub: string; needsDetails: boolean; missingReason?: 'age' | 'details' };

const DetailsHub: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [price, setPrice] = React.useState<{currency:string; totalPerTraveller:number; travellers:number} | null>(null);
  const [travSummaries, setTravSummaries] = React.useState<TravCard[]>([]);
  const [contact, setContact] = React.useState<{ email?: string; phone?: string } | null>(null);
  const [canProceed, setCanProceed] = React.useState<boolean>(false);

  const isValidDate = React.useCallback((d: string, m: string, y: string) => {
    const ddn = Number(d), mmn = Number(m), yyn = Number(y);
    if (!ddn || !mmn || !yyn) return false;
    if (mmn < 1 || mmn > 12) return false;
    const dt = new Date(yyn, mmn - 1, ddn);
    return dt.getFullYear() === yyn && dt.getMonth() === mmn - 1 && dt.getDate() === ddn;
  }, []);

  const buildSummaries = React.useCallback(() => {
    try {
      const offerId = sessionStorage.getItem('current_offer_id') || '';
      const flowRaw = sessionStorage.getItem('flow_pax') || localStorage.getItem('flow_pax') || '';
      const flow = flowRaw ? JSON.parse(flowRaw) : { adults: 1, childrenAges: [], segments: 0 };
      const adults = Number(flow?.adults || 1);
      const kids: string[] = Array.isArray(flow?.childrenAges) ? flow.childrenAges : [];
      const total = adults + kids.length;
      const out: TravCard[] = [];
      let allTravOk = true;
      for (let i = 0; i < total; i++) {
        const isAdult = i < adults;
        const idx = i;
        // load persisted per traveler
        let firstName = '', lastName = '', gender = '', dd = '', mm = '', yyyy = '';
        try {
          const key = offerId ? `traveler_details_${offerId}_${idx}` : `traveler_details_${idx}`;
          const raw = localStorage.getItem(key) || sessionStorage.getItem(key) || '';
          if (raw) {
            const t = JSON.parse(raw);
            firstName = t.firstName || '';
            lastName = t.lastName || '';
            gender = t.gender || '';
            dd = t.dd || '';
            mm = t.mm || '';
            yyyy = t.yyyy || '';
          }
        } catch {}
        const label = `Traveler ${i + 1}`;
        const childAgeStr = !isAdult ? String(kids[i - adults] ?? '') : '';
        const childAgeNum = !isAdult ? Number(childAgeStr) : NaN;
        const ageValid = isAdult ? true : Number.isFinite(childAgeNum) && childAgeNum >= 0 && childAgeNum <= 17;
        const infoLine = isAdult
          ? ('Adult' + ((gender === 'Male' || gender === 'Female') ? ` · ${gender}` : ''))
          : (`Child${ageValid ? `, ${childAgeNum} y.o.` : ''}`);
        const namesOk = Boolean((firstName || '').trim()) && Boolean((lastName || '').trim());
        const genderOk = gender === 'Male' || gender === 'Female' || !isAdult;
        const dobOk = isValidDate(dd, mm, yyyy);
        const hasAll = namesOk && (genderOk || isAdult) && dobOk && ageValid;
        if (!hasAll) allTravOk = false;
        out.push({ label, sub: infoLine, needsDetails: !hasAll, missingReason: ageValid ? (namesOk && dobOk ? undefined : 'details') : 'age' });
      }
      setTravSummaries(out);

      // contact hydrate and validation
      let contactObj: { email?: string; phone?: string } | null = null;
      try {
        const key = (sessionStorage.getItem('current_offer_id') || '') ? `contact_${sessionStorage.getItem('current_offer_id')}` : 'contact';
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key) || '';
        contactObj = raw ? JSON.parse(raw) : null;
      } catch { contactObj = null; }
      setContact(contactObj);
      const email = String(contactObj?.email || '');
      const phone = String(contactObj?.phone || '');
      const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      const digits = phone.replace(/\D/g,'');
      const phoneOk = phone.startsWith('+') && digits.length >= 6 && digits.length <= 15;

      setCanProceed(allTravOk && emailOk && phoneOk && total > 0);
    } catch {
      setTravSummaries([{ label: 'Traveler 1', sub: 'Adult', needsDetails: true }]);
      setCanProceed(false);
    }
  }, [isValidDate]);

  React.useEffect(() => {
    try {
      const p = sessionStorage.getItem('flow_price');
      if (p) setPrice(JSON.parse(p));
    } catch {}
    buildSummaries();
  }, [buildSummaries]);

  const renderTravelerIcon = (_ok: boolean) => null;
  const renderContactIcon = (_ok: boolean) => null;

  // Contact validity for icon
  const email = String(contact?.email || '');
  const phone = String(contact?.phone || '');
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const digits = phone.replace(/\D/g,'');
  const phoneOk = phone.startsWith('+') && digits.length >= 6 && digits.length <= 15;
  const contactOk = Boolean(emailOk && phoneOk);

  return (
    <div className="hub-page">
      <div className="hub-header">
        <button className="back-button" onClick={()=>navigate(-1)}><BackIcon/></button>
        <h1>Traveler details</h1>
        <div style={{ width:24 }}></div>
      </div>

      {/* stepper removed per request */}

      <div className="hub-list">
        {travSummaries.map((t, idx) => {
          const ok = !t.needsDetails;
          return (
            <div key={idx} className="hub-card" onClick={()=>navigate(`/traveler-details?idx=${idx}`)}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                {renderTravelerIcon(ok)}
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="hub-title">{t.label}</div>
                  <div className="hub-sub">{t.sub}</div>
                  {t.needsDetails && (
                    <div className="hub-link">{t.missingReason === 'age' ? "Add child's age" : 'Add details for this traveler'}</div>
                  )}
                </div>
              </div>
              <ArrowIcon/>
            </div>
          );
        })}

        <div className="hub-card" onClick={()=>navigate('/contact-details')}>
          <div>
            <div>
              <div className="hub-title">Contact details</div>
              {contact?.email || contact?.phone ? (
                <div className="hub-sub">{contact?.email || ''}{contact?.email && contact?.phone ? ' · ' : ''}{contact?.phone || ''}</div>
              ) : (
                <div className="hub-link">Add contact details</div>
              )}
            </div>
          </div>
          <ArrowIcon/>
        </div>
      </div>

      <div className="hub-footer">
        <div className="price">{price ? `${price.currency} ${Math.round(price.totalPerTraveller*price.travellers).toLocaleString()}` : ''}</div>
        <button className="next-button" disabled={!canProceed} onClick={()=>{
          if (!price || !canProceed) return;
          navigate('/seat-selection', { state: { currency: price.currency, travellers: price.travellers, totalPerTraveller: price.totalPerTraveller, flightSummary: location?.state?.flightSummary || null, offerId: location?.state?.offerId || null } });
        }}>Next</button>
      </div>
    </div>
  );
};

export default DetailsHub;


