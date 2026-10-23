// Supabase Edge Function "book-question": erstellt aus 2–3 Fotos von Buchseiten zwei kindgerechte Verständnisfragen (Gemini).
// Secrets im Supabase-Dashboard: GEMINI_API_KEY (Pflicht), optional GEMINI_MODEL (sonst gemini-flash-latest, dann Ausweich-Modelle).
// Nur für angemeldete Familien: Ohne gültige Anmeldung (Familien-Konto) wird abgelehnt.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);

  // 1) Ist das wirklich eine angemeldete Familie? (Der öffentliche Schlüssel allein reicht nicht.)
  // Die Anmeldung prüft der Supabase-Anmeldedienst selbst – ungültige oder fremde Schlüssel werden dort abgelehnt.
  const auth = req.headers.get("Authorization") ?? "", apikey = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const who = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", { headers: { apikey, Authorization: auth } });
  const user = who.ok ? await who.json() : null;
  if (!user || !user.id) return json({ error: "Bitte mit dem Familien-Konto anmelden." }, 401);

  // 2) Eingaben prüfen
  let body: { title?: string; grade?: number; images?: string[] };
  try { body = await req.json(); } catch { return json({ error: "Ungültige Anfrage" }, 400); }
  const images = (body.images ?? []).filter((x) => typeof x === "string").slice(0, 3);
  if (images.length < 1) return json({ error: "Keine Fotos" }, 400);
  if (images.some((b64) => b64.length > 2_000_000)) return json({ error: "Foto zu groß" }, 413);
  const title = String(body.title ?? "ein Buch").slice(0, 80);
  const grade = Math.max(1, Math.min(7, Number(body.grade) || 4));

  // 3) Gemini fragen
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "GEMINI_API_KEY fehlt im Projekt" }, 500);
  // Google stellt alte Modelle ab – daher mehrere der Reihe nach probieren (eigenes Modell per Secret GEMINI_MODEL zuerst)
  const models = [Deno.env.get("GEMINI_MODEL"), "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3-flash-preview"].filter(Boolean) as string[];
  const prompt = `Du bist eine freundliche Lese-Eule für ein Kind der ${grade}. Klasse.
Auf den Fotos sind Seiten aus dem Buch „${title}“, die das Kind gerade gelesen hat.
Erstelle 2 Verständnisfragen, jede zu einer anderen Seite. Frage nur nach dem Inhalt der Fotos:
was passiert, wer etwas tut, warum, wie sich jemand fühlt. Keine Fragen zu Seitenzahlen, zum Zählen von Wörtern
oder zu winzigen Details. Einfache, kurze Sprache. Jede Frage hat genau 3 kurze Antworten, genau eine ist richtig,
die falschen sollen plausibel klingen. Antworte NUR mit JSON in diesem Format:
{"lesbar": true, "fragen": [{"frage": "…", "antworten": ["…", "…", "…"], "richtig": 0, "seite": 1}]}
Wenn auf den Fotos keine lesbaren Buchseiten zu sehen sind, antworte nur: {"lesbar": false}`;
  let text = "", last = 0;
  for (const model of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, ...images.map((data) => ({ inline_data: { mime_type: "image/jpeg", data } }))] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.4 },
        }),
        signal: AbortSignal.timeout(45_000),
      });
      last = r.status;
      if (!r.ok) continue;   // z. B. 404 (Modell abgeschaltet) oder 503 (überlastet) -> nächstes Modell
      const out = await r.json();
      text = (out?.candidates?.[0]?.content?.parts ?? []).filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).map((p: { text: string }) => p.text).join("");
      if (text) break;
    } catch { last = 504; }
  }
  if (!text) return json({ error: "KI nicht erreichbar (" + last + ")" }, 502);
  let parsed: { lesbar?: boolean; fragen?: { frage: string; antworten: string[]; richtig: number; seite?: number }[] };
  try { parsed = JSON.parse(text); } catch { return json({ lesbar: false }); }

  // 4) Nur saubere Fragen zurückgeben
  const fragen = (parsed.fragen ?? []).filter((f) => f && typeof f.frage === "string" && Array.isArray(f.antworten) && f.antworten.length === 3 && f.richtig >= 0 && f.richtig < 3).slice(0, 2);
  return json({ lesbar: !!parsed.lesbar && fragen.length > 0, fragen });
});
