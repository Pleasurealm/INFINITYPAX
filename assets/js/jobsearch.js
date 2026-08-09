/* Team Job Search — for each of the 50 ex-forces seekers, run a live,
   tailored job search through the secure Netlify/Firecrawl function,
   plus copy a personalised covering email. Query + target email persist
   per person in localStorage. */
(function () {
  'use strict';

  var ENDPOINT = '/.netlify/functions/search';
  var LS_Q = 'ip_jobsearch_queries_v1';
  var LS_EMAIL = 'ip_roster_emails_v1'; // shared with team.html
  var roster = [];
  var state = { q: '', filter: 'all' };

  function ls(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; } }
  function lsSet(key, k, v) { var m = ls(key); m[k] = v; localStorage.setItem(key, JSON.stringify(m)); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // Build a sensible default job-search query from a person's profile
  function defaultQuery(p, pr) {
    var lead;
    if (pr.trade && !pr.hasSIA) lead = pr.trade.label;
    else if (pr.hasSIA && pr.trade) lead = 'SIA ' + pr.trade.label;
    else if (pr.hasSIA) lead = 'SIA security officer concierge';
    else lead = (pr.roles[0] || 'security officer');
    lead = lead.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return lead + ' jobs London';
  }

  function matches(p) {
    var pr = window.IPProfile.profile(p);
    if (state.filter === 'sia' && !pr.hasSIA) return false;
    if (state.filter === 'driver' && !pr.isDriver) return false;
    if (state.filter === 'trade' && !pr.trade) return false;
    if (state.q) {
      var hay = (p.name + ' ' + p.quals + ' ' + (pr.trade ? pr.trade.label : '') + ' ' + pr.roles.join(' ')).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
    }
    return true;
  }

  function runSearch(query, location, resultsEl, btn) {
    resultsEl.innerHTML = '';
    resultsEl.classList.add('open');
    var status = document.createElement('div');
    status.className = 'js-status'; status.textContent = 'Searching…';
    resultsEl.appendChild(status);
    if (btn) btn.disabled = true;

    fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, location: location || undefined, limit: 10 })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (btn) btn.disabled = false;
        if (!res.ok) { status.textContent = (res.d && res.d.error) || 'Search failed.'; status.classList.add('err'); return; }
        var results = (res.d && res.d.results) || [];
        if (!results.length) { status.textContent = 'No results for “' + query + '”.'; return; }
        status.textContent = results.length + ' results';
        results.forEach(function (r) {
          var div = document.createElement('div');
          div.className = 'js-res';
          div.innerHTML = '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title) + '</a>' +
            '<span class="u">' + esc(r.url) + '</span>' +
            (r.description ? '<p>' + esc(r.description) + '</p>' : '');
          resultsEl.appendChild(div);
        });
      }).catch(function () {
        if (btn) btn.disabled = false;
        status.textContent = 'Could not reach the search service. On Netlify, set FIRECRAWL_API_KEY; locally, run “netlify dev”.';
        status.classList.add('err');
      });
  }

  function card(p) {
    var pr = window.IPProfile.profile(p);
    var mail = window.IPProfile.email(p, pr);
    var savedQ = ls(LS_Q)[p.ser] || defaultQuery(p, pr);
    var savedEmail = ls(LS_EMAIL)[p.ser] || '';
    var chips = pr.chips.concat(['Guide ' + pr.sal]);

    var el = document.createElement('div');
    el.className = 'jc';
    el.innerHTML =
      '<div class="jc-h"><span class="jc-ser">' + esc(p.ser) + '</span>' +
        '<h3 class="jc-name">' + esc(p.name) + '</h3>' +
        (p.remark ? '<span class="jc-remark">' + esc(p.remark) + '</span>' : '') +
        '<span class="jc-phone">' + esc(p.phone) + '</span></div>' +
      '<div class="jc-chips">' + chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<div class="jc-lbl">Target roles</div><ul class="jc-roles">' + pr.roles.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
      '<div class="jc-search">' +
        '<input class="jc-q" type="text" value="' + esc(savedQ) + '" aria-label="Job search query for ' + esc(p.name) + '">' +
        '<button class="jc-find" type="button">Find jobs</button>' +
      '</div>' +
      '<div class="jc-results"></div>' +
      '<div class="jc-foot">' +
        '<input class="jc-email" type="email" placeholder="Target employer email" value="' + esc(savedEmail) + '" aria-label="Target employer email">' +
        '<button class="jc-copy" type="button">Copy email</button>' +
        '<a class="jc-mail" target="_blank" rel="noopener">Open in mail</a>' +
      '</div>';

    var qInput = el.querySelector('.jc-q');
    var results = el.querySelector('.jc-results');
    var findBtn = el.querySelector('.jc-find');
    qInput.addEventListener('input', function () { lsSet(LS_Q, p.ser, qInput.value); });
    findBtn.addEventListener('click', function () { runSearch(qInput.value.trim(), 'London', results, findBtn); });

    var emailInput = el.querySelector('.jc-email');
    var copyBtn = el.querySelector('.jc-copy');
    var mailA = el.querySelector('.jc-mail');
    function updateMailto() {
      mailA.href = 'mailto:' + encodeURIComponent(emailInput.value.trim()) +
        '?subject=' + encodeURIComponent(mail.subject) + '&body=' + encodeURIComponent(mail.body);
    }
    emailInput.addEventListener('input', function () { lsSet(LS_EMAIL, p.ser, emailInput.value.trim()); updateMailto(); });
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText('Subject: ' + mail.subject + '\n\n' + mail.body).then(function () {
        var o = copyBtn.textContent; copyBtn.textContent = 'Copied ✓'; copyBtn.classList.add('done');
        setTimeout(function () { copyBtn.textContent = o; copyBtn.classList.remove('done'); }, 1500);
      }).catch(function () { alert('Could not copy — open the covering email and copy manually.'); });
    });
    updateMailto();
    return el;
  }

  function render() {
    var host = document.getElementById('jsgrid');
    host.innerHTML = '';
    var shown = roster.filter(matches);
    shown.forEach(function (p) { host.appendChild(card(p)); });
    document.getElementById('jscount').textContent = shown.length + ' of ' + roster.length + ' seekers';
  }

  function runAll() {
    // fire a search for every currently-shown card, staggered to be gentle
    var cards = Array.prototype.slice.call(document.querySelectorAll('#jsgrid .jc'));
    cards.forEach(function (c, i) {
      setTimeout(function () { c.querySelector('.jc-find').click(); }, i * 400);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
    var fb = document.getElementById('filters');
    fb.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.filter = b.getAttribute('data-f');
      Array.prototype.forEach.call(fb.children, function (x) { x.classList.toggle('active', x === b); });
      render();
    });
    document.getElementById('runall').addEventListener('click', runAll);

    IPAuth.protect(function () {
      IPAuth.authFetch('/.netlify/functions/roster', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (data) { roster = (data && data.roster) || []; render(); })
        .catch(function () {
          document.getElementById('jsgrid').innerHTML = '<p class="t">Could not load roster data. Deploy the site (with the auth functions and AUTH_SECRET) to use this page.</p>';
        });
    });
  });
})();
