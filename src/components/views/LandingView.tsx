// src/components/views/LandingView.tsx
import React from "react";
import { Loader, Search, Shuffle, Crown } from "lucide-react";

interface LandingViewProps {
  stats: { total: number; views: number; downloads: number };
  isLoadingRandom: boolean;
  user: any;
  planKey: "free" | "basic" | "pro";
  onStartSearch: () => void;
  onRandom: () => void;
  onUpgrade: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  stats,
  isLoadingRandom,
  user,
  planKey,
  onStartSearch,
  onRandom,
  onUpgrade,
}) => {
  const isPro = planKey === "pro";

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-50">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18),transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-14 text-center relative">
          <p className="text-xs text-indigo-400 mb-2">
            AI-assisted anime quote visuals for creators
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-3">
            Create & Share Stunning Anime Quotes
          </h1>
          <p className="text-sm text-slate-400 mb-3">
            Find the perfect line, style it in seconds, and export ready-to-post images
            for X, IG, TikTok, and more.
          </p>
          <p className="text-[11px] text-slate-500 mb-6">
            {stats.total}+ quotes • {stats.views} views • {stats.downloads} downloads
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <button
              onClick={onStartSearch}
              className="px-6 py-3 rounded-full bg-slate-50 text-slate-950 text-sm font-semibold flex items-center gap-2 shadow-sm hover:bg-slate-200"
            >
              <Search size={16} /> Search quotes
            </button>
            <button
              onClick={onRandom}
              disabled={isLoadingRandom}
              className="px-6 py-3 rounded-full bg-indigo-500 text-slate-950 text-sm font-semibold flex items-center gap-2 hover:bg-indigo-400 disabled:opacity-50"
            >
              {isLoadingRandom ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Shuffle size={16} />
              )}
              Random quote
            </button>
            {(!user || !isPro) && (
              <button
                onClick={onUpgrade}
                className="px-6 py-3 rounded-full bg-sky-500 text-slate-950 text-sm font-semibold flex items-center gap-2 hover:bg-sky-400"
              >
                <Crown size={16} /> Upgrade
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-16 grid md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-100 mb-1">Search smart</h3>
          <p className="text-slate-400">
            Look up quotes by anime, character, or precise text. Filter with curated
            emotions like <span className="text-slate-200">“inspiring”</span> or{" "}
            <span className="text-slate-200">“funny”</span>.
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-100 mb-1">Design in seconds</h3>
          <p className="text-slate-400">
            Choose gradients and fonts tuned for anime aesthetics. No canvas clutter —
            just the quote and vibes.
          </p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-100 mb-1">Share everywhere</h3>
          <p className="text-slate-400">
            Exports are sized for social; watermark rules and limits adapt to your plan.
          </p>
        </div>
      </section>
    </main>
  );
};
