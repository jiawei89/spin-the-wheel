// The recorded 100,000-spin audit, drawn from the site's own dataset — the
// fairness claim's evidence, one bar per entry beside its fair share.
// Shared by the home page and the fairness page.
import { fairnessAudit } from "@/lib/datasets/fairness-audit";
import { THEMES } from "@/lib/wheel-engine";
import { formatMessage, type UiStrings } from "@/lib/ui-strings";

export function FairnessFigure({ t }: { t: UiStrings }) {
  const audit = fairnessAudit;
  const labelW = 58;
  const valW = 64;
  const W = 680;
  const rowH = 34;
  const top = 30;
  const plotW = W - labelW - valW;
  const maxPct = 16;
  const x = (pct: number) => labelW + (pct / maxPct) * plotW;
  const rows = audit.entries.map((name, i) => ({
    name,
    pct: audit.observedSharePct[i],
    color: THEMES[0].colors[i % THEMES[0].colors.length],
  }));
  const minPct = Math.min(...audit.observedSharePct);
  const maxObs = Math.max(...audit.observedSharePct);
  const H = top + rows.length * rowH + 34;
  return (
    <figure className="fair-figure">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.auditFigureAria}>
        {/* The observed band: every recorded entry lands inside it. */}
        <rect
          x={x(minPct)}
          y={top - 8}
          width={Math.max(10, x(maxObs) - x(minPct))}
          height={rows.length * rowH - 4}
          fill="rgba(255,255,255,0.12)"
        />
        <line
          x1={x(audit.expectedSharePct)}
          x2={x(audit.expectedSharePct)}
          y1={top - 10}
          y2={top + rows.length * rowH - 12}
          stroke="var(--text-quiet)"
          strokeDasharray="4 4"
          strokeWidth="1.5"
        />
        <text x={x(audit.expectedSharePct) + 7} y={top - 16} fontSize="13" fill="var(--text-quiet)">
          fair share 12.5%
        </text>
        {rows.map((row, i) => (
          <g key={row.name} transform={`translate(0 ${top + i * rowH})`}>
            <text x={labelW - 10} y={rowH / 2 + 5} textAnchor="end" fontSize="14" fill="var(--text-quiet)">
              {row.name}
            </text>
            <rect
              x={labelW}
              y={6}
              width={Math.max(2, x(row.pct) - labelW)}
              height={rowH - 12}
              rx={4}
              fill={row.color}
            />
            <text x={x(row.pct) + 8} y={rowH / 2 + 5} fontSize="13.5" fill="var(--text)">
              {row.pct.toFixed(2)}%
            </text>
          </g>
        ))}
        <text x={x(maxObs)} y={H - 10} textAnchor="end" fontSize="13" fill="var(--text-quiet)">
          every entry lands inside this band
        </text>
      </svg>
      <figcaption>
        {formatMessage(t.auditFigureCaption, {
          spins: audit.spins.toLocaleString("en-US"),
          dev: audit.maxDeviationPct.toFixed(2),
        })}
      </figcaption>
    </figure>
  );
}

export default FairnessFigure;
