"use client";

import { getSwatchTextColor } from "@/lib/color";
import type { ColorStop } from "@/lib/types";

type ContextPreviewProps = {
  stops: ColorStop[];
};

export default function ContextPreview({ stops }: ContextPreviewProps) {
  // Resolve key stops by step number, falling back gracefully
  function stop(step: number): string {
    return stops.find((s) => s.step === step)?.hex
      ?? stops[Math.floor(stops.length / 2)]?.hex
      ?? "#888888";
  }

  const s50  = stop(50);
  const s100 = stop(100);
  const s200 = stop(200);
  const s500 = stop(500);
  const s600 = stop(600);
  const s700 = stop(700);
  const s800 = stop(800);
  const s900 = stop(900);

  const textOn500 = getSwatchTextColor(s500);
  const textOn600 = getSwatchTextColor(s600);

  return (
    <div className="px-5 py-4 flex flex-col gap-3">
      <p className="text-[11px] text-[#555555] uppercase tracking-wide font-medium mb-1">
        Preview in context
      </p>

      <div className="flex flex-wrap gap-3">

        {/* ── Buttons ── */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-[#555555]">Button</span>
          <div className="flex gap-2 items-center">
            {/* Primary */}
            <button
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{ backgroundColor: s500, color: textOn500 }}
            >
              Primary
            </button>
            {/* Secondary (hover state) */}
            <button
              className="px-4 py-2 rounded-lg text-[13px] font-medium border"
              style={{ borderColor: s500, color: s500, backgroundColor: "transparent" }}
            >
              Secondary
            </button>
          </div>
        </div>

        {/* ── Badges ── */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-[#555555]">Badge</span>
          <div className="flex gap-2 items-center">
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ backgroundColor: s100, color: s700 }}
            >
              Active
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ backgroundColor: s500, color: textOn500 }}
            >
              New
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-medium border"
              style={{ borderColor: s200, color: s700, backgroundColor: "transparent" }}
            >
              Draft
            </span>
          </div>
        </div>

        {/* ── Alert / Banner ── */}
        <div className="flex flex-col gap-2 w-full">
          <span className="text-[10px] text-[#555555]">Alert</span>
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-lg border-l-[3px]"
            style={{ backgroundColor: s50, borderLeftColor: s500 }}
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
              style={{ backgroundColor: s500 }}
            />
            <div>
              <p className="text-[13px] font-medium" style={{ color: s800 }}>
                Heads up
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: s700 }}>
                This is how an informational alert looks using your palette.
              </p>
            </div>
          </div>
        </div>

        {/* ── Link ── */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-[#555555]">Link</span>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-[13px] underline underline-offset-2"
            style={{ color: s600 }}
          >
            Learn more →
          </a>
        </div>

      </div>
    </div>
  );
}
