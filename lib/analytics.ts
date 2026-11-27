// One reporting helper for the whole site: window array, the analytics
// platforms the layout loaded (production only), and the site's own event
// route. Never reports what the visitor typed or uploaded.

type EventProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    __shipsiteEvents?: { name: string; path: string; at: string }[];
    gtag?: (...args: unknown[]) => void;
    plausible?: (name: string, options?: { props?: EventProps }) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function track(name: string, props?: EventProps): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  const at = new Date().toISOString();
  window.__shipsiteEvents = window.__shipsiteEvents ?? [];
  window.__shipsiteEvents.push({ name, path, at });

  try {
    if (typeof window.gtag === "function") window.gtag("event", name, props ?? {});
    if (typeof window.plausible === "function") window.plausible(name, { props });
    if (typeof window.clarity === "function") {
      window.clarity("event", name);
      window.clarity("set", "funnel_step", name);
    }
  } catch {
    /* analytics platforms are best-effort */
  }

  try {
    const body = JSON.stringify({ name, path, props: props ?? {} });
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/_site/events", blob);
  } catch {
    /* the event route is best-effort; the page works without it */
  }
}

/** page_view once per path per session-tab, with entrance when from outside. */
export function trackPageView(): void {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { __stwPageViewDone?: string };
  if (w.__stwPageViewDone === window.location.pathname) return;
  w.__stwPageViewDone = window.location.pathname;
  let entrance = true;
  try {
    if (document.referrer) entrance = new URL(document.referrer).host !== window.location.host;
  } catch {
    entrance = true;
  }
  track("page_view", { entrance });
}
