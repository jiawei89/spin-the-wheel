import { findRoute, siteConfig } from "@/lib/site-config";
import { loadPageContent } from "@/lib/content-loader";
import { uiStringsFor } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteHeader, SiteFooter } from "@/components/site/SiteChrome";
import { SectionStack } from "@/components/site/Sections";
import { RichText } from "@/components/site/RichText";
import ContactForm from "@/components/native/ContactForm";

export default async function ContactPage() {
  const route = findRoute("/contact/") ?? siteConfig.routes[0];
  const content = await loadPageContent(route.contentKey, route);
  const t = uiStringsFor(siteConfig.language || "en");
  return (
    <PageDocument route={route} content={content}>
      <SiteHeader config={siteConfig} t={t} />
      <main id="main" className="page-main contact-main">
        <div className="headline">
          <h1>{content.h1}</h1>
          <div className="lede">
            <RichText text={content.heroText} />
          </div>
        </div>
        <div className="contact-card">
          <ContactForm t={t} />
        </div>
        <SectionStack sections={content.sections ?? []} faq={content.faq} wideItems={["what-to-write"]} />
      </main>
      <SiteFooter config={siteConfig} t={t} />
    </PageDocument>
  );
}
