// src/lib/quotes.ts
import { supabase } from "./supabaseClient";

// --- Types returned to the UI (match App.tsx expectations) ---
export type QuoteItem = {
  id: number;
  quote_text: string;
  episode_number: number | null;
  emotion: string | null;
  view_count: number;
  download_count: number;
  character: { name: string };
  anime: { title: string };
  created_at?: string;
};

export type Stats = { total: number; views: number; downloads: number };

// --- Auth/session ---
export async function getUserSession() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// --- Profile + favorites (ids only) ---
export async function loadUserData(userId: string) {
  const [{ data: p }, { data: favs }] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_favorites").select("quote_id").eq("user_id", userId),
  ]);

  return {
    profile: p ?? null,
    favorites: (favs ?? []).map((r) => String(r.quote_id)),
  };
}

// --- Landing stats (fast via app_stats, with fallback) ---
export async function loadStats(): Promise<Stats> {
  const { data: acc } = await supabase.from("app_stats").select("*").eq("id", 1).maybeSingle();
  if (acc) {
    return {
      total: Number(acc.total_quotes) || 0,
      views: Number(acc.total_views) || 0,
      downloads: Number(acc.total_downloads) || 0,
    };
  }
  // fallback if app_stats not present yet
  const { data: q } = await supabase.from("quotes").select("view_count,download_count", { count: "exact", head: false });
  const total = q?.length ?? 0;
  const views = q?.reduce((s, r) => s + (r.view_count || 0), 0) ?? 0;
  const downloads = q?.reduce((s, r) => s + (r.download_count || 0), 0) ?? 0;
  return { total, views, downloads };
}

// --- SEARCH (RPC FTS preferred; falls back to REST embedded select) ---
export async function searchQuotes(query: string, limit = 24): Promise<QuoteItem[]> {
  const q = (query ?? "").trim();

  // Preferred: RPC FTS (make sure you’ve created the function with args: search_text, page, page_size)
  const { data: rpc, error: rpcErr } = await supabase.rpc("search_quotes", {
    search_text: q || null,
    page: 1,
    page_size: Math.min(limit, 50),
  });

  if (!rpcErr && rpc) {
    // Map flat RPC fields -> nested shape expected by App.tsx
    return rpc.map((r: any) => ({
      id: r.id,
      quote_text: r.quote_text,
      episode_number: r.episode_number,
      emotion: r.emotion,
      view_count: r.view_count,
      download_count: r.download_count,
      character: { name: r.character_name },
      anime: { title: r.anime_title },
      created_at: r.created_at,
    })) as QuoteItem[];
  }

  // Fallback: REST with embedded select + filters on related columns
  const { data, error } = await supabase
    .from("quotes")
    .select(
      `
      id,
      quote_text,
      episode_number,
      emotion,
      view_count,
      download_count,
      created_at,
      characters!inner(name),
      anime!inner(title)
    `
    )
    .eq("status", "approved")
    .or(
      q
        ? `quote_text.ilike.*${q}*,characters.name.ilike.*${q}*,anime.title.ilike.*${q}*`
        : "true.is.true"
    )
    .limit(Math.min(limit, 50));

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    quote_text: r.quote_text,
    episode_number: r.episode_number,
    emotion: r.emotion,
    view_count: r.view_count,
    download_count: r.download_count,
    character: { name: r.characters?.name ?? "Unknown" },
    anime: { title: r.anime?.title ?? "Unknown" },
    created_at: r.created_at,
  })) as QuoteItem[];
}

// --- RANDOM (RPC; fast, no full scan) ---
export async function randomQuote(): Promise<QuoteItem | null> {
  const { data, error } = await supabase.rpc("random_quote");
  if (error) throw new Error(error.message);
  const row = (data as any[])?.[0];
  if (!row) return null;
  return {
    id: row.id,
    quote_text: row.quote_text,
    episode_number: row.episode_number ?? null,
    emotion: row.emotion ?? null,
    view_count: row.view_count ?? 0,
    download_count: row.download_count ?? 0,
    character: { name: row.character_name },
    anime: { title: row.anime_title },
    created_at: row.created_at,
  };
}

// --- Favorite toggle ---
export async function toggleFavorite(userId: string, quoteId: string | number, current: string[]) {
  const idStr = String(quoteId);
  if (current.includes(idStr)) {
    await supabase.from("user_favorites").delete().match({ user_id: userId, quote_id: quoteId });
    return current.filter((x) => x !== idStr);
  }
  await supabase.from("user_favorites").insert({ user_id: userId, quote_id: quoteId });
  return [...current, idStr];
}

// --- Atomic counters (RPC) ---
export async function incrementView(qid: number, userId?: string) {
  const { error } = await supabase.rpc("record_view", {
    p_quote_id: qid,
    p_user_id: userId ?? null,
    p_referrer: typeof document !== "undefined" ? document.referrer || null : null,
  });
  if (error) console.error("record_view:", error.message);
}

export async function incrementDownload(qid: number) {
  const { error } = await supabase.rpc("increment_download_count", { qid });
  if (error) console.error("increment_download_count:", error.message);
}

// --- Daily cap (RPC) ---
export async function getDownloadsToday(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_downloads_today", { user_id: userId });
  if (error) {
    console.error("get_downloads_today:", error.message);
    return 0;
  }
  return (data as number) ?? 0;
}
export async function bumpDownloadToday(userId: string) {
  const { error } = await supabase.rpc("bump_download", { user_id: userId });
  if (error) console.error("bump_download:", error.message);
}
export async function incrementDownloadsPerUser(userId: string, qid: number, bgName?: string, fontName?: string) {
  const { error } = await supabase.rpc("record_download", {
    p_user_id: userId,
    p_quote_id: qid,
    p_background_style: bgName ?? null, // or background.css
    p_font_style: fontName ?? null,
  });
  if (error) console.error("record_download:", error.message);
}