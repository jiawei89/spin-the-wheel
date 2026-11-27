// The shared section stack: maps a page's approved sections in their array
// order. Shape follows each section's own fields (steps -> ordered list,
// items -> card grid, faq -> question list); the page around it is each
// page's own composition.
import { RichText } from "./RichText";

type Item = { title?: string; body?: string };
type Step = { title?: string; body?: string };
type Faq = { question: string; answer: string };
export type StackSection = {
  id?: string;
  title?: string;
  body?: string;
  items?: Item[];
  steps?: Step[];
};

export function FaqList({ faq }: { faq: Faq[] }) {
  return (
    <div className="faq-list">
      {faq.map((f) => (
        <details key={f.question}>
          <summary>{f.question}</summary>
          <div className="faq-a">
            <RichText text={f.answer} />
          </div>
        </details>
      ))}
    </div>
  );
}

export function SectionStack({ sections, faq, wideItems }: { sections: StackSection[]; faq?: Faq[]; wideItems?: string[] }) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.id ?? s.title} className="section" id={s.id}>
          {s.title ? <h2>{s.title}</h2> : null}
          {s.body ? <div className="section-body">
            <RichText text={s.body} />
          </div> : null}
          {s.steps ? (
            <ol className="steps-list">
              {s.steps.map((st, i) => (
                <li key={st.title ?? i}>
                  <span className="step-no" aria-hidden="true">
                    {i + 1}.
                  </span>
                  <div>
                    {st.title ? <h3>{st.title}</h3> : null}
                    {st.body ? <RichText text={st.body} /> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          {s.items && s.id !== "faq" ? (
            <div className={wideItems?.includes(s.id ?? "") ? "card-grid wide" : "card-grid"}>
              {s.items.map((it, i) => (
                <div className="card" key={it.title ?? i}>
                  {it.title ? <h3>{it.title}</h3> : null}
                  {it.body ? <RichText text={it.body} /> : null}
                </div>
              ))}
            </div>
          ) : null}
          {s.id === "faq" && faq && faq.length > 0 ? <FaqList faq={faq} /> : null}
        </section>
      ))}
    </>
  );
}
