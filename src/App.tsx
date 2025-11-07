// App.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Download,
  Sparkles,
  Twitter,
  Instagram,
  Heart,
  Shuffle,
  Loader,
  Crown,
  User,
  LogOut,
  Lock,
  Zap,
} from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import {
  getUserSession,
  loadUserData,
  loadStats,
  searchQuotes,
  randomQuote,
  toggleFavorite as toggleFav,
  incrementView,
  getDownloadsToday,
  incrementDownloadsPerUser,
  getPlanLimits,
} from "./lib/quotes";

/* ==================== CONFIG ==================== */

const BACKGROUNDS = [
  { id: 1, name: "Sunset", css: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" },
  { id: 2, name: "Ocean", css: "linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)" },
  { id: 3, name: "Blossom", css: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)" },
  { id: 4, name: "Night", css: "linear-gradient(135deg, #020817 0%, #111827 100%)" },
  { id: 5, name: "Gold", css: "linear-gradient(135deg, #facc15 0%, #f97316 100%)" },
  { id: 6, name: "Emerald", css: "linear-gradient(135deg, #065f46 0%, #22c55e 100%)" },
  { id: 7, name: "Fire", css: "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)" },
  { id: 8, name: "Aurora", css: "linear-gradient(135deg, #4f46e5 0%, #a855f7 50%, #ec4899 100%)" },
];

const FONTS = [
  { id: 1, name: "Classic", css: "Georgia, serif" },
  {
    id: 2,
    name: "Modern",
    css: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  { id: 3, name: "Bold", css: "Impact, system-ui, sans-serif" },
];

const EMOTIONS = ["inspiring", "motivational", "sad", "wholesome", "romantic", "dark", "funny"];

/* ==================== MAIN ==================== */

export default function App() {
  const [view, setView] = useState<"landing" | "search" | "generator">("landing");
  const [authView, setAuthView] = useState<"signin" | "signup" | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [stats, setStats] = useState({ total: 0, downloads: 0, views: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [font, setFont] = useState(FONTS[1]); // modern default

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [downloadLimitMsg, setDownloadLimitMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Plan state
  const [planKey, setPlanKey] = useState<"free" | "basic" | "pro">("free");
  const [dailyLimit, setDailyLimit] = useState<number>(3);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(10);
  const [watermarkLevel, setWatermarkLevel] = useState<"full" | "small" | "none">("full");

  const isPro = planKey === "pro";
  const isBasic = planKey === "basic";
  const isPremium = isPro; // alias for old checks

  // Gating
  const allowedBgCount = isPro ? BACKGROUNDS.length : isBasic ? 4 : 2;
  const allowedFontCount = isPro ? FONTS.length : isBasic ? 2 : 1;
  const isBgAllowed = (bgId: number) => bgId <= allowedBgCount;
  const isFontAllowed = (fontId: number) => fontId <= allowedFontCount;

  /* ==================== INIT ==================== */

  useEffect(() => {
    (async () => {
      const u = await getUserSession();
      if (u) {
        setUser(u);
        const { profile: p, favorites: f } = await loadUserData(u.id);
        setProfile(p);
        setFavorites(f);
        const plan = getPlanLimits(p);
        setPlanKey((plan.key as any) || "free");
        setDailyLimit(plan.daily as number);
        setMonthlyLimit(plan.monthly as number);
        setWatermarkLevel(plan.watermark as any);
      }
      const s = await loadStats();
      setStats(s);
    })();
  }, []);

  /* ==================== AUTH ==================== */

  async function handleAuth(email: string, password: string, isSignUp: boolean) {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      setUser(u);
      const { profile: p, favorites: f } = await loadUserData(u!.id);
      setProfile(p);
      setFavorites(f);
      const plan = getPlanLimits(p);
      setPlanKey((plan.key as any) || "free");
      setDailyLimit(plan.daily as number);
      setMonthlyLimit(plan.monthly as number);
      setWatermarkLevel(plan.watermark as any);
      setAuthView(null);
    } catch (e: any) {
      setAuthError(e.message ?? "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSignOut() {
    supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setView("landing");
  }

  /* ==================== SEARCH HELPERS ==================== */

  async function runSearch(q: string) {
    setIsLoading(true);
    setView("search");
    const rows = await searchQuotes(q, 24);
    setSearchResults(rows || []);
    setIsLoading(false);
  }

  async function handleSearch() {
    await runSearch(searchQuery);
  }

  async function handleRandom() {
    setIsLoading(true);
    const q = await randomQuote();
    if (q) {
      setSelectedQuote(q);
      setView("generator");
      await incrementView(q.id, user?.id);
      const s = await loadStats();
      setStats(s);
    }
    setIsLoading(false);
  }

  async function selectQuote(q: any) {
    setSelectedQuote(q);
    setView("generator");
    await incrementView(q.id, user?.id);
    const s = await loadStats();
    setStats(s);
  }

  async function toggleFavorite(quoteId: string) {
    if (!user) return setAuthView("signin");
    const next = await toggleFav(user.id, quoteId, favorites);
    setFavorites(next);
  }

  /* ==================== WATERMARK ==================== */

  function renderWatermark(ctx: CanvasRenderingContext2D) {
    if (watermarkLevel === "none") return;

    if (watermarkLevel === "small") {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.font = "bold 18px Inter";
      ctx.fillStyle = "white";
      ctx.textAlign = "right";
      ctx.fillText("AnimeQuoteStudio.com", 1180, 610);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.translate(600, 315);
    ctx.rotate(-Math.PI / 6);
    ctx.font = "bold 64px Inter";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("AnimeQuoteStudio.com", 0, 0);
    ctx.restore();
  }

  /* ==================== DOWNLOAD ==================== */

  async function downloadImage() {
    if (!user) return setAuthView("signin");
    if (!selectedQuote) return;

    const todayCount = await getDownloadsToday(user.id);
    if (Number.isFinite(dailyLimit) && todayCount >= dailyLimit) {
      setDownloadLimitMsg(
        isBasic
          ? "Daily limit reached (20/day). Upgrade to Pro for unlimited!"
          : "Daily limit reached (3/day). Upgrade to Basic/Pro!"
      );
      setShowPricing(true);
      return;
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 1200;
    canvas.height = 630;

    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    const hexes = background.css.match(/#[0-9a-f]{6}/gi) ?? ["#4f46e5", "#6366f1"];
    grad.addColorStop(0, hexes[0]);
    grad.addColorStop(1, hexes[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 630);

    const charName = getCharacterName(selectedQuote);
    const animeTitle = getAnimeTitle(selectedQuote);

    // Quote text
    const marginX = 120;
    const maxWidth = 1200 - marginX * 2;
    let size = 56;
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(15,23,42,0.9)";
    ctx.shadowBlur = 14;

    function linesFor(text: string, fontSize: number) {
      ctx.font = `600 ${fontSize}px ${font.css}`;
      const words = text.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth) {
          if (line) lines.push(line);
          line = w;
        } else line = test;
      }
      if (line) lines.push(line);
      return lines;
    }

    let lines = linesFor(`"${selectedQuote.quote_text}"`, size);
    while (lines.length > 4 && size > 26) {
      size -= 2;
      lines = linesFor(`"${selectedQuote.quote_text}"`, size);
    }

    const startY = 210 - ((lines.length - 1) * (size + 14)) / 2;
    lines.forEach((ln, i) => {
      ctx.font = `600 ${size}px ${font.css}`;
      ctx.fillText(ln, 600, startY + i * (size + 14));
    });

    // Attribution
    if (charName) {
      ctx.shadowBlur = 10;
      ctx.font = `600 26px Inter`;
      ctx.fillText(`— ${charName}`, 600, startY + lines.length * (size + 14) + 56);
    }
    if (animeTitle) {
      ctx.font = `400 22px Inter`;
      ctx.fillText(
        animeTitle,
        600,
        startY + lines.length * (size + 14) + 92
      );
    }

    renderWatermark(ctx);

    const link = document.createElement("a");
    link.download = `quote-${selectedQuote.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    await incrementDownloadsPerUser(user.id, selectedQuote.id, background.name, font.name);
    const s = await loadStats();
    setStats(s);
  }

  /* ==================== AUTH VIEW ==================== */

  if (authView) {
    const isSignUp = authView === "signup";
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl shadow-2xl p-8 max-w-md w-full backdrop-blur">
          <h2 className="text-3xl font-semibold text-slate-50 text-center mb-6">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          {authError && (
            <div className="bg-red-900/40 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
              {authError}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget as any;
              handleAuth(form.email.value, form.password.value, isSignUp);
            }}
          >
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="w-full px-4 py-3 mb-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Password"
              className="w-full px-4 py-3 mb-5 bg-slate-900 border border-slate-700 rounded-lg text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 transition-colors text-slate-950 py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {isLoading ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>
          <button
            onClick={() => {
              setAuthView(isSignUp ? "signin" : "signup");
              setAuthError(null);
            }}
            className="w-full mt-4 text-indigo-400 text-sm"
          >
            {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
          </button>
          <button
            onClick={() => setAuthView(null)}
            className="w-full mt-2 text-slate-500 text-xs"
          >
            ← Back to site
          </button>
        </div>
      </div>
    );
  }

  /* ==================== PRICING VIEW ==================== */

  if (showPricing) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <header className="border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <span className="font-semibold tracking-tight">Anime Quote Studio</span>
            </div>
            <button
              onClick={() => setShowPricing(false)}
              className="text-xs px-3 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              ← Back
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-semibold tracking-tight mb-2">Choose your flow</h1>
            <p className="text-sm text-slate-400">
              Start free. Upgrade only when you’re using it regularly.
            </p>
            {downloadLimitMsg && (
              <div className="mt-4 inline-block px-4 py-2 rounded-lg bg-amber-900/40 border border-amber-500 text-amber-200 text-xs">
                {downloadLimitMsg}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Free</h2>
                <p className="text-xs text-slate-500 mb-4">For trying things out.</p>
                <div className="text-3xl font-semibold mb-4">
                  $0<span className="text-xs text-slate-500">/mo</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 mb-4">
                  <li>3 downloads/day or 10/month</li>
                  <li>2 curated backgrounds</li>
                  <li>1 clean font</li>
                  <li>Full diagonal watermark</li>
                </ul>
              </div>
              <div className="text-xs text-slate-500">
                {planKey === "free" ? "Current plan" : "Included for everyone"}
              </div>
            </div>

            {/* Basic */}
            <div className="bg-slate-900 border border-indigo-500/60 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">Basic</h2>
                <p className="text-xs text-slate-500 mb-4">For active social posting.</p>
                <div className="text-3xl font-semibold mb-1">
                  $2.99<span className="text-xs text-slate-500">/mo</span>
                </div>
                <p className="text-[10px] text-slate-500 mb-4">or $24/year</p>
                <ul className="space-y-2 text-xs text-slate-300 mb-4">
                  <li>20 downloads/day</li>
                  <li>4 premium backgrounds</li>
                  <li>2 fonts</li>
                  <li>Minimal corner watermark</li>
                </ul>
              </div>
              <button className="w-full mt-2 text-xs py-2 rounded-lg bg-indigo-500 text-slate-950 font-semibold hover:bg-indigo-400">
                Upgrade to Basic
              </button>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-slate-950 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_top,_#fff,_transparent_60%)] pointer-events-none" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/10 text-[10px] font-semibold mb-3">
                  <Crown size={14} /> Best for creators
                </div>
                <h2 className="text-lg font-semibold mb-1">Pro</h2>
                <p className="text-xs text-slate-900/80 mb-4">For serious pages & shops.</p>
                <div className="text-3xl font-semibold mb-1">
                  $4.99<span className="text-xs text-slate-900/80">/mo</span>
                </div>
                <p className="text-[10px] text-slate-900/80 mb-4">or $39/year</p>
                <ul className="space-y-2 text-xs text-slate-900 mb-4">
                  <li className="flex items-center gap-2">
                    <Zap size={14} /> Unlimited downloads
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles size={14} /> All 8+ backgrounds & all fonts
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown size={14} /> No watermark
                  </li>
                  <li className="flex items-center gap-2">Priority support & early features</li>
                </ul>
              </div>
              <button className="relative w-full mt-2 text-xs py-2 rounded-lg bg-slate-950 text-slate-50 font-semibold hover:bg-slate-900">
                Upgrade to Pro
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ==================== LANDING ==================== */

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <span className="font-semibold tracking-tight">Anime Quote Studio</span>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div className="px-3 py-2 rounded-lg bg-slate-900 flex items-center gap-2 text-xs">
                    {isPro ? (
                      <Crown size={16} className="text-yellow-300" />
                    ) : (
                      <User size={16} className="text-slate-400" />
                    )}
                    <span className="capitalize">{planKey}</span>
                    <span className="text-slate-500">•</span>
                    <span>{user.email?.split("@")[0]}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-slate-300 text-xs hover:bg-slate-800"
                  >
                    <LogOut size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAuthView("signin")}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-slate-200 text-xs"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthView("signup")}
                    className="px-3 py-2 rounded-lg bg-indigo-500 text-slate-950 text-xs font-semibold"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 pt-10 pb-16">
          <section className="text-center mb-14">
            <p className="text-xs text-indigo-400 mb-2">AI-assisted anime quote visuals</p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-3">
              Create & share anime quotes in seconds
            </h1>
            <p className="text-sm text-slate-400 mb-3">
              Search by character, anime, or emotion. Auto-styled. Download-ready for socials.
            </p>
            <p className="text-[11px] text-slate-500 mb-6">
              {stats.total}+ quotes • {stats.views} views • {stats.downloads} downloads
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              <button
                onClick={() => setView("search")}
                className="px-6 py-3 rounded-full bg-slate-50 text-slate-900 text-sm font-semibold flex items-center gap-2 shadow-sm hover:bg-slate-200"
              >
                <Search size={16} /> Start
              </button>
              <button
                onClick={handleRandom}
                disabled={isLoading}
                className="px-6 py-3 rounded-full bg-indigo-500 text-slate-950 text-sm font-semibold flex items-center gap-2 hover:bg-indigo-400"
              >
                {isLoading ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Shuffle size={16} />
                )}
                Random
              </button>
              {(!user || !isPro) && (
                <button
                  onClick={() => setShowPricing(true)}
                  className="px-6 py-3 rounded-full bg-yellow-400 text-slate-950 text-sm font-semibold flex items-center gap-2 hover:bg-yellow-300"
                >
                  <Crown size={16} /> Upgrade
                </button>
              )}
            </div>
          </section>

          <section className="grid md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2">
              <Search size={22} className="text-indigo-400" />
              <h3 className="font-semibold text-slate-100">Search</h3>
              <p className="text-slate-400">
                Find quotes by anime, character, or emotion like
                {" "}
                <span className="text-slate-200">“motivational”</span>.
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2">
              <Sparkles size={22} className="text-indigo-400" />
              <h3 className="font-semibold text-slate-100">Customize</h3>
              <p className="text-slate-400">
                Clean gradients & fonts, with more styles unlocked as you upgrade.
              </p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2">
              <Download size={22} className="text-indigo-400" />
              <h3 className="font-semibold text-slate-100">Share</h3>
              <p className="text-slate-400">
                Export-ready images tuned for X, IG, TikTok and more.
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  /* ==================== SEARCH VIEW ==================== */

  if (view === "search") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <header className="border-b border-slate-900/80 bg-slate-950/90 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setView("landing")}
            >
              <span className="text-lg">✨</span>
              <span className="font-semibold text-sm">Anime Quote Studio</span>
            </div>
            <button
              onClick={handleRandom}
              disabled={isLoading}
              className="px-3 py-2 rounded-lg bg-slate-900 text-slate-100 text-xs flex items-center gap-2 hover:bg-slate-800"
            >
              {isLoading ? (
                <Loader size={14} className="animate-spin" />
              ) : (
                <Shuffle size={14} />
              )}
              Random
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-4">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search by anime, character, quote text, or emotion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-5 py-3 rounded-xl bg-indigo-500 text-slate-950 text-sm font-semibold flex items-center justify-center hover:bg-indigo-400 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <Search size={18} />
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
              {EMOTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setSearchQuery(e);
                    runSearch(e);
                  }}
                  className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:text-indigo-300 transition"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader className="animate-spin mx-auto mb-3 text-indigo-500" size={32} />
              <p className="text-slate-500 text-sm">Searching quotes...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-sm mb-4">
                Start with a character, anime title, or an emotion keyword.
              </p>
              <button
                onClick={() => runSearch("")}
                className="px-5 py-2 rounded-lg bg-slate-900 text-slate-100 text-xs hover:bg-slate-800"
              >
                Show all approved quotes
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {searchResults.map((q) => {
                const charName = getCharacterName(q);
                const animeTitle = getAnimeTitle(q);
                return (
                  <article
                    key={q.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2 hover:border-indigo-500/70 hover:-translate-y-0.5 hover:shadow-xl transition cursor-pointer"
                    onClick={() => selectQuote(q)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <p className="text-sm text-slate-100 leading-relaxed">
                        “{q.quote_text}”
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(String(q.id));
                        }}
                        className={
                          favorites.includes(String(q.id))
                            ? "text-rose-400"
                            : "text-slate-500 hover:text-rose-400"
                        }
                      >
                        <Heart
                          size={18}
                          fill={
                            favorites.includes(String(q.id))
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <div>
                        {charName && (
                          <span className="text-indigo-300 font-medium">
                            {charName}
                          </span>
                        )}
                        {animeTitle && (
                          <>
                            {charName && <span className="text-slate-500"> • </span>}
                            <span className="text-slate-500">
                              {animeTitle}
                            </span>
                          </>
                        )}
                        {q.episode_number && (
                          <span className="text-slate-600">
                            {" "}
                            • Ep {q.episode_number}
                          </span>
                        )}
                      </div>
                      {q.emotion && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[9px] text-slate-400">
                          {q.emotion}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }

  /* ==================== GENERATOR VIEW ==================== */

  const genChar = getCharacterName(selectedQuote);
  const genAnime = getAnimeTitle(selectedQuote);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-900/80 bg-slate-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setView("landing")}
          >
            <span className="text-lg">✨</span>
            <span className="font-semibold text-sm">Anime Quote Studio</span>
          </div>
          <button
            onClick={() => setView("search")}
            className="px-3 py-2 rounded-lg bg-slate-900 text-slate-100 text-xs hover:bg-slate-800"
          >
            ← Back to search
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Preview */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Preview</h2>
            <div
              className="rounded-2xl shadow-2xl aspect-video flex items-center justify-center p-8 border border-slate-800 bg-slate-900 overflow-hidden"
              style={{ background: background.css }}
            >
              <div className="text-center max-w-xl mx-auto">
                <p
                  className="text-white text-2xl md:text-3xl font-semibold mb-5 leading-relaxed drop-shadow-[0_8px_24px_rgba(15,23,42,0.9)]"
                  style={{ fontFamily: font.css }}
                >
                  {selectedQuote
                    ? `“${selectedQuote.quote_text}”`
                    : "Pick a quote from search or tap Random to start."}
                </p>
                {selectedQuote && (
                  <>
                    {genChar && (
                      <p className="text-sm md:text-base text-slate-100 font-semibold drop-shadow">
                        — {genChar}
                      </p>
                    )}
                    {genAnime && (
                      <p className="text-xs md:text-sm text-slate-200/80 drop-shadow">
                        {genAnime}
                        {selectedQuote.episode_number
                          ? ` • Ep ${selectedQuote.episode_number}`
                          : ""}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </section>

          {/* Controls */}
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Customize</h2>

            {/* Backgrounds */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-200">Background</span>
                <span className="text-[9px] text-slate-500">
                  {allowedBgCount} / {BACKGROUNDS.length} unlocked
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() =>
                      !isBgAllowed(bg.id)
                        ? setShowPricing(true)
                        : setBackground(bg)
                    }
                    className={`h-12 rounded-xl border text-[9px] text-slate-50 flex items-end justify-start px-1 pb-1 relative overflow-hidden transition ${
                      background.id === bg.id
                        ? "border-indigo-400 ring-1 ring-indigo-400/40"
                        : "border-slate-800 hover:border-slate-600"
                    }`}
                    style={{ background: bg.css }}
                  >
                    <span className="backdrop-blur-sm bg-slate-950/30 px-1 rounded">
                      {bg.name}
                    </span>
                    {!isBgAllowed(bg.id) && (
                      <div className="absolute inset-0 bg-slate-950/65 flex items-center justify-center">
                        <Lock size={14} className="text-yellow-300" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {BACKGROUNDS.length > allowedBgCount && (
                <p className="mt-2 text-[9px] text-slate-500">
                  Unlock more backgrounds with Basic/Pro.
                </p>
              )}
            </div>

            {/* Fonts */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-200">Font</span>
                <span className="text-[9px] text-slate-500">
                  {allowedFontCount} / {FONTS.length} unlocked
                </span>
              </div>
              <div className="flex gap-2">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() =>
                      !isFontAllowed(f.id) ? setShowPricing(true) : setFont(f)
                    }
                    className={`flex-1 py-2 rounded-xl border text-xs transition relative ${
                      font.id === f.id
                        ? "border-indigo-400 bg-slate-900"
                        : "border-slate-800 bg-slate-950 hover:border-slate-600"
                    }`}
                    style={{ fontFamily: f.css }}
                  >
                    {f.name}
                    {!isFontAllowed(f.id) && (
                      <Lock
                        size={12}
                        className="absolute top-1.5 right-1.5 text-yellow-400"
                      />
                    )}
                  </button>
                ))}
              </div>
              {FONTS.length > allowedFontCount && (
                <p className="mt-2 text-[9px] text-slate-500">
                  Unlock all fonts on Pro.
                </p>
              )}
            </div>

            <button
              onClick={downloadImage}
              className="w-full py-3 rounded-xl bg-indigo-500 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-400 mb-3"
            >
              <Download size={18} /> Download PNG
            </button>

            {user && !isPro && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-amber-900/30 border border-amber-700 text-[9px] text-amber-200 text-center">
                {isBasic
                  ? "20 downloads/day on Basic."
                  : "Free plan: 3 downloads/day or 10/month."}{" "}
                <button
                  onClick={() => setShowPricing(true)}
                  className="underline font-semibold"
                >
                  Upgrade for more.
                </button>
              </div>
            )}

            <div className="flex gap-2 mt-1">
              <button className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800">
                <Twitter size={14} /> Share on X
              </button>
              <button className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800">
                <Instagram size={14} /> Share on IG
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ==================== UTILS ==================== */

function awaitLabelDaily(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "Unlimited";
  return `${n}/day`;
}

/**
 * Safely get character name from either:
 * - { character: { name } }
 * - { character_name }
 */
function getCharacterName(q: any): string {
  if (!q) return "";
  return (
    q?.character?.name ??
    q?.character_name ??
    ""
  );
}

/**
 * Safely get anime title from either:
 * - { anime: { title } }
 * - { anime_title }
 */
function getAnimeTitle(q: any): string {
  if (!q) return "";
  return (
    q?.anime?.title ??
    q?.anime_title ??
    ""
  );
}
