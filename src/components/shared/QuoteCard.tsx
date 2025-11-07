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
  const charName = quote.character?.name ?? "Unknown";
  const animeTitle = quote.anime?.title ?? "Unknown Anime";
  const emotion = quote.emotion ?? "";
  const episode = quote.episode_number ? `Ep ${quote.episode_number}` : "";

  return (
    <div
      onClick={onSelect}
      className="group relative flex flex-col justify-between rounded-2xl bg-[#0b1020] border border-slate-800 hover:border-sky-600/60 hover:bg-[#0f172a] transition-all p-6 cursor-pointer shadow-[0_8px_25px_rgba(0,0,0,0.25)]"
    >
      {/* Quote Text */}
      <p className="text-slate-100 text-base md:text-lg leading-relaxed mb-5 font-medium">
        “{quote.quote_text}”
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs md:text-sm text-slate-400">
        <div className="flex flex-col">
          <span className="text-sky-400 font-medium">{charName}</span>
          <span className="text-slate-500 text-[11px] md:text-xs">
            {animeTitle} {episode && <>&nbsp;•&nbsp;{episode}</>}
          </span>
        </div>

        {/* Right side: emotion tag + favorite */}
        <div className="flex items-center gap-2">
          {emotion && (
            <span className="px-2.5 py-1 rounded-full bg-slate-900 text-[11px] text-slate-300 border border-slate-700">
              {emotion}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="p-1 rounded-full hover:bg-slate-800 transition-colors"
            aria-label="Toggle favorite"
          >
            <Heart
              size={16}
              className={`transition-colors ${
                isFavorite ? "fill-sky-400 text-sky-400" : "text-slate-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Hover Glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition bg-gradient-to-br from-sky-500 via-purple-500 to-indigo-500 pointer-events-none" />
    </div>
  );
};
