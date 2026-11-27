import rawSiteConfig from "./site-config.json";

export type Route = {
  path: string;
  contentKey: string;
  title: string;
  description: string;
  index: boolean;
  canonical: string;
  navLabel: string;
  routeArchetype?: "home_tool" | "tool" | "article_guide" | "pricing" | "auth" | "account" | "billing" | "purchase_status" | "legal";
  coverageMode?: "direct_screen" | "inherited_template" | "redirect";
  representativeScreenId?: string | null;
  designIrHash?: string | null;
  publicExposure?: boolean;
  /** The page's last content change (YYYY-MM-DD), the sitemap's lastmod; absent until a change records one. */
  lastModified?: string;
};

/** One page of a secondary locale; its public URL is `/{code}{path}`.
 * - A translation: `path` is the primary route's own path (the page it
 *   pairs with), or the locale's own slug with `translates` naming that
 *   primary path ("/precios" translates "/pricing"). Pairs share one
 *   hreflang cluster.
 * - A locale-only page (`localeOnly: true`): a need this market has and the
 *   primary language does not. No hreflang pair, a self canonical, listed in
 *   the sitemap and in this locale's nav.
 * `sourceHash` is localeSourceHash of the primary page's content when this
 * page was last written from it; a different hash today marks it stale. */
export type LocaleRoute = {
  path: string;
  contentKey: string;
  title: string;
  description: string;
  index: boolean;
  navLabel: string;
  translates?: string;
  localeOnly?: boolean;
  sourceHash?: string;
  /** This page's last content change (YYYY-MM-DD), the sitemap's lastmod. */
  lastModified?: string;
};

/** A secondary language served under the `/{code}/` subpath. The primary
 * language keeps its unprefixed routes; `routes` here are the pages this
 * market has demand for, never a mirror of every primary page. */
export type SiteLocale = {
  code: string;
  label: string;
  ogLocale?: string;
  routes: LocaleRoute[];
};

export type VisualSystem = {
  // The design's own words for its structure and look; absent when it said nothing.
  layoutArchetype?: string;
  navigationModel?: string;
  heroComposition?: string;
  sectionSequence: string[];
  density?: string;
  radiusFamily?: string;
  buttonGeometry?: string;
  surfaceTreatment?: string;
  backgroundTexture?: string;
  dataDisplay?: string;
  motion: string;
  iconLanguage?: string;
  typeScale: number;
  headingWeight: number;
  headingCase: string;
  contentMeasure: number;
  maxWidth: number;
  colors: {
    background: string; surface: string; text: string; accent: string;
    secondary: string;
    gradient?: { angle: number; from: string; to: string };
    font: string; headingFont: string;
  };
  /** Default shaping variant per node type; a node's own variant wins. */
  variantDefaults?: Record<string, string>;
};

// The page this project composed. The renderer walks it; nothing here fixes
// what the tree may contain, so a new kind of page needs no template change.
export type LayoutNode = {
  type: string;
  variant?: string;
  source?: string;
  emphasis?: string;
  span?: number;
  sticky?: boolean;
  collapse?: string;
  mobilePresentation?: "cards" | "scroll" | "priority";
  capability?: string;
  label?: string;
  children?: LayoutNode[];
};

export type CompositionTree = { root: LayoutNode; rationale?: string };

export type AssetPlanEntry = {
  path: string;
  alt: string;
  role: "atmospheric-background" | "hero-subject" | "entity-icon" | "nav-icon" | "section-media" | "gallery-media" | "decorative-texture";
  route?: string | null;
  sectionId?: string | null;
  recordKey?: string | null;
};

/** An acceptance-first tool declaration: what the tool does (jtbd), its
 * declared inputs/output, and executable acceptance samples. Implemented by
 * bespoke "use client" components, never by a shared runner module. */
export type ToolSpec = {
  id: string;
  title: string;
  jtbd: string;
  inputs: {
    id: string;
    kind: "text" | "number" | "select" | "file";
    label: string;
    help?: string;
    placeholder?: string;
    required?: boolean;
    multiline?: boolean;
    options?: { value: string; label: string }[];
  }[];
  output: { label: string; description?: string };
  acceptance: {
    id: string;
    expectedState?: "success" | "error";
    setup?: { toolId: string; acceptanceId: string }[];
    given: Record<string, string>;
    expect: { kind: string; fields?: string[]; value?: string }[];
  }[];
  execution: "client" | "server";
  privacy: "in-browser" | "upload-ephemeral";
  privacyNote: string;
};

export type SiteConfig = {
  title: string;
  description: string;
  brandName: string;
  domain: string;
  language: string;
  /** Secondary languages under `/{code}/`; absent or [] renders the exact
   * single-language site with no alternate markup at all. */
  locales?: SiteLocale[];
  routes: Route[];
  nav: { label: string; href: string }[];
  /** Real parent → children dropdowns. Never a More dump. */
  navGroups?: { label: string; items: { label: string; href: string }[] }[];
  /** @deprecated Always empty. Leftovers belong in footerGroups. */
  navMore?: { label: string; href: string }[];
  /** @deprecated Never written since 2026-11-21: the platform's curated icon
   * sets are retired and the site draws its own icons. Kept optional so page
   * code an older build wrote against it still compiles and draws nothing. */
  navIcons?: Record<string, { d: string; filled: boolean }>;
  /** @deprecated As navIcons. */
  sectionIcons?: Record<string, { d: string; filled: boolean }>;
  design: {
    background: string;
    surface: string;
    text: string;
    accent: string;
    font: string;
  };
  visual: VisualSystem;
  composition?: CompositionTree;
  routeCompositions?: Record<string, CompositionTree>;
  qualityContractVersion?: "site-factory-v2.1@2.1.0" | null;
  /** Acceptance-first tool declarations. There is no platform runner for
   * these: native-authored components implement each spec's jtbd as
   * in-browser computation, and QA replays the acceptance samples against
   * the rendered tool. Absent on capability-era configs. */
  toolSpecs?: ToolSpec[];
  /** Pricing release authority, separate from required product capabilities. */
  publicSalesAllowed?: boolean;
  runtimeRequirements?: {
    requiresCapability: boolean;
    requiredCapabilityOperations: string[];
    requiresAuth: boolean;
    requiresBilling: boolean;
  };
  runtimeCapabilityTruth?: {
    executableCapabilityIds: string[];
    authE2E: boolean;
    billingE2E: boolean;
    /** WORKER_REQUIRED sites run the generated backend Worker and exchange the
     *  platform session against their own /api/auth/session; absent/STATIC_ONLY
     *  sites keep every runtime action (login, checkout) on the platform. */
    backendMode?: "STATIC_ONLY" | "WORKER_REQUIRED";
  };
  fontLinks?: string[];
  ogImage?: string | null;
  brandLogo?: string | null;
  assetPlan?: AssetPlanEntry[];
  footerGroups?: { title: string; links: { label: string; href: string }[] }[];
  footerNote?: string | null;
  /** The site's own domain mailbox (hello@domain), set at build once it is live; null before launch. */
  contactEmail?: string | null;
};

export const siteConfig = rawSiteConfig as unknown as SiteConfig;

// Route paths are compared after normalization. The catch-all segment array
// never carries a trailing slash, while route contracts frequently do
// ("/how-to-redeem/"), so a raw equality check silently 404s every inner page.
export function normalizeRoutePath(path: string): string {
  const trimmed = (path || "/").trim();
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeading.replace(/\/+$/, "");
  return withoutTrailing || "/";
}

export function findRoute(path: string): Route | undefined {
  const target = normalizeRoutePath(path);
  return siteConfig.routes.find((route) => normalizeRoutePath(route.path) === target);
}

export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the contract domain when the build-time override is invalid.
    }
  }
  return `https://${siteConfig.domain}`;
}

/** Preview workers.dev builds must never look indexable. Production is the
 *  workflow's explicit NEXT_PUBLIC_BUILD_ENV=production compile, not a
 *  contract-domain heuristic. */
export function isPreviewDeployment(): boolean {
  return process.env.NEXT_PUBLIC_BUILD_ENV !== "production";
}

export function absoluteSiteUrl(path: string): string {
  let pathname = path || "/";
  try {
    pathname = new URL(path).pathname;
  } catch {
    if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  }
  return new URL(pathname, `${siteOrigin()}/`).toString();
}

// ---------------------------------------------------------------------------
// Locales. Every helper below returns its empty value when the config carries
// no locales, so a single-language site renders byte-identical markup.

export function siteLocales(): SiteLocale[] {
  return siteConfig.locales ?? [];
}

/** Public URL path of a locale page, in the exported trailing-slash spelling
 * the engine normalizes canonicals to ("/es/", "/es/pricing/"). */
export function localePublicPath(code: string, basePath: string): string {
  const base = normalizeRoutePath(basePath);
  return base === "/" ? `/${code}/` : `/${code}${base}/`;
}

/** Split a public URL path into the locale owning it (when its first segment
 * names a configured locale) and the primary-route-relative remainder. */
export function splitLocalePath(path: string): { locale: SiteLocale | null; basePath: string } {
  const segments = normalizeRoutePath(path).split("/").filter(Boolean);
  const locale = segments.length ? siteLocales().find((entry) => entry.code === segments[0]) ?? null : null;
  if (!locale) return { locale: null, basePath: normalizeRoutePath(path) };
  return { locale, basePath: normalizeRoutePath(`/${segments.slice(1).join("/")}`) };
}

/** The primary path a locale page pairs with, or null for a locale-only page. */
export function localeRoutePair(route: LocaleRoute): string | null {
  return route.localeOnly ? null : normalizeRoutePath(route.translates ?? route.path);
}

/** The locale's page that pairs with a primary path, if it has one. */
function pairedLocaleRoute(locale: SiteLocale, primaryPath: string): LocaleRoute | undefined {
  return locale.routes.find((route) => localeRoutePair(route) === primaryPath);
}

/** The primary path a public path belongs to: itself on a primary page, the
 * pair of a locale page, null on a locale-only page or an unknown path. */
function primaryPathOf(path: string): string | null {
  const { locale, basePath } = splitLocalePath(path);
  if (!locale) return findRoute(basePath) ? basePath : null;
  const own = locale.routes.find((route) => normalizeRoutePath(route.path) === basePath);
  const pair = own ? localeRoutePair(own) : null;
  return pair && findRoute(pair) ? pair : null;
}

export type ResolvedRoute = { route: Route; locale: SiteLocale | null };

/** Resolve a public URL path to a renderable route: primary routes as-is,
 * locale routes materialized with their public `/{code}/...` path. */
export function resolveRoute(path: string): ResolvedRoute | null {
  const { locale, basePath } = splitLocalePath(path);
  if (!locale) {
    const route = findRoute(path);
    return route ? { route, locale: null } : null;
  }
  const localeRoute = locale.routes.find((route) => normalizeRoutePath(route.path) === basePath);
  if (!localeRoute) return null;
  const publicPath = localePublicPath(locale.code, basePath);
  return {
    locale,
    route: {
      path: publicPath,
      contentKey: localeRoute.contentKey,
      title: localeRoute.title,
      description: localeRoute.description,
      index: localeRoute.index,
      canonical: publicPath,
      navLabel: localeRoute.navLabel,
    },
  };
}

export type HreflangAlternate = { hrefLang: string; href: string };

/** The bidirectional hreflang cluster for a public path: the primary page,
 * every locale that translated it, and x-default on the primary. Empty for
 * single-language sites, for pages no locale translated and for locale-only
 * pages, so those pages emit no alternate markup at all. */
export function hreflangAlternates(path: string): HreflangAlternate[] {
  const locales = siteLocales();
  if (!locales.length) return [];
  const primaryPath = primaryPathOf(path);
  const primary = primaryPath ? findRoute(primaryPath) : undefined;
  // A noindex page joins no cluster, on either side.
  if (!primaryPath || !primary || primary.index === false) return [];
  const { locale: own, basePath } = splitLocalePath(path);
  if (own && own.routes.find((route) => normalizeRoutePath(route.path) === basePath)?.index === false) return [];
  const translated = locales.flatMap((entry) => {
    const route = pairedLocaleRoute(entry, primaryPath);
    return route && route.index !== false ? [{ code: entry.code, path: route.path }] : [];
  });
  if (!translated.length) return [];
  const primaryHref = absoluteSiteUrl(primary.canonical || primary.path);
  return [
    { hrefLang: siteConfig.language || "en", href: primaryHref },
    ...translated.map((entry) => ({ hrefLang: entry.code, href: absoluteSiteUrl(localePublicPath(entry.code, entry.path)) })),
    { hrefLang: "x-default", href: primaryHref },
  ];
}

// A locale chosen for one market names its own og:locale (pt_BR for Brazil) in
// lib/site-config.json; this map is the fallback, unchanged for primary pages.
const OG_LOCALE_BY_LANGUAGE: Record<string, string> = { en: "en_US", zh: "zh_CN", es: "es_ES", ja: "ja_JP", de: "de_DE", pt: "pt_PT" };

/** og:locale for a language code; an explicit contract override wins. */
export function ogLocaleFor(code: string, override?: string): string {
  if (override) return override;
  const language = code.trim().toLowerCase().split(/[-_]/)[0] || "en";
  return OG_LOCALE_BY_LANGUAGE[language] ?? `${language}_${language.toUpperCase()}`;
}

const LANGUAGE_LABELS: Record<string, string> = { en: "English", zh: "中文", es: "Español", ja: "日本語", de: "Deutsch", pt: "Português" };

/** Self-named label for the primary language (locales carry their own). */
export function languageLabel(code: string): string {
  const language = code.trim().toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_LABELS[language] ?? code.toUpperCase();
}

export type LocaleSwitchLink = { code: string; label: string; href: string; current: boolean };

/** Footer language switcher: each language links the current page's own
 * translation when one exists and that language's homepage when it does not.
 * Empty on single-language sites so nothing renders. */
export function languageSwitcherLinks(path: string): LocaleSwitchLink[] {
  const locales = siteLocales();
  if (!locales.length) return [];
  const { locale: current, basePath } = splitLocalePath(path);
  const primaryPath = primaryPathOf(path);
  const primary = primaryPath ? findRoute(primaryPath) : undefined;
  const primaryCode = siteConfig.language || "en";
  return [
    { code: primaryCode, label: languageLabel(primaryCode), href: primary ? (primary.canonical || primary.path) : "/", current: !current },
    ...locales.map((entry) => {
      const isCurrent = current?.code === entry.code;
      const paired = primaryPath ? pairedLocaleRoute(entry, primaryPath) : undefined;
      return {
        code: entry.code,
        label: entry.label || languageLabel(entry.code),
        // The current locale links the page itself, a locale-only page included.
        href: isCurrent ? localePublicPath(entry.code, basePath) : localePublicPath(entry.code, paired ? paired.path : "/"),
        current: isCurrent,
      };
    }),
  ];
}

/** Project a nav list into a locale: items whose target the locale
 * translated link that translation under the locale's own navLabel; items
 * without a translation keep their primary href and label. */
function projectNav(
  locale: SiteLocale,
  items: readonly { label: string; href: string }[],
): { label: string; href: string }[] {
  return items.map((item) => {
    if (!item.href.startsWith("/")) return item;
    const translated = pairedLocaleRoute(locale, normalizeRoutePath(item.href));
    return translated ? { label: translated.navLabel || item.label, href: localePublicPath(locale.code, translated.path) } : item;
  });
}

/** The locale's top nav: the primary nav projected into it, then the
 * locale's own pages (those without a primary counterpart) under their
 * navLabel, so a page only this market needs is reachable. */
export function localeNav(locale: SiteLocale): { label: string; href: string }[] {
  const projected = projectNav(locale, siteConfig.nav);
  const own = locale.routes
    .filter((route) => route.localeOnly && route.index !== false && route.navLabel?.trim() && normalizeRoutePath(route.path) !== "/")
    .map((route) => ({ label: route.navLabel, href: localePublicPath(locale.code, route.path) }))
    .filter((item) => !projected.some((entry) => entry.href === item.href));
  return own.length ? [...projected, ...own] : projected;
}

export function localeNavGroups(locale: SiteLocale): { label: string; items: { label: string; href: string }[] }[] {
  return (siteConfig.navGroups ?? []).map((group) => ({
    label: group.label,
    items: projectNav(locale, group.items),
  }));
}

export function localeNavMore(locale: SiteLocale): { label: string; href: string }[] {
  return projectNav(locale, siteConfig.navMore ?? []);
}
