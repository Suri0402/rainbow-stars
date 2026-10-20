// Rainbow Stars – Zeitmaschine: Dino-Tal, Altes Ägypten, Ritterburg. Jede Station wird durch ein gelesenes Buch freigeschaltet.
(() => {
const RS = window.RS, L = window.Learn, { THREE, V3, cnv, wob, pencil, ink, star, bill, shadow, tex } = RS;
const world = RS.addWorld({id:'time', name:'Zeitmaschine', fog:0xf1dfc4, spawn:new V3(0, 0, 5), hello:'ist mit der Zeitmaschine gereist ⌛'});
const G = world.group, E = (e, s = 220) => window.Rewards.emojiCanvas(e, s);

// ---------- Boden: drei Inseln für die Stationen ----------
function groundTex(base, dots, n = 60){ const [c, x] = cnv(256, 256); x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i=0;i<n;i++){ x.fillStyle = dots[i % dots.length]; x.beginPath(); x.ellipse(Math.random()*256, Math.random()*256, 6 + Math.random()*22, 4 + Math.random()*10, Math.random()*3, 0, 7); x.fill(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
{ const t = groundTex('#e9dcc0', ['rgba(255,255,255,.25)', 'rgba(190,160,110,.25)']); t.repeat.set(22, 22);
  const g = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshBasicMaterial({map:t})); g.rotation.x = -Math.PI/2; G.add(g); }
function island(x, z, r, base, dots){ const t = groundTex(base, dots, 40); t.repeat.set(3, 3);
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({map:t, transparent:true, opacity:.95})); m.rotation.x = -Math.PI/2; m.position.set(x, .006, z); G.add(m); return m; }

// gezeichnete Dinge im Bleistift-Stil
function pyramidCanvas(){ const [c, x] = cnv(420, 300); const p = [[20,290],[210,20],[400,290]]; pencil(x, p, '#f0c879'); ink(x, p, true, 3.4);
  const side = [[210,20],[400,290],[260,290]]; x.fillStyle = 'rgba(160,110,50,.25)'; RS.trace(x, side); x.fill();
  for (let k=1;k<8;k++){ const y = 20 + k*34, w = (y-20)/270*190; ink(x, [[210-w, y],[210+w, y]], false, 1.2); } return c; }
function mummyCanvas(){ const [c, x] = cnv(160, 300); const b = wob(80, 160, 60, 135, 36, .03); pencil(x, b, '#f3ead6'); ink(x, b, true, 3);
  for (let k=0;k<9;k++){ const y = 60 + k*24; ink(x, [[30, y + (k%2)*8], [130, y + 10 - (k%2)*8]], false, 1.6); }
  x.fillStyle = '#2b2230'; [[62,80],[98,80]].forEach(([a,b2]) => { x.beginPath(); x.arc(a, b2, 7, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(a-2, b2-2, 2.2, 0, 7); x.fill(); x.fillStyle = '#2b2230'; }); return c; }
function signCanvas(text, locked){ const [c, x] = cnv(420, 220); const board = [[20,20],[400,20],[400,130],[20,130]]; pencil(x, board, locked ? '#d9d2e6' : '#f6e3b4'); ink(x, board, true, 3);
  const post = [[195,130],[225,130],[225,215],[195,215]]; pencil(x, post, '#b98866'); ink(x, post, true, 2.6);
  x.fillStyle = '#342c3a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '36px "Patrick Hand", cursive';
  const lines = text.split('\n'); lines.forEach((t, i) => x.fillText(t, 210, 75 + (i - (lines.length-1)/2)*38)); return c; }
function labelCanvas(t){ const [c, x] = cnv(256, 72); x.font = '40px "Patrick Hand", cursive'; const w = Math.min(240, x.measureText(t).width + 34);
  x.fillStyle = 'rgba(251,247,238,.92)'; x.strokeStyle = '#342c3a'; x.lineWidth = 3; x.beginPath(); if (x.roundRect) x.roundRect((256-w)/2, 10, w, 52, 26); else x.rect((256-w)/2, 10, w, 52); x.fill(); x.stroke();
  x.fillStyle = '#342c3a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 128, 38); return c; }

// ---------- Stationen ----------
// [key, Bild, Name, "zu …", "bestaunt …", Breite, dx, dz]
const STATIONS = [
  {id:'dino', name:'Dino-Tal', need:1, x:-7.5, z:-1.5, ground:['#b7d39a', ['rgba(90,130,60,.3)', 'rgba(255,255,255,.2)']], items:[
    ['trex', '🦖', 'T-Rex', 'zum T-Rex', 'den T-Rex', 1.7, -1.8, -1.2], ['langhals', '🦕', 'Langhals', 'zum Langhals-Dino', 'den Langhals-Dino', 2.0, 1.6, -1.8],
    ['ei', '🥚', 'Dino-Ei', 'zum Dino-Ei', 'das Dino-Ei', .6, .2, 1.4], ['knochen', '🦴', 'Fossilien', 'zu den Fossilien', 'die Fossilien', .8, -2.2, 1.6],
    ['ammonit', '🐚', 'Ammonit', 'zum Ammoniten', 'den Ammoniten', .6, 2.4, 1.2], ['asteroid', '🌋', 'Vulkan', 'zum Vulkan', 'den Vulkan', 1.8, 0, -3.4]]},
  {id:'aegypten', name:'Altes Ägypten', need:2, x:0, z:-9, ground:['#f1d79a', ['rgba(220,180,100,.35)', 'rgba(255,255,255,.25)']], items:[
    ['pyramide', pyramidCanvas, 'Pyramide', 'zur Pyramide', 'die Pyramide', 3.2, 0, -2.4], ['mumie', mummyCanvas, 'Mumie', 'zur Mumie', 'die Mumie', .7, -2.6, 0],
    ['papyrus', '📜', 'Papyrus', 'zum Papyrus', 'den Papyrus', .7, 2.6, -.2], ['skarabaeus', '🪲', 'Skarabäus', 'zum Skarabäus', 'den Skarabäus', .55, -1.2, 1.8],
    ['katze', '🐈', 'Katze', 'zur Katze', 'die heilige Katze', .7, 1.4, 1.8], ['boot', '⛵', 'Nil-Boot', 'zum Nil-Boot', 'das Nil-Boot', 1.3, 3.4, 2.2]]},
  {id:'ritter', name:'Ritterburg', need:3, x:7.5, z:-1.5, ground:['#c9e3b0', ['rgba(110,150,80,.3)', 'rgba(255,255,255,.2)']], items:[
    ['burg', '🏰', 'Burg', 'zur Burg', 'die Burg', 2.8, .4, -2.6], ['ritter', '⚔️', 'Ritter', 'zu den Ritter-Schwertern', 'die Ritter-Schwerter', .9, -2.4, -.4],
    ['wappen', '🛡️', 'Wappen', 'zum Wappen', 'das Wappen', .8, 2.6, -.2], ['pferd', '🐴', 'Pferd', 'zum Ritterpferd', 'das Ritterpferd', 1.0, -1.6, 1.8],
    ['schreibstube', '📖', 'Schreibstube', 'zur Schreibstube', 'die Schreibstube', .8, 1.2, 1.9], ['kueche', '🍲', 'Burgküche', 'zur Burgküche', 'die Burgküche', .8, 3.2, 1.8]]},
];
const labels = [];
STATIONS.forEach(s => {
  island(s.x, s.z, 5.2, ...s.ground);
  s.g = new THREE.Group(); G.add(s.g); s.list = [];
  s.items.forEach(([key, pic, name, zu, akk, w, dx, dz]) => {
    const g = new THREE.Group(); g.position.set(s.x + dx, 0, s.z + dz); s.g.add(g);
    const c = typeof pic === 'function' ? pic() : E(pic, 240), m = bill(c, w, g); shadow(Math.min(2.8, w*.8), g);
    const lab = new THREE.Sprite(new THREE.SpriteMaterial({map:tex(labelCanvas(name)), transparent:true, depthWrite:false})); lab.scale.set(1.1, .3, 1); lab.position.y = .2; lab.userData.name = name; g.add(lab); labels.push(lab);
    const act = {kind:'sight', ref:{pos:g.position.clone(), name}, go:'läuft ' + zu, doing:'bestaunt ' + akk, mark:' ✦', marvel:true, off:Math.min(2, w*.45 + .5), fxH:w*.8, onArrive: () => L.discover('time', key)};
    m.userData.act = act; s.list.push({act, mesh:m, key});
  });
  // Schild: Name der Station oder "gesperrt"
  s.sign = new THREE.Group(); s.sign.position.set(s.x, 0, s.z + 3.8); G.add(s.sign);
  s.signAct = {kind:'sight', ref:{pos:s.sign.position.clone(), name:s.name}, go:'läuft zum Schild', doing:'liest das Schild', marvel:true, off:1.0, fxH:1.2,
    onArrive: () => { if (!open(s)){ L.openSheet('🔒 ' + s.name, body => { body.append(L.el('p', 'cardtext', `Diese Station öffnet sich, wenn du ${s.need === 1 ? 'dein erstes Buch' : 'dein ' + s.need + '. Buch'} gelesen hast. Du hast ${window.Books ? Books.count : 0} gelesen.`));
      L.row(body, [L.btn('📚 Zum Lesen', 'main', () => window.Books && Books.openRead()), L.btn('OK', '', L.closeSheet)]); }); } }};
});
const open = s => (window.Books ? Books.count : 0) >= s.need;
function refresh(){
  STATIONS.forEach(s => {
    const isOpen = open(s); s.g.visible = isOpen;
    s.list.forEach(({act, mesh}) => { const ai = world.acts.indexOf(act), pi = world.picks.indexOf(mesh);
      if (isOpen && ai < 0){ world.acts.push(act); world.picks.push(mesh); } if (!isOpen && ai >= 0){ world.acts.splice(ai, 1); world.picks.splice(pi, 1); } });
    s.sign.children.slice().forEach(ch => { s.sign.remove(ch); const pi = world.picks.indexOf(ch); if (pi >= 0) world.picks.splice(pi, 1); });
    const m = bill(signCanvas(isOpen ? s.name : '🔒 ' + s.name + '\nLies noch ' + (s.need - (window.Books ? Books.count : 0)) + ' Buch', !isOpen), 1.8, s.sign); m.userData.act = s.signAct; world.picks.push(m);
    if (!world.acts.includes(s.signAct) && !isOpen) world.acts.push(s.signAct); if (isOpen){ const i = world.acts.indexOf(s.signAct); if (i >= 0) world.acts.splice(i, 1); }
  });
}
addEventListener('rs:books', refresh); addEventListener('rs:profile', () => setTimeout(refresh, 300));
world.onEnter = refresh;
document.fonts && document.fonts.ready.then(() => { labels.forEach(l => { l.material.map = tex(labelCanvas(l.userData.name)); l.material.needsUpdate = true; }); refresh(); });

// ---------- Reiseführerin: Schildkröte Tempo ----------
const tempo = RS.addCreature({name:'Schildkröte Tempo', c:E('🐢', 220), w:.8, kind:'bear', pos:new V3(1.6, 0, 3), rnd:Math.random, wid:'time'});
tempo.speed = .45; tempo.act.go = 'läuft zu Schildkröte Tempo'; tempo.act.doing = 'plaudert mit Schildkröte Tempo';
tempo.act.onArrive = () => L.P.cards.zeitreise ? L.openQuests('time') : L.discover('time', 'tempo', {label:'Aufträge ansehen ✦', run: () => L.openQuests('time')});
L.addPortal('time', new V3(-2.2, 0, 7.5));

// ---------- Minispiele ----------
function fossilGame(){
  L.openSheet('🦴 Fossil ausgraben', body => {
    body.append(L.el('p', 'tip', 'Wisch mit dem Finger den Sand weg – wie eine echte Paläontologin mit dem Pinsel!'));
    const wrap = L.el('div', 'scratch'), W = 360, H = 260, [base, bx] = cnv(W, H), top = document.createElement('canvas'); top.width = W; top.height = H;
    bx.fillStyle = '#cbb894'; bx.fillRect(0, 0, W, H); for (let i=0;i<40;i++){ bx.fillStyle = 'rgba(120,100,70,.18)'; bx.beginPath(); bx.arc(Math.random()*W, Math.random()*H, 4 + Math.random()*16, 0, 7); bx.fill(); }
    const [f, fx] = cnv(220, 220); fx.font = '180px ' + '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; fx.textAlign = 'center'; fx.textBaseline = 'middle'; fx.fillText('🦖', 110, 120);
    const d = fx.getImageData(0, 0, 220, 220); for (let i=0;i<d.data.length;i+=4){ const v = (d.data[i] + d.data[i+1] + d.data[i+2])/3; d.data[i] = 235 - v*.25; d.data[i+1] = 226 - v*.25; d.data[i+2] = 205 - v*.3; } fx.putImageData(d, 0, 0);
    bx.drawImage(f, (W-220)/2, (H-220)/2 + 10);
    const tx = top.getContext('2d'); tx.fillStyle = '#d9b77c'; tx.fillRect(0, 0, W, H); for (let i=0;i<500;i++){ tx.fillStyle = `rgba(${150 + Math.random()*60|0},${110 + Math.random()*50|0},60,.5)`; tx.fillRect(Math.random()*W, Math.random()*H, 2, 2); }
    base.className = 'scratch-base'; top.className = 'scratch-top'; wrap.append(base, top); body.append(wrap);
    const prog = L.el('p', 'note', 'Noch ganz voller Sand …'); body.append(prog);
    let done = false, moves = 0;
    const rub = e => { if (done) return; const r = top.getBoundingClientRect(), x = (e.clientX - r.left)/r.width*W, y = (e.clientY - r.top)/r.height*H;
      tx.globalCompositeOperation = 'destination-out'; tx.beginPath(); tx.arc(x, y, 22, 0, 7); tx.fill(); tx.globalCompositeOperation = 'source-over';
      if (++moves % 8) return; const a = tx.getImageData(0, 0, W, H).data; let clear = 0, n = 0; for (let i=3;i<a.length;i+=4*37){ n++; if (a[i] < 40) clear++; }
      const p = clear/n; prog.textContent = `Freigelegt: ${Math.round(p*100)} %`;
      if (p > .6){ done = true; prog.textContent = 'Geschafft – ein T-Rex-Fossil! ✦'; const first = !L.P.games.fossil; L.P.games.fossil = true; L.save(); if (first) L.addStars(3, 'Fossil');
        setTimeout(() => { L.unlockCard('knochen-1'); L.checkQuests(); L.showCard('knochen-1', {isNew:first}); }, 900); } };
    let down = false; top.addEventListener('pointerdown', e => { down = true; top.setPointerCapture(e.pointerId); rub(e); }); top.addEventListener('pointermove', e => { if (down) rub(e); });
    ['pointerup', 'pointercancel'].forEach(ev => top.addEventListener(ev, () => down = false));
    L.row(body, [L.btn('Schließen', '', L.closeSheet)]);
  });
}
// vereinfachtes Hieroglyphen-Alphabet (Lautzeichen der Ägypter, für Kinder angenähert)
const HIERO = {A:'🦅', B:'🦶', C:'🧺', D:'✋', E:'🪶', F:'🐍', G:'🏺', H:'🌀', I:'🪶', J:'🐍', K:'🧺', L:'🦁', M:'🦉', N:'🌊', O:'🪢', P:'🟫', Q:'⛰️', R:'👄', S:'🧣', T:'🍞', U:'🐤', V:'🐍', W:'🐤', X:'🧺🧣', Y:'🪶🪶', Z:'🔒', 'Ä':'🦅🪶', 'Ö':'🪢🪶', 'Ü':'🐤🪶', 'ß':'🧣🧣'};
function hieroGame(){
  L.openSheet('𓂀 Dein Name in Hieroglyphen', body => {
    body.append(L.el('p', 'tip', 'Die alten Ägypter hatten Zeichen für Laute. Namen von Pharaonen schrieben sie in ein Oval – die Kartusche. Tippe deinen Namen ein (die Zeichen sind vereinfacht).'));
    const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 12; inp.className = 'pininput name'; inp.value = (window.Profiles && Profiles.current && Profiles.current.name) || ''; body.append(inp);
    const cart = L.el('div', 'cartouche'), legend = L.el('p', 'note', ''); body.append(cart, legend);
    const draw = () => { const t = inp.value.toUpperCase().replace(/[^A-ZÄÖÜß]/g, ''); cart.textContent = [...t].map(ch => HIERO[ch] || '').join(' ') || '…';
      legend.textContent = [...t].map(ch => ch + ' = ' + (HIERO[ch] || '?')).join(' · '); };
    inp.oninput = draw; draw();
    L.row(body, [L.btn('Fertig ✦', 'main', () => { if (!inp.value.trim()) return; const first = !L.P.games.hiero; L.P.games.hiero = true; L.save(); if (first) L.addStars(3, 'Hieroglyphen');
      L.unlockCard('papyrus-2'); L.checkQuests(); L.showCard('papyrus-2', {isNew:first}); })]);
  });
}
addEventListener('rs:scanned', e => { if (e.detail.world === 'time' && RS.worldId === 'time'){ L.P.games.wappen = true; L.save(); L.checkQuests(); } });

// ---------- Aufträge ----------
const stationDone = id => { const s = STATIONS.find(x => x.id === id), objs = L.worldOf('time').content.objects; return s.items.filter(([k]) => (objs[k] || []).some(c => L.P.cards[c])).length; };
const locked = (s, text) => open(s) ? text : `🔒 ${text} (nach dem ${s.need}. Buch)`;
const lockedGoal = (s, fn) => () => open(s) ? fn() : [0, 1];
const [SD, SA, SR] = STATIONS;
const quests = [
  {id:'tempo', text:'Sprich mit Schildkröte Tempo', goal: P => [P.flags['time:talked'] ? 1 : 0, 1]},
  {id:'zeitstrahl', text:'Bring die Zeiten in die richtige Reihenfolge', goal: P => [P.games.zeitstrahl ? 1 : 0, 1], action:{label:'Spielen', run:() => L.askById('t-zeit-1', ok => { if (ok){ L.P.games.zeitstrahl = true; L.save(); L.checkQuests(); } })}},
  {id:'dino', get text(){ return locked(SD, 'Entdecke alles im Dino-Tal'); }, goal: lockedGoal(SD, () => [stationDone('dino'), 6])},
  {id:'fossil', get text(){ return locked(SD, 'Grabe ein Fossil aus'); }, goal: lockedGoal(SD, () => [L.P.games.fossil ? 1 : 0, 1]), action:{label:'Graben', run:() => open(SD) ? fossilGame() : L.toast('🔒 Erst nach deinem ersten Buch')}},
  {id:'aegypten', get text(){ return locked(SA, 'Entdecke alles im Alten Ägypten'); }, goal: lockedGoal(SA, () => [stationDone('aegypten'), 6])},
  {id:'hiero', get text(){ return locked(SA, 'Schreib deinen Namen in Hieroglyphen'); }, goal: lockedGoal(SA, () => [L.P.games.hiero ? 1 : 0, 1]), action:{label:'Schreiben', run:() => open(SA) ? hieroGame() : L.toast('🔒 Erst nach deinem 2. Buch')}},
  {id:'ritter', get text(){ return locked(SR, 'Entdecke alles in der Ritterburg'); }, goal: lockedGoal(SR, () => [stationDone('ritter'), 6])},
  {id:'wappen', get text(){ return locked(SR, 'Zeichne dein eigenes Wappen und scanne es hier ein'); }, goal: lockedGoal(SR, () => [L.P.games.wappen ? 1 : 0, 1]), action:{label:'Scannen', run:() => open(SR) ? RS.openScan() : L.toast('🔒 Erst nach deinem 3. Buch')}},
];
// Belohnung am Ende: Forscherhut
L.ITEMS.forscherhut = {name:'Forscherhut', slot:'head', w:1.0, y:200, draw(){ const [c, x] = cnv(300, 190); const brim = wob(150, 150, 140, 30, 30, .03); pencil(x, brim, '#d8b77c'); ink(x, brim, true, 3);
  const top = wob(150, 100, 90, 70, 30, .03); pencil(x, top, '#e6c88e'); ink(x, top, true, 3); x.lineWidth = 12; x.strokeStyle = '#8a5a3c'; x.beginPath(); x.moveTo(64, 128); x.quadraticCurveTo(150, 150, 236, 128); x.stroke(); return c; }};
fetch('content/time.json').then(r => r.json()).then(content => L.registerWorld({id:'time', name:'Zeitmaschine', content, quests, guide:'Schildkröte Tempo', stampIcon:'⌛',
  guideText:'Willkommen in der Zeitmaschine! Jede Station öffnet sich durch ein Buch, das du gelesen hast. Tippe auf alles, was du entdecken willst.',
  reward:{id:'forscherhut', name:'der Forscherhut'}})).catch(e => console.warn('Inhalte der Zeitmaschine fehlen', e));
world.update = (dt, t) => {};
refresh();
})();
