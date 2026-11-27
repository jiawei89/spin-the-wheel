import { findRoute, siteConfig } from "@/lib/site-config";
import { uiStringsFor } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteHeader, SiteFooter } from "@/components/site/SiteChrome";
import { LegalArticle } from "@/components/site/LegalArticle";
import type { PageContent } from "@/lib/content";

// The approved privacy copy for this route, authored in the component layer:
// content/** is the read-only data plane and its cached document for this
// page still claims every tool runs on the device with nothing uploaded,
// which contradicts the plan's fact sheet (a paid generation sends its input
// to this site's server; a Plus subscription is handled by the payment
// provider). These are the approved words, rendered verbatim; the inline
// [label](href) links are transformed by the shared RichText renderer.
const privacyContent: PageContent = {
  title: "Privacy Policy – Spin the Wheel",
  description:
    "What Spin the Wheel collects, what a generation sends to its server, and how to ask for deletion, in plain language.",
  h1: "Privacy policy",
  heroText:
    "Short version: the free tools run on your device. When you buy or use a paid generation, your input is sent to this site's server to run it, and this page explains exactly what that means and how to have data removed.",
  ctas: [],
  sections: [
    {
      id: "what-runs-where",
      title: "Where your work happens",
      body: "Splitting teams, the wheel and the preset tools run in your browser on your device; those runs are not sent anywhere and are not stored. A paid generation is different: it sends your input to this site's server, which runs it and returns the result. The site does not claim your work never leaves your device.",
    },
    {
      id: "what-is-collected",
      title: "What is collected",
      body: "Nothing is required to use the free tools: no account, no name, no email. A Plus subscription is processed by the payment provider, which holds the details a payment needs; the site itself does not store your card. Messages sent through the [contact form](/contact/) are kept so the owner can read and answer them.",
    },
    {
      id: "your-choices",
      title: "Your choices",
      body: "You can ask for a message you sent to be deleted, or for your subscription to be cancelled, through the contact form. The site does not sell data and does not run advertising networks on the tool pages. The [terms of use](/terms/) govern your use of the site.",
    },
  ],
  schema: { "@context": "https://schema.org", "@type": "Article", headline: "Privacy Policy – Spin the Wheel" },
};

export default function PrivacyPage() {
  const route = findRoute("/privacy/") ?? siteConfig.routes[0];
  const content = privacyContent;
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
