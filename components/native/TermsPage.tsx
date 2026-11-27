import { findRoute, siteConfig } from "@/lib/site-config";
import { loadPageContent } from "@/lib/content-loader";
import { uiStringsFor } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteHeader, SiteFooter } from "@/components/site/SiteChrome";
import { LegalArticle } from "@/components/site/LegalArticle";

export default async function TermsPage() {
  const route = findRoute("/terms/") ?? siteConfig.routes[0];
  const content = await loadPageContent(route.contentKey, route);
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
