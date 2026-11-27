"use client";

// The plans block: the pricing contract's three plans, priced exactly as the
// contract sells them — Free $0; Plus $5 a month with the $2.99 first month
// for new customers (then $5/month); Plus yearly billed $48 yearly ($4 a
// month). The billing toggle picks the period the buyer is comparing, but
// both paid plans stay on the table with their prices visible either way, so
// the yearly price always sits beside the monthly one. Every paid card links
// to the site's own /api/pay/checkout with the pricing-contract tier id, so
// checkout works without any script; an unconnected payment platform is the
// checkout endpoint's message to give, not a reason to hide the control.

import { useState } from "react";
import type { UiStrings } from "@/lib/ui-strings";
import { RichText } from "@/components/site/RichText";

type PlanItem = { title?: string; body?: string };

type CardSpec = {
  big?: string;
  strike?: string;
  unit?: string;
  period?: "monthly" | "annual";
  checkoutPlan?: string;
  ctaKey?: keyof UiStrings;
};

const CARD_SPECS: Record<string, CardSpec> = {
  Free: { big: "$0", ctaKey: "planCtaFree" },
  Plus: {
    big: "$2.99",
    strike: "$5",
    unit: "/month",
    period: "monthly",
    checkoutPlan: "plus",
    ctaKey: "planCtaMonthly",
  },
  "Plus yearly": {
    big: "$48",
    unit: "/year",
    period: "annual",
    checkoutPlan: "plus-annual",
    ctaKey: "planCtaAnnual",
  },
};

export default function PlanCards({ t, items }: { t: UiStrings; items: PlanItem[] }) {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="plans-bar">
      <div className="billing-toggle" role="group" aria-label={t.planBillingToggle}>
        <button type="button" aria-pressed={period === "monthly"} onClick={() => setPeriod("monthly")}>
          {t.planMonthly}
        </button>
        <button type="button" aria-pressed={period === "annual"} onClick={() => setPeriod("annual")}>
          {t.planAnnual}
        </button>
      </div>
      <div className="plan-grid">
        {items.map((item, i) => {
          const name = item.title ?? "";
          const spec: CardSpec = CARD_SPECS[name] ?? {};
          const featured = spec.period === period;
          return (
            <article className={featured ? "plan-card featured" : "plan-card"} key={name || i}>
              {name ? <h3 className="plan-name">{name}</h3> : null}
              {featured ? <p className="plan-lead">{t.planMostPopular}</p> : null}
              {spec.big ? (
                <p className="price-now">
                  {spec.strike ? <s>{spec.strike}</s> : null}
                  <strong>{spec.big}</strong>
                  {spec.unit ? <span className="price-unit">{spec.unit}</span> : null}
                </p>
              ) : null}
              {item.body ? (
                <div className="plan-line">
                  <RichText text={item.body} />
                </div>
              ) : null}
              {spec.checkoutPlan ? (
                <a
                  className={featured ? "btn-primary plan-cta" : "btn-secondary plan-cta"}
                  href={`/api/pay/checkout?plan=${spec.checkoutPlan}`}
                  data-shipsite-checkout="true"
                  data-product={spec.checkoutPlan}
                >
                  {spec.ctaKey ? t[spec.ctaKey] : ""}
                </a>
              ) : (
                <a className="btn-secondary plan-cta" href="/">
                  {t.planCtaFree}
                </a>
              )}
            </article>
          );
        })}
      </div>
      <p className="plan-line">{t.planTrustLine}</p>
    </div>
  );
}
