/* Capability Dashboard — rate toggle + stat tiles, driven by /data JSON.
   Falls back to embedded defaults so the page also works from file://. */
(function () {
  'use strict';

  var FALLBACK_RATES = {
    note: 'Indicative client charge-out rates, London, exclusive of VAT. Block-booking, overnight and long-term contract rates on application.',
    tiers: [
      { key: 'entry', label: 'Entry (<2 yrs)' },
      { key: 'experienced', label: 'Experienced (2–5)' },
      { key: 'senior', label: 'Senior / Specialist' }
    ],
    roles: [
      { role: 'Security & concierge', basis: 'per hr', entry: '£16–18', experienced: '£18–21', senior: '£21–25' },
      { role: 'Chauffeur / security driver', basis: 'per hr', entry: '£18–20', experienced: '£20–24', senior: '£24–30' },
      { role: 'Close protection / HNW', basis: 'per hr', entry: '—', experienced: '£28–35', senior: '£35–45' },
      { role: 'Skilled trades', basis: 'per day', entry: '£150–180', experienced: '£180–220', senior: '£220–280' }
    ]
  };

  function getJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(r.status); return r.json();
    });
  }

  function renderRates(data) {
    var tiers = data.tiers, roles = data.roles;
    var btns = document.getElementById('ratebtns');
    var col = document.getElementById('rateCol');
    var body = document.getElementById('rateBody');
    document.getElementById('rateNote').textContent = data.note || '';

    function paint(tierKey) {
      var tier = tiers.filter(function (t) { return t.key === tierKey; })[0] || tiers[0];
      col.textContent = tier.label;
      body.innerHTML = roles.map(function (r) {
        return '<tr><td class="rowlabel">' + r.role + '</td><td>' + r.basis +
          '</td><td class="num hi">' + (r[tierKey] != null ? r[tierKey] : '—') + '</td></tr>';
      }).join('');
      Array.prototype.forEach.call(btns.children, function (b) {
        b.classList.toggle('active', b.getAttribute('data-tier') === tierKey);
      });
    }

    btns.innerHTML = tiers.map(function (t, i) {
      return '<button class="' + (i === 0 ? 'active' : '') + '" data-tier="' + t.key + '">' + t.label + '</button>';
    }).join('');
    Array.prototype.forEach.call(btns.children, function (b) {
      b.addEventListener('click', function () { paint(b.getAttribute('data-tier')); });
    });
    paint(tiers[0].key);
  }

  function renderStats(roster) {
    if (!window.IPProfile || !roster || !roster.length) return;
    var c = window.IPProfile.counts(roster);
    var map = { total: c.total, sia: c.sia, drivers: c.drivers, trades: c.trades };
    Object.keys(map).forEach(function (k) {
      var el = document.querySelector('[data-stat="' + k + '"]');
      if (el) el.textContent = map[k];
    });
  }

  function copyEmail() {
    var btn = document.getElementById('copyEmailBtn');
    btn.addEventListener('click', function () {
      var subj = document.querySelector('.email-subj').textContent;
      var bodyText = document.getElementById('emailBody').innerText;
      navigator.clipboard.writeText(subj + '\n\n' + bodyText).then(function () {
        var orig = btn.textContent;
        btn.textContent = 'Copied ✓'; btn.classList.add('done');
        setTimeout(function () { btn.textContent = orig; btn.classList.remove('done'); }, 1600);
      }).catch(function () { alert('Could not copy — select and copy manually.'); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    copyEmail();
    getJSON('data/rates.json').then(renderRates).catch(function () { renderRates(FALLBACK_RATES); });
    // Roster is protected (auth required); the public dashboard uses the fixed
    // capability totals already in the markup.
  });
})();
