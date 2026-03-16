"use client";

import { useState, useRef, useEffect } from "react";
import { getSwatchTextColor, getContrastDotColor, isValidColor, normalizeHex } from "@/lib/color";
import type { ColorStop } from "@/lib/types";

type SwatchProps = {
  stop: ColorStop;
  isBase: boolean;
  index: number;
  onCopy: (hex: string) => void;
  onLock: (step: number, hex: string) => void;
  onUnlock: (step: number) => void;
};

export default function Swatch({
  stop,
  isBase,
  index,
  onCopy,
  onLock,
  onUnlock,
}: SwatchProps) {
  const [isEditing, setIsEditing]   = useState(false);
  const [editValue, setEditValue]   = useState(stop.hex);
  const [editError, setEditError]   = useState(false);
  const inputRef                    = useRef<HTMLInputElement>(null);

  const textColor = getSwatchTextColor(stop.hex);
  const dotColor  = getContrastDotColor(stop.contrast.ratio);

  // Sync edit value when stop changes externally
  useEffect(() => {
    if (!isEditing) setEditValue(stop.hex);
  }, [stop.hex, isEditing]);

  // ── Interactions ──────────────────────────────────────────────────────────

  function handleClick() {
    if (isEditing) return;
    navigator.clipboard.writeText(stop.hex).catch(() => {});
    onCopy(stop.hex);
  }

  function handleDoubleClick() {
    setEditValue(stop.hex);
    setEditError(false);
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  function handleLockIconClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (stop.isLocked) {
      onUnlock(stop.step);
    } else {
      handleDoubleClick();
    }
  }

  function commitEdit() {
    const normalized = normalizeHex(editValue);
    if (!isValidColor(normalized)) {
      setEditError(true);
      return;
    }
    setIsEditing(false);
    setEditError(false);
    onLock(stop.step, normalized);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditValue(stop.hex);
    setEditError(false);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="relative flex-1 flex flex-col justify-end p-2 cursor-pointer group swatch-cell select-none"
      style={{
        backgroundColor: stop.hex,
        height: "88px",
        minWidth: "60px",
        animationDelay: `${index * 20}ms`,
      }}
      title={isEditing ? undefined : `Click to copy · Double-click to edit`}
    >
      {/* Base stop marker */}
      {isBase && !isEditing && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ backgroundColor: `${textColor}50` }}
        />
      )}

      {/* Contrast dot — always visible */}
      {!isEditing && (
        <div
          className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full"
          style={{ backgroundColor: dotColor }}
          title={`${stop.contrast.ratio.toFixed(1)}:1`}
        />
      )}

      {/* Lock / edit icon — top-left, visible on hover or when locked */}
      {!isEditing && (
        <button
          onClick={handleLockIconClick}
          className={`absolute top-2 left-2 transition-opacity duration-100 text-[10px] leading-none ${
            stop.isLocked
              ? "opacity-70"
              : "opacity-0 group-hover:opacity-40 hover:!opacity-80"
          }`}
          style={{ color: textColor }}
          title={stop.isLocked ? "Locked — click to reset" : "Double-click to edit and lock"}
        >
          {stop.isLocked ? "🔒" : "✎"}
        </button>
      )}

      {/* Hover overlay (copy feedback) */}
      {!isEditing && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 bg-white/[0.06]" />
      )}

      {/* Edit mode overlay */}
      {isEditing && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => { setEditValue(e.target.value); setEditError(false); }}
            onKeyDown={handleEditKeyDown}
            onBlur={commitEdit}
            spellCheck={false}
            className={`w-[72px] bg-transparent text-center font-mono text-[11px] outline-none border-b pb-0.5 transition-colors ${
              editError ? "border-[#E5483D] text-[#E5483D]" : "border-white/60 text-white"
            }`}
          />
          <span className="text-[9px] text-white/40">Enter ↵  Esc ✕</span>
        </div>
      )}

      {/* Labels — hidden while editing */}
      {!isEditing && (
        <div className="relative" style={{ color: textColor }}>
          <div className="text-[11px] leading-none">{stop.step}</div>
          <div className="text-[11px] leading-none font-mono mt-[3px]">{stop.hex}</div>
        </div>
      )}
    </div>
  );
}
