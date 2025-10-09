// /api/emotion-tagger.ts
import { createClient } from "@supabase/supabase-js";

/**
 * ENV (Vercel -> Project Settings -> Environment Variables)
 * - VITE_SUPABASE_URL                  (All)
 * - SUPABASE_SERVICE_ROLE_KEY          (Server only)
 * - OPENAI_API_KEY                     (Server only)
 * - INGEST_KEY                         (All) - used as x-ingest-key
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const INGEST_KEY = process.env.INGEST_KEY!;

const supabase = createClient(SUPABASE_URL!, SERVICE_KEY);

// Keep labels small & consistent with your UI
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

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}
function safeParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

async function openaiChatJSON(system: string, user: string) {
  // small retry for transient 429/5xx
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" }, // force JSON
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (r.ok) return r.json();

    // retry some errors
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 300 * (attempt + 1)));
      continue;
    }
    // hard errors
    const body = await r.text();
    throw new Error(`OpenAI ${r.status}: ${body}`);
  }
  throw new Error("OpenAI retries exhausted");
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    if (!INGEST_KEY || req.headers["x-ingest-key"] !== INGEST_KEY)
      return res.status(401).json({ error: "Unauthorized" });

    if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: "Supabase env missing" });
    if (!OPENAI_KEY) return res.status(500).json({ error: "OPENAI_API_KEY missing" });

    const limit = Math.min(
      Math.max(parseInt(String(req.query?.limit ?? "100"), 10) || 100, 1),
      200
    );

    // 1) Pull next untagged quotes
    const { data: rows, error } = await supabase
      .from("quotes")
      .select("id, quote_text")
      .is("emotion", null)
      .eq("status", "approved")
      .order("id", { ascending: true })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    if (!rows?.length) return res.json({ message: "No untagged quotes." });

    // 2) Classify in sub-batches of 20
    const subBatches = chunk(rows as QuoteRow[], 20);
    const updates: { id: number; emotion: Emotion; emotion_confidence: number; emotion_model: string }[] = [];

    for (const batch of subBatches) {
      const items = batch.map((r, i) => ({ i, id: r.id, text: r.quote_text }));

      const system = `You are an emotion classifier for short anime-style quotes.
Return STRICT JSON in this exact schema:
{ "items": [ { "i": number, "emotion": "<one of ${EMOTION_LABELS.join("|")}>", "confidence": number between 0 and 1 } ] }
Use ONLY these labels: ${EMOTION_LABELS.join(", ")}.
Pick exactly ONE primary label per quote.`;

      const user = `Classify these ${items.length} quotes:\n${JSON.stringify(items)}`;

      const json = await openaiChatJSON(system, user);
      const content: string =
        json?.choices?.[0]?.message?.content ??
        json?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
        "{}";

      type ModelOut = { items: { i: number; emotion: string; confidence: number }[] };
      const parsed = safeParse<ModelOut>(content);

      if (!parsed?.items?.length) {
        console.log("[emotion-tagger] Empty/invalid JSON. Sample:", content.slice(0, 200));
        continue;
      }

      for (const out of parsed.items) {
        const row = batch[out.i];
        if (!row) continue;
        const label = String(out.emotion || "").toLowerCase().trim();
        const valid = (EMOTION_LABELS as readonly string[]).includes(label);
        if (!valid) continue;

        updates.push({
          id: row.id,
          emotion: label as Emotion,
          emotion_confidence: clamp01(Number(out.confidence)),
          emotion_model: "gpt-4o-mini",
        });
      }
    }

    // 3) Persist via RPC (avoid bigint precision, never insert)
    const THRESHOLD = 0.55;
    const confident = updates.filter((u) => u.emotion_confidence >= THRESHOLD);

    if (confident.length) {
      const payload = confident.map((u) => ({
        id: String(u.id), // send as string; SQL casts to bigint
        emotion: u.emotion,
        confidence: u.emotion_confidence,
        model: u.emotion_model,
      }));

      const { error: rpcErr } = await supabase.rpc("bulk_update_emotions", {
        payload,
      });
      if (rpcErr) return res.status(500).json({ error: rpcErr.message });
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