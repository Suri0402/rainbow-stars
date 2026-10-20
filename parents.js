// Rainbow Stars – Eltern-Bereich: eigene Eltern-PIN (das Kind kennt sie nicht), Bücher verwalten, Lesegespräche bestätigen
(() => {
const RS = window.RS, L = window.Learn, PR = window.Profiles, { el, btn, row } = L, $ = RS.$;
let cfg = null, fails = 0, lockUntil = 0;
const ready = RS.idb.getP('parent').then(v => { cfg = v || null; });
const save = () => RS.idb.setP('parent', cfg);
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); const s = [...a].map(x => ALPH[x % ALPH.length]).join(''); return s.slice(0,4) + '-' + s.slice(4,8) + '-' + s.slice(8); };

// Über dem Anmelde-Bildschirm öffnen: diesen kurz ausblenden und danach wieder zeigen
function overLogin(){ const lg = $('login'); if (lg.hidden) return; lg.hidden = true;
  const mo = new MutationObserver(() => { if ($('learn').hidden){ mo.disconnect(); if (!L.profileId) lg.hidden = false; } }); mo.observe($('learn'), {attributes:true, attributeFilter:['hidden']}); }

// ---------- Einrichten ----------
function setup(then){
  overLogin();
  L.openSheet('👪 Eltern-PIN einrichten', body => {
    body.append(el('p', 'cardtext', 'Bitte von einem Erwachsenen einrichten. Mit der Eltern-PIN meldet ihr Bücher an und bestätigt, dass ein Buch gelesen wurde. Das Kind sollte die PIN nicht kennen.'));
    let first = null; const msg = el('p', 'note', '');
    const pad = PR.pinPad(async pin => {
      if (!first){ first = pin; pad.querySelector('p').textContent = 'Eltern-PIN zur Sicherheit noch einmal:'; return; }
      if (pin !== first){ first = null; pad.querySelector('p').textContent = 'Wählt eine 4-stellige Eltern-PIN:'; msg.textContent = 'Die PINs waren verschieden – nochmal von vorn.'; pad.shake(); return; }
      if ((PR.list || []).length && await kidHasPin(pin)){ first = null; pad.querySelector('p').textContent = 'Wählt eine 4-stellige Eltern-PIN:'; msg.textContent = 'Diese PIN benutzt schon ein Kind – bitte eine andere wählen.'; pad.shake(); return; }
      const code = newCode(), salt = RS.uuid(), rsalt = RS.uuid();
      cfg = {salt, pin: await PR.hash(pin, salt), rsalt, rec: await PR.hash(code.replace(/-/g, ''), rsalt)}; await save();
      showCode(code, then);
    }, 'Wählt eine 4-stellige Eltern-PIN:');
    body.append(pad, msg);
    row(body, [btn('Abbrechen', '', L.closeSheet)]);
  });
}
async function kidHasPin(pin){ for (const p of PR.list){ if (await PR.hash(pin, p.salt) === p.pin) return true; } return false; }
function showCode(code, then){
  L.openSheet('Wiederherstellungs-Code', body => {
    body.append(el('p', 'cardtext', 'Schreibt euch diesen Code auf und bewahrt ihn gut auf. Damit könnt ihr die Eltern-PIN zurücksetzen, falls ihr sie vergesst. Er wird nur jetzt angezeigt.'));
    body.append(el('div', 'reccode', code));
    row(body, [btn('Ich habe ihn aufgeschrieben ✔', 'main', () => { then ? then() : showArea(); })]);
  });
}

// ---------- Prüfen ----------
function verify(onOk, {title = '👪 Eltern-PIN', reason = 'Hier muss ein Erwachsener die Eltern-PIN eingeben.', inLogin = false} = {}){
  if (!cfg) return setup(() => onOk());
  overLogin();
  L.openSheet(title, body => {
    body.append(el('p', 'cardtext', reason));
    const msg = el('p', 'note', '');
    const pad = PR.pinPad(async pin => {
      if (Date.now() < lockUntil){ msg.textContent = 'Gesperrt – bitte kurz warten.'; pad.shake(); return; }
      if (await PR.hash(pin, cfg.salt) === cfg.pin){ fails = 0; onOk(); return; }
      fails++; pad.shake(); if (fails >= 3){ fails = 0; lockUntil = Date.now() + 60e3; msg.textContent = 'Dreimal falsch – eine Minute gesperrt.'; } else msg.textContent = 'Die Eltern-PIN stimmt nicht.';
    }, 'Eltern-PIN:');
    body.append(pad, msg);
    row(body, [btn('Abbrechen', '', L.closeSheet), btn('Eltern-PIN vergessen?', 'small', recover)]);
  });
}
function recover(){
  L.openSheet('Eltern-PIN zurücksetzen', body => {
    body.append(el('p', 'cardtext', 'Gebt den Wiederherstellungs-Code ein, den ihr beim Einrichten aufgeschrieben habt.'));
    const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'pininput'; inp.placeholder = 'XXXX-XXXX-XXXX'; inp.autocomplete = 'off'; body.append(inp);
    const msg = el('p', 'note', ''); body.append(msg);
    row(body, [btn('Abbrechen', '', L.closeSheet), btn('Weiter', 'main', async () => {
      const c = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (await PR.hash(c, cfg.rsalt) !== cfg.rec){ msg.textContent = 'Der Code stimmt nicht.'; return; }
      cfg = null; await save(); setup(); })]);
  });
}

// ---------- Eltern-Bereich ----------
// jedes Öffnen verlangt die Eltern-PIN – sonst könnte das Kind kurz danach selbst hinein
function openArea(){ ready.then(() => { if (!cfg) return setup(); verify(showArea, {reason:'Willkommen im Eltern-Bereich. Bitte die Eltern-PIN eingeben.'}); }); }
async function showArea(){
  const books = window.Books ? await Books.all() : [], kids = PR.list || [];
  const kidName = id => (kids.find(k => k.id === id) || {}).name || '?';
  overLogin();
  L.openSheet('👪 Eltern-Bereich', body => {
    body.append(el('p', 'tip', 'Hier meldet ihr Bücher an und bestätigt, dass ein Buch gelesen wurde. Pro gelesenem Buch wird eine neue Station der Zeitmaschine frei.'));
    // offene Bestätigungen
    const open = []; books.forEach(b => (b.kids || []).forEach(k => { const s = (b.status || {})[k] || {}; if (s.quiz && s.scanId && !s.confirmed) open.push([b, k]); }));
    if (open.length){ body.append(el('h3', 'albumh', '⏳ Wartet auf euer Lesegespräch'));
      open.forEach(([b, k]) => row(body, [el('span', 'cardtext', `${kidName(k)}: „${b.title}“`), btn('Lesegespräch führen', 'small main', () => Books.talk(b.id, k, {parent:true}))])); }
    body.append(el('h3', 'albumh', '📚 Bücher'));
    if (!books.length) body.append(el('p', 'note', 'Noch kein Buch angemeldet.'));
    books.forEach(b => { const card = el('div', 'bookrow');
      if (b.cover){ const im = document.createElement('img'); im.src = b.cover; im.alt = ''; im.className = 'bookcover small'; im.onerror = () => im.remove(); card.append(im); }
      const info = el('div', 'bookinfo'); info.append(el('b', '', b.title), el('small', 'note', (b.author ? b.author + ' · ' : '') + (b.qs || []).length + ' Fragen'));
      (b.kids || []).forEach(k => { const s = (b.status || {})[k] || {}; info.append(el('small', '', `${kidName(k)}: ` + (s.confirmed ? '✔ gelesen' : s.scanId ? '⏳ Lesegespräch fehlt' : s.quiz ? '✎ Bild fehlt' : '📖 liest noch'))); });
      card.append(info, btn('Bearbeiten', 'small', () => Books.edit(b.id))); body.append(card); });
    row(body, [btn('＋ Buch anmelden', 'main', () => Books.edit(null))]);
    body.append(el('h3', 'albumh', '👧 Kinder'));
    if (!kids.length) body.append(el('p', 'note', 'Noch kein Kinderprofil.'));
    kids.forEach(k => row(body, [el('span', 'cardtext', k.avatar + ' ' + k.name), btn('PIN zurücksetzen', 'small', () => PR.setPin(k, () => { L.toast('PIN von ' + k.name + ' geändert ✔'); showArea(); }))]));
    body.append(el('h3', 'albumh', '🔑 Eltern-PIN'));
    row(body, [btn('Eltern-PIN ändern', 'small', () => { cfg = null; save().then(() => setup()); }), btn('Bereich schließen', '', L.closeSheet)]);
  });
}
window.Parents = {hasPin: () => !!cfg, verify, openArea, showArea, ready};
})();
