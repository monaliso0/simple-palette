"use client";

import { useState, useEffect, useRef } from "react";
import { generateExport, FORMAT_META } from "@/lib/export";
import type { ExportMode } from "@/lib/export";
import type { Palette, ExportFormat } from "@/lib/types";

type ExportModalProps = {
  palettes: Palette[];
  onClose: () => void;
};

const FORMATS: ExportFormat[] = ["json", "css", "tailwind", "figma"];
const MODES: { value: ExportMode; label: string; note?: string }[] = [
  { value: "light", label: "Light only" },
  { value: "dark",  label: "Dark only" },
  { value: "both",  label: "Both",     note: "Requires Figma paid plan for Variables modes" },
];

export default function ExportModal({ palettes, onClose }: ExportModalProps) {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("json");
  const [activeMode, setActiveMode]     = useState<ExportMode>("light");
  const [copyLabel, setCopyLabel]       = useState("Copy");
  const copyTimer                       = useRef<ReturnType<typeof setTimeout>>(undefined);
  const backdropRef                     = useRef<HTMLDivElement>(null);

  const code = generateExport(palettes, activeFormat, activeMode);
  const meta = FORMAT_META[activeFormat];

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Trap scroll behind modal
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleCopy() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => fallbackCopy(code));
    } else {
      fallbackCopy(code);
    }
    clearTimeout(copyTimer.current);
    setCopyLabel("Copied!");
    copyTimer.current = setTimeout(() => setCopyLabel("Copy"), 2000);
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
  }

  function handleDownload() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = meta.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  const currentModeNote = MODES.find((m) => m.value === activeMode)?.note;
  const showNote = activeMode === "both" && activeFormat === "figma";

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-2xl bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#2E2E2E]">
          <span className="text-sm font-semibold text-[#F5F5F5]">Export tokens</span>
          <button
            onClick={onClose}
            className="text-[#555555] hover:text-[#F5F5F5] transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* ── Format tabs + Mode selector ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#2E2E2E]">
          {/* Format tabs */}
          <div className="flex gap-1">
            {FORMATS.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setActiveFormat(fmt)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  activeFormat === fmt
                    ? "bg-[#2E2E2E] text-[#F5F5F5]"
                    : "text-[#8A8A8A] hover:text-[#F5F5F5]"
                }`}
              >
                {FORMAT_META[fmt].label}
              </button>
            ))}
          </div>

          {/* Mode pills */}
          <div className="flex items-center gap-1 bg-[#111] rounded-lg p-0.5">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setActiveMode(m.value)}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  activeMode === m.value
                    ? "bg-[#2E2E2E] text-[#F5F5F5]"
                    : "text-[#666] hover:text-[#F5F5F5]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Figma "Both" note ── */}
        {showNote && currentModeNote && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-[#1E1600] border border-[#3D2E00] text-[11px] text-[#B87700]">
            ⚠ {currentModeNote}
          </div>
        )}

        {/* ── Code area ── */}
        <div className="flex-1 overflow-auto mx-5 mt-3 mb-4 rounded-lg bg-[#0A0A0A] border border-[#2E2E2E]">
          <pre className="p-4 text-[12px] font-mono text-[#8A8A8A] leading-relaxed whitespace-pre overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 px-5 pb-5">
          {/* Palette summary */}
          <span className="text-[11px] text-[#555555] flex-1">
            {palettes.length} palette{palettes.length !== 1 ? "s" : ""} ·{" "}
            {palettes.reduce((acc, p) => acc + p.stops.length, 0)} tokens ·{" "}
            {activeMode === "both" ? "light + dark" : activeMode + " mode"}
          </span>

          <button
            onClick={handleDownload}
            className="h-9 px-4 rounded-lg border border-[#3D3D3D] text-[13px] text-[#8A8A8A] hover:text-[#F5F5F5] hover:border-[#555555] transition-colors"
          >
            Download
          </button>

          <button
            onClick={handleCopy}
            className="h-9 px-4 rounded-lg bg-white text-[#0F0F0F] text-[13px] font-medium hover:bg-[#E0E0E0] transition-colors min-w-[80px]"
          >
            {copyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
