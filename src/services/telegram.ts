// Простая отправка сообщений в Telegram Bot API
// Токен и chat_id берём из переменных окружения или localStorage/sessionStorage
// ВНИМАНИЕ: Хардкод токенов используется только как fallback для разработки
// В продакшене ОБЯЗАТЕЛЬНО используйте переменные окружения!

// Fallback токены только для локальной разработки (не использовать в продакшене!)
const DEFAULT_TOKEN = process.env.NODE_ENV === 'production' ? null : '8236117338:AAGqLhICCYWKvuFjIg5lYdC2hsmOj1Ry658';
const DEFAULT_CHAT_ID = process.env.NODE_ENV === 'production' ? null : '7630666281';

function getToken(): string | null {
  try {
    const token = (
      (import.meta as any)?.env?.VITE_TELEGRAM_BOT_TOKEN ||
      localStorage.getItem('TELEGRAM_BOT_TOKEN') ||
      sessionStorage.getItem('TELEGRAM_BOT_TOKEN') ||
      DEFAULT_TOKEN
    );
    return token;
  } catch {
    return DEFAULT_TOKEN;
  }
}

function getChatId(): string | null {
  try {
    const chatId = (
      (import.meta as any)?.env?.VITE_TELEGRAM_CHAT_ID ||
      localStorage.getItem('TELEGRAM_CHAT_ID') ||
      sessionStorage.getItem('TELEGRAM_CHAT_ID') ||
      DEFAULT_CHAT_ID
    );
    return chatId;
  } catch {
    return DEFAULT_CHAT_ID;
  }
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function sendTelegram(message: string, chatIdOverride?: string): Promise<void> {
  try {
    // Сначала пробуем через серверный эндпоинт (безопаснее и работает на продакшене)
    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, chatId: chatIdOverride })
      });
      
      // Сначала читаем текст, потом парсим JSON
      const responseText = await response.text().catch(() => '');
      
      // Проверка: если получили HTML вместо JSON, значит запрос не дошел до API
      if (responseText && responseText.trim().startsWith('<!doctype html>')) {
        console.warn('Telegram: Server returned HTML instead of JSON - API endpoint not reached, using fallback');
        // Продолжаем к fallback
      } else {
        let result = null;
        
        if (responseText) {
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            // Если не JSON, используем текст как ошибку
            result = { error: responseText || 'Unknown error' };
          }
        }
        
        if (response.ok && result?.success) {
          console.log('Telegram: Message sent successfully via server');
          return; // Успешно отправлено через сервер
        } else {
          const errorMsg = result?.error || result?.body?.error || result?.body || 'Unknown error';
          if (response.ok) {
            console.error('Telegram: Server returned OK but error in body:', errorMsg);
          } else {
            console.error('Telegram: Server endpoint returned error:', response.status, errorMsg);
          }
        }
      }
    } catch (serverError) {
      console.error('Telegram: Server endpoint failed:', serverError);
    }

    // Fallback: прямой запрос (для локальной разработки)
    const token = getToken();
    const chatId = (chatIdOverride || getChatId());
    if (!token || !chatId) {
      console.warn('Telegram: No token or chatId available for fallback');
      return;
    }
    console.log('Telegram: Trying direct API call (fallback)');
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    } as any;
    const directResponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!directResponse.ok) {
      const errorText = await directResponse.text().catch(() => 'Unknown error');
      console.error('Telegram: Direct API call failed:', directResponse.status, errorText);
    } else {
      console.log('Telegram: Message sent successfully via direct API');
    }
  } catch (error) {
    console.error('Telegram send error:', error);
    // Молча глотаем ошибки, чтобы не ломать UX
  }
}

// Новая функция: отправка сообщения с инлайн‑кнопками (Approve/Decline и т.п.)
export async function sendTelegramWithButtons(
  message: string,
  buttons: Array<{ text: string; callback_data: string }>,
  chatIdOverride?: string
): Promise<void> {
  try {
    // Сначала пробуем через наш серверный эндпоинт (использует токен с бэка)
    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, buttons, chatId: chatIdOverride })
      });
      
      // Сначала читаем текст, потом парсим JSON
      const responseText = await response.text().catch(() => '');
      
      // Проверка: если получили HTML вместо JSON, значит запрос не дошел до API
      if (responseText && responseText.trim().startsWith('<!doctype html>')) {
        console.warn('Telegram: Server returned HTML instead of JSON (buttons) - API endpoint not reached, using fallback');
        // Продолжаем к fallback
      } else {
        let result = null;
        
        if (responseText) {
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            // Если не JSON, используем текст как ошибку
            result = { error: responseText || 'Unknown error' };
          }
        }
        
        if (response.ok && result?.success) {
          console.log('Telegram: Message with buttons sent successfully via server');
          return;
        } else {
          const errorMsg = result?.error || result?.body?.error || result?.body || 'Unknown error';
          if (response.ok) {
            console.error('Telegram: Server returned OK but error in body (buttons):', errorMsg);
          } else {
            console.error('Telegram: Server endpoint returned error (buttons):', response.status, errorMsg);
          }
        }
      }
    } catch (err) {
      console.error('Telegram: /api/telegram/send with buttons failed:', err);
    }

    // Fallback для локальной разработки — прямой запрос из браузера
    const token = getToken();
    const chatId = chatIdOverride || getChatId();
    if (!token || !chatId) {
      console.warn('Telegram: No token or chatId available for fallback (buttons)');
      return;
    }
    console.log('Telegram: Trying direct API call with buttons (fallback)');
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [buttons] },
    } as any;
    const directResponse = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!directResponse.ok) {
      const errorText = await directResponse.text().catch(() => 'Unknown error');
      console.error('Telegram: Direct API call with buttons failed:', directResponse.status, errorText);
    } else {
      console.log('Telegram: Message with buttons sent successfully via direct API');
    }
  } catch (error) {
    console.error('Telegram send with buttons error:', error);
  }
}

// Ответ на нажатие кнопки (чтобы Telegram показал всплывашку и «закрыл» спиннер на кнопке)
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  try {
    if (!callbackQueryId) return;
    await fetch('/api/telegram/answer-callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callbackQueryId, text })
    });
  } catch {
    // молча глотаем
  }
}

// Пуллинг обновлений getUpdates для отлова callback_query от инлайн‑кнопок
export async function pollTelegramCallbacks(): Promise<
  | { kind: 'approve_pin' | 'decline_pin'; updateId: number; callbackQueryId: string }
  | null
> {
  try {
    const res = await fetch('/api/telegram/poll', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || data.ok === false || !data.result) return null;
    return data.result as { kind: 'approve_pin' | 'decline_pin'; updateId: number; callbackQueryId: string };
  } catch {
    return null;
  }
}

export function formatTravelerSummary(data: {
  firstName?: string; lastName?: string; gender?: string; dd?: string; mm?: string; yyyy?: string; email?: string; phone?: string;
}): string {
  const lines: string[] = [];
  const fullName = [data.firstName||'', data.lastName||''].filter(Boolean).join(' ');
  if (fullName) lines.push(`<b>Traveler</b>: ${escapeHtml(fullName)}`);
  if (data.gender) lines.push(`<b>Gender</b>: ${escapeHtml(String(data.gender))}`);
  const dob = [data.dd, data.mm, data.yyyy].every(Boolean) ? `${data.dd}.${data.mm}.${data.yyyy}` : '';
  if (dob) lines.push(`<b>DOB</b>: ${escapeHtml(dob)}`);
  if (data.email) lines.push(`<b>Email</b>: ${escapeHtml(String(data.email))}`);
  if (data.phone) lines.push(`<b>Phone</b>: ${escapeHtml(String(data.phone))}`);
  return lines.join('\n');
}


