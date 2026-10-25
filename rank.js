// Rainbow Stars – Wer viel liest, sieht man: Lese-Abzeichen mit Titel (über der Hauptfigur, am Haus, im Profil),
// Lese-Münzen 📖 (nur fürs Lesen) für Fahrzeuge – und die Hauptfiguren der Geschwister zeigen ihr Abzeichen und Fahrzeug auf der Wiese.
(() => {
const RS = window.RS, L = window.Learn, P = L.P, E = (e, s) => window.Rewards.emojiCanvas(e, s);
const RANKS = [
  {n:1, icon:'🥉', name:'Bronze-Lesestern', title:'Leseratte'},
  {n:3, icon:'🥈', name:'Silber-Lesestern', title:'Bücherwurm'},
  {n:5, icon:'🥇', name:'Gold-Lesestern', title:'Lese-Profi'},
  {n:10, icon:'👑', name:'Regenbogen-Krone', title:'Lese-Star'},
];
const confirmedOf = (books, kid) => books.filter(b => ((b.status || {})[kid] || {}).confirmed);
async function booksOf(kid){ return confirmedOf((await RS.idb.getP('parent:books')) || [], kid).length; }
function rankFor(n){ let r = null; RANKS.forEach(x => { if (n >= x.n) r = x; }); const next = RANKS.find(x => x.n > n) || null; return {n, ...(r || {icon:'', title:'', name:''}), next}; }
async function of(kid){ return rankFor(await booksOf(kid)); }
const cache = {};   // Profil-ID -> Rang (für Profilauswahl und Namensschilder)

// ---------- Lese-Münzen ----------
function addLm(n, why){ P.lm = (P.lm || 0) + n; L.save(); L.renderHud(); L.toast('📖 +' + n + ' Lese-' + (n === 1 ? 'Münze' : 'Münzen') + (why ? ' · ' + why : '')); }
// jedes bestätigte Buch gibt einmal 📖 5 – auch wenn die Eltern es auf einem anderen Gerät bestätigt haben
async function creditBooks(){
  if (!RS.owner) return; const list = confirmedOf((await RS.idb.getP('parent:books')) || [], RS.owner);
  P.lmBooks = P.lmBooks || []; const fresh = list.filter(b => !P.lmBooks.includes(b.id)); if (!fresh.length) return;
  fresh.forEach(b => P.lmBooks.push(b.id)); L.save(); setTimeout(() => addLm(5*fresh.length, fresh.length === 1 ? '„' + fresh[0].title + '“ gelesen' : fresh.length + ' Bücher gelesen'), 2500);
}

// ---------- eigene Hauptfigur, Profil-Chip ----------
let mine = null;
async function refreshMine(celebrate = false){
  if (!RS.owner) return; const before = mine, r = await of(RS.owner); mine = r; cache[RS.owner] = r;
  RS.setBadge(r.icon ? E(r.icon, 140) : null);
  const p = window.Profiles && Profiles.current, chip = RS.$('profileChip'); if (p && chip) chip.textContent = p.avatar + ' ' + p.name + (r.icon ? ' ' + r.icon : '');
  if (celebrate && r.icon && (!before || before.icon !== r.icon)) celebrateRank(r);
}
function celebrateRank(r){
  const show = () => L.openSheet('🎉 Neues Lese-Abzeichen!', body => {
    const st = L.el('div', 'stamp big', r.icon); body.append(st);
    body.append(L.el('p', 'cardtext', `Du hast ${r.n} ${r.n === 1 ? 'Buch' : 'Bücher'} gelesen und bist jetzt ${r.title === 'Leseratte' ? 'eine' : 'ein'} ${r.title}! Dein ${r.name} leuchtet über deiner Figur und an deinem Haus – alle auf der Wiese können es sehen.`));
    if (r.next) body.append(L.el('p', 'note', `Nächstes Abzeichen: ${r.next.icon} ${r.next.title} ab ${r.next.n} Büchern.`));
    L.row(body, [L.btn('Juhu! ✦', 'main', L.closeSheet)]); });
  const wait = () => { if (RS.$('learn').hidden) { show(); setTimeout(() => RS.say(`Juhu! Ich bin jetzt ${r.title === 'Leseratte' ? 'eine' : 'ein'} ${r.title}! ${r.icon}`, {prio:3, ms:9000}), 600); } else setTimeout(wait, 700); };
  setTimeout(wait, 1200);   // erst wenn die Buch-Karte zu ist
}

// ---------- Hauptfiguren der Geschwister: Abzeichen und Fahrzeug an ihrer Figur auf der Wiese ----------
async function decorateOthers(){
  if (!RS.owner || !window.Profiles) return;
  for (const p of Profiles.list.filter(x => x.id !== RS.owner)){
    const pp = (await RS.idb.getP('p:' + p.id)) || {}, r = await of(p.id); cache[p.id] = r;
    if (!pp.hero || pp.hero === 'girl') continue;
    const a = RS.world.get(pp.hero); if (!a || a.gone) continue;
    const rideIt = pp.ride && (pp.items || {})[pp.ride] && Rewards.byId[pp.ride], key = (r.icon || '-') + '|' + (rideIt ? rideIt.id : '-');
    if (a.rankKey === key) continue;
    (a.rankMeshes || []).forEach(m => { m.parent && m.parent.remove(m); m.material.map.dispose(); }); a.rankMeshes = []; a.fl.position.y = 0;
    const flat = m => { const i = RS.bills.indexOf(m); if (i >= 0) RS.bills.splice(i, 1); const j = RS.fadeables.indexOf(m); if (j >= 0) RS.fadeables.splice(j, 1); return m; };   // dreht sich schon mit der Figur
    const h = a.mesh.geometry.parameters.height;
    if (r.icon){ const b = flat(RS.bill(E(r.icon, 120), .36, a.body)); b.position.y = h + .12; a.rankMeshes.push(b); }
    if (rideIt){ const v = flat(RS.bill(Rewards.rideCanvas(rideIt), rideIt.w*.8, a.bb)); if (rideIt.ox) v.geometry.translate(rideIt.ox*.8, 0, 0); v.position.z = -.05; a.fl.position.y = rideIt.lift*.8 + (rideIt.float || 0)*.6; v.position.y = (rideIt.float || 0)*.6; a.rankMeshes.push(v); }
    a.rankKey = key;
  }
}
// Profilauswahl beim Start: Abzeichen neben dem Namen
async function fillCache(){ for (const p of (await RS.idb.getP('profiles')) || []) cache[p.id] = await of(p.id); decorateChooser(); }
function decorateChooser(){ document.querySelectorAll('#loginBox .profbtn[data-pid]').forEach(b => { const r = cache[b.dataset.pid]; if (r && r.icon && !b.querySelector('.rk')){ const s = document.createElement('span'); s.className = 'rk'; s.textContent = ' ' + r.icon; b.append(s); } }); }
new MutationObserver(decorateChooser).observe(RS.$('loginBox'), {childList:true, subtree:true});
fillCache();

addEventListener('rs:profile', () => { refreshMine(); creditBooks(); setTimeout(decorateOthers, 1500); });
addEventListener('rs:books', () => { refreshMine(true); creditBooks(); });
addEventListener('rs:bookdone', () => setTimeout(() => { refreshMine(true); creditBooks(); }, 300));
addEventListener('rs:sync', () => { refreshMine(); creditBooks(); decorateOthers(); });
setInterval(() => { if (RS.owner && RS.worldId === 'home') decorateOthers(); }, 4000);   // Figuren erscheinen nach und nach
window.Rank = {RANKS, booksOf, of, rankFor, addLm, get mine(){ return mine; }, cache, decorateOthers};
})();
