// Rainbow Stars – Lernen & Reisen: Wissenskarten, Fragen, Aufträge, Album, Reisepass, Regenbogen-Tor, Zubehör.
// Baut auf window.RS aus app.js auf; Welten (worlds/*.js) melden sich über Learn.registerWorld an.
(() => {
const RS = window.RS, { THREE, V3, $ } = RS;

// ---------- Fortschritt (IndexedDB, Speicher "progress") ----------
// Jedes Profil hat seinen eigenen Spielstand (Schlüssel "p:<Profil-ID>"). Geladen wird erst nach der Anmeldung.
const P = {stars:0, cards:{}, q:{}, review:[], quests:{}, stamps:{}, items:{}, wear:{}, games:{}, flags:{}, math:{level:2, ok:0, bad:0, solved:0}, stickers:{}, deco:{}};
let saveT = 0, loaded = false, profileId = null, readyResolve;
const save = () => { if (!loaded) return; clearTimeout(saveT); saveT = setTimeout(() => RS.idb.setP('p:' + profileId, P), 300); };
const ready = new Promise(r => readyResolve = r);
// migrate: beim allerersten Profil den bisherigen Spielstand (ohne Profile) übernehmen
async function loadProfile(id, {migrate = false, mathLevel} = {}){
  profileId = id;
  let v = await RS.idb.getP('p:' + id);
  if (!v && migrate) v = await RS.idb.getP('main');
  if (v){
    P.stars += v.stars || 0;
    ['cards','q','quests','stamps','items','wear','games','flags','stickers','deco'].forEach(k => P[k] = Object.assign({}, v[k], P[k]));
    Object.keys(v).forEach(k => { if (!(k in P)) P[k] = v[k]; });
    P.review = [...new Set([...(v.review || []), ...P.review])];
    if (v.math) P.math = Object.assign({}, P.math, v.math);
    if (v.pet && !P.pet) P.pet = v.pet;
  } else if (mathLevel) P.math.level = mathLevel;
  let log = await RS.idb.getP('scanlog:' + id); if (!log && migrate) log = await RS.idb.getP('scanlog');
  if (Array.isArray(log)) scanLog = log.concat(scanLog).slice(-10);
  loaded = true; save(); renderHud(); applyWear(); readyResolve();
  dispatchEvent(new CustomEvent('rs:profile', {detail:{id}}));
}

// ---------- Welten-Register ----------
const worlds = {};   // id -> {id, name, content:{cards, questions, objects}, quests:[...], stampName, reward:{id, name}}
const cardById = {}, qById = {};
function registerWorld(def){
  worlds[def.id] = def;
  def.content.cards.forEach(c => cardById[c.id] = {...c, world:def.id});
  def.content.questions.forEach(q => qById[q.id] = {...q, world:def.id});
  ready.then(() => { renderHud(); checkQuests(); });
}
const worldOf = id => worlds[id];
const discoveredObjects = wid => Object.entries(worlds[wid].content.objects).filter(([k, ids]) => k !== 'luna' && ids.some(i => P.cards[i])).length;
const correctIn = wid => Object.entries(P.q).filter(([id, r]) => qById[id] && qById[id].world === wid && r.ok > 0).length;

// ---------- HUD: Sterne + aktueller Auftrag ----------
const hudStars = $('starsHud'), questChip = $('questChip');
function renderHud(){
  hudStars.querySelector('b').textContent = P.stars;
  const w = worlds[RS.worldId];
  const open = w && w.quests ? w.quests.find(q => !P.quests[w.id + ':' + q.id]) : null;
  questChip.hidden = !w || !w.quests;
  if (!w || !w.quests) return;
  if (open){ const [n, tot] = open.goal(P); questChip.querySelector('span').textContent = open.text + (tot > 1 ? ` (${Math.min(n,tot)}/${tot})` : ''); }
  else questChip.querySelector('span').textContent = 'Alle Aufträge geschafft! ✦';
}
function addStars(n, at){
  P.stars += n; save(); renderHud();
  hudStars.classList.remove('pop'); void hudStars.offsetWidth; hudStars.classList.add('pop');
  toast('★ +' + n + (at ? ' · ' + at : ''));
}
let toastT = 0;
function toast(t){ const el = $('toast'); el.textContent = t; el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2600); }

// ---------- Aufträge ----------
function checkQuests(){
  Object.values(worlds).forEach(w => {
    if (!w.quests) return;
    w.quests.forEach(q => { const key = w.id + ':' + q.id; if (P.quests[key]) return; const [n, tot] = q.goal(P);
      if (n >= tot){ P.quests[key] = true; save(); setTimeout(() => addStars(q.reward || 3, 'Auftrag geschafft: ' + q.text), 400); } });
    if (!P.stamps[w.id] && w.quests.every(q => P.quests[w.id + ':' + q.id])){
      P.stamps[w.id] = true; if (w.reward){ P.items[w.reward.id] = true; P.wear[w.reward.id] = true; } save();
      setTimeout(() => showStamp(w), 1600);
    }
  });
  renderHud();
}
function showStamp(w){
  openSheet('Stempel für deinen Reisepass!', body => {
    const st = el('div', 'stamp big'); st.textContent = w.stampIcon || '✦'; body.append(st);
    body.append(el('p', 'cardtext', `Du hast alle Aufträge in der ${w.name} geschafft.`));
    if (w.reward) body.append(el('p', 'cardtext', `Belohnung: ${w.reward.name}! Du trägst ihn jetzt – im Reisepass kannst du ihn an- und ausziehen.`));
    row(body, [btn('Juhu! ✦', 'main', closeSheet)]);
  });
  applyWear();
}

// ---------- Sheet (Dialog im Papierlook) ----------
const sheetEl = $('learn'), sheetBody = $('learnBody'), sheetTitle = $('learnTitle');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const btn = (text, cls, fn) => { const b = el('button', cls, text); b.type = 'button'; b.onclick = fn; return b; };
const row = (parent, items) => { const r = el('div', 'row'); items.forEach(i => r.append(i)); parent.append(r); return r; };
function openSheet(title, build){ speechStop(); sheetTitle.textContent = title; sheetBody.replaceChildren(); build(sheetBody); sheetEl.hidden = false; sheetBody.scrollTop = 0; }
function closeSheet(){ sheetEl.hidden = true; speechStop(); }
$('learnClose').onclick = closeSheet;
addEventListener('keydown', e => { if (e.key === 'Escape' && !sheetEl.hidden) closeSheet(); });

// ---------- Vorlesen ----------
const canSpeak = 'speechSynthesis' in window;
function speak(text){ if (!canSpeak) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'de-DE'; u.rate = .95;
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith('de')); if (v) u.voice = v; speechSynthesis.speak(u); }
function speechStop(){ if (canSpeak) speechSynthesis.cancel(); }
const speakBtn = text => btn('🔊 Vorlesen', 'speak', () => speak(text));

// ---------- Wissenskarten ----------
function unlockCard(id){
  if (!cardById[id] || P.cards[id]) return false;
  P.cards[id] = Date.now(); save(); addStars(1, 'neue Wissenskarte'); checkQuests(); return true;
}
// Objekt erkundet: nächste unbekannte Karte zeigen (oder eine bekannte zum Wiederholen)
function discover(wid, key, extra){
  const ids = worlds[wid].content.objects[key] || [], fresh = ids.find(i => !P.cards[i]);
  const id = fresh || ids[Math.floor(Math.random()*ids.length)];
  if (!id) return;
  if (fresh) unlockCard(fresh);
  showCard(id, {isNew:!!fresh, extra, wid, key});
}
// Rätsel zum Ort, an dem man steht: erst zu einer früher gelesenen Karte dieses Objekts, sonst als Lese-Check zur eben gelesenen
function objectQuestion(wid, key, current){
  const ids = (worlds[wid].content.objects[key] || []), open = q => !(P.q[q.id] && P.q[q.id].ok), all = Object.values(qById);
  const earlier = ids.filter(i => i !== current && P.cards[i]);
  const pick = list => list.find(q => q.level === 1) || list[0] || null;
  return pick(all.filter(q => earlier.includes(q.card) && open(q))) || pick(all.filter(q => q.card === current && open(q)))
      || pick(all.filter(q => ids.includes(q.card) && P.cards[q.card]).sort(() => Math.random() - .5));   // alles schon gekonnt: zum Wiederholen
}
function showCard(id, {isNew=false, extra, wid, key}={}){
  const c = cardById[id];
  openSheet(isNew ? 'Neue Wissenskarte!' : 'Wissenskarte', body => {
    const card = el('div', 'kcard'); card.append(el('div', 'ktitle', c.title), el('p', 'cardtext', c.text)); body.append(card);
    const items = [];
    if (canSpeak) items.push(speakBtn(c.title + '. ' + c.text));
    // am Objekt: Rätsel genau dazu; im Album: ein Wiederholungs-Rätsel zu früher Entdecktem
    const place = key && worlds[wid] && worlds[wid].names && worlds[wid].names[key];
    const q = key ? objectQuestion(wid, key, c.id) : nextQuestion(c);
    if (q) items.push(btn(place ? 'Rätsel ' + place + ' ✦' : key ? 'Rätsel dazu ✦' : 'Wiederholungs-Rätsel ✦', 'main', () => ask(q)));
    else if (extra) items.push(btn(extra.label, 'main', extra.run));
    else items.push(btn('Weiter', 'main', closeSheet));
    row(body, items);
    if (q && extra) row(body, [btn(extra.label, '', extra.run)]);
  });
}
// Frage passend zur Karte: erst Stufe 1, dann Stufe 2; ab und zu eine falsch beantwortete zum Wiederholen
function nextQuestion(card, skip = []){
  const known = q => q && P.cards[q.card] && (!card || q.card !== card.id) && !skip.includes(q.id);
  const due = P.review.map(id => qById[id]).filter(known);   // falsch beantwortete kommen zuerst wieder
  if (due.length) return due[0];
  const lvl1done = cid => Object.values(qById).every(q => q.card !== cid || q.level !== 1 || (P.q[q.id] && P.q[q.id].ok));
  const open = Object.values(qById).filter(q => known(q) && !(P.q[q.id] && P.q[q.id].ok) && (q.level === 1 || lvl1done(q.card)));
  open.sort((a, b) => (P.cards[a.card] - P.cards[b.card]) || (a.level - b.level));   // was am längsten her ist, zuerst
  return open[0] || null;
}
// Quiz mit Luna: mehrere Fragen hintereinander zu allem, was man schon entdeckt hat
function quiz(n = 5){
  let done = 0, right = 0; const asked = [];
  const step = () => {
    const q = done < n ? nextQuestion(null, asked) : null;
    if (!q){ openSheet('Quiz geschafft!', body => {
      body.append(el('div', 'stamp big', right === done && done ? '★' : '✦'));
      body.append(el('p', 'cardtext', done ? `Du hast ${right} von ${done} Fragen richtig beantwortet.` : 'Entdecke zuerst ein paar Himmelskörper – dann gibt es Fragen dazu.'));
      row(body, [btn('Super ✦', 'main', closeSheet)]); }); return; }
    asked.push(q.id); done++;
    ask(q, ok => { if (ok) right++; }, {next: step, label: `Frage ${done} von ${n}`});
  };
  step();
}
const shuffle = a => { const b = a.slice(); for (let i=b.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
function record(q, ok){
  const r = P.q[q.id] || (P.q[q.id] = {ok:0, bad:0}); ok ? r.ok++ : r.bad++;
  P.review = P.review.filter(id => id !== q.id); if (!ok) P.review.push(q.id);
  save();
}
let giftHook = null;
const PRAISE = ['Super!', 'Richtig!', 'Klasse!', 'Genau!', 'Spitze!'], CHEER = ['Fast!', 'Knapp daneben!', 'Gut versucht!'];
function ask(q, onDone, opts = {}){
  const first = !(P.q[q.id] && (P.q[q.id].ok || P.q[q.id].bad));
  openSheet(opts.label || 'Rätselfrage', body => {
    body.append(el('p', 'qtext', q.q));
    if (canSpeak) row(body, [speakBtn(q.q + ' ' + (q.type === 'order' ? '' : q.options.join(', ')))]);
    const finish = (ok, resultText) => {
      record(q, ok);
      const res = el('div', 'result ' + (ok ? 'ok' : 'bad'));
      res.append(el('b', '', ok ? PRAISE[Math.floor(Math.random()*PRAISE.length)] : opts.noReveal ? 'Leider nicht richtig.' : CHEER[Math.floor(Math.random()*CHEER.length)] + ' So ist es:'));
      if (resultText && !opts.noReveal) res.append(el('p', 'cardtext', resultText));
      if (!opts.noReveal) res.append(el('p', 'cardtext', q.explain)); else if (!ok) res.append(el('p', 'cardtext', 'Weiter zur nächsten Frage.'));
      body.append(res);
      if (ok) addStars(q.type === 'order' ? 3 : first ? 2 : 1);
      if (ok && giftHook && opts.gift !== false) giftHook(res);   // nach jeder richtigen Lösung ein Überraschungsgeschenk
      checkQuests(); if (onDone) onDone(ok);
      row(body, [btn(opts.next ? 'Nächste Frage →' : 'Weiter', 'main', opts.next || closeSheet)]);
      res.scrollIntoView({block:'nearest', behavior:'smooth'});
    };
    if (q.type === 'order'){
      const picked = [], list = el('div', 'order'), seq = el('ol', 'seq');
      shuffle(q.options).forEach(o => { const b = btn(o, 'opt', () => {
        if (b.disabled) return; picked.push(o); b.disabled = true; seq.append(el('li', '', o));
        if (picked.length === q.options.length){
          list.querySelectorAll('button').forEach(x => x.disabled = true); reset.disabled = true;
          const ok = picked.every((p, i) => p === q.options[i]);
          finish(ok, ok ? '' : 'Richtige Reihenfolge: ' + q.options.join(' → '));
        } }); list.append(b); });
      const reset = btn('Nochmal von vorn', 'small', () => { picked.length = 0; seq.replaceChildren(); list.querySelectorAll('button').forEach(x => x.disabled = false); });
      body.append(el('p', 'tip', 'Tippe die Begriffe nacheinander in der richtigen Reihenfolge an.'), list, seq); row(body, [reset]);
    } else {
      const list = el('div', 'opts'), order = q.type === 'tf' ? q.options.map((_, i) => i) : shuffle(q.options.map((_, i) => i));   // Antworten mischen, „Stimmt“ bleibt vorn
      order.forEach(i => { const b = btn(q.options[i], 'opt', () => {
        list.querySelectorAll('button').forEach(x => { x.disabled = true; if (+x.dataset.i === q.answer && (!opts.noReveal || i === q.answer)) x.classList.add('right'); });
        if (i !== q.answer) b.classList.add('wrong');
        finish(i === q.answer);
      }); b.dataset.i = i; list.append(b); });
      body.append(list);
    }
  });
}
const askById = (id, onDone) => qById[id] && ask(qById[id], onDone);

// ---------- Aufträge-Übersicht (Reiseführer) ----------
function openQuests(wid = RS.worldId){
  const w = worlds[wid]; if (!w || !w.quests) return;
  if (!P.flags[wid + ':talked']){ P.flags[wid + ':talked'] = true; save(); checkQuests(); }
  openSheet((w.guide || 'Aufträge') + ' – Aufträge', body => {
    if (w.guideText) body.append(el('p', 'tip', w.guideText));
    const ul = el('ul', 'quests');
    w.quests.forEach(q => { const done = P.quests[wid + ':' + q.id], [n, tot] = q.goal(P);
      const li = el('li', done ? 'done' : ''); li.append(el('span', 'chk', done ? '✔' : '○'), el('span', 'qt', q.text + (!done && tot > 1 ? ` (${Math.min(n,tot)}/${tot})` : '')));
      if (q.action && !done) li.append(btn(q.action.label, 'small main', () => { closeSheet(); q.action.run(); }));
      else if (q.action && q.action.again) li.append(btn(q.action.label, 'small', () => { closeSheet(); q.action.run(); }));
      ul.append(li); });
    body.append(ul);
    row(body, [btn('Los geht’s ✦', 'main', closeSheet)]);
  });
}

// ---------- Album ----------
function openAlbum(){
  openSheet('Wissensalbum', body => {
    const all = Object.values(cardById), have = all.filter(c => P.cards[c.id]).length;
    body.append(el('p', 'tip', `${have} von ${all.length} Karten gesammelt · ★ ${P.stars}`));
    row(body, [btn('🖼 Meine Figuren', 'small', () => openMine())]);
    Object.values(worlds).forEach(w => {
      body.append(el('h3', 'albumh', w.name));
      const grid = el('div', 'album');
      w.content.cards.forEach(c => grid.append(P.cards[c.id] ? btn(c.title, 'acard', () => showCard(c.id)) : (() => { const b = btn('?', 'acard locked', () => toast('Noch nicht entdeckt – erkunde die ' + w.name + '!')); return b; })()));
      body.append(grid);
    });
    row(body, [btn('Schließen', 'main', closeSheet)]);
  });
}
$('albumBtn').onclick = openAlbum;
hudStars.onclick = openAlbum;
questChip.onclick = () => openQuests();

// ---------- Reisepass & Reisen ----------
const TRAVEL = [{id:'home', name:'Heimatwiese', icon:'✿'}, {id:'space', name:'Sternenwelt', icon:'☾'}, {id:'time', name:'Zeitmaschine', icon:'⌛', needsBooks:1}];
function openPassport(){
  openSheet('Reisepass', body => {
    body.append(el('p', 'tip', 'Wohin soll die Reise gehen? In jeder Welt warten Aufträge, Wissenskarten und ein Stempel.'));
    const list = el('div', 'passport');
    TRAVEL.forEach(t => {
      const w = worlds[t.id], here = RS.worldId === t.id, card = el('div', 'pworld' + (t.soon ? ' soon' : ''));
      const stamp = el('div', 'stamp' + (P.stamps[t.id] ? '' : ' empty')); stamp.textContent = P.stamps[t.id] ? (w && w.stampIcon || t.icon) : t.icon;
      const info = el('div', 'pinfo'); info.append(el('b', '', t.name));
      const books = window.Books ? Books.count : 0, locked = t.needsBooks && books < t.needsBooks;   // Welten, die ein gelesenes Buch freischaltet
      if (locked){ card.classList.add('soon'); info.append(el('small', '', '🔒 Lies dein erstes Buch, dann öffnet sie sich')); }
      else if (t.soon) info.append(el('small', '', 'kommt bald'));
      else if (w && w.quests) info.append(el('small', '', `${w.quests.filter(q => P.quests[t.id + ':' + q.id]).length} von ${w.quests.length} Aufträgen`));
      else info.append(el('small', '', here ? 'du bist hier' : 'dein Zuhause'));
      card.append(stamp, info);
      if (locked) card.append(btn('📚 Lesen', 'small', () => window.Books && Books.openRead()));
      else if (!t.soon && !here && RS.W[t.id]) card.append(btn('Reisen ✦', 'main small', () => { closeSheet(); travel(t.id); }));
      else if (here) card.append(el('small', 'here', 'hier'));
      list.append(card);
    });
    body.append(list);
    const items = Object.keys(P.items);
    if (items.length){ body.append(el('h3', 'albumh', 'Ausrüstung'));
      items.forEach(id => { const it = ITEMS[id]; if (!it) return; const b = btn((P.wear[id] ? '✔ ' : '') + it.name, 'small', () => { P.wear[id] = !P.wear[id]; save(); applyWear(); openPassport(); }); body.append(b); }); }
    row(body, [btn('Schließen', '', closeSheet)]);
  });
}
$('passBtn').onclick = openPassport;
function travel(id){
  const warp = $('warp'); warp.hidden = false; warp.classList.remove('on'); void warp.offsetWidth; warp.classList.add('on');
  setTimeout(() => { RS.enterWorld(id); renderHud(); }, 650);
  setTimeout(() => { warp.hidden = true; warp.classList.remove('on'); }, 1500);
}
addEventListener('rs:world', () => {
  renderHud();
  const kind = RS.worldId === 'space' ? 'float' : 'bunny', r = document.querySelector(`input[name="scanKind"][value="${kind}"]`); if (r) r.checked = true;
});

// Regenbogen-Tor: in jeder Welt ein Tor, das den Reisepass öffnet
function portalCanvas(){
  const [c, x] = RS.cnv(360, 330), cx = 180, cy = 318;
  RS.RAINBOW.forEach((col, i) => { const r = 168 - i*19, p = [];
    for (let k=0;k<=40;k++){ const a = Math.PI + k/40*Math.PI; p.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r]); }
    for (let k=40;k>=0;k--){ const a = Math.PI + k/40*Math.PI; p.push([cx + Math.cos(a)*(r-17), cy + Math.sin(a)*(r-17)]); }
    RS.pencil(x, p, col, false); RS.ink(x, p, true, 1.6); });
  const glow = x.createRadialGradient(cx, cy-40, 10, cx, cy-40, 70); glow.addColorStop(0, 'rgba(255,255,255,.95)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = glow; x.beginPath(); x.arc(cx, cy, 52, Math.PI, 0); x.fill();
  [[40,300],[320,300]].forEach(([a,b]) => { const p = RS.wob(a, b, 30, 18, 20, .05); RS.pencil(x, p, '#c4f0dc'); RS.ink(x, p, true, 2); });
  for (let k=0;k<6;k++) RS.star(x, 40 + k*56, 40 + (k%2)*30, 12, RS.RAINBOW[k], k);
  return c;
}
const portalC = portalCanvas();
function addPortal(wid, pos){
  const W = RS.W[wid], g = new THREE.Group(); g.position.copy(pos); W.group.add(g);
  const m = RS.bill(portalC, 2.3, g); RS.shadow(2.2, g);
  const act = {kind:'portal', ref:{pos:pos.clone()}, go:'läuft zum Regenbogen-Tor', doing:'staunt über das Regenbogen-Tor', marvel:true, off:1.35, fxH:1.9, onArrive: openPassport};
  m.userData.act = act; W.acts.push(act); W.picks.push(m);
  return act;
}
addPortal('home', new V3(-1.5, 0, -5.5));

// ---------- Zubehör für das Mädchen ----------
const ITEMS = {
  tiara: {name:'Sternen-Haarreif', draw(){ const [c, x] = RS.cnv(260, 120);
    const band = []; for (let k=0;k<=24;k++){ const a = Math.PI*1.08 + k/24*Math.PI*.84; band.push([130 + Math.cos(a)*120, 150 + Math.sin(a)*70]); }
    x.lineCap = 'round'; x.lineWidth = 14; x.strokeStyle = RS.OUTL; RS.trace(x, band, false); x.stroke(); x.lineWidth = 8; x.strokeStyle = '#ffe066'; x.stroke();
    [[52,72,20,0],[130,40,30,1],[208,72,20,2]].forEach(([sx, sy, r, i]) => RS.star(x, sx, sy, r, ['#ff8fb1','#ffe066','#7cc4ff'][i], 0));
    return c; }, w:1.05, y:75},
};
const worn = {};
function applyWear(){
  Object.entries(ITEMS).forEach(([id, it]) => {
    const on = !!(P.items[id] && P.wear[id]);
    if (on && !worn[id]){
      const c = it.draw(), w = it.w, h = w*c.height/c.width, slot = it.slot || 'head', J = slot === 'back' ? RS.J.torso : RS.J.head, piv = J.userData.piv;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map:RS.tex(c), transparent:true, alphaTest:.05, side:THREE.DoubleSide}));
      if (slot === 'head') m.position.set((RS.CX - piv[0])*RS.K, (piv[1] - RS.TOPY + it.y)*RS.K - h*.3, .12);
      else if (slot === 'eyes') m.position.set((RS.CX - piv[0])*RS.K, (piv[1] - 1032)*RS.K + (it.y || 0)*RS.K, .14);
      else m.position.set((RS.CX - piv[0])*RS.K, (piv[1] - (RS.TP.torso.y0 + RS.TP.torso.h/2))*RS.K + (it.y || 0)*RS.K, -.03);   // Rücken: Mitte des Oberkörpers
      m.renderOrder = slot === 'back' ? 40 : 80; J.add(m); worn[id] = m;
    }
    if (worn[id]) worn[id].visible = on;
  });
}

// ---------- Sicht wechseln: welcher Figur folgt die Kamera, wer wird per Tippen gesteuert? ----------
function openView(){
  openSheet('👁 Sicht wählen', body => {
    body.append(el('p', 'tip', 'Wähle eine Figur: Die Kamera folgt ihr, und wenn du auf den Boden tippst, läuft sie dorthin.'));
    const list = el('div', 'viewlist'), cur = RS.ctrl, over = RS.view === 'overview';
    const opt = (name, canvas, active, run) => { const b = btn('', 'viewopt' + (active ? ' on' : ''), () => { run(); closeSheet(); });
      if (canvas){ const t = document.createElement('canvas'), k = Math.min(56/canvas.width, 56/canvas.height); t.width = Math.round(canvas.width*k); t.height = Math.round(canvas.height*k); t.getContext('2d').drawImage(canvas, 0, 0, t.width, t.height); b.append(t); }
      else b.append(el('span', 'vicon', '👧'));
      b.append(el('span', '', name + (active ? ' ✔' : ''))); list.append(b); };
    opt('Das Mädchen', null, !cur && !over, () => RS.setView({figure:null}));
    RS.animals.filter(a => a.wid === RS.worldId).forEach(a => opt(a.name, a.mesh.material.map.image, cur === a && !over, () => RS.setView({figure:a})));
    body.append(list);
    body.append(el('h3', 'albumh', 'Kamera'));
    row(body, [btn('🗺 Übersicht – die ganze Welt' + (over ? ' ✔' : ''), over ? 'main' : '', () => { RS.setView({overview:!over}); closeSheet(); })]);
    row(body, [btn('Schließen', '', closeSheet)]);
  });
}
$('viewBtn').onclick = openView;
addEventListener('rs:view', e => { $('viewBtn').textContent = '👁 ' + (e.detail.overview ? 'Übersicht' : (e.detail.name || 'Mädchen')); });
addEventListener('rs:world', () => { $('viewBtn').textContent = '👁 Mädchen'; });

// ---------- Eigene Figuren: Statuskarte nach dem Scannen + Übersicht "Meine Figuren" ----------
const worldName = id => (RS.W[id] && RS.W[id].name) || 'Heimatwiese';
function shareLine(r){   // r: gespeicherte Figur (oder Live-Zustand aus der Statuskarte)
  if ((r.world || 'home') !== 'home') return ['info', 'Bleibt in der ' + worldName(r.world) + ' auf diesem Gerät'];
  if (!RS.SHARE) return ['info', 'Nur auf diesem Gerät – Teilen ist noch nicht eingerichtet'];
  if (r.approved || r.state === 'approved') return ['ok', 'Für alle sichtbar'];
  if (r.state === 'error' || r.shareError) return ['bad', 'Senden hat nicht geklappt – neuer Versuch später'];
  if (r.state === 'offline') return ['wait', 'Kein Internet – wird später an alle geschickt'];
  if (r.uploaded || r.state === 'uploaded') return ['ok', 'Eingereicht – erscheint bei allen nach der Freigabe'];
  return ['wait', 'Wird an alle geschickt …'];
}
const ICON = {ok:'✔', bad:'⚠', wait:'⏳', info:'ⓘ'};
const line = ([k, t]) => { const li = el('li', k); li.append(el('span', 'ic', ICON[k]), el('span', '', t)); return li; };
const figEl = $('figStatus'); let figT = 0, figLive = null;
function renderFig(){
  const f = figLive; if (!f) return;
  figEl.replaceChildren();
  const ok = f.inWorld && f.saved, img = el('img', 'thumb'); img.src = f.url; img.alt = '';
  const box = el('div', 'fs-body'); box.append(el('b', '', ok ? `✔ ${f.name} ist da!` : `⚠ ${f.name} hat nicht ganz geklappt`));
  const ul = el('ul', 'checks');
  ul.append(line(f.inWorld ? ['ok', 'Sichtbar in der ' + worldName(f.world)] : ['bad', 'Nicht in der Welt – das Bild war leer oder ließ sich nicht lesen']));
  ul.append(line(f.saved ? ['ok', 'Auf diesem Gerät gespeichert'] : ['bad', 'Nicht gespeichert – nach dem Neuladen ist sie weg']));
  ul.append(line(shareLine(f)));
  box.append(ul);
  const r = el('div', 'fs-row');
  if (f.inWorld) r.append(btn('Zeig sie mir', 'small main', () => { hideFig(); const res = RS.goToCreature(f.id); if (typeof res === 'string'){ travel(res); setTimeout(() => RS.goToCreature(f.id), 1800); } }));
  r.append(btn('Meine Figuren', 'small', () => { hideFig(); openMine(); }), btn('×', 'small', hideFig)); box.append(r);
  figEl.append(img, box); figEl.hidden = false;
  clearTimeout(figT); if (ok && shareLine(f)[0] !== 'bad') figT = setTimeout(hideFig, 12000);
}
function hideFig(){ figEl.hidden = true; figEl.classList.remove('bad'); clearTimeout(figT); }

// Probleme beim Scannen: rote Karte + Protokoll (die letzten 10, gespeichert)
const TIPS = {
  nophoto:'Tippe nochmal auf „Figur scannen“. Klappt die Kamera nicht, mach das Foto vorher mit der Kamera-App und wähle es dann über „Dateien“ oder „Galerie“ aus.',
  restart:'Mach das Foto zuerst mit der Kamera-App. Tippe dann auf „Figur scannen“ und wähle das Foto über „Dateien“ oder „Galerie“ aus. Andere Apps zu schließen hilft auch.',
  photo:'Versuch ein anderes Foto. Am besten klappt ein normales Foto (JPG) von der Kamera.',
  cut:'Zieh den Rahmen enger um die Figur oder versuch ein Foto mit mehr Licht.',
  save:'Lade die Seite neu und versuch es nochmal.', send:'Lade die Seite neu und versuch es nochmal.',
  world:'Lade die Seite neu. Hilft das nicht, scanne die Figur nochmal.', share:'Die App versucht es später von selbst nochmal. Du kannst auch in „Meine Figuren“ auf „Nochmal senden“ tippen.'};
let scanLog = [];
const saveLog = () => { if (profileId) RS.idb.setP('scanlog:' + profileId, scanLog); };
function logProblem(step, msg, name){ scanLog.push({at:Date.now(), step, msg, name}); scanLog = scanLog.slice(-10); saveLog(); }
function showProblem(step, msg){
  figEl.replaceChildren(); figEl.classList.add('bad');
  const box = el('div', 'fs-body'); box.append(el('b', '', '⚠ Das hat nicht geklappt'), el('p', 'cardtext', msg), el('p', 'note', 'Tipp: ' + (TIPS[step] || TIPS.save)));
  const r = el('div', 'fs-row');
  if (step !== 'share') r.append(btn('Nochmal versuchen ✎', 'small main', () => { hideFig(); RS.openScan(); }));
  r.append(btn('Meine Figuren', 'small', () => { hideFig(); openMine(); }), btn('×', 'small', hideFig));
  box.append(r); figEl.append(box); figEl.hidden = false; clearTimeout(figT);
}
addEventListener('rs:scanfail', e => { const d = e.detail; logProblem(d.step, d.msg); showProblem(d.step, d.msg); });
addEventListener('rs:scanned', e => {
  const d = e.detail; if (figLive) URL.revokeObjectURL(figLive.url);
  figLive = {...d, url:URL.createObjectURL(d.thumb)};
  if (!d.inWorld) logProblem('world', 'Die Figur ist nicht in der Welt erschienen – das Bild ließ sich nicht lesen.', d.name);
  if (!d.saved) logProblem('save', 'Die Figur wurde nicht gespeichert und ist nach dem Neuladen weg.', d.name);
  setTimeout(renderFig, 1800);   // erst den Sternenwirbel zeigen
});
addEventListener('rs:share', e => {
  const d = e.detail;
  if (figLive && figLive.id === d.id){ figLive.state = d.state; if (!figEl.hidden) renderFig(); }
  if (d.state === 'approved') toast('🎉 ' + d.name + ' ist jetzt für alle sichtbar!');
  if (d.state === 'error'){ logProblem('share', 'Senden an alle hat nicht geklappt (' + (d.msg || 'unbekannt') + ').', d.name);
    if (!figLive || figLive.id !== d.id || figEl.hidden) toast('⚠ ' + d.name + ' konnte nicht geteilt werden'); }
});
function openMine(){
  RS.myCreatures().then(list => openSheet('Meine Figuren', body => {
    const problems = () => { if (!scanLog.length) return;
      body.append(el('h3', 'albumh', '⚠ Probleme beim Scannen'));
      const ul = el('ul', 'checks problems');
      scanLog.slice().reverse().forEach(p => { const li = el('li', 'bad'); const t = new Date(p.at);
        li.append(el('span', 'ic', '⚠'), el('span', '', `${t.toLocaleDateString('de-DE', {day:'numeric', month:'numeric'})} ${t.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})} · ${p.name ? p.name + ': ' : ''}${p.msg}`)); ul.append(li); });
      body.append(ul); row(body, [btn('Liste leeren', 'small', () => { scanLog = []; saveLog(); openMine(); })]); };
    if (!list.length){ body.append(el('p', 'tip', 'Du hast noch keine Figur eingescannt. Mal eine Figur auf Papier und tippe auf „✎ Figur scannen“.')); problems(); row(body, [btn('Schließen', 'main', closeSheet)]); return; }
    body.append(el('p', 'tip', `${list.length} ${list.length === 1 ? 'Figur' : 'Figuren'} von dir`));
    const urls = [], wrap = el('div', 'figs');
    list.forEach(r => {
      const card = el('div', 'fig'), img = el('img', 'thumb'), u = URL.createObjectURL(r.blob); urls.push(u); img.src = u; img.alt = '';
      const info = el('div', 'fig-info'); info.append(el('b', '', r.name)); if (r.book) info.append(el('small', 'note', '📚 aus „' + r.book + '“'));
      const ul = el('ul', 'checks'); ul.append(line(r.inWorld ? ['ok', 'In der ' + worldName(r.world)] : ['bad', 'Nicht geladen – lade die Seite neu'])); ul.append(line(shareLine(r))); info.append(ul);
      const acts = el('div', 'fs-row');
      if (r.inWorld) acts.append(btn('Hinlaufen', 'small main', () => { closeSheet(); const res = RS.goToCreature(r.id);
        if (typeof res === 'string'){ travel(res); setTimeout(() => RS.goToCreature(r.id), 1800); } }));
      acts.append(btn('🎨 Ausmalen', 'small', () => { closeSheet(); RS.paintCreature(r.id); }));
      if ((r.world || 'home') === 'home' && RS.SHARE && !r.uploaded) acts.append(btn('Nochmal senden', 'small', () => { RS.resend(r.id); toast('Wird gesendet …'); }));
      const del = btn('Löschen', 'small', () => {
        if (!del.dataset.sure){ del.dataset.sure = 1; del.textContent = 'Wirklich löschen?'; del.classList.add('danger'); return; }
        RS.deleteCreature(r.id).then(() => { toast(r.name + ' wurde gelöscht'); openMine(); }).catch(e => toast('⚠ ' + e.message));
      }); acts.append(del);
      info.append(acts); card.append(img, info); wrap.append(card);
    });
    body.append(wrap);
    problems();
    if (RS.SHARE && list.some(r => r.uploaded)) body.append(el('p', 'note', 'Gelöschte Figuren verschwinden nur auf diesem Gerät. Bei allen anderen werden sie im Supabase-Dashboard gelöscht.'));
    row(body, [btn('Neue Figur scannen ✎', '', () => { closeSheet(); RS.openScan(); }), btn('Schließen', 'main', closeSheet)]);
    const revoke = () => { if (sheetEl.hidden){ urls.forEach(URL.revokeObjectURL); obs.disconnect(); } }, obs = new MutationObserver(revoke); obs.observe(sheetEl, {attributes:true, attributeFilter:['hidden']});
  }));
}
window.Learn = {renderHud, setGift: f => { giftHook = f; }, ITEMS, applyWear, loadProfile, get profileId(){ return profileId; }, quiz, openMine, registerWorld, discover, showCard, unlockCard, ask, askById, openQuests, openSheet, closeSheet, openAlbum, openPassport, addPortal, travel,
  addStars, toast, checkQuests, el, btn, row, P, save, discoveredObjects, correctIn, ready, speak, canSpeak, worldOf};
})();
