// src/components/views/StudioView.tsx
// src/components/views/StudioView.tsx
import React from "react";
import { Download, Lock, Sparkles } from "lucide-react";
import {
  BACKGROUNDS,
  FONTS,
  PlanKey,
  WatermarkLevel,
} from "../../config/ui";

interface StudioViewProps {
  selectedQuote: any;
  backgroundId: number;
  fontId: number;
  planKey: PlanKey;
  watermarkLevel: WatermarkLevel;
  dailyLimitLabel: string; // e.g. "3/day" or "Unlimited"
  userHasPlan: boolean;
  onSelectBackground: (id: number) => void;
  onSelectFont: (id: number) => void;
  onDownload: () => void;
  onUpgrade: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

/** Gating logic based on index; matches your pricing rules */
function requiredPlanForBackground(index: number): PlanKey {
  if (index <= 1) return "free"; // first 2 free
  if (index <= 3) return "basic"; // next 2 basic
  return "pro"; // rest pro
}
function requiredPlanForFont(index: number): PlanKey {
  if (index === 0) return "free";
  if (index === 1) return "basic";
  return "pro";
}
const PLAN_ORDER: PlanKey[] = ["free", "basic", "pro"];
const rank = (p: PlanKey) => PLAN_ORDER.indexOf(p || "free");
const isLocked = (required: PlanKey, user: PlanKey) =>
  rank(user) < rank(required);

export const StudioView: React.FC<StudioViewProps> = ({
  selectedQuote,
  backgroundId,
  fontId,
  planKey,
  watermarkLevel,
  dailyLimitLabel,
  userHasPlan,
  onSelectBackground,
  onSelectFont,
  onDownload,
  onUpgrade,
  canvasRef,
}) => {
  const bg =
    BACKGROUNDS.find((b) => b.id === backgroundId) ?? BACKGROUNDS[0];
  const font =
    FONTS.find((f) => f.id === fontId) ?? FONTS[0];

  const quoteText: string =
    selectedQuote?.quote_text ??
    "Select a quote from Search or tap Random to start designing.";
  const characterName: string =
    selectedQuote?.character?.name ??
    selectedQuote?.character_name ??
    "";
  const animeTitle: string =
    selectedQuote?.anime?.title ??
    selectedQuote?.anime_title ??
    "";

  // Dynamic font sizing based on quote length.
  // Goal: never overflow the 1200x630 ratio, especially on mobile.
  const len = quoteText.length;
  let quoteSizeClass =
    "text-[16px] sm:text-[18px] md:text-[22px] lg:text-[24px]";
  if (len > 420) {
    quoteSizeClass =
      "text-[12px] sm:text-[13px] md:text-[16px] lg:text-[18px]";
  } else if (len > 320) {
    quoteSizeClass =
      "text-[13px] sm:text-[14px] md:text-[18px] lg:text-[20px]";
  } else if (len > 220) {
    quoteSizeClass =
      "text-[14px] sm:text-[15px] md:text-[20px] lg:text-[22px]";
  }

  const watermarkLabel =
    watermarkLevel === "none"
      ? ""
      : watermarkLevel === "small"
      ? "Subtle watermark"
      : "Diagonal watermark";

  const canDownload = !!selectedQuote;

  return (
    <main className="min-h-[100vh] bg-[#050816] text-slate-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-[26px] sm:text-3xl md:text-4xl font-semibold tracking-tight mb-2">
            Quote Studio
          </h1>
          <p className="text-xs sm:text-sm md:text-[15px] text-slate-400 max-w-2xl mx-auto">
            Customize your quote image. Pick a background, choose a font,
            then download a social-ready PNG in seconds.
          </p>
        </div>

        {/* Layout: Preview + Controls */}
        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.9fr)] gap-8 items-start">
          {/* LEFT: Preview */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-[720px] aspect-[1200/630] rounded-3xl bg-[#020817] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden">
              {/* Gradient background */}
              <div
                className="absolute inset-0"
                style={{ background: bg.css }}
              />

              {/* Content */}
              <div className="relative h-full px-5 sm:px-8 md:px-10 py-6 sm:py-8 md:py-10 flex flex-col">
                {/* Quote: top-aligned on mobile, centered on md+ */}
                <div className="flex-1 flex items-start md:items-center">
                  <p
                    className={`w-full text-slate-50 font-semibold leading-snug sm:leading-relaxed mb-3 ${quoteSizeClass}`}
                    style={{ fontFamily: font.css }}
                  >
                    “{quoteText}”
                  </p>
                </div>

                {/* Attribution */}
                {(characterName || animeTitle) && (
                  <div className="mt-1 text-left md:text-center">
                    {characterName && (
                      <div className="font-semibold text-slate-100 text-[10px] sm:text-xs md:text-sm">
                        — {characterName}
                      </div>
                    )}
                    {animeTitle && (
                      <div className="text-slate-300 text-[9px] sm:text-[10px] md:text-xs">
                        {animeTitle}
                      </div>
                    )}
                  </div>
                )}

                {/* Watermark preview for non-Pro */}
                {planKey !== "pro" && (
                  <div className="absolute right-4 bottom-2 text-[7px] sm:text-[8px] text-slate-200/80">
                    AnimeQuoteStudio.com
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hidden canvas (for real PNG export) */}
          <canvas
            ref={canvasRef}
            className="hidden"
            aria-hidden="true"
          />

          {/* RIGHT: Controls */}
          <aside className="space-y-6">
            {/* BACKGROUNDS */}
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm md:text-base font-semibold text-slate-200">
                  Background
                </h2>
                <p className="text-[9px] sm:text-[10px] text-slate-500">
                  {planKey === "pro"
                    ? "All unlocked"
                    : planKey === "basic"
                    ? "Basic + Free"
                    : "2 / 8 unlocked"}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BACKGROUNDS.map((b, idx) => {
                  const required = requiredPlanForBackground(idx);
                  const locked = isLocked(required, planKey);
                  const active = b.id === backgroundId;

                  return (
                    <button
                      key={b.id}
                      onClick={() =>
                        !locked && onSelectBackground(b.id)
                      }
                      className={`relative h-14 rounded-2xl border transition-all overflow-hidden flex items-end px-2 pb-1.5
                        ${
                          active
                            ? "border-sky-500 shadow-[0_0_18px_rgba(56,189,248,0.4)]"
                            : "border-slate-800 hover:border-sky-500/70 hover:shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                        }
                        ${
                          locked
                            ? "opacity-55 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                      style={{ background: b.css }}
                    >
                      <span className="relative z-10 text-[9px] sm:text-[10px] font-medium text-slate-50 drop-shadow">
                        {b.name}
                      </span>
                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/55 text-[8px] text-slate-100">
                            <Lock size={9} />
                            {required === "pro" ? "Pro" : "Basic"}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FONTS */}
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm md:text-base font-semibold text-slate-200">
                  Font
                </h2>
                <p className="text-[9px] sm:text-[10px] text-slate-500">
                  Premium faces with Pro
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FONTS.map((f, idx) => {
                  const required = requiredPlanForFont(idx);
                  const locked = isLocked(required, planKey);
                  const active = f.id === fontId;

                  return (
                    <button
                      key={f.id}
                      onClick={() => !locked && onSelectFont(f.id)}
                      className={`relative px-3 py-3 rounded-2xl border text-left transition-all
                        ${
                          active
                            ? "border-sky-500 bg-[#0f172a] shadow-[0_0_16px_rgba(56,189,248,0.35)]"
                            : "border-slate-800 bg-[#050816] hover:border-sky-500/70 hover:bg-[#060b18]"
                        }
                        ${
                          locked
                            ? "opacity-55 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                    >
                      <div
                        className="text-[10px] sm:text-[11px] text-slate-100 truncate"
                        style={{ fontFamily: f.css }}
                      >
                        {f.name}
                      </div>
                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                          <Lock
                            size={10}
                            className="text-slate-400"
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DOWNLOAD CTA */}
            <div className="space-y-2 pt-2">
              <button
                onClick={canDownload ? onDownload : undefined}
                disabled={!canDownload}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all
                  ${
                    canDownload
                      ? "bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-[0_16px_40px_rgba(56,189,248,0.35)]"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
              >
                <Download size={18} />
                Download PNG
              </button>

              <p className="text-[9px] sm:text-[10px] text-slate-500">
                {dailyLimitLabel === "Unlimited" ? (
                  <>Unlimited downloads on your plan.</>
                ) : (
                  <>
                    {dailyLimitLabel} downloads per day (per plan
                    rules).
                  </>
                )}
                {watermarkLabel && (
                  <>
                    {" "}
                    <span className="text-slate-400">
                      • {watermarkLabel}
                    </span>
                  </>
                )}
              </p>

              {planKey !== "pro" && (
                <button
                  onClick={onUpgrade}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-[#050816] border border-slate-800 text-[10px] sm:text-[11px] text-slate-300 hover:border-sky-500 hover:text-sky-300 hover:bg-sky-500/5 transition-all"
                >
                  <Sparkles
                    size={14}
                    className="text-sky-400"
                  />
                  Unlock all backgrounds, fonts & watermark-free
                  exports with Pro →
                </button>
              )}

              {!userHasPlan && (
                <p className="text-[8px] sm:text-[9px] text-slate-500">
                  Log in or sign up to track your downloads and save
                  your favorites.
                </p>
              )}
            </div>
          </aside>
        </div>

        {/* Hint */}
        {!selectedQuote && (
          <div className="mt-10 text-center text-[9px] sm:text-[10px] text-slate-500">
            Tip: start from the{" "}
            <span className="text-sky-400 font-medium">
              Search
            </span>{" "}
            page or use{" "}
            <span className="text-sky-400 font-medium">
              Random
            </span>{" "}
            to load a quote into the Studio.
          </div>
        )}
      </div>
    </main>
  );
};
