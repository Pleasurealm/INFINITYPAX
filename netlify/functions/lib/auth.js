/* Shared auth helpers for Infinity Pax functions.
 * Stateless HMAC-signed tokens (no database needed). */
const crypto = require('crypto');

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}
function b64url(obj) { return Buffer.from(JSON.stringify(obj)).toString('base64url'); }

function sign(secret, payload) {
  const p = b64url(payload);
  return p + '.' + hmac(secret, p);
}
function verify(secret, token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') < 0) return null;
  const i = token.lastIndexOf('.');
  const p = token.slice(0, i), sig = token.slice(i + 1);
  const expect = hmac(secret, p);
  let a, b;
  try { a = Buffer.from(sig); b = Buffer.from(expect); } catch (e) { return null; }
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let obj;
  try { obj = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (obj.exp && Date.now() > obj.exp) return null;
  return obj;
}

function normName(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function normMobile(s) {
  var d = String(s || '').replace(/[^\d]/g, '');
  if (d.indexOf('44') === 0 && d.length === 12) d = '0' + d.slice(2); // +44 7… -> 07…
  return d;
}
function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '')); }

function bearer(event) {
  var h = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  var m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : '';
}

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

module.exports = { hmac, sign, verify, normName, normMobile, validEmail, bearer, CORS };
