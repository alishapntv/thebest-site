// Приймає заявку з сайту і надсилає її в Telegram.
// Токен і chat_id беруться зі змінних середовища Netlify (в коді сайту їх немає).
const COLORS = ['Марсала', 'Чорний', 'Шоколадний', 'Сірий'];
const SIZES = ['42–44', '46–48', '50–52', '54–56'];
const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const reply = (statusCode, ok, error) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(ok ? { ok: true } : { ok: false, error })
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return reply(405, false, 'method');

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return reply(500, false, 'not_configured');

  let o;
  try { o = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, false, 'bad_json'); }

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
};
