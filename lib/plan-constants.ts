// Free first (owner decision 2026-11-27): the site sells nothing, so the only
// figures here are the free card's. Paid plans, their prices and checkout
// links come back with the payments-on change — and when they do, the prices
// are made NEW on the payment platform, never revived from an archived one.
export const FREE_FEATURES = [
  "Entries and spins with no stated cap in your browser",
  "Elimination, accumulation and weighted modes",
  "Local save, URL-encoded share links, CSV import and export",
  "Themes, licensed sounds, fullscreen — no signup, no ads",
] as const;

export type PlanView = {
  id: string;
  tier: string;
  name: string;
  big: string;
  per?: string;
  strike?: string;
  sub?: string;
  note?: string;
  save?: string;
  quota: string;
};

export const PLAN_VIEWS: Record<"free", PlanView> = {
  free: {
    id: "free",
    tier: "free",
    name: "Free",
    big: "$0",
    quota: "no account, no card",
  },
};
