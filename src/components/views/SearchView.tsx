// src/components/views/SearchView.tsx
import React from "react";
import { EMOTIONS } from "../../config/ui";
import { Loader, Search, Shuffle } from "lucide-react";
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
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Find Your Quote
          </h1>
          <button
            onClick={onRandom}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-xs text-slate-100 hover:bg-slate-800 self-start md:self-auto"
          >
            <Shuffle size={14} /> Random quote
          </button>
        </div>

        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800">
              <Search size={16} className="text-slate-500" />
              <input
                type="text"
                placeholder="Search by anime, character, or quote text..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onRunSearch()}
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              onClick={onRunSearch}
              className="px-5 py-3 rounded-xl bg-indigo-500 text-slate-950 text-sm font-semibold hover:bg-indigo-400"
            >
              Search
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
            {EMOTIONS.map((e) => (
              <button
                key={e}
                onClick={() => onEmotionFilter(e)}
                className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:text-indigo-300 transition"
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader className="animate-spin mx-auto mb-3 text-indigo-500" size={32} />
            <p className="text-slate-500 text-sm">Searching quotes...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm mb-4">
              Try a character name (e.g. “Luffy”), anime title (“Naruto”), or a
              phrase you remember.
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
