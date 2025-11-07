// src/App.tsx
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
import { BACKGROUNDS, FONTS, PlanKey, WatermarkLevel } from "./config/ui";
import { TopNav } from "./components/layout/TopNav";
import { AuthModal } from "./components/auth/AuthModal";
import { LandingView } from "./components/views/LandingView";
import { SearchView } from "./components/views/SearchView";
import { StudioView } from "./components/views/StudioView";
import { PricingView } from "./components/views/PricingView";

type View = "landing" | "search" | "studio" | "pricing";

export default function App() {
  const [view, setView] = useState<View>("landing");

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [planKey, setPlanKey] = useState<PlanKey>("free");
  const [dailyLimit, setDailyLimit] = useState<number>(3);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(10);
  const [watermarkLevel, setWatermarkLevel] =
    useState<WatermarkLevel>("full");

  const [favorites, setFavorites] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, downloads: 0, views: 0 });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);

  const [backgroundId, setBackgroundId] = useState<number>(1);
  const [fontId, setFontId] = useState<number>(2);

  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [downloadLimitMsg, setDownloadLimitMsg] =
    useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isPro = planKey === "pro";
  const isBasic = planKey === "basic";

  // ---------- Init ----------
  useEffect(() => {
    (async () => {
      const u = await getUserSession();
      if (u) {
        setUser(u);
        const { profile: p, favorites: f } = await loadUserData(u.id);
        setProfile(p);
        setFavorites(f);
        const plan = getPlanLimits(p);
        setPlanKey((plan.key as PlanKey) || "free");
        setDailyLimit(plan.daily as number);
        setMonthlyLimit(plan.monthly as number);
        setWatermarkLevel(plan.watermark as WatermarkLevel);
      }
      const s = await loadStats();
      setStats(s);
    })();
  }, []);

  // ---------- Auth ----------
  async function handleAuth(
    email: string,
    password: string,
    isSignUp: boolean
  ) {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      setUser(u);
      const { profile: p, favorites: f } = await loadUserData(u!.id);
      setProfile(p);
      setFavorites(f);
      const plan = getPlanLimits(p);
      setPlanKey((plan.key as PlanKey) || "free");
      setDailyLimit(plan.daily as number);
      setMonthlyLimit(plan.monthly as number);
      setWatermarkLevel(plan.watermark as WatermarkLevel);
      setAuthOpen(false);
    } catch (e: any) {
      setAuthError(e.message ?? "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  function openAuth(mode: "signin" | "signup") {
    setAuthMode(mode);
    setAuthOpen(true);
    setAuthError(null);
  }

  function handleSignOut() {
    supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setPlanKey("free");
    setView("landing");
  }

  // ---------- Search ----------
  async function runTextSearch() {
    setIsLoading(true);
    setView("search");
    const rows = await searchQuotes(searchQuery, 24);
    setSearchResults(rows || []);
    setIsLoading(false);
  }

  async function runEmotionSearch(emotion: string) {
    setIsLoading(true);
    setView("search");
    const rows = await searchQuotesByEmotion(emotion, 24, 1);
    setSearchResults(rows || []);
    setIsLoading(false);
  }

  async function handleSearch() {
    const q = searchQuery.trim().toLowerCase();
    const EMOTIONS = [
      "inspiring",
      "motivational",
      "sad",
      "wholesome",
      "romantic",
      "dark",
      "funny",
    ];
    if (EMOTIONS.includes(q as any)) {
      await runEmotionSearch(q);
    } else {
      await runTextSearch();
    }
  }

  async function handleSelectQuote(q: any) {
    setSelectedQuote(q);
    setView("studio");
    await incrementView(q.id, user?.id);
    const s = await loadStats();
    setStats(s);
  }

  async function handleToggleFavorite(id: string) {
    if (!user) {
      openAuth("signin");
      return;
    }
    const next = await toggleFav(user.id, id, favorites);
    setFavorites(next);
  }

  async function handleRandom() {
    setIsLoading(true);
    const q = await randomQuote();
    if (q) {
      setSelectedQuote(q);
      setView("studio");
      await incrementView(q.id, user?.id);
      const s = await loadStats();
      setStats(s);
    }
    setIsLoading(false);
  }

  // ---------- Download ----------
  function renderWatermark(ctx: CanvasRenderingContext2D) {
    if (watermarkLevel === "none") return;

    if (watermarkLevel === "small") {
      ctx.save();
      ctx.globalAlpha = 0.8;
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

  async function handleDownload() {
    if (!user) {
      openAuth("signin");
      return;
    }
    if (!selectedQuote) return;

    const todayCount = await getDownloadsToday(user.id);
    if (Number.isFinite(dailyLimit) && todayCount >= dailyLimit) {
      setDownloadLimitMsg(
        isBasic
          ? "Daily limit reached (20/day). Upgrade to Pro for unlimited!"
          : "Daily limit reached (3/day). Upgrade to Basic/Pro!"
      );
      setView("pricing");
      return;
    }

    const bg =
      BACKGROUNDS.find((b) => b.id === backgroundId) ?? BACKGROUNDS[0];
    const font =
      FONTS.find((f) => f.id === fontId) ?? FONTS[1];

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    canvas.width = 1200;
    canvas.height = 630;

    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    const hexes = bg.css.match(/#[0-9a-f]{6}/gi) ?? ["#020817", "#020817"];
    grad.addColorStop(0, hexes[0]);
    grad.addColorStop(1, hexes[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 630);

    const marginX = 120;
    const maxWidth = 1200 - marginX * 2;
    let size = 56;
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(5,8,22,0.95)";
    ctx.shadowBlur = 18;

    const charName =
      selectedQuote?.character?.name ??
      selectedQuote?.character_name ??
      "";
    const animeTitle =
      selectedQuote?.anime?.title ??
      selectedQuote?.anime_title ??
      "";

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
        } else {
          line = test;
        }
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

    if (charName) {
      ctx.shadowBlur = 12;
      ctx.font = `600 26px Inter`;
      ctx.fillText(
        `— ${charName}`,
        600,
        startY + lines.length * (size + 14) + 56
      );
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

    await incrementDownloadsPerUser(
      user.id,
      selectedQuote.id,
      bg.name,
      font.name
    );
    const s = await loadStats();
    setStats(s);
  }

  // ---------- Nav handlers for TopNav ----------
  function goLanding() {
    setView("landing");
  }

  function goSearch() {
    setView("search");
  }

  async function goStudio() {
    if (selectedQuote) {
      setView("studio");
      return;
    }
    // If no selected quote yet, pull a random so Studio isn't empty
    await handleRandom();
  }

  function goPricing() {
    setView("pricing");
  }

  // ---------- Render ----------
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
          onSearchQueryChange={setSearchQuery}
          onRunSearch={handleSearch}
          onEmotionFilter={runEmotionSearch}
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
          dailyLimitLabel={
            Number.isFinite(dailyLimit) ? `${dailyLimit}/day` : "Unlimited"
          }
          userHasPlan={!!user}
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
          setAuthMode((prev) =>
            prev === "signin" ? "signup" : "signin"
          )
        }
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
