const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Получаем API ключи из переменных окружения
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'a9723ad695msh1d68e0d7c6701c8p1d23e5jsn73f6c7159911';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'booking-com15.p.rapidapi.com';

const relayUpstreamResponse = async (upstreamResponse, res) => {
  const status = upstreamResponse.status;
  const contentType = upstreamResponse.headers.get('content-type') || '';
  const bodyText = await upstreamResponse.text();

  if (contentType.includes('application/json')) {
    try {
      const body = bodyText ? JSON.parse(bodyText) : {};
      return res.status(status).json(body);
    } catch (err) {
      console.warn('Failed to parse upstream JSON response:', err);
    }
  }

  return res.status(status).send(bodyText);
};

const handleProxyFailure = (res, label, error) => {
  console.error(`${label} proxy failed:`, error);
  return res.status(502).json({
    error: `${label} failed`,
    detail: error?.message || 'Upstream request error'
  });
};

// Middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// API Configuration - Keys are now loaded from environment variables above

// Attractions API endpoints
app.get('/api/attractions/searchLocation', async (req, res) => {
  try {
    const { query, languagecode } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const params = new URLSearchParams({
      query: encodeURIComponent(query),
      languagecode: languagecode || 'en-us'
    });

    const targetUrl = `https://${RAPIDAPI_HOST}/api/v1/attraction/searchLocation?${params.toString()}`;
    console.log(`Proxying attractions location search to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Attractions location search error:', error);
    res.status(500).json({ error: 'Attractions location search failed' });
  }
});

app.get('/api/attractions/searchAttractions', async (req, res) => {
  try {
    const { 
      id, 
      sortBy, 
      page, 
      currency_code, 
      languagecode,
      startDate,
      endDate
    } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'ID parameter is required' });
    }

    const params = new URLSearchParams({
      id: id, // ID уже закодирован, не кодируем повторно
      sortBy: sortBy || 'trending',
      page: page || '1',
      currency_code: currency_code || 'USD',
      languagecode: languagecode || 'en-us'
    });

    // Добавляем даты если они переданы
    if (startDate) {
      params.append('startDate', startDate);
    }
    if (endDate) {
      params.append('endDate', endDate);
    }

    const targetUrl = `https://${RAPIDAPI_HOST}/api/v1/attraction/searchAttractions?${params.toString()}`;
    console.log(`Proxying attractions search to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Attractions search error:', error);
    res.status(500).json({ error: 'Attractions search failed' });
  }
});

// Get attraction details
app.get('/api/attractions/getAttractionDetails', async (req, res) => {
  try {
    const { id, slug, currency_code = 'USD', languagecode = 'en-us' } = req.query;
    
    if (!id && !slug) {
      return res.status(400).json({ error: 'ID or slug parameter is required' });
    }

    let targetUrl;
    if (slug) {
      // Ensure parameters are properly encoded using URLSearchParams
      const params = new URLSearchParams({
        slug,
        currency_code,
        languagecode
      });
      targetUrl = `https://${RAPIDAPI_HOST}/api/v1/attraction/getAttractionDetails?${params.toString()}`;
    } else {
      const params = new URLSearchParams({
        id,
        currency_code,
        languagecode
      });
      targetUrl = `https://${RAPIDAPI_HOST}/api/v1/attraction/getAttractionDetails?${params.toString()}`;
    }
    
    console.log(`Proxying attraction details to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Upstream API error (${response.status}):`, errorText);
      throw new Error(`Upstream API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Attraction details error:', error);
    res.status(500).json({ 
      error: 'Failed to get attraction details',
      message: error.message
    });
  }
});

// Car rental API endpoints (keeping for backward compatibility)
app.get('/api/cars/searchDestination', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const targetUrl = `https://${RAPIDAPI_HOST}/api/v1/cars/searchDestination?query=${encodeURIComponent(query)}`;
    console.log(`Proxying car rental destination search to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Car rental destination search error:', error);
    res.status(500).json({ error: 'Car rental destination search failed' });
  }
});

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

    return relayUpstreamResponse(response, res);
  } catch (error) {
    return handleProxyFailure(res, 'Hotel destination search', error);
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

    return relayUpstreamResponse(response, res);
  } catch (error) {
    return handleProxyFailure(res, 'Hotel search', error);
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

    return relayUpstreamResponse(response, res);
  } catch (error) {
    return handleProxyFailure(res, 'Hotel details', error);
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

    return relayUpstreamResponse(response, res);
  } catch (error) {
    return handleProxyFailure(res, 'Flight details', error);
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

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - fallback to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
