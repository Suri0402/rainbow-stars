// Rainbow Stars – Bedürfnisse der Figur: Wissen, Hunger (Sattheit), Spaß (gegen Langeweile), Energie.
// Sie ändern sich gemütlich über den Tag – auch bei geschlossener App, berechnet aus der vergangenen Zeit.
// Nie bestrafend: Die Figur wird höchstens traurig oder müde und sagt, was ihr fehlt.
(() => {
const RS = window.RS, L = window.Learn, { el, btn, row } = L, $ = RS.$;
const H = 3600e3;
const NEEDS = [
  {id:'wissen', icon:'🧠', name:'Wissen', per:100/36, low:'Ich möchte etwas Neues lernen – lösen wir ein Rätsel?', act:'rätseln'},
  {id:'hunger', icon:'🍎', name:'Satt', per:100/24, low:'Ich hab Hunger! Für jedes gelöste Rätsel gibt es etwas zu essen.', act:'füttern'},
  {id:'spass', icon:'📚', name:'Spaß', per:100/48, low:'Mir ist langweilig … liest du heute 30 Minuten in deinem Buch?', act:'lesen'},
  {id:'energie', icon:'😴', name:'Energie', per:0, low:'Ich bin so müde … ich möchte in meinem Bett schlafen.', act:'schlafen'},
];
const FOOD = {apfel:{icon:'🍎', name:'Apfel', v:15, w:45}, brezel:{icon:'🥨', name:'Brezel', v:20, w:25}, erdbeere:{icon:'🍓', name:'Erdbeeren', v:20, w:22}, kuchen:{icon:'🍰', name:'Kuchen', v:35, w:8}};
const P = L.P;
const N = () => P.needs || (P.needs = {wissen:80, hunger:80, spass:80, energie:90, at:Date.now()});
const clamp = v => Math.max(0, Math.min(100, v));
// Zeit seit dem letzten Mal nachholen: Wissen/Hunger/Spaß sinken, Energie erholt sich (+5 pro Std.), solange die App zu war
function catchUp(now = Date.now(), closed = false){
  const n = N(), h = Math.max(0, (now - n.at)/H);
  NEEDS.forEach(d => { if (d.per) n[d.id] = clamp(n[d.id] - d.per*h); });
  if (closed) n.energie = clamp(n.energie + 5*h);
  n.at = now;
}
let ready = false, lastSave = 0;
addEventListener('rs:profile', () => { catchUp(Date.now(), true); ready = true; P.food = P.food || {apfel:2}; L.save(); render(); mood(); });
document.addEventListener('visibilitychange', () => { if (!ready) return; if (document.visibilityState === 'visible'){ catchUp(Date.now(), true); render(); } else { catchUp(); L.save(); } });
RS.onTick(dt => {
  if (!ready || RS.paused) return;
  const n = N(), now = Date.now();
  // beim Herumlaufen und Spielen sinkt die Energie (etwa 2 Std. aktives Spielen); im Haus-Bett steigt sie
  if (sleeping) n.energie = clamp(sleepFrom + (now - sleepStart)/60e3*100);   // nach der Uhr, nicht nach Bildern – auch auf langsamen Geräten in 1 Minute voll
  else if (RS.st.state === 'walk' || RS.st.state === 'act') n.energie = clamp(n.energie - dt*100/(2*3600));
  if (now - n.at > 5000){ catchUp(now); render(); mood(); }
  if (now - lastSave > 30000){ lastSave = now; L.save(); }
});
// ---------- Auffüllen ----------
const change = (id, v) => { const n = N(); n[id] = clamp(n[id] + v); L.save(); render(); mood(); };
function pickFood(){ const tot = Object.values(FOOD).reduce((s, f) => s + f.w, 0); let r = Math.random()*tot; for (const [k, f] of Object.entries(FOOD)){ r -= f.w; if (r <= 0) return k; } return 'apfel'; }
addEventListener('rs:solved', e => { if (!ready) return; change('wissen', 15); const k = pickFood(); P.food[k] = (P.food[k] || 0) + 1; L.save();
  const c = e.detail && e.detail.container; if (c) c.append(el('p', 'needgain', `🧠 +15 Wissen · ${FOOD[k].icon} +1 ${FOOD[k].name} für den Vorrat`)); });
addEventListener('rs:card', () => { if (ready) change('wissen', 5); });
addEventListener('rs:bookdone', () => { if (ready){ const n = N(); n.spass = 100; L.save(); render(); mood(); } });
function feed(k){
  if (!(P.food[k] > 0)) return;
  P.food[k]--; change('hunger', FOOD[k].v);
  for (let i=0;i<5;i++) RS.spawn(RS.fxTex.heart, RS.st.pos.clone().add(new RS.V3((Math.random()-.5)*.6, 1.8 + Math.random()*.3, 0)), new RS.V3(0, .5, 0), 1.4, .2);   // Herzchen beim Essen
  RS.setStatus && RS.setStatus('mampft ' + FOOD[k].name + ' – lecker! ' + FOOD[k].icon);
  L.toast(FOOD[k].icon + ' Lecker! Satt +' + FOOD[k].v);
}
let sleeping = false, sleepT = 0, sleepStart = 0, sleepFrom = 0;
function sleep(){ sleeping = true; sleepStart = Date.now(); sleepFrom = N().energie; clearTimeout(sleepT); RS.setStatus('schläft … Zzz 💤'); sleepT = setTimeout(() => { sleeping = false; N().energie = 100; L.save(); render(); RS.setStatus('ist ausgeschlafen ✦'); L.toast('😴 Ausgeschlafen – Energie voll!'); mood(); }, 60e3); }
function wake(){ if (!sleeping) return; sleeping = false; clearTimeout(sleepT); }
addEventListener('rs:world', () => { if (RS.worldId !== 'house') wake(); });

// ---------- Anzeige ----------
function render(){
  const hud = $('needsHud'); if (!hud) return; hud.hidden = !ready;
  const n = N(); hud.replaceChildren(...NEEDS.map(d => { const s = el('span', 'need' + (n[d.id] < 25 ? ' low' : '')); s.title = d.name;
    const bar = el('i'); bar.style.width = Math.round(n[d.id]) + '%'; const track = el('b'); track.append(bar); s.append(el('em', '', d.icon), track); return s; }));
}
$('needsHud').onclick = () => openNeeds();
function openNeeds(){
  catchUp(); const n = N();
  L.openSheet('Wie geht’s dir?', body => {
    NEEDS.forEach(d => { const r2 = el('div', 'needrow'), bar = el('i'), track = el('b'); bar.style.width = Math.round(n[d.id]) + '%'; track.append(bar);
      r2.append(el('span', 'nicon', d.icon), el('span', 'nname', d.name), track, el('span', 'nval', Math.round(n[d.id]) + ' %')); body.append(r2);
      if (n[d.id] < 35) body.append(el('p', 'note', '„' + d.low + '“')); });
    body.append(el('h3', 'albumh', '🧺 Vorrat'));
    const box = el('div', 'things'), have = Object.entries(FOOD).filter(([k]) => P.food[k] > 0);
    if (!have.length) box.append(el('p', 'note', 'Leer – löse ein Rätsel, dann gibt es etwas zu essen.'));
    have.forEach(([k, f]) => box.append(btn(`${f.icon} ${f.name} ×${P.food[k]} · füttern`, 'small main', () => { feed(k); openNeeds(); })));
    body.append(box);
    row(body, [btn('🧠 Rätsel lösen', '', () => window.Raetsel && Raetsel.openHub()), btn('📚 Lesen', '', () => window.Books && Books.openRead()),
               btn('😴 Schlafen gehen', '', () => { L.closeSheet(); if (RS.W.house){ if (RS.worldId !== 'house') L.travel('house'); setTimeout(() => window.House && House.goToBed(), RS.worldId === 'house' ? 0 : 1800); } else sleep(); })]);
    row(body, [btn('Schließen', '', L.closeSheet)]);
  });
}
// ---------- Stimmung und Wünsche ----------
let wishAt = 0;
function lowest(){ const n = N(); return NEEDS.map(d => [d, n[d.id]]).sort((a, b) => a[1] - b[1])[0]; }
function mood(){
  const n = N(), tired = n.energie < 20, sad = Math.min(n.wissen, n.hunger, n.spass) < 20;
  RS.setMood(sleeping ? null : tired ? 'tired' : sad ? 'sad' : null, tired ? .6 : 1);
  const chip = $('wishChip'), [d, v] = lowest();
  if (v >= 30 || sleeping){ chip.hidden = true; return; }
  chip.hidden = false; chip.querySelector('span').textContent = d.icon + ' ' + d.low; chip.onclick = () => {
    if (d.id === 'spass') window.Books && Books.openRead(); else if (d.id === 'energie') openNeeds(); else if (d.id === 'hunger' && Object.values(P.food || {}).some(x => x > 0)) openNeeds(); else window.Raetsel && Raetsel.openHub(); };
  if (Date.now() - wishAt > 120e3 && RS.st.state === 'idle'){ wishAt = Date.now(); RS.setStatus(d.low); }
}
window.Needs = {get values(){ return {...N()}; }, change, feed, sleep, wake, open:openNeeds, catchUp, FOOD, get sleeping(){ return sleeping; }};
})();
