"use client";

// The billing toggle and the plan cards. Both Plus cards stay in the HTML —
// the toggle only switches which one is visible — so a visitor without
// JavaScript still sees the monthly card and both checkout links exist on the
// page. The figures come from lib/plan-constants.ts (the pricing contract),
// never from the prose.
import { useState } from "react";
import type { UiStrings } from "@/lib/ui-strings";
import { INTRO_ENDS_AT, FREE_FEATURES, PLUS_FEATURES, PLAN_VIEWS } from "@/lib/plan-constants";

type PlanItem = { title?: string; body?: string };

export default function PlanCards({
  t,
  items,
}: {
  t: UiStrings;
  items: PlanItem[];
}) {
  const [billing, setBilling] = useState<"month" | "year">("month");
  const monthly = PLAN_VIEWS.plusMonthly;
  const annual = PLAN_VIEWS.plusAnnual;
  const plusBody = items.find((i) => i.title === "Plus")?.body ?? "";
  const annualBody = items.find((i) => i.title === "Plus yearly")?.body ?? "";
  const freeBody = items.find((i) => i.title === "Free")?.body ?? "";

  return (
    <div className="plans-block">
      <div className="billing-toggle" role="group" aria-label={t.planBillingToggle}>
        <button
          type="button"
          className="toggle-btn"
          aria-pressed={billing === "month"}
          onClick={() => setBilling("month")}
        >
          {t.planMonthly}
        </button>
        <button
          type="button"
          className="toggle-btn"
          aria-pressed={billing === "year"}
          onClick={() => setBilling("year")}
        >
          {t.planAnnual}
        </button>
      </div>

      <div className="plan-grid">
        <article className="plan-card">
          <h3>{PLAN_VIEWS.free.name}</h3>
          <p className="plan-price">
            <span className="plan-big">{PLAN_VIEWS.free.big}</span>
          </p>
          <p className="plan-quota">{PLAN_VIEWS.free.quota}</p>
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

        <article className="plan-card plan-card-popular">
          <p className="plan-flag">{t.planMostPopular}</p>
          <h3>{monthly.name}</h3>
          <div hidden={billing !== "month"}>
            <p className="plan-price">
              <span className="plan-strike">{monthly.strike}</span>
              <span className="plan-big">{monthly.big}</span>
              <span className="plan-per">{monthly.per}</span>
            </p>
            <p className="plan-sub">{monthly.sub}</p>
            <p className="plan-note" data-shipsite-deadline={INTRO_ENDS_AT}>
              {monthly.note}
            </p>
          </div>
          <div hidden={billing !== "year"}>
            <p className="plan-price">
              <span className="plan-big">{annual.big}</span>
              <span className="plan-per">{annual.per}</span>
            </p>
            <p className="plan-sub">{annual.sub}</p>
            <p className="plan-flag">{annual.save}</p>
          </div>
          <p className="plan-quota">{monthly.quota}</p>
          <ul className="plan-features">
            {PLUS_FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <p className="plan-body">{plusBody}</p>
          <a
            className="btn-primary"
            href="/api/pay/checkout?plan=plus"
            data-shipsite-checkout
            data-product="plus"
            hidden={billing !== "month"}
          >
            {t.planCtaMonthly}
          </a>
          <a
            className="btn-primary"
            href="/api/pay/checkout?plan=plus-annual"
            data-shipsite-checkout
            data-product="plus-annual"
            hidden={billing !== "year"}
          >
            {t.planCtaAnnual}
          </a>
          <p className="plan-body" hidden={billing === "month"}>
            {annualBody}
          </p>
        </article>
      </div>

      <p className="plan-sub plan-annual-switch" hidden={billing !== "month"}>
        {annual.save} with yearly billing: {annual.big}
        {annual.per} — {annual.sub}.{" "}
        <button type="button" className="quiet-link" onClick={() => setBilling("year")}>
          {t.planSeeYearly}
        </button>
      </p>

      <p className="trust-line">{t.planTrustLine}</p>
      <p className="manage-row">
        <a className="quiet-link" href="/api/pay/portal">
          {t.planManageBilling}
        </a>
      </p>
    </div>
  );
}
