#!/usr/bin/env node
// Generates responsive AVIF/WebP derivatives for the raster assets the engine
// copied into public/images, plus lib/image-manifest.json for the renderer.
// Runs as the site's prebuild step. Originals are never rewritten — og:image
// URLs and tech-seo reachability checks keep pointing at the exact bytes the
// engine shipped. Every failure is per-image and fail-open: a skipped image
// keeps its plain <img> rendering, because a missing derivative must never
// block a site build.
//
// Incremental: every `npm run build` in an engineer's working copy (each
// screenshot round, each build check, each try) re-encoded every image into
// six AVIF/WebP derivatives, 12 images about 6 s on a desktop and several
// times that on a shared runner. A derivative is a pure function of its
// source bytes and the settings below, so .cache/optimize-images.json keeps
// each source's digest and manifest entry; an unchanged source whose
// derivatives are all on disk is not encoded again. A fresh checkout has no
// cache and encodes everything, as before.
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

const IMAGES_ROOT = join("public", "images");
const DERIVED_DIR = "derived";
const MANIFEST_PATH = join("lib", "image-manifest.json");
const CACHE_PATH = join(".cache", "optimize-images.json");
const SOURCE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
// 480 covers small phones, 960 covers phone@2x and tablets, 1440 covers the
// 1200px desktop container at typical density. Never upscaled past the source.
const TARGET_WIDTHS = [480, 960, 1440];
const FORMATS = [
  { format: "avif", options: { quality: 55 } },
  { format: "webp", options: { quality: 78 } },
];

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch (error) {
    console.warn(`optimize-images: sharp unavailable, keeping original images (${error?.message ?? error})`);
    return null;
  }
}

async function collectSources(directory, relativePath, out) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!relativePath && entry.name === DERIVED_DIR) continue;
      await collectSources(join(directory, entry.name), childRelative, out);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      out.push(childRelative);
    }
  }
}

async function readCache(key) {
  try {
    const cache = JSON.parse(await readFile(CACHE_PATH, "utf8"));
    return cache && cache.key === key && cache.images && typeof cache.images === "object" ? cache.images : {};
  } catch {
    return {};
  }
}

async function allOnDisk(variants) {
  for (const variant of variants) {
    try {
      if (!(await stat(join("public", ...variant.src.replace(/^\/+/, "").split("/")))).isFile()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

const sharp = await loadSharp();
const manifest = {};
let variantCount = 0;
let reused = 0;
const SETTINGS_KEY = JSON.stringify({ widths: TARGET_WIDTHS, formats: FORMATS });
const cached = sharp ? await readCache(SETTINGS_KEY) : {};
const nextCache = {};
if (sharp) {
  const sources = [];
  await collectSources(IMAGES_ROOT, "", sources);
  sources.sort((left, right) => left.localeCompare(right, "en"));
  for (const relativeSource of sources) {
    const publicSrc = `/images/${relativeSource}`;
    try {
      const sourceFile = join(IMAGES_ROOT, ...relativeSource.split("/"));
      const sha = createHash("sha256").update(await readFile(sourceFile)).digest("hex");
      const hit = cached[relativeSource];
      if (hit?.sha === sha && hit.entry?.variants?.length && await allOnDisk(hit.entry.variants)) {
        manifest[publicSrc] = hit.entry;
        nextCache[relativeSource] = hit;
        variantCount += hit.entry.variants.length;
        reused += 1;
        continue;
      }
      const metadata = await sharp(sourceFile).metadata();
      if (!metadata.width || !metadata.height) continue;
      // EXIF orientations 5-8 render sideways; derivatives are re-encoded via
      // rotate() (which drops EXIF), so the manifest must carry displayed dims.
      const sideways = (metadata.orientation ?? 1) >= 5;
      const displayWidth = sideways ? metadata.height : metadata.width;
      const displayHeight = sideways ? metadata.width : metadata.height;
      const widths = TARGET_WIDTHS.filter((width) => width <= displayWidth);
      if (!widths.length) widths.push(displayWidth);
      const strippedName = relativeSource.replace(/\.[^./]+$/, "");
      const variants = [];
      for (const { format, options } of FORMATS) {
        for (const width of widths) {
          const derivedRelative = `${DERIVED_DIR}/${strippedName}.w${width}.${format}`;
          const derivedFile = join(IMAGES_ROOT, ...derivedRelative.split("/"));
          await mkdir(dirname(derivedFile), { recursive: true });
          await sharp(sourceFile)
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .toFormat(format, options)
            .toFile(derivedFile);
          variants.push({ src: `/images/${derivedRelative}`, width, format });
        }
      }
      manifest[publicSrc] = { width: displayWidth, height: displayHeight, variants };
      nextCache[relativeSource] = { sha, entry: manifest[publicSrc] };
      variantCount += variants.length;
    } catch (error) {
      console.warn(`optimize-images: skipped ${publicSrc}: ${error?.message ?? error}`);
    }
  }
}
const sorted = Object.fromEntries(
  Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right, "en")),
);
await writeFile(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
if (sharp) {
  try {
    await mkdir(dirname(CACHE_PATH), { recursive: true });
    await writeFile(CACHE_PATH, JSON.stringify({ key: SETTINGS_KEY, images: nextCache }));
  } catch (error) {
    console.warn(`optimize-images: cache not written (${error?.message ?? error})`);
  }
}
console.log(`optimize-images: ${Object.keys(sorted).length} images, ${variantCount} derivatives${reused ? ` (${reused} unchanged, not re-encoded)` : ""}`);

// The share card (og:image, twitter:image), read by lib/share-card.ts. A
// shared link shows one picture, 1200x630 at 1.91:1, and Facebook, X,
// LinkedIn and chat apps draw nothing for an SVG: mashup-maker.com shared its
// SVG logo from every page while it had a dozen pictures (2026-11-25). The
// card is cut from the site's share image (lib/site-config.json ogImage)
// with sharp's attention crop; a site with no raster picture at all gets its
// own logo drawn on its own background colour. One card, named by its
// digest and re-cut only when its source or background changes; the source
// itself is never rewritten.
const SHARE_CARDS_PATH = join("lib", "share-images.json");
const SHARE_CARD = { width: 1200, height: 630 };
const SHARE_RASTER = /\.(?:png|jpe?g|webp|gif)$/i;

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

/** A site path ("/images/x.png") as its file under public/, or null for anything else. */
function publicFileOf(src) {
  if (typeof src !== "string" || !src.startsWith("/") || src.startsWith("//")) return null;
  const path = src.split(/[?#]/, 1)[0].replace(/^\/+/, "");
  if (!path || path.split("/").some((part) => !part || part === "." || part === "..")) return null;
  return join("public", ...path.split("/"));
}

async function cutShareCard(src, background, previous) {
  const file = publicFileOf(src);
  if (!file) return null;
  const path = src.split(/[?#]/, 1)[0];
  const vector = /\.svg$/i.test(path);
  if (!vector && !SHARE_RASTER.test(path)) return null;
  let bytes;
  try {
    bytes = await readFile(file);
  } catch {
    return null;
  }
  // The card's bytes are a function of the source, the background (the logo
  // is drawn on it, a photo's transparency is flattened onto it) and the cut.
  // Its name carries that digest: Facebook, X, LinkedIn and chat apps cache a
  // card by URL, so a changed card under the same name would never be seen.
  const sha = createHash("sha256").update(bytes).update(`\0${background}\0${JSON.stringify(SHARE_CARD)}`).digest("hex");
  const name = path.replace(/^\/+/, "").replace(/^images\//, "").replace(/\.[^./]+$/, "").replace(/[^a-zA-Z0-9/_-]/g, "-");
  const out = `/images/${DERIVED_DIR}/share/${name}.${sha.slice(0, 8)}.${SHARE_CARD.width}x${SHARE_CARD.height}.${vector ? "png" : "jpg"}`;
  const card = { src: out, width: SHARE_CARD.width, height: SHARE_CARD.height, sha };
  const hit = previous?.[src];
  if (hit?.sha === sha && hit.src === out && await allOnDisk([{ src: out }])) return { card, reused: true };
  const outFile = publicFileOf(out);
  await mkdir(dirname(outFile), { recursive: true });
  if (vector) {
    // The logo whole, centred with room around it, on the site's background.
    const mark = await sharp(bytes, { density: 384 })
      .resize({ width: Math.round(SHARE_CARD.width * 0.7), height: Math.round(SHARE_CARD.height * 0.6), fit: "inside" })
      .png()
      .toBuffer();
    await sharp({ create: { width: SHARE_CARD.width, height: SHARE_CARD.height, channels: 4, background } })
      .composite([{ input: mark, gravity: "center" }])
      .png()
      .toFile(outFile);
  } else {
    await sharp(bytes)
      .rotate()
      .resize({ width: SHARE_CARD.width, height: SHARE_CARD.height, fit: "cover", position: "attention" })
      .flatten({ background })
      .jpeg({ quality: 82 })
      .toFile(outFile);
  }
  return { card, reused: false };
}

const shareCards = {};
if (sharp) {
  const config = await readJson(join("lib", "site-config.json"));
  const previous = await readJson(SHARE_CARDS_PATH);
  const declared = typeof config?.design?.background === "string" ? config.design.background.trim() : "";
  const background = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(declared) ? declared : "#ffffff";
  // The share image first; the logo only when the site has no usable one.
  for (const src of [config?.ogImage, config?.brandLogo]) {
    if (typeof src !== "string" || !src) continue;
    try {
      const cut = await cutShareCard(src, background, previous);
      if (!cut) continue;
      shareCards[src] = cut.card;
      console.log(`optimize-images: share card ${cut.card.src} from ${src}${cut.reused ? " (unchanged)" : ""}`);
      break;
    } catch (error) {
      console.warn(`optimize-images: no share card from ${src}: ${error?.message ?? error}`);
    }
  }
}
await writeFile(SHARE_CARDS_PATH, `${JSON.stringify(shareCards, null, 2)}\n`);
