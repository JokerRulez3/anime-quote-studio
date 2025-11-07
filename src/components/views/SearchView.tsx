// src/components/views/SearchView.tsx
import React from "react";
import { Loader, Search, Shuffle } from "lucide-react";
import { EMOTIONS } from "../../config/ui";
import { QuoteCard } from "../shared/QuoteCard";

interface SearchViewProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onRunSearch: () => void;
  onEmotionFilter: (emotion: string) => void;
  isLoading: boolean;
  results: any[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectQuote: (q: any) => void;
  onRandom: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  searchQuery,
  onSearchQueryChange,
  onRunSearch,
  onEmotionFilter,
  isLoading,
  results,
  favorites,
  onToggleFavorite,
  onSelectQuote,
  onRandom,
}) => {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050816] text-slate-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            Find Your Quote
          </h1>
        </div>

        {/* Search bar */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex gap-3 items-stretch">
            <div className="flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#0b1020] border border-slate-800">
              <Search size={18} className="text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onRunSearch()}
                placeholder="Search by anime, character, or quote text..."
                className="flex-1 bg-transparent border-none outline-none text-sm md:text-[15px] text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <button
              onClick={onRunSearch}
              className="px-5 md:px-7 py-4 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-sm font-semibold text-slate-50 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Emotion filter chips */}
          <div className="flex flex-wrap gap-2 mt-1 text-[12px]">
            {["all", ...EMOTIONS].map((emotion) => {
              const isAll = emotion === "all";
              const label = isAll ? "All" : emotion.charAt(0).toUpperCase() + emotion.slice(1);
              const isActive = false; // (replace with your actual active state if you have one)

              return (
                <button
                  key={emotion}
                  onClick={() => onEmotionFilter(isAll ? "" : emotion)}
                  className={`px-4 py-1.5 rounded-full font-medium capitalize transition-all duration-200 border 
          ${isActive
                      ? "bg-sky-500 text-white border-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                      : "bg-[#0b1020] border-slate-800 text-slate-300 hover:text-white hover:border-sky-500 hover:bg-sky-500/10"
                    }`}
                >
                  {label}
                </button>
              );
            })}

            {/* Random quick action */}
            <button
              onClick={onRandom}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium border border-slate-800 text-slate-300 hover:border-sky-500 hover:text-white hover:bg-sky-500/10 transition-all"
            >
              <Shuffle size={14} />
              Random
            </button>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader
              size={28}
              className="animate-spin text-sky-500 mb-3"
            />
            <p className="text-slate-400 text-sm">
              Searching quotes...
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-slate-400 text-sm mb-2">
              No results yet.
            </p>
            <p className="text-slate-500 text-xs max-w-md">
              Try a character name (e.g.{" "}
              <span className="text-slate-300">Luffy</span>), anime
              title (<span className="text-slate-300">Naruto</span>), or
              a word from the quote you remember. You can also tap an
              emotion tag above.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {results.map((q) => (
              <QuoteCard
                key={q.id}
                quote={q}
                isFavorite={favorites.includes(String(q.id))}
                onToggleFavorite={() => onToggleFavorite(String(q.id))}
                onSelect={() => onSelectQuote(q)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
