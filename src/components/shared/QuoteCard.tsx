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
  const anime =
    quote?.anime?.title ?? quote?.anime_title ?? "";
  const ep = quote?.episode_number;

  return (
    <article
      onClick={onSelect}
      className="group bg-[#0b1020] border border-slate-800/90 hover:border-sky-500/70 rounded-2xl px-6 py-5 flex flex-col gap-2 cursor-pointer transition-colors transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(5,8,22,0.85)]"
    >
      {/* Top row: quote + heart */}
      <div className="flex items-start gap-3">
        <p className="flex-1 text-[15px] leading-relaxed text-slate-100">
          “{quote.quote_text}”
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`mt-1 p-1 rounded-full transition-colors ${
            isFavorite
              ? "text-rose-400"
              : "text-slate-500 hover:text-rose-400"
          }`}
        >
          <Heart
            size={18}
            className="transition-transform group-hover:scale-110"
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      {/* Bottom row: meta */}
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 text-[11px] leading-snug">
          {character && (
            <span className="text-sky-400 font-semibold group-hover:text-sky-300">
              {character}
            </span>
          )}
          {(anime || ep) && (
            <span className="text-slate-500">
              {anime && <>{anime}</>}
              {anime && ep && <span className="mx-1 text-slate-600">•</span>}
              {ep && <>Ep {ep}</>}
            </span>
          )}
        </div>
        {quote.emotion && (
          <span className="ml-auto px-3 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-[9px] uppercase tracking-wide text-slate-400">
            {quote.emotion}
          </span>
        )}
      </div>
    </article>
  );
};
