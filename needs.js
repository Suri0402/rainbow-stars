// Rainbow Stars – Bedürfnisse der Figur: Wissen (Rätsel), Hunger/Sattheit (Essen aus Rätseln), Energie (nur durchs Lesen).
// Sie ändern sich gemütlich über den Tag – auch bei geschlossener App, berechnet aus der vergangenen Zeit.
// Nie bestrafend: Die Figur wird höchstens traurig oder müde und sagt, was ihr fehlt – und führt so durchs Spiel.
(() => {
const RS = window.RS, L = window.Learn, { el, btn, row } = L, $ = RS.$;
const H = 3600e3;
const NEEDS = [
  {id:'wissen', icon:'🧠', name:'Wissen', per:100/36, low:'Ich möchte etwas Neues lernen – gehen wir zur Rätsel-Eule? 🦉'},
  {id:'hunger', icon:'🍎', name:'Satt', per:100/24, low:'Ich hab Hunger! Für jedes gelöste Rätsel gibt es etwas zu essen.'},
  {id:'energie', icon:'😴', name:'Energie', per:100/36, low:'Ich bin so müde … Liest du mir ein Buch vor? 📚'},
];
const FOOD = {apfel:{icon:'🍎', name:'Apfel', v:15, w:45}, brezel:{icon:'🥨', name:'Brezel', v:20, w:25}, erdbeere:{icon:'🍓', name:'Erdbeeren', v:20, w:22}, kuchen:{icon:'🍰', name:'Kuchen', v:35, w:8}};
const P = L.P;
const N = () => { const n = P.needs || (P.needs = {wissen:80, hunger:80, energie:80, at:Date.now()});
  if (n.spass !== undefined){ n.energie = Math.min(n.energie ?? 80, n.spass); delete n.spass; }   // früher: Spaß + Energie -> jetzt nur Energie (vom Lesen)
  return n; };
const clamp = v => Math.max(0, Math.min(100, v));
// Zeit seit dem letzten Mal nachholen: alles sinkt langsam – Energie füllt nur das Lesen wieder auf
function catchUp(now = Date.now()){
  const n = N(), h = Math.max(0, (now - n.at)/H);
  NEEDS.forEach(d => { n[d.id] = clamp(n[d.id] - d.per*h); });
  n.at = now;
}
let ready = false, lastSave = 0;
addEventListener('rs:profile', () => { catchUp(); ready = true; P.food = P.food || {apfel:2}; L.save(); render(); mood(); });
document.addEventListener('visibilitychange', () => { if (!ready) return; if (document.visibilityState === 'visible'){ catchUp(); render(); } else { catchUp(); L.save(); } });
RS.onTick(dt => {
  if (!ready || RS.paused) return;
  const n = N(), now = Date.now();
  // beim Herumlaufen und Spielen sinkt die Energie zusätzlich ein wenig (etwa 4 Std. aktives Spielen)
  if (RS.st.state === 'walk' || RS.st.state === 'act') n.energie = clamp(n.energie - dt*100/(4*3600));
  if (now - n.at > 5000){ catchUp(now); render(); mood(); }
  if (now - lastSave > 30000){ lastSave = now; L.save(); }
});
// ---------- Auffüllen ----------
const change = (id, v) => { if (id === 'spass') id = 'energie'; const n = N(); n[id] = clamp(n[id] + v); L.save(); render(); mood(); };
function pickFood(){ const tot = Object.values(FOOD).reduce((s, f) => s + f.w, 0); let r = Math.random()*tot; for (const [k, f] of Object.entries(FOOD)){ r -= f.w; if (r <= 0) return k; } return 'apfel'; }
addEventListener('rs:solved', e => { if (!ready) return; change('wissen', 15); const k = pickFood(); P.food[k] = (P.food[k] || 0) + 1; L.save();
  const c = e.detail && e.detail.container; if (c) c.append(el('p', 'needgain', `🧠 +15 Wissen · ${FOOD[k].icon} +1 ${FOOD[k].name} für den Vorrat`)); });
addEventListener('rs:card', () => { if (ready) change('wissen', 5); });
addEventListener('rs:bookdone', () => { if (ready){ const n = N(); n.energie = 100; L.save(); render(); mood(); } });   // Buch fertig: Energie voll
function feed(k){
  if (!(P.food[k] > 0)) return;
  P.food[k]--; change('hunger', FOOD[k].v);
  for (let i=0;i<5;i++) RS.spawn(RS.fxTex.heart, RS.st.pos.clone().add(new RS.V3((Math.random()-.5)*.6, 1.8 + Math.random()*.3, 0)), new RS.V3(0, .5, 0), 1.4, .2);   // Herzchen beim Essen
  RS.setStatus && RS.setStatus('mampft ' + FOOD[k].name + ' – lecker! ' + FOOD[k].icon);
  L.toast(FOOD[k].icon + ' Lecker! Satt +' + FOOD[k].v);
}
// sehr müde: zwischendurch kurz einnicken (Zzz) – nie bestrafend, Rätsel gehen weiter
let napAt = 0, napping = false;
const zTex = (() => { let t; return () => t || (t = (() => { const [c, x] = RS.cnv(80, 80); x.font = '56px "Patrick Hand", cursive'; x.fillStyle = '#7d6f80'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Z', 40, 42); return RS.tex(c); })()); })();
function nap(){ napping = true; napAt = Date.now(); RS.setStatus('nickt vor Müdigkeit kurz ein … Zzz 💤');
  let k = 0; const iv = setInterval(() => { RS.spawn(zTex(), RS.st.pos.clone().add(new RS.V3(.2 + Math.random()*.3, 1.9, 0)), new RS.V3(.15, .45, 0), 2.2, .25); if (++k > 6){ clearInterval(iv); napping = false; RS.setStatus('gähnt und reibt sich die Augen …'); } }, 700); }
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
    body.append(el('p', 'tip', '🦉 Rätsel-Eule und 🧠 Rätsel-Tisch: Wissen, Sterne und Essen · 📚 Lesen: Energie'));
    row(body, [btn('🦉 Zur Eule', '', () => window.Raetsel && Raetsel.goToOwl()), btn('🧠 Zum Rätsel-Tisch', '', () => window.House && House.goToDesk()), btn('📚 Lesen', 'main', () => window.Books && Books.openRead())]);
    row(body, [btn('Schließen', '', L.closeSheet)]);
  });
}
// ---------- Stimmung und Wünsche: die Figur führt durchs Spiel ----------
let wishAt = 0;
const toOwl = () => window.Raetsel && Raetsel.goToOwl();
// Was ist gerade am wichtigsten? 1. Energie (lesen) 2. Hunger 3. Wissen 4. der Wunsch aus dem Laden
function guide(){
  const n = N(), food = Object.values(P.food || {}).some(x => x > 0);
  if (n.energie < 30) return {icon:'😴', text:NEEDS[2].low, label:'📚 Lesen', run: () => window.Books && Books.openRead()};
  if (n.hunger < 30) return food ? {icon:'🍎', text:'Ich hab Hunger! Gibst du mir etwas zu essen? 🍎', label:'🍎 Essen geben', run:openNeeds}
                                 : {icon:'🍎', text:'Ich hab Hunger … Bei der Rätsel-Eule gibt es Rätsel – und dafür etwas zu essen! 🦉', label:'🦉 Zur Eule', run:toOwl};
  if (n.wissen < 30) return {icon:'🧠', text:NEEDS[0].low, label:'🦉 Zur Eule', run:toOwl};
  const w = window.Rewards && Rewards.wishItem(); if (!w) return null;
  return P.stars >= w.price ? {icon:'💖', text:`Wir haben genug Sterne für ${Rewards.article(w)} ${w.name}! ${w.emoji || w.icon} Kaufen wir es?`, label:'🛍 Zum Laden', run: () => Rewards.openShop(), wish:true}
                            : {icon:'💖', text:`Ich wünsche mir ${Rewards.article(w)} ${w.name}! ${w.emoji || w.icon} Dafür fehlen noch ${w.price - P.stars} Sterne – lösen wir Rätsel?`, label:'🦉 Zur Eule', run:toOwl, wish:true};
}
function mood(){
  const n = N(), tired = n.energie < 30, sad = Math.min(n.wissen, n.hunger) < 20;
  RS.setMood(tired ? 'tired' : sad ? 'sad' : null, n.energie < 10 ? .5 : tired ? .7 : 1);
  if (n.energie < 10 && !napping && Date.now() - napAt > 150e3 && RS.st.state === 'idle' && !RS.paused) nap();
  const chip = $('wishChip'), g = guide();
  chip.hidden = !g || g.wish; if (g && !g.wish){ chip.querySelector('span').textContent = g.icon + ' ' + g.text; chip.onclick = g.run; }
  if (g && Date.now() - wishAt > 180e3 && RS.st.state === 'idle' && !RS.paused && !napping){ wishAt = Date.now();   // als Sprechblase über dem Kopf, mit passendem Knopf
    RS.say(g.text, {label:g.label, onClick:g.run}); }
}
addEventListener('rs:wish', () => { wishAt = 0; mood(); });
window.Needs = {get values(){ return {...N()}; }, change, feed, open:openNeeds, catchUp, FOOD, mood, guide};
})();
