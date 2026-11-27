// The plans block, free first (owner decision 2026-11-27): the site sells
// nothing, so there is one free card and no billing toggle, no checkout link
// and no billing-portal row. Paid tiers return with the payments-on change.
import type { UiStrings } from "@/lib/ui-strings";
import { FREE_FEATURES, PLAN_VIEWS } from "@/lib/plan-constants";

type PlanItem = { title?: string; body?: string };

export default function PlanCards({
  t,
  items,
}: {
  t: UiStrings;
  items: PlanItem[];
}) {
  const freeBody = items.find((i) => i.title === "Free")?.body ?? "";
  const free = PLAN_VIEWS.free;

  return (
    <div className="plans-block">
      <div className="plan-grid">
        <article className="plan-card">
          <h3>{free.name}</h3>
          <p className="plan-price">
            <span className="plan-big">{free.big}</span>
          </p>
          <p className="plan-quota">{free.quota}</p>
          <ul className="plan-features">
            {FREE_FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="plan-body">{freeBody}</p>
          <a className="btn-secondary" href="/">
            {t.planCtaFree}
          </a>
        </article>
      </div>
    </div>
  );
}
