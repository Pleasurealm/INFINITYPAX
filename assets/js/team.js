/* Team Roster — render 50-person roster from data/roster.json,
   with search/filter, per-person target-employer email (localStorage),
   and copy-to-clipboard covering emails. */
(function () {
  'use strict';

  var LS_KEY = 'ip_roster_emails_v1';
  var roster = [];
  var state = { q: '', filter: 'all' };

  function loadEmails() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveEmail(ser, val) {
    var m = loadEmails(); m[ser] = val; localStorage.setItem(LS_KEY, JSON.stringify(m));
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  function card(p) {
    var pr = window.IPProfile.profile(p);
    var mail = window.IPProfile.email(p, pr);
    var saved = loadEmails()[p.ser] || '';
    var chips = pr.chips.concat(['Guide ' + pr.sal]);
    var roles = pr.roles.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('');

    var el = document.createElement('div');
    el.className = 'pc';
    el.innerHTML =
      '<div class="pc-h"><span class="pc-ser">' + esc(p.ser) + '</span>' +
        '<h3 class="pc-name">' + esc(p.name) + '</h3>' +
        (p.remark ? '<span class="pc-remark">' + esc(p.remark) + '</span>' : '') +
        '<span class="pc-phone">' + esc(p.phone) + '</span></div>' +
      '<div class="pc-chips">' + chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' +
      '<div><div class="pc-lbl">Target roles</div><ul>' + roles + '</ul></div>' +
      '<div class="pc-field"><label for="em-' + p.ser + '">Target employer email</label>' +
        '<input type="email" id="em-' + p.ser + '" placeholder="name@employer.com" value="' + esc(saved) + '"></div>' +
      '<details><summary>Covering email</summary>' +
        '<div class="subj">Subject: ' + esc(mail.subject) + '</div>' +
        '<div class="mbody">' + esc(mail.body) + '</div></details>' +
      '<div class="pc-row">' +
        '<button class="mini" data-copy>Copy email</button>' +
        '<a class="mini" data-mail target="_blank" rel="noopener">Open in mail</a></div>';

    // per-person email persistence
    var input = el.querySelector('input');
    input.addEventListener('input', function () {
      saveEmail(p.ser, input.value.trim());
      updateMailto();
    });

    // copy
    el.querySelector('[data-copy]').addEventListener('click', function (e) {
      var btn = e.currentTarget;
      navigator.clipboard.writeText('Subject: ' + mail.subject + '\n\n' + mail.body).then(function () {
        var o = btn.textContent; btn.textContent = 'Copied ✓'; btn.classList.add('done');
        setTimeout(function () { btn.textContent = o; btn.classList.remove('done'); }, 1500);
      }).catch(function () { alert('Could not copy — open the covering email and copy manually.'); });
    });

    // mailto
    var mailA = el.querySelector('[data-mail]');
    function updateMailto() {
      var to = input.value.trim();
      mailA.href = 'mailto:' + encodeURIComponent(to) +
        '?subject=' + encodeURIComponent(mail.subject) +
        '&body=' + encodeURIComponent(mail.body);
    }
    updateMailto();

    return el;
  }

  function render() {
    var host = document.getElementById('roster');
    host.innerHTML = '';
    var shown = roster.filter(matches);
    shown.forEach(function (p) { host.appendChild(card(p)); });
    document.getElementById('rcount').textContent =
      shown.length + ' of ' + roster.length + ' shown';
  }

  function wire() {
    document.getElementById('q').addEventListener('input', function (e) {
      state.q = e.target.value; render();
    });
    var fb = document.getElementById('filters');
    fb.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      state.filter = b.getAttribute('data-f');
      Array.prototype.forEach.call(fb.children, function (x) { x.classList.toggle('active', x === b); });
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wire();
    fetch('data/roster.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) { roster = data; render(); })
      .catch(function () {
        document.getElementById('roster').innerHTML =
          '<p class="t">Could not load the roster data file. If you are viewing this from disk, run it through a local server or deploy it.</p>';
      });
  });
})();
