/* Admin sign-in log viewer. Requires an admin session. */
(function () {
  'use strict';
  var rows = [], q = '';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(ts) { try { return new Date(ts).toLocaleString('en-GB'); } catch (e) { return String(ts); } }

  function filtered() {
    if (!q) return rows;
    var s = q.toLowerCase();
    return rows.filter(function (r) {
      return ((r.name || '') + ' ' + (r.email || '') + ' ' + (r.mobile || '') + ' ' + (r.role || '')).toLowerCase().indexOf(s) !== -1;
    });
  }

  function render() {
    var out = document.getElementById('out');
    var list = filtered();
    document.getElementById('count').textContent = list.length + ' of ' + rows.length + ' sign-ins';
    if (!rows.length) { out.innerHTML = '<div class="msg">No sign-ins recorded yet.</div>'; return; }
    var body = list.map(function (r) {
      return '<tr><td style="white-space:nowrap">' + esc(fmt(r.ts)) + '</td>' +
        '<td>' + esc(r.name) + '</td>' +
        '<td>' + esc(r.mobile || '—') + '</td>' +
        '<td>' + esc(r.email) + '</td>' +
        '<td><span class="role ' + (r.role === 'admin' ? 'admin' : '') + '">' + esc(r.role) + '</span></td>' +
        '<td style="color:var(--meta)">' + esc(r.ip || '') + '</td></tr>';
    }).join('');
    out.innerHTML = '<div class="logwrap"><table class="log"><thead><tr>' +
      '<th>Time</th><th>Name</th><th>Mobile</th><th>Email</th><th>Role</th><th>IP</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function toCSV() {
    var head = ['Time', 'Name', 'Mobile', 'Email', 'Role', 'IP', 'User agent'];
    var lines = [head.join(',')].concat(rows.map(function (r) {
      return [fmt(r.ts), r.name, r.mobile || '', r.email, r.role, r.ip || '', (r.ua || '').replace(/,/g, ' ')]
        .map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(',');
    }));
    return lines.join('\r\n');
  }

  function load() {
    var out = document.getElementById('out');
    out.innerHTML = '<div class="msg" id="msg">Loading…</div>';
    IPAuth.authFetch('/.netlify/functions/signins', { cache: 'no-store' })
      .then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }); })
      .then(function (res) {
        if (res.s === 403) { out.innerHTML = '<div class="msg err">This log is admin-only. Sign in as Mithu / Admin (name + mi@infinitypax.london) to view it.</div>'; return; }
        if (res.s !== 200) { out.innerHTML = '<div class="msg err">' + esc((res.d && res.d.error) || 'Could not load the log.') + '</div>'; return; }
        rows = (res.d && res.d.signins) || [];
        if (res.d && res.d.unavailable) { out.innerHTML = '<div class="msg">Sign-in logging store is not enabled yet. Deploy on Netlify (Blobs enabled) to start recording.</div>'; return; }
        render();
      })
      .catch(function () { out.innerHTML = '<div class="msg err">Network error loading the log.</div>'; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('q').addEventListener('input', function (e) { q = e.target.value; render(); });
    document.getElementById('refresh').addEventListener('click', load);
    document.getElementById('csv').addEventListener('click', function () {
      var blob = new Blob([toCSV()], { type: 'text/csv' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'infinitypax-signins.csv'; document.body.appendChild(a); a.click(); a.remove();
    });
    IPAuth.protect(function () { load(); });
  });
})();
