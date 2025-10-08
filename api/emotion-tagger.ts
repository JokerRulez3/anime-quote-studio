import { createClient } from "@supabase/supabase-js";

// ---- Env (server-only) ----
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const INGEST_KEY = process.env.INGEST_KEY!;

const supabase = createClient(SUPABASE_URL!, SERVICE_KEY);

// Keep taxonomy small & consistent across UI + search
const EMOTION_LABELS = [
  "hope",
  "courage",
  "determination",
  "love",
  "friendship",
  "wisdom",
  "sorrow",
  "anger",
  "fear",
] as const;
type Emotion = (typeof EMOTION_LABELS)[number];

type QuoteRow = { id: number; quote_text: string };

// Simple chunker
function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// robust JSON parse
function safeParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    if (!INGEST_KEY || req.headers["x-ingest-key"] !== INGEST_KEY)
      return res.status(401).json({ error: "Unauthorized" });

    // Allow override limit via query: /api/emotion-tagger?limit=50
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "100"), 10) || 100, 1), 200);

    // 1) Pull next batch of untagged quotes
    const { data: rows, error } = await supabase
      .from("quotes")
      .select("id, quote_text")
      .is("emotion", null)
      .eq("status", "approved")
      .order("id", { ascending: true }) // deterministic
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    if (!rows || rows.length === 0) return res.json({ message: "No untagged quotes." });

    // 2) Classify in sub-batches of 20 for better reliability
    const subBatches = chunk(rows, 20);
    const updates: { id: number; emotion: Emotion; emotion_confidence: number; emotion_model: string }[] = [];

    for (const batch of subBatches) {
      // Build a concise prompt that returns strict JSON
      const items = batch.map((r, i) => ({ i, id: r.id, text: r.quote_text }));
      const system = `You are an expert emotion classifier for anime-style quotes. 
Classify each quote's PRIMARY emotional tone. Choose only ONE from this fixed set:
${EMOTION_LABELS.join(", ")}.

Return STRICT JSON ONLY as an array. Each item must be:
{ "i": <index we gave you>, "emotion": "<one label above>", "confidence": <0..1> }`;

      const user = `Classify these ${items.length} quotes:
${JSON.stringify(items, null, 0)}`;

      // OpenAI call (JSON-mode style by strongly constraining the output)
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          // You can also add: response_format: { type: "json_object" }
        }),
      });

      if (!r.ok) {
        const text = await r.text();
        return res.status(502).json({ error: `OpenAI ${r.status}`, body: text });
      }

      const json = await r.json();
      const content: string =
        json?.choices?.[0]?.message?.content ??
        json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
        "[]";

      type ModelOut = { i: number; emotion: string; confidence: number }[];
      const parsed = safeParse<ModelOut>(content) ?? [];

      // Map to updates, validate labels
      for (const out of parsed) {
        const row = batch[out.i];
        if (!row) continue;
        const label = String(out.emotion || "").toLowerCase().trim();
        const ok = (EMOTION_LABELS as readonly string[]).includes(label);
        const conf = Math.max(0, Math.min(1, Number(out.confidence ?? 0)));
        if (ok) {
          updates.push({
            id: row.id,
            emotion: label as Emotion,
            emotion_confidence: conf,
            emotion_model: "gpt-4o-mini",
          });
        }
      }
    }

    // Optional: only write confident labels (e.g., >= 0.55)
    const THRESHOLD = 0.55;
    const confident = updates.filter((u) => u.emotion_confidence >= THRESHOLD);

    // 3) Persist results
    if (confident.length) {
      const { error: upErr } = await supabase
        .from("quotes")
        .upsert(confident, { onConflict: "id" });
      if (upErr) return res.status(500).json({ error: upErr.message });
    }

    return res.json({
      requested: rows.length,
      labeled_total: updates.length,
      labeled_confident: confident.length,
      threshold: THRESHOLD,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
