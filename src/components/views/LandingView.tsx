// src/components/views/LandingView.tsx
import React from "react";
import { Search } from "lucide-react";

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
  onStartSearch,
}) => {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050816] text-slate-50">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050816] via-[#050816] to-[#020817]" />

        {/* Glow blobs */}
        <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
          <div className="absolute w-[22rem] h-[22rem] rounded-full bg-[#1d4ed8] blur-3xl top-[-4rem] left-[10%]" />
          <div className="absolute w-[20rem] h-[20rem] rounded-full bg-[#4f46e5] blur-3xl top-[6rem] right-[15%]" />
          <div className="absolute w-[16rem] h-[16rem] rounded-full bg-[#22c55e] blur-3xl bottom-[8rem] left-[25%]" />
          <div className="absolute w-[18rem] h-[18rem] rounded-full bg-[#9333ea] blur-3xl bottom-[-3rem] right-[20%]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 pt-36 pb-28 text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Create &amp; Share Stunning Anime Quotes
          </h1>
          <p className="text-base md:text-lg text-slate-300 mb-6 max-w-2xl mx-auto">
            The ultimate tool for creators. Find the perfect quote, design a
            beautiful image, and share it with your audience in seconds.
          </p>
          <p className="text-sm md:text-[15px] text-slate-500 mb-12 font-medium">
            {stats.total}+ quotes • {stats.views} views • {stats.downloads} downloads
          </p>

          {/* Search bar */}
          <button
            onClick={onStartSearch}
            className="w-full max-w-3xl mx-auto flex items-center gap-3 px-6 py-5 rounded-2xl bg-[#0b1020]/95 border border-slate-800/80 text-left hover:border-sky-500/70 hover:bg-[#0f172a]/95 transition-all shadow-[0_25px_80px_rgba(15,23,42,0.9)]"
          >
            <Search size={20} className="text-slate-400" />
            <span className="text-[15px] text-slate-400">
              Search by anime, character, or quote...
            </span>
          </button>
        </div>
      </section>

      {/* FEATURE ROW */}
      <section className="relative max-w-6xl mx-auto px-6 pb-20 grid md:grid-cols-3 gap-5 text-[13px]">
        <div className="bg-[#0b1020] border border-slate-900/80 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-100 mb-1.5 text-[15px]">Search</h3>
          <p className="text-slate-400 leading-relaxed">
            Find quotes by anime, character, or exact phrase. Filter with curated
            emotions when you’re hunting a specific vibe.
          </p>
        </div>
        <div className="bg-[#0b1020] border border-slate-900/80 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-100 mb-1.5 text-[15px]">Studio</h3>
          <p className="text-slate-400 leading-relaxed">
            Instantly style quotes into clean, social-ready visuals with gradients,
            fonts, and subtle watermark rules.
          </p>
        </div>
        <div className="bg-[#0b1020] border border-slate-900/80 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-100 mb-1.5 text-[15px]">Share</h3>
          <p className="text-slate-400 leading-relaxed">
            Export high-quality PNGs sized for X, IG, TikTok &amp; more so you can
            post in one click.
          </p>
        </div>
      </section>
    </main>
  );
};
