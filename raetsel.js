// Rainbow Stars – Rätsel-Zeit: Wissens-Quiz (Kategorien) und Rechen-Geschichten (Sachaufgaben zum Lesen)
(() => {
const RS = window.RS, L = window.Learn, M = window.RSMath, { el, btn, row } = L;
let bank = {categories:[], questions:[]};
fetch('content/quiz.json').then(r => r.json()).then(d => { bank = d; }).catch(e => console.warn('Quizfragen fehlen', e));
const shuffle = a => { const b = a.slice(); for (let i=b.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// ---------- Wissens-Quiz ----------
function questionsOf(cat){
  const space = ((L.worldOf('space') || {}).content || {questions:[]}).questions;
  if (cat === 'weltall') return space;
  if (cat === 'mix') return [...bank.questions, ...space];
  return bank.questions.filter(q => q.cat === cat);
}
function pickQ(list, skip){
  const fresh = list.filter(q => !skip.includes(q.id) && !(L.P.q[q.id] && L.P.q[q.id].ok));   // erst die, die noch nicht richtig waren
  const pool = fresh.length ? fresh : list.filter(q => !skip.includes(q.id));
  return pool.length ? shuffle(pool)[0] : null;
}
function knowledgeQuiz(cat, n = 5){
  const list = questionsOf(cat), name = cat === 'mix' ? 'Bunt gemischt' : (bank.categories.find(c => c.id === cat) || {}).name || 'Quiz';
  let done = 0, right = 0; const asked = [];
  const step = () => {
    const q = done < n ? pickQ(list, asked) : null;
    if (!q) return L.openSheet('Quiz geschafft!', body => {
      body.append(el('div', 'stamp big', right === done ? '★' : '✦'));
      body.append(el('p', 'cardtext', `${name}: Du hast ${right} von ${done} Fragen richtig beantwortet.`));
      row(body, [btn('Noch ein Quiz', '', () => knowledgeQuiz(cat, n)), btn('Zur Rätsel-Zeit', 'main', openHub)]); });
    asked.push(q.id); done++;
    L.ask(q, ok => { if (ok) right++; }, {next:step, label:`${name} · Frage ${done} von ${n}`});
  };
  step();
}

// ---------- Rechen-Geschichten ----------
const mstate = () => L.P.math;
function mathRound(n = 5){ const round = {i:0, right:0, n}; mathTask(round); }
function adapt(firstTry){
  const m = mstate();
  if (firstTry){ m.ok++; m.bad = 0; m.solved = (m.solved || 0) + 1; if (m.ok >= 4 && m.level < 4){ m.level++; m.ok = 0; L.toast('Klasse! Ab jetzt: ' + M.levelName(m.level)); } }
  else { m.bad++; m.ok = 0; if (m.bad >= 2 && m.level > 1){ m.level--; m.bad = 0; L.toast('Wir machen es etwas leichter: ' + M.levelName(m.level)); } }
  L.save();
}
function mathTask(round){
  const t = M.make(mstate().level); let tries = 0, val = ''; window.Raetsel.current = t;
  L.openSheet(`Rechen-Geschichte ${round.i + 1} von ${round.n}`, body => {
    body.append(el('p', 'tip', M.levelName(t.level) + ' · Lies die Geschichte genau – die Zahlen stecken im Text.'));
    body.append(el('p', 'story', t.text));
    if (t.level === 1 && L.canSpeak) row(body, [btn('🔊 Vorlesen', 'speak', () => L.speak(t.text))]);
    const ans = el('div', 'answer'), out = el('span', 'val', ' '), unit = el('span', 'unit', t.unit);
    ans.append(el('span', 'lbl', 'Antwort:'), out, unit); body.append(ans);
    const show = () => { out.textContent = val ? Number(val).toLocaleString('de-DE') : ' '; };
    const pad = el('div', 'keypad');
    const press = k => { if (!pad.isConnected || checkB.disabled) return; if (k === '⌫') val = val.slice(0, -1); else if (val.length < 7) val = (val + k).replace(/^0+(?=\d)/, ''); show(); };
    ['1','2','3','4','5','6','7','8','9','⌫','0'].forEach(k => pad.append(btn(k, k === '⌫' ? 'key del' : 'key', () => press(k))));
    const checkB = btn('Prüfen ✓', 'key ok main', () => check()); pad.append(checkB); body.append(pad);
    const fb = el('div', ''); body.append(fb);
    const onKey = e => { if (!pad.isConnected){ removeEventListener('keydown', onKey); return; }
      if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); else if (e.key === 'Enter') check(); };
    addEventListener('keydown', onKey);
    const way = () => t.steps.trim().endsWith(t.unit) ? t.steps : t.steps + ' ' + t.unit;   // Einheit nicht doppelt
    function check(){
      if (!val){ L.toast('Tippe zuerst deine Antwort ein.'); return; }
      const ok = Number(val) === t.answer; tries++;
      fb.replaceChildren(); const res = el('div', 'result ' + (ok ? 'ok' : 'bad')); fb.append(res);
      if (ok){
        checkB.disabled = true; round.right++;
        res.append(el('b', '', ['Super gerechnet!', 'Richtig!', 'Klasse!', 'Spitze!'][Math.floor(Math.random()*4)]), el('p', 'cardtext', 'Rechenweg: ' + way() + '.'));
        L.addStars(tries === 1 ? t.level + 1 : 1, 'Rechen-Geschichte'); adapt(tries === 1);
        if (window.Rewards) window.Rewards.solved(res);
        res.append(nextRow());
      } else if (tries === 1){
        res.append(el('b', '', 'Noch nicht ganz.'), el('p', 'cardtext', 'Lies die Geschichte noch einmal genau: Was wird gefragt? Welche Zahlen brauchst du? Versuch es noch einmal!'));
        val = ''; show();
      } else {
        checkB.disabled = true;
        res.append(el('b', '', 'So geht es:'), el('p', 'cardtext', 'Rechenweg: ' + way() + '.'), el('p', 'cardtext', `Die Lösung ist ${t.answer.toLocaleString('de-DE')} ${t.unit}. Beim nächsten Mal klappt es!`));
        adapt(false); res.append(nextRow());
      }
      res.scrollIntoView({block:'nearest', behavior:'smooth'});
    }
    function nextRow(){ const r = el('div', 'row'); round.i++;
      r.append(round.i < round.n ? btn('Nächste Geschichte →', 'main', () => mathTask(round)) : btn('Fertig ✦', 'main', () => L.openSheet('Rechen-Runde geschafft!', b2 => {
        b2.append(el('div', 'stamp big', round.right === round.n ? '★' : '✦'));
        b2.append(el('p', 'cardtext', `Du hast ${round.right} von ${round.n} Rechen-Geschichten gelöst.`), el('p', 'note', 'Deine Stufe: ' + M.levelName(mstate().level)));
        row(b2, [btn('Noch eine Runde', '', () => mathRound()), btn('Zur Rätsel-Zeit', 'main', openHub)]); })));
      return r; }
  });
}

// ---------- Rätsel-Zeit (Übersicht) ----------
function openHub(){
  L.openSheet('🧠 Rätsel-Zeit', body => {
    body.append(el('p', 'tip', 'Für jede richtige Lösung gibt es Sterne und ein Überraschungsgeschenk 🎁'));
    body.append(el('h3', 'albumh', '📚 Wissens-Quiz'));
    const cats = el('div', 'hubgrid');
    [...bank.categories, {id:'mix', name:'Bunt gemischt', icon:'🌈'}].forEach(c => cats.append(btn(c.icon + ' ' + c.name, 'hubbtn', () => knowledgeQuiz(c.id))));
    body.append(cats);
    body.append(el('h3', 'albumh', '🔢 Rechen-Geschichten'));
    const m = mstate();
    body.append(el('p', 'cardtext', 'Kurze Geschichten zum Lesen und Rechnen. ' + M.levelName(m.level) + ' – die Stufe passt sich an, wie gut es klappt.'));
    row(body, [btn('➖ leichter', 'small', () => { if (m.level > 1){ m.level--; m.ok = m.bad = 0; L.save(); } openHub(); }),
               btn('Los geht’s ✦', 'main', () => mathRound()),
               btn('➕ schwerer', 'small', () => { if (m.level < 4){ m.level++; m.ok = m.bad = 0; L.save(); } openHub(); })]);
    row(body, [btn('Schließen', '', L.closeSheet)]);
  });
}
RS.$('raetselBtn').onclick = openHub;
// Rätsel-Eule auf der Heimatwiese: ein fester Ort zum Rätseln
{ const [c, x] = RS.cnv(260, 330);
  const top = [[30,150],[230,150],[210,190],[50,190]]; RS.pencil(x, top, '#c99a76'); RS.ink(x, top, true, 3);
  const leg = [[110,190],[150,190],[156,320],[104,320]]; RS.pencil(x, leg, '#b98866'); RS.ink(x, leg, true, 3);
  const foot = RS.wob(130, 318, 70, 12, 24, .03); RS.pencil(x, foot, '#a5703f'); RS.ink(x, foot, true, 2.4);
  const book = [[60,150],[128,136],[200,150],[128,160]]; RS.pencil(x, book, '#fff4e6'); RS.ink(x, book, true, 2);
  x.drawImage(window.Rewards.emojiCanvas('🦉', 150), 55, 0);
  const W = RS.W.home, g = new RS.THREE.Group(); g.position.set(5, 0, .5); W.group.add(g);
  const m = RS.bill(c, 1.3, g); RS.shadow(1.2, g);
  const act = {kind:'sight', ref:{pos:g.position.clone(), name:'Rätsel-Eule'}, go:'läuft zur Rätsel-Eule', doing:'spricht mit der Rätsel-Eule', mark:' 🦉', marvel:true, off:.95, fxH:1.6, onArrive: openHub};
  m.userData.act = act; W.acts.push(act); W.picks.push(m); }
window.Raetsel = {openHub, knowledgeQuiz, mathRound};
})();
