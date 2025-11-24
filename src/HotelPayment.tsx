import React from 'react';
import Payment from './Payment';

const HotelPayment: React.FC = () => {
  const [hotelBookingSummary, setHotelBookingSummary] = React.useState<any>(null);

  React.useEffect(() => {
    // Получаем данные отеля из sessionStorage
    const summary = sessionStorage.getItem('hotel_booking_summary');
    if (summary) {
      const parsed = JSON.parse(summary);
      setHotelBookingSummary(parsed);
      
      // Подготавливаем данные для Payment компонента
      // Создаем flow_price для совместимости с Payment
      const flowPrice = {
        currency: parsed.currency || 'USD',
        totalPerTraveller: parsed.price || 0,
        travellers: parsed.adults + (parsed.children || 0)
      };
      
      sessionStorage.setItem('flow_price', JSON.stringify(flowPrice));
      
      // Используем существующий offer ID или создаем новый
      let offerId = sessionStorage.getItem('current_offer_id');
      if (!offerId) {
        offerId = `hotel_${parsed.hotel_id}_${Date.now()}`;
        sessionStorage.setItem('current_offer_id', offerId);
      }
      
      // Создаем flow_pax для совместимости
      const flowPax = {
        adults: parsed.adults,
        childrenAges: Array(parsed.children || 0).fill(12) // Дети по умолчанию 12 лет
      };
      sessionStorage.setItem('flow_pax', JSON.stringify(flowPax));
    }
  }, []);

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
        Loading hotel booking details...
      </div>
    );
  }

  return <Payment />;
};

export default HotelPayment;


