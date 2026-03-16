import { generateScale, generateNeutralScale } from "./color";
import type { Palette, PaletteType, StopCount, AppState } from "./types";

// ─── Serialized shape (compact — only what can't be recomputed) ───────────────

type SerializedStop = [number, string];  // [step, hex] — only locked stops

type SerializedPalette = {
  id: string;
  name: string;
  type: PaletteType;
  baseColor: string;
  baseStep: number;
  locked: SerializedStop[];
};

type SerializedState = {
  v: 1;
  palettes: SerializedPalette[];
  stopCount: StopCount;
};

// ─── Serialize ────────────────────────────────────────────────────────────────

export function serializeState(state: AppState): string {
  const payload: SerializedState = {
    v: 1,
    stopCount: state.stopCount,
    palettes: state.palettes.map((p) => ({
      id:        p.id,
      name:      p.name,
      type:      p.type,
      baseColor: p.baseColor,
      baseStep:  p.baseStep,
      locked:    p.stops
        .filter((s) => s.isLocked)
        .map((s): SerializedStop => [s.step, s.hex]),
    })),
  };

  return btoa(JSON.stringify(payload));
}

// ─── Deserialize ──────────────────────────────────────────────────────────────

export function deserializeState(encoded: string): AppState | null {
  try {
    const payload = JSON.parse(atob(encoded)) as SerializedState;
    if (payload.v !== 1) return null;

    const palettes: Palette[] = payload.palettes.map((sp) => {
      const lockedMap = new Map<number, string>(sp.locked);
      const stops =
        sp.type === "neutral"
          ? generateNeutralScale(sp.baseColor, payload.stopCount)
          : generateScale(sp.baseColor, payload.stopCount, lockedMap);

      // Re-apply locked flags to the regenerated stops
      const stopsWithLocks = stops.map((s) =>
        lockedMap.has(s.step) ? { ...s, hex: lockedMap.get(s.step)!, isLocked: true } : s
      );

      return {
        id:        sp.id,
        name:      sp.name,
        type:      sp.type,
        baseColor: sp.baseColor,
        baseStep:  sp.baseStep,
        stops:     stopsWithLocks,
      };
    });

    return { palettes, stopCount: payload.stopCount };
  } catch {
    return null;
  }
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const LS_KEY = "simple-palette-state";

export function saveToStorage(state: AppState): void {
  try {
    localStorage.setItem(LS_KEY, serializeState(state));
  } catch {
    // Quota exceeded or private browsing — fail silently
  }
}

export function loadFromStorage(): AppState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? deserializeState(raw) : null;
  } catch {
    return null;
  }
}

// ─── URL state ────────────────────────────────────────────────────────────────

const URL_PARAM = "p";

export function saveToURL(state: AppState): void {
  if (typeof window === "undefined") return;
  const encoded = serializeState(state);
  const url = new URL(window.location.href);
  url.searchParams.set(URL_PARAM, encoded);
  window.history.replaceState(null, "", url.toString());
}

export function loadFromURL(): AppState | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get(URL_PARAM);
  return param ? deserializeState(param) : null;
}

export function clearURL(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(URL_PARAM);
  window.history.replaceState(null, "", url.toString());
}

// ─── Load priority: URL → localStorage → null ─────────────────────────────────

export function loadInitialState(): AppState | null {
  return loadFromURL() ?? loadFromStorage();
}
