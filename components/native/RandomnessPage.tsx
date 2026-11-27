// The fairness page: how a pick is made, the visitor-run 10,000-spin audit,
// and the recorded 100,000-spin result — the wheel's evidence in one place.
import { siteConfig } from "@/lib/site-config";
import { loadPageContent } from "@/lib/content-loader";
import { uiStringsFor } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { RichText } from "@/components/site/RichText";
import { FaqList } from "@/components/site/Sections";
import FairnessAudit from "@/components/native/FairnessAudit";
import FairnessFigure from "@/components/native/FairnessFigure";

export default async function RandomnessPage() {
  const route = siteConfig.routes.find((r) => r.path === "/randomness/") ?? siteConfig.routes[0];
  const content = await loadPageContent(route.contentKey, route);
  const t = uiStringsFor(siteConfig.language ?? "en");
  const sections = content.sections ?? [];
  const mech = sections[0];
  const yours = sections[1];
  const published = sections[2];
  return (
    <PageDocument route={route} content={content}>
      <SiteHeader config={siteConfig} t={t} />
      <main className="page-main" id="main">
        <article>
          <h1>{content.h1}</h1>
          <p className="lede">{content.heroText}</p>
          {mech ? (
            <section className="section" id={mech.id}>
              <h2>{mech.title}</h2>
              <div className="section-body">
                <RichText text={mech.body} />
              </div>
            </section>
          ) : null}
          {yours ? (
            <section className="section" id={yours.id}>
              <h2>{yours.title}</h2>
              <div className="section-body">
                <RichText text={yours.body} />
              </div>
              <FairnessAudit t={t} />
            </section>
          ) : null}
          {published ? (
            <section className="section" id={published.id}>
              <h2>{published.title}</h2>
              <div className="section-body">
                <RichText text={published.body} />
              </div>
              <FairnessFigure t={t} />
            </section>
          ) : null}
          {content.faq && content.faq.length > 0 ? <FaqList faq={content.faq} /> : null}
        </article>
      </main>
      <SiteFooter config={siteConfig} t={t} />
    </PageDocument>
  );
}
