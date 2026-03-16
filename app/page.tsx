"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Header from "@/components/Header";
import PaletteCard from "@/components/PaletteCard";
import ExportModal from "@/components/ExportModal";
import StepBadge from "@/components/StepBadge";
import SliderRow from "@/components/SliderRow";
import {
  generateScale,
  detectAnchorStep,
  detectEdgeCase,
  suggestName,
  isValidColor,
  normalizeHex,
  getColorHue,
  setHue,
  getColorSaturation,
  setSaturation,
  adjustColorToStep,
  getSwatchTextColor,
  getHueGradient,
  getColorLightness,
  HUE_START,
} from "@/lib/color";
import { saveToStorage, saveToURL, loadInitialState } from "@/lib/persistence";
import type { Palette, StopCount } from "@/lib/types";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ hex }: { hex: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-[13px] shadow-xl animate-toast pointer-events-none">
      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: hex }} />
      <span className="font-mono">{hex}</span>
      <span className="opacity-50">copied</span>
    </div>
  );
}

// ─── AddCard ──────────────────────────────────────────────────────────────────

const DEFAULT_COLOR = "#3478F6";

type AddFormState = {
  id: string;
  baseColor: string;
  hue: number;
  saturation: number;
  anchorStep: number;
  name: string;
  nameEditing: boolean;
  hexInput: string;
  hexError: boolean;
  insertAt: number;
};

function makeDefaultForm(stopCount: StopCount, saturation?: number, anchorStep?: number, insertAt = 0): AddFormState {
  const randomHue  = Math.floor(Math.random() * 360);
  const sat        = saturation ?? getColorSaturation(DEFAULT_COLOR);
  const withHueSat = setSaturation(setHue(DEFAULT_COLOR, randomHue), sat);

  let baseColor: string;
  let finalStep: number;

  if (anchorStep !== undefined) {
    const adjusted = adjustColorToStep(withHueSat, anchorStep);
    baseColor = setSaturation(setHue(adjusted, randomHue), sat);
    finalStep = anchorStep;
  } else {
    baseColor = withHueSat;
    finalStep = detectAnchorStep(baseColor, stopCount);
  }

  return {
    id:          crypto.randomUUID(),
    baseColor,
    hue:         randomHue,
    saturation:  sat,
    anchorStep:  finalStep,
    name:        suggestName(baseColor),
    nameEditing: false,
    hexInput:    baseColor,
    hexError:    false,
    insertAt,
  };
}

type AddCardProps = {
  form: AddFormState;
  stopCount: StopCount;
  onUpdate: (id: string, patch: Partial<AddFormState>) => void;
  onAdd: (palette: Palette, saturation: number) => void;
  onCancel: (id: string) => void;
};

function AddCard({ form, stopCount, onUpdate, onAdd, onCancel }: AddCardProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  function patch(p: Partial<AddFormState>) {
    onUpdate(form.id, p);
  }

  function applyColor(hex: string, fromHexInput = false) {
    const newHue = getColorHue(hex);
    const newSat = getColorSaturation(hex);
    const newStep = detectAnchorStep(hex, stopCount);
    patch({
      baseColor: hex,
      hue: newHue,
      saturation: newSat,
      anchorStep: newStep,
      ...(fromHexInput ? {} : { hexInput: hex }),
      hexError: false,
      name: form.nameEditing ? form.name : suggestName(hex),
    });
  }

  function handleHexInput(raw: string) {
    patch({ hexInput: raw });
    const norm = normalizeHex(raw);
    if (isValidColor(norm)) {
      applyColor(norm, true);
    } else {
      patch({ hexError: true });
    }
  }

  function handleHueSlider(displayHue: number) {
    const newHue  = (displayHue + HUE_START) % 360;
    const withHue = setHue(form.baseColor, newHue);
    const newHex  = setSaturation(withHue, form.saturation);
    patch({
      baseColor: newHex,
      hue:       newHue,
      hexInput:  newHex,
      hexError:  false,
      name: form.nameEditing ? form.name : suggestName(newHex),
    });
  }

  function handleSatSlider(newSat: number) {
    // Re-apply current hue first so it's never lost when baseColor is gray
    const withHue = setHue(form.baseColor, form.hue);
    const newHex  = setSaturation(withHue, newSat);
    patch({
      baseColor:  newHex,
      saturation: newSat,
      hexInput:   newHex,
      hexError:   false,
      name: form.nameEditing ? form.name : suggestName(newHex),
    });
  }

  function handleStepSelect(step: number) {
    const adjusted = adjustColorToStep(form.baseColor, step);
    const withHue  = setHue(adjusted, form.hue);
    const newHex   = setSaturation(withHue, form.saturation);
    patch({
      baseColor:  newHex,
      anchorStep: step,
      hexInput:   newHex,
      hexError:   false,
      name: form.nameEditing ? form.name : suggestName(newHex),
    });
  }

  function handleAdd() {
    const hex = normalizeHex(form.hexInput);
    if (!isValidColor(hex)) return;
    const stops    = generateScale(hex, stopCount, new Map(), form.anchorStep);
    const warning  = detectEdgeCase(hex);
    onAdd({
      id:        crypto.randomUUID(),
      name:      form.name.trim() || suggestName(hex),
      type:      "custom",
      baseColor: hex,
      baseStep:  form.anchorStep,
      stops,
      warning,
    }, form.saturation);
  }

  const textColor = getSwatchTextColor(form.baseColor);

  // Use a color with the stored hue as base (baseColor may be gray and lose hue)
  const colorWithHue = setHue(form.baseColor, form.hue);
  const hueGradient  = getHueGradient(getColorLightness(form.baseColor), form.saturation);
  const grayHex      = setSaturation(colorWithHue, 0);
  const fullSatHex   = setSaturation(colorWithHue, 100);
  const satGradient  = `linear-gradient(90deg, ${grayHex} 0%, ${fullSatHex} 100%)`;

  return (
    <div className="flex-shrink-0 w-[320px] flex flex-col gap-2">

      {/* ── Editor card ─────────────────────────────────────────────── */}
      <div className="border border-[#E7E7E7] rounded-3xl p-3 flex flex-col gap-2">

        {/* Color preview */}
        <div
          className="w-full h-[240px] rounded-xl flex flex-col justify-between px-3 py-6"
          style={{ backgroundColor: form.baseColor }}
        >
          {/* Name */}
          <div>
            {form.nameEditing ? (
              <input
                ref={nameRef}
                type="text"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                onBlur={() => patch({ nameEditing: false })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") patch({ nameEditing: false });
                }}
                autoFocus
                className="bg-transparent text-[20px] font-normal tracking-[-0.4px] outline-none border-b pb-0.5 w-full"
                style={{ color: textColor, borderColor: `${textColor}40` }}
              />
            ) : (
              <button
                onClick={() => { patch({ nameEditing: true }); setTimeout(() => nameRef.current?.select(), 0); }}
                className="text-[20px] font-normal tracking-[-0.4px] text-left hover:opacity-60 transition-opacity cursor-text"
                style={{ color: textColor }}
              >
                {form.name}
              </button>
            )}
          </div>

          {/* Hex + step badge */}
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <span className="text-[28px] font-normal tracking-[-0.56px] opacity-25" style={{ color: textColor }}>#</span>
              <input
                type="text"
                value={form.hexInput.startsWith("#") ? form.hexInput.slice(1).toUpperCase() : form.hexInput.toUpperCase()}
                onChange={(e) => handleHexInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                maxLength={6}
                spellCheck={false}
                className={`flex-1 min-w-0 bg-transparent text-[28px] font-normal tracking-[-0.56px] outline-none uppercase ${form.hexError ? "opacity-30" : ""}`}
                style={{ color: textColor }}
              />
            </div>

            {/* Step badge — opens dropdown */}
            <StepBadge
              step={form.anchorStep}
              stopCount={stopCount}
              badgeBg="rgba(255,255,255,0.9)"
              badgeColor="#000"
              onSelect={handleStepSelect}
            />
          </div>
        </div>

        {/* Hue slider — value is display-offset (0=red) */}
        <SliderRow
          label="Hue"
          value={(form.hue - HUE_START + 360) % 360}
          min={0}
          max={359}
          sliderClass="hue-slider"
          sliderStyle={{ background: hueGradient }}
          onChange={handleHueSlider}
        />

        {/* Saturation slider */}
        <SliderRow
          label="Saturation"
          value={form.saturation}
          min={0}
          max={100}
          sliderClass="sat-slider"
          sliderStyle={{ background: satGradient }}
          onChange={handleSatSlider}
        />
      </div>

      {/* ── Buttons ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 items-center">
        <button
          onClick={() => onCancel(form.id)}
          className="h-[56px] w-[156px] flex-shrink-0 rounded-2xl bg-[#F1F1F1] text-black text-[16px] font-medium tracking-[-0.32px] hover:bg-[#E7E7E7] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleAdd}
          disabled={form.hexError || !form.hexInput}
          className="flex-1 h-[56px] rounded-2xl bg-black text-white text-[16px] font-medium tracking-[-0.32px] hover:bg-[#222] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [palettes, setPalettes]   = useState<Palette[]>([]);
  const [stopCount]               = useState<StopCount>(10);
  const [toast, setToast]         = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const toastTimer                = useRef<ReturnType<typeof setTimeout>>(undefined);

  // One form open on first load; user can cancel to leave only the + button
  const [addForms, setAddForms]     = useState<AddFormState[]>(() => [makeDefaultForm(10)]);
  const [lastSaturation, setLastSaturation] = useState<number>(getColorSaturation(DEFAULT_COLOR));
  const [lastAnchorStep, setLastAnchorStep] = useState<number | undefined>(undefined);

  // Drag state
  const [dragId, setDragId]       = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ── Persistence ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadInitialState();
    if (saved?.palettes.length) {
      setPalettes(saved.palettes);
    }
  }, []);

  useEffect(() => {
    saveToStorage({ palettes, stopCount });
    saveToURL({ palettes, stopCount });
  }, [palettes, stopCount]);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = useCallback((hex: string) => {
    clearTimeout(toastTimer.current);
    setToast(hex);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  // ── Palette actions ──────────────────────────────────────────────────────────
  function handleAddPalette(palette: Palette, formId: string, saturation: number) {
    const form = addForms.find((f) => f.id === formId);
    const insertAt = form?.insertAt ?? palettes.length;
    setPalettes((prev) => {
      const next = [...prev];
      next.splice(insertAt, 0, palette);
      return next;
    });
    setAddForms((prev) => prev.filter((f) => f.id !== formId));
    setLastSaturation(saturation);
    setLastAnchorStep(palette.baseStep);
  }

  function handleUpdate(id: string, updates: Partial<Palette>) {
    setPalettes((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  function handleRemove(id: string) {
    setPalettes((prev) => prev.filter((p) => p.id !== id));
  }

  // ── Form management ──────────────────────────────────────────────────────────
  function handleAddForm() {
    setAddForms((prev) => [...prev, makeDefaultForm(stopCount, lastSaturation, lastAnchorStep, palettes.length)]);
  }

  function handleUpdateForm(id: string, patch: Partial<AddFormState>) {
    setAddForms((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
    if (patch.saturation !== undefined) {
      setLastSaturation(patch.saturation);
    }
    if (patch.anchorStep !== undefined) {
      setLastAnchorStep(patch.anchorStep);
    }
  }

  function handleCancelForm(id: string) {
    setAddForms((prev) => prev.filter((f) => f.id !== id));
  }

  // ── Drag-and-drop ────────────────────────────────────────────────────────────
  function handleDragStart(id: string) { setDragId(id); }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (id !== dragId) setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setPalettes((prev) => {
      const fromIdx = prev.findIndex((p) => p.id === dragId);
      const toIdx   = prev.findIndex((p) => p.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
    setDragId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-black">
      <Header hasPalettes={palettes.length > 0} onExport={() => setExportOpen(true)} />

      <main className="pt-[96px] min-h-screen">
        <div className="flex gap-5 px-10 py-10 overflow-x-auto min-h-[calc(100vh-96px)] items-start">

          {/* Finalized palette cards */}
          {palettes.map((palette) => (
            <PaletteCard
              key={palette.id}
              palette={palette}
              stopCount={stopCount}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onCopy={showToast}
              draggable
              onDragStart={() => handleDragStart(palette.id)}
              onDragOver={(e) => handleDragOver(e, palette.id)}
              onDrop={() => handleDrop(palette.id)}
              onDragEnd={handleDragEnd}
              isDragOver={dragOverId === palette.id}
            />
          ))}

          {/* Open add forms */}
          {addForms.map((form) => (
            <AddCard
              key={form.id}
              form={form}
              stopCount={stopCount}
              onUpdate={handleUpdateForm}
              onAdd={(palette, sat) => handleAddPalette(palette, form.id, sat)}
              onCancel={handleCancelForm}
            />
          ))}

          {/* + button — always visible */}
          <button
            onClick={handleAddForm}
            className="flex-shrink-0 w-[320px] border border-[#E7E7E7] rounded-3xl flex items-center justify-center h-[72px] hover:border-black/20 hover:bg-[#F7F7F7] transition-all group"
            title="Add another color"
          >
            <span className="text-black/30 group-hover:text-black/60 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </span>
          </button>

        </div>
      </main>

      {toast && <Toast hex={toast} />}

      {exportOpen && (
        <ExportModal
          palettes={palettes}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
