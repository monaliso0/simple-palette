"use client";

import { useState, useCallback, useRef, useEffect } from "react";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
import Header from "@/components/Header";
import PaletteCard from "@/components/PaletteCard";
import ExportModal from "@/components/ExportModal";
import StepBadge from "@/components/StepBadge";
import SliderRow from "@/components/SliderRow";
import {
  generateScale,
  generateDarkScale,
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
};

function makeDefaultForm(stopCount: StopCount, saturation?: number, anchorStep?: number, randomHue?: number): AddFormState {
  const hue        = randomHue ?? getColorHue(DEFAULT_COLOR);
  const sat        = saturation ?? getColorSaturation(DEFAULT_COLOR);
  const withHueSat = setSaturation(setHue(DEFAULT_COLOR, hue), sat);

  let baseColor: string;
  let finalStep: number;

  if (anchorStep !== undefined) {
    const adjusted = adjustColorToStep(withHueSat, anchorStep);
    baseColor = setSaturation(setHue(adjusted, hue), sat);
    finalStep = anchorStep;
  } else {
    baseColor = withHueSat;
    finalStep = detectAnchorStep(baseColor, stopCount);
  }

  return {
    id:          uuid(),
    baseColor,
    hue,
    saturation:  sat,
    anchorStep:  finalStep,
    name:        suggestName(baseColor),
    nameEditing: false,
    hexInput:    baseColor,
    hexError:    false,
  };
}

type AddCardProps = {
  form: AddFormState;
  stopCount: StopCount;
  darkMode: boolean;
  onUpdate: (id: string, patch: Partial<AddFormState>) => void;
  onAdd: (palette: Palette, saturation: number) => void;
  onCancel: (id: string) => void;
};

function AddCard({ form, stopCount, darkMode, onUpdate, onAdd, onCancel }: AddCardProps) {
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
    const stops     = generateScale(hex, stopCount, new Map(), form.anchorStep);
    const darkStops = generateDarkScale(hex, stopCount, new Map(), form.anchorStep);
    const warning   = detectEdgeCase(hex);
    onAdd({
      id:        uuid(),
      name:      form.name.trim() || suggestName(hex),
      type:      "custom",
      baseColor: hex,
      baseStep:  form.anchorStep,
      stops,
      darkStops,
      warning,
    }, form.saturation);
  }

  const textColor    = getSwatchTextColor(form.baseColor);
  const colorWithHue = setHue(form.baseColor, form.hue);
  const hueGradient  = getHueGradient(getColorLightness(form.baseColor), form.saturation);
  const grayHex      = setSaturation(colorWithHue, 0);
  const fullSatHex   = setSaturation(colorWithHue, 100);
  const satGradient  = `linear-gradient(90deg, ${grayHex} 0%, ${fullSatHex} 100%)`;

  return (
    <div className="flex-shrink-0 w-[320px] flex flex-col gap-2">

      {/* ── Editor card ─────────────────────────────────────────────── */}
      <div className={`border ${darkMode ? "border-[#2c2c2c]" : "border-[#E7E7E7]"} rounded-3xl p-3 flex flex-col gap-2`}>

        {/* Color preview */}
        <div
          className="w-full aspect-square rounded-xl flex flex-col justify-between px-3 py-6"
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

            <StepBadge
              step={form.anchorStep}
              stopCount={stopCount}
              badgeBg="rgba(255,255,255,0.9)"
              badgeColor="#000"
              onSelect={handleStepSelect}
            />
          </div>
        </div>

        {/* Hue slider */}
        <SliderRow
          label="Hue"
          value={(form.hue - HUE_START + 360) % 360}
          min={0}
          max={359}
          sliderClass="hue-slider"
          sliderStyle={{ background: hueGradient }}
          darkMode={darkMode}
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
          darkMode={darkMode}
          onChange={handleSatSlider}
        />
      </div>

      {/* ── Buttons ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 items-center">
        <button
          onClick={() => onCancel(form.id)}
          className={`h-[48px] w-[156px] flex-shrink-0 rounded-2xl text-[16px] font-medium tracking-[-0.32px] transition-colors ${
            darkMode
              ? "bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]"
              : "bg-[#F1F1F1] text-black hover:bg-[#E7E7E7]"
          }`}
        >
          Cancelar
        </button>
        <button
          onClick={handleAdd}
          disabled={form.hexError || !form.hexInput}
          className={`flex-1 h-[48px] rounded-2xl text-[16px] font-medium tracking-[-0.32px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            darkMode
              ? "bg-white text-black hover:bg-[#E0E0E0]"
              : "bg-black text-white hover:bg-[#222]"
          }`}
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}

// ─── Unified item type ────────────────────────────────────────────────────────

type Item =
  | { kind: "palette"; data: Palette }
  | { kind: "form";    data: AddFormState };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [items, setItems]             = useState<Item[]>(() => [{ kind: "form", data: makeDefaultForm(10) }]);
  const [stopCount]                   = useState<StopCount>(10);
  const [darkMode, setDarkMode]       = useState(false);
  const [toast, setToast]             = useState<string | null>(null);
  const [exportOpen, setExportOpen]   = useState(false);
  const toastTimer                    = useRef<ReturnType<typeof setTimeout>>(undefined);
  const urlTimer                      = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [lastSaturation, setLastSaturation] = useState<number>(getColorSaturation(DEFAULT_COLOR));
  const [lastAnchorStep, setLastAnchorStep] = useState<number | undefined>(undefined);

  // Drag state
  const [dragId, setDragId]           = useState<string | null>(null);
  const [dragOverId, setDragOverId]   = useState<string | null>(null);

  // Derived palettes list (for export, persistence, header)
  const palettes = items.filter((i): i is { kind: "palette"; data: Palette } => i.kind === "palette").map((i) => i.data);

  // ── Randomize initial form hue on client after hydration ────────────────────
  useEffect(() => {
    setItems((prev) => prev.map((item) => {
      if (item.kind !== "form") return item;
      const randomHue = Math.floor(Math.random() * 360);
      const updated = makeDefaultForm(stopCount, item.data.saturation, item.data.anchorStep, randomHue);
      return { kind: "form", data: { ...updated, id: item.data.id } };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persistence ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadInitialState();
    if (saved?.palettes.length) {
      setItems((prev) => {
        const forms = prev.filter((i) => i.kind === "form");
        return [
          ...saved.palettes.map((p) => ({
            kind: "palette" as const,
            // Migrate old palettes that don't have darkStops yet
            data: p.darkStops?.length
              ? p
              : { ...p, darkStops: generateDarkScale(p.baseColor, stopCount, new Map(), p.baseStep) },
          })),
          ...forms,
        ];
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pals = items
      .filter((i): i is { kind: "palette"; data: Palette } => i.kind === "palette")
      .map((i) => i.data);
    saveToStorage({ palettes: pals, stopCount });
    // Debounce URL saves — Safari blocks history.replaceState() if called > 100x per 10s
    clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => saveToURL({ palettes: pals, stopCount }), 600);
  }, [items, stopCount]);

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = useCallback((hex: string) => {
    clearTimeout(toastTimer.current);
    setToast(hex);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  // ── Palette actions ──────────────────────────────────────────────────────────
  function handleAddPalette(palette: Palette, formId: string, saturation: number) {
    // Replace the form in-place with the new palette card
    setItems((prev) => prev.map((item) =>
      item.kind === "form" && item.data.id === formId
        ? { kind: "palette", data: palette }
        : item
    ));
    setLastSaturation(saturation);
    setLastAnchorStep(palette.baseStep);
  }

  function handleUpdate(id: string, updates: Partial<Palette>) {
    setItems((prev) => prev.map((item) =>
      item.kind === "palette" && item.data.id === id
        ? { ...item, data: { ...item.data, ...updates } }
        : item
    ));
  }

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((item) =>
      !(item.kind === "palette" && item.data.id === id)
    ));
  }

  // ── Form management ──────────────────────────────────────────────────────────
  function handleAddForm() {
    const randomHue = Math.floor(Math.random() * 360);
    setItems((prev) => [...prev, { kind: "form", data: makeDefaultForm(stopCount, lastSaturation, lastAnchorStep, randomHue) }]);
  }

  function handleUpdateForm(id: string, patch: Partial<AddFormState>) {
    setItems((prev) => prev.map((item) =>
      item.kind === "form" && item.data.id === id
        ? { ...item, data: { ...item.data, ...patch } }
        : item
    ));
    if (patch.saturation !== undefined) setLastSaturation(patch.saturation);
    if (patch.anchorStep !== undefined) setLastAnchorStep(patch.anchorStep);
  }

  function handleCancelForm(id: string) {
    setItems((prev) => prev.filter((item) =>
      !(item.kind === "form" && item.data.id === id)
    ));
  }

  // ── Drag-and-drop ────────────────────────────────────────────────────────────
  function handleDragStart(id: string) { setDragId(id); }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (id !== dragId) setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setItems((prev) => {
      const fromIdx = prev.findIndex((i) => i.kind === "palette" && i.data.id === dragId);
      const toIdx   = prev.findIndex((i) => i.kind === "palette" && i.data.id === targetId);
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
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-black text-white" : "bg-[#FAFAFA] text-black"}`}>
      <Header
        hasPalettes={palettes.length > 0}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onExport={() => setExportOpen(true)}
      />

      <main className="pt-[96px] min-h-screen">
        <div className="flex gap-5 px-10 py-10 overflow-x-auto min-h-[calc(100vh-96px)] items-start">

          {items.map((item) =>
            item.kind === "palette" ? (
              <PaletteCard
                key={item.data.id}
                palette={item.data}
                stopCount={stopCount}
                darkMode={darkMode}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onCopy={showToast}
                draggable
                onDragStart={() => handleDragStart(item.data.id)}
                onDragOver={(e) => handleDragOver(e, item.data.id)}
                onDrop={() => handleDrop(item.data.id)}
                onDragEnd={handleDragEnd}
                isDragOver={dragOverId === item.data.id}
              />
            ) : (
              <AddCard
                key={item.data.id}
                form={item.data}
                stopCount={stopCount}
                darkMode={darkMode}
                onUpdate={handleUpdateForm}
                onAdd={(palette, sat) => handleAddPalette(palette, item.data.id, sat)}
                onCancel={handleCancelForm}
              />
            )
          )}

          {/* + button — always visible */}
          <button
            onClick={handleAddForm}
            className={`flex-shrink-0 w-[320px] border rounded-3xl flex items-center justify-center h-[72px] transition-all group ${
              darkMode
                ? "border-[#2c2c2c] hover:border-[#3c3c3c] hover:bg-[#111]"
                : "border-[#E7E7E7] hover:border-black/20 hover:bg-[#F7F7F7]"
            }`}
            title="Add another color"
          >
            <span className={`transition-colors ${darkMode ? "text-white/20 group-hover:text-white/50" : "text-black/30 group-hover:text-black/60"}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </span>
          </button>

        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 h-[48px] flex items-center justify-end px-10 pointer-events-none">
        <p className={`text-[13px] pointer-events-auto transition-colors ${darkMode ? "text-white/30" : "text-black/40"}`}>
          Powered by{" "}
          <a
            href="https://www.linkedin.com/company/doze-collab/posts/?viewAsMember=true"
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 transition-colors ${darkMode ? "hover:text-white/60" : "hover:text-black/70"}`}
          >
            Doze Ltda
          </a>
        </p>
      </footer>

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
