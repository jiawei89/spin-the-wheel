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

export default function FairnessAudit({ t }: { t: UiStrings }) {
  const [entriesText, setEntriesText] = useState(SAMPLE_ENTRIES.join("\n"));
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [errorLine, setErrorLine] = useState("");
  const [result, setResult] = useState<{ labels: string[]; counts: number[] } | null>(null);
  const acc = useRef<number[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function run() {
    if (running) return;
    const list = parseEntries(entriesText);
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
          data-tool-input="entries"
          rows={4}
          spellCheck={false}
          value={entriesText}
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
          data-shipsite-example
          onClick={() => {
            setEntriesText(SAMPLE_ENTRIES.join("\n"));
            setErrorLine("");
          }}
        >
          {t.starterListLink}
        </button>
        <span className="example-credit" data-shipsite-example-credit>
          {t.sampleCredit}
        </span>
      </p>
      <div className="fairaudit-run capability-actions">
        <button
          className="btn-primary primary"
          type="button"
          data-jtbd-action="audit"
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
        <div data-tool-output>
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
                    <td>{fair.toFixed(2)}%</td>
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
