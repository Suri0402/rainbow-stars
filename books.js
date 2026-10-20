// Rainbow Stars – Bücher: Strichcode scannen, Buch anmelden (Eltern), Lesen abschließen (Kind): Quiz → Bild → Lesegespräch
// Erst wenn ein Erwachsener das Lesegespräch mit der Eltern-PIN bestätigt, zählt das Buch und schaltet eine neue Welt frei.
(() => {
const RS = window.RS, L = window.Learn, PR = window.Profiles, { el, btn, row } = L, $ = RS.$;
const KEY = 'parent:books', PASS = .8, COOLDOWN = 60*60e3;
let books = [], count = 0;
const load = async () => { books = (await RS.idb.getP(KEY)) || []; recount(); return books; };
const store = async () => { await RS.idb.setP(KEY, books); recount(); };
function recount(){ const me = RS.owner; const n = books.filter(b => ((b.status || {})[me] || {}).confirmed).length;
  if (n !== count){ count = n; dispatchEvent(new CustomEvent('rs:books', {detail:{count}})); } count = n; }
const statusOf = (b, kid) => { b.status = b.status || {}; return b.status[kid] = b.status[kid] || {quiz:false, failAt:0, scanId:null, confirmed:0}; };
addEventListener('rs:profile', () => load());

// ---------- ISBN aus dem Foto lesen ----------
const isbnOk = s => { if (!/^97[89]\d{10}$/.test(s)) return false; let sum = 0; for (let i=0;i<12;i++) sum += +s[i]*(i % 2 ? 3 : 1); return (10 - sum % 10) % 10 === +s[12]; };
let zxing = null;
const loadZXing = () => zxing || (zxing = new Promise((ok, bad) => { const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'; s.onload = () => ok(window.ZXing); s.onerror = () => { zxing = null; bad(new Error('Strichcode-Leser nicht geladen (Internet?)')); }; document.head.append(s); }));
async function decodeISBN(file){
  const url = URL.createObjectURL(file), img = new Image(); img.src = url; await img.decode();
  try {
    if ('BarcodeDetector' in window){ try { const r = await new BarcodeDetector({formats:['ean_13']}).detect(img); const v = r[0] && r[0].rawValue; if (v && isbnOk(v)) return v; } catch(e){} }
    const Z = await loadZXing(), hints = new Map(); hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13]); hints.set(Z.DecodeHintType.TRY_HARDER, true);
    for (const max of [1600, 1000, 2400]){   // verschiedene Größen ausprobieren
      const k = Math.min(1, max/Math.max(img.naturalWidth, img.naturalHeight)), [c, x] = RS.cnv(Math.round(img.naturalWidth*k), Math.round(img.naturalHeight*k)); x.drawImage(img, 0, 0, c.width, c.height);
      try { const src = new Z.HTMLCanvasElementLuminanceSource(c), bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(src)), r = new Z.MultiFormatReader(); r.setHints(hints);
        const v = r.decode(bmp).getText(); if (isbnOk(v)) return v; } catch(e){}
    }
    return null;
  } finally { URL.revokeObjectURL(url); }
}
// ---------- Buchdaten: Deutsche Nationalbibliothek, sonst Open Library ----------
async function lookup(isbn){
  try {
    const r = await fetch(`https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=isbn%3D${isbn}&recordSchema=oai_dc&maximumRecords=1`);
    const x = new DOMParser().parseFromString(await r.text(), 'application/xml'), t = x.getElementsByTagName('dc:title')[0], a = x.getElementsByTagName('dc:creator')[0];
    if (t){ let title = t.textContent.split(' / ')[0]; title = title.split(' ; ').pop().replace(/^\[[^\]]*\]\s*/, '').trim();
      let author = a ? a.textContent.replace(/\s*\[.*?\]\s*/g, '').trim() : ''; if (author.includes(',')){ const [l, f] = author.split(',').map(s => s.trim()); author = f + ' ' + l; }
      return {title, author, cover:`https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false`}; }   // DNB-Cover lassen sich nicht einbinden, daher Open Library
  } catch(e){ console.warn('DNB', e); }
  try {
    const d = await (await fetch(`https://openlibrary.org/search.json?isbn=${isbn}&fields=title,author_name,cover_i`)).json(), b = d.docs && d.docs[0];
    if (b) return {title:b.title, author:(b.author_name || [])[0] || '', cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : ''};
  } catch(e){ console.warn('Open Library', e); }
  return null;
}

// ---------- Eltern: Buch anmelden / bearbeiten ----------
async function edit(id){
  await load();
  const b = id ? JSON.parse(JSON.stringify(books.find(x => x.id === id))) : {id:RS.uuid(), isbn:'', title:'', author:'', cover:'', kids:[], qs:[], talk:[], status:{}, created:Date.now()};
  while (b.qs.length < 3) b.qs.push({q:'', right:'', wrong:['', '']});
  L.openSheet(id ? 'Buch bearbeiten' : '📚 Buch anmelden', body => {
    const field = (label, val, ph, cls = '') => { const lab = el('label', 'field ' + cls, label + ' '), inp = document.createElement('input'); inp.type = 'text'; inp.value = val || ''; inp.placeholder = ph || ''; inp.className = 'pininput name'; inp.autocomplete = 'off'; lab.append(inp); body.append(lab); return inp; };
    body.append(el('p', 'tip', 'Fotografiert den Strichcode hinten auf dem Buch – Titel und Cover kommen dann automatisch. Ihr könnt alles auch von Hand eintippen.'));
    const scanRow = el('div', 'row'), pick = el('label', 'btn main', '📷 Strichcode fotografieren'); pick.htmlFor = 'isbnFile'; scanRow.append(pick); body.append(scanRow);
    const msg = el('p', 'note', ''); body.append(msg);
    const isbn = field('ISBN', b.isbn, '978…'), title = field('Titel', b.title, 'Titel des Buchs'), author = field('Autor', b.author, 'optional');
    const cov = document.createElement('img'); cov.className = 'bookcover'; cov.alt = ''; if (b.cover) cov.src = b.cover; else cov.hidden = true; cov.onerror = () => { cov.hidden = true; }; body.append(cov);
    const find = async () => { const v = isbn.value.replace(/[^0-9]/g, ''); if (!isbnOk(v)){ msg.textContent = 'Das ist keine gültige ISBN (13 Ziffern, beginnt mit 978 oder 979).'; return; }
      msg.textContent = 'Suche Buch …'; const r = await lookup(v);
      if (!r){ msg.textContent = 'Buch nicht gefunden – bitte Titel von Hand eintragen.'; return; }
      b.isbn = v; title.value = r.title; author.value = r.author; b.cover = r.cover; if (r.cover){ cov.src = r.cover; cov.hidden = false; } msg.textContent = '✔ Gefunden: ' + r.title; };
    row(body, [btn('🔍 ISBN suchen', 'small', find)]);
    $('isbnFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; msg.textContent = 'Lese Strichcode …';
      try { const v = await decodeISBN(f); if (!v){ msg.textContent = 'Kein Strichcode erkannt. Fotografiert ihn gerade, scharf und nah – oder tippt die ISBN ein.'; return; } isbn.value = v; await find(); }
      catch(err){ msg.textContent = '⚠ ' + err.message + ' – bitte die ISBN eintippen.'; } };
    body.append(el('h3', 'albumh', 'Für welches Kind?'));
    const kidsBox = el('div', 'things'); (PR.list || []).forEach(k => { const lab = el('label', 'field check'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = k.id; cb.checked = b.kids.includes(k.id); lab.append(cb, document.createTextNode(' ' + k.avatar + ' ' + k.name)); kidsBox.append(lab); });
    if (!(PR.list || []).length) kidsBox.append(el('p', 'note', 'Legt zuerst ein Kinderprofil an.')); body.append(kidsBox);
    body.append(el('h3', 'albumh', 'Fragen zum Buch (3 bis 5)'), el('p', 'note', 'Nur wer das Buch gelesen hat, soll sie beantworten können. Das Kind sieht die Fragen erst beim Abschluss – und erfährt bei Fehlern nicht, was richtig gewesen wäre.'));
    const qBox = el('div', 'qedit'); body.append(qBox);
    const drawQs = () => { qBox.replaceChildren(); b.qs.forEach((q, i) => { const f = el('fieldset', 'qcard'); f.append(el('legend', '', 'Frage ' + (i + 1)));
      const mk = (ph, val, set) => { const t = document.createElement('input'); t.type = 'text'; t.placeholder = ph; t.value = val; t.className = 'pininput name'; t.oninput = () => set(t.value); f.append(t); };
      mk('Frage, z. B. „Wie heißt der Hund von Paul?“', q.q, v => q.q = v); mk('✔ Richtige Antwort', q.right, v => q.right = v); mk('✗ Falsche Antwort 1', q.wrong[0], v => q.wrong[0] = v); mk('✗ Falsche Antwort 2', q.wrong[1], v => q.wrong[1] = v);
      if (b.qs.length > 3) f.append(btn('Frage entfernen', 'small', () => { b.qs.splice(i, 1); drawQs(); })); qBox.append(f); });
      if (b.qs.length < 5) qBox.append(btn('＋ Frage hinzufügen', 'small', () => { b.qs.push({q:'', right:'', wrong:['', '']}); drawQs(); })); };
    drawQs();
    body.append(el('h3', 'albumh', 'Fürs Lesegespräch (optional)'), el('p', 'note', 'Offene Fragen, über die ihr am Ende mit dem Kind sprecht – eine pro Zeile.'));
    const talk = document.createElement('textarea'); talk.className = 'pininput name talkedit'; talk.rows = 3; talk.value = (b.talk || []).join('\n'); body.append(talk);
    const err = el('p', 'note', ''); body.append(err);
    row(body, [btn('Abbrechen', '', () => window.Parents.showArea()),
      ...(id ? [btn('Löschen', 'small danger', async e => { if (!e.target.dataset.sure){ e.target.dataset.sure = 1; e.target.textContent = 'Wirklich löschen?'; return; } books = books.filter(x => x.id !== id); await store(); window.Parents.showArea(); })] : []),
      btn('Speichern ✔', 'main', async () => {
        b.isbn = isbn.value.replace(/[^0-9]/g, ''); b.title = title.value.trim(); b.author = author.value.trim(); b.kids = [...kidsBox.querySelectorAll('input:checked')].map(x => x.value);
        b.qs = b.qs.map(q => ({q:q.q.trim(), right:q.right.trim(), wrong:q.wrong.map(w => w.trim())})); b.talk = talk.value.split('\n').map(s => s.trim()).filter(Boolean);
        const full = b.qs.filter(q => q.q && q.right && q.wrong[0] && q.wrong[1]);
        if (!b.title) return err.textContent = 'Bitte einen Titel eintragen.';
        if (!b.kids.length) return err.textContent = 'Bitte mindestens ein Kind auswählen.';
        if (full.length < 3) return err.textContent = 'Bitte mindestens 3 Fragen komplett ausfüllen (Frage, richtige und zwei falsche Antworten).';
        b.qs = full; const i = books.findIndex(x => x.id === b.id); if (i >= 0) books[i] = b; else books.push(b);
        await store(); L.toast('📚 „' + b.title + '“ gespeichert'); window.Parents.showArea(); })]);
  });
}

// ---------- Kind: Lesen ----------
const UNLOCKS = ['die Zeitmaschine: Dino-Tal', 'die Zeitmaschine: Altes Ägypten', 'die Zeitmaschine: Ritterburg'];
async function openRead(){
  await load(); const me = RS.owner, mine = books.filter(b => (b.kids || []).includes(me));
  L.openSheet('📚 Lesen', body => {
    body.append(el('p', 'tip', count < UNLOCKS.length ? `Du hast ${count} ${count === 1 ? 'Buch' : 'Bücher'} gelesen. Dein nächstes Buch schaltet ${UNLOCKS[count]} frei!` : `Du hast ${count} Bücher gelesen – alle Stationen der Zeitmaschine sind offen! ✦`));
    if (!mine.length){ body.append(el('p', 'cardtext', 'Du hast noch kein Lesebuch. Bitte einen Erwachsenen, im Eltern-Bereich ein Buch für dich anzumelden.'));
      row(body, [btn('👪 Eltern-Bereich', 'small', () => window.Parents.openArea()), btn('Schließen', 'main', L.closeSheet)]); return; }
    mine.forEach(b => { const s = statusOf(b, me), card = el('div', 'bookrow');
      if (b.cover){ const im = document.createElement('img'); im.src = b.cover; im.alt = ''; im.className = 'bookcover small'; im.onerror = () => im.remove(); card.append(im); }
      const info = el('div', 'bookinfo'); info.append(el('b', '', b.title)); if (b.author) info.append(el('small', 'note', b.author));
      const steps = el('ul', 'checks');
      [[s.quiz, '1. Buch-Quiz'], [!!s.scanId, '2. Bild zum Buch'], [!!s.confirmed, '3. Lesegespräch']].forEach(([done, t]) => { const li = el('li', done ? 'ok' : 'wait'); li.append(el('span', 'ic', done ? '✔' : '○'), el('span', '', t)); steps.append(li); });
      info.append(steps);
      if (s.confirmed) info.append(el('small', 'note', '✔ Gelesen am ' + new Date(s.confirmed).toLocaleDateString('de-DE')));
      else if (!s.quiz) info.append(btn('Ich habe es fertig gelesen!', 'small main', () => quiz(b.id)));
      else if (!s.scanId) info.append(btn('✎ Bild zum Buch malen & scannen', 'small main', () => paperTask(b.id)));
      else info.append(btn('💬 Lesegespräch', 'small main', () => talk(b.id, me)));
      card.append(info); body.append(card); });
    row(body, [btn('Schließen', '', L.closeSheet)]);
  });
}
async function quiz(id){
  await load(); const b = books.find(x => x.id === id), me = RS.owner, s = statusOf(b, me);
  const wait = s.failAt + COOLDOWN - Date.now();
  if (wait > 0) return L.openSheet('Noch kurz warten', body => { body.append(el('p', 'cardtext', `Lies noch einmal in „${b.title}“ nach. In ${Math.ceil(wait/60e3)} Minuten kannst du das Quiz wieder versuchen.`)); row(body, [btn('OK', 'main', L.closeSheet)]); });
  const qs = [...b.qs].sort(() => Math.random() - .5).map((q, i) => ({id:`book-${b.id}-${i}`, type:'mc', q:q.q, options:[q.right, ...q.wrong], answer:0, explain:''}));
  let i = 0, right = 0;
  const step = () => {
    if (i >= qs.length){ const need = Math.ceil(qs.length*PASS), ok = right >= need;
      if (ok) s.quiz = true; else s.failAt = Date.now(); store();
      return L.openSheet(ok ? 'Quiz bestanden! ✦' : 'Noch nicht ganz', body => {
        body.append(el('div', 'stamp big', ok ? '📖' : '⏳'), el('p', 'cardtext', `${right} von ${qs.length} richtig.`));
        body.append(el('p', 'cardtext', ok ? 'Super! Jetzt kommt Schritt 2: Mal ein Bild zu deinem Buch – deine Lieblingsszene oder die Hauptfigur – auf Papier und scanne es ein.' : `Du brauchst mindestens ${need} richtige Antworten. Lies noch einmal in deinem Buch nach – in einer Stunde kannst du es wieder versuchen.`));
        row(body, ok ? [btn('✎ Jetzt malen & scannen', 'main', () => paperTask(b.id))] : [btn('OK', 'main', L.closeSheet)]); }); }
    const q = qs[i++]; L.ask(q, ok => { if (ok) right++; }, {next:step, label:`„${b.title}“ · Frage ${i} von ${qs.length}`, gift:false, noReveal:true});
  };
  step();
}
function paperTask(id){
  const b = books.find(x => x.id === id);
  L.openSheet('✎ Bild zum Buch', body => {
    body.append(el('p', 'cardtext', `Mal deine Lieblingsszene oder die Hauptfigur aus „${b.title}“ auf ein Blatt Papier. Dann fotografierst du es – dein Bild zieht als Figur in die Welt ein!`));
    const lab = el('label', 'btn main', '✎ Bild jetzt scannen'); lab.htmlFor = 'scanFile'; lab.onclick = () => { RS.setScanContext({bookId:b.id, bookTitle:b.title}); L.closeSheet(); };
    const r = el('div', 'row'); r.append(btn('Später', '', L.closeSheet), lab); body.append(r);
  });
}
addEventListener('rs:scanned', async e => { const d = e.detail; if (!d.bookId) return; await load(); const b = books.find(x => x.id === d.bookId); if (!b) return;
  statusOf(b, RS.owner).scanId = d.id; await store(); setTimeout(() => L.toast('✔ Bild zu „' + b.title + '“ gespeichert – jetzt fehlt nur noch das Lesegespräch'), 2500); });
const TALK = ['Wer ist die Hauptfigur? Erzähl, wie sie ist.', 'Was war die spannendste oder lustigste Stelle?', 'Wie hat die Geschichte geendet?', 'Hat dir das Buch gefallen? Warum (nicht)?'];
async function talk(id, kid, {parent = false} = {}){
  await load(); const b = books.find(x => x.id === id), s = statusOf(b, kid);
  L.openSheet('💬 Lesegespräch', body => {
    body.append(el('p', 'cardtext', parent ? `Sprecht mit dem Kind über „${b.title}“:` : `Hol einen Erwachsenen und erzähl ihm von „${b.title}“. Diese Fragen helfen euch:`));
    const ul = el('ul', 'talk'); [...TALK, ...(b.talk || [])].forEach(t => ul.append(el('li', '', t))); body.append(ul);
    row(body, [btn('Später', '', L.closeSheet), btn('👪 Erwachsener: bestätigen', 'main', () => window.Parents.verify(async () => {
      s.confirmed = Date.now(); await store();
      L.openSheet('Buch geschafft! 📚✦', b2 => { b2.append(el('div', 'stamp big', '📚'), el('p', 'cardtext', `„${b.title}“ ist gelesen und bestätigt!`));
        const n = books.filter(x => ((x.status || {})[kid] || {}).confirmed).length;
        if (kid === RS.owner && n <= UNLOCKS.length) b2.append(el('p', 'cardtext', '🔓 Neu freigeschaltet: ' + UNLOCKS[n - 1] + '! Reise mit dem Regenbogen-Tor hin.'));
        if (kid === RS.owner){ L.addStars(20, 'Buch gelesen'); if (window.Rewards) Rewards.giftInto(b2); }
        row(b2, [btn('Juhu! ✦', 'main', L.closeSheet)]); });
    }, {reason:'Hat das Kind das Buch wirklich gelesen? Dann bestätigt es bitte mit der Eltern-PIN.'}))]);
  });
}
$('readBtn').onclick = openRead;
window.Books = {get count(){ return count; }, all: load, edit, talk, openRead, decodeISBN, lookup, isbnOk};
})();
