// src/components/layout/TopNav.tsx
import React from "react";
import { Crown, LogOut, User } from "lucide-react";
import type { PlanKey } from "../../config/ui";

interface TopNavProps {
  user: any;
  planKey: PlanKey;
  onLogoClick: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
  rightSlot?: React.ReactNode;
  showAuthButtons?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  user,
  planKey,
  onLogoClick,
  onSignIn,
  onSignUp,
  onSignOut,
  rightSlot,
  showAuthButtons = true,
}) => {
  const isPro = planKey === "pro";

  return (
    <header className="border-b border-slate-900/80 bg-slate-950/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 text-slate-100 hover:text-indigo-400 transition"
        >
          <span className="text-xl">〃</span>
          <span className="font-semibold tracking-tight text-sm md:text-base">
            Anime Quote Studio
          </span>
        </button>

        <div className="flex items-center gap-2">
          {rightSlot}
          {showAuthButtons && (
            <>
              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-xs text-slate-200">
                    {isPro ? (
                      <Crown size={14} className="text-yellow-300" />
                    ) : (
                      <User size={14} className="text-slate-500" />
                    )}
                    <span className="capitalize">{planKey}</span>
                    <span className="text-slate-600">•</span>
                    <span className="max-w-[90px] truncate">
                      {user.email?.split("@")[0]}
                    </span>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-slate-300 text-xs hover:bg-slate-800"
                  >
                    <LogOut size={14} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onSignIn}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-slate-200 text-xs hover:bg-slate-800"
                  >
                    Log In
                  </button>
                  <button
                    onClick={onSignUp}
                    className="px-3 py-2 rounded-lg bg-indigo-500 text-slate-950 text-xs font-semibold hover:bg-indigo-400"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
