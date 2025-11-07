// src/components/views/PricingView.tsx
import React from "react";
import { Crown, Sparkles, Zap } from "lucide-react";
import type { PlanKey } from "../../config/ui";

interface PricingViewProps {
  planKey: PlanKey;
  downloadLimitMsg: string | null;
  onBack: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  planKey,
  downloadLimitMsg,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">〃</span>
            <span className="font-semibold tracking-tight">Anime Quote Studio</span>
          </div>
          <button
            onClick={onBack}
            className="text-xs px-3 py-2 rounded-lg bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-semibold tracking-tight mb-2">
            Choose Your Plan
          </h1>
          <p className="text-sm text-slate-400">
            Start for free. Upgrade only when you’re creating regularly.
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
              <p className="text-xs text-slate-500 mb-4">
                For starters and casual creators.
              </p>
              <div className="text-3xl font-semibold mb-4">
                $0<span className="text-xs text-slate-500">/mo</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 mb-4">
                <li>3 downloads/day or 10/month</li>
                <li>2 backgrounds</li>
                <li>1 font</li>
                <li>Heavy watermark</li>
              </ul>
            </div>
            <div className="text-xs text-slate-500">
              {planKey === "free" ? "Current plan" : "Included for everyone"}
            </div>
          </div>

          {/* Basic */}
          <div className="bg-slate-900 border border-sky-500/70 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Basic</h2>
              <p className="text-xs text-slate-500 mb-4">
                For growing anime pages & creators.
              </p>
              <div className="text-3xl font-semibold mb-1">
                $2.99<span className="text-xs text-slate-500">/mo</span>
              </div>
              <p className="text-[10px] text-slate-500 mb-4">or $24/year</p>
              <ul className="space-y-2 text-xs text-slate-300 mb-4">
                <li>20 downloads/day</li>
                <li>4 backgrounds</li>
                <li>2 fonts</li>
                <li>Small watermark</li>
              </ul>
            </div>
            <button className="w-full mt-2 text-xs py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400">
              Upgrade to Basic
            </button>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-500 rounded-2xl p-6 text-slate-950 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_top,_#fff,_transparent_60%)] pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/10 text-[10px] font-semibold mb-3">
                <Crown size={14} /> Most Popular
              </div>
              <h2 className="text-lg font-semibold mb-1">Pro</h2>
              <p className="text-xs text-slate-900/80 mb-4">
                For serious creators & brands.
              </p>
              <div className="text-3xl font-semibold mb-1">
                $4.99<span className="text-xs text-slate-900/80">/mo</span>
              </div>
              <p className="text-[10px] text-slate-900/80 mb-4">or $39/year</p>
              <ul className="space-y-2 text-xs text-slate-900 mb-4">
                <li className="flex items-center gap-2">
                  <Zap size={14} /> Unlimited downloads
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles size={14} /> All backgrounds & all fonts
                </li>
                <li className="flex items-center gap-2">
                  <Crown size={14} /> No watermark
                </li>
                <li className="flex items-center gap-2">
                  Priority support & early features
                </li>
              </ul>
            </div>
            <button className="relative w-full mt-2 text-xs py-2 rounded-lg bg-slate-950 text-slate-50 font-semibold hover:bg-slate-900">
              Go Pro
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
