/* Infinity Pax — client sign-in gate.
 * Protects a page: shows a login overlay until the visitor has a valid session.
 * Real enforcement is server-side (functions/roster.js validates the session);
 * this overlay is the UX layer. Include on protected pages, then call
 *   IPAuth.protect(function(session){ ... load data via IPAuth.authFetch ... });
 */
(function (global) {
  'use strict';
  var LS = 'ip_session';
  var onReady = null;

  function session() { try { return localStorage.getItem(LS) || null; } catch (e) { return null; } }
  function setSession(s) { try { localStorage.setItem(LS, s); } catch (e) {} }
  function clear() { try { localStorage.removeItem(LS); } catch (e) {} }

  function authFetch(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {}, { 'Authorization': 'Bearer ' + (session() || '') });
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) { clear(); show(); }
      return r;
    });
  }

  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
  }

  var STYLE = '\
  .ipauth-overlay{position:fixed;inset:0;z-index:9999;background:var(--paper,#fff);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:6vh 16px}\
  .ipauth-card{width:100%;max-width:440px;border:1px solid var(--ink,#0a0a0a);padding:26px 26px 30px;background:var(--paper,#fff)}\
  .ipauth-brand{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--ink,#0a0a0a);padding-bottom:14px;margin-bottom:18px}\
  .ipauth-brand img{height:30px}\
  .ipauth-brand .wm{font-family:var(--display);text-transform:uppercase;letter-spacing:.18em;font-size:13px;color:var(--ink)}\
  .ipauth-eyebrow{font-family:var(--display);text-transform:uppercase;letter-spacing:.22em;font-size:10px;color:var(--meta,#6e6e6e)}\
  .ipauth-h{font-family:var(--display);text-transform:uppercase;letter-spacing:.04em;font-size:22px;color:var(--ink);margin:6px 0 4px}\
  .ipauth-p{font-family:var(--body);font-size:12px;line-height:1.55;color:var(--ink-2,#3a3a3a);margin:0 0 16px}\
  .ipauth-tabs{display:flex;gap:8px;margin-bottom:16px}\
  .ipauth-tabs button{flex:1;font-family:var(--display);text-transform:uppercase;letter-spacing:.08em;font-size:9.5px;color:var(--ink-2);background:var(--paper);border:1px solid var(--hair,#0a0a0a);padding:10px;cursor:pointer}\
  .ipauth-tabs button.active{background:var(--ink);color:var(--paper)}\
  .ipauth-field{margin-bottom:12px}\
  .ipauth-field label{display:block;font-family:var(--display);text-transform:uppercase;letter-spacing:.14em;font-size:9px;color:var(--meta);margin-bottom:5px}\
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

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  var overlay = null, st = { tab: 'member', token: null, email: null };

  function memberForm() {
    return '<div class="ipauth-eyebrow">Restricted · Team access</div>' +
      '<div class="ipauth-h">Sign in to view jobs</div>' +
      '<p class="ipauth-p">Enter your full name and mobile exactly as held on the Infinity Pax roll, plus your email. We’ll email you a 6-digit code to verify it.</p>' +
      '<div class="ipauth-field"><label>Full name</label><input id="ip-name" type="text" autocomplete="name" placeholder="e.g. Miraj Bishwakarma"></div>' +
      '<div class="ipauth-field"><label>Mobile</label><input id="ip-mobile" type="tel" autocomplete="tel" placeholder="07…"></div>' +
      '<div class="ipauth-field"><label>Email</label><input id="ip-email" type="email" autocomplete="email" placeholder="you@email.com"></div>' +
      '<button class="ipauth-btn" id="ip-send">Email me a code</button>';
  }
  function codeForm() {
    return '<div class="ipauth-eyebrow">Restricted · Team access</div>' +
      '<div class="ipauth-h">Enter your code</div>' +
      '<p class="ipauth-p">We’ve emailed a 6-digit code to <b>' + esc(st.email) + '</b>. Enter it below to continue. It expires in 10 minutes.</p>' +
      '<div class="ipauth-field"><label>Verification code</label><input id="ip-code" type="text" inputmode="numeric" maxlength="6" placeholder="000000"></div>' +
      '<button class="ipauth-btn" id="ip-verify">Verify &amp; enter</button>' +
      '<button class="ipauth-btn" id="ip-back" style="background:var(--paper);color:var(--ink);margin-top:8px">Use a different email</button>';
  }
  function adminForm() {
    return '<div class="ipauth-eyebrow">Restricted · Admin</div>' +
      '<div class="ipauth-h">Admin / Ops sign-in</div>' +
      '<p class="ipauth-p">Mithu &amp; Admin: enter the admin passcode to view all jobs without the email step.</p>' +
      '<div class="ipauth-field"><label>Admin passcode</label><input id="ip-pass" type="password" autocomplete="off" placeholder="Passcode"></div>' +
      '<button class="ipauth-btn" id="ip-admin">Sign in</button>';
  }

  function render() {
    var logo = (window.IPAUTH_LOGO || 'assets/img/logo-black.png');
    var inner = st.tab === 'admin' ? adminForm() : (st.token ? codeForm() : memberForm());
    overlay.innerHTML =
      '<div class="ipauth-card">' +
        '<div class="ipauth-brand"><img src="' + logo + '" alt="INFINITYPAX"><span class="wm">Infinity Pax</span></div>' +
        '<div class="ipauth-tabs">' +
          '<button data-tab="member" class="' + (st.tab === 'member' ? 'active' : '') + '">Team member</button>' +
          '<button data-tab="admin" class="' + (st.tab === 'admin' ? 'active' : '') + '">Admin / Mithu</button>' +
        '</div>' + inner +
        '<div class="ipauth-msg" id="ip-msg"></div>' +
        '<div class="ipauth-foot">Access is limited to Infinity Pax personnel. Verification emails come from accounts@infinitypax.london.</div>' +
      '</div>';
    wire();
  }

  function msg(text, kind) { var m = document.getElementById('ip-msg'); if (m) { m.textContent = text || ''; m.className = 'ipauth-msg' + (kind ? ' ' + kind : ''); } }

  function wire() {
    Array.prototype.forEach.call(overlay.querySelectorAll('.ipauth-tabs button'), function (b) {
      b.addEventListener('click', function () { st.tab = b.getAttribute('data-tab'); st.token = null; render(); });
    });
    var send = document.getElementById('ip-send');
    if (send) send.addEventListener('click', function () {
      var name = val('ip-name'), mobile = val('ip-mobile'), email = val('ip-email');
      if (!name || !mobile || !email) return msg('Please fill in all three fields.', 'err');
      send.disabled = true; msg('Sending your code…', 'ok');
      post('/.netlify/functions/auth-request', { fullName: name, mobile: mobile, email: email })
        .then(function (r) {
          send.disabled = false;
          if (!r.ok) return msg((r.d && r.d.error) || 'Could not send the code.', 'err');
          st.token = r.d.token; st.email = email; render();
        }).catch(function () { send.disabled = false; msg('Network error — please try again.', 'err'); });
    });
    var verify = document.getElementById('ip-verify');
    if (verify) verify.addEventListener('click', function () {
      var code = val('ip-code');
      if (!code) return msg('Enter the 6-digit code.', 'err');
      verify.disabled = true; msg('Verifying…', 'ok');
      post('/.netlify/functions/auth-verify', { token: st.token, code: code, email: st.email })
        .then(function (r) {
          verify.disabled = false;
          if (!r.ok) return msg((r.d && r.d.error) || 'Incorrect code.', 'err');
          finish(r.d.session);
        }).catch(function () { verify.disabled = false; msg('Network error — please try again.', 'err'); });
    });
    var back = document.getElementById('ip-back');
    if (back) back.addEventListener('click', function () { st.token = null; render(); });
    var admin = document.getElementById('ip-admin');
    if (admin) admin.addEventListener('click', function () {
      var pass = val('ip-pass');
      if (!pass) return msg('Enter the admin passcode.', 'err');
      admin.disabled = true; msg('Signing in…', 'ok');
      post('/.netlify/functions/auth-admin', { passcode: pass })
        .then(function (r) {
          admin.disabled = false;
          if (!r.ok) return msg((r.d && r.d.error) || 'Incorrect passcode.', 'err');
          finish(r.d.session);
        }).catch(function () { admin.disabled = false; msg('Network error — please try again.', 'err'); });
    });
  }

  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function finish(sess) { setSession(sess); hide(); mountSignOut(); if (onReady) onReady(sess); }

  function show() {
    ensureStyle();
    if (!overlay) { overlay = document.createElement('div'); overlay.className = 'ipauth-overlay'; document.body.appendChild(overlay); }
    overlay.style.display = 'flex'; st = { tab: 'member', token: null, email: null }; render();
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
    if (session()) { mountSignOut(); cb(session()); }
    else show();
  }

  global.IPAuth = { session: session, setSession: setSession, clear: clear, authFetch: authFetch, protect: protect, signOut: function () { clear(); location.reload(); } };
})(window);
