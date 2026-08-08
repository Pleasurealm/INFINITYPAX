/* Firecrawl search proxy.
 * Keeps FIRECRAWL_API_KEY server-side — the browser never sees it.
 * POST { query, limit?, location? }  ->  { results: [{ title, url, description }] }
 *
 * Env: FIRECRAWL_API_KEY  (set in Netlify site settings → Environment variables)
 */
const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v1/search';

exports.handler = async function (event) {
  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Search is not configured. Set FIRECRAWL_API_KEY in the Netlify environment.' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const query = (payload.query || '').toString().trim();
  if (!query) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing "query".' }) };

  const limit = Math.min(Math.max(parseInt(payload.limit, 10) || 10, 1), 20);
  const body = { query: query, limit: limit };
  if (payload.location) body.location = String(payload.location);

  try {
    const resp = await fetch(FIRECRAWL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body)
    });

    const raw = await resp.text();
    let data;
    try { data = JSON.parse(raw); } catch (e) { data = null; }

    if (!resp.ok) {
      const msg = (data && (data.error || data.message)) || ('Search provider error (' + resp.status + ')');
      return { statusCode: 502, headers: cors, body: JSON.stringify({ error: msg }) };
    }

    // Firecrawl returns { success, data: [ { title, url, description, ... } ] }
    const items = Array.isArray(data && data.data) ? data.data
      : Array.isArray(data && data.results) ? data.results
      : Array.isArray(data) ? data : [];

    const results = items.map(function (it) {
      return {
        title: it.title || it.metadata && it.metadata.title || it.url || 'Untitled',
        url: it.url || it.link || (it.metadata && it.metadata.sourceURL) || '',
        description: it.description || (it.metadata && it.metadata.description) || it.snippet || ''
      };
    }).filter(function (r) { return r.url; });

    return { statusCode: 200, headers: cors, body: JSON.stringify({ query: query, count: results.length, results: results }) };
  } catch (err) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Could not reach the search provider.' }) };
  }
};
