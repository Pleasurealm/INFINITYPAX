/* Protected job/roster data — served only to a valid session.
 * GET with header  Authorization: Bearer <session>
 * Returns the 50-person roster; 401 without a valid session.
 * Env: AUTH_SECRET (required)
 */
const A = require('./lib/auth');
const roster = require('../../data/roster.json');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: A.CORS, body: '' };

  const SECRET = process.env.AUTH_SECRET;
  if (!SECRET) return { statusCode: 500, headers: A.CORS, body: JSON.stringify({ error: 'Not configured (AUTH_SECRET).' }) };

  const sess = A.verify(SECRET, A.bearer(event));
  if (!sess || sess.t !== 'sess') {
    return { statusCode: 401, headers: A.CORS, body: JSON.stringify({ error: 'Sign in to view the jobs available.' }) };
  }

  return {
    statusCode: 200,
    headers: Object.assign({}, A.CORS, { 'Cache-Control': 'no-store' }),
    body: JSON.stringify({ role: sess.role, name: sess.name || null, roster: roster })
  };
};
