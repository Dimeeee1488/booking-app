const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Получаем API ключи из переменных окружения
// ВНИМАНИЕ: Хардкод ключа используется только как fallback для разработки
// В продакшене ОБЯЗАТЕЛЬНО используйте переменные окружения!
let RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'booking-com15.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  console.warn('⚠️  WARNING: RAPIDAPI_KEY not set in environment variables!');
  console.warn('⚠️  Please set RAPIDAPI_KEY in your .env file or environment variables.');
  // Fallback только для локальной разработки
  const FALLBACK_KEY = 'a9723ad695msh1d68e0d7c6701c8p1d23e5jsn73f6c7159911';
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Using fallback key in development mode only.');
    RAPIDAPI_KEY = FALLBACK_KEY;
  } else {
    console.error('❌ ERROR: RAPIDAPI_KEY is required in production!');
    process.exit(1);
  }
}

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
// Включаем trust proxy для правильного получения IP клиента
app.set('trust proxy', true);

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

// GeoIP API endpoint — получаем IP клиента из заголовков или внешнего сервиса
app.get('/api/geo/ip', async (req, res) => {
  try {
    // Сначала пытаемся получить IP из заголовков (правильный способ для продакшена)
    let clientIP = null;
    
    if (req.headers['x-forwarded-for']) {
      const forwarded = req.headers['x-forwarded-for'];
      clientIP = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
    } else if (req.headers['x-real-ip']) {
      clientIP = req.headers['x-real-ip'];
    } else if (req.headers['cf-connecting-ip']) {
      clientIP = req.headers['cf-connecting-ip'];
    } else if (req.connection?.remoteAddress) {
      clientIP = req.connection.remoteAddress;
    } else if (req.socket?.remoteAddress) {
      clientIP = req.socket.remoteAddress;
    } else if (req.ip) {
      clientIP = req.ip;
    }

    // Убираем IPv6 префикс
    if (clientIP && typeof clientIP === 'string' && clientIP.startsWith('::ffff:')) {
      clientIP = clientIP.replace('::ffff:', '');
    }

    // Если получили localhost (127.0.0.1) - используем внешний сервис для получения IP сервера
    // На проде это будет реальный IP, в локальной разработке - IP твоего интернета
    if (!clientIP || clientIP === '127.0.0.1' || clientIP === '::1') {
      try {
        const response = await fetch('https://api.ipify.org?format=json', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data?.ip && typeof data.ip === 'string') {
            clientIP = data.ip.trim();
            console.log('GeoIP: Using external IP from ipify.org:', clientIP);
          }
        }
      } catch (error) {
        console.warn('GeoIP: ipify.org failed, using:', clientIP || 'Unknown', error.message);
      }
    }

    const finalIP = clientIP || 'Unknown';
    console.log('GeoIP response:', { 
      ip: finalIP,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      }
    });
    
    res.json({ ip: finalIP });
  } catch (error) {
    console.error('GeoIP error:', error);
    res.json({ ip: 'Unknown' });
  }
});

// Telegram API endpoint - отправка сообщений через сервер для безопасности
app.post('/api/telegram/send', express.json(), async (req, res) => {
  try {
    const { message, chatId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Получаем токен и chat_id из переменных окружения
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = chatId || process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn('Telegram: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables');
      return res.status(500).json({ error: 'Telegram bot not configured' });
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Telegram API error:', response.status, errorText);
      return res.status(500).json({ error: 'Failed to send Telegram message' });
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Telegram send error:', error);
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
