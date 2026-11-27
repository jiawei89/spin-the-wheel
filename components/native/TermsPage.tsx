// The terms page renders this route's approved frozen copy verbatim: the
// Plus-era terms document (what the service is, fair use, subscriptions and
// changes), sections and schema included. The tree's content/terms.json
// still carries the retired free-only wording ("There are no paid plans,
// subscriptions or charges today") and content files are read-only inputs
// for this repair, so the approved document travels with the page component
// — every word, section id and schema field exactly as frozen.
import { findRoute, siteConfig } from "@/lib/site-config";
import type { PageContent } from "@/lib/content";
import { uiStringsFor } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteHeader, SiteFooter } from "@/components/site/SiteChrome";
import { LegalArticle } from "@/components/site/LegalArticle";

const TERMS_CONTENT: PageContent = {
  title: "Terms of Use – Spin the Wheel",
  description:
    "The plain terms for using Spin the Wheel: what the service is, what you may do with it, and what it is not.",
  h1: "Terms of use",
  heroText:
    "Use the tools freely for real draws of your own. These terms say what the service is, what you may not do with it, and how the subscription works.",
  ctas: [],
  sections: [
    {
      id: "the-service",
      title: "What the service is",
      body:
        "Spin the Wheel is an independent site run by its owner. It offers a random picker wheel, preset wheels and a random team generator, free on your device, plus a paid Plus plan with a monthly allowance of cloud generations. It is not affiliated with, endorsed by or connected to any other wheel, picker or random-draw site or brand.",
    },
    {
      id: "fair-use",
      title: "How you may use it",
      body:
        "You may use the tools for classrooms, games, giveaways and decisions of your own, and share results you produce. You may not disrupt or automate the site in ways that degrade it for others, or resell the service as your own. Draws are random; a result is final once shown, and the site does not mediate disputes about outcomes.",
    },
    {
      id: "subscriptions",
      title: "Subscriptions and changes",
      body:
        "Plus renews at its stated price until cancelled, and cancelling stops the next charge. Billing questions and refund requests go through the [contact form](/contact/). Prices and allowances may change; the price shown at checkout is the one that applies to your purchase. The [privacy policy](/privacy/) explains what happens to data you send.",
    },
  ],
  schema: {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Terms of Use – Spin the Wheel",
  },
};

export default function TermsPage() {
  const route = findRoute("/terms/") ?? siteConfig.routes[0];
  const content = TERMS_CONTENT;
  const t = uiStringsFor(siteConfig.language || "en");
  return (
    <PageDocument route={route} content={content}>
      <SiteHeader config={siteConfig} t={t} />
      <main id="main" className="page-main article-main">
        <LegalArticle content={content} t={t} />
      </main>
      <SiteFooter config={siteConfig} t={t} />
    </PageDocument>
  );
}
