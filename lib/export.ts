import type { Palette, ExportFormat } from "./types";

// ─── Export mode ──────────────────────────────────────────────────────────────

export type ExportMode = "light" | "dark" | "both";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "Brand Blue" → "brand-blue" */
function slug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ─── Format generators ────────────────────────────────────────────────────────

function toJSON(palettes: Palette[], mode: ExportMode): string {
  if (mode === "both") {
    const light: Record<string, Record<string, string>> = {};
    const dark:  Record<string, Record<string, string>> = {};
    for (const palette of palettes) {
      const key = slug(palette.name);
      light[key] = {};
      dark[key]  = {};
      for (const stop of palette.stops)      light[key][String(stop.step)] = stop.hex;
      for (const stop of palette.darkStops)  dark[key][String(stop.step)]  = stop.hex;
    }
    return JSON.stringify({ color: { light, dark } }, null, 2);
  }

  const stops = (p: Palette) => mode === "dark" ? p.darkStops : p.stops;
  const output: Record<string, Record<string, string>> = {};
  for (const palette of palettes) {
    const key = slug(palette.name);
    output[key] = {};
    for (const stop of stops(palette)) output[key][String(stop.step)] = stop.hex;
  }
  return JSON.stringify({ color: output }, null, 2);
}

function toCSS(palettes: Palette[], mode: ExportMode): string {
  const lightLines: string[] = [":root {"];
  const darkLines:  string[] = ["@media (prefers-color-scheme: dark) {", "  :root {"];

  for (const palette of palettes) {
    const key = slug(palette.name);

    if (mode !== "dark") {
      lightLines.push(`  /* ${palette.name} */`);
      for (const stop of palette.stops) lightLines.push(`  --color-${key}-${stop.step}: ${stop.hex};`);
      lightLines.push("");
    }

    if (mode !== "light") {
      darkLines.push(`    /* ${palette.name} */`);
      for (const stop of palette.darkStops) darkLines.push(`    --color-${key}-${stop.step}: ${stop.hex};`);
      darkLines.push("");
    }
  }

  if (mode === "light") {
    if (lightLines[lightLines.length - 1] === "") lightLines.pop();
    lightLines.push("}");
    return lightLines.join("\n");
  }

  if (mode === "dark") {
    if (darkLines[darkLines.length - 1] === "") darkLines.pop();
    darkLines.push("  }");
    darkLines.push("}");
    return darkLines.join("\n");
  }

  // both
  if (lightLines[lightLines.length - 1] === "") lightLines.pop();
  lightLines.push("}");
  if (darkLines[darkLines.length - 1] === "") darkLines.pop();
  darkLines.push("  }");
  darkLines.push("}");
  return [...lightLines, "", ...darkLines].join("\n");
}

function toTailwind(palettes: Palette[], mode: ExportMode): string {
  const colorsEntries: string[] = [];

  for (const palette of palettes) {
    const key = slug(palette.name);

    if (mode !== "dark") {
      const stopsEntries = palette.stops.map((s) => `          ${s.step}: '${s.hex}',`).join("\n");
      colorsEntries.push(`        ${key}: {\n${stopsEntries}\n        },`);
    }
    if (mode !== "light") {
      const stopsEntries = palette.darkStops.map((s) => `          ${s.step}: '${s.hex}',`).join("\n");
      colorsEntries.push(`        '${key}-dark': {\n${stopsEntries}\n        },`);
    }
  }

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

function toFigma(palettes: Palette[], mode: ExportMode): string {
  // W3C Design Tokens format — compatible with Tokens Studio for Figma
  type TokenObj = Record<string, { $value: string; $type: string }>;
  type Group = Record<string, TokenObj>;
  const output: Record<string, Group | Record<string, Group>> = { color: {} };

  if (mode === "both") {
    const colorGroup = output.color as Record<string, Group>;
    colorGroup.light = {};
    colorGroup.dark  = {};
    for (const palette of palettes) {
      const key = slug(palette.name);
      colorGroup.light[key] = {};
      colorGroup.dark[key]  = {};
      for (const s of palette.stops)      colorGroup.light[key][String(s.step)] = { $value: s.hex, $type: "color" };
      for (const s of palette.darkStops)  colorGroup.dark[key][String(s.step)]  = { $value: s.hex, $type: "color" };
    }
  } else {
    const colorGroup = output.color as Group;
    for (const palette of palettes) {
      const key   = slug(palette.name);
      const stops = mode === "dark" ? palette.darkStops : palette.stops;
      colorGroup[key] = {};
      for (const s of stops) colorGroup[key][String(s.step)] = { $value: s.hex, $type: "color" };
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

export function generateExport(palettes: Palette[], format: ExportFormat, mode: ExportMode = "light"): string {
  switch (format) {
    case "json":     return toJSON(palettes, mode);
    case "css":      return toCSS(palettes, mode);
    case "tailwind": return toTailwind(palettes, mode);
    case "figma":    return toFigma(palettes, mode);
  }
}
