// The pricing contract (monetization/1.2), as numbers: every page, FAQ answer
// and checkout link quotes these figures from here, so the page can never
// drift from what the checkout charges. The Worker holds the same date as the
// INTRO_ENDS_AT var and enforces it server-side (backend/pay.mjs).
export const INTRO_ENDS_AT = "2026-12-18T23:59:59Z";

export const FREE_FEATURES = [
  "Entries and spins with no stated cap in your browser",
  "Elimination, accumulation and weighted modes",
  "Local save, URL-encoded share links, CSV import and export",
  "Themes, licensed sounds, fullscreen — no signup, no ads",
] as const;

export const PLUS_FEATURES = [
  "Everything in Free",
  "Sync up to 20 wheels across your devices",
  "Collect up to 100 participant results a month",
  "50 AI entry ideas a month",
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

export const PLAN_VIEWS: Record<"free" | "plusMonthly" | "plusAnnual", PlanView> = {
  free: {
    id: "free",
    tier: "free",
    name: "Free",
    big: "$0",
    quota: "no account, no card",
  },
  plusMonthly: {
    id: "plus-monthly",
    tier: "plus",
    name: "Plus",
    big: "$2.99",
    per: "/mo",
    strike: "$5",
    sub: "for your first month, then $5/mo",
    note: "New customers only · offer ends Dec 18, 2026",
    save: undefined,
    quota: "50 cloud generations a month",
  },
  plusAnnual: {
    id: "plus-annual",
    tier: "plus-annual",
    name: "Plus",
    big: "$4",
    per: "/mo",
    sub: "billed $48 yearly",
    save: "save 20%",
    quota: "50 cloud generations a month",
  },
};
