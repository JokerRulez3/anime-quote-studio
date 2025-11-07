// src/config/ui.ts

export const BACKGROUNDS = [
  { id: 1, name: "Midnight", css: "linear-gradient(135deg, #111827 0%, #1f2937 100%)" },
  { id: 2, name: "Indigo Glow", css: "linear-gradient(135deg, #312e81 0%, #4f46e5 100%)" },
  { id: 3, name: "Sakura", css: "linear-gradient(135deg, #f472b6 0%, #fb7185 100%)" },
  { id: 4, name: "Neon Blue", css: "linear-gradient(135deg, #1d4ed8 0%, #22c55e 100%)" },
  { id: 5, name: "Sunset", css: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)" },
  { id: 6, name: "Void", css: "linear-gradient(135deg, #020817 0%, #111827 100%)" },
  { id: 7, name: "Royal Purple", css: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)" },
  { id: 8, name: "Aurora", css: "linear-gradient(135deg, #4f46e5 0%, #a855f7 50%, #ec4899 100%)" },
];

export const FONTS = [
  { id: 1, name: "Serif Classic", css: "Georgia, serif" },
  {
    id: 2,
    name: "Modern Sans",
    css: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  { id: 3, name: "Bold Impact", css: "Impact, system-ui, sans-serif" },
];

export const EMOTIONS = [
  "inspiring",
  "motivational",
  "sad",
  "wholesome",
  "romantic",
  "dark",
  "funny",
];

export type PlanKey = "free" | "basic" | "pro";
export type WatermarkLevel = "full" | "small" | "none";
