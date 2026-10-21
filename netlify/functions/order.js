// Приймає заявку з сайту і надсилає її в Telegram (Cloudflare Worker).
// Токен і chat_id беруться зі змінних Worker (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).
const COLORS = ['Марсала', 'Чорний', 'Шоколадний', 'Сірий'];
const SIZES = ['42–44', '46–48', '50–52', '54–56'];
const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const reply = (status, ok, error) =>
  new Response(JSON.stringify(ok ? { ok: true } : { ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors }
  });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, false, 'method');

    const token = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return reply(500, false, 'not_configured');

    let o;
    try { o = await request.json(); } catch (e) { return reply(400, false, 'bad_json'); }

    const name = String(o.name || '').trim().slice(0, 60);
    const phone = String(o.phone || '').replace(/\D/g, '');
    const color = String(o.color || '');
    const size = String(o.size || '');
    const price = Number(o.price) || 0;
    if (name.length < 2 || phone.length !== 9 || !COLORS.includes(color) || !SIZES.includes(size)) {
      return reply(400, false, 'invalid');
    }

    const time = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });
    const text =
      `🛍 <b>Нове замовлення — костюм «The Best»</b>\n\n` +
      `👤 Ім'я: ${esc(name)}\n` +
      `📞 Телефон: +380${phone}\n` +
      `🎨 Колір: ${esc(color)}\n` +
      `📏 Розмір: ${esc(size)}\n` +
      `💰 Ціна: ${price} грн\n\n` +
      `🕒 ${time}`;

    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        signal: AbortSignal.timeout(10000)
      });
      const j = await r.json().catch(() => ({}));
      if (!j.ok) { console.error('Telegram error:', j.description); return reply(502, false, 'telegram'); }
      return reply(200, true);
    } catch (e) {
      console.error('Telegram request failed:', e.message);
      return reply(502, false, 'network');
    }
  }
};
