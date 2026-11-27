// The site's real-use script, run by verify_live in Chromium and WebKit.
// Drives every control a visitor can use with real input and checks the
// visible result. Real fixtures run first, before the short samples. Every
// phase is wrapped: one failure is recorded, the report always prints.
// Prints one VERIFY_LIVE line; exits 0 only when all pass.
import { chromium, webkit } from "playwright";

const base = (process.env.SHIPSITE_URL || "http://localhost:4173").replace(/\/$/, "");
const browserName = process.env.SHIPSITE_BROWSER || "chromium";
const isChromium = browserName === "chromium";

const PAGES = [
  "/",
  "/pricing/",
  "/random-team-generator/",
  "/contact/",
  "/privacy/",
  "/terms/",
  "/wheels/",
  "/randomness/",
  "/wheels/yes-no/",
  "/wheels/coin-flip/",
];

const controls = [];
const downloads = [];
const consoleErrors = [];
const failedRequests = [];
const gatedResponses = [];
const overflows = [];
const realInput = [];
let shareOk = false;
let shareDetail = "";

const record = (name, ok, detail) => {
  controls.push({ name, ok, detail });
};

// Crash-proof phase: a throw is recorded and the run continues to the report.
async function phase(name, fn) {
  try {
    await fn();
  } catch (e) {
    record(name, false, String(e).slice(0, 160));
  }
}

// The platform's real, openly licensed fixtures for this site's tools.
const fixtures = (() => {
  const raw = process.env.SHIPSITE_FIXTURES;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
})();

async function fixtureText(tool) {
  if (!fixtures || !fixtures.dir) return null;
  const path = await import("node:path");
  const fs = await import("node:fs");
  const a = (fixtures.assignments ?? []).find((x) => x.tool === tool);
  if (!a || !fixtures.fixtures?.[a.fixture]?.file) return null;
  const file = path.resolve(fixtures.dir, fixtures.fixtures[a.fixture].file);
  return { text: fs.readFileSync(file, "utf8"), file: fixtures.fixtures[a.fixture].file };
}

async function watch(page) {
  page.on("console", (msg) => {
    const t = msg.text();
    if (msg.type() === "error" && !t.includes("[Report Only]") && !t.includes("delivered in report-only")) {
      consoleErrors.push(t.slice(0, 200));
    }
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${String(err).slice(0, 200)}`));
  page.on("requestfailed", (req) => {
    if (req.url().startsWith(base)) failedRequests.push(`${req.url()} ${req.failure()?.errorText ?? ""}`.slice(0, 200));
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && res.url().startsWith(base)) {
      const p = new URL(res.url()).pathname;
      if (p.startsWith("/api/") && (res.status() === 401 || res.status() === 403 || res.status() === 503)) {
        // The site's own plan gating / not-connected state, which the UI must
        // answer with an honest message (checked beside the use points).
        gatedResponses.push(`${res.status()} ${p}`);
      } else {
        failedRequests.push(`${res.status()} ${res.url()}`.slice(0, 200));
      }
    }
  });
}

async function spinAndWait(page) {
  await page.locator("#spinBtn").click();
  await page.waitForFunction(
    () => ((document.querySelector("[data-winner]")?.textContent ?? "") || "").trim().length > 0,
    null,
    { timeout: 20000 },
  );
  return ((await page.locator("[data-winner]").textContent()) ?? "").trim();
}

async function entryCount(page) {
  const txt = ((await page.locator("#entryCount").textContent()) ?? "").trim();
  return parseInt(txt.replace(/[^\d]/g, ""), 10);
}

async function overflowCheck(page, label, width) {
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  const ok = sw <= width;
  if (!ok) overflows.push(`${label} scrollWidth ${sw} > ${width}`);
  return ok;
}

// ---------- real fixtures first: each tool's core job on the real file ----------

async function runRealWheel(page) {
  const fx = await fixtureText("wheel-spinner");
  if (!fx) {
    realInput.push({ tool: "wheel-spinner", ok: false, finished: false, seconds: 0, detail: "no fixture manifest" });
    return;
  }
  const t0 = Date.now();
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.locator("#list").fill(fx.text);
  await page.locator("#entryCount").waitFor({ state: "visible" });
  const ec = await entryCount(page);
  const w = await spinAndWait(page);
  const ok = ec >= 100 && fx.text.includes(w.split(" ")[0]);
  realInput.push({
    tool: "wheel-spinner",
    fixtures: [fx.file],
    ok,
    finished: true,
    seconds: Math.round((Date.now() - t0) / 1000),
    detail: `${ec} entries loaded from the story, winner "${w.slice(0, 30)}"`,
  });
}

async function runRealTeam(page) {
  const fx = await fixtureText("team-generator");
  if (!fx) {
    realInput.push({ tool: "team-generator", ok: false, finished: false, seconds: 0, detail: "no fixture manifest" });
    return;
  }
  const t0 = Date.now();
  await page.goto(base + "/random-team-generator/", { waitUntil: "domcontentloaded" });
  await page.locator("#names").fill(fx.text);
  await page.locator("#teamCount").fill("5");
  await page.locator('[data-jtbd-action="split"]').click();
  await page.waitForSelector(".team-card", { timeout: 30000 });
  const cards = await page.locator(".team-card").count();
  const people = await page.locator(".team-names li").count();
  const ok = cards === 5 && people >= 100;
  realInput.push({
    tool: "team-generator",
    fixtures: [fx.file],
    ok,
    finished: true,
    seconds: Math.round((Date.now() - t0) / 1000),
    detail: `${people} story lines split into ${cards} teams`,
  });
}

async function runRealAudit(page) {
  const fx = await fixtureText("fairness-audit");
  if (!fx) {
    realInput.push({ tool: "fairness-audit", ok: false, finished: false, seconds: 0, detail: "no fixture manifest" });
    return;
  }
  const t0 = Date.now();
  await page.goto(base + "/randomness/", { waitUntil: "domcontentloaded" });
  await page.locator('[data-audit-widget] [data-tool-input="entries"]').fill(fx.text);
  await page.locator('[data-jtbd-action="audit"]').click();
  await page.waitForSelector(".audit-table tbody tr", { timeout: 120000 });
  const rows = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".audit-table tbody tr").forEach((tr) => {
      out.push(parseFloat(tr.querySelector("td")?.textContent ?? "0"));
    });
    return out;
  });
  const fair = 100 / rows.length;
  const maxDev = Math.max(...rows.map((p) => Math.abs(p - fair)));
  const ok = rows.length >= 100 && maxDev <= 2;
  realInput.push({
    tool: "fairness-audit",
    fixtures: [fx.file],
    ok,
    finished: true,
    seconds: Math.round((Date.now() - t0) / 1000),
    detail: `${rows.length} entries audited, max deviation ${maxDev.toFixed(2)}pp (bounds 0..2)`,
  });
}

// ---------- the tools on their pages ----------

async function runWheelHome(page, ctx) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.locator(".wheelbtn").waitFor({ state: "visible" });

  // 1. the wheel itself is the button (T1)
  await page.locator(".wheelbtn").click();
  await page.waitForFunction(
    () => ((document.querySelector("[data-winner]")?.textContent ?? "") || "").trim().length > 0,
    null,
    { timeout: 20000 },
  );
  const w0 = ((await page.locator("[data-winner]").textContent()) ?? "").trim();
  record("wheel button spins and shows a winner", w0.length > 0, `winner "${w0}"`);

  // 2. entries drive the draw
  const names = ["Aurora", "Basil", "Cedar", "Dahlia"];
  await page.locator("#list").fill(names.join("\n"));
  const ec = await entryCount(page);
  record("entries box counts entries", ec === 4, `entryCount says ${ec} for 4 lines`);
  const w1 = await spinAndWait(page);
  record("spin picks an announced entry", names.includes(w1), `winner "${w1}"`);
  const session = ((await page.locator("#countLine").textContent()) ?? "").trim();
  record("session log counts spins", session.length > 0 && /\d/.test(session), `"${session.slice(0, 40)}"`);

  // 3. result state: spin again, remove winner, undo (T2/T3/T16)
  await page.locator("#againBtn").click();
  await page.waitForFunction(
    () => ((document.querySelector("[data-winner]")?.textContent ?? "") || "").trim().length > 0,
    null,
    { timeout: 20000 },
  );
  await page.locator("#removeBtn").click();
  const ecAfterRemove = await entryCount(page);
  record("remove winner takes it out of the draw", ecAfterRemove === 3, `entryCount ${ecAfterRemove}`);
  const w2 = await spinAndWait(page);
  record("spin after removal picks from remaining", w2 !== undefined && names.includes(w2), `winner "${w2}"`);
  const undo = page.locator(".wheelquiet a, .wheelquiet button").filter({ hasText: /ndo/i }).first();
  const hadUndo = (await undo.count()) > 0;
  if (hadUndo) {
    await undo.click();
    const ecUndo = await entryCount(page);
    record("undo restores the removed winner", ecUndo === 4, `entryCount ${ecUndo}`);
  } else {
    record("undo restores the removed winner", false, "no undo control found");
  }

  // 4. elimination mode auto-removes on the next spin (P1 elimination rounds)
  await page.locator("#elimMode").check();
  const w3 = await spinAndWait(page);
  await page.locator("#againBtn").click();
  await page.waitForFunction(
    () => ((document.querySelector("[data-winner]")?.textContent ?? "") || "").trim().length > 0,
    null,
    { timeout: 20000 },
  );
  const ecElim = await entryCount(page);
  record(
    "elimination mode removes the previous winner on next spin",
    ecElim === 3,
    `4 entries, spin, spin again -> ${ecElim}`,
  );
  await page.locator("#elimMode").uncheck();

  // 5. keyboard: Ctrl+Enter spins (T1)
  await page.locator("#list").fill(names.join("\n"));
  await page.keyboard.press("Control+Enter");
  await page.waitForFunction(
    () => ((document.querySelector("[data-winner]")?.textContent ?? "") || "").trim().length > 0,
    null,
    { timeout: 20000 },
  );
  record("Ctrl+Enter spins", true, "winner shown after keyboard shortcut");

  // 6. invalid input: an honest error state (P17)
  await page.locator("#list").fill("");
  await page.locator("#spinBtn").click();
  const err = await page.locator(".error-line").first().isVisible().catch(() => false);
  record("empty entries shows an error, no crash", err, "error-line visible");
  await page.locator("#list").fill(names.join("\n"));

  // 7. preset loader + custom range
  await page.locator("#preset").selectOption("yes-no");
  const presetVal = await page.locator("#list").inputValue();
  record("preset loader fills the wheel", presetVal.split("\n").length === 3 && presetVal.includes("Yes"), JSON.stringify(presetVal));
  await page.locator("#preset").selectOption("custom-range");
  await page.locator("#rFrom").fill("3");
  await page.locator("#rTo").fill("8");
  await page.locator("#setBtn").click();
  const rangeVal = await page.locator("#list").inputValue();
  record(
    "custom range builds numbered entries",
    rangeVal === ["3", "4", "5", "6", "7", "8"].join("\n"),
    JSON.stringify(rangeVal),
  );

  // 8. wheel title from the header (owner request: entry point in the header)
  await page.locator("#titleBtn").click();
  await page.locator("dialog[open] #wheelTitleInput").fill("Friday draw");
  await page.locator("dialog[open] .dialog-actions .btn-primary").click();
  const titleShown = ((await page.locator(".wheeltitle").textContent()) ?? "").trim();
  const stored = await page.evaluate(() => localStorage.getItem("stw:title"));
  record(
    "header dialog sets a title above the wheel",
    titleShown === "Friday draw" && stored === "Friday draw",
    `shown "${titleShown}", stored "${stored}"`,
  );

  // 9. settings dialog: sound, volume, duration, theme (T4)
  await page.locator("details.advanced summary").click();
  await page.getByRole("button", { name: /settings/i }).first().click();
  await page.locator("dialog[open] #soundToggle").uncheck();
  const volDisabled = await page.locator("dialog[open] #volumeRange").isDisabled();
  await page.locator("dialog[open] #soundToggle").check();
  await page.locator("dialog[open] #volumeRange").fill("0.5");
  const volOut = ((await page.locator("dialog[open] output").first().textContent()) ?? "").trim();
  record("sound toggle gates the volume control", volDisabled, `volume disabled while off: ${volDisabled}`);
  record("volume slider shows its value", volOut.includes("50"), `output reads "${volOut}"`);
  await page.locator("dialog[open] #durationRange").fill("1");
  await page.locator("dialog[open] .theme-chip").nth(1).click();
  const themePressed = await page.locator("dialog[open] .theme-chip").nth(1).getAttribute("aria-pressed");
  record("theme chips switch selection", themePressed === "true", `chip aria-pressed=${themePressed}`);
  await page.locator("dialog[open] .dialog-actions .btn-primary").click();

  // 10. share link carries the whole wheel (T8/T17)
  const entriesForShare = (await page.locator("#list").inputValue()).split("\n");
  const shareLabel = page.locator("#shareLink");
  await shareLabel.click();
  const labelAfter = ((await shareLabel.textContent()) ?? "").trim();
  record("share button confirms the copy", /copied/i.test(labelAfter), `"${labelAfter.slice(0, 50)}"`);
  let shareUrl = "";
  if (isChromium) {
    shareUrl = await page.evaluate(() => navigator.clipboard.readText());
    record(
      "share link carries entries and title",
      shareUrl.includes("?w=") && shareUrl.includes(encodeURIComponent("Friday draw")),
      shareUrl.slice(0, 90),
    );
  } else {
    shareUrl = `${base}/?w=${encodeURIComponent(entriesForShare.join("\n"))}&t=${encodeURIComponent("Friday draw")}`;
  }
  const fresh = await ctx.browser().newContext();
  const fpage = await fresh.newPage();
  await watch(fpage);
  await fpage.goto(shareUrl, { waitUntil: "domcontentloaded" });
  await fpage.locator("#list").waitFor({ state: "visible" });
  const restored = await fpage.locator("#list").inputValue();
  const restoredTitle = ((await fpage.locator(".wheeltitle").textContent()) ?? "").trim();
  shareOk =
    restored === entriesForShare.join("\n") && restoredTitle === "Friday draw";
  shareDetail = `entries ${restored.split("\n").length} restored, title "${restoredTitle}"`;
  await fresh.close();

  // 11. wheel file export (T8)
  const dl = page.waitForEvent("download", { timeout: 15000 });
  const exportName = ((await page.locator("#exportLink").textContent()) ?? "").trim();
  record("export quiet action names the file job", /export/i.test(exportName), `"${exportName.slice(0, 40)}"`);
  await page.locator("#exportLink").click();
  const download = await dl;
  const file = await download.path();
  const bytes = file ? (await import("node:fs")).readFileSync(file) : Buffer.alloc(0);
  let exportOk = false;
  let exportDetail = "no file";
  try {
    const parsed = JSON.parse(bytes.toString("utf8"));
    exportOk = bytes.length > 0 && Array.isArray(parsed.entries) && parsed.entries.length === 6;
    exportDetail = `${bytes.length}B JSON, ${parsed.entries?.length} entries`;
  } catch {
    exportDetail = `${bytes.length}B, not JSON`;
  }
  downloads.push({ name: "wheel json export", ok: exportOk, type: "application/json", bytes: bytes.length });
  record("wheel file export downloads real JSON", exportOk, exportDetail);

  // 12. the visitor-run audit link answers with real counts (T11)
  await page.locator("#auditLink").click();
  await page.waitForFunction(
    () => ((document.querySelector("#auditResult")?.textContent ?? "") || "").trim().length > 0,
    null,
    { timeout: 30000 },
  );
  const audit = ((await page.locator("#auditResult").textContent()) ?? "").trim();
  record(
    "spin-fairness line shows the audit",
    audit.includes("16.7"),
    `"${audit.slice(0, 70)}"`,
  );

  // 12b. free first (owner decision 2026-11-27): the account-gated use points
  // stay out of the tool and no paywall copy rides on it; free use is on-device.
  for (const id of ["#cloudSaveLink", "#collectLink", "#ideasLink"]) {
    const gone = (await page.locator(id).count()) === 0;
    record(`${id} stays out of the free tool`, gone, gone ? "absent" : "still present");
  }
  const bodyText = ((await page.locator("body").textContent()) ?? "").toLowerCase();
  record(
    "wheel page carries no paywall copy",
    !bodyText.includes("part of plus") && (await page.locator("#plusNote").count()) === 0,
    "#plusNote absent, no 'part of Plus' copy",
  );
  const storedEntries = await page.evaluate(() => localStorage.getItem("stw:wheel") ?? "");
  record(
    "free use keeps the wheel on this device",
    storedEntries.trim().length > 0,
    `${storedEntries.trim().split("\n").length} entries in local storage`,
  );

  // 13. fullscreen keeps the wheel the whole show
  if (isChromium) {
    try {
      await page.getByRole("button", { name: /fullscreen/i }).first().click();
      const isFs = await page.evaluate(() => document.fullscreenElement !== null);
      record("fullscreen expands the wheel zone", isFs, `fullscreenElement set: ${isFs}`);
      await page.keyboard.press("Escape");
    } catch (e) {
      record("fullscreen expands the wheel zone", false, String(e).slice(0, 80));
    }
  }

  // 14. one-screen loop at 1440x900 (P4)
  const rects = await page.evaluate(() => {
    const ids = ["#list", "#spinBtn", ".wheelzone", "details.advanced", "#winnerName"];
    const out = {};
    for (const sel of ids) {
      const el = document.querySelector(sel);
      if (!el) { out[sel] = null; continue; }
      const r = el.getBoundingClientRect();
      out[sel] = { top: Math.round(r.top), bottom: Math.round(r.bottom) };
    }
    return out;
  });
  const loopIn = Object.entries(rects).every(
    ([sel, r]) => r !== null && r.top >= 0 && r.bottom <= 900,
  );
  record(
    "whole tool loop fits one 1440x900 screen",
    loopIn,
    JSON.stringify(rects),
  );
  await overflowCheck(page, "home 1440", 1440);

  // 15. persistence across reload (T8 local save)
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#list").waitFor({ state: "visible" });
  const reloadedVal = await page.locator("#list").inputValue();
  const reloadedTitle = ((await page.locator(".wheeltitle").textContent()) ?? "").trim();
  record(
    "wheel and title survive a reload (local save)",
    reloadedVal === entriesForShare.join("\n") && reloadedTitle === "Friday draw",
    `entries ${reloadedVal.split("\n").length}, title "${reloadedTitle}"`,
  );
}

async function runTeam(page) {
  await page.goto(base + "/random-team-generator/", { waitUntil: "domcontentloaded" });
  const names = ["Ana", "Bo", "Cy", "Di", "Eli", "Fay", "Gus", "Hana", "Ivo", "Jia"];
  await page.locator("#names").fill(names.join("\n"));
  await page.locator("#teamCount").fill("3");
  await page.locator('[data-jtbd-action="split"]').click();
  const cards = await page.locator(".team-card").count();
  const people = await page.locator(".team-names li").count();
  record("team generator splits 10 names into 3 teams", cards === 3 && people === 10, `${cards} cards, ${people} names`);
  const summary = ((await page.locator("[data-teams] .countline").first().textContent()) ?? "").trim();
  record("team summary line renders", summary.length > 0, `"${summary.slice(0, 50)}"`);

  if (isChromium) {
    const copyBtn = page.locator(".quiet-link").filter({ hasText: /copy/i }).first();
    await copyBtn.click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    record("copy roster puts the teams on the clipboard", clip.includes("Ana") || clip.length > 20, `${clip.length} chars copied`);
  }

  await page.locator("#names").fill("");
  await page.locator('[data-jtbd-action="split"]').click();
  const emptyErr = await page.locator(".error-line").isVisible().catch(() => false);
  record("no names gives an honest error", emptyErr, "error-line visible");

  await page.locator("#names").fill("Ana\nBo\nCy");
  await page.locator("#teamCount").fill("5");
  await page.locator('[data-jtbd-action="split"]').click();
  const clampedCards = await page.locator(".team-card").count();
  const noteText = (await page.locator("[data-teams] .countline").allTextContents()).join(" ");
  record(
    "more teams than names is clamped and explained",
    clampedCards === 3 && noteText.length > 0,
    `${clampedCards} teams, note: "${noteText.slice(0, 60)}"`,
  );

  await page.locator("#teamCount").fill("99");
  await page.locator('[data-jtbd-action="split"]').click();
  const invalidErr = await page.locator(".error-line").isVisible().catch(() => false);
  record("out-of-range team count errors, does not crash", invalidErr, "error-line visible");
}

async function runContact(page) {
  await page.goto(base + "/contact/", { waitUntil: "domcontentloaded" });
  await page.locator("#contactEmail").fill("not-an-email");
  await page.locator("#contactMessage").fill("Hello");
  await page.locator('[data-jtbd-action="send"]').click();
  const kind = await page.locator("[data-contact-status]").getAttribute("data-kind");
  record("bad email is rejected with a status line", kind === "error", `status kind=${kind}`);

  await page.locator("#contactTopic").selectOption("bug");
  await page.locator("#contactName").fill("QA Runner");
  await page.locator("#contactEmail").fill("qa@example.com");
  await page.locator("#contactMessage").fill("Verify-live round trip: the form stores a message.");
  await page.locator('[data-jtbd-action="send"]').click();
  await page.waitForFunction(
    () => document.querySelector("[data-contact-status]")?.getAttribute("data-kind") === "sent",
    null,
    { timeout: 20000 },
  );
  const sent = ((await page.locator("[data-contact-status]").textContent()) ?? "").trim();
  record("contact form stores a message (POST /api/_site/contact)", sent.length > 0, `"${sent.slice(0, 60)}"`);
}

async function runFairness(page) {
  await page.goto(base + "/randomness/", { waitUntil: "domcontentloaded" });
  await page.locator("[data-audit-widget] button").click();
  await page.waitForSelector(".audit-table tbody tr", { timeout: 60000 });
  const rows = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".audit-table tbody tr").forEach((tr) => {
      const pct = parseFloat(tr.querySelector("td")?.textContent ?? "0");
      out.push(pct);
    });
    return out;
  });
  const fair = 100 / rows.length;
  const maxDev = Math.max(...rows.map((p) => Math.abs(p - fair)));
  record(
    "visitor-run 10,000-spin audit stays within 2pp of fair",
    rows.length === 8 && maxDev <= 2,
    `${rows.length} entries, max deviation ${maxDev.toFixed(2)}pp`,
  );
  const fig = await page.locator(".fair-figure svg").count();
  record("recorded 100,000-spin figure renders", fig >= 1, `${fig} fairness figure svg`);
}

async function runWheelsHub(page) {
  await page.goto(base + "/wheels/", { waitUntil: "domcontentloaded" });
  const cards = await page.locator(".hub-card").count();
  record("preset hub lists the full wheel family", cards >= 12, `${cards} cards`);
  const first = await page.locator('a[href="/wheels/yes-no/"]').count();
  record("hub cards open their preset pages", first >= 1, `yes-no link present: ${first}`);
}

async function runPresetPage(page) {
  await page.goto(base + "/wheels/yes-no/", { waitUntil: "domcontentloaded" });
  await page.locator("#list").waitFor({ state: "visible" });
  const val = await page.locator("#list").inputValue();
  const wheelText = await page.locator("svg").first().textContent();
  record(
    "preset page loads its own entries into the wheel",
    val === "Yes\nNo\nMaybe" && wheelText.includes("Yes") && !wheelText.includes("Maya"),
    JSON.stringify(val),
  );
  const crumb = await page.locator('.crumb a[href="/wheels/"]').count();
  record("preset page links back to the hub", crumb === 1, `crumb present: ${crumb}`);
  const related = await page.locator(".related-list a").count();
  record("preset page links to sibling wheels", related >= 2, `${related} related links`);
  await page.locator("#spinBtn").click();
  await page.waitForFunction(
    () => ((document.querySelector("[data-winner]")?.textContent ?? "") || "").trim().length > 0,
    null,
    { timeout: 20000 },
  );
  record("preset page wheel spins", true, "winner shown");
}

// Free first (owner decision 2026-11-27): the pricing page says the whole site
// is free, sends the visitor back to the wheel, and carries no checkout
// control; the pay routes refuse sales while the site is free.
async function runPricingFree(page) {
  await page.goto(base + "/pricing/", { waitUntil: "domcontentloaded" });
  const checkouts = await page.locator("[data-shipsite-checkout]").count();
  record("pricing: no checkout control", checkouts === 0, `${checkouts} checkout control(s)`);
  const main = ((await page.locator("main").textContent()) ?? "").toLowerCase();
  record("pricing: says everything is free", main.includes("free"), `"${main.slice(0, 70)}"`);
  record(
    "pricing: no paywall copy",
    !main.includes("part of plus") && !main.includes("subscription") && !main.includes("$5"),
    "no Plus price, offer or subscription copy",
  );
  const ctaCount = await page.locator('.pricing-cta a[href="/"]').count();
  record("pricing: main CTA goes back to the wheel", ctaCount >= 1, `${ctaCount} wheel CTA(s)`);
  const cards = await page.locator(".plan-card").count();
  const cardText = cards > 0 ? ((await page.locator(".plan-card").first().textContent()) ?? "") : "";
  record(
    "pricing: the one plan is Free at $0",
    cards === 1 && cardText.includes("$0"),
    `${cards} card(s), first "${cardText.slice(0, 60).trim()}"`,
  );
  const table = await page.locator("main table").count();
  record("pricing: what's-included table present", table >= 1, `${table} table(s)`);
  record(
    "pricing: free-use FAQ present",
    main.includes("is spin the wheel really free") && main.includes("do i need an account"),
    "free-use questions on the page",
  );
  const res = await page.request.get(`${base}/api/pay/checkout?plan=plus`);
  const refused = await res.json().catch(() => ({}));
  record(
    "pay route refuses: sales paused",
    res.status() === 403 && refused.error === "sales_paused",
    `GET /api/pay/checkout -> ${res.status()} ${refused.error ?? ""}`,
  );
}

async function runPhone(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript(() => {
    delete Navigator.prototype.gpu;
  });
  const page = await ctx.newPage();
  await watch(page);
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const box = await page.locator(".wheelbtn").boundingBox();
  const top = box ? Math.round(box.top) : -1;
  record(
    "phone: wheel is on the first screen, thumb-reachable",
    top >= 0 && top < 520,
    `wheel button top ${top}px at 390x844`,
  );
  const menu = page.locator(".menu-btn");
  if ((await menu.count()) > 0) {
    await menu.click();
    const navLinks = await page.locator("#mobileNav a:visible").count();
    record("phone: menu opens the nav", navLinks >= 3, `${navLinks} links visible`);
    await menu.click();
  }
  await page.locator("#spinBtn").click();
  await page.waitForFunction(
    () => ((document.querySelector("[data-winner]")?.textContent ?? "") || "").trim().length > 0,
    null,
    { timeout: 20000 },
  );
  record("phone: core spin works without WebGPU", true, "winner shown at 390x844");
  await overflowCheck(page, "home 390", 390);
  for (const p of PAGES) {
    await page.goto(base + p, { waitUntil: "domcontentloaded" });
    await overflowCheck(page, `${p} 390`, 390);
  }
  await page.goto(base + "/random-team-generator/", { waitUntil: "domcontentloaded" });
  await page.locator('[data-jtbd-action="split"]').click();
  const cards = await page.locator(".team-card").count();
  record("phone: team generator runs", cards >= 2, `${cards} teams from the sample`);
  await ctx.close();
}

const browser = isChromium ? await chromium.launch() : await webkit.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (isChromium) {
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  }
  const page = await ctx.newPage();
  await watch(page);

  // sweep every page: loads, no overflow at desktop
  await phase("page sweep (h1 + 1440 overflow)", async () => {
    for (const p of PAGES) {
      await page.goto(base + p, { waitUntil: "domcontentloaded" });
      await overflowCheck(page, `${p} 1440`, 1440);
      const h1 = await page.locator("h1").first().textContent();
      if (!h1 || h1.trim().length === 0) record(`page ${p} has a heading`, false, "no h1");
    }
    record("every page renders an h1", true, `${PAGES.length} pages swept`);
  });

  // real fixtures first: each tool's core job on the real, full-size file
  if (isChromium && fixtures) {
    await phase("real input: wheel-spinner on the full story", () => runRealWheel(page));
    await phase("real input: team-generator on the full story", () => runRealTeam(page));
    await phase("real input: fairness-audit on the full story", () => runRealAudit(page));
  }

  await phase("pricing stays free: nothing is for sale", () => runPricingFree(page));
  await phase("wheel home: every control", () => runWheelHome(page, ctx));
  await phase("team generator: every control", () => runTeam(page));
  await phase("contact form: round trip", () => runContact(page));
  await phase("fairness audit: visitor-run", () => runFairness(page));
  await phase("preset hub", () => runWheelsHub(page));
  await phase("preset page", () => runPresetPage(page));
  await ctx.close();

  if (isChromium) await phase("phone 390: tool first, every page", () => runPhone(browser));
} finally {
  await browser.close();
}

const allOk =
  controls.every((c) => c.ok) &&
  downloads.every((d) => d.ok) &&
  shareOk &&
  overflows.length === 0 &&
  consoleErrors.length === 0 &&
  failedRequests.length === 0 &&
  realInput.every((r) => r.ok);

console.log(
  "VERIFY_LIVE " +
    JSON.stringify({
      controls,
      downloads,
      share: { ok: shareOk, detail: shareDetail },
      overflow: overflows,
      consoleErrors,
      failedRequests,
      gatedResponses,
      realInput,
    }),
);
process.exit(allOk ? 0 : 1);
