// Rainbow Stars – Eigenes Haus: Jedes Profil zeichnet sein Haus selbst auf Papier und scannt es ein. Es steht dann auf der Wiese
// (alle Profile sehen alle Häuser), hinein darf nur, wem es gehört. Nach dem Anmelden startet man im eigenen Haus.
// Innen gibt es anfangs nur den Rätsel-Tisch (Rechen-Geschichten) – weitere Möbel kauft man mit Sternen im Laden.
(() => {
const RS = window.RS, L = window.Learn, { THREE, V3, cnv, wob, pencil, ink, star, bill, shadow, tex } = RS;
const P = L.P, E = (e, s = 160) => window.Rewards.emojiCanvas(e, s);
const COLORS = ['#ffb3cf', '#c4f0dc', '#ffe9a3', '#cde6ff', '#d9c9ff', '#ffd2b0'];
const hashIdx = (id, n) => { let h = 0; for (const c of String(id)) h = (h*31 + c.charCodeAt(0)) >>> 0; return h % n; };
const profiles = () => (window.Profiles && Profiles.list) || [];

// ---------- Häuser auf der Wiese ----------
async function houseRecs(){   // Profil-ID -> neuestes gezeichnetes Haus
  const m = new Map(); (await RS.idb.all()).filter(r => r.kind === 'house' && r.owner).sort((a, b) => a.created - b.created).forEach(r => m.set(r.owner, r)); return m; }
async function houseCanvas(p, rec){
  const [c, x] = cnv(360, 410); let pic;
  try { pic = await createImageBitmap(rec.blob); } catch(e){ return null; }
  const s2 = Math.min(350/pic.width, 340/pic.height), w = pic.width*s2, h = pic.height*s2; x.drawImage(pic, 180 - w/2, 346 - h, w, h);
  const sign = [[90,360],[270,360],[270,400],[90,400]]; pencil(x, sign, '#fbf7ee', false); ink(x, sign, true, 2);   // Namensschild mit Profilbild
  x.fillStyle = '#342c3a'; x.font = '24px "Patrick Hand", cursive'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(p.avatar + ' ' + p.name, 180, 381);
  return c;
}
const homeHouses = new Map();   // Profil-ID -> {g, mesh, act}
let placing = 0;
async function placeHouses(){
  const my = ++placing, recs = await houseRecs(), pics = new Map();
  for (const p of profiles()) if (recs.has(p.id)){ const c = await houseCanvas(p, recs.get(p.id)); if (c) pics.set(p.id, c); }
  if (my !== placing) return;   // inzwischen neu angefordert
  const W = RS.W.home;
  homeHouses.forEach((h, id) => { W.group.remove(h.g); [[W.acts, h.act], [W.picks, h.mesh]].forEach(([a, v]) => { const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); }); });
  homeHouses.clear();
  if (!RS.owner) return;
  profiles().filter(p => pics.has(p.id)).forEach(p => {
    const ang = hashIdx(p.id + 'h', 360)/360*Math.PI*2, pos = new V3(Math.cos(ang)*11, 0, Math.sin(ang)*11);
    const g = new THREE.Group(); g.position.copy(pos); W.group.add(g);
    const m = bill(pics.get(p.id), 3.2, g); shadow(3, g);
    const own = p.id === RS.owner;
    const act = {kind:'sight', ref:{pos:pos.clone(), name:'Haus von ' + p.name}, go: own ? 'läuft nach Hause' : 'läuft zum Haus von ' + p.name, doing: own ? 'schließt die Haustür auf' : 'steht vor dem Haus von ' + p.name,
      marvel:true, off:1.5, fxH:2, onArrive: () => own ? L.travel('house') : knock(p)};
    m.userData.act = act; W.acts.push(act); W.picks.push(m); homeHouses.set(p.id, {g, mesh:m, act});
  });
}
function knock(p){
  L.openSheet('🏠 Haus von ' + p.name, body => {
    body.append(L.el('p', 'cardtext', `Das ist das Haus von ${p.avatar} ${p.name}. Nur ${p.name} darf hinein.`));
    L.row(body, [L.btn('👋 Winken', 'main', async () => { const g = (await RS.idb.getP('greets')) || []; g.push({from:RS.owner, to:p.id, at:Date.now()}); await RS.idb.setP('greets', g.slice(-30)); L.closeSheet(); L.toast('👋 Du hast ' + p.name + ' zugewinkt'); }), L.btn('OK', '', L.closeSheet)]);
  });
}
async function showGreets(){ const g = (await RS.idb.getP('greets')) || [], mine = g.filter(x => x.to === RS.owner); if (!mine.length) return;
  const names = [...new Set(mine.map(x => (profiles().find(p => p.id === x.from) || {}).name).filter(Boolean))];
  await RS.idb.setP('greets', g.filter(x => x.to !== RS.owner)); if (names.length) setTimeout(() => L.toast('👋 ' + names.join(' und ') + ' hat dir zugewinkt!'), 2500); }
const hasHouse = () => homeHouses.has(RS.owner);
// Nach dem Anmelden: im eigenen Haus starten – oder die Figur bittet darum, dass man ihr ein Haus zeichnet
let askT = 0;
function askForHouse(){
  clearInterval(askT);
  const ask = () => { if (hasHouse() || !RS.owner){ clearInterval(askT); return; } if (RS.worldId !== 'home' || RS.paused || !document.getElementById('learn').hidden) return;
    RS.say('Kannst du für mich ein Haus zeichnen? 🏠 Dann habe ich ein Zuhause! Mal es auf Papier und scanne es ein.', {label:'✎ Haus scannen', labelFor:'scanFile', prio:3, ms:30000,
      onClick: () => RS.setScanContext({house:true})}); };
  setTimeout(ask, 2500); askT = setInterval(ask, 4*60e3);
}
addEventListener('rs:profile', () => setTimeout(async () => { await placeHouses(); showGreets();
  if (hasHouse()) RS.enterWorld('house'); else askForHouse(); }, 200));
['rs:sync', 'rs:painted', 'rs:deleted'].forEach(ev => addEventListener(ev, () => { if (RS.owner) placeHouses(); }));
addEventListener('rs:scanned', async e => { if (!e.detail.house) return; await placeHouses(); clearInterval(askT);
  L.toast('🏠 Dein Haus steht jetzt auf der Wiese!');
  RS.say('Juhu, mein eigenes Haus! 🏠 Komm, wir gehen hinein!', {prio:3, ms:9000});
  setTimeout(() => { const h = homeHouses.get(RS.owner); if (h && RS.worldId === 'home') RS.walkTo(h.act); }, 2500); });

// ---------- Das Zimmer ----------
const world = RS.addWorld({id:'house', name:'Zuhause', fog:0xf7efe2, spawn:new V3(1, 0, 1.4), hello:'ist zu Hause 🏠', bounds:{x0:-3.8, x1:3.8, z0:-1.9, z1:2.6}, azLimit:.55});
const G = world.group;
const ROOM = () => P.room || (P.room = {wall:'streifen', wallCol:'#ffe0ea', floor:'hell', rug:'#c4f0dc', bed:'#b49bff', lamp:'#ffe066'});
const WALLS = {streifen:'Streifen', punkte:'Punkte', sterne:'Sterne', herzen:'Herzen', wolken:'Wolken', uni:'Einfarbig'};
const WALLCOLS = ['#ffe0ea', '#e3f6ec', '#fff3c9', '#e2efff', '#ece3ff', '#fde6d4'];
const FLOORS = {hell:['#e8c9a0', '#d4b083'], dunkel:['#a9774f', '#8d613f'], rosa:['#f6c9d6', '#e9b1c2']};
const ACCENTS = ['#c4f0dc', '#ffb3cf', '#ffe066', '#7cc4ff', '#b49bff', '#ff9e7a'];
function wallCanvas(){ const r = ROOM(), [c, x] = cnv(1024, 512); x.fillStyle = r.wallCol; x.fillRect(0, 0, 1024, 512); x.fillStyle = 'rgba(52,44,58,.10)';
  if (r.wall === 'streifen') for (let i=0;i<1024;i+=64) x.fillRect(i, 0, 28, 512);
  if (r.wall === 'punkte') for (let y=20;y<512;y+=48) for (let i=(y/48 % 2)*24 + 20; i<1024; i+=48){ x.beginPath(); x.arc(i, y, 7, 0, 7); x.fill(); }
  if (r.wall === 'sterne') for (let y=40;y<512;y+=90) for (let i=(y/90 % 2)*45 + 40; i<1024; i+=90) star(x, i, y, 14, 'rgba(255,255,255,.7)', 0);
  if (r.wall === 'herzen'){ x.font = '34px ' + '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.globalAlpha = .35; for (let y=40;y<512;y+=90) for (let i=(y/90 % 2)*45 + 40; i<1024; i+=90) x.fillText('🩷', i, y); x.globalAlpha = 1; }
  if (r.wall === 'wolken') for (let i=0;i<9;i++) RS.blob(x, [[80 + i*115, 80 + (i%3)*130, 26], [110 + i*115, 70 + (i%3)*130, 32], [140 + i*115, 84 + (i%3)*130, 24]], 'rgba(255,255,255,.75)');
  x.fillStyle = 'rgba(52,44,58,.15)'; x.fillRect(0, 486, 1024, 26);   // Fußleiste
  return c; }
function floorCanvas(){ const [a, b] = FLOORS[ROOM().floor] || FLOORS.hell, [c, x] = cnv(512, 512); for (let i=0;i<8;i++){ x.fillStyle = i % 2 ? a : b; x.fillRect(0, i*64, 512, 64); x.fillStyle = 'rgba(52,44,58,.18)'; x.fillRect(0, i*64, 512, 2); x.fillRect(((i*137) % 400) + 40, i*64, 2, 64); } return c; }
let wallM, sideL, sideR, floorM, rugM;
function buildRoom(){
  [wallM, sideL, sideR, floorM, rugM].forEach(m => m && G.remove(m));
  const wt = tex(wallCanvas()); wallM = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({map:wt})); wallM.position.set(0, 2.25, -2.6); G.add(wallM);
  [-1, 1].forEach(s => { const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.5), new THREE.MeshBasicMaterial({map:wt, side:THREE.DoubleSide})); m.position.set(s*4.5, 2.25, .4); m.rotation.y = -s*Math.PI/2; G.add(m); if (s < 0) sideL = m; else sideR = m; });
  const ft = tex(floorCanvas()); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(2, 1.5);
  floorM = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({map:ft})); floorM.rotation.x = -Math.PI/2; floorM.position.set(0, .002, .4); G.add(floorM);
  const [rc, rx] = cnv(256, 256), rp = wob(128, 128, 120, 120, 40, .03); pencil(rx, rp, ROOM().rug); ink(rx, rp, true, 3); rx.strokeStyle = 'rgba(255,255,255,.6)'; rx.lineWidth = 6; rx.beginPath(); rx.arc(128, 128, 80, 0, 7); rx.stroke();
  if (!has('teppich')){ rugM = null; return; }
  rugM = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), new THREE.MeshBasicMaterial({map:tex(rc), transparent:true})); rugM.rotation.x = -Math.PI/2; rugM.position.set(0, .006, .7); G.add(rugM);
}
// Möbel: gezeichnete Billboards, Inhalt aus dem Besitz. Der Rätsel-Tisch ist immer da, alles andere kauft man im Laden (Rewards: 'moebel-…').
const has = key => key === 'tisch' || !!(P.items || {})['moebel-' + key];
const MOEBEL = () => window.Rewards ? Rewards.CATALOG.filter(it => it.type === 'moebel') : [];
// Früher gab es Möbel automatisch alle 2 Rätsel: schon freigeschaltete bleiben erhalten
addEventListener('rs:profile', () => { if (!P.furnPts) return;
  ['bett', 'kueche', 'regal', 'teppich', 'buecher', 'bilder', 'staffelei'].slice(0, Math.floor(P.furnPts/2)).forEach(k => P.items['moebel-' + k] = true); P.furnPts = 0; L.save(); });
const furn = {};
function unplace(key){ const f = furn[key]; if (!f) return; G.remove(f.g || f.mesh); const i = world.picks.indexOf(f.mesh); if (i >= 0) world.picks.splice(i, 1); if (f.act){ const j = world.acts.indexOf(f.act); if (j >= 0) world.acts.splice(j, 1); } delete furn[key]; }
function place(key, canvas, w, x, z, act){
  if (furn[key]){ G.remove(furn[key].g); const i = world.picks.indexOf(furn[key].mesh); if (i >= 0) world.picks.splice(i, 1); const j = world.acts.indexOf(furn[key].act); if (j >= 0) world.acts.splice(j, 1); }
  const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g); const m = bill(canvas, w, g); shadow(Math.min(2.4, w*.8), g);
  act.ref = {pos:g.position.clone(), name:act.name}; act.kind = 'sight'; act.marvel = true; act.off = act.off ?? Math.min(1.4, w*.45 + .4); act.fxH = act.fxH ?? 1.2;
  m.userData.act = act; world.acts.push(act); world.picks.push(m); furn[key] = {g, mesh:m, act};
}
const box = (x, pts, col) => { pencil(x, pts, col); ink(x, pts, true, 2.6); };
function shelfCanvas(){   // Goodie-Regal: Sticker, Anziehsachen, Haustiere, Deko
  const [c, x] = cnv(420, 520); box(x, [[20,20],[400,20],[400,510],[20,510]], '#c99a76');
  const items = window.Rewards ? Rewards.CATALOG.filter(it => it.type === 'sticker' ? P.stickers[it.id] : P.items[it.id]) : [];
  const groups = [items.filter(i => i.type === 'wear'), items.filter(i => i.type === 'pet'), items.filter(i => i.type === 'deco'), items.filter(i => i.type === 'sticker')];
  [0,1,2,3].forEach(r => { const y = 30 + r*120; box(x, [[34, y + 100],[386, y + 100],[386, y + 112],[34, y + 112]], '#a5703f');
    const row2 = groups[r].slice(0, 4); if (!row2.length){ x.fillStyle = 'rgba(52,44,58,.35)'; x.font = '22px "Patrick Hand", cursive'; x.textAlign = 'center'; x.fillText(['Anziehsachen','Haustiere','Deko','Sticker'][r] + ' – noch leer', 210, y + 70); }
    row2.forEach((it, k) => { const pic = it.type === 'wear' ? (L.ITEMS[it.id] && L.ITEMS[it.id].draw ? L.ITEMS[it.id].draw() : E('⭐')) : E(it.emoji, 120), s = Math.min(80/pic.width, 92/pic.height), w = pic.width*s, h = pic.height*s;
      x.drawImage(pic, 44 + k*86 + (80 - w)/2, y + 100 - h, w, h); }); });
  return c; }
function deskCanvas(){ const [c, x] = cnv(360, 300); box(x, [[20,140],[340,140],[340,160],[20,160]], '#c99a76'); box(x, [[40,160],[60,160],[60,290],[40,290]], '#b98866'); box(x, [[300,160],[320,160],[320,290],[300,290]], '#b98866');
  box(x, [[80,105],[180,95],[190,138],[90,140]], '#fff4e6'); ink(x, [[135,100],[140,139]], false, 1.4);
  const lamp = [[250,140],[262,60],[230,60],[300,40],[320,70]]; ink(x, lamp, false, 3); const sh = wob(305, 70, 30, 18, 20, .04); pencil(x, sh, ROOM().lamp); ink(x, sh, true, 2.2);
  x.drawImage(E('🧠', 90), 140, 30); return c; }
function bedCanvas(){ const [c, x] = cnv(420, 300); box(x, [[20,120],[60,120],[60,290],[20,290]], '#a5703f'); box(x, [[360,170],[400,170],[400,290],[360,290]], '#a5703f');
  box(x, [[40,190],[390,190],[390,250],[40,250]], ROOM().bed); const pil = wob(105, 175, 50, 22, 24, .04); pencil(x, pil, '#ffffff'); ink(x, pil, true, 2.2);
  box(x, [[150,180],[390,180],[390,215],[150,215]], ROOM().bed); x.font = '46px "Patrick Hand", cursive'; x.fillStyle = '#7d6f80'; x.fillText('Z z z', 210, 120); return c; }   // Bettdecke
function kitchenCanvas(){ const [c, x] = cnv(300, 260); box(x, [[20,120],[280,120],[280,140],[20,140]], '#e6c88e'); box(x, [[40,140],[56,140],[56,250],[40,250]], '#c99a76'); box(x, [[244,140],[260,140],[260,250],[244,250]], '#c99a76');
  const bowl = wob(150, 110, 70, 26, 30, .03); pencil(x, bowl, '#7cc4ff'); ink(x, bowl, true, 2.4);
  const food = Object.entries((window.Needs && Needs.FOOD) || {}).filter(([k]) => (P.food || {})[k] > 0).slice(0, 4);
  (food.length ? food : [['', {icon:'🍽'}]]).forEach(([, f], i) => x.drawImage(E(f.icon, 70), 82 + i*36, 46)); return c; }
async function picsCanvas(){ const [c, x] = cnv(520, 280); const mine = (await RS.myCreatures()).slice(0, 6);
  if (!mine.length){ box(x, [[160,60],[360,60],[360,220],[160,220]], '#fbf7ee'); x.fillStyle = '#7d6f80'; x.font = '26px "Patrick Hand", cursive'; x.textAlign = 'center'; x.fillText('Platz für deine', 260, 125); x.fillText('Figuren ✎', 260, 160); return c; }
  for (const [i, r] of mine.entries()){ const fx = 14 + (i % 3)*168, fy = 10 + Math.floor(i/3)*136; box(x, [[fx,fy],[fx+150,fy],[fx+150,fy+124],[fx,fy+124]], ['#ffd2b0','#c4f0dc','#d9c9ff','#ffe9a3','#cde6ff','#ffb3cf'][i]);
    x.fillStyle = '#fff'; x.fillRect(fx + 12, fy + 12, 126, 100);
    try { const bm = await createImageBitmap(r.blob), s = Math.min(118/bm.width, 92/bm.height); x.drawImage(bm, fx + 75 - bm.width*s/2, fy + 62 - bm.height*s/2, bm.width*s, bm.height*s); } catch(e){} }
  return c; }
async function booksCanvas(){ const [c, x] = cnv(300, 420); box(x, [[20,20],[280,20],[280,410],[20,410]], '#b98866');
  const me = RS.owner, list = window.Books ? (await Books.all()).filter(b => ((b.status || {})[me] || {}).confirmed) : [];
  [0,1,2].forEach(r => { const y = 30 + r*126; box(x, [[30, y + 112],[270, y + 112],[270, y + 120],[30, y + 120]], '#8a5a3c'); });
  if (!list.length){ x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '24px "Patrick Hand", cursive'; x.textAlign = 'center'; x.fillText('Hier kommen', 150, 190); x.fillText('deine Bücher hin 📚', 150, 222); }
  list.slice(0, 15).forEach((b, i) => { const r = Math.floor(i/5), k = i % 5, bx = 38 + k*46, y = 30 + r*126; box(x, [[bx, y + 20],[bx + 40, y + 20],[bx + 40, y + 112],[bx, y + 112]], ACCENTS[i % ACCENTS.length]);
    x.save(); x.translate(bx + 25, y + 66); x.rotate(-Math.PI/2); x.fillStyle = '#342c3a'; x.font = '16px "Patrick Hand", cursive'; x.textAlign = 'center'; x.fillText(b.title.slice(0, 12), 0, 0); x.restore(); });
  return c; }
function doorCanvas(){ const [c, x] = cnv(200, 360); box(x, [[20,20],[180,20],[180,350],[20,350]], '#b98866'); box(x, [[40,40],[160,40],[160,170],[40,170]], '#c99a76'); box(x, [[40,190],[160,190],[160,330],[40,330]], '#c99a76');
  x.fillStyle = '#ffe066'; x.beginPath(); x.arc(150, 190, 9, 0, 7); x.fill(); x.drawImage(E('🌳', 70), 65, 70); return c; }
function easelCanvas(){ const [c, x] = cnv(220, 320); ink(x, [[40,310],[110,30],[180,310]], false, 6); box(x, [[40,70],[180,70],[180,200],[40,200]], '#fff');
  ['#ff8fb1','#ffe066','#7fdca4','#7cc4ff'].forEach((col, i) => { const b2 = wob(80 + (i%2)*60, 105 + Math.floor(i/2)*55, 22, 18, 18, .05); pencil(x, b2, col, false); }); return c; }
async function furnish(){
  if (!RS.owner) return;
  buildRoom();
  const put = async (key, mk, w, x, z, act) => { if (has(key)) place(key, await mk(), w, x, z, act); else unplace(key); };
  await put('regal', shelfCanvas, 2.0, -2.7, -2.1, {name:'Goodie-Regal', go:'läuft zum Goodie-Regal', doing:'schaut sich ihre Schätze an', onArrive: () => window.Rewards && Rewards.openThings()});
  await put('tisch', deskCanvas, 1.8, -.5, -2.1, {name:'Rätsel-Tisch', go:'setzt sich an den Rätsel-Tisch', doing:'denkt nach', mark:' 🧠', onArrive: () => window.Raetsel && Raetsel.openMath()});
  await put('bett', bedCanvas, 2.3, 2.7, -1.9, {name:'Bett', go:'geht zum Bett', doing:'kuschelt sich zum Lesen ins Bett', mark:' 📚', onArrive: () => window.Books && Books.openRead()});
  await put('kueche', kitchenCanvas, 1.5, 3.2, 1.0, {name:'Küchentisch', go:'läuft zum Küchentisch', doing:'schaut, was es zu essen gibt', mark:' 🍎', onArrive: () => window.Needs && Needs.open()});
  await put('buecher', booksCanvas, 1.4, -3.7, .2, {name:'Bücherregal', go:'läuft zum Bücherregal', doing:'stöbert im Bücherregal', mark:' 📚', onArrive: () => window.Books && Books.openRead()});
  place('tuer', doorCanvas(), 1.0, -3.6, 2.2, {name:'Tür', go:'läuft zur Haustür', doing:'öffnet die Tür', onArrive: () => { const h = homeHouses.get(RS.owner); if (h) RS.W.home.spawn = h.g.position.clone().multiplyScalar(.82); L.travel('home'); }});
  await put('staffelei', easelCanvas, .9, 1.6, 2.2, {name:'Einrichten', go:'läuft zur Staffelei', doing:'überlegt, wie das Zimmer aussehen soll', mark:' 🎨', onArrive: openDecorate});
  // Bilderwand hängt flach an der Rückwand über dem Tisch
  unplace('bilder'); if (!has('bilder')) return;
  const pic = await picsCanvas();
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4*pic.height/pic.width), new THREE.MeshBasicMaterial({map:tex(pic), transparent:true})); pm.position.set(.9, 2.9, -2.58); G.add(pm);
  pm.userData.act = {kind:'sight', ref:{pos:new V3(.6, 0, -1.7), name:'Bilderwand'}, go:'läuft zur Bilderwand', doing:'bewundert ihre Bilder', marvel:true, off:.8, fxH:2.4, onArrive: () => L.openMine()};
  world.picks.push(pm); furn.bilder = {mesh:pm};
}
let emptyAt = 0;
world.onEnter = () => { furnish();
  const w = window.Rewards && Rewards.wishItem(), few = MOEBEL().filter(it => P.items[it.id]).length < 2;
  if (w && w.type === 'moebel' && Date.now() - emptyAt > 3*60e3){ emptyAt = Date.now();
    setTimeout(() => P.stars >= w.price
      ? RS.say(`Wir haben genug Sterne für ${Rewards.article(w)} ${w.name}! ${w.emoji} Kaufen wir es im Laden?`, {label:'🛍 Zum Laden', prio:2, ms:20000, onClick: () => Rewards.openShop()})
      : RS.say((few ? 'Mein Zimmer ist noch so leer … ' : '') + `Ich wünsche mir ${Rewards.article(w)} ${w.name}! ${w.emoji} Dafür fehlen noch ${w.price - P.stars} Sterne. Lösen wir Rätsel am Rätsel-Tisch?`, {label:'🧠 Zum Rätsel-Tisch', prio:2, ms:20000, onClick: goToDesk}), 2500); } };
addEventListener('rs:world', () => { if (RS.worldId === 'home') RS.W.home.spawn = undefined; });   // nur einmal vor der Haustür ankommen
['rs:goodie', 'rs:scanned', 'rs:books', 'rs:painted'].forEach(ev => addEventListener(ev, () => { if (RS.worldId === 'house') furnish(); }));
// Zum Rätsel-Tisch laufen (von überall: erst nach Hause reisen)
function goToDesk(){
  L.closeSheet();
  if (!hasHouse()){ RS.say('Ich habe noch kein Haus … Zeichnest du mir eins? 🏠', {label:'✎ Haus scannen', labelFor:'scanFile', prio:3, onClick: () => RS.setScanContext({house:true})}); return; }
  if (RS.worldId !== 'house'){ L.travel('house'); setTimeout(() => furn.tisch && RS.walkTo(furn.tisch.act), 2200); } else if (furn.tisch) RS.walkTo(furn.tisch.act);
}
RS.$('homeBtn').onclick = () => {
  if (!hasHouse()) return RS.say('Ich habe noch kein Haus … Zeichnest du mir eins? 🏠', {label:'✎ Haus scannen', labelFor:'scanFile', prio:3, onClick: () => RS.setScanContext({house:true})});
  if (RS.worldId === 'house') return L.toast('🏠 Du bist schon zu Hause');
  L.travel('house');
};
// ---------- Zimmer einrichten ----------
function openDecorate(){
  const r = ROOM();
  L.openSheet('🎨 Zimmer einrichten', body => {
    const sec = (t, opts, cur, set, isCol) => { body.append(L.el('h3', 'albumh', t)); const g = L.el('div', 'things');
      opts.forEach(([v, label]) => { const b = L.btn(isCol ? '' : label, 'small' + (v === cur ? ' main' : '') + (isCol ? ' swatch' : ''), () => { set(v); L.save(); furnish(); openDecorate(); }); if (isCol){ b.style.background = v; b.setAttribute('aria-label', label); } g.append(b); }); body.append(g); };
    sec('Tapete', Object.entries(WALLS), r.wall, v => r.wall = v);
    sec('Farbe der Tapete', WALLCOLS.map(c => [c, c]), r.wallCol, v => r.wallCol = v, true);
    sec('Boden', [['hell', 'Helles Holz'], ['dunkel', 'Dunkles Holz'], ['rosa', 'Rosa']], r.floor, v => r.floor = v);
    sec('Teppich', ACCENTS.map(c => [c, c]), r.rug, v => r.rug = v, true);
    sec('Bettdecke', ACCENTS.map(c => [c, c]), r.bed, v => r.bed = v, true);
    sec('Lampe', ACCENTS.map(c => [c, c]), r.lamp, v => r.lamp = v, true);
    L.row(body, [L.btn('Fertig ✦', 'main', L.closeSheet)]);
  });
}
window.House = {goToDesk, furnish, placeHouses, openDecorate, get hasHouse(){ return hasHouse(); }, get furniture(){ return ['tisch', 'bett', 'kueche', 'regal', 'teppich', 'buecher', 'bilder', 'staffelei'].filter(has); }};
})();
