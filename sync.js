// Rainbow Stars – Familien-Konto & Abgleich (Supabase): Handy und iPad sehen dieselben Profile, Figuren, Bücher, Freundschaften.
// "Lokal zuerst": alles wird wie bisher auf dem Gerät gespeichert; Änderungen werden gemerkt, hochgeladen und von anderen Geräten geholt.
// Row Level Security im Projekt sorgt dafür, dass jede Familie nur ihre eigenen Daten sieht (siehe SUPABASE-EINRICHTEN.txt).
(() => {
// lädt direkt nach app.js (damit jede Änderung mitgeschrieben wird) – Learn gibt es erst später, daher bei Bedarf holen
const RS = window.RS, idb = RS.idb, C = RS.SUPA, Lr = () => window.Learn;
const on = () => !!(C.url && C.key);
const LOCAL_ONLY = k => k === 'autologin' || k.startsWith('sync:');
const H = (tok, extra = {}) => ({apikey:C.key, Authorization:'Bearer ' + (tok || C.key), 'Content-Type':'application/json', ...extra});
// Originale merken – Abgleich-Schreibvorgänge sollen nicht wieder als "geändert" zählen
const raw = {setP:idb.setP, put:idb.put, del:idb.del};
let session = null, dirty = {kv:{}, cr:{}}, meta = {}, since = '1970-01-01T00:00:00Z', busy = false, lastSync = 0, lastError = '';
const saveState = () => Promise.all([raw.setP('sync:dirty', dirty), raw.setP('sync:meta', meta), raw.setP('sync:since', since)]);
const ready = (async () => { session = await idb.getP('sync:session') || null; dirty = await idb.getP('sync:dirty') || {kv:{}, cr:{}}; meta = await idb.getP('sync:meta') || {}; since = await idb.getP('sync:since') || since; })();

// Änderungen mitschreiben
idb.setP = (k, v) => raw.setP(k, v).then(r => { if (!LOCAL_ONLY(k)){ dirty.kv[k] = Date.now(); meta[k] = new Date().toISOString(); raw.setP('sync:dirty', dirty); soon(); } return r; });
idb.put = v => raw.put(v).then(r => { if (v && v.mine){ dirty.cr[v.id] = 'put'; raw.setP('sync:dirty', dirty); soon(); } return r; });
idb.del = id => raw.del(id).then(r => { dirty.cr[id] = 'del'; raw.setP('sync:dirty', dirty); soon(); return r; });
let soonT = 0; const soon = () => { clearTimeout(soonT); soonT = setTimeout(() => sync(), 2500); };

// ---------- Anmeldung ----------
async function authCall(path, body){
  const r = await fetch(C.url + '/auth/v1/' + path, {method:'POST', headers:H(null), body:JSON.stringify(body)}), d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.msg || d.error_description || d.message || ('Fehler ' + r.status));
  return d;
}
async function keep(d){ session = {access:d.access_token, refresh:d.refresh_token, exp:Date.now() + (d.expires_in || 3600)*1000, email:(d.user && d.user.email) || (session && session.email), uid:d.user && d.user.id}; await raw.setP('sync:session', session); }
async function signUp(email, password){ const d = await authCall('signup', {email, password}); if (!d.access_token) return {confirm:true}; await keep(d); await firstSync(); return {ok:true}; }
async function signIn(email, password){ const d = await authCall('token?grant_type=password', {email, password}); await keep(d); await firstSync(); return {ok:true}; }
async function signOut(){ session = null; await raw.setP('sync:session', null); }
async function token(){
  if (!session) return null;
  if (Date.now() > session.exp - 60e3){ try { await keep(await authCall('token?grant_type=refresh_token', {refresh_token:session.refresh})); } catch(e){ lastError = 'Anmeldung abgelaufen – bitte neu anmelden'; return null; } }
  return session.access;
}
const api = async (path, opts = {}) => { const t = await token(); if (!t) throw new Error('nicht angemeldet');
  const r = await fetch(C.url + path, {...opts, headers:{...H(t), ...(opts.headers || {})}}); if (!r.ok) throw new Error(path.split('?')[0] + ': ' + r.status + ' ' + (await r.text()).slice(0, 120)); return r; };

// ---------- Zusammenführen ----------
const byId = (a = [], b = [], k = x => x.id) => { const m = new Map(); [...a, ...b].forEach(x => m.set(k(x), {...(m.get(k(x)) || {}), ...x})); return [...m.values()]; };
function merge(key, local, remote){
  if (local == null) return remote; if (remote == null) return local;
  if (key === 'profiles' || key === 'parent:books' || key === 'parent:reading') return byId(local, remote);
  if (key === 'friends') return byId(local, remote, x => x.a + '|' + x.b);
  if (key === 'greets') return byId(local, remote, x => x.from + '|' + x.to + '|' + x.at).slice(-30);
  return remote;   // sonst gewinnt der neuere Stand (die Daten von dort)
}
// ---------- Abgleich ----------
async function firstSync(){
  // Beim ersten Anmelden auf diesem Gerät: alles Lokale als "geändert" markieren, damit es ins Konto kommt
  const keys = await allKeys(); keys.filter(k => !LOCAL_ONLY(k)).forEach(k => { dirty.kv[k] = Date.now(); meta[k] = meta[k] || new Date(0).toISOString(); });
  (await idb.all()).filter(r => r.mine).forEach(r => dirty.cr[r.id] = 'put');
  since = '1970-01-01T00:00:00Z'; await saveState(); await sync(true);
}
const allKeys = () => new Promise(ok => { const r = indexedDB.open('rainbow-stars'); r.onsuccess = () => { try { const q = r.result.transaction('progress').objectStore('progress').getAllKeys(); q.onsuccess = () => ok(q.result); q.onerror = () => ok([]); } catch(e){ ok([]); } }; r.onerror = () => ok([]); });
async function sync(first = false){
  await ready;
  if (!on() || !session || busy || !navigator.onLine) return;
  busy = true; const changed = new Set();
  try {
    const uid = session.uid;
    // 1) holen, was andere Geräte geändert haben
    const rows = await (await api(`/rest/v1/family_kv?select=key,value,updated_at&updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc`)).json();
    for (const r of rows){
      if (LOCAL_ONLY(r.key)) continue;
      const local = await idb.getP(r.key), localNewer = dirty.kv[r.key] && meta[r.key] > r.updated_at;
      const val = localNewer && !['profiles','friends','greets','parent:books','parent:reading'].includes(r.key) ? local : merge(r.key, local, r.value);
      await raw.setP(r.key, val); changed.add(r.key); if (!localNewer) meta[r.key] = r.updated_at;
      if (JSON.stringify(val) !== JSON.stringify(r.value) && !dirty.kv[r.key]) dirty.kv[r.key] = Date.now();   // Zusammengeführtes wieder hochladen
      if (r.updated_at > since) since = r.updated_at;
    }
    const crs = await (await api(`/rest/v1/family_creatures?select=*&updated_at=gt.${encodeURIComponent(meta['cr:since'] || '1970-01-01T00:00:00Z')}&order=updated_at.asc`)).json();
    for (const c of crs){
      if (dirty.cr[c.id]) continue;   // hier gerade geändert – unsere Version wird gleich hochgeladen
      if (c.deleted){ await raw.del(c.id); RS.removeFromWorld(c.id); changed.add('creatures'); }
      else { const img = await api(`/storage/v1/object/authenticated/family/${uid}/${c.id}.png`), blob = await img.blob();
        const old = (await idb.all()).find(x => x.id === c.id) || {};
        await raw.put({...old, id:c.id, owner:c.owner, name:c.name, kind:c.kind, world:c.world, book:c.book || undefined, created:c.created, blob, mine:true}); RS.removeFromWorld(c.id); changed.add('creatures'); }
      meta['cr:since'] = c.updated_at;
    }
    // 2) eigene Änderungen hochladen
    for (const k of Object.keys(dirty.kv)){
      const value = await idb.getP(k), at = new Date().toISOString();
      await api('/rest/v1/family_kv?on_conflict=family_id,key', {method:'POST', headers:{Prefer:'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify({family_id:uid, key:k, value: value === undefined ? null : value, updated_at:at})});
      meta[k] = at; delete dirty.kv[k];
    }
    for (const [id, op] of Object.entries(dirty.cr)){
      const at = new Date().toISOString();
      if (op === 'del'){ await api('/rest/v1/family_creatures?on_conflict=id', {method:'POST', headers:{Prefer:'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify({id, family_id:uid, deleted:true, updated_at:at})}); }
      else { const r = (await idb.all()).find(x => x.id === id); if (r && r.blob){
        await api(`/storage/v1/object/family/${uid}/${id}.png`, {method:'POST', headers:{'Content-Type':'image/png', 'x-upsert':'true'}, body:r.blob});
        await api('/rest/v1/family_creatures?on_conflict=id', {method:'POST', headers:{Prefer:'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify({id, family_id:uid, owner:r.owner || null, name:r.name, kind:r.kind, world:r.world || 'home', book:r.book || null, created:r.created, deleted:false, updated_at:at})}); } }
      delete dirty.cr[id];
    }
    lastSync = Date.now(); lastError = '';
  } catch(e){ lastError = e.message; console.warn('Abgleich:', e); }
  busy = false; await saveState();
  if (changed.size) applyChanges(changed);
  dispatchEvent(new CustomEvent('rs:sync', {detail:{changed:[...changed], error:lastError}}));
}
// Geholte Änderungen sichtbar machen
async function applyChanges(changed){
  const L = Lr(); if (!L) return;
  if (changed.has('profiles') && window.Profiles && Profiles.reload) await Profiles.reload();
  if (changed.has('friends') && window.Friends) { await Friends.load(); dispatchEvent(new CustomEvent('rs:friends')); }
  if (changed.has('creatures')) RS.refreshVisibility();
  const me = L.profileId && 'p:' + L.profileId;
  if (me && changed.has(me)){ const v = await idb.getP(me); if (v){ Object.keys(v).forEach(k => { L.P[k] = v[k]; }); L.renderHud(); L.applyWear(); dispatchEvent(new CustomEvent('rs:goodie')); } }
  if ([...changed].some(k => k.startsWith('parent:books'))) dispatchEvent(new CustomEvent('rs:books'));
}
addEventListener('DOMContentLoaded', () => { ready.then(() => sync()); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
addEventListener('online', () => sync());
setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 60e3);

// ---------- KI-Frage zur Lesezeit (Edge Function "book-question") ----------
const aiReady = () => on() && !!C.ai && !!session;
async function bookQuestion(payload){
  const r = await api('/functions/v1/book-question', {method:'POST', body:JSON.stringify(payload)});
  return r.json();
}

// ---------- Oberfläche: Familien-Konto ----------
function accountBox(body, {after} = {}){
  const L = Lr(), { el, btn, row } = L;
  body.append(el('h3', 'albumh', '☁️ Familien-Konto'));
  if (!on()){ body.append(el('p', 'note', 'Noch nicht eingerichtet: Dafür fehlen Projekt-URL und Schlüssel von Supabase (siehe SUPABASE-EINRICHTEN.txt). Bis dahin bleibt alles auf diesem Gerät.')); return; }
  if (session){
    body.append(el('p', 'cardtext', `Angemeldet als ${session.email || 'Familie'}. ` + (lastSync ? 'Zuletzt abgeglichen um ' + new Date(lastSync).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) + '.' : '')));
    if (lastError) body.append(el('p', 'note', '⚠ ' + lastError));
    row(body, [btn('🔄 Jetzt abgleichen', 'small', async () => { await sync(); L.toast(lastError ? '⚠ ' + lastError : '☁️ Abgeglichen'); after && after(); }), btn('Abmelden', 'small', async () => { await signOut(); after && after(); })]);
    return;
  }
  body.append(el('p', 'cardtext', 'Meldet euch auf jedem Gerät einmal an – dann sind Profile, Figuren, Bücher und Freundschaften auf Handy und iPad gleich.'));
  const mk = (type, ph) => { const i = document.createElement('input'); i.type = type; i.placeholder = ph; i.className = 'pininput name'; i.autocomplete = type === 'password' ? 'current-password' : 'email'; body.append(i); return i; };
  const em = mk('email', 'E-Mail eines Elternteils'), pw = mk('password', 'Passwort (mindestens 8 Zeichen)'), msg = el('p', 'note', ''); body.append(msg);
  const go = fn => async () => { msg.textContent = '…'; try { const r = await fn(em.value.trim(), pw.value); msg.textContent = r.confirm ? '📧 Bitte bestätigt zuerst den Link in der E-Mail, dann hier anmelden.' : '✔ Angemeldet – alles wird abgeglichen.'; if (!r.confirm) setTimeout(() => after && after(), 800); } catch(e){ msg.textContent = '⚠ ' + e.message; } };
  row(body, [btn('Anmelden', 'small main', go(signIn)), btn('Neues Konto erstellen', 'small', go((e, p) => { if (p.length < 8) throw new Error('Das Passwort braucht mindestens 8 Zeichen.'); return signUp(e, p); }))]);
}
window.Sync = {sync, signIn, signUp, signOut, aiReady, bookQuestion, accountBox, get session(){ return session; }, get configured(){ return on(); }, get lastError(){ return lastError; }, ready};
})();
