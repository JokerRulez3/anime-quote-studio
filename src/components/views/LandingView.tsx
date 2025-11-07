// src/components/views/LandingView.tsx
import React from "react";
import { Search } from "lucide-react";

interface LandingViewProps {
  stats: { total: number; views: number; downloads: number };
  isLoadingRandom: boolean; // kept for compatibility, not used in this variant
  user: any;
  planKey: "free" | "basic" | "pro";
  onStartSearch: () => void;
  onRandom: () => void; // kept for compatibility, not used directly here
  onUpgrade: () => void; // kept for compatibility, not used directly here
}

export const LandingView: React.FC<LandingViewProps> = ({
  stats,
  onStartSearch,
}) => {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050816] text-slate-50">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Deep navy base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050816] via-[#050816] to-[#020817]" />

        {/* Bokeh / particles (simple CSS fake) */}
        <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
          <div className="absolute w-72 h-72 rounded-full bg-[#1d4ed8] blur-3xl top-[-4rem] left-[10%]" />
          <div className="absolute w-64 h-64 rounded-full bg-[#4f46e5] blur-3xl top-[6rem] right-[15%]" />
          <div className="absolute w-40 h-40 rounded-full bg-[#22c55e] blur-3xl bottom-[8rem] left-[25%]" />
          <div className="absolute w-52 h-52 rounded-full bg-[#9333ea] blur-3xl bottom-[-3rem] right-[20%]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pt-28 pb-24 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-5">
            Create &amp; Share Stunning Anime Quotes
          </h1>
          <p className="text-sm md:text-base text-slate-300 mb-4 max-w-2xl mx-auto">
            The ultimate tool for creators. Find the perfect quote, design a
            beautiful image, and share it with your audience in seconds.
          </p>
          <p className="text-[11px] text-slate-500 mb-10">
            {stats.total}+ quotes • {stats.views} views • {stats.downloads} downloads
          </p>

          {/* Search bar */}
          <button
            onClick={onStartSearch}
            className="w-full max-w-3xl mx-auto flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#0b1020]/95 border border-slate-800/80 text-left hover:border-sky-500/70 hover:bg-[#0f172a]/95 transition-shadow transition-colors shadow-[0_18px_60px_rgba(15,23,42,0.9)]"
          >
            <Search size={18} className="text-slate-500" />
            <span className="text-sm text-slate-400">
              Search by anime, character, or quote...
            </span>
          </button>
        </div>
      </section>

      {/* FEATURE ROW */}
      <section className="relative max-w-6xl mx-auto px-4 pb-16 grid md:grid-cols-3 gap-4 text-xs">
        <div className="bg-[#0b1020] border border-slate-900/80 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-100 mb-1">Search</h3>
          <p className="text-slate-400">
            Find quotes by anime, character, or exact phrase. Filter with
            curated emotions when you’re hunting a specific vibe.
          </p>
        </div>
        <div className="bg-[#0b1020] border border-slate-900/80 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-100 mb-1">Studio</h3>
          <p className="text-slate-400">
            Instantly style quotes into clean, social-ready visuals with
            gradients, fonts, and subtle watermark rules.
          </p>
        </div>
        <div className="bg-[#0b1020] border border-slate-900/80 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-100 mb-1">Share</h3>
          <p className="text-slate-400">
            Export high-quality PNGs sized for X, IG, TikTok &amp; more so you
            can post in one click.
          </p>
        </div>
      </section>
    </main>
  );
};
