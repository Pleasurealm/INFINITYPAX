/* Sign-in log — ADMIN ONLY.
 * GET with header  Authorization: Bearer <session>  (role must be admin)
 * Returns { signins: [ { ts, name, mobile, email, role, ip, ua } ] } newest first.
 * Env: AUTH_SECRET (required)
 */
const A = require('./lib/auth');
const log = require('./lib/log');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: A.CORS, body: '' };

  const SECRET = process.env.AUTH_SECRET;
  if (!SECRET) return { statusCode: 500, headers: A.CORS, body: JSON.stringify({ error: 'Not configured (AUTH_SECRET).' }) };

  const sess = A.verify(SECRET, A.bearer(event));
  if (!sess || sess.t !== 'sess') return { statusCode: 401, headers: A.CORS, body: JSON.stringify({ error: 'Sign in required.' }) };
  if (sess.role !== 'admin') return { statusCode: 403, headers: A.CORS, body: JSON.stringify({ error: 'Admin access required.' }) };

  const rows = await log.listSignins(2000);
  if (rows === null) {
    return { statusCode: 200, headers: Object.assign({}, A.CORS, { 'Cache-Control': 'no-store' }), body: JSON.stringify({ unavailable: true, signins: [] }) };
  }
  return { statusCode: 200, headers: Object.assign({}, A.CORS, { 'Cache-Control': 'no-store' }), body: JSON.stringify({ signins: rows }) };
};
