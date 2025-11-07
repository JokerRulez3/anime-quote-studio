import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import {
  getUserSession,
  loadUserData,
  loadStats,
  searchQuotes,
  searchQuotesByEmotion,
  randomQuote,
  toggleFavorite as toggleFav,
  incrementView,
  getDownloadsToday,
  incrementDownloadsPerUser,
  getPlanLimits,
} from "./lib/quotes";

import {
  BACKGROUNDS,
  FONTS,
  PlanKey,
  WatermarkLevel,
} from "./config/ui";

import { TopNav } from "./components/layout/TopNav";
import { LandingView } from "./components/views/LandingView";
import { SearchView } from "./components/views/SearchView";
import { StudioView } from "./components/views/StudioView";
import { PricingView } from "./components/views/PricingView";
import { AuthModal } from "./components/auth/AuthModal";

type View = "landing" | "search" | "studio" | "pricing";

const PLAN_ORDER: PlanKey[] = ["free", "basic", "pro"];
const planRank = (p: PlanKey) => PLAN_ORDER.indexOf(p || "free");

export default function App() {
  const [view, setView] = useState<View>("landing");

  // Auth / user
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Plan / limits
  const [planKey, setPlanKey] = useState<PlanKey>("free");
  const [dailyLimit, setDailyLimit] = useState<number>(3);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(10);
  const [watermarkLevel, setWatermarkLevel] =
    useState<WatermarkLevel>("full");

  // Global stats
  const [stats, setStats] = useState({
    total: 0,
    views: 0,
    downloads: 0,
  });

  // Favorites (IDs as string for consistency with SearchView)
  const [favorites, setFavorites] = useState<string[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeEmotion, setActiveEmotion] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  // Studio
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [backgroundId, setBackgroundId] = useState<number>(1);
  const [fontId, setFontId] = useState<number>(2);

  // Auth modal
  const [authMode, setAuthMode] = useState<"signin" | "signup">(
    "signin"
  );
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Pricing message (e.g. when redirecting from limit)
  const [downloadLimitMsg, setDownloadLimitMsg] =
    useState<string | null>(null);

  // Canvas ref for Studio downloads
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isPro = planKey === "pro";
  const userHasPlan = !!user && planRank(planKey) >= 0;
  const dailyLimitLabel = Number.isFinite(dailyLimit)
    ? `${dailyLimit}/day`
    : "Unlimited";

  /* ==================== INIT ==================== */

  useEffect(() => {
    (async () => {
      // Session
      const u = await getUserSession();
      if (u) {
        setUser(u);
        await hydrateUser(u.id);
      }

      // Stats
      const s = await loadStats();
      setStats(s);
    })();
  }, []);

  async function hydrateUser(userId: string) {
    const { profile: p, favorites: favIds } =
      await loadUserData(userId);
    setProfile(p || null);
    setFavorites((favIds || []).map((id: any) => String(id)));

    const limits = getPlanLimits(p);
    setPlanKey((limits.key || "free") as PlanKey);
    setDailyLimit(limits.daily ?? 3);
    setMonthlyLimit(limits.monthly ?? 10);
    setWatermarkLevel(
      (limits.watermark || "full") as WatermarkLevel
    );
  }

  /* ==================== AUTH ==================== */

  function openAuth(mode: "signin" | "signup") {
    setAuthMode(mode);
    setAuthError(null);
    setAuthOpen(true);
  }

  function closeAuth() {
    setAuthOpen(false);
    setAuthError(null);
  }

  async function handleAuth(
    email: string,
    password: string,
    isSignUp: boolean
  ) {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (error) throw error;
      }

      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) throw new Error("No user returned after auth.");
      setUser(u);
      await hydrateUser(u.id);
      setAuthOpen(false);
    } catch (err: any) {
      setAuthError(err.message ?? "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setPlanKey("free");
    setDailyLimit(3);
    setMonthlyLimit(10);
    setWatermarkLevel("full");
    setView("landing");
  }

  /* ==================== SEARCH (TEXT) ==================== */

  async function handleSearch() {
    setIsLoading(true);
    setActiveEmotion(null); // text search stands alone
    setDownloadLimitMsg(null);

    try {
      const q = searchQuery.trim();
      const rows = await searchQuotes(q || null, 1, 24);
      setSearchResults(rows || []);
      setView("search");
    } catch (err) {
      console.error("searchQuotes failed:", err);
      setSearchResults([]);
      setView("search");
    } finally {
      setIsLoading(false);
    }
  }

  /* ==================== SEARCH (EMOTION-ONLY) ==================== */

  async function handleEmotionFilter(emotion: string) {
    // emotion from SearchView: "" or specific
    const normalized =
      !emotion || emotion === "all"
        ? null
        : emotion.toLowerCase();

    setIsLoading(true);
    setDownloadLimitMsg(null);
    setSearchQuery(""); // keep emotion-only logic clean
    setActiveEmotion(normalized);

    try {
      if (!normalized) {
        // "All" → clear emotion filter and results (or could show popular)
        setSearchResults([]);
      } else {
        const rows = await searchQuotesByEmotion(
          normalized,
          25,
          1
        );
        setSearchResults(rows || []);
      }
      setView("search");
    } catch (err) {
      console.error("searchQuotesByEmotion failed:", err);
      setSearchResults([]);
      setView("search");
    } finally {
      setIsLoading(false);
    }
  }

  /* ==================== RANDOM, SELECT, FAVORITES ==================== */

  async function handleRandom() {
    setIsLoading(true);
    setDownloadLimitMsg(null);
    try {
      const q = await randomQuote();
      if (q) {
        setSelectedQuote(q);
        setView("studio");
        // best-effort view increment
        incrementView(q.id).catch((e: unknown) =>
          console.error("incrementView failed:", e)
        );
      }
    } catch (err) {
      console.error("randomQuote failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectQuote(q: any) {
    setSelectedQuote(q);
    setView("studio");
    incrementView(q.id).catch((e: unknown) =>
      console.error("incrementView failed:", e)
    );
  }

  async function handleToggleFavorite(id: string) {
    if (!user) {
      openAuth("signin");
      return;
    }
    try {
      const isFav = favorites.includes(id);
      await toggleFav(user.id, id, !isFav);
      setFavorites((prev) =>
        isFav ? prev.filter((f) => f !== id) : [...prev, id]
      );
    } catch (err) {
      console.error("toggleFavorite failed:", err);
    }
  }

  /* ==================== STUDIO / DOWNLOAD ==================== */

  function getCurrentBgAndFont() {
    const bg =
      BACKGROUNDS.find((b) => b.id === backgroundId) ??
      BACKGROUNDS[0];
    const font =
      FONTS.find((f) => f.id === fontId) ?? FONTS[0];
    return { bg, font };
  }

  function renderWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    if (watermarkLevel === "none") return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.font =
      watermarkLevel === "small"
        ? "600 22px Inter"
        : "600 40px Inter";

    if (watermarkLevel === "small") {
      ctx.fillText(
        "AnimeQuoteStudio.com",
        width - 180,
        height - 36
      );
    } else {
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-Math.PI / 5);
      ctx.fillText("AnimeQuoteStudio.com", 0, 0);
    }
    ctx.restore();
  }

  async function handleDownload() {
    if (!selectedQuote) return;
    if (!user) {
      openAuth("signin");
      return;
    }

    // Check daily limit
    try {
      const today = await getDownloadsToday(user.id);
      if (
        Number.isFinite(dailyLimit) &&
        today >= (dailyLimit as number)
      ) {
        setDownloadLimitMsg(
          "Daily download limit reached for your plan. Upgrade to unlock more."
        );
        setView("pricing");
        return;
      }
    } catch (err) {
      console.error("getDownloadsToday failed:", err);
      // fail-open: still allow download
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { bg, font } = getCurrentBgAndFont();
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // Background gradient or css
    const grad = ctx.createLinearGradient(0, 0, width, height);
    const hexes =
      bg.css.match(/#[0-9a-f]{6}/gi) ?? ["#111827", "#020817"];
    grad.addColorStop(0, hexes[0]);
    grad.addColorStop(1, hexes[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const quoteText = selectedQuote.quote_text || "";
    const charName =
      selectedQuote.character?.name ||
      selectedQuote.character_name ||
      "";
    const animeTitle =
      selectedQuote.anime?.title ||
      selectedQuote.anime_title ||
      "";

    const marginX = 120;
    const maxWidth = width - marginX * 2;
    let size = 56;

    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 18;

    function measureLines(text: string, fontSize: number) {
      if (!ctx) return [];
      ctx.font = `600 ${fontSize}px ${font.css}`;
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

    let lines = measureLines(`"${quoteText}"`, size);
    while (lines.length > 4 && size > 26) {
      size -= 2;
      lines = measureLines(`"${quoteText}"`, size);
    }

    const startY = 210 - ((lines.length - 1) * (size + 14)) / 2;
    lines.forEach((ln, i) => {
      ctx.font = `600 ${size}px ${font.css}`;
      ctx.fillText(ln, width / 2, startY + i * (size + 14));
    });

    if (charName) {
      ctx.font = "600 26px Inter";
      ctx.fillText(
        `— ${charName}`,
        width / 2,
        startY + lines.length * (size + 14) + 56
      );
    }

    if (animeTitle) {
      ctx.font = "400 22px Inter";
      ctx.fillText(
        animeTitle,
        width / 2,
        startY + lines.length * (size + 14) + 92
      );
    }

    renderWatermark(ctx, width, height);

    const link = document.createElement("a");
    link.download = `quote-${selectedQuote.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    try {
      await incrementDownloadsPerUser(
        user.id,
        selectedQuote.id,
        bg.name,
        font.name
      );
      const s = await loadStats();
      setStats(s);
    } catch (err) {
      console.error("incrementDownloadsPerUser failed:", err);
    }
  }

  /* ==================== NAV HELPERS ==================== */

  const goLanding = () => setView("landing");
  const goSearch = () => setView("search");
  const goStudio = () => {
    if (selectedQuote) setView("studio");
    else handleRandom();
  };
  const goPricing = () => setView("pricing");

  /* ==================== RENDER ==================== */

  return (
    <>
      <TopNav
        user={user}
        planKey={planKey}
        currentView={view}
        onLogoClick={goLanding}
        onGoSearch={goSearch}
        onGoStudio={goStudio}
        onGoPricing={goPricing}
        onSignIn={() => openAuth("signin")}
        onSignUp={() => openAuth("signup")}
        onSignOut={handleSignOut}
      />

      {view === "landing" && (
        <LandingView
          stats={stats}
          isLoadingRandom={isLoading}
          user={user}
          planKey={planKey}
          onStartSearch={goSearch}
          onRandom={handleRandom}
          onUpgrade={goPricing}
        />
      )}

      {view === "search" && (
        <SearchView
          searchQuery={searchQuery}
          activeEmotion={activeEmotion}
          onSearchQueryChange={setSearchQuery}
          onRunSearch={handleSearch}
          onEmotionFilter={handleEmotionFilter}
          isLoading={isLoading}
          results={searchResults}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onSelectQuote={handleSelectQuote}
          onRandom={handleRandom}
        />
      )}

      {view === "studio" && (
        <StudioView
          selectedQuote={selectedQuote}
          backgroundId={backgroundId}
          fontId={fontId}
          planKey={planKey}
          watermarkLevel={watermarkLevel}
          dailyLimitLabel={dailyLimitLabel}
          userHasPlan={userHasPlan}
          onSelectBackground={setBackgroundId}
          onSelectFont={setFontId}
          onDownload={handleDownload}
          onUpgrade={goPricing}
          canvasRef={canvasRef}
        />
      )}

      {view === "pricing" && (
        <PricingView
          planKey={planKey}
          downloadLimitMsg={downloadLimitMsg}
          onBack={goLanding}
        />
      )}

      <AuthModal
        mode={authMode}
        isOpen={authOpen}
        isLoading={isLoading}
        error={authError}
        onSubmit={handleAuth}
        onSwitch={() =>
          setAuthMode((m) => (m === "signin" ? "signup" : "signin"))
        }
        onClose={closeAuth}
      />
    </>
  );
}
