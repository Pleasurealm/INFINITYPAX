/* Admin / Mithu sign-in — no email step.
 * POST { passcode }  ->  { session }  (role: admin)
 * Env: AUTH_SECRET (required), ADMIN_PASSCODE (required)
 */
const A = require('./lib/auth');
const crypto = require('crypto');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: A.CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: A.CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const SECRET = process.env.AUTH_SECRET;
  const PASS = process.env.ADMIN_PASSCODE;
  if (!SECRET || !PASS) return { statusCode: 500, headers: A.CORS, body: JSON.stringify({ error: 'Admin sign-in is not configured (AUTH_SECRET / ADMIN_PASSCODE).' }) };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Invalid request.' }) }; }

  const passcode = String(b.passcode || '');
  var ok = false;
  try { ok = passcode.length === PASS.length && crypto.timingSafeEqual(Buffer.from(passcode), Buffer.from(PASS)); } catch (e) { ok = false; }
  if (!ok) return { statusCode: 401, headers: A.CORS, body: JSON.stringify({ error: 'Incorrect admin passcode.' }) };

  const adminName = process.env.ADMIN_NAME || 'Mithulal Bishwakarma';
  const adminEmail = process.env.ADMIN_EMAIL || 'mi@infinitypax.london';
  const session = A.sign(SECRET, { t: 'sess', role: 'admin', name: adminName, email: adminEmail, exp: Date.now() + SESSION_TTL_MS });
  return { statusCode: 200, headers: A.CORS, body: JSON.stringify({ ok: true, session: session, name: adminName, email: adminEmail, role: 'admin' }) };
};
