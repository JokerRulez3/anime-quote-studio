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
  "px-3 py-2 rounded-full text-sm font-medium transition-colors";
  const inactive =
    "text-slate-400 hover:text-slate-100 hover:bg-slate-900/70";
  const active =
    "text-slate-100 bg-slate-900/95 border border-slate-700 shadow-sm";

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[#050816] border-b border-slate-900/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        {/* Logo */}
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 text-slate-100 hover:text-sky-400 transition-colors"
        >
          <span className="text-xl leading-none">❝❞</span>
          <span className="font-semibold tracking-tight text-base md:text-lg">
            Anime Quote Studio
          </span>
        </button>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-2">
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

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 border border-slate-800 text-[10px] text-slate-200">
                {isPro ? (
                  <Crown size={14} className="text-yellow-300" />
                ) : (
                  <User size={14} className="text-slate-500" />
                )}
                <span className="capitalize">{planKey}</span>
                <span className="text-slate-600">•</span>
                <span className="max-w-[90px] truncate">
                  {user.email?.split("@")[0] ?? "creator"}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-full bg-slate-900 text-slate-200 text-[10px] hover:bg-slate-800 flex items-center gap-1"
              >
                <LogOut size={12} />
                <span>Log out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSignIn}
                className="px-3 py-2 rounded-full text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-900/80"
              >
                Log In
              </button>
              <button
                onClick={onSignUp}
                className="px-3.5 py-1.5 rounded-full text-sm bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400"
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
