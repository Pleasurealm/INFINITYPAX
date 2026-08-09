/* Single-step sign-in (no email verification).
 * POST { fullName, mobile, email }  ->  { session, role, name }
 *
 * - Admin/Mithu: if the email is an admin email (default mi@infinitypax.london),
 *   grant admin — name + email only, mobile not required.
 * - Team member: full name + mobile must match the Infinity Pax roll; email is recorded.
 *
 * Env: AUTH_SECRET (required)
 *      ADMIN_EMAILS (optional, comma-separated; default "mi@infinitypax.london")
 *      ADMIN_NAME   (optional; default "Mithulal Bishwakarma")
 */
const A = require('./lib/auth');
const log = require('./lib/log');
const roster = require('../../data/roster.json');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function clientIp(event) {
  var h = event.headers || {};
  return h['x-nf-client-connection-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim() || '';
}
async function record(event, entry) {
  try {
    await log.addSignin(Object.assign({ ts: Date.now(), ip: clientIp(event), ua: (event.headers && event.headers['user-agent']) || '' }, entry));
  } catch (e) { /* logging is best-effort */ }
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: A.CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: A.CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const SECRET = process.env.AUTH_SECRET;
  if (!SECRET) return { statusCode: 500, headers: A.CORS, body: JSON.stringify({ error: 'Sign-in is not configured (AUTH_SECRET).' }) };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Invalid request.' }) }; }

  const fullName = String(b.fullName || '').trim();
  const mobile = String(b.mobile || '').trim();
  const email = String(b.email || '').trim().toLowerCase();

  if (!fullName || !email) return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Please enter your name and email.' }) };
  if (!A.validEmail(email)) return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Please enter a valid email address.' }) };

  const adminEmails = (process.env.ADMIN_EMAILS || 'mi@infinitypax.london')
    .toLowerCase().split(',').map(function (s) { return s.trim(); }).filter(Boolean);

  // Admin / Mithu — name + email only
  if (adminEmails.indexOf(email) !== -1) {
    const adminName = fullName || process.env.ADMIN_NAME || 'Mithulal Bishwakarma';
    const session = A.sign(SECRET, { t: 'sess', role: 'admin', name: adminName, email: email, exp: Date.now() + SESSION_TTL_MS });
    await record(event, { name: adminName, mobile: mobile || '', email: email, role: 'admin' });
    return { statusCode: 200, headers: A.CORS, body: JSON.stringify({ ok: true, session: session, role: 'admin', name: adminName }) };
  }

  // Team member — full name + mobile must match the roll
  if (!mobile) return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Please enter your mobile number.' }) };
  const nn = A.normName(fullName), nm = A.normMobile(mobile);
  const match = roster.find(function (r) { return A.normName(r.name) === nn && A.normMobile(r.phone) === nm; });
  if (!match) {
    return { statusCode: 403, headers: A.CORS, body: JSON.stringify({ error: 'Your name and mobile were not found on the Infinity Pax team roll. Please check the details, or contact your Operations Manager.' }) };
  }

  const session = A.sign(SECRET, { t: 'sess', role: 'member', name: match.name, email: email, exp: Date.now() + SESSION_TTL_MS });
  await record(event, { name: match.name, mobile: A.normMobile(mobile), email: email, role: 'member' });
  return { statusCode: 200, headers: A.CORS, body: JSON.stringify({ ok: true, session: session, role: 'member', name: match.name }) };
};
