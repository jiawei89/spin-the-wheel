// The preset wheels hub: every preset wheel the site ships, each card drawn
// from that preset's real entries, each card opening its own page.
import { siteConfig } from "@/lib/site-config";
import { loadPageContent } from "@/lib/content-loader";
import { uiStringsFor } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { SectionStack } from "@/components/site/Sections";
import { presetWheels } from "@/lib/datasets/preset-wheels";
import { parseEntries, buildSegments, segmentPath, THEMES } from "@/lib/wheel-engine";

function MiniWheel({ entries }: { entries: string[] }) {
  const segs = buildSegments(parseEntries(entries.join("\n")), THEMES[0].colors);
  return (
    <svg className="miniwheel" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
      <g>
        {segs.map((seg) => (
          <path key={seg.index} d={segmentPath(seg)} fill={seg.fill} stroke="#14231c" strokeWidth="6" />
        ))}
      </g>
      <circle cx="200" cy="200" r="52" fill="#f3efe4" stroke="#14231c" strokeWidth="4" />
    </svg>
  );
}

export default async function WheelsHubPage() {
  const route = siteConfig.routes.find((r) => r.path === "/wheels/") ?? siteConfig.routes[0];
  const content = await loadPageContent(route.contentKey, route);
  const t = uiStringsFor(siteConfig.language ?? "en");
  return (
    <PageDocument route={route} content={content}>
      <SiteHeader config={siteConfig} t={t} />
      <main className="page-main" id="main">
        <article>
          <h1>{content.h1}</h1>
          <p className="lede">{content.heroText}</p>
          <ul className="hub-grid">
            {presetWheels.map((p) => (
              <li key={p.id}>
                <a className="hub-card" href={`/wheels/${p.id}/`}>
                  <MiniWheel entries={p.entries} />
                  <span className="hub-card-title">{p.title}</span>
                  <span className="hub-card-desc">{p.description}</span>
                </a>
              </li>
            ))}
          </ul>
          <SectionStack sections={content.sections ?? []} />
        </article>
      </main>
      <SiteFooter config={siteConfig} t={t} />
    </PageDocument>
  );
}
