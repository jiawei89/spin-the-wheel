// The published fairness audit: one recorded 100,000-spin run of the starter
// wheel, computed by the site's own engine (see the method field; regenerate
// with scripts under .cache against lib/wheel-engine.ts pickIndex).
// Import this module, not the JSON.
import raw from "./fairness-audit.json";

export type FairnessAudit = {
  collection: string;
  observedAt: string;
  method: string;
  spins: number;
  entries: string[];
  counts: number[];
  expectedSharePct: number;
  observedSharePct: number[];
  maxDeviationPct: number;
};

export const fairnessAudit = raw as unknown as FairnessAudit;
export default fairnessAudit;
