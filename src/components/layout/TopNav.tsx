// src/components/layout/TopNav.tsx
import React from "react";
import { Crown, LogOut, User } from "lucide-react";
import type { PlanKey } from "../../config/ui";

interface TopNavProps {
  user: any;
  planKey: PlanKey;
  currentView: "landing" | "search" | "studio" | "pricing";
  onLogoClick: () => void;
  onGoSearch: () => void;
  onGoStudio: () => void;
  onGoPricing: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  user,
  planKey,
  currentView,
  onLogoClick,
  onGoSearch,
  onGoStudio,
  onGoPricing,
  onSignIn,
  onSignUp,
  onSignOut,
}) => {
  const isPro = planKey === "pro";

  const linkBase =
    "text-[11px] md:text-xs px-2 md:px-3 py-1.5 rounded-full transition-colors";
  const inactive = "text-slate-400 hover:text-slate-100";
  const active =
    "text-slate-100 bg-slate-900/70 shadow-sm border border-slate-700";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-900/90 bg-[#050816]/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 text-slate-100 hover:text-sky-400 transition"
        >
          <span className="text-xl leading-none">〃</span>
          <span className="font-semibold tracking-tight text-sm md:text-base">
            Anime Quote Studio
          </span>
        </button>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-2 text-[11px]">
          <button
            onClick={onGoSearch}
            className={`${linkBase} ${
              currentView === "search" ? active : inactive
            }`}
          >
            Search
          </button>
          <button
            onClick={onGoStudio}
            className={`${linkBase} ${
              currentView === "studio" ? active : inactive
            }`}
          >
            Studio
          </button>
          <button
            onClick={onGoPricing}
            className={`${linkBase} ${
              currentView === "pricing" ? active : inactive
            }`}
          >
            Pricing
          </button>
        </nav>

        {/* Right side: auth / plan */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] text-slate-200">
                {isPro ? (
                  <Crown size={14} className="text-yellow-300" />
                ) : (
                  <User size={14} className="text-slate-500" />
                )}
                <span className="capitalize">{planKey}</span>
                <span className="text-slate-600">•</span>
                <span className="max-w-[80px] truncate">
                  {user.email?.split("@")[0] ?? "creator"}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-slate-300 text-[10px] hover:bg-slate-800 flex items-center gap-1"
              >
                <LogOut size={12} />
                <span>Log out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSignIn}
                className="px-3 py-1.5 rounded-full bg-transparent text-[10px] text-slate-300 hover:bg-slate-900/70 hover:text-slate-100 border border-transparent hover:border-slate-800"
              >
                Log In
              </button>
              <button
                onClick={onSignUp}
                className="px-3.5 py-1.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-semibold hover:bg-sky-400"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
