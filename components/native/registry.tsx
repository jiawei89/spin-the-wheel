import type { ComponentType } from "react";

import type { Route, SiteConfig } from "../../lib/site-config";

import type { PageContent } from "../../lib/content";

import HomePage from "./HomePage";
import ContactPage from "./ContactPage";
import PricingPage from "./PricingPage";
import PrivacyPage from "./PrivacyPage";
import RandomTeamGeneratorPage from "./RandomTeamGeneratorPage";
import TermsPage from "./TermsPage";
import WheelsHubPage from "./WheelsHubPage";
import RandomnessPage from "./RandomnessPage";
import {
  PresetChoresPage,
  PresetCoinPage,
  PresetCustomRangePage,
  PresetDicePage,
  PresetLettersPage,
  PresetNumbersPage,
  PresetNumbers20Page,
  PresetPrizeDrawPage,
  PresetTruthOrDarePage,
  PresetWeekdaysPage,
  PresetWhatToEatPage,
  PresetYesNoPage,
} from "./preset-pages";

// AUTO-COMPOSED by the per-route native authoring pass — entries are
// merged per route from each accepted patch; hand edits are overwritten.
// An unregistered route renders the deterministic composition.
// Hand-added below (owner P23: the post-launch preset family folds into this
// launch): /wheels/ hub, /wheels/{slug}/ instances and /randomness/ — the
// parity rows T7/T11/T12/S3 name them, register_route's plan gate does not
// carry them yet. Sorted like the tool keeps them.

export type NativeRouteProps = {
  route: Route;
  content: PageContent;
  config: SiteConfig;
};

export const nativeRoutes: Record<string, ComponentType<NativeRouteProps>> = {
  "/": HomePage,
  "/contact/": ContactPage,
  "/pricing/": PricingPage,
  "/privacy/": PrivacyPage,
  "/random-team-generator/": RandomTeamGeneratorPage,
  "/randomness/": RandomnessPage,
  "/terms/": TermsPage,
  "/wheels/": WheelsHubPage,
  "/wheels/chores/": PresetChoresPage,
  "/wheels/coin-flip/": PresetCoinPage,
  "/wheels/custom-range/": PresetCustomRangePage,
  "/wheels/dice-1-6/": PresetDicePage,
  "/wheels/letters/": PresetLettersPage,
  "/wheels/numbers-1-10/": PresetNumbersPage,
  "/wheels/numbers-1-20/": PresetNumbers20Page,
  "/wheels/prize-draw/": PresetPrizeDrawPage,
  "/wheels/truth-or-dare/": PresetTruthOrDarePage,
  "/wheels/weekdays/": PresetWeekdaysPage,
  "/wheels/what-to-eat/": PresetWhatToEatPage,
  "/wheels/yes-no/": PresetYesNoPage,
};

