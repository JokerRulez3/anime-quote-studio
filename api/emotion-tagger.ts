import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const INGEST_KEY = process.env.INGEST_KEY!;

const supabase = createClient(SUPABASE_URL!, SERVICE_KEY);

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

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function safeParse<T>(s: string): T | null {
  try { return JSON.parse(s) as T; } catch { return null; }
}

async function openaiChatJSON(system: string, user: string) {
  // tiny retry wrapper
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" }, // <-- force JSON
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (r.ok) return r.json();
    if (r.status >= 500 || r.status === 429) await new Promise(res => setTimeout(res, 300 * (attempt + 1)));
    else {
      const body = await r.text();
      throw new Error(`OpenAI ${r.status}: ${body}`);
    }
  }
  throw new Error("OpenAI retries exhausted");
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    if (!INGEST_KEY || req.headers["x-ingest-key"] !== INGEST_KEY)
      return res.status(401).json({ error: "Unauthorized" });

    // sanity: envs present
    if (!OPENAI_KEY) return res.status(500).json({ error: "OPENAI_API_KEY missing" });
    if (!SERVICE_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" });

    const limit = Math.min(Math.max(parseInt(String(req.query?.limit ?? "100"), 10) || 100, 1), 200);

    // 1) Fetch untagged quotes
    const { data: rows, error } = await supabase
      .from("quotes")
      .select("id, quote_text")
      .is("emotion", null)
      .eq("status", "approved")
      .order("id", { ascending: true })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    if (!rows?.length) return res.json({ message: "No untagged quotes." });

    const subBatches = chunk(rows, 20);
    const updates: { id: number; emotion: Emotion; emotion_confidence: number; emotion_model: string }[] = [];

    for (const batch of subBatches) {
      const items = batch.map((r, i) => ({ i, id: r.id, text: r.quote_text }));

      const system = `You are an emotion classifier for short anime-style quotes.
Return STRICT JSON with this exact shape:
{ "items": [ { "i": number, "emotion": "<one of ${EMOTION_LABELS.join("|")}>", "confidence": number between 0 and 1 } ] }
- Use ONLY these labels: ${EMOTION_LABELS.join(", ")}.
- Pick exactly ONE primary label per quote.`;

      const user = `Classify the following ${items.length} quotes:
${JSON.stringify(items)}`;

      const json = await openaiChatJSON(system, user);
      const content: string =
        json?.choices?.[0]?.message?.content ??
        json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
        "{}";

      type ModelOut = { items: { i: number; emotion: string; confidence: number }[] };
      const parsed = safeParse<ModelOut>(content);

      if (!parsed?.items?.length) {
        console.log("[emotion-tagger] Empty/invalid JSON from model. Sample:", content.slice(0, 200));
        continue;
      }

      for (const out of parsed.items) {
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

    const THRESHOLD = 0.55;
    const confident = updates.filter(u => u.emotion_confidence >= THRESHOLD);

    if (confident.length) {
      const { error: upErr } = await supabase.from("quotes").upsert(confident, { onConflict: "id" });
      if (upErr) return res.status(500).json({ error: upErr.message });
    }

    return res.json({
      requested: rows.length,
      labeled_total: updates.length,
      labeled_confident: confident.length,
      threshold: THRESHOLD,
    });
  } catch (e: any) {
    console.error("[emotion-tagger] error:", e?.message);
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}