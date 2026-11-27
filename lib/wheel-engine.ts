// The wheel engine: entry parsing (with optional weights), segment geometry
// for the SVG wheel, cryptographically random winner picking, and the final
// rotation that lands the pointer on the drawn segment. Pure functions —
// the React components drive them.

export type WheelEntry = { label: string; weight: number };

/** Parse the textarea: one entry per line; a trailing ×N (or *N, xN) weights it. */
export function parseEntries(raw: string): WheelEntry[] {
  const lines = raw.split("\n");
  const out: WheelEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(.+?)\s*[×xX*]\s*(\d{1,3})$/);
    if (m && m[1].trim()) {
      const w = Math.min(50, Math.max(1, parseInt(m[2], 10)));
      out.push({ label: m[1].trim(), weight: w });
    } else {
      out.push({ label: trimmed, weight: 1 });
    }
  }
  return out.slice(0, 1000);
}

export type Segment = {
  label: string;
  index: number;
  startAngle: number; // degrees, -90 is the top (pointer), clockwise
  endAngle: number;
  midAngle: number;
  shareDeg: number;
  fill: string;
  textFill: string;
};

const CX = 200;
const CY = 200;
const R = 198;

function srgbChannel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

const INK = "#14231c";
const CREAM = "#f3efe4";

/** Dark ink on light segments, cream on deep ones. */
export function textColorFor(fill: string): string {
  return luminance(fill) > 0.35 ? INK : CREAM;
}

/** Build pie segments starting at the top (−90°) going clockwise, weighted. */
export function buildSegments(entries: WheelEntry[], palette: string[]): Segment[] {
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0) || 1;
  let cursor = -90;
  return entries.map((entry, index) => {
    const shareDeg = (entry.weight / totalWeight) * 360;
    const seg: Segment = {
      label: entry.label,
      index,
      startAngle: cursor,
      endAngle: cursor + shareDeg,
      midAngle: cursor + shareDeg / 2,
      shareDeg,
      fill: palette[index % palette.length],
      textFill: "#14231c",
    };
    seg.textFill = textColorFor(seg.fill);
    cursor += shareDeg;
    return seg;
  });
}

/** SVG path for one pie segment (arc from start to end, clockwise). */
export function segmentPath(seg: Segment): string {
  const rad0 = (seg.startAngle * Math.PI) / 180;
  const rad1 = (seg.endAngle * Math.PI) / 180;
  const x0 = CX + R * Math.cos(rad0);
  const y0 = CY + R * Math.sin(rad0);
  const x1 = CX + R * Math.cos(rad1);
  const y1 = CY + R * Math.sin(rad1);
  const large = seg.shareDeg > 180 ? 1 : 0;
  return `M${CX} ${CY} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
}

/** Position (and rotation) for a segment's label. Hide labels too small to read. */
export function labelFor(seg: Segment): { x: number; y: number; rotate: number; text: string; hidden: boolean; size: number } {
  const mid = ((seg.midAngle * Math.PI) / 180);
  const tx = CX + 150 * Math.cos(mid);
  const ty = CY + 150 * Math.sin(mid);
  const maxChars = Math.max(4, Math.floor(seg.shareDeg / 4.2));
  const text = seg.label.length > maxChars ? seg.label.slice(0, Math.max(3, maxChars - 1)) + "…" : seg.label;
  const size = seg.shareDeg < 14 ? 13 : seg.shareDeg < 24 ? 14 : 15;
  return { x: tx, y: ty, rotate: seg.midAngle, text, hidden: seg.shareDeg < 9, size };
}

/** Cryptographically random integer in [0, max). Rejection sampling — no modulo bias. */
export function randomInt(max: number): number {
  if (max <= 1) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let v = 0;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % max;
}

/** Pick an entry index, honouring weights. */
export function pickIndex(entries: WheelEntry[]): number {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return 0;
  let r = randomInt(total);
  for (let i = 0; i < entries.length; i++) {
    r -= entries[i].weight;
    if (r < 0) return i;
  }
  return entries.length - 1;
}

/**
 * The final cumulative rotation (degrees, clockwise) that lands the pointer —
 * fixed at the top, world angle −90° — on the middle of segment `index`,
 * after `turns` extra full revolutions, plus a natural jitter inside the segment.
 */
export function finalRotation(currentRotation: number, seg: Segment, turns: number, jitter: number): number {
  const base = currentRotation + turns * 360;
  const target = -90 - seg.midAngle; // rotation that puts seg.midAngle at −90°
  const delta = (((target - (base % 360)) % 360) + 360) % 360;
  const clamp = Math.min(jitter, Math.max(0, seg.shareDeg / 2 - 1));
  return base + delta + clamp;
}

/** Themes: palettes for segment fills. Festive sets mix deep + light tones. */
export type WheelTheme = { id: string; name: string; colors: string[] };

export const THEMES: WheelTheme[] = [
  { id: "classic", name: "Classic", colors: ["#ffc94a", "#f3efe4", "#7cc6a6", "#e8896b", "#9ac7e8"] },
  { id: "harvest", name: "Harvest", colors: ["#ffc94a", "#e8896b", "#f3efe4", "#d9a441", "#a8d8c0"] },
  { id: "ocean", name: "Ocean", colors: ["#9ac7e8", "#7cc6a6", "#f3efe4", "#6fa3d1", "#ffd56e"] },
  { id: "berry", name: "Berry", colors: ["#e8896b", "#f3efe4", "#d17a9e", "#ffc94a", "#9ac7e8"] },
  { id: "candy", name: "Candy", colors: ["#f6a5c0", "#ffc94a", "#f3efe4", "#9ac7e8", "#e8896b"] },
  { id: "forest", name: "Forest", colors: ["#a8d8c0", "#f3efe4", "#cfe3d2", "#e8b87a", "#9ac7e8"] },
  { id: "paper", name: "Paper", colors: ["#f3efe4", "#d9d4c4", "#b9c4b4", "#e8e2cf", "#c9c4b2"] },
  { id: "holly", name: "Holly", colors: ["#c94f5d", "#f3efe4", "#4e8a5f", "#ffc94a", "#e8896b"] },
  { id: "frost", name: "Frost", colors: ["#9ac7e8", "#f3efe4", "#5e86b8", "#d9e6f5", "#ffc94a"] },
];

export function themeById(id: string): WheelTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** The sample wheel on first load: eight real names, ready to spin. */
export const SAMPLE_ENTRIES = ["Maya", "Leo", "Priya", "Sam", "Aisha", "Diego", "Nora", "Kai"];

/** easeOutCubic for the rAF spin animation. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
