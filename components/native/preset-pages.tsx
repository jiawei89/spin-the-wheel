// The preset wheel family: one design, one page per preset wheel. Each page
// loads its wheel already filled with the preset's entries, ready to spin.
import { siteConfig } from "@/lib/site-config";
import { loadPageContent } from "@/lib/content-loader";
import { uiStringsFor } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { SectionStack } from "@/components/site/Sections";
import WheelSpinner from "@/components/native/WheelSpinner";
import { presetWheels, presetById } from "@/lib/datasets/preset-wheels";

function makePresetPage(id: string) {
  return async function PresetWheelPage() {
    const preset = presetById(id);
    if (!preset) throw new Error(`preset_missing:${id}`);
    const route =
      siteConfig.routes.find((r) => r.path === `/wheels/${id}/`) ?? siteConfig.routes[0];
    const content = await loadPageContent(route.contentKey, route);
    const t = uiStringsFor(siteConfig.language ?? "en");
    const siblings = presetWheels.filter((p) => p.id !== id);
    return (
      <PageDocument route={route} content={content}>
        <SiteHeader config={siteConfig} t={t} />
        <main className="page-main" id="main">
          <article>
            <p className="crumb">
              <a href="/wheels/">{t.presetHubCrumb}</a>
            </p>
            <h1>{preset.title} wheel</h1>
            <p className="lede">{preset.description}</p>
            <WheelSpinner t={t} presetId={id} />
            <SectionStack sections={content.sections ?? []} faq={content.faq} />
            <nav className="related-wheels" aria-label={t.relatedWheelsAria}>
              <h2>{t.relatedWheelsTitle}</h2>
              <ul className="related-list">
                {siblings.map((p) => (
                  <li key={p.id}>
                    <a href={`/wheels/${p.id}/`}>{p.title}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </article>
        </main>
        <SiteFooter config={siteConfig} t={t} />
      </PageDocument>
    );
  };
}

export const PresetYesNoPage = makePresetPage("yes-no");
export const PresetNumbersPage = makePresetPage("numbers-1-10");
export const PresetNumbers20Page = makePresetPage("numbers-1-20");
export const PresetCustomRangePage = makePresetPage("custom-range");
export const PresetDicePage = makePresetPage("dice-1-6");
export const PresetCoinPage = makePresetPage("coin-flip");
export const PresetLettersPage = makePresetPage("letters");
export const PresetTruthOrDarePage = makePresetPage("truth-or-dare");
export const PresetWhatToEatPage = makePresetPage("what-to-eat");
export const PresetWeekdaysPage = makePresetPage("weekdays");
export const PresetChoresPage = makePresetPage("chores");
export const PresetPrizeDrawPage = makePresetPage("prize-draw");
