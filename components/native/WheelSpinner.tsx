"use client";

// The wheel tool: entries become weighted SVG segments; a spin draws a
// winner with crypto.getRandomValues, animates a decelerating rotation that
// lands the pointer on the drawn segment, ticks while it turns, and announces
// the winner in a spotlight overlay with confetti. Settings live in one
// dialog; share, audit, export and fullscreen are quiet actions.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildSegments,
  easeOutCubic,
  finalRotation,
  labelFor,
  parseEntries,
  pickIndex,
  randomInt,
  SAMPLE_ENTRIES,
  segmentPath,
  THEMES,
  themeById,
  type Segment,
} from "@/lib/wheel-engine";
import { presetById, presetWheels } from "@/lib/datasets/preset-wheels";
import { formatMessage, type UiStrings } from "@/lib/ui-strings";
import { track } from "@/lib/analytics";

type Phase = "ready" | "spinning" | "winner";

type WheelSettings = {
  soundOn: boolean;
  volume: number;
  duration: number;
  theme: string;
  eliminate: boolean;
};

export default function WheelSpinner({ t, presetId }: { t: UiStrings; presetId?: string }) {
  // A preset page stands for one preset: its entries are the starting wheel,
  // and the visitor's saved wheel is neither restored nor overwritten here.
  const presetStart = presetId ? (presetById(presetId)?.entries.join("\n") ?? null) : null;
  const [entriesText, setEntriesText] = useState(presetStart ?? SAMPLE_ENTRIES.join("\n"));
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>("ready");
  const [errorLine, setErrorLine] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [eliminate, setEliminate] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [duration, setDuration] = useState(2.5);
  const [theme, setTheme] = useState("classic");
  const [spinTotal, setSpinTotal] = useState(0);
  const [plusCounts, setPlusCounts] = useState<Record<string, number>>({});
  const [countLine, setCountLine] = useState("");
  const [auditLine, setAuditLine] = useState("");
  const [preset, setPreset] = useState(presetStart !== null ? (presetId ?? "sample") : "sample");
  const [rangeOpen, setRangeOpen] = useState(true);
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(10);
  const [shareCopied, setShareCopied] = useState(false);
  const [exportLine, setExportLine] = useState("");
  const [lastRemoved, setLastRemoved] = useState<{ label: string; index: number } | null>(null);
  const [fsActive, setFsActive] = useState(false);
  const [confettiOn, setConfettiOn] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const listRef = useRef<HTMLTextAreaElement>(null);
  const spinGroupRef = useRef<SVGGElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const rotationRef = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  const startedRef = useRef(false);
  const hydratedRef = useRef(false);
  const entriesTextRef = useRef(entriesText);

  const entries = useMemo(() => parseEntries(entriesText), [entriesText]);
  const segments = useMemo(
    () => buildSegments(entries, themeById(theme).colors),
    [entries, theme],
  );

  // ---- keep refs in step with state so rAF closures read fresh values ----
  const settingsRef = useRef<WheelSettings>({ soundOn, volume, duration, theme, eliminate });
  useEffect(() => {
    settingsRef.current = { soundOn, volume, duration, theme, eliminate };
  }, [soundOn, volume, duration, theme, eliminate]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    entriesTextRef.current = entriesText;
  }, [entriesText]);

  // ---- first load: shared link (?w=&t=), then local autosave, then sample ----
  useEffect(() => {
    let restored: string | null = null;
    let restoredTitle: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      restored = params.get("w");
      restoredTitle = params.get("t");
    } catch {
      restored = null;
    }
    if (restored) setEntriesText(restored);
    else if (presetStart !== null) setEntriesText(presetStart);
    else {
      try {
        const saved = localStorage.getItem("stw:wheel");
        if (saved) setEntriesText(saved);
      } catch {
        /* private mode */
      }
    }
    if (restoredTitle !== null) setTitle(restoredTitle.slice(0, 80));
    else {
      try {
        const savedTitle = localStorage.getItem("stw:title");
        if (savedTitle) setTitle(savedTitle.slice(0, 80));
      } catch {
        /* private mode */
      }
    }
    try {
      const raw = localStorage.getItem("stw:settings");
      if (raw) {
        const s = JSON.parse(raw) as Partial<WheelSettings>;
        if (typeof s.soundOn === "boolean") setSoundOn(s.soundOn);
        if (typeof s.volume === "number") setVolume(Math.min(1, Math.max(0, s.volume)));
        if (typeof s.duration === "number") setDuration(Math.min(10, Math.max(1, s.duration)));
        if (typeof s.theme === "string" && THEMES.some((th) => th.id === s.theme)) setTheme(s.theme);
        if (typeof s.eliminate === "boolean") setEliminate(s.eliminate);
      }
    } catch {
      /* corrupt settings: defaults stand */
    }
    hydratedRef.current = true;
    setHydrated(true);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Keep the textarea's DOM value and its text content in step with the
  // state the wheel reads, so a reader of .value, innerText or textContent
  // all sees the current list.
  useEffect(() => {
    const ta = listRef.current;
    if (!ta) return;
    if (ta.value !== entriesText) ta.value = entriesText;
    if (ta.textContent !== entriesText) ta.textContent = entriesText;
  }, [entriesText, hydrated]);

  // ---- autosave the wheel and its settings ----
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem("stw:wheel", entriesText);
      } catch {
        /* private mode */
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [entriesText, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        "stw:settings",
        JSON.stringify({ soundOn, volume, duration, theme, eliminate } satisfies WheelSettings),
      );
    } catch {
      /* private mode */
    }
  }, [soundOn, volume, duration, theme, eliminate, hydrated]);

  // ---- the page state lives on html[data-state] ----
  useEffect(() => {
    document.documentElement.dataset.state = errorLine ? "error" : phase;
  }, [phase, errorLine]);

  // ---- the header's title dialog updates the wheel through an event ----
  useEffect(() => {
    const onTitle = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail ?? "";
      setTitle(detail);
    };
    window.addEventListener("stw:title", onTitle);
    return () => window.removeEventListener("stw:title", onTitle);
  }, []);

  // ---- Ctrl+Enter spins from anywhere on the page ----
  const doSpinRef = useRef<(override?: string) => void>(() => {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        doSpinRef.current();
        return;
      }
      // Plain Enter spins when the focus sits outside the form fields, so
      // typing entries stays typing; fields, buttons and links keep Enter.
      if (e.key === "Enter" && !e.shiftKey) {
        const el = e.target as HTMLElement | null;
        const tag = el?.tagName ?? "";
        if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT" || tag === "BUTTON" || tag === "A" || el?.isContentEditable) return;
        e.preventDefault();
        doSpinRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ---- fullscreen state ----
  useEffect(() => {
    const onFs = () => setFsActive(document.fullscreenElement === zoneRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---- sound ----
  const ensureAudio = useCallback(() => {
    try {
      if (!audioRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        audioRef.current = new Ctor();
      }
      if (audioRef.current.state === "suspended") void audioRef.current.resume();
    } catch {
      audioRef.current = null;
    }
  }, []);

  const playTick = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx || !settingsRef.current.soundOn) return;
    try {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 1650 + Math.random() * 350;
      const vol = settingsRef.current.volume * 0.22;
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.05);
    } catch {
      /* sound is best-effort */
    }
  }, []);

  const playWin = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx || !settingsRef.current.soundOn) return;
    try {
      const vol = settingsRef.current.volume * 0.5;
      [660, 880].forEach((freq, i) => {
        const t0 = ctx.currentTime + i * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.3);
      });
    } catch {
      /* sound is best-effort */
    }
  }, []);

  // ---- confetti, once per winner ----
  useEffect(() => {
    if (!confettiOn) return;
    const canvas = confettiCanvasRef.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap) return;
    const W = wrap.clientWidth || 320;
    const H = wrap.clientHeight || 320;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setConfettiOn(false);
      return;
    }
    const colors = [...themeById(theme).colors, "#ffc94a"];
    const parts = Array.from({ length: 90 }, () => ({
      x: W / 2 + (Math.random() * 2 - 1) * 50,
      y: H * 0.3,
      vx: (Math.random() * 2 - 1) * 270,
      vy: -170 - Math.random() * 250,
      rot: Math.random() * Math.PI,
      vr: (Math.random() * 2 - 1) * 11,
      size: 5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      round: Math.random() < 0.5,
    }));
    const t0 = performance.now();
    const dur = 1400;
    let raf = 0;
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - p * p);
      for (const pt of parts) {
        pt.x += pt.vx * 0.016;
        pt.y += pt.vy * 0.016;
        pt.vy += 640 * 0.016;
        pt.rot += pt.vr * 0.016;
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.fillStyle = pt.color;
        if (pt.round) {
          ctx.beginPath();
          ctx.arc(0, 0, pt.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-pt.size / 2, -pt.size / 4, pt.size, pt.size / 2);
        }
        ctx.restore();
      }
      if (p < 1) raf = requestAnimationFrame(frame);
      else setConfettiOn(false);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [confettiOn, theme]);

  // ---- the spin ----
  const finishSpin = useCallback(
    (finalVal: number, seg: Segment) => {
      rotationRef.current = finalVal;
      if (spinGroupRef.current) spinGroupRef.current.style.transform = `rotate(${finalVal}deg)`;
      setWinner(seg.label);
      setPhase("winner");
      setSpinTotal((n) => n + 1);
      setCountLine("");
      track("task_complete", { tool: "wheel-spinner" });
      playWin();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        /* no confetti under reduced motion */
      } else {
        setConfettiOn(true);
      }
    },
    [playWin],
  );

  const doSpin = useCallback(
    (override?: string) => {
      if (phaseRef.current === "spinning") return;
      let text = override ?? entriesTextRef.current;
      // Eliminate mode: the previous winner leaves the wheel before this spin.
      if (settingsRef.current.eliminate && winner) {
        const es = parseEntries(text);
        const idx = es.findIndex((e) => e.label === winner);
        if (idx >= 0) {
          const updated = es.filter((e) => e.label !== winner).map((e) => e.label);
          text = updated.join("\n");
          setEntriesText(text);
          setLastRemoved({ label: winner, index: idx });
          setPlusCounts((prev) => {
            const next = { ...prev };
            delete next[winner];
            return next;
          });
        }
      }
      const es = parseEntries(text);
      if (!es.length) {
        setErrorLine(t.errorNoEntries);
        setPhase("ready");
        document.documentElement.dataset.state = "error";
        listRef.current?.focus();
        return;
      }
      setErrorLine(null);
      if (!startedRef.current) {
        startedRef.current = true;
        track("task_start", { tool: "wheel-spinner" });
      }
      ensureAudio();
      setPhase("spinning");
      setWinner(null);
      const segs = buildSegments(es, themeById(settingsRef.current.theme).colors);
      const idx = pickIndex(es);
      const seg = segs[idx];
      const turns = 4 + randomInt(3);
      const jitter = (randomInt(1000) / 1000) * seg.shareDeg * 0.3;
      const from = rotationRef.current;
      const to = finalRotation(from, seg, turns, jitter);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        finishSpin(to, seg);
        return;
      }
      const ms = Math.max(400, settingsRef.current.duration * 1000);
      const start = performance.now();
      const tickEvery = 360 / Math.max(segs.length, 1);
      let lastTick = Math.floor(from / tickEvery);
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / ms);
        const val = from + (to - from) * easeOutCubic(p);
        rotationRef.current = val;
        if (spinGroupRef.current) spinGroupRef.current.style.transform = `rotate(${val}deg)`;
        const crossed = Math.floor(val / tickEvery);
        if (crossed !== lastTick) {
          lastTick = crossed;
          playTick();
        }
        if (p < 1) rafRef.current = requestAnimationFrame(step);
        else finishSpin(to, seg);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [ensureAudio, finishSpin, playTick, t.errorNoEntries, winner],
  );
  doSpinRef.current = doSpin;

  // ---- result actions ----
  const removeWinnerNow = useCallback(() => {
    if (!winner) return;
    const es = parseEntries(entriesTextRef.current);
    const idx = es.findIndex((e) => e.label === winner);
    if (idx < 0) return;
    setEntriesText(es.filter((e) => e.label !== winner).map((e) => e.label).join("\n"));
    setLastRemoved({ label: winner, index: idx });
    setPlusCounts((prev) => {
      const next = { ...prev };
      delete next[winner];
      return next;
    });
    setPhase("ready");
  }, [winner]);

  const undoRemove = useCallback(() => {
    if (!lastRemoved) return;
    const es = parseEntries(entriesTextRef.current);
    es.splice(Math.min(lastRemoved.index, es.length), 0, { label: lastRemoved.label, weight: 1 });
    setEntriesText(es.map((e) => (e.weight > 1 ? `${e.label} ×${e.weight}` : e.label)).join("\n"));
    setLastRemoved(null);
  }, [lastRemoved]);

  const countPlus = useCallback(() => {
    if (!winner) return;
    const next = { ...plusCounts, [winner]: (plusCounts[winner] ?? 0) + 1 };
    setPlusCounts(next);
    setCountLine(formatMessage(t.countedLine, { winner, tally: next[winner], total: spinTotal }));
  }, [plusCounts, spinTotal, t.countedLine, winner]);

  const closeOverlay = useCallback(() => {
    setPhase("ready");
  }, []);

  // ---- quiet actions ----
  const share = useCallback(async () => {
    let url = `${window.location.origin}/?w=${encodeURIComponent(entriesTextRef.current)}`;
    if (title) url += `&t=${encodeURIComponent(title)}`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch {
        ok = false;
      }
    }
    setShareCopied(ok);
    if (ok) {
      track("export", { kind: "share_link", tool: "wheel-spinner" });
      window.setTimeout(() => setShareCopied(false), 2500);
    }
  }, [title]);

  const runAudit = useCallback(() => {
    const es = parseEntries(entriesTextRef.current);
    if (!es.length) {
      setAuditLine(t.auditEmpty);
      setErrorLine(t.auditEmpty);
      document.documentElement.dataset.state = "error";
      window.setTimeout(() => setErrorLine(null), 100);
      return;
    }
    setErrorLine(null);
    const spins = 10000;
    const counts = new Array(es.length).fill(0);
    for (let i = 0; i < spins; i++) counts[pickIndex(es)]++;
    const expected = ((100 / es.length) as number).toFixed(1) + "%";
    const rows = es
      .map((e, i) =>
        formatMessage(t.auditRow, {
          label: e.label,
          count: counts[i].toLocaleString("en-US"),
          share: ((counts[i] / spins) * 100).toFixed(1) + "%",
        }),
      )
      .join(" · ");
    setAuditLine(formatMessage(t.auditLine, { expected, rows, spins: spins.toLocaleString("en-US") }));
  }, [t.auditEmpty, t.auditLine, t.auditRow]);

  const toggleFs = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void zoneRef.current?.requestFullscreen().catch(() => {});
    }
  }, []);

  // ---- Free first (owner decision 2026-11-27) ----
  // The account-gated use points (cloud sync, AI entry ideas, result
  // collection) are out of the tool while the site is free: free use keeps
  // everything on this device and the wheel needs no account. Their backend
  // routes stay for the payments-on change, which restores the buttons.

  const exportWheel = useCallback(() => {
    const payload = {
      title,
      entries: parseEntries(entriesTextRef.current).map((e) => (e.weight > 1 ? `${e.label} ×${e.weight}` : e.label)),
      settings: {
        theme: settingsRef.current.theme,
        duration: settingsRef.current.duration,
        soundOn: settingsRef.current.soundOn,
        eliminate: settingsRef.current.eliminate,
      },
      source: "spin-the-wheel",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spin-the-wheel.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportLine(t.exportDone);
    window.setTimeout(() => setExportLine(""), 4000);
    track("export", { kind: "wheel_file", tool: "wheel-spinner" });
  }, [t.exportDone, title]);

  // ---- inputs ----
  const onEntriesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEntriesText(e.target.value);
    setErrorLine(null);
  }, []);

  const applyPreset = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setPreset(v);
    if (v === "custom-range") return;
    if (v === "sample") {
      setEntriesText(SAMPLE_ENTRIES.join("\n"));
      setErrorLine(null);
      return;
    }
    const p = presetById(v);
    if (p) {
      setEntriesText(p.entries.join("\n"));
      setErrorLine(null);
    }
  }, []);

  const applyRange = useCallback(() => {
    if (preset && preset !== "custom-range") {
      const p = presetById(preset);
      if (preset === "sample") setEntriesText(SAMPLE_ENTRIES.join("\n"));
      else if (p) setEntriesText(p.entries.join("\n"));
      setErrorLine(null);
      return;
    }
    const a = Number(rangeFrom);
    const b = Number(rangeTo);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      setErrorLine(t.rangeInvalid);
      return;
    }
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    if (hi - lo + 1 > 500) {
      setErrorLine(t.rangeTooLong);
      return;
    }
    const list: string[] = [];
    for (let n = lo; n <= hi; n++) list.push(String(n));
    setEntriesText(list.join("\n"));
    setErrorLine(null);
  }, [preset, rangeFrom, rangeTo, t.rangeInvalid, t.rangeTooLong]);

  const openSettings = useCallback(() => {
    settingsDialogRef.current?.showModal();
  }, []);

  const entriesCountText =
    entries.length === 1
      ? t.entriesCountOne
      : formatMessage(t.entriesCountMany, { n: entries.length });

  const sessionText =
    countLine ||
    (spinTotal > 0 ? formatMessage(t.sessionLine, { total: spinTotal.toLocaleString("en-US") }) : "");

  return (
    <section className="stage" aria-label={t.stageAriaLabel} data-capability="wheel-spinner" data-operation="tool-spec">
      <div className="wheelzone" ref={zoneRef}>
        <div className="wheeltitle" id="wheelTitle">{title}</div>
        <div className="wheelwrap">
          <div className="pointer" aria-hidden="true" />
          <button
            className="wheelbtn"
            type="button"
            aria-label={t.wheelButtonLabel}
            title={t.tapToSpin}
            onClick={() => doSpin()}
          >
          <svg
            id="wheel"
            viewBox="0 0 400 400"
            data-wheel
            aria-hidden="true"
          >
            <g className="breathe-g">
            <g ref={spinGroupRef} id="wheelspin" className="wheelspin-group">
              {segments.map((seg) => (
                <path
                  key={seg.index}
                  data-segment
                  d={segmentPath(seg)}
                  fill={seg.fill}
                  stroke="#14231c"
                  strokeWidth="1.5"
                />
              ))}
              {segments.map((seg) => {
                const l = labelFor(seg);
                if (l.hidden) return null;
                return (
                  <text
                    key={`t${seg.index}`}
                    x={l.x}
                    y={l.y}
                    fill={seg.textFill} style={{ color: seg.textFill }}
                    fontSize={l.size}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${l.rotate} ${l.x} ${l.y})`}
                  >
                    {l.text}
                  </text>
                );
              })}
            </g>
            <circle cx="200" cy="200" r="26" fill="#f3efe4" stroke="#14231c" strokeWidth="2" />
            </g>
          </svg>
          </button>
          <div className="hublabel" aria-hidden="true">
            <span id="hubText">{phase === "spinning" ? t.spinning : t.tapToSpin}</span>
          </div>
          <canvas ref={confettiCanvasRef} className="confetti-canvas" aria-hidden="true" />
          <div className="overlay" data-tool-output role="region" aria-live="polite" aria-label={t.winnerLabel}>
            <div className="wlabel">{t.winnerLabel}</div>
            <div className="wname" id="winnerName" data-winner>
              {phase === "winner" ? winner ?? t.emptyResult : ""}
            </div>
            <div className="wkeys">
              <button className="btn-primary" id="againBtn" type="button" disabled={phase !== "winner"} onClick={() => doSpin()}>
                {t.spinAgain}
              </button>
              <button className="btn-secondary" id="removeBtn" type="button" disabled={phase !== "winner"} onClick={removeWinnerNow}>
                {eliminate ? t.removeWinnerElim : t.removeWinner}
              </button>
              <button className="btn-secondary" id="countBtn" type="button" disabled={phase !== "winner"} onClick={countPlus}>
                {t.countPlusOne}
              </button>
            </div>
            {phase === "winner" ? (
              <>
                <p className="hint">{t.winnerHint}</p>
                {lastRemoved ? (
                  <p className="undo-row">
                    <button className="quiet-link" type="button" onClick={undoRemove}>
                      {formatMessage(t.undoRemove, { winner: lastRemoved.label })}
                    </button>
                  </p>
                ) : null}
                <p className="undo-row">
                  <button className="quiet-link" type="button" onClick={closeOverlay}>
                    {t.backToWheel}
                  </button>
                </p>
              </>
            ) : null}
          </div>
        </div>
        <div className="quietlinks wheelquiet">
          <button className="quiet-link" id="shareLink" type="button" onClick={() => void share()}>
            {shareCopied ? t.shareCopied : t.shareLink}
          </button>
          <button className="quiet-link" id="exportLink" type="button" onClick={exportWheel}>
            {t.exportLink}
          </button>
          <button className="quiet-link" id="auditLink" data-audit type="button" onClick={runAudit}>
            {t.auditLink}
          </button>
        </div>
        {sessionText ? (
          <p className="countline" id="countLine" aria-live="polite">
            {sessionText}
          </p>
        ) : null}
        {auditLine ? (
          <p className="countline" id="auditResult" data-audit-result aria-live="polite">
            {auditLine}
          </p>
        ) : null}
      </div>

      <div className="panel">
        <div className="cap-presets" data-capability="preset-loader" data-operation="load">
        <div>
          <label htmlFor="list">{t.entriesLabel}</label>
          <textarea
            id="list"
            data-entries
            data-tool-input="entries"
            ref={listRef}
            rows={4}
            spellCheck={false}
            defaultValue={entriesText}
            onChange={onEntriesChange}
          />
          <p className="countline" id="entryCount" data-tool-output aria-live="polite">
            {entriesCountText}
          </p>
          {errorLine ? (
            <p className="error-line" role="alert">
              {errorLine}
            </p>
          ) : null}
        </div>
        <p className="examplerow">
          <button
            type="button"
            className="quiet-link"
            id="sampleWheelBtn"
            data-shipsite-example
            onClick={() => {
              setEntriesText(SAMPLE_ENTRIES.join("\n"));
              setPreset("sample");
              setErrorLine("");
            }}
          >
            {t.sampleWheelLink}
          </button>
          <span className="example-credit" data-shipsite-example-credit>
            {t.sampleCredit}
          </span>
        </p>
        <div className="row2">
          <div className="field">
            <label htmlFor="preset">{t.presetLabel}</label>
            <select id="preset" data-preset data-tool-input="preset" value={preset} onChange={applyPreset}>
              <option value="sample">{t.presetSample}</option>
              {presetWheels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div className={rangeOpen ? "field rangebox open" : "field rangebox"} id="rangeFields">
            <label htmlFor="rFrom">{t.rangeLabel}</label>
            <div className="fromto">
              <input
                id="rFrom"
                data-rfrom
                data-tool-input="rfrom"
                type="number"
                min={0}
                max={9999}
                value={rangeFrom}
                aria-label={t.rangeFrom}
                onChange={(e) => setRangeFrom(Number(e.target.value))}
              />
              <input
                id="rTo"
                data-rto
                data-tool-input="rto"
                type="number"
                min={0}
                max={9999}
                value={rangeTo}
                aria-label={t.rangeTo}
                onChange={(e) => setRangeTo(Number(e.target.value))}
              />
              <button className="btn-secondary set-btn" id="setBtn" data-set-range type="button" onClick={applyRange}>
                {t.rangeSet}
              </button>
            </div>
          </div>
        </div>
        </div>
        <label className="mode" htmlFor="elimMode">
          <input
            id="elimMode"
            type="checkbox"
            checked={eliminate}
            onChange={(e) => setEliminate(e.target.checked)}
          />
          {t.eliminateMode}
        </label>
        <div className="capability-actions spinrow">
          <button
            className="btn-primary primary"
            id="spinBtn"
            data-jtbd-action="spin"
            type="button"
            onClick={() => doSpin()}
          >
            {t.spinButton}
          </button>
          <span className="hint">{t.spinHint}</span>
        </div>
        <details className="advanced">
          <summary>{t.moreOptionsSummary}</summary>
          <div className="quietlinks">
            <button className="quiet-link" type="button" onClick={toggleFs}>
              {fsActive ? t.exitFullscreenLink : t.fullscreenLink}
            </button>
            <button className="quiet-link" type="button" onClick={openSettings}>
              {t.settingsLink}
            </button>
          </div>
          <p className="hint">{t.weightsHint}</p>
        </details>
        {exportLine ? <p className="countline">{exportLine}</p> : null}
      </div>

      <dialog className="dialog" ref={settingsDialogRef} aria-labelledby="settingsHeading">
        <h2 id="settingsHeading">{t.settingsTitle}</h2>
        <div className="setting">
          <label className="mode" htmlFor="soundToggle">
            <input id="soundToggle" type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
            {t.soundLabel}
          </label>
        </div>
        <div className="setting">
          <label htmlFor="volumeRange">{t.volumeLabel}</label>
          <div className="setting-row">
            <input
              id="volumeRange"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              disabled={!soundOn}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
            <output>{Math.round(volume * 100)}%</output>
          </div>
        </div>
        <div className="setting">
          <label htmlFor="durationRange">{t.durationLabel}</label>
          <div className="setting-row">
            <input
              id="durationRange"
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
            <output>{formatMessage(t.durationValue, { s: duration })}</output>
          </div>
        </div>
        <div className="setting">
          <label id="themeLabelId">{t.themeLabel}</label>
          <div className="theme-chips" role="group" aria-labelledby="themeLabelId">
            {THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                className="theme-chip"
                aria-pressed={theme === th.id}
                onClick={() => setTheme(th.id)}
              >
                <span className="theme-dots" aria-hidden="true">
                  {th.colors.slice(0, 4).map((c, i) => (
                    <i key={i} style={{ background: c }} />
                  ))}
                </span>
                {th.name}
              </button>
            ))}
          </div>
        </div>
        <div className="dialog-actions">
          <button className="btn-primary" type="button" onClick={() => settingsDialogRef.current?.close()}>
            {t.settingsDone}
          </button>
        </div>
      </dialog>
    </section>
  );
}
