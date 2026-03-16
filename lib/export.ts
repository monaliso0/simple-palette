import type { Palette, ExportFormat } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "Brand Blue" → "brand-blue" */
function slug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** "#FF3B30" → { r, g, b, a } (0–1 range, for Figma) */
function hexToFigmaRgb(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
    a: 1,
  };
}

// ─── Format generators ────────────────────────────────────────────────────────

function toJSON(palettes: Palette[]): string {
  const output: Record<string, Record<string, string>> = {};

  for (const palette of palettes) {
    const key = slug(palette.name);
    output[key] = {};
    for (const stop of palette.stops) {
      output[key][String(stop.step)] = stop.hex;
    }
  }

  return JSON.stringify({ color: output }, null, 2);
}

function toCSS(palettes: Palette[]): string {
  const lines: string[] = [":root {"];

  for (const palette of palettes) {
    const key = slug(palette.name);
    lines.push(`  /* ${palette.name} */`);
    for (const stop of palette.stops) {
      lines.push(`  --color-${key}-${stop.step}: ${stop.hex};`);
    }
    lines.push("");
  }

  // Remove trailing blank line
  if (lines[lines.length - 1] === "") lines.pop();
  lines.push("}");

  return lines.join("\n");
}

function toTailwind(palettes: Palette[]): string {
  const colorsEntries = palettes.map((palette) => {
    const key = slug(palette.name);
    const stopsEntries = palette.stops
      .map((s) => `          ${s.step}: '${s.hex}',`)
      .join("\n");
    return `        ${key}: {\n${stopsEntries}\n        },`;
  });

  return [
    `/** @type {import('tailwindcss').Config} */`,
    `module.exports = {`,
    `  theme: {`,
    `    extend: {`,
    `      colors: {`,
    colorsEntries.join("\n"),
    `      },`,
    `    },`,
    `  },`,
    `};`,
  ].join("\n");
}

function toFigma(palettes: Palette[]): string {
  // W3C Design Tokens format — compatible with Tokens Studio for Figma
  const output: Record<string, Record<string, Record<string, { $value: string; $type: string }>>> = {
    color: {},
  };

  for (const palette of palettes) {
    const key = slug(palette.name);
    output.color[key] = {};
    for (const stop of palette.stops) {
      output.color[key][String(stop.step)] = {
        $value: stop.hex,
        $type: "color",
      };
    }
  }

  return JSON.stringify(output, null, 2);
}

// ─── File metadata ────────────────────────────────────────────────────────────

export const FORMAT_META: Record<
  ExportFormat,
  { label: string; filename: string; language: string }
> = {
  json:     { label: "JSON",            filename: "tokens.json",         language: "json" },
  css:      { label: "CSS Variables",   filename: "tokens.css",          language: "css"  },
  tailwind: { label: "Tailwind",        filename: "tailwind.config.js",  language: "js"   },
  figma:    { label: "Figma / Tokens",  filename: "tokens.figma.json",   language: "json" },
};

// ─── Main export function ──────────────────────────────────────────────────────

export function generateExport(palettes: Palette[], format: ExportFormat): string {
  switch (format) {
    case "json":     return toJSON(palettes);
    case "css":      return toCSS(palettes);
    case "tailwind": return toTailwind(palettes);
    case "figma":    return toFigma(palettes);
  }
}
