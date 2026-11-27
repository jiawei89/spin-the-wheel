import type { Route, SiteConfig, SiteLocale } from "../lib/site-config";
import { absoluteSiteUrl, hreflangAlternates, isPreviewDeployment, localeNav, localeNavGroups, localeNavMore, normalizeRoutePath, ogLocaleFor } from "../lib/site-config";
import type { PageContent } from "../lib/content";
import { recipeStyles } from "./native/recipe-styles";
import { staticAssetHref } from "../lib/static-assets";
import { mergeJsonLdGraph } from "../lib/json-ld-graph";
import { shareCard } from "../lib/share-card";
// Static import by construction: the registry template always ships (empty by
// default), so a static export can resolve it at build time. The native
// authoring agent registers its route components there; this platform file
// stays pinned and only reads the map.
import { nativeRoutes } from "./native/registry";

function isPlaceholderHost(host: string): boolean {
  return /\.example(?:\.com)?$/i.test(host) || host.endsWith(".example");
}

function rewritePlaceholderJsonLd(value: unknown, origin: string): unknown {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      if (isPlaceholderHost(url.hostname)) return new URL(`${url.pathname}${url.search}${url.hash}`, `${origin}/`).toString();
    } catch { /* not a URL */ }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => rewritePlaceholderJsonLd(item, origin));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, rewritePlaceholderJsonLd(nested, origin)]));
  }
  return value;
}

function isRedundantWebPageSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return false;
  const record = schema as Record<string, unknown>;
  const type = record["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (!types.includes("WebPage")) return false;
  return Object.keys(record).every((key) => ["@context", "@type", "name", "url", "description", "headline", "title"].includes(key));
}

function breadcrumbListItem(name: string, url: string, position: number) {
  return {
    "@type": "ListItem",
    position,
    name,
    item: { "@type": "WebPage", "@id": url, name, url },
  };
}

// Structured data says what the page really is (claude-seo audit of Beat
// Maker, 2026-11-18). Google retired HowTo rich results, so a guide's steps
// stay visible on the page and its schema says Article; the HowTo-only
// fields go with the type.
const HOWTO_ONLY_FIELDS = ["step", "supply", "tool", "totalTime", "estimatedCost", "yield", "prepTime", "performTime"];

/** True when a JSON-LD value (object, array or @graph) declares the type anywhere. */
function jsonLdDeclares(value: unknown, type: string): boolean {
  if (Array.isArray(value)) return value.some((item) => jsonLdDeclares(item, type));
  if (!value || typeof value !== "object") return false;
  const node = value as Record<string, unknown>;
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  if (types.includes(type)) return true;
  return Object.values(node).some((child) => jsonLdDeclares(child, type));
}

/** An About, Contact or legal page is not an Article: name its real page type. */
function routePageType(route: Route): "AboutPage" | "ContactPage" | "WebPage" | null {
  const path = normalizeRoutePath(route.path);
  if (path === "/about") return "AboutPage";
  if (path === "/contact") return "ContactPage";
  if (route.routeArchetype === "legal") return "WebPage";
  return null;
}

function sameName(a: unknown, b: string | null): boolean {
  return typeof a === "string" && Boolean(b) && a.trim().toLowerCase() === String(b).trim().toLowerCase();
}

function latestCheckedAt(content: PageContent): string | null {
  const candidates: string[] = [];
  const add = (value: unknown) => {
    if (typeof value === "string") {
      const match = value.match(/\d{4}-\d{2}-\d{2}/);
      if (match) candidates.push(match[0]);
    }
  };
  add(content.heroText);
  for (const section of content.sections ?? []) {
    add(section.body);
    add(section.table?.lastCheckedAt);
    for (const row of section.table?.rows ?? []) add(row.observedAt);
    for (const item of section.items ?? []) add(item.body);
  }
  const scan = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(scan); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "dateModified" || key === "datePublished") add(child);
      scan(child);
    }
  };
  scan(content.schema);
  if (!candidates.length) {
    const nested = JSON.stringify(content).match(/\d{4}-\d{2}-\d{2}/g) ?? [];
    candidates.push(...nested);
  }
  candidates.sort();
  return candidates.at(-1) ?? null;
}

// Copy edits update content.faq independently of the originally authored
// schema. Keep its FAQ entities current, including @graph/array forms, and
// retain their IDs so other graph nodes keep resolving to the same entity.
function synchronizeFaqJsonLd(schema: unknown, entries: PageContent["faq"]) {
  let hasFaq = false;
  const mainEntity = (entries ?? []).map((entry) => ({
    "@type": "Question", name: entry.question,
    acceptedAnswer: { "@type": "Answer", text: entry.answer },
  }));
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;
    const node = { ...(value as Record<string, unknown>) };
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    if (types.includes("FAQPage")) {
      if (mainEntity.length) {
        node.mainEntity = mainEntity;
        hasFaq = true;
      } else {
        // No visible FAQ remains. Retain the page identity and other types,
        // but never leave the old hidden questions in the document.
        const remaining = types.filter((type) => type !== "FAQPage");
        node["@type"] = remaining.length ? (remaining.length === 1 ? remaining[0] : remaining) : "WebPage";
        delete node.mainEntity;
      }
    }
    for (const [key, child] of Object.entries(node)) node[key] = visit(child);
    return node;
  };
  const value = visit(schema);
  return { value, hasFaq };
}

function completeJsonLd(
  value: unknown,
  ctx: { title: string; h1: string; url: string; date: string | null; author: string | null; homeUrl: string; pageType: "AboutPage" | "ContactPage" | "WebPage" | null },
): unknown {
  if (Array.isArray(value)) {
    // A HowTo beside the page's own Article describes the same page twice;
    // turned into an Article it would be a second Article for one page (Beat
    // Maker's /how-to-make-a-beat/ graph held both), so it goes and the
    // Article stands. A HowTo alone becomes the Article below.
    const declaresAny = (item: unknown, list: readonly string[]) => Boolean(item) && typeof item === "object"
      && ([] as unknown[]).concat((item as Record<string, unknown>)["@type"]).some((type) => typeof type === "string" && list.includes(type));
    const ownArticle = value.some((item) => declaresAny(item, ["Article", "NewsArticle", "BlogPosting"]) && !declaresAny(item, ["HowTo"]));
    const kept = ownArticle ? value.filter((item) => !declaresAny(item, ["HowTo"])) : value;
    return kept.map((item) => completeJsonLd(item, ctx));
  }
  if (!value || typeof value !== "object") return value;
  const node = { ...(value as Record<string, unknown>) };
  const rawTypes = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  let types = rawTypes.filter((entry): entry is string => typeof entry === "string");
  const retype = (from: readonly string[], to: string) => {
    if (!types.some((type) => from.includes(type))) return;
    types = [...new Set(types.map((type) => (from.includes(type) ? to : type)))];
    node["@type"] = types.length === 1 ? types[0] : types;
  };
  if (types.includes("HowTo")) {
    retype(["HowTo"], "Article");
    for (const field of HOWTO_ONLY_FIELDS) delete node[field];
  }
  // The site is its brand, not a person named after it: a Person called
  // "Beat Maker" beside an Organization called "Beat Maker" is two entities
  // for one site. A real named author keeps its Person.
  if (types.includes("Person") && sameName(node.name, ctx.author)) {
    retype(["Person"], "Organization");
    delete node.worksFor;
    delete node.jobTitle;
    if (!node.url) node.url = ctx.homeUrl;
  }
  if (ctx.pageType) retype(["Article", "NewsArticle", "BlogPosting"], ctx.pageType);
  if (types.includes("BreadcrumbList") && Array.isArray(node.itemListElement)) {
    node.itemListElement = node.itemListElement.map((element, index) => {
      if (!element || typeof element !== "object") return element;
      const item = element as Record<string, unknown>;
      const name = typeof item.name === "string" && item.name.trim() ? item.name : ctx.title;
      const rawItem = item.item;
      const url = typeof rawItem === "string" ? rawItem
        : rawItem && typeof rawItem === "object" && typeof (rawItem as Record<string, unknown>)["@id"] === "string"
          ? String((rawItem as Record<string, unknown>)["@id"])
          : ctx.url;
      const position = typeof item.position === "number" ? item.position : index + 1;
      // Breadcrumb items are absolute URLs; the copy wrote "/guide/".
      let absolute = url;
      try { absolute = new URL(url, ctx.homeUrl).toString(); } catch { /* keep as written */ }
      return breadcrumbListItem(name, absolute, position);
    });
  }
  const brandAuthor = ctx.author ? { "@type": "Organization", name: ctx.author, url: ctx.homeUrl } : null;
  if (types.includes("Article") || types.includes("NewsArticle") || types.includes("BlogPosting")) {
    if (!node.author && brandAuthor) node.author = brandAuthor;
    if (!node.datePublished && ctx.date) node.datePublished = ctx.date;
    if (!node.dateModified && ctx.date) node.dateModified = ctx.date;
    node.headline = ctx.h1;
    // Article without a date is invalid structured data (Marvel /about/,
    // 2026-08-22). Prefer WebPage over an undated Article.
    if (typeof node.datePublished !== "string" && typeof node.dateModified !== "string") {
      node["@type"] = types.length === 1
        ? "WebPage"
        : types.map((type) => (type === "Article" || type === "NewsArticle" || type === "BlogPosting" ? "WebPage" : type));
    }
  }
  if (types.includes("WebPage") && !node.author && brandAuthor) {
    node.author = brandAuthor;
  }
  if (types.includes("WebPage") && !node.dateModified && ctx.date) node.dateModified = ctx.date;
  for (const [key, child] of Object.entries(node)) {
    if (key === "itemListElement") continue;
    node[key] = completeJsonLd(child, ctx);
  }
  return node;
}

// The document wrapper is the only thing every generated site shares: head
// metadata, the inlined stylesheet, the skip link and the runtime client.
// Luban writes the visible page. There is no composition fallback.
/**
 * The config a page component receives. A page holding a client component puts
 * every prop it passes into the visitor's HTML, so the whole config shipped on
 * every page: a tool's work order in the studio's language failed "no cjk
 * characters" on Pomodoro's English site, its acceptance answers went with it,
 * and the home weighed 630KB (2026-11-05). Pages render tools from their
 * inputs and output; the work order and samples stay in lib/site-config.json.
 */
function pageConfig(config: SiteConfig): SiteConfig {
  return {
    ...config,
    toolSpecs: config.toolSpecs?.map((spec) => ({ ...spec, jtbd: spec.title, acceptance: [] })),
    ...(config.runtimeRequirements ? { runtimeRequirements: { ...config.runtimeRequirements, toolPromises: [] } as SiteConfig["runtimeRequirements"] } : {}),
  };
}

export function PageRenderer({ route, content, config, locale }: { route: Route; content: PageContent; config: SiteConfig; locale?: SiteLocale }) {
  const canonicalPath = config.routes.find((r) => r.path === route.path)?.canonical ?? route.path;
  const canonical = absoluteSiteUrl(canonicalPath);
  // hreflang cluster for this page: empty on single-language sites and on
  // pages no locale translated, so those emit no alternate markup at all.
  const alternates = hreflangAlternates(route.path);
  const pageLanguage = locale?.code ?? (config.language || "en");
  const ogLocale = locale ? ogLocaleFor(locale.code, locale.ogLocale) : ogLocaleFor(config.language || "en");
  const ogLocaleAlternates = [...new Set(alternates
    .filter((alt) => alt.hrefLang !== "x-default")
    .map((alt) => {
      const entry = config.locales?.find((candidate) => candidate.code === alt.hrefLang);
      return entry ? ogLocaleFor(entry.code, entry.ogLocale) : ogLocaleFor(alt.hrefLang);
    })
    .filter((value) => value !== ogLocale))];
  // Locale pages get the primary nav projected into their language; nothing
  // else about the composition contract changes per locale.
  const renderConfig = locale ? { ...config, nav: localeNav(locale), navGroups: localeNavGroups(locale), navMore: localeNavMore(locale) } : config;
  const preview = isPreviewDeployment();
  const deployedVersionId = process.env.NEXT_PUBLIC_SHIPSITE_VERSION_ID ?? "unversioned";
  // No analytics, ads, sign-in or checkout script, preview notice or skip
  // link is stamped here (owner 2026-11-20): the site's own code adds each
  // with the owner's connected accounts (.shipsite/plan/owner-accounts.md),
  // and QA measures the outcome.
  const NativeInterior = nativeRoutes[normalizeRoutePath(route.path)] ?? nativeRoutes[route.path];
  if (route.coverageMode !== "redirect" && !NativeInterior) {
    throw new Error(`native_route_missing:${route.path}`);
  }
  // No platform "Sources" strip under the page. It listed every link in the
  // copy under every page (Beat Maker: Soundation and Soundtrap under each
  // guide and the About; owner 2026-11-13: "source不应该显示在生成的站点上").
  // Links stay inline where the copy and the page's own design put them, and
  // zero outbound links is a warning, not a failure (#2769).
  const v = config.visual;
  // Share image: the page's own hero when it has one, else the site-level
  // share image the build picked, as the 1200x630 card the site's prebuild
  // cut from it (scripts/optimize-images.mjs, lib/share-card.ts).
  // og:image must be an absolute URL to work anywhere, and a raster:
  // Facebook, X, LinkedIn and chat apps show no card for an SVG, which left
  // 9 of Beat Maker's 10 pages and every page of mashup-maker.com sharing a
  // blank card with the logo as their image (2026-11-18, 2026-11-25). A site
  // whose only picture is its logo shares the raster card its prebuild made
  // of the logo. The SVG logo itself is the very last resort, when no card
  // was made at all: QA advises on an SVG, and fails a page with no og:image.
  const ogCard = shareCard(content.hero?.src) ?? shareCard(config.ogImage) ?? shareCard(config.brandLogo);
  const ogImage = ogCard?.src ?? config.brandLogo ?? null;
  const fontLinks = config.fontLinks ?? [];
  // The site's recipe as a cached file (scripts/emit-static-assets.mjs,
  // lib/static-assets.ts). Inlined, it rode every page three times: once in
  // <head> and twice more in the React data, the page's and the 404
  // boundary's (Beat Maker, 2026-11-18). It is linked only when its bytes
  // are the ones rendered here; otherwise the text is inlined.
  const recipeStylesHref = staticAssetHref(recipeStyles);
  const pageTitle = content.title || route.title || content.h1;
  const pageDescription = (content.description || route.description || content.heroText || content.h1).slice(0, 300);
  const synchronizedSchema = synchronizeFaqJsonLd(content.schema, content.faq);
  const faqSchema = content.faq?.length && !synchronizedSchema.hasFaq ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  } : null;
  // Answer engines resolve who publishes a page and how it sits in the site
  // from explicit schema, not from layout. Site identity (Organization +
  // WebSite) renders exactly once, on the home route; every inner page carries
  // a two-level breadcrumb back to it. All fields come from config/content —
  // the template invents nothing site-specific.
  const isHome = normalizeRoutePath(route.path) === "/";
  const homeUrl = absoluteSiteUrl("/");
  const organizationSchema = isHome ? {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${homeUrl}#organization`,
    name: config.brandName,
    url: homeUrl,
    ...(config.brandLogo ? { logo: absoluteSiteUrl(config.brandLogo) } : {}),
  } : null;
  const websiteSchema = isHome ? {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${homeUrl}#website`,
    name: config.title || config.brandName,
    description: config.description,
    url: homeUrl,
    publisher: { "@id": `${homeUrl}#organization` },
  } : null;
  // No Person named after the brand. It used to be stamped on every page so
  // the named_authors check passed, and it told search engines the site was
  // a person called "Beat Maker" (claude-seo audit, 2026-11-18). The brand
  // is the Organization above; a real named author comes from the copy's own
  // schema, and without one the content audit says so (an advisory warning).
  const homeRoute = config.routes.find((r) => normalizeRoutePath(r.path) === "/");
  const lastChecked = latestCheckedAt(content);
  const jsonLdCtx = {
    title: pageTitle,
    h1: content.h1,
    url: canonical,
    date: lastChecked,
    author: config.brandName || null,
    homeUrl,
    pageType: routePageType(route),
  };
  // One breadcrumb trail per page: the copy's own when it wrote one (it may
  // be deeper, e.g. Home › Guides › this guide), else the platform's two levels.
  // Beat Maker's explainer carried both, one with relative URLs.
  const breadcrumbSchema = !isHome && !jsonLdDeclares(synchronizedSchema.value, "BreadcrumbList") ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      breadcrumbListItem(homeRoute?.navLabel || config.brandName, homeUrl, 1),
      breadcrumbListItem(route.navLabel || content.h1 || pageTitle, canonical, 2),
    ],
  } : null;
  // One graph per page (lib/json-ld-graph.ts): the page's own schema first,
  // so its fields win, then the FAQ, the site identity and the breadcrumb
  // fill only what it left out. Placeholder hosts are rewritten before the
  // merge, so the copy's https://site.example/#organization and this
  // renderer's #organization are one @id.
  const origin = new URL(canonical).origin;
  const ownSchema = completeJsonLd(rewritePlaceholderJsonLd(
    isRedundantWebPageSchema(synchronizedSchema.value) || !synchronizedSchema.value
      ? { "@context": "https://schema.org", "@type": "WebPage", name: content.h1, url: canonical, ...(lastChecked ? { dateModified: lastChecked } : {}) }
      : synchronizedSchema.value,
    origin,
  ), jsonLdCtx);
  const pageGraph = mergeJsonLdGraph(ownSchema, [faqSchema, organizationSchema, websiteSchema, breadcrumbSchema]
    .filter(Boolean)
    .map((schema) => rewritePlaceholderJsonLd(schema, origin)));
  return (
    <html lang={pageLanguage}>
      <head>
        {/* charset, viewport, title and description come from Next metadata
            (generateMetadata, same fallback chain as pageTitle/pageDescription);
            emitting them here too doubled every one of them (2026-10-10). */}
        <meta name="shipsite-version" content={deployedVersionId} />
        <link rel="canonical" href={canonical} />
        {alternates.map((alt) => <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />)}
        <meta name="robots" content={preview ? "noindex, nofollow" : route.index ? "index, follow" : "noindex, follow"} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content={v?.colors?.background ?? "#0f141a"} />
        {fontLinks.length ? <link rel="preconnect" href="https://fonts.googleapis.com" /> : null}
        {fontLinks.length ? <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /> : null}
        {/* W6-2: preload the font stylesheets so discovery does not wait for
            HTML parse order — the single cheapest FOUT/CLS cut available
            without self-hosting. display=swap already rides in each URL. */}
        {fontLinks.map((href) => <link key={`preload-${href}`} rel="preload" as="style" href={href} />)}
        {fontLinks.map((href) => <link key={href} rel="stylesheet" href={href} />)}
        <meta property="og:site_name" content={config.brandName} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:locale" content={ogLocale} />
        {ogLocaleAlternates.map((value) => <meta key={value} property="og:locale:alternate" content={value} />)}
        {ogImage ? <meta property="og:image" content={absoluteSiteUrl(ogImage)} /> : null}
        {ogCard?.width ? <meta property="og:image:width" content={String(ogCard.width)} /> : null}
        {ogCard?.height ? <meta property="og:image:height" content={String(ogCard.height)} /> : null}
        <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {ogImage ? <meta name="twitter:image" content={absoluteSiteUrl(ogImage)} /> : null}
        {pageGraph ? <script type="application/ld+json">{JSON.stringify(pageGraph)}</script> : null}
        {/* PageRenderer owns <head>, so Next never injects app/globals.css.
            The page's whole look is the site's own: its recipe below and the
            styles its engineer writes. */}
        {recipeStyles ? (recipeStylesHref ? <link rel="stylesheet" href={recipeStylesHref} /> : <style data-shipsite-sheet="recipe" dangerouslySetInnerHTML={{ __html: recipeStyles }} />) : null}
      </head>
      <body data-composition="native-authored">
        {/* Nothing is stamped around the page: the skip link, the preview
            notice, sign-in, checkout, analytics and ads are the site's own
            code (owner 2026-11-20); QA measures each outcome. */}
        {NativeInterior ? <NativeInterior route={route} content={content} config={pageConfig(renderConfig)} /> : null}
      </body>
    </html>
  );
}
