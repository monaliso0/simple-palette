// ─── Core data model ──────────────────────────────────────────────────────────

export type ContrastLevel = "AAA" | "AA" | "fail";

export type ContrastResult = {
  ratio: number;              // highest ratio (white or black), e.g. 4.73
  againstWhite: ContrastLevel;
  againstBlack: ContrastLevel;
};

export type ColorStop = {
  step: number;               // 50, 100, 200 … 900
  hex: string;                // "#FF3B30"
  isLocked: boolean;          // true = manually set, skip on regeneration
  contrast: ContrastResult;
};

export type PaletteType = "custom" | "neutral";

export type Palette = {
  id: string;
  name: string;               // "Red", "Brand Primary"
  type: PaletteType;
  baseColor: string;          // "#FF3B30" — the raw input
  baseStep: number;           // which stop the base color anchors to (default 500)
  stops: ColorStop[];
  warning?: EdgeCaseWarning;  // set when base color is extreme
};

// 5 = [100,300,500,700,900] | 10 = [50–900] | 12 = [25,50,100–900,950]
export type StopCount = 5 | 10 | 12;

export type EdgeCaseWarning = "too-light" | "too-dark" | "desaturated";

export type AppState = {
  palettes: Palette[];
  stopCount: StopCount;
};

// ─── Export formats ───────────────────────────────────────────────────────────

export type ExportFormat = "json" | "css" | "tailwind" | "figma";
