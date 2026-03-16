"use client";

import { useState, useRef } from "react";
import { STOP_SETS } from "@/lib/color";
import type { StopCount } from "@/lib/types";

type StepBadgeProps = {
  step: number;
  stopCount: StopCount;
  /** Badge pill background (rgba string or hex) */
  badgeBg?: string;
  /** Badge pill text color */
  badgeColor?: string;
  onSelect: (step: number) => void;
};

/**
 * Step badge button that opens a fixed-position dropdown.
 * Uses position:fixed for the menu so it is never clipped by parent overflow.
 */
export default function StepBadge({
  step,
  stopCount,
  badgeBg = "rgba(255,255,255,0.9)",
  badgeColor = "#000",
  onSelect,
}: StepBadgeProps) {
  const [open, setOpen]         = useState(false);
  const [menuPos, setMenuPos]   = useState<{ top: number; left: number } | null>(null);
  const btnRef                  = useRef<HTMLButtonElement>(null);
  const steps                   = STOP_SETS[stopCount];

  function handleOpen() {
    if (!btnRef.current) return;
    // getBoundingClientRect is viewport-relative — correct for position:fixed
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({
      top:  rect.top + rect.height / 2,
      left: rect.right + 10,
    });
    setOpen(true);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="h-8 px-4 rounded-full text-[14px] font-medium flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: badgeBg, color: badgeColor }}
        title="Change base step"
      >
        {step}
      </button>

      {open && menuPos && (
        <>
          {/* Backdrop — closes menu on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown — fixed so it escapes all overflow containers */}
          <div
            className="fixed z-50 bg-white border border-[#E7E7E7] rounded-2xl shadow-xl py-1.5 w-[88px] max-h-[320px] overflow-y-auto"
            style={{
              top:       menuPos.top,
              left:      menuPos.left,
              transform: "translateY(-50%)",
            }}
          >
            <p className="text-[10px] text-black/35 font-medium uppercase tracking-wide px-3 pt-1 pb-0.5 sticky top-0 bg-white">
              Base step
            </p>
            {steps.map((s) => (
              <button
                key={s}
                onClick={() => { onSelect(s); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[14px] transition-colors hover:bg-[#F7F7F7] ${
                  s === step ? "font-semibold text-black" : "font-normal text-black/60"
                }`}
              >
                {s}{s === step ? " ✓" : ""}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
