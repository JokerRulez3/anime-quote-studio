// src/components/shared/QuoteCard.tsx
import React from "react";
import { Heart } from "lucide-react";

interface QuoteCardProps {
  quote: any;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSelect: () => void;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  isFavorite,
  onToggleFavorite,
  onSelect,
}) => {
  const character =
    quote?.character?.name ?? quote?.character_name ?? "";
  const anime = quote?.anime?.title ?? quote?.anime_title ?? "";

  return (
    <article
      className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2 hover:border-indigo-500/70 hover:-translate-y-0.5 hover:shadow-xl transition cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex justify-between items-start gap-3">
        <p className="text-sm text-slate-100 leading-relaxed">
          “{quote.quote_text}”
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={
            isFavorite
              ? "text-rose-400"
              : "text-slate-500 hover:text-rose-400"
          }
        >
          <Heart
            size={18}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
        <div>
          {character && (
            <span className="text-indigo-300 font-medium">
              {character}
            </span>
          )}
          {anime && (
            <>
              {character && <span className="text-slate-600"> • </span>}
              <span>{anime}</span>
            </>
          )}
          {quote.episode_number && (
            <span className="text-slate-600">
              {" "}
              • Ep {quote.episode_number}
            </span>
          )}
        </div>
        {quote.emotion && (
          <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[9px] text-slate-400">
            {quote.emotion}
          </span>
        )}
      </div>
    </article>
  );
};
