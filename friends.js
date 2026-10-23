// Rainbow Stars – Freundschaften zwischen den Profilen (sehen können sich auf der Wiese alle; Freunde gelten erst, wenn beide Ja gesagt haben).
// Gespeichert pro Familie im Schlüssel "friends" (mit dem Familien-Konto später auch zwischen Geräten).
(() => {
const RS = window.RS, L = window.Learn, { el, btn, row } = L;
let pairs = [];   // {a, b, status:'pending'|'accepted', from, at}  (a < b)
const key = (x, y) => x < y ? [x, y] : [y, x];
const find = (x, y) => { const [a, b] = key(x, y); return pairs.find(p => p.a === a && p.b === b); };
const load = async () => { pairs = (await RS.idb.getP('friends')) || []; };
const store = async () => { await RS.idb.setP('friends', pairs); dispatchEvent(new CustomEvent('rs:friends')); };
const others = () => ((window.Profiles && Profiles.list) || []).filter(p => p.id !== RS.owner);
const nameOf = id => ((window.Profiles && Profiles.list) || []).find(p => p.id === id) || {name:'?', avatar:'🙂'};
function isFriend(id){ const p = RS.owner && find(RS.owner, id); return !!(p && p.status === 'accepted'); }
async function request(id){ await load(); if (find(RS.owner, id)) return; const [a, b] = key(RS.owner, id); pairs.push({a, b, status:'pending', from:RS.owner, at:Date.now()}); await store(); }
async function respond(id, accept){ await load(); const p = find(RS.owner, id); if (!p) return; if (accept) p.status = 'accepted'; else pairs.splice(pairs.indexOf(p), 1); await store(); }
async function end(id){ await load(); const p = find(RS.owner, id); if (p){ pairs.splice(pairs.indexOf(p), 1); await store(); } }

async function openFriends(){
  await load();
  L.openSheet('👫 Freunde', body => {
    body.append(el('p', 'tip', 'Auf der Wiese seht ihr euch alle. Hier könnt ihr euch befreunden – eine Freundschaft gilt, wenn beide Ja gesagt haben.'));
    const list = others();
    if (!list.length) body.append(el('p', 'cardtext', 'Es gibt noch keine anderen Profile. Wenn Geschwister ein eigenes Profil anlegen, könnt ihr euch hier befreunden.'));
    list.forEach(o => { const p = find(RS.owner, o.id), r = el('div', 'bookrow'), info = el('div', 'bookinfo');
      info.append(el('b', '', o.avatar + ' ' + o.name), el('small', 'note', !p ? 'Noch nicht befreundet' : p.status === 'accepted' ? '✔ Ihr seid Freunde' : p.from === RS.owner ? '⏳ Anfrage verschickt' : '💌 möchte mit dir befreundet sein'));
      const acts = el('div', 'fs-row');
      if (!p) acts.append(btn('💌 Anfrage schicken', 'small main', async () => { await request(o.id); L.toast('💌 Anfrage an ' + o.name + ' geschickt'); openFriends(); }));
      else if (p.status === 'accepted') acts.append(btn('Freundschaft beenden', 'small', async e => { if (!e.target.dataset.sure){ e.target.dataset.sure = 1; e.target.textContent = 'Wirklich beenden?'; return; } await end(o.id); openFriends(); }));
      else if (p.from === RS.owner) acts.append(btn('Anfrage zurückziehen', 'small', async () => { await end(o.id); openFriends(); }));
      else acts.append(btn('✔ Annehmen', 'small main', async () => { await respond(o.id, true); L.toast('👫 Ihr seid jetzt Freunde!'); openFriends(); }), btn('Ablehnen', 'small', async () => { await respond(o.id, false); openFriends(); }));
      info.append(acts); r.append(info); body.append(r); });
    row(body, [btn('Schließen', '', L.closeSheet)]);
  });
}
// nach der Anmeldung: offene Anfragen zeigen
addEventListener('rs:profile', async () => { await load(); dispatchEvent(new CustomEvent('rs:friends'));
  const open = pairs.filter(p => p.status === 'pending' && p.from !== RS.owner && (p.a === RS.owner || p.b === RS.owner));
  if (!open.length) return;
  setTimeout(() => { const o = nameOf(open[0].from);
    L.openSheet('💌 Freundschaftsanfrage', body => { body.append(el('p', 'cardtext', `${o.avatar} ${o.name} möchte mit dir befreundet sein.`));
      row(body, [btn('Ablehnen', '', async () => { await respond(open[0].from, false); L.closeSheet(); }), btn('✔ Annehmen', 'main', async () => { await respond(open[0].from, true); L.closeSheet(); L.toast('👫 Ihr seid jetzt Freunde!'); })]); }); }, 2000);
});
window.Friends = {isFriend, request, respond, end, open:openFriends, get pairs(){ return pairs.slice(); }, load};
})();
