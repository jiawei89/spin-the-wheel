import { findRoute, siteConfig } from "@/lib/site-config";
import { loadPageContent } from "@/lib/content-loader";
import { uiStringsFor, splitLede } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteHeader, SiteFooter } from "@/components/site/SiteChrome";
import { SectionStack } from "@/components/site/Sections";
import TeamSplitter from "@/components/native/TeamSplitter";

export default async function RandomTeamGeneratorPage() {
  const route = findRoute("/random-team-generator/") ?? siteConfig.routes[0];
  const content = await loadPageContent(route.contentKey, route);
  const t = uiStringsFor(siteConfig.language || "en");
  const [ledeFirst, ledeRest] = splitLede(content.heroText);
  return (
    <PageDocument route={route} content={content}>
      <SiteHeader config={siteConfig} t={t} />
      <main id="main" className="page-main">
        <div className="headline">
          <h1>{content.h1}</h1>
          <p className="lede">{ledeFirst}</p>
        </div>
        <TeamSplitter t={t} />
        {ledeRest ? <p className="afterstage">{ledeRest}</p> : null}
        <SectionStack sections={content.sections ?? []} faq={content.faq} />
      </main>
      <SiteFooter config={siteConfig} t={t} />
    </PageDocument>
  );
}
