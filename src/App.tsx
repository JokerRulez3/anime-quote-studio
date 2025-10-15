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
  { id: 1, name: "Sunset", css: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: 2, name: "Ocean", css: "linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)" },
  { id: 3, name: "Blossom", css: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)" },
  { id: 4, name: "Night", css: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)" },
  { id: 5, name: "Gold", css: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: 6, name: "Emerald", css: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)" },
  { id: 7, name: "Fire", css: "linear-gradient(135deg, #FF512F 0%, #F09819 100%)" },
  { id: 8, name: "Aurora", css: "linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)" },
];

const FONTS = [
  { id: 1, name: "Classic", css: "Georgia, serif" },
  { id: 2, name: "Modern", css: "Inter, sans-serif" },
  { id: 3, name: "Bold", css: "Impact, sans-serif" },
];

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
  const [font, setFont] = useState(FONTS[0]);

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [downloadLimitMsg, setDownloadLimitMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // === Plan state ===
  const [planKey, setPlanKey] = useState<"free" | "basic" | "pro">("free");
  const [dailyLimit, setDailyLimit] = useState<number>(3);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(10);
  const [watermarkLevel, setWatermarkLevel] = useState<"full" | "small" | "none">("full");

  const isPro = planKey === "pro";
  const isBasic = planKey === "basic";
  const isPremium = isPro; // backward-compat alias

  // Allowed options per tier
  const allowedBgCount = isPro ? BACKGROUNDS.length : isBasic ? 4 : 2;
  const allowedFontCount = isPro ? FONTS.length : isBasic ? 2 : 1;
  const gatedBackgrounds = BACKGROUNDS.slice(0, allowedBgCount);
  const gatedFonts = FONTS.slice(0, allowedFontCount);
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

  /* ==================== SEARCH / RANDOM / SELECT ==================== */

  async function handleSearch() {
    setIsLoading(true);
    setView("search");
    const rows = await searchQuotes(searchQuery, 24);
    setSearchResults(rows);
    setIsLoading(false);
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

  /* ==================== WATERMARK RENDERER ==================== */

  function renderWatermark(ctx: CanvasRenderingContext2D) {
    if (watermarkLevel === "none") return;

    if (watermarkLevel === "small") {
      // small bottom-right
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.font = "bold 18px Inter";
      ctx.fillStyle = "white";
      ctx.textAlign = "right";
      ctx.fillText("AnimeQuoteStudio.com", 1180, 610);
      ctx.restore();
      return;
    }

    // full diagonal (free)
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.translate(600, 315);
    ctx.rotate(-Math.PI / 6);
    ctx.font = "bold 72px Inter";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("AnimeQuoteStudio.com", 0, 0);
    ctx.restore();
  }

  /* ==================== DOWNLOAD ==================== */

  async function downloadImage() {
    if (!user) return setAuthView("signin");

    // per-plan daily limit check (server still tracks via your RPC)
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

    // Background
    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    const hexes = background.css.match(/#[0-9a-f]{6}/gi) ?? ["#667eea", "#764ba2"];
    grad.addColorStop(0, hexes[0]);
    grad.addColorStop(1, hexes[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 630);

    // Quote text with dynamic sizing
    const marginX = 120;
    const maxWidth = 1200 - marginX * 2;
    let size = 56;
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10;

    function linesFor(text: string, fontSize: number) {
      ctx.font = `bold ${fontSize}px ${font.css}`;
      const words = text.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxWidth) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    let lines = linesFor(`"${selectedQuote.quote_text}"`, size);
    while (lines.length > 4 && size > 28) {
      size -= 2;
      lines = linesFor(`"${selectedQuote.quote_text}"`, size);
    }

    const startY = 210 - ((lines.length - 1) * (size + 12)) / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, 600, startY + i * (size + 12)));

    // Attribution
    ctx.font = `bold 28px Inter`;
    ctx.fillText(
      `— ${selectedQuote.character.name}`,
      600,
      startY + lines.length * (size + 12) + 60
    );
    ctx.font = `24px Inter`;
    ctx.fillText(
      `${selectedQuote.anime.title}`,
      600,
      startY + lines.length * (size + 12) + 100
    );

    // Watermark by plan
    renderWatermark(ctx);

    // Export
    const link = document.createElement("a");
    link.download = `quote-${selectedQuote.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    // Record download in DB (your existing RPC)
    await incrementDownloadsPerUser(user.id, selectedQuote.id, background.name, font.name);

    // Refresh stats
    const s = await loadStats();
    setStats(s);
  }

  /* ==================== VIEWS ==================== */

  // ---------- Auth View ----------
  if (authView) {
    const isSignUp = authView === "signup";
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-center mb-6">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
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
              placeholder="your@email.com"
              className="w-full px-4 py-3 mb-4 border-2 rounded-lg focus:border-purple-600 outline-none"
            />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Password (min 6 characters)"
              className="w-full px-4 py-3 mb-6 border-2 rounded-lg focus:border-purple-600 outline-none"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>
          <button
            onClick={() => {
              setAuthView(isSignUp ? "signin" : "signup");
              setAuthError(null);
            }}
            className="w-full mt-4 text-purple-600 hover:underline"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
          <button onClick={() => setAuthView(null)} className="w-full mt-2 text-gray-600">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ---------- Pricing View ----------
  if (showPricing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-purple-600 text-white p-4">
          <div className="container mx-auto flex justify-between">
            <h1 className="text-2xl font-bold">Anime Quote Studio</h1>
            <button
              onClick={() => setShowPricing(false)}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          <h2 className="text-5xl font-bold text-center mb-4">Choose Your Plan</h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Create stunning anime quote visuals. Upgrade anytime.
          </p>

          {downloadLimitMsg && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto mb-8 text-yellow-800">
              {downloadLimitMsg}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* FREE */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2">
              <h3 className="text-2xl font-bold mb-4">Free</h3>
              <div className="text-4xl font-bold mb-6">
                $0<span className="text-lg text-gray-600">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li>✓ 3 downloads/day (or 10/month)</li>
                <li>✓ 2 backgrounds</li>
                <li>✓ 1 font</li>
                <li>• Watermark (full)</li>
              </ul>
              <div className="text-center text-gray-600 font-semibold">
                {planKey === "free" ? "Current Plan" : ""}
              </div>
            </div>

            {/* BASIC */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2">
              <h3 className="text-2xl font-bold mb-1">Basic</h3>
              <p className="text-gray-500 mb-3">$2.99/mo or $24/yr</p>
              <ul className="space-y-3 mb-8">
                <li>✓ 20 downloads/day</li>
                <li>✓ 4 backgrounds</li>
                <li>✓ 2 fonts</li>
                <li>• Small watermark</li>
              </ul>
              <button className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700">
                Upgrade to Basic
              </button>
            </div>

            {/* PRO */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl shadow-2xl p-8 text-white relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-purple-900 px-4 py-1 rounded-full font-bold text-sm">
                BEST VALUE
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Crown size={32} />
                <h3 className="text-2xl font-bold">Pro</h3>
              </div>
              <div className="text-4xl font-bold mb-2">
                $4.99<span className="text-lg opacity-80">/mo</span>
              </div>
              <p className="text-sm opacity-80 mb-6">or $39/yr</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <Zap size={20} className="text-yellow-300" /> Unlimited downloads
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-300" /> 8+ backgrounds • All fonts
                </li>
                <li className="flex items-center gap-2">
                  <Crown size={20} className="text-yellow-300" /> No watermark • Priority support
                </li>
                <li className="flex items-center gap-2">Early access to new features</li>
              </ul>
              <button className="w-full bg-white text-purple-600 py-4 rounded-lg font-bold text-lg hover:scale-105 transition">
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Landing ----------
  if (view === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">✨ Anime Quote Studio</h1>
            <div className="flex gap-2">
              {user ? (
                <>
                  <div className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    {isPro ? <Crown size={20} className="text-yellow-300" /> : <User size={20} />}
                    <span className="capitalize">{planKey}</span> • {user.email?.split("@")[0]}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-lg"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAuthView("signin")}
                    className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthView("signup")}
                    className="bg-purple-900 text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="text-center text-white mb-12">
            <h2 className="text-6xl font-bold mb-4">Create & Share Anime Quotes</h2>
            <p className="text-2xl mb-4">Search, Customize & Download</p>
            <p className="text-lg mb-2 opacity-90">
              {stats.total}+ quotes • {stats.views} views • {stats.downloads} downloads
            </p>
            {user && (
              <p className="text-sm opacity-90">
                Usage today:{" "}
                {isPro ? "Unlimited" : `${awaitLabelDaily(dailyLimit)} (limit)`}
              </p>
            )}
            <div className="flex gap-4 justify-center flex-wrap mt-6">
              <button
                onClick={() => setView("search")}
                className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-xl hover:scale-105 transition shadow-lg"
              >
                🔍 Start
              </button>
              <button
                onClick={handleRandom}
                disabled={isLoading}
                className="bg-purple-900 text-white px-8 py-4 rounded-full font-bold text-xl hover:scale-105 transition shadow-lg flex items-center gap-2"
              >
                {isLoading ? <Loader className="animate-spin" size={24} /> : <Shuffle size={24} />} Random
              </button>
              {(!user || !isPro) && (
                <button
                  onClick={() => setShowPricing(true)}
                  className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-full font-bold text-xl hover:scale-105 transition shadow-lg flex items-center gap-2"
                >
                  <Crown size={24} /> Upgrade
                </button>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl text-white hover:scale-105 transition">
              <Search size={48} className="mb-4 mx-auto" />
              <h3 className="text-xl font-bold mb-2">{stats.total}+ Quotes</h3>
              <p>Search by anime, character, and emotion</p>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl text-white hover:scale-105 transition">
              <Sparkles size={48} className="mb-4 mx-auto" />
              <h3 className="text-xl font-bold mb-2">Customize</h3>
              <p>
                {allowedBgCount}+ backgrounds, {allowedFontCount}+ fonts
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur p-6 rounded-2xl text-white hover:scale-105 transition">
              <Download size={48} className="mb-4 mx-auto" />
              <h3 className="text-xl font-bold mb-2">Share</h3>
              <p>Perfect for social media</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Search ----------
  if (view === "search") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-purple-600 text-white p-4">
          <div className="container mx-auto flex justify-between">
            <h1 className="text-2xl font-bold cursor-pointer" onClick={() => setView("landing")}>
              Anime Quote Studio
            </h1>
            <button
              onClick={handleRandom}
              disabled={isLoading}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              {isLoading ? <Loader className="animate-spin" size={20} /> : <Shuffle size={20} />}
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto mb-8 flex gap-2">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 px-4 py-3 rounded-lg border-2 focus:border-purple-600 outline-none"
              aria-label="Search quotes"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold"
            >
              {isLoading ? <Loader className="animate-spin" size={24} /> : <Search size={24} />}
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader className="animate-spin mx-auto mb-4 text-purple-600" size={48} />
              <p className="text-gray-600">Searching...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-xl mb-4">Click search!</p>
              <button
                onClick={handleSearch}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg"
              >
                Show All
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {searchResults.map((q) => (
                <div
                  key={q.id}
                  className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition border-2 hover:border-purple-400"
                >
                  <div className="flex justify-between mb-4">
                    <p
                      className="text-xl italic flex-1 cursor-pointer"
                      onClick={() => selectQuote(q)}
                    >
                      "{q.quote_text}"
                    </p>
                    <button
                      onClick={() => toggleFavorite(String(q.id))}
                      className={favorites.includes(String(q.id)) ? "text-red-500" : "text-gray-400"}
                      aria-label="Toggle favorite"
                    >
                      <Heart
                        size={24}
                        fill={favorites.includes(String(q.id)) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                  <div className="cursor-pointer" onClick={() => selectQuote(q)}>
                    <p className="font-semibold text-purple-600">{q.character.name}</p>
                    <p className="text-sm text-gray-600">
                      {q.anime.title} {q.episode_number ? `• Ep ${q.episode_number}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- Generator ----------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-600 text-white p-4">
        <div className="container mx-auto flex justify-between">
          <h1 className="text-2xl font-bold cursor-pointer" onClick={() => setView("landing")}>
            Anime Quote Studio
          </h1>
          <button
            onClick={() => setView("search")}
            className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div>
            <h2 className="text-2xl font-bold mb-4">Preview</h2>
            <div
              className="rounded-xl shadow-2xl aspect-video flex items-center justify-center p-8"
              style={{ background: background.css }}
            >
              <div className="text-center">
                <p
                  className="text-white text-3xl font-bold mb-6 drop-shadow-lg"
                  style={{ fontFamily: font.css }}
                >
                  "{selectedQuote?.quote_text}"
                </p>
                <p className="text-white text-xl drop-shadow-lg">— {selectedQuote?.character?.name}</p>
                <p className="text-white/80 text-lg drop-shadow-lg">{selectedQuote?.anime?.title}</p>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Customize</h2>

            {/* Backgrounds with gating */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
              <h3 className="font-semibold mb-3">Background</h3>
              <div className="grid grid-cols-4 gap-3">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => (!isBgAllowed(bg.id) ? setShowPricing(true) : setBackground(bg))}
                    className={`h-16 rounded-lg border-4 hover:scale-110 transition relative ${
                      background.id === bg.id ? "border-purple-600" : "border-gray-200"
                    }`}
                    style={{ background: bg.css }}
                    aria-label={`Background ${bg.name}`}
                  >
                    {!isBgAllowed(bg.id) && (
                      <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                        <Lock size={20} className="text-yellow-300" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {BACKGROUNDS.length > gatedBackgrounds.length && (
                <div className="col-span-4 mt-2 text-sm text-gray-500">
                  More backgrounds available on {isBasic ? "Pro" : "Basic/Pro"}.
                </div>
              )}
            </div>

            {/* Fonts with gating */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
              <h3 className="font-semibold mb-3">Font</h3>
              <div className="flex gap-3">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => (!isFontAllowed(f.id) ? setShowPricing(true) : setFont(f))}
                    className={`flex-1 py-3 rounded-lg border-2 transition relative ${
                      font.id === f.id ? "border-purple-600 bg-purple-50" : "border-gray-200"
                    }`}
                    style={{ fontFamily: f.css }}
                    aria-label={`Font ${f.name}`}
                  >
                    {f.name}
                    {!isFontAllowed(f.id) && (
                      <Lock size={16} className="absolute top-1 right-1 text-yellow-500" />
                    )}
                  </button>
                ))}
              </div>
              {FONTS.length > gatedFonts.length && (
                <div className="mt-2 text-sm text-gray-500">
                  More fonts available on {isBasic ? "Pro" : "Basic/Pro"}.
                </div>
              )}
            </div>

            <button
              onClick={downloadImage}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              <Download size={24} /> Download
            </button>

            {user && !isPro && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 text-center">
                  {isBasic
                    ? "20 downloads/day on Basic"
                    : "3 downloads/day (or 10/month) on Free"}{" "}
                  •{" "}
                  <button onClick={() => setShowPricing(true)} className="font-semibold underline">
                    Upgrade for more
                  </button>
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-600">
                <Twitter size={20} /> Twitter
              </button>
              <button className="flex-1 bg-pink-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-pink-600">
                <Instagram size={20} /> Instagram
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== UTILS ==================== */

function awaitLabelDaily(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "Unlimited";
  return `${n}/day`;
}