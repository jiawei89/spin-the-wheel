// A legal page's article body: h1, lede, the approved sections in order,
// then the way back into the tool. Privacy and terms share this article
// shape; every other page is its own composition.
import type { UiStrings } from "@/lib/ui-strings";
import type { PageContent } from "@/lib/content";
import { SectionStack } from "@/components/site/Sections";

export function LegalArticle({ content, t }: { content: PageContent; t: UiStrings }) {
  return (
    <article className="article">
      <h1>{content.h1}</h1>
      <p className="lede">{content.heroText}</p>
      <SectionStack sections={content.sections ?? []} faq={content.faq} />
      <div className="article-end">
        <a className="quiet-link" href="/">
          {t.openTheWheel}
        </a>
      </div>
    </article>
  );
}
