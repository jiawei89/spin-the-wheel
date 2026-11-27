import type { ReactNode } from "react";
import { Atkinson_Hyperlegible, Fredoka } from "next/font/google";
import { absoluteSiteUrl, isPreviewDeployment, type Route, siteConfig } from "@/lib/site-config";
import type { PageContent } from "@/lib/content";
import { shareCard } from "@/lib/share-card";
import { uiStringsFor } from "@/lib/ui-strings";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

const EXAMPLE_ORIGIN = "https://site.example/";

/** The approved schema's placeholder origin becomes this site's own. */
function rewriteSchemaUrls(value: unknown): unknown {
  if (typeof value === "string") {
    return value.startsWith(EXAMPLE_ORIGIN) ? absoluteSiteUrl("/") + value.slice(EXAMPLE_ORIGIN.length) : value;
  }
  if (Array.isArray(value)) return value.map(rewriteSchemaUrls);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewriteSchemaUrls(v)]));
  }
  return value;
}

/**
 * The shared document shell: one head (canonical, SERP fields, og card,
 * JSON-LD, preview noindex), the self-hosted fonts, the preview notice and
 * the skip link. Every page renders its chrome and main inside it.
 */
export default function PageDocument({
  route,
  content,
  children,
}: {
  route: Route;
  content: PageContent;
  children: ReactNode;
}) {
  const t = uiStringsFor(siteConfig.language || "en");
  const preview = isPreviewDeployment();
  const canonicalPath = siteConfig.routes.find((r) => r.path === route.path)?.canonical ?? route.path;
  const canonical = absoluteSiteUrl(canonicalPath);
  const title = content.title ?? route.title;
  const description = content.description ?? route.description;
  const ogCard = shareCard(content.hero?.src) ?? shareCard(siteConfig.ogImage) ?? shareCard(siteConfig.brandLogo);
  const ogImage = ogCard?.src ?? siteConfig.brandLogo ?? null;
  const jsonLd = content.schema ? JSON.stringify(rewriteSchemaUrls(content.schema)) : null;

  return (
    <html lang={siteConfig.language || "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#14231c" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta
          name="robots"
          content={preview ? "noindex, nofollow" : route.index ? "index, follow" : "noindex, follow"}
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {ogImage ? <meta property="og:image" content={absoluteSiteUrl(ogImage)} /> : null}
        <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
        {ogImage ? <meta name="twitter:image" content={absoluteSiteUrl(ogImage)} /> : null}
        {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}
      </head>
      <body className={`${fredoka.variable} ${atkinson.variable}`}>
        {preview ? (
          <p className="preview-note" data-shipsite-preview role="note">
            {t.previewNotice}
          </p>
        ) : null}
        <a className="skip-link" href="#main">
          {t.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
