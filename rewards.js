// Rainbow Stars – Goodies: Überraschungsgeschenk nach jeder Lösung, Laden, "Meine Sachen"
// Sticker (Album), Anziehsachen (am Mädchen), Haustiere (laufen mit), Deko (steht auf der Wiese)
(() => {
const RS = window.RS, L = window.Learn, { V3 } = RS;

// ---------- Bilder: Emoji als Sticker (weißer Rand + dunkler Umriss) und gezeichnete Anziehsachen ----------
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const emojiCache = {};
function emojiCanvas(e, size = 220){
  const k = e + size; if (emojiCache[k]) return emojiCache[k];
  const [a, ax] = RS.cnv(size, size); ax.font = `${size*.72}px ${EMOJI_FONT}`; ax.textAlign = 'center'; ax.textBaseline = 'middle'; ax.fillText(e, size/2, size*.54);
  const [c, x] = RS.cnv(size, size);
  const ring = (rad, col) => { const [t, tx] = RS.cnv(size, size);
    for (let i=0;i<16;i++){ const an = i/16*Math.PI*2; tx.drawImage(a, Math.cos(an)*rad, Math.sin(an)*rad); }
    tx.globalCompositeOperation = 'source-in'; tx.fillStyle = col; tx.fillRect(0, 0, size, size); x.drawImage(t, 0, 0); };
  ring(size*.055, '#3b2a3a'); ring(size*.035, '#fbf7ee'); x.drawImage(a, 0, 0);
  return emojiCache[k] = c;
}
const { cnv, pencil, ink, wob, star, trace } = RS;
const DRAW = {
  krone(){ const [c, x] = cnv(240, 170); const p = [[20,160],[20,60],[70,110],[120,30],[170,110],[220,60],[220,160]]; pencil(x, p, '#ffd84d'); ink(x, p, true, 3);
    [[60,135,'#ff4f7b'],[120,128,'#3d7bff'],[180,135,'#2fae6a']].forEach(([a,b,col]) => { const q = wob(a, b, 14, 14, 18, .04); pencil(x, q, col, false); ink(x, q, true, 2); });
    [[20,60],[120,30],[220,60]].forEach(([a,b]) => star(x, a, b, 16, '#fff4c2', 0)); return c; },
  zauberhut(){ const [c, x] = cnv(260, 300); const brim = wob(130, 262, 120, 30, 30, .03); pencil(x, brim, '#7a5cff'); ink(x, brim, true, 3);
    const cone = [[40,260],[150,20],[220,260]]; pencil(x, cone, '#8a5cff'); ink(x, cone, true, 3);
    x.lineWidth = 16; x.strokeStyle = '#ffe066'; x.beginPath(); x.moveTo(62,222); x.quadraticCurveTo(130,240,205,222); x.stroke();
    [[120,150,14],[160,95,11],[110,205,9],[175,180,10]].forEach(([a,b,r]) => star(x, a, b, r, '#ffe066', a)); return c; },
  sonnenbrille(){ const [c, x] = cnv(440, 150); [[110,75],[330,75]].forEach(([a,b]) => { const q = wob(a, b, 92, 58, 32, .02); pencil(x, q, '#3a2f4a'); ink(x, q, true, 4);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(a-40, b-22, 26, 10, -.4, 0, 7); x.fill(); });
    x.lineWidth = 12; x.strokeStyle = '#ff4f7b'; x.beginPath(); x.moveTo(195,70); x.quadraticCurveTo(220,52,245,70); x.stroke(); return c; },
  blumenkranz(){ const [c, x] = cnv(280, 130); const band = []; for (let k=0;k<=24;k++){ const a = Math.PI*1.08 + k/24*Math.PI*.84; band.push([140 + Math.cos(a)*125, 160 + Math.sin(a)*80]); }
    x.lineCap = 'round'; x.lineWidth = 12; x.strokeStyle = '#2fae6a'; trace(x, band, false); x.stroke();
    [0,4,8,12,16,20,24].forEach((k, i) => { const [a, b] = band[k]; const col = ['#ff8fb1','#ffe066','#b49bff','#ffffff','#ffb36b','#7cc4ff','#ff8fb1'][i];
      for (let j=0;j<5;j++){ const an = j/5*Math.PI*2, q = wob(a + Math.cos(an)*11, b + Math.sin(an)*11, 9, 9, 14, .05); pencil(x, q, col, false); ink(x, q, true, 1.4); }
      const m = wob(a, b, 6, 6, 12, .04); pencil(x, m, '#ffd84d', false); }); return c; },
  schleife(){ const [c, x] = cnv(240, 150); [[-1],[1]].forEach(([s]) => { const p = [[120,75],[120 + s*105,20],[120 + s*112,130]]; pencil(x, p, '#ff7aa8'); ink(x, p, true, 3); });
    const k = wob(120, 75, 24, 26, 20, .04); pencil(x, k, '#ff4f7b'); ink(x, k, true, 3); return c; },
  fluegel(){ const [c, x] = cnv(520, 360);
    [[-1],[1]].forEach(([s]) => { const top = wob(260 + s*125, 120, 120, 95, 36, .05, s*.5), low = wob(260 + s*95, 265, 80, 70, 30, .05, -s*.4);
      [[top,'rgba(196,232,255,.9)'],[low,'rgba(255,214,236,.9)']].forEach(([q, col]) => { pencil(x, q, col, false); ink(x, q, true, 2.6); }); });
    [[150,110],[370,110],[190,270],[330,270]].forEach(([a,b]) => star(x, a, b, 12, '#fff4c2', a)); return c; },
};

// ---------- Katalog ----------
const STICKERS = ['🐸','🐧','🐙','🍉','🌵','🍭','🎨','🎵','🐞','🌼','🍀','🐳','🦔','🍒','🪐','🧁'];
const CATALOG = [
  ...STICKERS.map(e => ({id:'st-' + e, type:'sticker', name:'Sticker ' + e, emoji:e, rarity:'common', price:10})),
  {id:'krone', type:'wear', slot:'head', name:'Krone', icon:'👑', rarity:'epic', price:80, w:.62, y:150},
  {id:'zauberhut', type:'wear', slot:'head', name:'Zauberhut', icon:'🧙', rarity:'rare', price:55, w:.95, y:330},
  {id:'blumenkranz', type:'wear', slot:'head', name:'Blumenkranz', icon:'🌼', rarity:'rare', price:45, w:1.08, y:75},
  {id:'schleife', type:'wear', slot:'head', name:'Schleife', icon:'🎀', rarity:'common', price:30, w:.55, y:110},
  {id:'sonnenbrille', type:'wear', slot:'eyes', name:'Sonnenbrille', icon:'🕶', rarity:'rare', price:50, w:1.0, y:0},
  {id:'fluegel', type:'wear', slot:'back', name:'Feenflügel', icon:'🧚', rarity:'epic', price:90, w:1.6, y:40},
  {id:'pet-katze', type:'pet', name:'Kätzchen Mia', emoji:'🐱', rarity:'rare', price:60},
  {id:'pet-hund', type:'pet', name:'Hündchen Bello', emoji:'🐶', rarity:'rare', price:60},
  {id:'pet-kueken', type:'pet', name:'Küken Piep', emoji:'🐥', rarity:'common', price:40},
  {id:'pet-hamster', type:'pet', name:'Hamster Krümel', emoji:'🐹', rarity:'common', price:40},
  {id:'pet-einhorn', type:'pet', name:'Mini-Einhorn Glitzer', emoji:'🦄', rarity:'epic', price:100},
  {id:'deko-sonnenblume', type:'deco', name:'Sonnenblume', emoji:'🌻', rarity:'common', price:25},
  {id:'deko-pilz', type:'deco', name:'Glückspilz', emoji:'🍄', rarity:'common', price:25},
  {id:'deko-brunnen', type:'deco', name:'Brunnen', emoji:'⛲', rarity:'rare', price:45},
  {id:'deko-haus', type:'deco', name:'Häuschen', emoji:'🏡', rarity:'rare', price:50},
  {id:'deko-zelt', type:'deco', name:'Zirkuszelt', emoji:'🎪', rarity:'rare', price:50},
  {id:'deko-rakete', type:'deco', name:'Rakete', emoji:'🚀', rarity:'epic', price:70},
];
const byId = Object.fromEntries(CATALOG.map(it => [it.id, it]));
const RARITY = {common:'normal', rare:'selten ✦', epic:'sehr selten ✦✦'};
// Anziehsachen beim Zubehör-System von learn.js anmelden
CATALOG.filter(it => it.type === 'wear').forEach(it => L.ITEMS[it.id] = {name:it.name, slot:it.slot, w:it.w, y:it.y, draw:DRAW[it.id]});
L.ITEMS.tiara.slot = 'head';
const P = L.P;
const owned = id => byId[id] && byId[id].type === 'sticker' ? !!P.stickers[id] : !!P.items[id];
const preview = it => it.type === 'wear' ? DRAW[it.id]() : emojiCanvas(it.emoji, 160);
const iconOf = it => it.icon || it.emoji;

// ---------- Geschenk ----------
function rollGift(){
  const r = Math.random(), want = r < .08 ? 'epic' : r < .38 ? 'rare' : 'common';
  const free = CATALOG.filter(it => !owned(it.id));
  const pool = free.filter(it => it.rarity === want), list = pool.length ? pool : free;
  if (!list.length){ const e = STICKERS[Math.floor(Math.random()*STICKERS.length)]; return {it:byId['st-' + e], dup:true}; }
  return {it:list[Math.floor(Math.random()*list.length)], dup:false};
}
function grant(it){
  if (it.type === 'sticker') P.stickers[it.id] = (P.stickers[it.id] || 0) + 1; else P.items[it.id] = true;
  L.save(); dispatchEvent(new CustomEvent('rs:goodie', {detail:{id:it.id}}));   // z. B. fürs Regal im Haus
}
function giftInto(container){
  const box = L.el('div', 'gift'), b = L.btn('🎁 Geschenk öffnen!', 'main giftbtn', () => {
    b.disabled = true; box.classList.add('opening');
    setTimeout(() => {
      const {it, dup} = rollGift(); box.classList.remove('opening'); box.replaceChildren();
      if (dup){ L.addStars(3, 'doppelter Sticker'); }
      grant(it);
      const pic = preview(it); pic.className = 'giftpic'; box.append(pic);
      const info = L.el('div', 'giftinfo'); info.append(L.el('b', '', (dup ? 'Doppelt: ' : 'Du bekommst: ') + it.name), L.el('small', 'rar ' + it.rarity, RARITY[it.rarity]));
      const act = actionFor(it); if (act) info.append(L.btn(act.label, 'small', e => { act.run(); e.target.disabled = true; e.target.textContent = '✔ ' + act.done; }));
      box.append(info);
    }, 900);
  });
  box.append(b); container.append(box);
}
function actionFor(it){
  if (it.type === 'wear') return {label:'Gleich anziehen', done:'angezogen', run:() => wear(it.id, true)};
  if (it.type === 'pet') return {label:'Mitnehmen', done:'kommt mit', run:() => choosePet(it.id)};
  if (it.type === 'deco') return {label:'Auf die Wiese stellen', done:'steht auf der Wiese', run:() => placeDeco(it.id, true)};
  return null;
}
// Geschenk erst nach 3 gelösten Rätseln – dazwischen zeigt eine Anzeige den Fortschritt
const GIFT_EVERY = 3;
function renderGiftHud(){ const g = RS.$('giftHud'); if (!g) return; g.textContent = '🎁 ' + (P.giftCount || 0) + '/' + GIFT_EVERY; g.hidden = !L.profileId; }
function solved(container){
  dispatchEvent(new CustomEvent('rs:solved', {detail:{container}}));   // needs.js: Wissen + Essen
  P.giftCount = (P.giftCount || 0) + 1;
  if (P.giftCount >= GIFT_EVERY){ P.giftCount = 0; L.save(); renderGiftHud(); giftInto(container); return; }
  L.save(); renderGiftHud(); const left = GIFT_EVERY - P.giftCount;
  container.append(L.el('p', 'giftprog', `🎁 ${P.giftCount}/${GIFT_EVERY} – noch ${left} ${left === 1 ? 'Rätsel' : 'Rätsel'} bis zum Geschenk`));
}
L.setGift(solved);
addEventListener('rs:profile', renderGiftHud);

// ---------- Anziehen, Haustier, Deko ----------
function wear(id, on){
  const it = byId[id] || {slot:(L.ITEMS[id] || {}).slot || 'head'};
  if (on) Object.keys(P.wear).forEach(k => { if (k !== id && P.wear[k] && (L.ITEMS[k] || {}).slot === it.slot) P.wear[k] = false; });   // pro Platz nur eins
  P.wear[id] = on; L.save(); L.applyWear();
}
let pet = null; const petTarget = {pos:new V3(), near:true};
function spawnPet(){
  if (pet){ RS.removeFromWorld('pet'); pet = null; }
  const it = byId[P.pet]; if (!it || !P.items[it.id]) return;
  pet = RS.addCreature({name:it.name, c:emojiCanvas(it.emoji, 200), w:.55, kind:'bunny', pos:RS.st.pos.clone().add(new V3(1.2, 0, .6)), rnd:Math.random, wid:RS.worldId});
  pet.chase = petTarget; pet.chaseT = 1e12; RS.world.set('pet', pet);
}
function choosePet(id){ P.pet = id; L.save(); spawnPet(); }
RS.onTick(() => { if (!pet) return;
  if (!pet.chase && !(pet.manual > performance.now())){ pet.chase = petTarget; pet.chaseT = 1e12; }   // nach dem Steuern wieder mitlaufen
  const side = RS.camRight().multiplyScalar(-(RS.st.face || 1)*1.1); petTarget.pos.copy(RS.st.pos).add(side); petTarget.pos.z += .35;
  if (pet.pos.distanceTo(RS.st.pos) > 9){ pet.pos.copy(petTarget.pos); } });
addEventListener('rs:world', () => { if (P.pet) spawnPet(); });
function placeDeco(id, on){
  const it = byId[id]; if (!it) return;
  P.deco[id] = P.deco[id] || {}; P.deco[id].on = on;
  if (on && P.deco[id].x === undefined){ const a = Math.random()*Math.PI*2, r = 5 + Math.random()*7; P.deco[id].x = Math.cos(a)*r; P.deco[id].z = Math.sin(a)*r; }
  L.save(); showDeco(id);
}
function showDeco(id){
  const key = 'deco:' + id, d = P.deco[id], it = byId[id];
  RS.removeFromWorld(key);
  if (!d || !d.on || !P.items[id]) return;
  const th = RS.addThing({name:it.name, c:emojiCanvas(it.emoji, 240), type:'deco', pos:new V3(d.x, 0, d.z), wid:'home', appear:0});
  RS.world.set(key, th);
}
addEventListener('rs:profile', () => { L.applyWear(); if (P.pet) spawnPet(); Object.keys(P.deco).forEach(showDeco); });

// ---------- Meine Sachen ----------
function openThings(){
  L.openSheet('🎒 Meine Sachen', body => {
    body.append(L.el('p', 'tip', `Du hast ★ ${P.stars} Sterne. Neue Sachen gibt es als Geschenk für jede gelöste Aufgabe – oder im Laden.`));
    // Haare
    const sw = RS.$('swatches'); sw.hidden = false; body.append(sw);
    const section = (title, items, render) => { body.append(L.el('h3', 'albumh', title)); const g = L.el('div', 'things'); if (!items.length) g.append(L.el('p', 'note', 'Noch nichts – sammle Geschenke oder schau in den Laden.')); items.forEach(it => g.append(render(it))); body.append(g); };
    const wearables = [...CATALOG.filter(it => it.type === 'wear' && P.items[it.id]), ...(P.items.tiara ? [{id:'tiara', name:'Sternen-Haarreif', icon:'⭐', slot:'head'}] : [])];
    section('Anziehen', wearables, it => L.btn((P.wear[it.id] ? '✔ ' : '') + iconOf(it) + ' ' + it.name, P.wear[it.id] ? 'small main' : 'small', () => { wear(it.id, !P.wear[it.id]); openThings(); }));
    section('Haustier', CATALOG.filter(it => it.type === 'pet' && P.items[it.id]), it => L.btn((P.pet === it.id ? '✔ ' : '') + it.emoji + ' ' + it.name, P.pet === it.id ? 'small main' : 'small', () => { if (P.pet === it.id){ P.pet = null; L.save(); RS.removeFromWorld('pet'); pet = null; } else choosePet(it.id); openThings(); }));
    section('Deko auf der Wiese', CATALOG.filter(it => it.type === 'deco' && P.items[it.id]), it => { const on = P.deco[it.id] && P.deco[it.id].on;
      return L.btn((on ? '✔ ' : '') + it.emoji + ' ' + it.name, on ? 'small main' : 'small', () => { placeDeco(it.id, !on); openThings(); }); });
    const have = STICKERS.filter(e => P.stickers['st-' + e]).length;
    body.append(L.el('h3', 'albumh', `Sticker-Album (${have} von ${STICKERS.length})`));
    const g = L.el('div', 'stickers'); STICKERS.forEach(e => { const n = P.stickers['st-' + e]; const s = L.el('span', n ? 'stk' : 'stk empty', n ? e : '?'); if (n > 1) s.dataset.n = '×' + n; g.append(s); }); body.append(g);
    L.row(body, [L.btn('🛍 Zum Laden', 'main', openShop), L.btn('Schließen', '', L.closeSheet)]);
  });
}
// ---------- Laden ----------
function openShop(){
  L.openSheet('🛍 Regenbogen-Laden', body => {
    body.append(L.el('p', 'tip', `Du hast ★ ${P.stars} Sterne.`));
    const g = L.el('div', 'shop');
    const ORDER = {wear:0, pet:1, deco:2, sticker:3};   // spannende Sachen zuerst, Sticker zum Schluss
    CATALOG.filter(it => !owned(it.id)).sort((a, b) => (ORDER[a.type] - ORDER[b.type]) || (a.price - b.price)).forEach(it => {
      const card = L.el('div', 'shopitem'), pic = preview(it); pic.className = 'shoppic'; card.append(pic, L.el('b', '', it.name), L.el('small', 'rar ' + it.rarity, RARITY[it.rarity]));
      const can = P.stars >= it.price;
      card.append(L.btn('★ ' + it.price + (can ? ' · kaufen' : ''), can ? 'small main' : 'small', () => {
        if (P.stars < it.price){ L.toast('Dafür fehlen dir noch ' + (it.price - P.stars) + ' Sterne – löse ein paar Rätsel!'); return; }
        P.stars -= it.price; grant(it); L.save(); L.renderHud(); L.toast('🛍 ' + it.name + ' gekauft ✦');
        const act = actionFor(it); if (act) act.run(); openShop(); }));
      g.append(card); });
    if (!g.children.length) g.append(L.el('p', 'cardtext', 'Wow – du hast schon alles! ✦'));
    body.append(g); L.row(body, [L.btn('🎒 Meine Sachen', '', openThings), L.btn('Schließen', 'main', L.closeSheet)]);
  });
}
RS.$('thingsBtn').onclick = openThings;
// Haar-Auswahl gehört jetzt zu "Meine Sachen": nach dem Schließen wieder verstecken
new MutationObserver(() => { const sw = RS.$('swatches'); if (RS.$('learn').hidden && sw.parentElement !== RS.$('swatchHome')){ RS.$('swatchHome').append(sw); sw.hidden = true; } }).observe(RS.$('learn'), {attributes:true, attributeFilter:['hidden']});
window.Rewards = {solved, CATALOG, giftInto, openThings, openShop, emojiCanvas, rollGift};
})();
