#!/usr/bin/env node
// Records which primary copy a translated locale page was written from, so a
// later change to that copy marks the page stale (QA and the growth loop
// read the same hash: shared/locale-pages.ts localeSourceHash).
//
//   node scripts/locale-stamp.mjs es /pricing      stamp the es page of /pricing (its own path, /precios, works too)
//   node scripts/locale-stamp.mjs es --all         stamp every es translation
//   node scripts/locale-stamp.mjs --check          list stale and unstamped pages (exit 1 when any)
//
// Stamp a page only when you have just written it from the primary page's
// current copy: the stamp says "this translation is up to date".
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const CONFIG = "lib/site-config.json";
const norm = (path) => (String(path || "/").trim().replace(/^(?!\/)/, "/").replace(/\/+$/, "") || "/");
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`
    : JSON.stringify(value ?? null);
const hashOf = (content) => createHash("sha256").update(stable(content)).digest("hex").slice(0, 16);

const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const primaryKey = new Map((config.routes ?? []).map((route) => [norm(route.path), route.contentKey]));
const sourceHash = (route) => {
  if (route.localeOnly) return null;
  const key = primaryKey.get(norm(route.translates ?? route.path));
  if (!key) return null;
  try { return hashOf(JSON.parse(readFileSync(`content/${key}.json`, "utf8"))); } catch { return null; }
};

const [first, ...rest] = process.argv.slice(2);
if (!first || first === "--check") {
  let behind = 0;
  for (const locale of config.locales ?? []) {
    for (const route of locale.routes ?? []) {
      const current = sourceHash(route);
      if (!current || route.sourceHash === current) continue;
      behind += 1;
      console.log(`${route.sourceHash ? "stale" : "unstamped"} /${locale.code}${norm(route.path) === "/" ? "" : norm(route.path)}/ (from ${norm(route.translates ?? route.path)})`);
    }
  }
  if (!behind) console.log("every translated locale page is up to date");
  process.exit(behind ? 1 : 0);
}

const locale = (config.locales ?? []).find((entry) => entry.code === first.toLowerCase());
if (!locale) {
  console.error(`no locale "${first}" in ${CONFIG}`);
  process.exit(2);
}
// A page is named by its own locale path (/precios) or by the primary path it translates (/pricing).
const all = rest.includes("--all");
const wanted = new Set(rest.filter((arg) => arg !== "--all").map(norm));
if (!all && !wanted.size) {
  console.error(`name the ${locale.code} page(s) to stamp (a locale or primary path), or --all`);
  process.exit(2);
}
const matched = (locale.routes ?? []).filter((route) => all || wanted.has(norm(route.path)) || (!route.localeOnly && wanted.has(norm(route.translates ?? route.path))));
const stampable = matched.filter((route) => sourceHash(route));
if (!stampable.length) {
  console.error(`no translated ${locale.code} page matches ${all ? "--all" : [...wanted].join(", ")} (a locale-only page has no primary copy to stamp)`);
  process.exit(2);
}
let changed = 0;
for (const route of stampable) {
  const current = sourceHash(route);
  if (route.sourceHash === current) continue;
  route.sourceHash = current;
  changed += 1;
}
if (changed) writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`);
console.log(changed ? `stamped ${changed} ${locale.code} page(s)` : `${stampable.length} ${locale.code} page(s) already stamped; ${CONFIG} unchanged`);
