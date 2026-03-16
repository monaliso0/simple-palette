import { parse, formatHex, oklch, clampChroma, wcagContrast } from "culori";
import type {
  ColorStop,
  ContrastResult,
  ContrastLevel,
  EdgeCaseWarning,
  StopCount,
} from "./types";

// ─── Stop sets & lightness table (exported) ───────────────────────────────────

export const STOP_SETS: Record<StopCount, number[]> = {
  5:  [100, 300, 500, 700, 900],
  10: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  12: [25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
};

// ─── Target lightness per stop (OKLCH, 0–1) ───────────────────────────────────
//
// These values produce visually balanced scales across most hues.
// Stop 500 is always overridden by the actual base color lightness.

export const STOP_LIGHTNESS: Record<number, number> = {
  25:  0.985,
  50:  0.970,
  100: 0.935,
  200: 0.875,
  300: 0.790,
  400: 0.685,
  500: 0.595, // fallback only — overridden by base color
  600: 0.495,
  700: 0.390,
  800: 0.285,
  900: 0.185,
  950: 0.130,
};

// ─── Contrast helpers ─────────────────────────────────────────────────────────

function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7)   return "AAA";
  if (ratio >= 4.5) return "AA";
  return "fail";
}

export function calcContrast(hex: string): ContrastResult {
  const ratioWhite = wcagContrast(hex, "#ffffff");
  const ratioBlack = wcagContrast(hex, "#000000");
  return {
    ratio: Math.round(Math.max(ratioWhite, ratioBlack) * 100) / 100,
    againstWhite: contrastLevel(ratioWhite),
    againstBlack: contrastLevel(ratioBlack),
  };
}

// ─── Edge case detection ──────────────────────────────────────────────────────

export function detectEdgeCase(hex: string): EdgeCaseWarning | undefined {
  const parsed = parse(hex);
  if (!parsed) return undefined;

  const color = oklch(parsed);
  if (!color) return undefined;

  // too-light and too-dark are handled gracefully by the proportional algorithm.
  // Only warn for desaturated inputs where the hue is undefined/weak.
  if ((color.c ?? 0) < 0.04) return "desaturated";
  return undefined;
}

// ─── Proportional scale algorithm ────────────────────────────────────────────

/**
 * Finds which stop in the current set the base color naturally belongs to,
 * based on the closest OKLCH lightness value in the reference table.
 * Only considers stops present in the current stop set.
 */
function findAnchorStep(L_base: number, stops: number[]): number {
  let minDiff = Infinity;
  let anchor  = stops.includes(500) ? 500 : stops[Math.floor(stops.length / 2)];

  for (const step of stops) {
    const L_table = STOP_LIGHTNESS[step];
    if (L_table === undefined) continue;
    const diff = Math.abs(L_table - L_base);
    if (diff < minDiff) { minDiff = diff; anchor = step; }
  }

  return anchor;
}

/**
 * Computes the target lightness for a given stop using proportional
 * distribution around the detected anchor.
 *
 * Proof of equivalence for the current default case (anchor=500, L_base≈0.595):
 *   - L_MAX = 0.970, L_MIN = 0.185 (from the 10-stop table extremes)
 *   - For stop 50:  fraction = (0.970−0.595)/(0.970−0.595) = 1.0 → L = 0.595 + 1.0×0.375 = 0.970 ✓
 *   - For stop 100: fraction = (0.935−0.595)/0.375 = 0.907 → L = 0.595 + 0.907×0.375 = 0.935 ✓
 *   - For stop 900: fraction = (0.595−0.185)/(0.595−0.185) = 1.0 → L = 0.595 − 1.0×0.410 = 0.185 ✓
 * Output for normal colors is identical to the previous fixed-table approach.
 */
function proportionalL(
  step:           number,
  anchorStep:     number,
  L_base:         number,
  L_MAX:          number,  // lightest stop's table value for this stop set
  L_MIN:          number,  // darkest stop's table value for this stop set
  L_anchor_table: number   // table value of the anchor stop
): number {
  const L_step_table = STOP_LIGHTNESS[step] ?? L_anchor_table;

  if (L_step_table > L_anchor_table) {
    // Lighter than anchor — scale up from L_base toward L_MAX
    const denom = L_MAX - L_anchor_table;
    if (denom < 0.001) return L_base;
    const fraction = (L_step_table - L_anchor_table) / denom;
    return L_base + fraction * (L_MAX - L_base);
  } else {
    // Darker than anchor — scale down from L_base toward L_MIN
    const denom = L_anchor_table - L_MIN;
    if (denom < 0.001) return L_base;
    const fraction = (L_anchor_table - L_step_table) / denom;
    return L_base - fraction * (L_base - L_MIN);
  }
}

// ─── Chroma curve ─────────────────────────────────────────────────────────────

/**
 * Returns a chroma multiplier (0–1) for a stop given its lightness and the
 * anchor lightness. Mirrors the behaviour of well-crafted design systems
 * (Radix Colors OKLCH analysis): light stops get much less chroma so they
 * read as soft/pastel; dark stops taper more gently.
 *
 * Light side (L > L_anchor): linear decay toward white → near-zero chroma
 * Dark side (L < L_anchor): curved decay toward black → ~20% min chroma
 *
 * Result is always 1.0 at the anchor (base color chroma is preserved exactly).
 */
function chromaForStop(L_stop: number, L_anchor: number): number {
  if (L_stop >= L_anchor) {
    // Lighter than anchor — aggressive linear falloff
    const range = Math.max(0.01, 0.99 - L_anchor);
    const t     = (L_stop - L_anchor) / range;
    return Math.max(0.05, 1 - t * 0.95);
  } else {
    // Darker than anchor — gentler curved falloff
    const range = Math.max(0.01, L_anchor - 0.01);
    const t     = (L_anchor - L_stop) / range;
    return Math.max(0.20, Math.pow(1 - t, 0.85) * 0.80 + 0.20);
  }
}

// ─── Core algorithm ───────────────────────────────────────────────────────────

/**
 * Generates a perceptually consistent color scale from a single base hex.
 *
 * Strategy:
 * - Converts base to OKLCH (perceptually uniform space)
 * - Auto-detects which stop the base color naturally corresponds to
 * - Distributes all other stops proportionally above and below the anchor
 * - Applies a chroma curve: lighter stops get progressively less chroma
 *   (like Radix Colors), darker stops taper more gently — this keeps scales
 *   visually consistent across different hues
 * - Applies gamut mapping so every stop is a valid sRGB hex
 */
export function generateScale(
  hex: string,
  stopCount: StopCount = 10,
  lockedStops: Map<number, string> = new Map(),
  anchorOverride?: number
): ColorStop[] {
  const parsed = parse(hex);
  if (!parsed) throw new Error(`Invalid color: "${hex}"`);

  const base = oklch(parsed);
  if (!base) throw new Error(`Could not convert to OKLCH: "${hex}"`);

  const L_base = base.l ?? 0.595;
  const C_base = base.c ?? 0;
  const H_base = base.h;

  const stops      = STOP_SETS[stopCount];
  const exactHex   = formatHex(parsed) ?? hex;

  // Detect which stop this color belongs to (or use explicit override)
  const anchorStep     = (anchorOverride !== undefined && stops.includes(anchorOverride))
    ? anchorOverride
    : findAnchorStep(L_base, stops);
  const L_anchor_table = STOP_LIGHTNESS[anchorStep] ?? 0.595;

  // Scale bounds from this stop set's reference table
  const tableLightness = stops.map((s) => STOP_LIGHTNESS[s] ?? L_base);
  const L_MAX          = Math.max(...tableLightness);
  const L_MIN          = Math.min(...tableLightness);

  return stops.map((step): ColorStop => {
    // Locked stops: return unchanged
    if (lockedStops.has(step)) {
      const lockedHex = lockedStops.get(step)!;
      return { step, hex: lockedHex, isLocked: true, contrast: calcContrast(lockedHex) };
    }

    // Anchor stop: exact base color preserved
    if (step === anchorStep) {
      return { step, hex: exactHex, isLocked: false, contrast: calcContrast(exactHex) };
    }

    // All other stops: proportional lightness + chroma curve
    const targetL  = proportionalL(step, anchorStep, L_base, L_MAX, L_MIN, L_anchor_table);
    const clampedL = Math.max(0.01, Math.min(0.99, targetL));
    const C_scaled = (H_base !== undefined ? C_base : 0) * chromaForStop(clampedL, L_base);

    const generated = clampChroma(
      { mode: "oklch", l: clampedL, c: C_scaled, h: H_base ?? 0 },
      "oklch"
    );

    const generatedHex = formatHex(generated) ?? "#000000";
    return { step, hex: generatedHex, isLocked: false, contrast: calcContrast(generatedHex) };
  });
}

/**
 * Returns which stop the given hex color naturally maps to, based on
 * its OKLCH lightness. Used by callers to set Palette.baseStep correctly.
 */
export function detectAnchorStep(hex: string, stopCount: StopCount = 10): number {
  const parsed = parse(hex);
  if (!parsed) return 500;
  const color = oklch(parsed);
  if (!color) return 500;
  return findAnchorStep(color.l ?? 0.595, STOP_SETS[stopCount]);
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/**
 * Returns white or near-black text color depending on which has
 * higher contrast against the given background hex.
 */
export function getSwatchTextColor(hex: string): string {
  const rW = wcagContrast(hex, "#ffffff");
  const rB = wcagContrast(hex, "#000000");
  return rW >= rB ? "#ffffff" : "#111111";
}

/**
 * Returns the status color for the contrast indicator dot.
 * Based on the best available contrast (white or black text).
 */
export function getContrastDotColor(ratio: number): string {
  if (ratio >= 7)   return "#3DBA6E"; // AAA
  if (ratio >= 4.5) return "#E5A020"; // AA
  return "#E5483D";                   // fail
}

/**
 * Suggests a color name based on OKLCH hue and lightness.
 *
 * Hue anchors in OKLCH: Red≈29° Orange≈55° Yellow≈110° Green≈142°
 *                        Cyan≈195° Blue≈264° Violet≈296° Magenta≈328°
 */
export function suggestName(hex: string): string {
  const parsed = parse(hex);
  if (!parsed) return "Color";

  const color = oklch(parsed);
  if (!color) return "Color";

  const c = color.c ?? 0;
  const h = color.h ?? 0;
  const l = color.l ?? 0.5;

  // Neutrals
  if (c < 0.04) {
    if (l > 0.93) return "White";
    if (l > 0.60) return "Gray";
    if (l > 0.25) return "Dark Gray";
    return "Black";
  }

  // Chromatic — OKLCH-calibrated hue ranges
  if (h >= 340 || h < 40)  return l > 0.80 ? "Light Red"    : l < 0.30 ? "Dark Red"    : "Red";
  if (h < 70)               return l > 0.80 ? "Light Orange" : l < 0.30 ? "Dark Orange" : "Orange";
  if (h < 115)              return l > 0.88 ? "Light Yellow" : l < 0.30 ? "Dark Yellow" : "Yellow";
  if (h < 140)              return l > 0.85 ? "Light Lime"   : l < 0.30 ? "Dark Lime"   : "Lime";
  if (h < 175)              return l > 0.83 ? "Light Green"  : l < 0.30 ? "Dark Green"  : "Green";
  if (h < 210)              return l > 0.83 ? "Light Teal"   : l < 0.30 ? "Dark Teal"   : "Teal";
  if (h < 270)              return l > 0.83 ? "Light Blue"   : l < 0.30 ? "Dark Blue"   : "Blue";
  if (h < 295)              return l > 0.83 ? "Light Indigo" : l < 0.30 ? "Dark Indigo" : "Indigo";
  if (h < 325)              return l > 0.83 ? "Light Purple" : l < 0.30 ? "Dark Purple" : "Purple";
  /* Pink 325–340 */        return l > 0.83 ? "Light Pink"   : l < 0.30 ? "Dark Pink"   : "Pink";
}

// ─── Neutral scale ────────────────────────────────────────────────────────────

/**
 * Generates a tinted neutral (gray) scale.
 * If tintHex is provided, the hue of that color is preserved at very low
 * chroma (~0.018), producing a "warm" or "cool" gray derived from the brand.
 * If tintHex is null, generates a pure achromatic gray scale.
 */
export function generateNeutralScale(
  tintHex: string | null,
  stopCount: StopCount = 10
): ColorStop[] {
  const NEUTRAL_CHROMA = 0.018;

  if (!tintHex) {
    // Pure achromatic gray — use a mid-gray anchor at 500
    return generateScale("#737373", stopCount);
  }

  const parsed = parse(tintHex);
  if (!parsed) return generateScale("#737373", stopCount);

  const base = oklch(parsed);
  if (!base || base.h === undefined) return generateScale("#737373", stopCount);

  // Build a desaturated anchor color in OKLCH and generate from it
  const tintedAnchor = formatHex(
    clampChroma({ mode: "oklch", l: 0.595, c: NEUTRAL_CHROMA, h: base.h }, "oklch")
  );

  return generateScale(tintedAnchor ?? "#737373", stopCount);
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Returns true if the string is a valid parseable color */
export function isValidColor(hex: string): boolean {
  if (!hex) return false;
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  return parse(normalized) !== undefined;
}

/** Normalizes input to a full hex string (adds # if missing) */
export function normalizeHex(input: string): string {
  const trimmed = input.trim();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

// ─── Hue manipulation ─────────────────────────────────────────────────────────

/** Returns the OKLCH hue angle (0–360) of a hex color, or 0 if undefined */
export function getColorHue(hex: string): number {
  const parsed = parse(hex);
  if (!parsed) return 0;
  const color = oklch(parsed);
  return color?.h ?? 0;
}

/** Returns the OKLCH lightness (0–1) of a hex color */
export function getColorLightness(hex: string): number {
  const parsed = parse(hex);
  if (!parsed) return 0.5;
  const color = oklch(parsed);
  return color?.l ?? 0.5;
}

/**
 * Returns a new hex with the hue changed to newHue while keeping L and C.
 * For near-achromatic colors (very low chroma), a small chroma is applied
 * so the hue change produces a visible result.
 */
export function setHue(hex: string, newHue: number): string {
  const parsed = parse(hex);
  if (!parsed) return hex;
  const color = oklch(parsed);
  if (!color) return hex;
  const c = (color.c ?? 0) < 0.01 ? 0.08 : (color.c ?? 0.08);
  const result = clampChroma({ mode: "oklch", l: color.l ?? 0.5, c, h: newHue }, "oklch");
  return formatHex(result) ?? hex;
}

// ─── Saturation ────────────────────────────────────────────────────────────────

/**
 * Returns the actual sRGB gamut max chroma for a given OKLCH lightness + hue.
 * Uses clampChroma with a very high probe value to find the ceiling.
 */
function maxChromaFor(l: number, h: number): number {
  const probe = clampChroma({ mode: "oklch", l, c: 0.5, h }, "oklch");
  return Math.max(0.01, (probe as { c?: number }).c ?? 0.37);
}

/**
 * Returns the current saturation as an integer 0–100,
 * where 100 = max sRGB chroma for this hue+lightness and 0 = achromatic.
 */
export function getColorSaturation(hex: string): number {
  const parsed = parse(hex);
  if (!parsed) return 0;
  const color = oklch(parsed);
  if (!color) return 0;
  if ((color.c ?? 0) < 0.001) return 0;
  const maxC = maxChromaFor(color.l ?? 0.5, color.h ?? 0);
  return Math.round(Math.min(100, ((color.c ?? 0) / maxC) * 100));
}

/**
 * Returns a new hex with chroma set by saturation (0–100) while keeping L and H.
 * 100 = gamut max for this specific hue+lightness.
 */
export function setSaturation(hex: string, saturation: number): string {
  const parsed = parse(hex);
  if (!parsed) return hex;
  const color = oklch(parsed);
  if (!color) return hex;
  const l = color.l ?? 0.5;
  const h = color.h ?? 0;
  const maxC   = maxChromaFor(l, h);
  const targetC = (Math.max(0, Math.min(100, saturation)) / 100) * maxC;
  const result = clampChroma({ mode: "oklch", l, c: targetC, h }, "oklch");
  return formatHex(result) ?? hex;
}

/**
 * OKLCH hue offset so the slider starts and ends at pure red (h≈29°).
 * Slider display value 0 = OKLCH h=29° (red).
 * Convert:  oklchHue → display: (oklchHue - HUE_START + 360) % 360
 *           display  → oklchHue: (displayHue + HUE_START) % 360
 */
export const HUE_START = 29;

/**
 * Returns a CSS linear-gradient string for the hue slider.
 * Gradient starts at red (HUE_START) and wraps back to red,
 * giving the standard spectrum: Red→Orange→Yellow→Green→Cyan→Blue→Violet→Pink→Red.
 */
export function getHueGradient(l: number, saturation: number): string {
  const STEPS = 24;
  const stops: string[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const h     = ((i / STEPS) * 360 + HUE_START) % 360;
    const maxC  = maxChromaFor(l, h);
    const c     = (saturation / 100) * maxC;
    const hex   = formatHex(clampChroma({ mode: "oklch", l, c, h }, "oklch")) ?? "#888888";
    stops.push(`${hex} ${((i / STEPS) * 100).toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

// ─── Step-aware lightness adjustment ──────────────────────────────────────────

/**
 * Returns a new hex at the reference lightness for the given step,
 * while keeping the original hue and chroma. Used when the user
 * selects a different base step — the color updates to reflect that level.
 */
export function adjustColorToStep(hex: string, step: number): string {
  const parsed = parse(hex);
  if (!parsed) return hex;
  const color = oklch(parsed);
  if (!color) return hex;
  const targetL = STOP_LIGHTNESS[step] ?? color.l ?? 0.595;
  const result = clampChroma(
    { mode: "oklch", l: targetL, c: color.c ?? 0, h: color.h ?? 0 },
    "oklch"
  );
  return formatHex(result) ?? hex;
}
