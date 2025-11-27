const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Configuration - Keep keys secure on server
const RAPIDAPI_KEY = 'a9723ad695msh1d68e0d7c6701c8p1d23e5jsn73f6c7159911';
const RAPIDAPI_HOST = 'booking-com15.p.rapidapi.com';

// Hotel API endpoints
app.get('/api/hotels/searchDestination', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/v1/hotels/searchDestination?query=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Hotel destination search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hotels/searchHotels', async (req, res) => {
  try {
    const {
      dest_id,
      search_type,
      arrival_date,
      departure_date,
      adults,
      room_qty,
      page_number,
      page_size,
      units,
      temperature_unit,
      languagecode,
      currency_code,
      location
    } = req.query;

    const params = new URLSearchParams({
      dest_id,
      search_type,
      arrival_date,
      departure_date,
      adults,
      room_qty,
      page_number,
      page_size,
      units,
      temperature_unit,
      languagecode,
      currency_code,
      location
    });

    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/v1/hotels/searchHotels?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Hotel search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/hotels/getHotelDetails', async (req, res) => {
  try {
    const {
      hotel_id,
      arrival_date,
      departure_date,
      adults,
      room_qty,
      units,
      temperature_unit,
      languagecode,
      currency_code
    } = req.query;

    const params = new URLSearchParams({
      hotel_id,
      arrival_date,
      departure_date,
      adults,
      room_qty,
      units,
      temperature_unit,
      languagecode,
      currency_code
    });

    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/v1/hotels/getHotelDetails?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Hotel details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Flight API endpoints
app.get('/api/flights/searchDestination', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/v1/flights/searchDestination?query=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Flight destination search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/flights/searchFlights', async (req, res) => {
  try {
    const {
      fromId,
      toId,
      departDate,
      returnDate,
      stops,
      pageNo,
      adults,
      children,
      sort,
      cabinClass,
      currency_code
    } = req.query;

    const params = new URLSearchParams({
      fromId,
      toId,
      departDate,
      stops,
      pageNo,
      adults,
      sort,
      cabinClass,
      currency_code
    });

    if (returnDate) params.append('returnDate', returnDate);
    if (children) params.append('children', children);

    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/v1/flights/searchFlights?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/flights/searchFlightsMultiStops', async (req, res) => {
  try {
    const {
      legs,
      pageNo,
      adults,
      children,
      sort,
      cabinClass,
      currency_code
    } = req.query;

    const params = new URLSearchParams({
      legs,
      pageNo,
      adults,
      sort,
      cabinClass,
      currency_code
    });

    if (children) params.append('children', children);

    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/v1/flights/searchFlightsMultiStops?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Multi-stop flight search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение детальной информации по конкретному авиабилету по токену
app.get('/api/flights/getFlightDetails', async (req, res) => {
  try {
    const { token, currency_code } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'token parameter is required' });
    }

    // Убеждаемся, что токен - это строка
    const tokenStr = String(token);
    
    const params = new URLSearchParams();
    params.append('token', tokenStr);

    if (currency_code) {
      params.append('currency_code', String(currency_code));
    }

    const apiUrl = `https://${RAPIDAPI_HOST}/api/v1/flights/getFlightDetails?${params.toString()}`;
    console.log('Server: Fetching flight details, token length:', tokenStr.length);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Flight details API error:', response.status, errorText.substring(0, 200));
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Проверяем Content-Type перед парсингом JSON
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Flight details: Non-JSON response:', text.substring(0, 200));
      throw new Error('Server returned non-JSON response');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Flight details error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/flights/getSeatMap', async (req, res) => {
  try {
    const { offerToken, currency_code } = req.query;

    const params = new URLSearchParams({
      offerToken,
      currency_code
    });

    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/v1/flights/getSeatMap?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Seat map error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Meta endpoints
app.get('/api/meta/languages', async (_req, res) => {
  try {
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/v1/meta/getLanguages`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Language list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
