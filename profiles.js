// Rainbow Stars – Profile mit PIN: jedes Kind hat eigenen Spielstand und eigene Figuren.
// Alle Figuren sind in der Welt zu sehen, löschen/ausmalen darf aber nur, wem sie gehören.
// Die PIN wird nur als Prüfsumme (SHA-256 mit Salz) auf diesem Gerät gespeichert.
(() => {
const RS = window.RS, L = window.Learn, { el, btn } = L, $ = RS.$;
const AVATARS = ['🦄','🐱','🐶','🦊','🐼','🐸','🐰','🦋','🐯','🐨','🌈','⭐'];
const GRADE_LEVEL = {1:1, 2:1, 3:2, 4:3, 5:4, 6:4, 7:4};
const ov = $('login'), box = $('loginBox');
let profiles = [], fails = {}, lockUntil = {};

async function hash(pin, salt){
  const data = new TextEncoder().encode(salt + ':' + pin);
  if (crypto.subtle) return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(b => b.toString(16).padStart(2, '0')).join('');
  let h = 2166136261; for (const b of data){ h ^= b; h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16);   // Notlösung ohne sicheren Kontext
}
const saveProfiles = () => RS.idb.setP('profiles', profiles);
const view = build => { box.replaceChildren(); build(box); ov.hidden = false; };

// ---------- PIN-Feld (4 Ziffern) ----------
function pinPad(onDone, label){
  const wrap = el('div', 'pinwrap'), dots = el('div', 'pindots'); let v = '';
  wrap.append(el('p', 'cardtext', label), dots);
  const draw = () => { dots.replaceChildren(...[0,1,2,3].map(i => el('span', i < v.length ? 'on' : '', i < v.length ? '●' : '○'))); };
  const pad = el('div', 'keypad');
  const press = k => { if (k === '⌫') v = v.slice(0, -1); else if (v.length < 4) v += k; draw(); if (v.length === 4){ const p = v; v = ''; setTimeout(() => { draw(); onDone(p); }, 150); } };
  ['1','2','3','4','5','6','7','8','9','⌫','0'].forEach(k => pad.append(btn(k, k === '⌫' ? 'key del' : 'key', () => press(k))));
  const onKey = e => { if (!wrap.isConnected){ removeEventListener('keydown', onKey); return; } if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); };
  addEventListener('keydown', onKey);
  wrap.append(pad); draw(); wrap.shake = () => { dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); };
  return wrap;
}

// ---------- Ansichten ----------
function chooser(){
  view(b => {
    b.append(el('h2', '', 'Wer spielt heute?'));
    const g = el('div', 'profgrid');
    profiles.forEach(p => g.append(btn(p.avatar + '\n' + p.name, 'profbtn', () => askPin(p))));
    g.append(btn('＋\nNeues Profil', 'profbtn new', () => create()));
    b.append(g);
    L.row(b, [btn('👪 Eltern', 'small', () => window.Parents && Parents.openArea({fromLogin:true})),
      ...(window.Sync && Sync.configured && !Sync.session ? [btn('☁️ Familien-Konto', 'small', () => view(b2 => { b2.append(el('h2', '', '☁️ Familien-Konto')); Sync.accountBox(b2, {after: async () => { await reload(); chooser(); }}); L.row(b2, [btn('← Zurück', '', chooser)]); }))] : [])]);
    if (!profiles.length) b.append(el('p', 'tip', 'Leg zuerst ein Profil für dich an. Jedes Kind bekommt sein eigenes Profil mit eigenen Figuren und Sternen.'));
  });
}
function askPin(p){
  view(b => {
    b.append(el('h2', '', p.avatar + ' ' + p.name));
    const msg = el('p', 'note', '');
    const pad = pinPad(async pin => {
      if (Date.now() < (lockUntil[p.id] || 0)){ msg.textContent = 'Kurz warten, dann nochmal versuchen …'; pad.shake(); return; }
      if (await hash(pin, p.salt) === p.pin){ fails[p.id] = 0; login(p, stay.querySelector('input').checked); return; }
      fails[p.id] = (fails[p.id] || 0) + 1; pad.shake();
      if (fails[p.id] >= 3){ lockUntil[p.id] = Date.now() + 30000; fails[p.id] = 0; msg.textContent = 'Dreimal falsch – warte 30 Sekunden.'; }
      else msg.textContent = 'Die PIN stimmt nicht. Versuch es nochmal.';
    }, 'Gib deine PIN ein:');
    const stay = el('label', 'field check'); const cb = document.createElement('input'); cb.type = 'checkbox'; stay.append(cb, document.createTextNode(' Auf diesem Gerät angemeldet bleiben'));
    b.append(pad, msg, stay);
    L.row(b, [btn('← Zurück', '', chooser), btn('PIN vergessen?', 'small', () => (window.Parents && Parents.hasPin() ? Parents.verify(() => setPin(p, chooser), {inLogin:true}) : parentGate(() => setPin(p, chooser))))]);
  });
}
function parentGate(then){
  const a = 11 + Math.floor(Math.random()*19), c = 11 + Math.floor(Math.random()*9);
  view(b => {
    b.append(el('h2', '', 'Frage für Erwachsene'), el('p', 'cardtext', `Damit nur Eltern die PIN ändern können: Wie viel ist ${a} × ${c}?`));
    const inp = document.createElement('input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.className = 'pininput'; inp.autocomplete = 'off'; b.append(inp);
    const msg = el('p', 'note', ''); b.append(msg);
    L.row(b, [btn('← Zurück', '', chooser), btn('Weiter', 'main', () => { if (+inp.value.trim() === a*c) then(); else { msg.textContent = 'Das stimmt leider nicht.'; } })]);
    setTimeout(() => inp.focus(), 50);
  });
}
function setPin(p, done){
  view(b => {
    b.append(el('h2', '', 'Neue PIN für ' + p.name));
    let first = null; const msg = el('p', 'note', '');
    const pad = pinPad(async pin => {
      if (!first){ first = pin; pad.querySelector('p').textContent = 'Gib die PIN zur Sicherheit noch einmal ein:'; return; }
      if (pin !== first){ first = null; pad.querySelector('p').textContent = 'Wähle eine 4-stellige PIN:'; msg.textContent = 'Die beiden PINs waren verschieden – nochmal von vorn.'; pad.shake(); return; }
      p.salt = RS.uuid(); p.pin = await hash(pin, p.salt); await saveProfiles(); L.toast('Neue PIN gespeichert ✔'); done();
    }, 'Wähle eine 4-stellige PIN:');
    b.append(pad, msg);
  });
}
function create(){
  const p = {id:RS.uuid(), name:'', avatar:AVATARS[profiles.length % AVATARS.length], grade:4, created:Date.now()};
  view(b => {
    b.append(el('h2', '', 'Neues Profil'));
    const name = document.createElement('input'); name.type = 'text'; name.maxLength = 16; name.placeholder = 'Dein Name'; name.className = 'pininput name'; name.autocomplete = 'off';
    const lab = el('label', 'field', 'Name '); lab.append(name); b.append(lab);
    b.append(el('p', 'cardtext', 'Such dir ein Bild aus:'));
    const av = el('div', 'avgrid'); AVATARS.forEach(a => { const x = btn(a, a === p.avatar ? 'av on' : 'av', () => { p.avatar = a; av.querySelectorAll('button').forEach(y => y.classList.toggle('on', y === x)); }); av.append(x); }); b.append(av);
    const gr = el('label', 'field', 'Klasse '); const sel = document.createElement('select'); sel.className = 'pininput';
    [1,2,3,4,5,6,7].forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n + '. Klasse'; if (n === p.grade) o.selected = true; sel.append(o); });
    gr.append(sel); b.append(gr, el('p', 'note', 'Danach richten sich die Rechen-Geschichten. Die Stufe passt sich später von allein an.'));
    const msg = el('p', 'note', ''); b.append(msg);
    L.row(b, [btn('← Zurück', '', chooser), btn('Weiter: PIN wählen', 'main', () => {
      p.name = name.value.trim().slice(0, 16); p.grade = +sel.value;
      if (!p.name){ msg.textContent = 'Bitte gib einen Namen ein.'; name.focus(); return; }
      if (profiles.some(q => q.name.toLowerCase() === p.name.toLowerCase())){ msg.textContent = 'Diesen Namen gibt es schon.'; return; }
      setPin(p, async () => { const firstEver = !profiles.length; profiles.push(p); await saveProfiles(); login(p, false, firstEver); });
    })]);
    setTimeout(() => name.focus(), 50);
  });
}
async function login(p, stay, firstEver = false){
  RS.setOwner(p.id);
  if (firstEver){ await RS.claimUnowned(p.id); }   // bisherige Figuren gehören dem ersten Profil
  await L.loadProfile(p.id, {migrate:firstEver, mathLevel:GRADE_LEVEL[p.grade] || 2});
  await RS.idb.setP('autologin', stay ? p.id : null);
  ov.hidden = true; chip(p);
  L.toast('Hallo ' + p.name + '! ' + p.avatar);
}
function chip(p){ const c = $('profileChip'); c.textContent = p.avatar + ' ' + p.name; c.hidden = false; c.onclick = () => menu(p); }
function menu(p){
  L.openSheet(p.avatar + ' ' + p.name, body => {
    body.append(el('p', 'tip', 'Dein Profil. Deine Figuren, Sterne und Goodies gehören nur dir.'));
    L.row(body, [btn('🔄 Spieler wechseln', 'main', async () => { await RS.idb.setP('autologin', null); location.reload(); }), btn('👫 Freunde', '', () => window.Friends && Friends.open())]);
    L.row(body, [btn('🔑 PIN ändern', 'small', () => { L.closeSheet(); askOld(p, () => setPin(p, () => { ov.hidden = true; })); }),
                 btn('🗑 Profil löschen', 'small', () => { L.closeSheet(); askOld(p, () => confirmDelete(p)); })]);
    L.row(body, [btn('👪 Eltern-Bereich', 'small', () => { L.closeSheet(); window.Parents && Parents.openArea(); }), btn('Schließen', '', L.closeSheet)]);
  });
}
function askOld(p, then){
  view(b => { b.append(el('h2', '', 'Deine PIN')); const msg = el('p', 'note', '');
    const pad = pinPad(async pin => { if (await hash(pin, p.salt) === p.pin) then(); else { pad.shake(); msg.textContent = 'Die PIN stimmt nicht.'; } }, 'Zur Sicherheit: Gib deine PIN ein.');
    b.append(pad, msg); L.row(b, [btn('Abbrechen', '', () => { ov.hidden = true; })]); });
}
function confirmDelete(p){
  view(b => { b.append(el('h2', '', 'Profil wirklich löschen?'), el('p', 'cardtext', `Alle Figuren, Sterne und Goodies von ${p.name} werden gelöscht. Das kann man nicht rückgängig machen.`));
    L.row(b, [btn('Nein, behalten', 'main', () => { ov.hidden = true; }), btn('Ja, löschen', 'small danger', async () => {
      await RS.deleteOwned(p.id); profiles = profiles.filter(q => q.id !== p.id); await saveProfiles();
      await RS.idb.setP('p:' + p.id, null); await RS.idb.setP('scanlog:' + p.id, null); await RS.idb.setP('autologin', null); location.reload(); })]); });
}

// ---------- Start ----------
addEventListener('DOMContentLoaded', async () => {
  profiles = (await RS.idb.getP('profiles')) || [];
  const auto = await RS.idb.getP('autologin'), p = profiles.find(q => q.id === auto);
  if (p) login(p, true); else chooser();
});
// nach einem Abgleich (anderes Gerät hat Profile angelegt) neu laden
async function reload(){ profiles = (await RS.idb.getP('profiles')) || []; if (!ov.hidden && box.querySelector('.profgrid')) chooser(); }
window.Profiles = {reload, get list(){ return profiles; }, hash, pinPad, setPin, view, chooser, saveProfiles, get current(){ return profiles.find(p => p.id === RS.owner); }};
})();
