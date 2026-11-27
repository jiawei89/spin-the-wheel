import type { ComponentType } from "react";

import type { Route, SiteConfig } from "../../lib/site-config";

import type { PageContent } from "../../lib/content";

import HomePage from "./HomePage";
import ContactPage from "./ContactPage";
import PricingPage from "./PricingPage";
import PrivacyPage from "./PrivacyPage";
import RandomTeamGeneratorPage from "./RandomTeamGeneratorPage";
import RandomnessPage from "./RandomnessPage";
import TermsPage from "./TermsPage";
import WheelsHubPage from "./WheelsHubPage";
import { PresetChoresPage } from "./preset-pages";
import { PresetCoinPage } from "./preset-pages";
import { PresetCustomRangePage } from "./preset-pages";
import { PresetDicePage } from "./preset-pages";
import { PresetLettersPage } from "./preset-pages";
import { PresetNumbersPage } from "./preset-pages";
import { PresetNumbers20Page } from "./preset-pages";
import { PresetPrizeDrawPage } from "./preset-pages";
import { PresetTruthOrDarePage } from "./preset-pages";
import { PresetWeekdaysPage } from "./preset-pages";
import { PresetWhatToEatPage } from "./preset-pages";
import { PresetYesNoPage } from "./preset-pages";

// AUTO-COMPOSED by the per-route native authoring pass — entries are
// merged per route from each accepted patch; hand edits are overwritten.
// An unregistered route renders the deterministic composition.

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

