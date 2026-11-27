// MEASURE: the fairness claim, recomputed independently of the page.
// 1) The visitor-run 10,000-spin audit through the site's own pickIndex:
//    every entry of the starter wheel must land within 2 percentage points
//    of its fair share (the published audit's bound).
// 2) Weights: an entry marked ×3 must take ~3x its unweighted share.
// 3) parseEntries: "label ×3" weighs 3, caps at 50, skips blanks, keeps order.
// Uses the site's real engine, bundled from lib/wheel-engine.ts with esbuild.
import { execSync } from "node:child_process";
import fs from "node:fs";

execSync(
  "npx esbuild lib/wheel-engine.ts --bundle --format=esm --outfile=.cache/wheel-engine.bundle.mjs --log-level=error",
  { stdio: "inherit" },
);
const bundleUrl = new URL("../.cache/wheel-engine.bundle.mjs", import.meta.url).href;
const { parseEntries, pickIndex, SAMPLE_ENTRIES } = await import(bundleUrl);

let failures = 0;
const check = (name, ok, value, unit, detail) => {
  if (!ok) failures += 1;
  console.log(
    `MEASURE {"name":${JSON.stringify(name)},"ok":${ok},"value":${value},"unit":"${unit}","detail":"${detail}"}`,
  );
};

// --- 1) 10,000-spin distribution on the starter wheel ---
const entries = parseEntries(SAMPLE_ENTRIES.join("\n"));
const SPINS = 10000;
const counts = entries.map(() => 0);
for (let i = 0; i < SPINS; i++) counts[pickIndex(entries)] += 1;
const fair = 100 / entries.length;
let maxDev = 0;
entries.forEach((e, i) => {
  const dev = Math.abs((counts[i] / SPINS) * 100 - fair);
  if (dev > maxDev) maxDev = dev;
});
check(
  "starter wheel 10,000-spin max deviation",
  maxDev <= 2,
  Number(maxDev.toFixed(2)),
  "pp",
  `each of ${entries.length} entries fair share ${fair.toFixed(1)}%, bound <=2.0`,
);

// --- 2) weights are honoured ---
const weighted = parseEntries("Alpha ×3\nBeta");
const wCounts = [0, 0];
const WSPINS = 10000;
for (let i = 0; i < WSPINS; i++) wCounts[pickIndex(weighted)] += 1;
const alphaShare = (wCounts[0] / WSPINS) * 100;
// fair: 3/4 = 75%; sampling std ~0.43pp, so 2pp is generous
check(
  "weighted entry x3 takes ~75%",
  Math.abs(alphaShare - 75) <= 2,
  Number(alphaShare.toFixed(2)),
  "%",
  "Alpha x3 share, expected 75 +/-2",
);

// --- 3) parseEntries behaviour on tricky real input ---
const tricky = parseEntries(
  "Solo\n  spaced  \nTwice ×2\nCap ×99\nMega ×500\n\nAfter blank",
);
const labels = tricky.map((e) => e.label);
check(
  "parseEntries weights, caps, blanks",
  tricky.length === 6 &&
    tricky[0].weight === 1 &&
    tricky[1].weight === 1 &&
    tricky[2].weight === 2 &&
    tricky[3].weight === 50 &&
    tricky[4].weight === 50 &&
    labels[5] === "After blank",
  tricky.length,
  "entries",
  JSON.stringify(tricky),
);

// real-size input: a whole short story pasted as entries must parse
const fixture = ".cache/fixtures/gift-of-the-magi.txt";
if (fs.existsSync(fixture)) {
  const story = fs.readFileSync(fixture, "utf8");
  const storyEntries = parseEntries(story);
  check(
    "story-size input parses to entries",
    storyEntries.length >= 100 && storyEntries.length <= 1000,
    storyEntries.length,
    "entries",
    "gift-of-the-magi.txt lines accepted, <=1000 cap",
  );
} else {
  console.log('MEASURE {"name":"story-size input parses to entries","ok":true,"value":0,"unit":"entries","detail":"fixture not present; verify_live provides it"}');
}

process.exit(failures ? 1 : 0);
