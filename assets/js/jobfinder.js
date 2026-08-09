/* Job Finder — posts a query to the Netlify function (which holds the
   Firecrawl key server-side) and renders live results. */
(function () {
  'use strict';

  var ENDPOINT = '/.netlify/functions/search';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setStatus(msg, isErr) {
    var el = document.getElementById('status');
    if (!msg) { el.hidden = true; el.textContent = ''; el.classList.remove('err'); return; }
    el.hidden = false; el.textContent = msg;
    el.classList.toggle('err', !!isErr);
  }

  function render(results) {
    var host = document.getElementById('results');
    host.innerHTML = results.map(function (r) {
      return '<div class="res">' +
        '<a class="t" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title) + '</a>' +
        '<span class="u">' + esc(r.url) + '</span>' +
        (r.description ? '<p>' + esc(r.description) + '</p>' : '') +
      '</div>';
    }).join('');
  }

  function search(query, location) {
    var go = document.getElementById('go');
    document.getElementById('results').innerHTML = '';
    setStatus('Searching…', false);
    go.disabled = true;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, location: location || undefined, limit: 12 })
    }).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, data: data }; });
    }).then(function (res) {
      go.disabled = false;
      if (!res.ok) { setStatus(res.data && res.data.error ? res.data.error : 'Search failed.', true); return; }
      var results = (res.data && res.data.results) || [];
      if (!results.length) { setStatus('No results for “' + query + '”.', false); return; }
      setStatus(results.length + ' results for “' + query + '”', false);
      render(results);
    }).catch(function () {
      go.disabled = false;
      setStatus('Could not reach the search service. If you are previewing locally, run “netlify dev” so the function is available.', true);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.IPAuth) IPAuth.protect(function () {});
    document.getElementById('jfForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = document.getElementById('q').value.trim();
      var loc = document.getElementById('loc').value.trim();
      if (q) search(q, loc);
    });
    document.getElementById('presets').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      document.getElementById('q').value = b.getAttribute('data-q');
      search(b.getAttribute('data-q'), document.getElementById('loc').value.trim());
    });
  });
})();
