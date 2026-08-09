/* Infinity Pax — client sign-in gate (single step, no email verification).
 * Team members: full name + mobile (must match the roll) + email.
 * Mithu / Admin: name + email (mi@infinitypax.london) — mobile not required.
 * Real enforcement is server-side (functions/roster.js validates the session);
 * this overlay is the UX layer. On a protected page call:
 *   IPAuth.protect(function(session){ ... load data via IPAuth.authFetch ... });
 */
(function (global) {
  'use strict';
  var LS = 'ip_session';
  var onReady = null, overlay = null;

  function session() { try { return localStorage.getItem(LS) || null; } catch (e) { return null; } }
  function setSession(s) { try { localStorage.setItem(LS, s); } catch (e) {} }
  function clear() { try { localStorage.removeItem(LS); } catch (e) {} }

  function authFetch(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {}, { 'Authorization': 'Bearer ' + (session() || '') });
    return fetch(url, opts).then(function (r) { if (r.status === 401) { clear(); show(); } return r; });
  }
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  var STYLE = '\
  .ipauth-overlay{position:fixed;inset:0;z-index:9999;background:var(--paper,#fff);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:7vh 16px}\
  .ipauth-card{width:100%;max-width:440px;border:1px solid var(--ink,#0a0a0a);padding:26px 26px 30px;background:var(--paper,#fff)}\
  .ipauth-brand{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--ink,#0a0a0a);padding-bottom:14px;margin-bottom:18px}\
  .ipauth-brand img{height:30px}\
  .ipauth-brand .wm{font-family:var(--display);text-transform:uppercase;letter-spacing:.18em;font-size:13px;color:var(--ink)}\
  .ipauth-eyebrow{font-family:var(--display);text-transform:uppercase;letter-spacing:.22em;font-size:10px;color:var(--meta,#6e6e6e)}\
  .ipauth-h{font-family:var(--display);text-transform:uppercase;letter-spacing:.04em;font-size:22px;color:var(--ink);margin:6px 0 4px}\
  .ipauth-p{font-family:var(--body);font-size:12px;line-height:1.55;color:var(--ink-2,#3a3a3a);margin:0 0 16px}\
  .ipauth-field{margin-bottom:12px}\
  .ipauth-field label{display:block;font-family:var(--display);text-transform:uppercase;letter-spacing:.14em;font-size:9px;color:var(--meta);margin-bottom:5px}\
  .ipauth-field .hint{text-transform:none;letter-spacing:0;color:var(--meta);font-family:var(--body);font-size:10px;margin-left:6px}\
  .ipauth-field input{width:100%;font-family:var(--body);font-size:13px;color:var(--ink);background:var(--paper);border:1px solid var(--hair-soft,#d2d2d2);padding:11px 12px}\
  .ipauth-field input:focus-visible{outline:2px solid var(--ink);outline-offset:1px}\
  .ipauth-btn{width:100%;font-family:var(--display);text-transform:uppercase;letter-spacing:.14em;font-size:11px;color:var(--paper);background:var(--ink);border:1px solid var(--ink);padding:13px;cursor:pointer;margin-top:4px}\
  .ipauth-btn:hover{background:var(--ink-2,#3a3a3a)} .ipauth-btn:disabled{opacity:.5;cursor:default}\
  .ipauth-msg{font-family:var(--body);font-size:11.5px;line-height:1.5;margin:12px 0 0;min-height:1em}\
  .ipauth-msg.err{color:var(--ink);border-left:2px solid var(--ink);padding-left:10px}\
  .ipauth-msg.ok{color:var(--meta)}\
  .ipauth-foot{font-family:var(--body);font-size:10.5px;color:var(--meta);margin-top:18px;line-height:1.5}\
  .ipauth-signout{position:fixed;top:12px;right:14px;z-index:50;font-family:var(--display);text-transform:uppercase;letter-spacing:.12em;font-size:9px;color:var(--ink);background:var(--paper);border:1px solid var(--ink);padding:7px 12px;cursor:pointer}\
  .ipauth-signout:hover{background:var(--ink);color:var(--paper)}';

  function ensureStyle() {
    if (document.getElementById('ipauth-style')) return;
    var s = document.createElement('style'); s.id = 'ipauth-style'; s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function render() {
    var logo = (window.IPAUTH_LOGO || 'assets/img/logo-black.png');
    overlay.innerHTML =
      '<div class="ipauth-card">' +
        '<div class="ipauth-brand"><img src="' + logo + '" alt="INFINITYPAX"><span class="wm">Infinity Pax</span></div>' +
        '<div class="ipauth-eyebrow">Restricted · Team access</div>' +
        '<div class="ipauth-h">Sign in to view jobs</div>' +
        '<p class="ipauth-p">Team members: enter your full name and mobile exactly as held on the Infinity Pax roll, plus your email. Admin / Mithu: enter your name and admin email (mobile not required).</p>' +
        '<div class="ipauth-field"><label>Full name</label><input id="ip-name" type="text" autocomplete="name" placeholder="e.g. Miraj Bishwakarma"></div>' +
        '<div class="ipauth-field"><label>Mobile<span class="hint">— team members</span></label><input id="ip-mobile" type="tel" autocomplete="tel" placeholder="07…"></div>' +
        '<div class="ipauth-field"><label>Email</label><input id="ip-email" type="email" autocomplete="email" placeholder="you@email.com"></div>' +
        '<button class="ipauth-btn" id="ip-enter">View jobs</button>' +
        '<div class="ipauth-msg" id="ip-msg"></div>' +
        '<div class="ipauth-foot">Access is limited to Infinity Pax personnel listed on the team roll.</div>' +
      '</div>';
    wire();
  }

  function msg(text, kind) { var m = document.getElementById('ip-msg'); if (m) { m.textContent = text || ''; m.className = 'ipauth-msg' + (kind ? ' ' + kind : ''); } }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

  function wire() {
    var btn = document.getElementById('ip-enter');
    function submit() {
      var name = val('ip-name'), mobile = val('ip-mobile'), email = val('ip-email');
      if (!name || !email) return msg('Please enter your name and email.', 'err');
      btn.disabled = true; msg('Signing in…', 'ok');
      post('/.netlify/functions/signin', { fullName: name, mobile: mobile, email: email })
        .then(function (r) {
          btn.disabled = false;
          if (!r.ok) return msg((r.d && r.d.error) || 'Could not sign in.', 'err');
          finish(r.d.session);
        }).catch(function () { btn.disabled = false; msg('Network error — please try again.', 'err'); });
    }
    btn.addEventListener('click', submit);
    ['ip-name', 'ip-mobile', 'ip-email'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') submit(); });
    });
  }

  function finish(sess) { setSession(sess); hide(); mountSignOut(); if (onReady) onReady(sess); }

  function show() {
    ensureStyle();
    if (!overlay) { overlay = document.createElement('div'); overlay.className = 'ipauth-overlay'; document.body.appendChild(overlay); }
    overlay.style.display = 'flex'; render();
    var so = document.querySelector('.ipauth-signout'); if (so) so.remove();
  }
  function hide() { if (overlay) overlay.style.display = 'none'; }

  function mountSignOut() {
    if (document.querySelector('.ipauth-signout')) return;
    var b = document.createElement('button'); b.className = 'ipauth-signout'; b.textContent = 'Sign out';
    b.addEventListener('click', function () { clear(); location.reload(); });
    document.body.appendChild(b);
  }

  function protect(cb) {
    onReady = cb; ensureStyle();
    if (session()) { mountSignOut(); cb(session()); } else show();
  }

  global.IPAuth = { session: session, setSession: setSession, clear: clear, authFetch: authFetch, protect: protect, signOut: function () { clear(); location.reload(); } };
})(window);
