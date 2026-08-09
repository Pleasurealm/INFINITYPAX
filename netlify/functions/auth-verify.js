/* Step 2 of team-member sign-in.
 * POST { token, code, email }  ->  { session }  (valid ~12h)
 * Env: AUTH_SECRET (required)
 */
const A = require('./lib/auth');
const crypto = require('crypto');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: A.CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: A.CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const SECRET = process.env.AUTH_SECRET;
  if (!SECRET) return { statusCode: 500, headers: A.CORS, body: JSON.stringify({ error: 'Sign-in is not configured (AUTH_SECRET).' }) };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Invalid request.' }) }; }

  const token = String(b.token || '');
  const code = String(b.code || '').trim();
  const email = String(b.email || '').trim().toLowerCase();

  const chal = A.verify(SECRET, token);
  if (!chal || chal.t !== 'chal') return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Your code has expired. Please request a new one.' }) };
  if (chal.email !== email) return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Email does not match this verification request.' }) };

  const expect = A.hmac(SECRET, code + '|' + email);
  var ok = false;
  try { ok = crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(chal.codeHash)); } catch (e) { ok = false; }
  if (!ok) return { statusCode: 401, headers: A.CORS, body: JSON.stringify({ error: 'Incorrect code. Please try again.' }) };

  const session = A.sign(SECRET, { t: 'sess', role: 'member', name: chal.name, email: email, exp: Date.now() + SESSION_TTL_MS });
  return { statusCode: 200, headers: A.CORS, body: JSON.stringify({ ok: true, session: session, name: chal.name, role: 'member' }) };
};
