"use client";

import { wcagContrast } from "culori";
import type { ColorStop } from "@/lib/types";
import { getSwatchTextColor } from "@/lib/color";

type Pair = {
  bg: ColorStop;
  text: ColorStop;
  ratio: number;
  level: "AAA" | "AA";
};

function findSafePairs(stops: ColorStop[]): Pair[] {
  const pairs: Pair[] = [];

  for (const bg of stops) {
    for (const text of stops) {
      if (bg.step === text.step) continue;

      // Only show pairs with meaningful visual contrast (≥ 3 stops apart)
      const bgIdx   = stops.indexOf(bg);
      const textIdx = stops.indexOf(text);
      if (Math.abs(bgIdx - textIdx) < 3) continue;

      const ratio = wcagContrast(text.hex, bg.hex);
      if (ratio >= 4.5) {
        pairs.push({
          bg,
          text,
          ratio: Math.round(ratio * 10) / 10,
          level: ratio >= 7 ? "AAA" : "AA",
        });
      }
    }
  }

  // Sort by ratio desc, prefer "light bg + dark text" (more common)
  return pairs
    .sort((a, b) => {
      const aIsLight = stops.indexOf(a.bg) < stops.indexOf(a.text);
      const bIsLight = stops.indexOf(b.bg) < stops.indexOf(b.text);
      if (aIsLight !== bIsLight) return aIsLight ? -1 : 1;
      return b.ratio - a.ratio;
    })
    .slice(0, 8);
}

type AccessibilityPanelProps = {
  stops: ColorStop[];
};

export default function AccessibilityPanel({ stops }: AccessibilityPanelProps) {
  const pairs = findSafePairs(stops);

  if (pairs.length === 0) {
    return (
      <p className="text-[11px] text-[#555555] px-5 py-3">
        No accessible pairs found for this palette.
      </p>
    );
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-2">
      <p className="text-[11px] text-[#555555] mb-1 uppercase tracking-wide font-medium">
        Safe pairings · WCAG AA
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {pairs.map((pair, i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden border border-[#2E2E2E]"
          >
            {/* Preview */}
            <div
              className="flex items-center justify-center h-10 text-[13px] font-medium"
              style={{ backgroundColor: pair.bg.hex, color: pair.text.hex }}
            >
              Aa
            </div>

            {/* Labels */}
            <div className="px-2 py-1.5 bg-[#0F0F0F]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#8A8A8A] font-mono">
                  {pair.text.step} on {pair.bg.step}
                </span>
                <span
                  className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                    pair.level === "AAA"
                      ? "bg-[#3DBA6E]/15 text-[#3DBA6E]"
                      : "bg-[#E5A020]/15 text-[#E5A020]"
                  }`}
                >
                  {pair.level}
                </span>
              </div>
              <div className="text-[10px] text-[#555555] font-mono mt-0.5">
                {pair.ratio}:1
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
