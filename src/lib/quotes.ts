import { supabase } from "./supabaseClient";

/** Auth helpers */
export async function getUserSession() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

/** Profile + favorites */
export async function loadUserData(userId: string) {
  const [{ data: profiles }, { data: favs }] = await Promise.all([
    supabase.from("user_profiles").select("*").eq("id", userId).limit(1),
    supabase.from("user_favorites").select("quote_id").eq("user_id", userId),
  ]);
  const profile = profiles?.[0] ?? null;
  const favorites = (favs ?? []).map((f) => f.quote_id);
  return { profile, favorites };
}

/** Stats */
export async function loadStats() {
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id,view_count,download_count");
  const total = quotes?.length ?? 0;
  const downloads =
    quotes?.reduce((s, q: any) => s + (q.download_count ?? 0), 0) ?? 0;
  const views =
    quotes?.reduce((s, q: any) => s + (q.view_count ?? 0), 0) ?? 0;
  return { total, downloads, views };
}

/** Search (tries RPC search_quotes, falls back to ilike filter) */
export async function searchQuotes(q: string | null, limit = 24) {
  if (q && q.trim().length > 0) {
    // Try RPC-based ranked search first
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "search_quotes",
      { q, page: 1, page_size: limit }
    );
    if (!rpcErr && rpcData) return normalizeQuotes(rpcData);
  }

  // Fallback: simple list or fuzzy ilike if q present
  if (q && q.trim().length > 0) {
    const { data } = await supabase
      .from("quotes")
      .select(
        "id, quote_text, episode_number, emotion, view_count, download_count, character, anime"
      )
      .or(
        `quote_text.ilike.%${q}%,character.ilike.%${q}%,anime.ilike.%${q}%`
      )
      .limit(limit);
    return normalizeQuotes(data ?? []);
  }

  const { data } = await supabase
    .from("quotes")
    .select(
      "id, quote_text, episode_number, emotion, view_count, download_count, character, anime"
    )
    .limit(limit);
  return normalizeQuotes(data ?? []);
}

/** Random (tries RPC, falls back to client-side pick) */
export async function randomQuote() {
  const { data: rpc, error: rpcErr } = await supabase.rpc("random_quote");
  if (!rpcErr && rpc && rpc.length > 0) return normalizeQuotes(rpc)[0] ?? null;

  const { data } = await supabase
    .from("quotes")
    .select("id, quote_text, episode_number, emotion, character, anime")
    .limit(100);
  if (!data || data.length === 0) return null;
  return normalizeQuotes([
    data[Math.floor(Math.random() * data.length)],
  ])[0];
}

/** Favorites */
export async function toggleFavorite(userId: string, quoteId: string, current: string[]) {
  const isFav = current.includes(quoteId);
  if (isFav) {
    await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("quote_id", quoteId);
    return current.filter((id) => id !== quoteId);
  } else {
    await supabase
      .from("user_favorites")
      .insert({ user_id: userId, quote_id: quoteId });
    return [...current, quoteId];
  }
}

/** Counters (tries RPC atomic increments, falls back to optimistic update) */
export async function incrementView(quoteId: string) {
  const { error } = await supabase.rpc("increment_view_count", { qid: quoteId });
  if (!error) return;
  // Fallback: non-atomic patch
  const { data } = await supabase
    .from("quotes")
    .select("view_count")
    .eq("id", quoteId)
    .limit(1)
    .maybeSingle();
  const next = (data?.view_count ?? 0) + 1;
  await supabase.from("quotes").update({ view_count: next }).eq("id", quoteId);
}

export async function incrementDownload(quoteId: string) {
  const { error } = await supabase.rpc("increment_download_count", { qid: quoteId });
  if (!error) return;
  const { data } = await supabase
    .from("quotes")
    .select("download_count")
    .eq("id", quoteId)
    .limit(1)
    .maybeSingle();
  const next = (data?.download_count ?? 0) + 1;
  await supabase
    .from("quotes")
    .update({ download_count: next })
    .eq("id", quoteId);
}

/** Daily download limit helpers (works if you create the table/RPCs; else falls back to user_profiles.downloads_today) */
export async function getDownloadsToday(userId: string) {
  const { data, error } = await supabase.rpc("get_downloads_today", { user_id: userId });
  if (!error) return data ?? 0;

  // Fallback to user_profiles column if present
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("downloads_today")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();
  return profile?.downloads_today ?? 0;
}

export async function bumpDownloadToday(userId: string) {
  const { error } = await supabase.rpc("bump_download", { user_id: userId });
  if (!error) return;

  // Fallback to user_profiles column
  const { data: p } = await supabase
    .from("user_profiles")
    .select("downloads_today")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();
  const next = (p?.downloads_today ?? 0) + 1;
  await supabase.from("user_profiles").update({ downloads_today: next }).eq("id", userId);
}

/** Normalizer: keep UI stable (character/anime as simple text) */
export function normalizeQuotes(rows: any[]) {
  return (rows ?? []).map((q) => ({
    ...q,
    character: { name: q.character ?? "Unknown" },
    anime: { title: q.anime ?? "Unknown" },
  }));
}
