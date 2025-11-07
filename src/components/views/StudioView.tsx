// src/components/views/StudioView.tsx
import React, { RefObject } from "react";
import { BACKGROUNDS, FONTS, PlanKey, WatermarkLevel } from "../../config/ui";
import { Download, Instagram, Lock, Twitter } from "lucide-react";

interface StudioViewProps {
  selectedQuote: any;
  backgroundId: number;
  fontId: number;
  planKey: PlanKey;
  watermarkLevel: WatermarkLevel;
  dailyLimitLabel: string;
  userHasPlan: boolean;
  onSelectBackground: (id: number) => void;
  onSelectFont: (id: number) => void;
  onDownload: () => void;
  onUpgrade: () => void;
  canvasRef: RefObject<HTMLCanvasElement>;
}

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
  const isPro = planKey === "pro";
  const isBasic = planKey === "basic";

  const bgConfig = BACKGROUNDS.find((b) => b.id === backgroundId) ?? BACKGROUNDS[0];
  const fontConfig = FONTS.find((f) => f.id === fontId) ?? FONTS[1];

  const allowedBgCount = isPro ? BACKGROUNDS.length : isBasic ? 4 : 2;
  const allowedFontCount = isPro ? FONTS.length : isBasic ? 2 : 1;
  const isBgAllowed = (id: number) => id <= allowedBgCount;
  const isFontAllowed = (id: number) => id <= allowedFontCount;

  const charName =
    selectedQuote?.character?.name ?? selectedQuote?.character_name ?? "";
  const animeTitle =
    selectedQuote?.anime?.title ?? selectedQuote?.anime_title ?? "";

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-6 text-center">
          Quote Studio
        </h1>
        <p className="text-xs text-slate-500 text-center mb-8">
          Customize your quote image. Change backgrounds and fonts, then download
          a ready-to-share PNG.
        </p>

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Preview */}
          <section>
            <div
              className="rounded-2xl shadow-2xl aspect-video flex items-center justify-center p-8 border border-slate-800 bg-slate-900 overflow-hidden"
              style={{ background: bgConfig.css }}
            >
              <div className="text-center max-w-xl mx-auto">
                <p
                  className="text-white text-2xl md:text-3xl font-semibold mb-5 leading-relaxed drop-shadow-[0_8px_24px_rgba(15,23,42,0.9)]"
                  style={{ fontFamily: fontConfig.css }}
                >
                  {selectedQuote
                    ? `“${selectedQuote.quote_text}”`
                    : "Pick a quote from search or try a random one."}
                </p>
                {selectedQuote && (
                  <>
                    {charName && (
                      <p className="text-sm md:text-base text-slate-100 font-semibold drop-shadow">
                        — {charName}
                      </p>
                    )}
                    {animeTitle && (
                      <p className="text-xs md:text-sm text-slate-200/80 drop-shadow">
                        {animeTitle}
                        {selectedQuote.episode_number
                          ? ` • Ep ${selectedQuote.episode_number}`
                          : ""}
                      </p>
                    )}
                  </>
                )}
                <p className="absolute bottom-3 right-4 text-[9px] text-slate-300/70">
                  {planKey === "free"
                    ? "Heavy watermark preview"
                    : planKey === "basic"
                    ? "Subtle corner watermark"
                    : "No watermark on Pro"}
                </p>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </section>

          {/* Controls */}
          <section>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-200">
                  Background
                </span>
                <span className="text-[9px] text-slate-500">
                  {allowedBgCount} / {BACKGROUNDS.length} unlocked
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {BACKGROUNDS.map((bg) => {
                  const locked = !isBgAllowed(bg.id);
                  return (
                    <button
                      key={bg.id}
                      onClick={() =>
                        locked ? onUpgrade() : onSelectBackground(bg.id)
                      }
                      className={`h-10 rounded-xl border text-[8px] text-slate-50 flex items-end justify-start px-1 pb-1 relative overflow-hidden transition ${
                        backgroundId === bg.id
                          ? "border-indigo-400 ring-1 ring-indigo-400/40"
                          : "border-slate-800 hover:border-slate-600"
                      }`}
                      style={{ background: bg.css }}
                    >
                      <span className="backdrop-blur-sm bg-slate-950/30 px-1 rounded">
                        {bg.name}
                      </span>
                      {locked && (
                        <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                          <Lock size={12} className="text-sky-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-200">
                  Font
                </span>
                <span className="text-[9px] text-slate-500">
                  {allowedFontCount} / {FONTS.length} unlocked
                </span>
              </div>
              <div className="flex gap-2">
                {FONTS.map((f) => {
                  const locked = !isFontAllowed(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() =>
                        locked ? onUpgrade() : onSelectFont(f.id)
                      }
                      className={`flex-1 py-2 rounded-xl border text-xs transition relative ${
                        fontId === f.id
                          ? "border-indigo-400 bg-slate-900"
                          : "border-slate-800 bg-slate-950 hover:border-slate-600"
                      }`}
                      style={{ fontFamily: f.css }}
                    >
                      {f.name}
                      {locked && (
                        <Lock
                          size={12}
                          className="absolute top-1.5 right-1.5 text-sky-400"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={onDownload}
              className="w-full py-3 rounded-xl bg-sky-500 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-sky-400 mb-3"
            >
              <Download size={18} /> Download PNG
            </button>

            <p className="text-[9px] text-slate-500 mb-3">
              {userHasPlan
                ? `Your plan: ${planKey}. Downloads: ${dailyLimitLabel}.`
                : "Log in to track your downloads and unlock more styles."}
            </p>

            {(!isPro || !userHasPlan) && (
              <button
                onClick={onUpgrade}
                className="w-full py-2 rounded-xl bg-slate-900 border border-slate-700 text-[10px] text-slate-200 hover:bg-slate-800 mb-3"
              >
                Unlock all backgrounds, fonts & watermark-free exports with Pro →
              </button>
            )}

            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800">
                <Twitter size={14} /> Share on X
              </button>
              <button className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800">
                <Instagram size={14} /> Share on IG
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
