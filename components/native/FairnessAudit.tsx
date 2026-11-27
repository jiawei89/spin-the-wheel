"use client";
// The visitor-run fairness audit: 10,000 real spins of whatever entries are
// in the box, drawn one by one through the same pickIndex a spin uses, in
// the browser. The starter list is preloaded; the box is the visitor's.
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { parseEntries, pickIndex, SAMPLE_ENTRIES } from "@/lib/wheel-engine";
import { formatMessage, type UiStrings } from "@/lib/ui-strings";

const TOTAL = 10000;
const MAX_ENTRIES = 1000;
const SHOWN_ROWS = 12;

export default function FairnessAudit({
  t,
  ownsState = true,
  secondary = false,
}: {
  t: UiStrings;
  ownsState?: boolean;
  /** Embedded where another tool already owns the page's selectors: the
   *  harness-facing attrs move to audit-prefixed names so the page's primary
   *  tool stays the one [data-entries] / [data-audit] on the route. */
  secondary?: boolean;
}) {
  const [entriesText, setEntriesText] = useState(SAMPLE_ENTRIES.join("\n"));
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [errorLine, setErrorLine] = useState("");
  const [result, setResult] = useState<{ labels: string[]; counts: number[] } | null>(null);
  const listRef = useRef<HTMLTextAreaElement>(null);
  const acc = useRef<number[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  // The page state lives on html[data-state] where this is the page's tool.
  useEffect(() => {
    if (!ownsState) return;
    document.documentElement.dataset.state = errorLine ? "error" : result ? "success" : "ready";
  }, [errorLine, result, ownsState]);

  // Keep the box's DOM value and text content in step with the state.
  useEffect(() => {
    const ta = listRef.current;
    if (!ta) return;
    if (ta.value !== entriesText) ta.value = entriesText;
    if (ta.textContent !== entriesText) ta.textContent = entriesText;
  }, [entriesText]);

  function run() {
    if (running) return;
    // The box's DOM value is the truth (a visitor or a test can set it
    // directly); the state mirrors it for the redraw.
    const list = parseEntries(listRef.current?.value ?? entriesText);
    if (list.length < 2) {
      setErrorLine(t.auditEmpty);
      setResult(null);
      return;
    }
    if (list.length > MAX_ENTRIES) {
      setErrorLine(t.auditTooMany);
      setResult(null);
      return;
    }
    setErrorLine("");
    setRunning(true);
    setResult(null);
    setDone(0);
    acc.current = list.map(() => 0);
    const labels = list.map((e) => e.label);
    let n = 0;
    const step = () => {
      const c = acc.current;
      for (let i = 0; i < 500 && n < TOTAL; i++) {
        c[pickIndex(list)] += 1;
        n += 1;
      }
      setDone(n);
      if (n >= TOTAL) {
        setResult({ labels, counts: [...c] });
        setRunning(false);
      } else {
        timer.current = window.setTimeout(step, 0);
      }
    };
    timer.current = window.setTimeout(step, 0);
  }

  const fair = result ? 100 / result.labels.length : 0;
  const maxDev = result
    ? Math.max(...result.counts.map((c) => Math.abs((c / TOTAL) * 100 - fair)))
    : 0;
  const observedPct = (c: number) => (c / TOTAL) * 100;

  return (
    <div
      className="fairaudit"
      data-audit-widget
      data-capability="fairness-audit"
      data-operation="audit"
    >
      <div className="field audit-field">
        <label htmlFor="auditEntries">{t.auditEntriesLabel}</label>
        <textarea
          id="auditEntries"
          className="audit-entries"
          {...(secondary
            ? { "data-audit-entries": true, "data-tool-input": "audit-entries" }
            : { "data-entries": true, "data-tool-input": "entries" })}
          ref={listRef}
          rows={4}
          spellCheck={false}
          defaultValue={entriesText}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
            setEntriesText(e.target.value);
            setErrorLine("");
          }}
        />
      </div>
      <p className="examplerow">
        <button
          type="button"
          className="quiet-link"
          {...(secondary ? { "data-audit-example": true } : { "data-shipsite-example": true })}
          onClick={() => {
            setEntriesText(SAMPLE_ENTRIES.join("\n"));
            setErrorLine("");
          }}
        >
          {t.starterListLink}
        </button>
        <span className="example-credit" {...(secondary ? { "data-audit-example-credit": true } : { "data-shipsite-example-credit": true })}>
          {t.sampleCredit}
        </span>
      </p>
      <div className="fairaudit-run capability-actions">
        <button
          className="btn-primary primary"
          type="button"
          {...(secondary ? {} : { "data-audit": true, "data-jtbd-action": "audit" })}
          onClick={run}
          disabled={running}
        >
          {running
            ? formatMessage(t.auditRunningLabel, { done: done.toLocaleString("en-US") })
            : t.auditRunButton}
        </button>
        {running || done > 0 ? (
          <div
            className="fairaudit-progress"
            role="progressbar"
            aria-label={t.auditRunningLabel}
            aria-valuemin={0}
            aria-valuemax={TOTAL}
            aria-valuenow={done}
          >
            <div className="fairaudit-progress-fill" style={{ width: `${(done / TOTAL) * 100}%` }} />
          </div>
        ) : null}
        {running || done > 0 ? (
          <span className="fairaudit-count">{done.toLocaleString("en-US")} / 10,000</span>
        ) : null}
      </div>
      {errorLine ? (
        <p className="error-line" role="alert">
          {errorLine}
        </p>
      ) : null}
      {result ? (
        <div {...(secondary ? { "data-audit-output": true } : { "data-tool-output": true })} {...(secondary ? { "data-audit-home-result": true } : { "data-audit-result": true })}>
          <div className="table-scroll">
            <table className="audit-table">
              <thead>
                <tr>
                  <th scope="col">{t.auditColEntry}</th>
                  <th scope="col">{t.auditColObserved}</th>
                  <th scope="col">{t.auditColFair}</th>
                  <th scope="col">{t.auditColGap}</th>
                </tr>
              </thead>
              <tbody>
                {result.counts.slice(0, SHOWN_ROWS).map((c, i) => (
                  <tr key={result.labels[i] ?? i}>
                    <th scope="row">{result.labels[i]}</th>
                    <td>{observedPct(c).toFixed(2)}%</td>
                    <td>{fair.toFixed(1)}%</td>
                    <td>
                      {observedPct(c) - fair >= 0 ? "+" : ""}
                      {(observedPct(c) - fair).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.labels.length > SHOWN_ROWS ? (
            <p className="audit-more">
              {formatMessage(t.auditMoreRows, { n: result.labels.length - SHOWN_ROWS })}
            </p>
          ) : null}
          <p className="hint">{formatMessage(t.auditResultLine, { dev: maxDev.toFixed(2) })}</p>
        </div>
      ) : null}
    </div>
  );
}
