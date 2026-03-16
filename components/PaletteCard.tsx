"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import StepBadge from "./StepBadge";
import SliderRow from "./SliderRow";
import {
  generateScale,
  generateDarkScale,
  getColorHue,
  getColorSaturation,
  setHue,
  setSaturation,
  adjustColorToStep,
  getSwatchTextColor,
  suggestName,
  detectAnchorStep,
  isValidColor,
  normalizeHex,
  getHueGradient,
  getColorLightness,
  HUE_START,
} from "@/lib/color";
import type { Palette, StopCount, ColorStop } from "@/lib/types";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconTrash() {
  return <Image src="/trash.svg" alt="Remove" width={24} height={24} />;
}

function IconFilter() {
  return <Image src="/filter.svg" alt="Edit palette" width={24} height={24} />;
}

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type EditState = {
  baseColor: string;
  hue: number;
  saturation: number;
  anchorStep: number;
  name: string;
  hexInput: string;
  hexError: boolean;
  nameEditing: boolean;
};

type PaletteCardProps = {
  palette: Palette;
  stopCount: StopCount;
  darkMode: boolean;
  onUpdate: (id: string, updates: Partial<Palette>) => void;
  onRemove: (id: string) => void;
  onCopy: (hex: string) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
};

// ─── PaletteCard ──────────────────────────────────────────────────────────────

export default function PaletteCard({
  palette,
  stopCount,
  darkMode,
  onUpdate,
  onRemove,
  onCopy,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: PaletteCardProps) {
  // ── View mode state ───────────────────────────────────────────────────────
  const [nameInput, setNameInput]         = useState(palette.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [hoveredStep, setHoveredStep]     = useState<number | null>(null);
  const nameRef                           = useRef<HTMLInputElement>(null);

  // ── Edit mode state ───────────────────────────────────────────────────────
  const [editMode, setEditMode]   = useState(false);
  const [edit, setEdit]           = useState<EditState | null>(null);
  const editNameRef               = useRef<HTMLInputElement>(null);

  // ── View: name commit ─────────────────────────────────────────────────────
  function commitName() {
    const trimmed = nameInput.trim() || suggestName(palette.baseColor);
    setNameInput(trimmed);
    onUpdate(palette.id, { name: trimmed });
  }

  // ── View: row click copies hex ────────────────────────────────────────────
  function execCopy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
  }

  function handleRowClick(hex: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hex).catch(() => execCopy(hex));
    } else {
      execCopy(hex);
    }
    onCopy(hex);
  }

  // ── Enter edit mode ───────────────────────────────────────────────────────
  function enterEditMode() {
    setEdit({
      baseColor:   palette.baseColor,
      hue:         getColorHue(palette.baseColor),
      saturation:  getColorSaturation(palette.baseColor),
      anchorStep:  palette.baseStep,
      name:        palette.name,
      hexInput:    palette.baseColor,
      hexError:    false,
      nameEditing: false,
    });
    setEditMode(true);
  }

  // ── Edit: patch helper ────────────────────────────────────────────────────
  function patchEdit(p: Partial<EditState>) {
    setEdit((prev) => prev ? { ...prev, ...p } : prev);
  }

  // ── Edit: apply color ─────────────────────────────────────────────────────
  function applyEditColor(hex: string, fromHexInput = false) {
    if (!edit) return;
    patchEdit({
      baseColor:  hex,
      hue:        getColorHue(hex),
      saturation: getColorSaturation(hex),
      anchorStep: detectAnchorStep(hex, stopCount),
      hexError:   false,
      ...(fromHexInput ? {} : { hexInput: hex }),
      name: edit.nameEditing ? edit.name : suggestName(hex),
    });
  }

  // ── Edit: hue slider ──────────────────────────────────────────────────────
  function handleEditHue(displayHue: number) {
    if (!edit) return;
    const newHue  = (displayHue + HUE_START) % 360;
    const withHue = setHue(edit.baseColor, newHue);
    const newHex  = setSaturation(withHue, edit.saturation);
    patchEdit({
      baseColor: newHex,
      hue:       newHue,
      hexInput:  newHex,
      hexError:  false,
      name: edit.nameEditing ? edit.name : suggestName(newHex),
    });
  }

  // ── Edit: saturation slider ───────────────────────────────────────────────
  function handleEditSat(newSat: number) {
    if (!edit) return;
    // Re-apply current hue first so it's never lost when baseColor is gray
    const withHue = setHue(edit.baseColor, edit.hue);
    const newHex  = setSaturation(withHue, newSat);
    patchEdit({
      baseColor:  newHex,
      saturation: newSat,
      hexInput:   newHex,
      hexError:   false,
      name: edit.nameEditing ? edit.name : suggestName(newHex),
    });
  }

  // ── Edit: step change ─────────────────────────────────────────────────────
  function handleEditStep(step: number) {
    if (!edit) return;
    const adjusted = adjustColorToStep(edit.baseColor, step);
    const withHue  = setHue(adjusted, edit.hue);
    const newHex   = setSaturation(withHue, edit.saturation);
    patchEdit({
      baseColor:  newHex,
      anchorStep: step,
      hexInput:   newHex,
      hexError:   false,
      name: edit.nameEditing ? edit.name : suggestName(newHex),
    });
  }

  // ── Edit: apply (update palette) ─────────────────────────────────────────
  function handleUpdate() {
    if (!edit) return;
    const hex       = edit.baseColor;
    const stops     = generateScale(hex, stopCount, new Map(), edit.anchorStep);
    const darkStops = generateDarkScale(hex, stopCount, new Map(), edit.anchorStep);
    onUpdate(palette.id, {
      baseColor: hex,
      baseStep:  edit.anchorStep,
      stops,
      darkStops,
      name:      edit.name.trim() || suggestName(hex),
    });
    setNameInput(edit.name.trim() || suggestName(hex));
    setEditMode(false);
    setEdit(null);
  }

  // ── Edit: cancel ─────────────────────────────────────────────────────────
  function handleCancelEdit() {
    setEditMode(false);
    setEdit(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT MODE render
  // ─────────────────────────────────────────────────────────────────────────
  if (editMode && edit) {
    const textColor    = getSwatchTextColor(edit.baseColor);
    const colorWithHue = setHue(edit.baseColor, edit.hue);
    const hueGradient  = getHueGradient(getColorLightness(edit.baseColor), edit.saturation);
    const grayHex      = setSaturation(colorWithHue, 0);
    const fullSatHex   = setSaturation(colorWithHue, 100);
    const satGradient  = `linear-gradient(90deg, ${grayHex} 0%, ${fullSatHex} 100%)`;

    return (
      <div className="flex-shrink-0 w-[320px] flex flex-col gap-2">

        {/* Editor card */}
        <div className="border border-[#E7E7E7] rounded-3xl p-3 flex flex-col gap-2">

          {/* Color preview */}
          <div
            className="w-full aspect-square rounded-xl flex flex-col justify-between px-3 py-6"
            style={{ backgroundColor: edit.baseColor }}
          >
            {/* Name */}
            <div>
              {edit.nameEditing ? (
                <input
                  ref={editNameRef}
                  type="text"
                  value={edit.name}
                  onChange={(e) => patchEdit({ name: e.target.value })}
                  onBlur={() => patchEdit({ nameEditing: false })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") patchEdit({ nameEditing: false });
                  }}
                  autoFocus
                  className="bg-transparent text-[20px] font-normal tracking-[-0.4px] outline-none border-b pb-0.5 w-full"
                  style={{ color: textColor, borderColor: `${textColor}40` }}
                />
              ) : (
                <button
                  onClick={() => { patchEdit({ nameEditing: true }); setTimeout(() => editNameRef.current?.select(), 0); }}
                  className="text-[20px] font-normal tracking-[-0.4px] text-left hover:opacity-60 transition-opacity cursor-text"
                  style={{ color: textColor }}
                >
                  {edit.name}
                </button>
              )}
            </div>

            {/* Hex + step badge */}
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <span className="text-[28px] font-normal tracking-[-0.56px] opacity-25" style={{ color: textColor }}>#</span>
                <input
                  type="text"
                  value={edit.hexInput.startsWith("#") ? edit.hexInput.slice(1).toUpperCase() : edit.hexInput.toUpperCase()}
                  onChange={(e) => {
                    patchEdit({ hexInput: e.target.value });
                    const norm = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                    const n = normalizeHex(norm);
                    if (isValidColor(n)) applyEditColor(n, true);
                    else patchEdit({ hexError: true });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                  maxLength={6}
                  spellCheck={false}
                  className={`flex-1 min-w-0 bg-transparent text-[28px] font-normal tracking-[-0.56px] outline-none uppercase ${edit.hexError ? "opacity-30" : ""}`}
                  style={{ color: textColor }}
                />
              </div>
              <StepBadge
                step={edit.anchorStep}
                stopCount={stopCount}
                badgeBg="rgba(255,255,255,0.9)"
                badgeColor="#000"
                onSelect={handleEditStep}
              />
            </div>
          </div>

          {/* Hue slider — value is display-offset (0=red) */}
          <SliderRow
            label="Hue"
            value={(edit.hue - HUE_START + 360) % 360}
            min={0}
            max={359}
            sliderClass="hue-slider"
            sliderStyle={{ background: hueGradient }}
            onChange={handleEditHue}
          />

          {/* Saturation slider */}
          <SliderRow
            label="Saturation"
            value={edit.saturation}
            min={0}
            max={100}
            sliderClass="sat-slider"
            sliderStyle={{ background: satGradient }}
            onChange={handleEditSat}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 items-center">
          <button
            onClick={handleCancelEdit}
            className="h-[48px] w-[156px] flex-shrink-0 rounded-2xl bg-[#F1F1F1] text-black text-[16px] font-medium tracking-[-0.32px] hover:bg-[#E7E7E7] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpdate}
            className="flex-1 h-[48px] rounded-2xl bg-black text-white text-[16px] font-medium tracking-[-0.32px] hover:bg-[#222] transition-colors"
          >
            Atualizar
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW MODE render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const cardBorder  = darkMode ? "border-[#2c2c2c]" : "border-[#E7E7E7]";
  const cardHover   = darkMode ? "hover:border-[#3c3c3c]" : "hover:border-[#CCCCCC]";
  const nameColor   = darkMode ? "text-white" : "text-black";
  const inputBorder = darkMode ? "border-white/20" : "border-black/20";
  const iconHoverBg = darkMode ? "hover:bg-[#1c1c1c]" : "hover:bg-[#F0F0F0]";

  function StopRows({ stops, baseStep }: { stops: ColorStop[]; baseStep: number }) {
    return (
      <div className="flex flex-col overflow-hidden rounded-xl">
        {stops.map((stop) => {
          const textColor = getSwatchTextColor(stop.hex);
          const isBase    = stop.step === baseStep;
          const isHov     = hoveredStep === stop.step;

          return (
            <button
              key={stop.step}
              onClick={() => handleRowClick(stop.hex)}
              onMouseEnter={() => setHoveredStep(stop.step)}
              onMouseLeave={() => setHoveredStep(null)}
              className="flex items-center gap-2.5 h-[56px] px-4 w-full"
              style={{ backgroundColor: stop.hex, color: textColor }}
              title={`Copy ${stop.hex}`}
            >
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="opacity-25 text-[14px] tracking-[-0.49px]">#</span>
                <span className={`text-[14px] tracking-[-0.49px] ${isBase ? "font-semibold" : "font-normal"}`}>
                  {stop.hex.slice(1).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isHov && (
                  <span style={{ color: textColor }} className="opacity-50">
                    <IconCopy />
                  </span>
                )}
                <span className={`text-[14px] tabular-nums ${isBase ? "font-semibold" : "font-normal"}`}>
                  {stop.step}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW MODE render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`
        flex-shrink-0 flex gap-2
        cursor-grab active:cursor-grabbing select-none transition-all
        ${isDragOver ? "opacity-70 scale-[0.98]" : ""}
      `}
    >
      {/* ── Light column ───────────────────────────────────────────────── */}
      <div className={`w-[320px] border ${cardBorder} ${cardHover} rounded-3xl p-3 flex flex-col gap-3 transition-colors`}>

        {/* Header */}
        <div className="flex items-center gap-2 h-[56px] px-1">

          <div className="flex-1 min-w-0 flex items-center gap-2">
            {isEditingName ? (
              <input
                ref={nameRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={() => { setIsEditingName(false); commitName(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter")  { setIsEditingName(false); commitName(); }
                  if (e.key === "Escape") { setIsEditingName(false); setNameInput(palette.name); }
                }}
                autoFocus
                className={`flex-1 min-w-0 bg-transparent text-[20px] font-normal tracking-[-0.7px] ${nameColor} outline-none border-b ${inputBorder} pb-0.5`}
              />
            ) : (
              <button
                onClick={() => { setIsEditingName(true); setTimeout(() => nameRef.current?.select(), 0); }}
                className={`flex-1 min-w-0 text-left text-[20px] font-normal tracking-[-0.7px] ${nameColor} truncate cursor-text hover:underline underline-offset-2`}
                title="Click to rename"
              >
                {palette.name}
              </button>
            )}
            <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${darkMode ? "bg-white/10 text-white/40" : "bg-black/5 text-black/35"}`}>
              Light
            </span>
          </div>

          <button
            onClick={() => onRemove(palette.id)}
            className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ${iconHoverBg} transition-colors`}
            title="Remove palette"
          >
            <IconTrash />
          </button>
          <button
            onClick={enterEditMode}
            className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ${iconHoverBg} transition-colors`}
            title="Edit palette"
          >
            <IconFilter />
          </button>
        </div>

        <StopRows stops={palette.stops} baseStep={palette.baseStep} />
      </div>

      {/* ── Dark column ────────────────────────────────────────────────── */}
      {palette.darkStops?.length > 0 && (
        <div className={`w-[320px] border ${cardBorder} ${cardHover} rounded-3xl p-3 flex flex-col gap-3 transition-colors`}>

          {/* Header */}
          <div className="flex items-center gap-2 h-[56px] px-1">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className={`text-[20px] font-normal tracking-[-0.7px] ${nameColor} truncate`}>
                {palette.name}
              </span>
              <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${darkMode ? "bg-white/10 text-white/40" : "bg-black/5 text-black/35"}`}>
                Dark
              </span>
            </div>

            <button
              onClick={() => onRemove(palette.id)}
              className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ${iconHoverBg} transition-colors`}
              title="Remove palette"
            >
              <IconTrash />
            </button>
            <button
              onClick={enterEditMode}
              className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl ${iconHoverBg} transition-colors`}
              title="Edit palette"
            >
              <IconFilter />
            </button>
          </div>

          <StopRows stops={palette.darkStops} baseStep={palette.baseStep} />
        </div>
      )}
    </div>
  );
}
