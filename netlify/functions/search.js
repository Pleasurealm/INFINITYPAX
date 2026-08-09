/* Firecrawl live search proxy.
 * Keeps FIRECRAWL_API_KEY server-side — the browser never sees it.
 * POST { query, limit?, location? }  ->  { results: [{ title, url, description }] }
 *
 * Uses Firecrawl v2 /search (live web results). Env:
 *   FIRECRAWL_API_KEY   (required)  — set in Netlify → Site settings → Environment variables
 *   FIRECRAWL_ENDPOINT  (optional)  — override, defaults to https://api.firecrawl.dev/v2/search
 */
const DEFAULT_ENDPOINT = 'https://api.firecrawl.dev/v2/search';

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
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Live search is not configured. Set FIRECRAWL_API_KEY in the Netlify environment.' }) };
  }
  const endpoint = process.env.FIRECRAWL_ENDPOINT || DEFAULT_ENDPOINT;

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const query = (payload.query || '').toString().trim();
  if (!query) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing "query".' }) };

  const limit = Math.min(Math.max(parseInt(payload.limit, 10) || 10, 1), 20);

  // Firecrawl v2 search body. `sources: ['web']` returns SERP-style {url,title,description}.
  const body = { query: query, limit: limit, sources: ['web'] };
  if (payload.location) body.location = String(payload.location);

  try {
    const resp = await fetch(endpoint, {
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

    // v2 groups results by source (data.web); older/self-host shapes may return data as an array
    // or data.results. Normalise all of them.
    const d = data && data.data !== undefined ? data.data : data;
    let items = [];
    if (Array.isArray(d)) items = d;
    else if (d && Array.isArray(d.web)) items = d.web;
    else if (d && Array.isArray(d.results)) items = d.results;
    else if (data && Array.isArray(data.results)) items = data.results;

    const results = items.map(function (it) {
      const meta = it.metadata || {};
      return {
        title: it.title || meta.title || it.url || 'Untitled',
        url: it.url || it.link || meta.sourceURL || meta.url || '',
        description: it.description || it.snippet || meta.description || ''
      };
    }).filter(function (r) { return r.url; });

    return { statusCode: 200, headers: cors, body: JSON.stringify({ query: query, count: results.length, results: results }) };
  } catch (err) {
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: 'Could not reach the search provider.' }) };
  }
};
