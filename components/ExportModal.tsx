"use client";

import { useState, useEffect, useRef } from "react";
import { generateExport, FORMAT_META } from "@/lib/export";
import type { Palette, ExportFormat } from "@/lib/types";

type ExportModalProps = {
  palettes: Palette[];
  onClose: () => void;
};

const FORMATS: ExportFormat[] = ["json", "css", "tailwind", "figma"];

export default function ExportModal({ palettes, onClose }: ExportModalProps) {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("json");
  const [copyLabel, setCopyLabel]       = useState("Copy");
  const copyTimer                       = useRef<ReturnType<typeof setTimeout>>(undefined);
  const backdropRef                     = useRef<HTMLDivElement>(null);

  const code = generateExport(palettes, activeFormat);
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
    navigator.clipboard.writeText(code).catch(() => {});
    clearTimeout(copyTimer.current);
    setCopyLabel("Copied!");
    copyTimer.current = setTimeout(() => setCopyLabel("Copy"), 2000);
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

        {/* ── Format tabs ── */}
        <div className="flex gap-0 px-5 pt-4">
          {FORMATS.map((fmt) => (
            <button
              key={fmt}
              onClick={() => setActiveFormat(fmt)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md mr-1 transition-colors ${
                activeFormat === fmt
                  ? "bg-[#2E2E2E] text-[#F5F5F5]"
                  : "text-[#8A8A8A] hover:text-[#F5F5F5]"
              }`}
            >
              {FORMAT_META[fmt].label}
            </button>
          ))}
        </div>

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
            {palettes.reduce((acc, p) => acc + p.stops.length, 0)} tokens
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
