import rawCards from "./share-images.json";

// The picture a shared link shows (og:image, twitter:image). Written by
// scripts/optimize-images.mjs before `next build`: the 1200x630 card it cut
// from the site's share image (lib/site-config.json ogImage), or, when the
// site has no raster picture at all, the card it drew of the site's own logo.
// The checked-in default is empty, so a build that skipped the prebuild step
// still compiles and shares the raster picture itself.
//
// Never an SVG: Facebook, X, LinkedIn and chat apps draw no card for one, and
// mashup-maker.com shared its SVG logo from every page (2026-11-25). The
// renderer falls back to the SVG logo itself only when no card was made.

export type ShareCard = { src: string; width?: number; height?: number };
export type ShareCards = Record<string, ShareCard & { sha?: string }>;

const cards = rawCards as ShareCards;
const RASTER = /\.(?:png|jpe?g|webp|gif)(?:[?#].*)?$/i;

/** The card for a picture in a given card list: its cut card, else the picture when it is a raster, else nothing. */
export function shareCardFrom(list: ShareCards, src: string | null | undefined): ShareCard | null {
  if (!src) return null;
  const card = list[src];
  if (card?.src && RASTER.test(card.src)) {
    return { src: card.src, ...(card.width ? { width: card.width } : {}), ...(card.height ? { height: card.height } : {}) };
  }
  return RASTER.test(src) ? { src } : null;
}

/** The card a page shares for a picture (the page's hero, the site's share image, its logo). */
export function shareCard(src: string | null | undefined): ShareCard | null {
  return shareCardFrom(cards, src);
}
