// MEASURE: the first screen's composition, the way the quality ruler reads it.
// Phone 390x844: the tool's first control must sit at most 48px above the fold.
// Desktop 1440x900: the whole tool loop (the stage) must fit the first screen.
// Reads SHIPSITE_URL when set (verify_live); otherwise serves dist/ locally.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const root = process.env.MEASURE_DIST || "dist";
const base = process.env.SHIPSITE_URL;
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".json": "application/json", ".txt": "text/plain",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".map": "application/json",
};

let server = null;
if (!base) {
  server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    let f = join(root, p);
    if (!existsSync(f) || statSync(f).isDirectory()) f = join(root, p.replace(/\/$/, "") + "/index.html");
    if (!existsSync(f)) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream" });
    res.end(readFileSync(f));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
}
const origin = base ?? `http://127.0.0.1:${server.address().port}`;

const SELS = [
  ".site-header", ".headline", ".headline h1", ".lede", ".cta-row", ".preview-note",
  ".stage", ".wheeltitle", ".wheelwrap", ".wheelbtn", ".panel", ".panel textarea",
  ".spinrow", ".quietlinks", ".countline",
];

const browser = await chromium.launch();
let ok = true;
try {
  for (const [w, h, label] of [[390, 844, "phone"], [1440, 900, "desktop"]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(origin + "/", { waitUntil: "networkidle" });
    const rects = await page.evaluate((sels) => {
      const out = { scrollWidth: document.documentElement.scrollWidth };
      for (const s of sels) {
        const el = document.querySelector(s);
        out[s] = el
          ? (({ top, bottom, height }) => ({ top: Math.round(top), bottom: Math.round(bottom), height: Math.round(height) }))(el.getBoundingClientRect())
          : null;
      }
      return out;
    }, SELS);
    console.log(label.toUpperCase(), JSON.stringify(rects));
    const overflow = rects.scrollWidth > w;
    if (overflow) ok = false;
    console.log(`MEASURE {"name":"no horizontal overflow ${label}","ok":${!overflow},"value":${rects.scrollWidth},"unit":"px","detail":"scrollWidth at ${w}, bounds 0..${w}"}`);
    if (label === "phone") {
      const wheel = rects[".wheelbtn"] ?? { top: 99999 };
      const ctl = rects[".panel textarea"] ?? rects[".spinrow"] ?? { top: 99999 };
      const first = Math.max(wheel.top, ctl.top);
      const pass = first <= h - 48;
      if (!pass) ok = false;
      console.log(`MEASURE {"name":"phone first tool control","ok":${pass},"value":${first},"unit":"px","detail":"first control (wheel button at ${wheel.top}, editor at ${ctl.top}), bounds 0..${h - 48}"}`);
    } else {
      const loop = rects[".stage"];
      const pass = loop ? loop.bottom <= h : false;
      if (!pass) ok = false;
      console.log(`MEASURE {"name":"desktop tool loop fits 900","ok":${pass},"value":${loop ? loop.bottom : -1},"unit":"px","detail":"stage bottom, bounds 0..${h}"}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  if (server) server.close();
}
process.exit(ok ? 0 : 1);
