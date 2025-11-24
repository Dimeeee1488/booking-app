// Простой тест API Booking.com
const API_KEY = 'a9723ad695msh1d68e0d7c6701c8p1d23e5jsn73f6c7159911';
const API_HOST = 'booking-com15.p.rapidapi.com';

async function testAPI() {
  console.log('Testing API...');
  
  const url = 'https://booking-com15.p.rapidapi.com/api/v1/flights/searchFlights?fromId=MAD.AIRPORT&toId=CDG.AIRPORT&departDate=2024-10-25&adults=1&children=0&infants=0&cabinClass=ECONOMY&currency_code=EUR';
  
  console.log('Request URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY,
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testAPI();


