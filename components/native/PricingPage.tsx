import { findRoute, siteConfig } from "@/lib/site-config";
import { loadPageContent } from "@/lib/content-loader";
import { uiStringsFor } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteHeader, SiteFooter } from "@/components/site/SiteChrome";
import { RichText } from "@/components/site/RichText";
import { FaqList } from "@/components/site/Sections";
import PlanCards from "@/components/native/PlanCards";

type TableSpec = {
  caption?: string;
  columns?: string[];
  rows?: { cells?: string[] }[];
};
type Cta = {
  label?: string;
  href?: string;
  primary?: boolean;
  action?: string;
  product?: string;
};
type WideSection = {
  id?: string;
  title?: string;
  body?: string;
  items?: { title?: string; body?: string }[];
  table?: TableSpec;
};

// The pricing page sells exactly what the contract (monetization/1.2) sells:
// Free $0; Plus $5/month with a $2.99 first month for new customers (offer
// ends Dec 18, 2026); Plus yearly $48 billed yearly. The figures live in
// lib/plan-constants.ts, the cards and billing toggle in PlanCards.tsx; the
// prose on the page is the approved copy in content/pricing.json.
export default async function PricingPage() {
  const route = findRoute("/pricing/") ?? siteConfig.routes[0];
  const content = await loadPageContent(route.contentKey, route);
  const t = uiStringsFor(siteConfig.language || "en");
  const sections = (content.sections ?? []) as WideSection[];
  const plans = sections.find((s) => s.id === "plans");
  const compare = sections.find((s) => s.id === "comparison");
  const faqSection = sections.find((s) => s.id === "faq");
  const ctas = (content.ctas ?? []) as Cta[];
  const cta = ctas.find((c) => c.primary) ?? ctas[0];
  const product = cta?.product ?? "plus";
  const table = compare?.table;
  const columns = table?.columns ?? ["What you get", "Free", "Plus"];

  return (
    <PageDocument route={route} content={content}>
      <SiteHeader config={siteConfig} t={t} />
      <main id="main" className="page-main">
        <div className="headline pricing-head">
          <h1>{content.h1}</h1>
          <div className="lede">
            <RichText text={content.heroText ?? ""} />
          </div>
          {cta ? (
            <p className="pricing-cta">
              <a
                className="btn-primary"
                href={`/api/pay/checkout?plan=${product}`}
                data-shipsite-checkout
                data-product={product}
              >
                {cta.label}
              </a>
            </p>
          ) : null}
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
                  <th scope="col">
                    <span className="visually-hidden">{columns[0]}</span>
                  </th>
                  {columns.slice(1).map((c) => (
                    <th scope="col" key={c}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(table.rows ?? []).map((r, ri) => {
                  const cells = r.cells ?? [];
                  return (
                    <tr key={cells[0] ?? ri}>
                      <th scope="row">{cells[0]}</th>
                      {cells.slice(1).map((cell, i) => (
                        <td key={i} data-label={columns[i + 1]}>
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
