"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { formatMessage, type UiStrings } from "@/lib/ui-strings";
import { track } from "@/lib/analytics";

type Team = { number: number; names: string[] };

const TEAM_COLORS = ["#7cc6a6", "#ffc94a", "#9ac7e8", "#e8896b", "#f3efe4", "#a8d8c0", "#f6a5c0", "#d9a441"];

/** Fisher–Yates driven by crypto.getRandomValues: every name used exactly
 *  once, no Math.random anywhere on the site's draw paths. */
function cryptoShuffle(items: string[]): string[] {
  const out = [...items];
  const buf = new Uint32Array(out.length);
  crypto.getRandomValues(buf);
  for (let i = out.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    const hold = out[i];
    out[i] = out[j];
    out[j] = hold;
  }
  return out;
}

export default function TeamSplitter({ t, ownsState = true }: { t: UiStrings; ownsState?: boolean }) {
  const [namesText, setNamesText] = useState(t.teamNamesSample);
  const [teamCount, setTeamCount] = useState("3");
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [people, setPeople] = useState(0);
  const [note, setNote] = useState("");
  const [errorLine, setErrorLine] = useState("");
  const [copied, setCopied] = useState(false);
  const namesRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(false);
  const copiedTimer = useRef<number>(0);

  useEffect(() => {
    if (ownsState) document.documentElement.dataset.state = "ready";
  }, [ownsState]);

  useEffect(() => {
    if (!ownsState) return;
    document.documentElement.dataset.state = errorLine ? "error" : teams ? "success" : "ready";
  }, [errorLine, teams, ownsState]);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const split = useCallback(() => {
    const names = namesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (names.length === 0) {
      setTeams(null);
      setPeople(0);
      setErrorLine(t.teamError);
      namesRef.current?.focus();
      return;
    }
    const requested = Number.parseInt(teamCount, 10);
    if (!Number.isFinite(requested) || requested < 2 || requested > 50) {
      setErrorLine(t.teamCountInvalid);
      return;
    }
    setErrorLine("");
    const count = Math.min(requested, names.length);
    setNote(count < requested ? formatMessage(t.teamCountClamped, { names: names.length, teams: count }) : "");
    const shuffled = cryptoShuffle(names);
    const next: Team[] = Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      names: shuffled.filter((_, idx) => idx % count === i),
    }));
    setTeams(next);
    setPeople(names.length);
    if (!startedRef.current) {
      startedRef.current = true;
      track("task_start", { tool: "team-generator" });
    }
    track("task_complete", { tool: "team-generator" });
  }, [namesText, teamCount, t.teamError, t.teamCountInvalid, t.teamCountClamped]);

  const rosterText = teams
    ? teams
        .map(
          (team) =>
            (team.names.length === 1
              ? formatMessage(t.teamHeaderOne, { n: team.number })
              : formatMessage(t.teamHeaderMany, { n: team.number, m: team.names.length })) +
            "\n" +
            team.names.join("\n"),
        )
        .join("\n\n")
    : "";

  const copyRoster = useCallback(() => {
    const text = rosterText;
    const done = () => {
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(done)
        .catch(() => done());
    } else {
      done();
    }
    track("export", { tool: "team-generator", kind: "roster_copy" });
  }, [rosterText, t]);

  const onNamesChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setNamesText(e.target.value);
    setErrorLine("");
  };

  const onCountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTeamCount(e.target.value);
    setErrorLine("");
  };

  return (
    <section className="splitstage" aria-label={t.teamToolAria} data-capability="team-generator" data-operation="tool-spec">
      <div className="splitpanel">
        <div className="field">
          <label htmlFor="names">{t.namesLabel}</label>
          <textarea id="names" ref={namesRef} data-names data-tool-input="names" spellCheck={false} value={namesText} onChange={onNamesChange} />
        </div>
        <p className="examplerow">
          <button
            type="button"
            className="quiet-link"
            data-shipsite-example
            onClick={() => {
              setNamesText(t.teamNamesSample);
              setTeamCount("3");
              setErrorLine("");
            }}
          >
            {t.teamSampleLink}
          </button>
          <span className="example-credit" data-shipsite-example-credit>
            {t.sampleCredit}
          </span>
        </p>
        <div className="field field-count">
          <label htmlFor="teamCount">{t.teamsCountLabel}</label>
          <input
            id="teamCount"
            data-team-count
            data-tool-input="teamcount"
            type="number"
            min={2}
            max={50}
            inputMode="numeric"
            value={teamCount}
            onChange={onCountChange}
          />
        </div>
        <div className="capability-actions">
          <button type="button" className="btn-primary primary" data-jtbd-action="split" onClick={split}>
            {t.generateTeams}
          </button>
        </div>
        {errorLine ? (
          <p className="error-line" role="alert">
            {errorLine}
          </p>
        ) : null}
        {teams ? (
          <button type="button" className="quiet-link" onClick={copyRoster}>
            {copied ? t.rosterCopied : t.copyRoster}
          </button>
        ) : null}
      </div>
      <div className="splitresults" data-teams data-tool-output aria-live="polite">
        {teams ? (
          <>
            <p className="countline">{formatMessage(t.teamsSummary, { teams: teams.length, people })}</p>
            {note ? <p className="countline">{note}</p> : null}
            <div className="team-grid">
              {teams.map((team) => (
                <article className="team-card" key={team.number}>
                  <h3 className="team-head">
                    <span
                      className="team-dot"
                      style={{ background: TEAM_COLORS[(team.number - 1) % TEAM_COLORS.length] }}
                      aria-hidden="true"
                    />
                    {team.names.length === 1
                      ? formatMessage(t.teamHeaderOne, { n: team.number })
                      : formatMessage(t.teamHeaderMany, { n: team.number, m: team.names.length })}
                  </h3>
                  <ul className="team-names">
                    {team.names.map((n, i) => (
                      <li key={`${n}-${i}`}>{n}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="empty-results">{t.teamsEmptyState}</p>
        )}
      </div>
    </section>
  );
}
