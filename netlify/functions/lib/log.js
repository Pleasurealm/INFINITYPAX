/* Sign-in log backed by Netlify Blobs.
 * Best-effort: if Blobs is unavailable the app still works, logging just no-ops.
 * Entries: { ts, name, mobile, email, role, ip, ua }
 */
let getStore = null;
try { ({ getStore } = require('@netlify/blobs')); } catch (e) { getStore = null; }

function store() {
  if (!getStore) return null;
  try { return getStore('ip-signins'); } catch (e) { return null; }
}

async function addSignin(entry) {
  const s = store();
  if (!s) return false;
  const key = 'e/' + entry.ts + '-' + Math.random().toString(36).slice(2, 8);
  try { await s.setJSON(key, entry); return true; } catch (e) { return false; }
}

async function listSignins(limit) {
  const s = store();
  if (!s) return null; // null => store unavailable (distinct from empty list)
  try {
    const res = await s.list({ prefix: 'e/' });
    const blobs = (res && res.blobs) || [];
    const items = await Promise.all(blobs.map(function (b) {
      return s.get(b.key, { type: 'json' }).catch(function () { return null; });
    }));
    return items.filter(Boolean).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }).slice(0, limit || 1000);
  } catch (e) { return null; }
}

module.exports = { addSignin: addSignin, listSignins: listSignins, available: function () { return !!store(); } };
