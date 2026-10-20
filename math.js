// Rainbow Stars – Rechen-Geschichten: Sachaufgaben zum Lesen und Rechnen in 4 Stufen
// Stufe 1 ≈ 1./2. Klasse, 2 ≈ 3. Klasse, 3 ≈ 4. Klasse, 4 ≈ 5./6. Klasse. Jede Aufgabe hat eine ganze Zahl als Lösung und einen Rechenweg.
(function(root){
const ri = (a, b) => a + Math.floor(Math.random()*(b - a + 1));
const pick = a => a[Math.floor(Math.random()*a.length)];
const fmt = n => n.toLocaleString('de-DE');

const LEVELS = {
  1: [
    () => { const a = ri(3, 12), b = ri(2, 20 - a);
      return {text:`Hase Flocke hat ${a} Möhren. Hase Mümmel bringt ihm noch ${b} Möhren dazu. Wie viele Möhren hat Flocke jetzt?`, answer:a+b, unit:'Möhren', steps:`${a} + ${b} = ${a+b}`}; },
    () => { const a = ri(9, 20), b = ri(2, a - 2);
      return {text:`Auf der Wiese blühen ${a} Blumen. Bärchen Honig pflückt ${b} davon für seine Mama. Wie viele Blumen blühen noch auf der Wiese?`, answer:a-b, unit:'Blumen', steps:`${a} − ${b} = ${a-b}`}; },
    () => { const a = ri(3, 10), b = a + ri(2, 9);
      return {text:`Du hast ${a} Sterne gesammelt. Sternenfee Luna hat ${b} Sterne gesammelt. Wie viele Sterne hat Luna mehr als du?`, answer:b-a, unit:'Sterne', steps:`${b} − ${a} = ${b-a}`}; },
    () => { const k = ri(2, 6);
      return {text:`Im Regenbogen-Laden kostet ein Sticker 10 Sterne. Du kaufst ${k} Sticker. Wie viele Sterne musst du bezahlen?`, answer:k*10, unit:'Sterne', steps:`${k} · 10 = ${k*10}`}; },
    () => { const a = ri(1, 6)*10, b = ri(1, 9 - a/10)*10;
      return {text:`Ein Schmetterling fliegt am Morgen ${a} Meter weit. Am Nachmittag fliegt er noch einmal ${b} Meter. Wie viele Meter ist er zusammen geflogen?`, answer:a+b, unit:'Meter', steps:`${a} + ${b} = ${a+b}`}; },
    () => { const n = ri(2, 5);
      return {text:`Ein Hase hat 4 Beine. Auf der Wiese hüpfen ${n} Hasen herum. Wie viele Hasenbeine sind das zusammen?`, answer:n*4, unit:'Beine', steps:`${n} · 4 = ${n*4}`}; },
  ],
  2: [
    () => { const n = ri(3, 9), k = ri(3, 9);
      return {text:`${n} Hasen machen zusammen ein Picknick. Jeder Hase bekommt ${k} Möhren. Wie viele Möhren braucht man für alle Hasen zusammen?`, answer:n*k, unit:'Möhren', steps:`${n} · ${k} = ${n*k}`}; },
    () => { const n = ri(3, 9), k = ri(3, 9);
      return {text:`Sternenfee Luna hat ${n*k} Sternenkekse gebacken. Sie verteilt sie gerecht an ${n} Freunde. Wie viele Kekse bekommt jeder Freund?`, answer:k, unit:'Kekse', steps:`${n*k} : ${n} = ${k}`}; },
    () => { const a = ri(120, 480), b = ri(100, 450);
      return {text:`Die Rakete fliegt am Montag ${a} Kilometer. Am Dienstag fliegt sie ${b} Kilometer. Wie viele Kilometer ist die Rakete an beiden Tagen zusammen geflogen?`, answer:a+b, unit:'km', steps:`${a} + ${b} = ${a+b}`}; },
    () => { const p = ri(3, 17);
      return {text:`Im Buchladen kostet ein Comic ${p} Euro. Du bezahlst mit einem 20-Euro-Schein. Wie viel Geld bekommst du zurück?`, answer:20-p, unit:'€', steps:`20 € − ${p} € = ${20-p} €`}; },
    () => { const a = ri(2, 6)*5, b = ri(2, 7)*5;
      return {text:`In der Pause spielt ihr ${a} Minuten Fangen. Danach spielt ihr noch ${b} Minuten Verstecken. Wie viele Minuten habt ihr insgesamt gespielt?`, answer:a+b, unit:'Minuten', steps:`${a} + ${b} = ${a+b}`}; },
    () => { const t = ri(300, 900), b = ri(50, t - 100);
      return {text:`In einem Bienenstock wohnen ${t} Bienen. Am Morgen fliegen ${b} Bienen hinaus zu den Blumen. Wie viele Bienen sind noch im Stock?`, answer:t-b, unit:'Bienen', steps:`${t} − ${b} = ${t-b}`}; },
  ],
  3: [
    () => { const n = ri(2, 5), p = ri(2, 6), s = ri(1, 4);
      return {text:`Für die Schule kaufst du ${n} Hefte. Jedes Heft kostet ${p} Euro. Dazu kaufst du noch einen Stift für ${s} Euro. Wie viel Euro bezahlst du insgesamt?`, answer:n*p+s, unit:'€', steps:`${n} · ${p} € = ${n*p} €, dann ${n*p} € + ${s} € = ${n*p+s} €`}; },
    () => { const k = ri(4, 8), m = ri(5, 12), t = k*m;
      return {text:`In einem Korb liegen ${t} Äpfel. Bärchen Honig packt immer ${k} Äpfel in eine Tüte. Wie viele Tüten kann er damit füllen?`, answer:m, unit:'Tüten', steps:`${t} : ${k} = ${m}`}; },
    () => { const k = ri(3, 6), t = k*ri(3, 8) + ri(1, k - 1), boats = Math.ceil(t/k);
      return {text:`${t} Kinder wollen auf dem See Boot fahren. In ein Boot passen ${k} Kinder. Wie viele Boote braucht man mindestens, damit alle Kinder mitfahren können?`, answer:boats, unit:'Boote', steps:`${t} : ${k} = ${Math.floor(t/k)} Rest ${t % k}. Für ${t % k === 1 ? 'das übrige Kind' : 'die übrigen ' + (t % k) + ' Kinder'} braucht man noch ein Boot: ${Math.floor(t/k)} + 1 = ${boats}`}; },
    () => { const h = ri(1, 3), m = ri(1, 11)*5;
      return {text:`Euer Ausflug in den Zoo dauert ${h} ${h === 1 ? 'Stunde' : 'Stunden'} und ${m} Minuten. Wie viele Minuten sind das zusammen?`, answer:h*60+m, unit:'Minuten', steps:`${h} · 60 = ${h*60} Minuten, dann ${h*60} + ${m} = ${h*60+m}`}; },
    () => { const a = ri(2, 9);
      return {text:`Für das Drachenfest braucht ihr eine lange Schnur. Sie ist ${a} Meter lang. Wie viele Zentimeter sind das?`, answer:a*100, unit:'cm', steps:`1 m = 100 cm, also ${a} · 100 = ${a*100} cm`}; },
    () => { const a = ri(1200, 5800), b = ri(800, 3900);
      return {text:`Die Bücherei hat ${fmt(a)} Bücher für Kinder und ${fmt(b)} Bücher für Erwachsene. Wie viele Bücher hat die Bücherei zusammen?`, answer:a+b, unit:'Bücher', steps:`${fmt(a)} + ${fmt(b)} = ${fmt(a+b)}`}; },
  ],
  4: [
    () => { const [name, d] = pick([['die Hälfte', 2], ['ein Drittel', 3], ['ein Viertel', 4]]), t = d*ri(6, 30);
      return {text:`Sternenfee Luna hat ${t} Sterne gesammelt. Davon schenkt sie ${name} ihrer Freundin. Wie viele Sterne behält Luna selbst?`, answer:t - t/d, unit:'Sterne', steps:`${name[0].toUpperCase() + name.slice(1)} von ${t} sind ${t} : ${d} = ${t/d}. Luna behält ${t} − ${t/d} = ${t - t/d}`}; },
    () => { let a, b, c; do { a = ri(8, 25); b = ri(8, 25); c = ri(8, 25); } while ((a+b+c) % 3);
      return {text:`An drei Tagen sammelst du Kastanien: am ersten Tag ${a}, am zweiten Tag ${b} und am dritten Tag ${c}. Wie viele Kastanien sind das im Durchschnitt pro Tag?`, answer:(a+b+c)/3, unit:'Kastanien', steps:`${a} + ${b} + ${c} = ${a+b+c}, dann ${a+b+c} : 3 = ${(a+b+c)/3}`}; },
    () => { const w = ri(3, 8), n = ri(4, 12), s = ri(5, 40), z = s + w*n;
      return {text:`Du hast schon ${s} Euro gespart. Jede Woche legst du ${w} Euro von deinem Taschengeld dazu. Nach wie vielen Wochen hast du genau ${z} Euro?`, answer:n, unit:'Wochen', steps:`Es fehlen ${z} − ${s} = ${z-s} €. ${z-s} : ${w} = ${n}`}; },
    () => { const a = ri(20, 80)*1000 + ri(0, 999), b = ri(5, 19)*1000 + ri(0, 999);
      return {text:`Ein Fußballstadion hat ${fmt(a)} Plätze. Beim Spiel am Samstag bleiben ${fmt(b)} Plätze leer. Wie viele Zuschauer sind im Stadion?`, answer:a-b, unit:'Zuschauer', steps:`${fmt(a)} − ${fmt(b)} = ${fmt(a-b)}`}; },
    () => { const l = ri(3, 12), br = ri(2, 9), p = ri(2, 6);
      return {text:`Ein Gemüsebeet ist ${l} Meter lang und ${br} Meter breit. Auf jeden Quadratmeter pflanzt ihr ${p} Salatköpfe. Wie viele Salatköpfe pflanzt ihr insgesamt?`, answer:l*br*p, unit:'Salatköpfe', steps:`Fläche: ${l} · ${br} = ${l*br} m², dann ${l*br} · ${p} = ${l*br*p}`}; },
    () => { const v = ri(4, 9)*100, h = ri(2, 6), back = ri(1, h - 1)*v/2;
      return {text:`Ein Raumschiff fliegt in jeder Stunde ${fmt(v)} Kilometer. Es fliegt ${h} Stunden lang geradeaus. Dann dreht es um und fliegt ${fmt(back)} Kilometer zurück. Wie weit ist es jetzt vom Start entfernt?`, answer:v*h - back, unit:'km', steps:`${fmt(v)} · ${h} = ${fmt(v*h)} km, dann ${fmt(v*h)} − ${fmt(back)} = ${fmt(v*h - back)} km`}; },
    () => { const t = ri(3, 6);
      return {text:`Ein erwachsener Elefant wiegt ungefähr ${t} Tonnen. Wie viele Kilogramm sind das?`, answer:t*1000, unit:'kg', steps:`1 t = 1.000 kg, also ${t} · 1.000 = ${fmt(t*1000)} kg`}; },
  ],
};
function make(level){ const L = Math.max(1, Math.min(4, level|0)); const t = pick(LEVELS[L])(); return {...t, level:L}; }
const api = {make, LEVELS, levelName: l => ({1:'Stufe 1 · leicht', 2:'Stufe 2', 3:'Stufe 3', 4:'Stufe 4 · knifflig'})[l]};
if (typeof module !== 'undefined') module.exports = api; else root.RSMath = api;
})(typeof window !== 'undefined' ? window : globalThis);
