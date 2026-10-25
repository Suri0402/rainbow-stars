// Rainbow Stars – Sternenwelt: Planeten als schwebende Inseln, Sternenfee Luna, Minispiele (Planeten ordnen, Sternbilder, Mondsprung)
(() => {
const RS = window.RS, L = window.Learn, { THREE, V3, cnv, wob, pencil, ink, star, bill, shadow, tex, RAINBOW } = RS;
const world = RS.addWorld({id:'space', name:'Sternenwelt', fog:0x2a2150, spawn:new V3(0,0,3), hello:'ist in der Sternenwelt gelandet ✦'});
const G = world.group;

// ---------- Boden & Himmel ----------
{ const [c,x] = cnv(256,256); x.fillStyle = '#3b3070'; x.fillRect(0,0,256,256);
  for (let i=0;i<16;i++){ x.fillStyle = i%2 ? 'rgba(255,255,255,.07)' : 'rgba(120,90,200,.25)'; x.beginPath(); x.ellipse(Math.random()*256, Math.random()*256, 20+Math.random()*34, 10+Math.random()*16, 0, 0, 7); x.fill(); }
  for (let i=0;i<70;i++){ x.fillStyle = `rgba(255,${230+Math.random()*25|0},${200+Math.random()*55|0},${.4+Math.random()*.5})`; x.beginPath(); x.arc(Math.random()*256, Math.random()*256, .8+Math.random()*1.6, 0, 7); x.fill(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(22,22);
  const g = new THREE.Mesh(new THREE.CircleGeometry(80,64), new THREE.MeshBasicMaterial({map:t})); g.rotation.x = -Math.PI/2; G.add(g); }
const far = [];
for (let i=0;i<150;i++){
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex(RS.starCs[i%6]), transparent:true, alphaTest:.05, fog:false}));
  const a = Math.random()*6.28, r = 26 + Math.random()*22; sp.position.set(Math.cos(a)*r, 2 + Math.random()*24, Math.sin(a)*r);
  const s = .12 + Math.random()*.32; sp.scale.set(s,s,1); sp.userData = {s, ph:Math.random()*6}; G.add(sp); far.push(sp);
}
function nebulaCanvas(cols){ const [c,x] = cnv(512,256);
  cols.forEach((col,i) => { const gx = 110 + i*150 + Math.random()*40, gy = 120 + Math.random()*40, g = x.createRadialGradient(gx, gy, 5, gx, gy, 150);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0,0,512,256); });
  return c; }
[[['rgba(255,140,200,.45)','rgba(150,120,255,.4)','rgba(120,200,255,.35)'], 0, -46], [['rgba(120,220,200,.35)','rgba(255,200,120,.35)','rgba(200,140,255,.4)'], -40, 20], [['rgba(255,170,120,.35)','rgba(170,140,255,.4)','rgba(255,140,200,.35)'], 42, 14]]
  .forEach(([cols, x, z]) => { const m = bill(nebulaCanvas(cols), 34, G); m.position.set(x, 2, z); m.material.fog = false; m.material.alphaTest = 0; m.material.depthWrite = false; });

// ---------- Himmelskörper zeichnen (Bleistift-Stil wie die Tiere) ----------
function ball(x, cx, cy, r, col){ const p = wob(cx, cy, r, r, 40, .02); pencil(x, p, col); return p; }
function bands(x, p, cx, cy, r, list){ x.save(); RS.trace(x, p); x.clip(); list.forEach(([y, h, col]) => { x.fillStyle = col; x.beginPath();
  for (let k=0;k<=20;k++){ const X = cx - r + k/20*2*r, Y = cy + y*r + Math.sin(k*.9)*r*.03; k ? x.lineTo(X, Y) : x.moveTo(X, Y); }
  for (let k=20;k>=0;k--){ const X = cx - r + k/20*2*r, Y = cy + (y+h)*r + Math.sin(k*.9+1)*r*.03; x.lineTo(X, Y); } x.fill(); }); x.restore(); }
function shine(x, cx, cy, r){ x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(cx - r*.38, cy - r*.42, r*.22, r*.12, -.6, 0, 7); x.fill(); }
const DRAW = {
  sonne(x){ for (let k=0;k<14;k++){ const a = k/14*Math.PI*2, p = [[200+Math.cos(a-.12)*112, 200+Math.sin(a-.12)*112], [200+Math.cos(a)*176, 200+Math.sin(a)*176], [200+Math.cos(a+.12)*112, 200+Math.sin(a+.12)*112]]; pencil(x, p, k%2 ? '#ffb36b' : '#ffe066', false); ink(x, p, true, 2.2); }
    const p = ball(x, 200, 200, 120, '#ffd84d'); ink(x, p, true, 3); x.fillStyle = 'rgba(255,150,60,.3)'; [[160,170,18],[240,230,24],[230,160,12]].forEach(([a,b,r]) => { x.beginPath(); x.arc(a,b,r,0,7); x.fill(); });
    x.fillStyle = '#3b2a3a'; [[165,195],[235,195]].forEach(([a,b]) => { x.beginPath(); x.ellipse(a,b,7,10,0,0,7); x.fill(); }); ink(x, [[175,232],[200,248],[225,232]], false, 2.4);
    x.fillStyle = 'rgba(255,120,140,.45)'; [[140,225],[260,225]].forEach(([a,b]) => { x.beginPath(); x.ellipse(a,b,16,9,0,0,7); x.fill(); }); shine(x, 200, 200, 120); return [400,400]; },
  merkur(x){ const p = ball(x, 100, 100, 80, '#b9b0aa'); [[70,80,12],[125,120,16],[110,60,8],[60,130,9]].forEach(([a,b,r]) => { const q = wob(a,b,r,r*.8,16,.05); pencil(x, q, '#9b918b', false); ink(x, q, true, 1.4); }); ink(x, p, true, 2.6); shine(x,100,100,80); return [200,200]; },
  venus(x){ const p = ball(x, 100, 100, 80, '#f3cf8a'); bands(x, p, 100, 100, 80, [[-.5,.18,'rgba(255,240,200,.6)'],[.1,.22,'rgba(220,160,90,.35)'],[.5,.15,'rgba(255,240,200,.5)']]); ink(x, p, true, 2.6); shine(x,100,100,80); return [200,200]; },
  erde(x){ const p = ball(x, 100, 100, 80, '#7cc4ff'); x.save(); RS.trace(x, p); x.clip();
    [[[60,70],[95,55],[110,85],[85,115],[55,100]], [[120,110],[150,100],[160,140],[130,160]], [[95,140],[115,150],[100,175],[80,165]]].forEach(q => { pencil(x, q, '#7fdca4', false); ink(x, q, true, 1.8); });
    x.fillStyle = 'rgba(255,255,255,.85)'; [[50,40,40,9],[140,60,30,8],[110,185,46,10]].forEach(([a,b,w,h]) => { x.beginPath(); x.ellipse(a,b,w,h,0,0,7); x.fill(); }); x.restore();
    ink(x, p, true, 2.6); shine(x,100,100,80); return [200,200]; },
  mond(x){ const p = ball(x, 100, 100, 80, '#eeeae0'); [[70,75,14],[120,115,20],[115,60,9],[65,125,10],[140,80,7]].forEach(([a,b,r]) => { const q = wob(a,b,r,r*.85,16,.05); pencil(x, q, '#d3cdbf', false); ink(x, q, true, 1.4); }); ink(x, p, true, 2.6); shine(x,100,100,80); return [200,200]; },
  mars(x){ const p = ball(x, 100, 100, 80, '#ff8a5c'); bands(x, p, 100, 100, 80, [[-.92,.22,'rgba(255,255,255,.85)'],[.1,.25,'rgba(190,80,50,.35)']]);
    const v = [[60,120],[78,92],[96,120]]; pencil(x, v, '#d9643f', false); ink(x, v, true, 1.6); ink(x, p, true, 2.6); shine(x,100,100,80); return [200,200]; },
  jupiter(x){ const p = ball(x, 120, 120, 100, '#f0c79a'); bands(x, p, 120, 120, 100, [[-.75,.16,'#d79a6c'],[-.38,.14,'#fff0dc'],[-.1,.2,'#c98458'],[.25,.12,'#fff0dc'],[.48,.18,'#d79a6c'],[.78,.12,'#c98458']]);
    const s = wob(155,150,22,13,20,.04); pencil(x, s, '#e5604a', false); ink(x, s, true, 1.8); ink(x, p, true, 3); shine(x,120,120,100); return [240,240]; },
  saturn(x){ const ringBack = (a0, a1) => { x.save(); x.lineCap = 'round'; x.beginPath(); x.ellipse(180, 110, 165, 42, -.12, a0, a1); x.lineWidth = 30; x.strokeStyle = '#3b2a3a'; x.stroke(); x.lineWidth = 24; x.strokeStyle = '#f3dca2'; x.stroke(); x.lineWidth = 6; x.strokeStyle = '#d8b878'; x.stroke(); x.restore(); };
    ringBack(Math.PI, Math.PI*2); const p = ball(x, 180, 110, 78, '#f5d58e'); bands(x, p, 180, 110, 78, [[-.5,.16,'#e8bf74'],[.05,.15,'#fff0cc'],[.4,.18,'#e8bf74']]); ink(x, p, true, 2.6); shine(x,180,110,78); ringBack(0, Math.PI); return [360,220]; },
  uranus(x){ const p = ball(x, 100, 100, 80, '#9fe6e0'); bands(x, p, 100, 100, 80, [[-.1,.2,'rgba(255,255,255,.3)']]); ink(x, p, true, 2.6);
    x.save(); x.beginPath(); x.ellipse(100,100,26,96,.1,0,7); x.lineWidth = 3; x.strokeStyle = 'rgba(59,42,58,.6)'; x.stroke(); x.restore(); shine(x,100,100,80); return [200,200]; },
  neptun(x){ const p = ball(x, 100, 100, 80, '#5f8cff'); bands(x, p, 100, 100, 80, [[-.4,.14,'rgba(255,255,255,.25)'],[.3,.12,'rgba(40,60,190,.35)']]);
    const s = wob(120,80,14,8,16,.04); pencil(x, s, '#3a5ad8', false); ink(x, s, true, 1.5); ink(x, p, true, 2.6); shine(x,100,100,80); return [200,200]; },
  pluto(x){ const p = ball(x, 100, 100, 80, '#d9c2a6'); const h = []; for (let k=0;k<40;k++){ const t = k/40*Math.PI*2; h.push([110+16*Math.pow(Math.sin(t),3)*1.6, 110-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*1.6]); }
    pencil(x, h, '#fff4e6', false); ink(x, h, true, 1.6); ink(x, p, true, 2.6); shine(x,100,100,80); return [200,200]; },
  komet(x){ for (let k=0;k<3;k++){ const p = [[110,90-k*14],[400,60-k*30+k*k*4],[410,130+k*18],[110,130+k*10]]; x.fillStyle = ['rgba(180,220,255,.55)','rgba(255,255,255,.5)','rgba(200,170,255,.45)'][k]; RS.trace(x, p); x.fill(); }
    const p = ball(x, 100, 110, 42, '#cfe6ff'); ink(x, p, true, 2.4); shine(x,100,110,42); return [420,220]; },
  iss(x){ [[20,60],[200,60]].forEach(([a,b]) => { const p = [[a,b],[a+80,b],[a+80,b+80],[a,b+80]]; pencil(x, p, '#7c8fff', false); ink(x, p, true, 2.2);
      for (let k=1;k<4;k++){ ink(x, [[a+k*20,b],[a+k*20,b+80]], false, 1.2); ink(x, [[a,b+k*20],[a+80,b+k*20]], false, 1.2); } });
    const body = [[100,88],[200,88],[200,112],[100,112]]; pencil(x, body, '#e8e8f0'); ink(x, body, true, 2.4);
    const mod = wob(150,100,26,22,24,.03); pencil(x, mod, '#ffffff'); ink(x, mod, true, 2.4); return [300,200]; },
};
function drawBody(key){ const [c, x] = cnv(420, 420), [w, h] = DRAW[key](x); const [o, ox] = cnv(w, h); ox.drawImage(c, 0, 0, w, h, 0, 0, w, h); return o; }

// Namensschild unter jedem Himmelskörper (wird nach dem Laden der Schrift neu gezeichnet)
function labelCanvas(t){ const [c, x] = cnv(256, 72); x.font = '40px "Patrick Hand", cursive'; const w = Math.min(240, x.measureText(t).width + 34);
  x.fillStyle = 'rgba(251,247,238,.92)'; x.strokeStyle = '#342c3a'; x.lineWidth = 3; x.beginPath(); if (x.roundRect) x.roundRect((256-w)/2, 10, w, 52, 26); else x.rect((256-w)/2, 10, w, 52); x.fill(); x.stroke();
  x.fillStyle = '#342c3a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 128, 38); return c; }

// ---------- Himmelskörper platzieren ----------
// key, Name, "zu …", "bestaunt …", Breite, Position (x, z), Schwebehöhe
const BODIES = [
  ['sonne', 'Sonne', 'zur Sonne', 'die Sonne', 3.4, 0, -11, 1.4],
  ['merkur', 'Merkur', 'zum Merkur', 'den Merkur', .55, -2.6, -8.2, 1.0],
  ['venus', 'Venus', 'zur Venus', 'die Venus', .8, 2.8, -7.6, 1.1],
  ['erde', 'Erde', 'zur Erde', 'die Erde', .9, -4.8, -4.6, 1.2],
  ['mond', 'Mond', 'zum Mond', 'den Mond', .4, -6.3, -3.4, 1.8],
  ['iss', 'ISS', 'zur ISS', 'die Raumstation ISS', .75, -3.4, -2.9, 2.1],
  ['mars', 'Mars', 'zum Mars', 'den Mars', .7, 4.9, -4.2, 1.0],
  ['jupiter', 'Jupiter', 'zum Jupiter', 'den Jupiter', 1.8, -6.8, .8, 1.3],
  ['saturn', 'Saturn', 'zum Saturn', 'den Saturn', 2.5, 6.9, 1.2, 1.3],
  ['uranus', 'Uranus', 'zum Uranus', 'den Uranus', 1.1, -4.6, 5.4, 1.2],
  ['neptun', 'Neptun', 'zum Neptun', 'den Neptun', 1.05, 4.4, 5.8, 1.2],
  ['pluto', 'Pluto', 'zum Pluto', 'den Zwergplaneten Pluto', .42, 1.8, 9.2, .8],
  ['komet', 'Komet', 'zum Kometen', 'den Kometen', 1.8, 8.8, -8.4, 2.4],
];
const floaters = [], labels = [];
BODIES.forEach(([key, name, zu, akk, w, x, z, y], i) => {
  const g = new THREE.Group(); g.position.set(x, 0, z); G.add(g);
  const body = new THREE.Group(); body.position.y = y; g.add(body);
  w *= 1.3; const m = bill(drawBody(key), w, body, .5); shadow(Math.min(2.8, w*.8), g);
  const lab = new THREE.Sprite(new THREE.SpriteMaterial({map:tex(labelCanvas(name)), transparent:true, depthWrite:false})); lab.scale.set(1.15, .32, 1); lab.position.y = .25; lab.userData.name = name; g.add(lab); labels.push(lab);
  floaters.push({body, y:y + (w > 1.5 ? .25 : 0), ph:i*1.3});
  const act = {kind:'planet', ref:{pos:new V3(x, 0, z)}, go:'läuft ' + zu, doing:'bestaunt ' + akk, mark:' ✦', marvel:true, off:Math.min(2, w*.5 + .55), fxH:y + .3,
    onArrive: () => L.discover('space', key)};
  m.userData.act = act; world.acts.push(act); world.picks.push(m);
});
document.fonts && document.fonts.ready.then(() => labels.forEach(l => { l.material.map = tex(labelCanvas(l.userData.name)); l.material.needsUpdate = true; }));

// ---------- Sternenfee Luna (Reiseführerin) ----------
function lunaCanvas(){ const [c, x] = cnv(240, 280);
  [[60,120,-.5],[180,120,.5]].forEach(([wx, wy, r]) => { const p = wob(wx, wy, 52, 30, 26, .05, r); pencil(x, p, 'rgba(200,230,255,.95)', false); ink(x, p, true, 2); });
  const dress = [[120,140],[180,250],[60,250]]; pencil(x, dress, '#b49bff'); ink(x, dress, true, 2.6);
  const h = wob(120, 100, 46, 44, 32, .03); pencil(x, h, '#ffe0cf'); ink(x, h);
  const hair = [[74,96],[78,58],[120,44],[162,58],[166,96],[150,74],[120,66],[90,74]]; pencil(x, hair, '#ffe066'); ink(x, hair, true, 2.4);
  star(x, 120, 30, 20, '#ffe066', 0);
  x.fillStyle = '#2b2230'; [[104,104],[136,104]].forEach(([a,b]) => { x.beginPath(); x.ellipse(a,b,5,7,0,0,7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(a-1.5,b-2.5,1.8,0,7); x.fill(); x.fillStyle = '#2b2230'; });
  ink(x, [[110,122],[120,128],[130,122]], false, 2); x.fillStyle = 'rgba(255,130,160,.5)'; [[92,118],[148,118]].forEach(([a,b]) => { x.beginPath(); x.ellipse(a,b,9,5,0,0,7); x.fill(); });
  x.lineCap = 'round'; x.lineWidth = 5; x.strokeStyle = '#3b2a3a'; x.beginPath(); x.moveTo(172,170); x.lineTo(206,130); x.stroke(); star(x, 210, 124, 16, '#ff8fb1', .3);
  return c; }
const luna = RS.addCreature({name:'Sternenfee Luna', c:lunaCanvas(), w:.75, kind:'float', pos:new V3(1.6, 0, 1.6), rnd:Math.random, wid:'space'});
luna.act.go = 'fliegt zu Sternenfee Luna'; luna.act.doing = 'plaudert mit Sternenfee Luna';
luna.act.onArrive = () => L.P.cards.massstab ? L.openQuests('space') : L.discover('space', 'luna', {label:'Aufträge ansehen ✦', run: () => L.openQuests('space')});
L.addPortal('space', new V3(-2.2, 0, 9.2));

// ---------- Minispiele ----------
function planetsGame(){ L.askById('q-planeten-1', ok => { if (ok){ L.P.games.planets = true; L.save(); L.unlockCard('planeten-reihe'); L.checkQuests(); } }); }

const CONST = {
  'grosser-wagen': {name:'Großer Wagen', stars:[[.80,.30],[.82,.55],[.60,.60],[.56,.38],[.40,.35],[.24,.30],[.08,.40]], edges:[[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]]},
  kassiopeia: {name:'Kassiopeia', stars:[[.10,.32],[.30,.68],[.50,.44],[.70,.70],[.90,.30]], edges:[[0,1],[1,2],[2,3],[3,4]]},
  orion: {name:'Orion', stars:[[.30,.14],[.70,.20],[.42,.52],[.50,.49],[.58,.46],[.34,.88],[.74,.84]], edges:[[0,1],[0,2],[1,4],[2,3],[3,4],[2,5],[4,6]]},
};
function starGame(id = 'grosser-wagen'){
  const S = CONST[id];
  L.openSheet('Sternbild: ' + S.name, body => {
    body.append(L.el('p', 'tip', 'Verbinde die Sterne: Tippe einen Stern an und dann seinen Nachbarn im Sternbild. Die schwachen Linien helfen dir.'));
    const tabs = L.el('div', 'row'); Object.entries(CONST).forEach(([k, v]) => tabs.append(L.btn((L.P.games['sb-' + k] ? '✔ ' : '') + v.name, k === id ? 'small main' : 'small', () => starGame(k)))); body.append(tabs);
    const view = L.el('div', 'view night'); const cv = document.createElement('canvas'); cv.width = 600; cv.height = 420; view.append(cv); body.append(view);
    const done = new Set(), x = cv.getContext('2d'); let sel = -1, shakeT = 0;
    const P = i => [S.stars[i][0]*cv.width, S.stars[i][1]*cv.height];
    function draw(){ x.clearRect(0,0,cv.width,cv.height);
      x.setLineDash([6,10]); x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.18)'; S.edges.forEach(([a,b]) => { const [ax,ay] = P(a), [bx,by] = P(b); x.beginPath(); x.moveTo(ax,ay); x.lineTo(bx,by); x.stroke(); });
      x.setLineDash([]); x.lineWidth = 5; x.strokeStyle = '#ffe066'; x.lineCap = 'round'; done.forEach(k => { const [a,b] = k.split('-').map(Number), [ax,ay] = P(a), [bx,by] = P(b); x.beginPath(); x.moveTo(ax,ay); x.lineTo(bx,by); x.stroke(); });
      S.stars.forEach((_, i) => { const [sx, sy] = P(i); star(x, sx, sy, i === sel ? 24 : 17, i === sel ? '#ff8fb1' : '#fff4c2', 0); }); }
    const tip = L.el('p', 'note', ''); body.append(tip);
    cv.addEventListener('pointerdown', e => {
      const b = cv.getBoundingClientRect(), px = (e.clientX - b.left)/b.width*cv.width, py = (e.clientY - b.top)/b.height*cv.height;
      let hit = -1, best = 1e9; S.stars.forEach((_, i) => { const [sx, sy] = P(i), d = Math.hypot(sx-px, sy-py); if (d < best){ best = d; hit = i; } });
      if (best > 50) return;
      if (sel < 0 || sel === hit){ sel = sel === hit ? -1 : hit; draw(); return; }
      const e1 = S.edges.find(([a,b]) => (a === sel && b === hit) || (a === hit && b === sel));
      if (e1){ done.add(Math.min(sel,hit) + '-' + Math.max(sel,hit)); tip.textContent = `${done.size} von ${S.edges.length} Linien`; }
      else tip.textContent = 'Diese beiden Sterne sind nicht verbunden – probier einen anderen Nachbarn.';
      sel = hit; draw();
      if (done.size === S.edges.length){
        const first = !L.P.games['sb-' + id]; L.P.games['sb-' + id] = true; L.save();
        tip.textContent = 'Geschafft! ✦'; if (first) L.addStars(3, S.name);
        setTimeout(() => { L.unlockCard(id); L.checkQuests(); L.showCard(id, {isNew:first}); }, 900);
      }
    });
    draw(); L.row(body, [L.btn('Schließen', '', L.closeSheet)]);
  });
}

function jumpGame(){
  L.openSheet('Wie hoch springst du?', body => {
    body.append(L.el('p', 'tip', 'Wie hoch kannst du auf der Erde springen? Stell es ein und schau, was auf anderen Himmelskörpern passiert.'));
    const lab = L.el('label', 'field', 'Auf der Erde: '), r = document.createElement('input'); r.type = 'range'; r.min = 10; r.max = 70; r.value = 30; const v = L.el('b', '', '30 cm'); lab.append(r, v); body.append(lab);
    const bars = L.el('div', 'bars'); body.append(bars);
    const G = [['Erde', 9.81, '#7cc4ff'], ['Mond', 1.62, '#eeeae0'], ['Mars', 3.71, '#ff8a5c'], ['Jupiter', 24.79, '#f0c79a']];
    function upd(){ const h = +r.value; v.textContent = h + ' cm'; bars.replaceChildren();
      G.forEach(([n, g, col]) => { const cm = h*9.81/g, b = L.el('div', 'bar'), fill = L.el('i'); fill.style.height = Math.min(100, cm/4.5) + '%'; fill.style.background = col;
        b.append(fill, L.el('b', '', cm >= 100 ? (cm/100).toFixed(1).replace('.', ',') + ' m' : Math.round(cm) + ' cm'), L.el('span', '', n)); bars.append(b); }); }
    r.oninput = upd; upd();
    L.row(body, [L.btn('Verstanden ✦', 'main', () => { const first = !L.P.games.jump; L.P.games.jump = true; L.save(); if (L.unlockCard('schwerkraft') || first) L.checkQuests(); L.showCard('schwerkraft'); })]);
  });
}

// ---------- Aufträge der Sternenwelt ----------
addEventListener('rs:scanned', e => { if (e.detail.world === 'space'){ L.P.games.drawn = true; L.save(); L.checkQuests(); } });
const quests = [
  {id:'luna', text:'Sprich mit Sternenfee Luna', goal: P => [P.flags['space:talked'] ? 1 : 0, 1]},
  {id:'discover4', text:'Entdecke 4 Himmelskörper', goal: () => [L.discoveredObjects('space'), 4]},
  {id:'answer5', text:'Löse 5 Rätsel an den Planeten', goal: () => [L.correctIn('space'), 5]},
  {id:'planets', text:'Bring die Planeten in die richtige Reihenfolge', goal: P => [P.games.planets ? 1 : 0, 1], action:{label:'Spielen', run:planetsGame}},
  {id:'stars', text:'Verbinde ein Sternbild', goal: P => [['grosser-wagen','kassiopeia','orion'].some(k => P.games['sb-' + k]) ? 1 : 0, 1], action:{label:'Spielen', run:() => starGame(), again:true}},
  {id:'jump', text:'Finde heraus, wie hoch du auf dem Mond springst', goal: P => [P.games.jump ? 1 : 0, 1], action:{label:'Testen', run:jumpGame}},
  {id:'draw', text:'Zeichne einen eigenen Planeten und scanne ihn hier ein', goal: P => [P.games.drawn ? 1 : 0, 1], action:{label:'Scannen', run:() => RS.openScan()}},
  {id:'all', text:'Entdecke alle 13 Himmelskörper', goal: () => [L.discoveredObjects('space'), 13], reward:5},
];

fetch('content/space.json').then(r => r.json()).then(content => L.registerWorld({id:'space', name:'Sternenwelt', content, quests, names:Object.fromEntries([...BODIES.map(b => [b[0], b[2]]), ['luna', 'von Luna']]), guide:'Sternenfee Luna', stampIcon:'☾',
  guideText:'Willkommen in der Sternenwelt! Tippe auf die Sonne, die Planeten und alles, was leuchtet. Lies die Wissenskarte – danach gibt es dort ein Rätsel. Für jede Entdeckung und jede richtige Antwort bekommst du Regenbogensterne.',
  reward:{id:'tiara', name:'der Sternen-Haarreif'}})).catch(e => console.warn('Inhalte der Sternenwelt fehlen', e));

world.update = (dt, t) => {
  floaters.forEach(f => f.body.position.y = f.y + Math.sin(t*.9 + f.ph)*.12);
  far.forEach(s => { const u = s.userData, k = u.s*(.75 + .25*Math.sin(t*2.2 + u.ph)); s.scale.set(k, k, 1); });
};
})();
