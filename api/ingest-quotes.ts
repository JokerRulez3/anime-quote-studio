
import { createClient } from "@supabase/supabase-js";

type YurippeItem = {
  _id: string;
  character: string;
  show: string;
  quote: string;
};

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const INGEST_KEY = process.env.INGEST_KEY!;

const supabase = createClient(SUPABASE_URL!, SERVICE_KEY);

const clean = (s?: string) =>
  (s ?? "")
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    if (!INGEST_KEY || req.headers["x-ingest-key"] !== INGEST_KEY)
      return res.status(401).json({ error: "Unauthorized" });

    const src = "https://yurippe.vercel.app/api/quotes";
    const r = await fetch(src, { headers: { "cache-control": "no-cache" } });
    if (!r.ok) {
      return res.status(502).json({ error: `Upstream ${r.status} ${r.statusText}` });
    }
    const arr = (await r.json()) as YurippeItem[] | unknown;

    if (!Array.isArray(arr)) {
      return res.status(500).json({ error: "Unexpected response format" });
    }

    // Map & clean
    const batch = arr
      .map((it) => ({
        quote_text: clean((it as YurippeItem).quote),
        character: clean((it as YurippeItem).character),
        anime: clean((it as YurippeItem).show),
        source: "yurippe",
        source_id: (it as YurippeItem)._id,
        source_url: src,
      }))
      .filter((r) => r.quote_text && r.character && r.anime);

    // Optional: drop obvious duplicates inside this payload
    const seen = new Set<string>();
    const deduped = batch.filter((b) => {
      const key = `${b.quote_text}::${b.character}::${b.anime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Insert in chunks to avoid payload limits
    const chunk = 500;
    let inserted = 0;
    for (let i = 0; i < deduped.length; i += chunk) {
      const slice = deduped.slice(i, i + chunk);
      const { error } = await supabase.from("staging_quotes").insert(slice);
      if (error) {
        // ignore duplicate violation from staging index, but report other issues
        if (!/duplicate key/.test(error.message)) {
          console.error("staging insert error", error.message);
          return res.status(500).json({ error: error.message, inserted });
        }
      } else {
        inserted += slice.length;
      }
    }

    // Merge into normalized tables
    const { error: mergeErr } = await supabase.rpc("merge_staging_quotes");
    if (mergeErr) {
      console.error("merge error", mergeErr.message);
      return res.status(500).json({ error: mergeErr.message, inserted });
    }

    return res.status(200).json({ ok: true, staged: inserted });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
