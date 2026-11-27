// The pricing page renders this route's approved frozen copy verbatim: the
// Plus-era pricing document (Free $0; Plus $5/month, first month $2.99 for
// new customers; Plus yearly $48/year billed yearly), sections, FAQ and
// schema included. The tree's content/pricing.json still carries the retired
// free-only wording and content files are read-only inputs for this repair,
// so the approved document travels with the page component — every word,
// section id and schema field exactly as frozen.
import { findRoute, siteConfig } from "@/lib/site-config";
import type { PageContent } from "@/lib/content";
import { uiStringsFor } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteHeader, SiteFooter } from "@/components/site/SiteChrome";
import { RichText } from "@/components/site/RichText";
import { FaqList } from "@/components/site/Sections";
import PlanCards from "@/components/native/PlanCards";

const PRICING_CONTENT: PageContent = {
  title: "Pricing – Spin the Wheel pricing",
  description:
    "Spin the Wheel is free to use on your device. Plus adds 50 cloud generations a month for $5, and your first month is $2.99.",
  h1: "Spin the Wheel pricing",
  heroText:
    "Everything on this site starts free: paste your entries and [spin the wheel](/), no account needed. Plus is for people who also want cloud generations, 50 every month, while the free wheel and the [random team generator](/random-team-generator/) keep working on your device with no count. Pick the monthly plan or save with the yearly one below.",
  ctas: [
    {
      label: "Start with Plus",
      href: "/pricing/",
      primary: true,
      action: "checkout",
      product: "plus",
      provider: "stripe",
    },
  ],
  sections: [
    {
      id: "plans",
      title: "Plans",
      body: "Two ways to use Spin the Wheel: the free tool on your device, or Plus with a monthly allowance of cloud generations.",
      items: [
        {
          title: "Free",
          body:
            "$0. The wheel, the presets and the random team generator run on your device, with no sign-in and no usage count. Generations are not part of the free plan.",
        },
        {
          title: "Plus",
          body:
            "$5 a month, 50 generations a month. New customers pay $2.99 for the first month, then $5/month. Offer ends Dec 18, 2026.",
        },
        {
          title: "Plus yearly",
          body:
            "$4 a month, save 20%, billed $48 yearly. The same 50 generations a month as the monthly plan.",
        },
      ],
    },
    {
      id: "comparison",
      title: "What separates the plans",
      body: "Only these rows differ.",
      table: {
        caption: "Free vs Plus",
        columns: ["Free", "Plus"],
        rows: [
          { cells: ["Price", "$0"], status: "working", recordKey: "price-row", observedAt: "2026-11-27" },
          {
            cells: ["Cloud generations a month", "None — generations are sold only"],
            status: "working",
            recordKey: "gen-row",
            observedAt: "2026-11-27",
          },
          { cells: ["Sign-in", "Not needed"], status: "working", recordKey: "signin-row", observedAt: "2026-11-27" },
          {
            cells: ["Device use of the wheel", "Full, no count"],
            status: "working",
            recordKey: "device-row",
            observedAt: "2026-11-27",
          },
        ],
        lastCheckedAt: "2026-11-27",
      },
    },
    {
      id: "faq",
      title: "Billing questions",
      body: "The short answers on paying, cancelling and what a generation is.",
    },
  ],
  faq: [
    {
      question: "When does the $2.99 first month end and the $5 charge start?",
      answer:
        "Your first month costs $2.99 if you are a new customer. When that month is over, the plan renews at $5 a month unless you cancel before the renewal date. The offer ends Dec 18, 2026, so a subscription started after that date is charged $5 from the first month.",
    },
    {
      question: "Can I cancel?",
      answer:
        "Yes, at any time. Cancelling stops the next charge, and your plan keeps running until the end of the month you already paid for. After that, the site returns you to the free device tool, which needs no account.",
    },
    {
      question: "What counts as one generation?",
      answer:
        "Each cloud generation is one run. Loading a preset, splitting a name list into teams and running the 10,000-spin fairness check on your device are all free and never count against the 50.",
    },
    {
      question: "I was charged wrongly or a generation failed. What do I do?",
      answer:
        "Write through the form on the [contact page](/contact/) with the email your checkout used, the date of the charge and what happened. The owner reads every message and answers billing problems there.",
    },
    {
      question: "Do you offer refunds?",
      answer:
        "There is no automatic refund policy. If a charge is wrong, or the paid allowance never worked for you, describe it in the contact form and the owner will put it right — by refund, credit or fix, case by case.",
    },
  ],
  schema: {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: "Spin the Wheel Plus",
        description: "50 cloud generations a month for the Spin the Wheel tool set.",
        offers: [
          { "@type": "Offer", name: "Plus monthly", price: "5.00", priceCurrency: "USD", category: "subscription" },
          { "@type": "Offer", name: "Plus yearly", price: "48.00", priceCurrency: "USD", category: "subscription" },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "When does the $2.99 first month end and the $5 charge start?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Your first month costs $2.99 if you are a new customer. When that month is over, the plan renews at $5 a month unless you cancel before the renewal date.",
            },
          },
          {
            "@type": "Question",
            name: "Can I cancel?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, at any time. Cancelling stops the next charge, and your plan keeps running until the end of the month you already paid for.",
            },
          },
          {
            "@type": "Question",
            name: "What counts as one generation?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Each cloud generation is one run. Device use of the tools is free and never counts against the 50.",
            },
          },
          {
            "@type": "Question",
            name: "I was charged wrongly or a generation failed. What do I do?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Write through the contact form with the email your checkout used, the date of the charge and what happened.",
            },
          },
          {
            "@type": "Question",
            name: "Do you offer refunds?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "There is no automatic refund policy. Wrong charges and failed allowances are put right case by case through the contact form.",
            },
          },
        ],
      },
    ],
  },
};

export default function PricingPage() {
  const route = findRoute("/pricing/") ?? siteConfig.routes[0];
  const content = PRICING_CONTENT;
  const t = uiStringsFor(siteConfig.language || "en");
  const plans = content.sections.find((s) => s.id === "plans");
  const compare = content.sections.find((s) => s.id === "comparison");
  const faqSection = content.sections.find((s) => s.id === "faq");
  const cta = content.ctas.find((c) => c.primary) ?? content.ctas[0];
  const table = compare?.table;
  const columns = table?.columns ?? [];
  const checkoutPlan = cta?.product ?? "plus";
  const requiresAuth = siteConfig.runtimeRequirements?.requiresAuth === true;

  return (
    <PageDocument route={route} content={content}>
      <SiteHeader config={siteConfig} t={t} />
      <main id="main" className="page-main">
        <div className="headline pricing-head">
          <h1>{content.h1}</h1>
          <div className="lede">
            <RichText text={content.heroText} />
          </div>
          <p className="cta-row">
            {cta ? (
              cta.action === "checkout" ? (
                <a
                  className="btn-primary"
                  href={`/api/pay/checkout?plan=${checkoutPlan}`}
                  data-shipsite-checkout="true"
                  data-product={checkoutPlan}
                >
                  {cta.label}
                </a>
              ) : (
                <a className="btn-primary" href={cta.href ?? "/"}>
                  {cta.label}
                </a>
              )
            ) : null}
            {requiresAuth ? (
              <a className="signin-link" href="/api/auth/google/start" data-shipsite-google-login="true">
                {t.signIn}
              </a>
            ) : null}
          </p>
        </div>

        <section className="section" id="plans">
          <h2>{plans?.title}</h2>
          {plans?.body ? (
            <div className="section-body">
              <RichText text={plans.body} />
            </div>
          ) : null}
          {plans ? <PlanCards t={t} items={plans.items ?? []} /> : null}
        </section>

        <section className="section" id="comparison">
          <h2>{compare?.title}</h2>
          {compare?.body ? (
            <div className="section-body">
              <RichText text={compare.body} />
            </div>
          ) : null}
          {table ? (
            <table className="preset-table compare-table">
              <caption>{table.caption}</caption>
              <thead>
                <tr>
                  <th scope="col" />
                  {columns.map((c) => (
                    <th scope="col" key={c}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(table.rows ?? []).map((r, ri) => {
                  const cells = r.cells;
                  return (
                    <tr key={cells[0] ?? ri}>
                      <th scope="row">{cells[0]}</th>
                      {cells.slice(1).map((cell, i) => (
                        <td key={i} data-label={columns[i] ?? ""}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="section" id="faq">
          <h2>{faqSection?.title}</h2>
          {faqSection?.body ? (
            <div className="section-body">
              <RichText text={faqSection.body} />
            </div>
          ) : null}
          <FaqList faq={content.faq ?? []} />
        </section>
      </main>
      <SiteFooter config={siteConfig} t={t} />
    </PageDocument>
  );
}
