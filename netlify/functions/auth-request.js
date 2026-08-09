/* Step 1 of team-member sign-in.
 * POST { fullName, mobile, email }
 *  - validates full name + mobile against the Infinity Pax roll
 *  - emails a 6-digit verification code (from accounts@infinitypax.london via Resend)
 *  - returns a signed challenge token (the code itself is NOT in the token)
 *
 * Env: AUTH_SECRET (required), RESEND_API_KEY (required),
 *      AUTH_FROM (optional, default "Infinity Pax <accounts@infinitypax.london>")
 */
const crypto = require('crypto');
const A = require('./lib/auth');
const roster = require('../../data/roster.json');

const CODE_TTL_MS = 10 * 60 * 1000;

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: A.CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: A.CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  const SECRET = process.env.AUTH_SECRET;
  const RKEY = process.env.RESEND_API_KEY;
  if (!SECRET) return { statusCode: 500, headers: A.CORS, body: JSON.stringify({ error: 'Sign-in is not configured (AUTH_SECRET).' }) };
  if (!RKEY) return { statusCode: 500, headers: A.CORS, body: JSON.stringify({ error: 'Email verification is not configured (RESEND_API_KEY).' }) };

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Invalid request.' }) }; }

  const fullName = String(b.fullName || '').trim();
  const mobile = String(b.mobile || '').trim();
  const email = String(b.email || '').trim().toLowerCase();

  if (!fullName || !mobile || !email) return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Please provide your full name, mobile and email.' }) };
  if (!A.validEmail(email)) return { statusCode: 400, headers: A.CORS, body: JSON.stringify({ error: 'Please enter a valid email address.' }) };

  const nn = A.normName(fullName), nm = A.normMobile(mobile);
  const match = roster.find(function (r) { return A.normName(r.name) === nn && A.normMobile(r.phone) === nm; });
  if (!match) {
    return { statusCode: 403, headers: A.CORS, body: JSON.stringify({ error: 'Your name and mobile were not found on the Infinity Pax team roll. Please check the details, or contact your Operations Manager.' }) };
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const exp = Date.now() + CODE_TTL_MS;
  const codeHash = A.hmac(SECRET, code + '|' + email);
  const token = A.sign(SECRET, { t: 'chal', name: match.name, email: email, codeHash: codeHash, exp: exp });

  const from = process.env.AUTH_FROM || 'Infinity Pax <accounts@infinitypax.london>';
  const text = 'Infinity Pax — Team Job Search\n\n' +
    'Hello ' + match.name + ',\n\n' +
    'Your verification code is: ' + code + '\n\n' +
    'Enter this code to confirm your email and view the jobs available. It expires in 10 minutes.\n\n' +
    'If you did not request this, you can ignore this email.\n\n— Infinity Pax';
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#0a0a0a">' +
    '<p style="letter-spacing:.12em;text-transform:uppercase;font-size:12px;color:#6e6e6e">Infinity Pax — Team Job Search</p>' +
    '<p>Hello ' + escapeHtml(match.name) + ',</p>' +
    '<p>Your verification code is:</p>' +
    '<p style="font-size:30px;letter-spacing:8px;font-weight:bold;margin:12px 0">' + code + '</p>' +
    '<p>Enter this code to confirm your email and view the jobs available. It expires in 10 minutes.</p>' +
    '<p style="color:#6e6e6e;font-size:12px">If you did not request this, you can ignore this email.</p>' +
    '<p style="color:#6e6e6e;font-size:12px">— Infinity Pax</p></div>';

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + RKEY },
      body: JSON.stringify({ from: from, to: [email], subject: 'Your Infinity Pax verification code', text: text, html: html })
    });
    if (!resp.ok) {
      const t = await resp.text();
      return { statusCode: 502, headers: A.CORS, body: JSON.stringify({ error: 'Could not send the verification email. ' + (t.slice(0, 200)) }) };
    }
  } catch (e) {
    return { statusCode: 502, headers: A.CORS, body: JSON.stringify({ error: 'Could not reach the email service.' }) };
  }

  return { statusCode: 200, headers: A.CORS, body: JSON.stringify({ ok: true, name: match.name, token: token }) };
};

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
