// MEASURE: the wheel lands the pointer on the winner it announces.
// For 300 random picks through the site's real engine: rotate the drawn
// wheel by finalRotation(...) and read which segment sits under the fixed
// pointer at the top (world angle -90deg, i.e. 270deg clockwise from -90).
// That segment must be the picked one, weights included. Also checks the
// announced winner is always one of the parsed entries.
import { execSync } from "node:child_process";

execSync(
  "npx esbuild lib/wheel-engine.ts --bundle --format=esm --outfile=.cache/wheel-engine.bundle.mjs --log-level=error",
  { stdio: "inherit" },
);
const bundleUrl = new URL("../.cache/wheel-engine.bundle.mjs", import.meta.url).href;
const { parseEntries, pickIndex, buildSegments, finalRotation, SAMPLE_ENTRIES } =
  await import(bundleUrl);

let failures = 0;
const check = (name, ok, value, unit, detail) => {
  if (!ok) failures += 1;
  console.log(
    `MEASURE {"name":${JSON.stringify(name)},"ok":${ok},"value":${value},"unit":"${unit}","detail":"${detail}"}`,
  );
};

const cases = [
  parseEntries(SAMPLE_ENTRIES.join("\n")), // 8 equal entries
  parseEntries("Yes\nNo\nMaybe"), // preset page wheel
  parseEntries("Alpha ×3\nBeta\nGamma"), // weighted
  parseEntries(Array.from({ length: 60 }, (_, i) => `Item ${i + 1}`).join("\n")), // dense real-size wheel
];

let misses = 0;
let runs = 0;
const norm = (a) => ((a % 360) + 360) % 360;
for (const entries of cases) {
  const segs = buildSegments(entries, ["#ffc94a", "#f3efe4", "#7cc6a6", "#e8896b", "#9ac7e8"]);
  for (let i = 0; i < 75; i++) {
    const idx = pickIndex(entries);
    const jitter = Math.random() * segs[idx].shareDeg * 0.3;
    const turns = 4 + Math.floor(Math.random() * 3);
    const baseRot = Math.random() * 360; // like real spins after previous ones
    const rot = finalRotation(baseRot, segs[idx], turns, jitter);
    // pointer at -90deg clockwise (top); find the segment covering it,
    // with all angles normalized into [0,360) and wrap handled
    const a = norm(-90 - rot);
    const under = segs.findIndex((s) => {
      const s0 = norm(s.startAngle);
      const s1 = norm(s.endAngle);
      return s0 < s1 ? a >= s0 && a < s1 : a >= s0 || a < s1;
    });
    runs += 1;
    if (under !== idx) misses += 1;
    if (!entries[idx]) misses += 1;
  }
}
check(
  "pointer lands on announced winner",
  misses === 0,
  misses,
  "misses",
  `${runs} random spins across 4 wheel shapes, weights included`,
);

process.exit(failures ? 1 : 0);
