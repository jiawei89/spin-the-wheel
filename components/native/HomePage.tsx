import { Fragment } from "react";
import { siteConfig } from "@/lib/site-config";
import { loadPageContent } from "@/lib/content-loader";
import { uiStringsFor, splitLede, formatMessage, type UiStrings } from "@/lib/ui-strings";
import PageDocument from "@/components/site/PageDocument";
import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { RichText } from "@/components/site/RichText";
import WheelSpinner from "@/components/native/WheelSpinner";
import { parseEntries, buildSegments, segmentPath, labelFor, THEMES, SAMPLE_ENTRIES } from "@/lib/wheel-engine";
import { presetWheels } from "@/lib/datasets/preset-wheels";
import { FairnessFigure } from "@/components/native/FairnessFigure";
import FairnessAudit from "@/components/native/FairnessAudit";
import TeamSplitter from "@/components/native/TeamSplitter";
import ContactForm from "@/components/native/ContactForm";

function WheelFigure({ t }: { t: UiStrings }) {
  const segs = buildSegments(parseEntries(SAMPLE_ENTRIES.join("\n")), THEMES[0].colors);
  return (
    <figure className="wheel-figure">
      <svg viewBox="0 0 400 400" role="img" aria-label={t.wheelFigureAria}>
        <g>
          {segs.map((seg) => (
            <path key={seg.index} d={segmentPath(seg)} fill={seg.fill} stroke="#14231c" strokeWidth="1.5" />
          ))}
          {segs.map((seg) => {
            const l = labelFor(seg);
            if (l.hidden) return null;
            return (
              <text
                key={`t${seg.index}`}
                x={l.x}
                y={l.y}
                fill={seg.textFill} style={{ color: seg.textFill }}
                fontSize={l.size}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${l.rotate} ${l.x} ${l.y})`}
              >
                {l.text}
              </text>
            );
          })}
        </g>
        <circle cx="200" cy="200" r="26" fill="var(--hub)" stroke="#14231c" strokeWidth="2" />
      </svg>
      <figcaption>{t.wheelFigureCaption}</figcaption>
    </figure>
  );
}

/** The preset wheels as data: the same twelve records the tool's menu loads. */
function PresetTable({ t }: { t: UiStrings }) {
  return (
    <figure className="preset-table-fig">
      <table className="preset-table">
        <caption>{t.presetsTableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.presetsColPreset}</th>
            <th scope="col">{t.presetsColLoads}</th>
            <th scope="col">{t.presetsColFor}</th>
          </tr>
        </thead>
        <tbody>
          {presetWheels.map((p) => {
            const loads =
              p.id === "custom-range"
                ? p.description.replace(/\.$/, "")
                : p.entries.length > 8
                  ? `${p.entries[0]}–${p.entries[p.entries.length - 1]} — ${p.entries.length} segments`
                  : p.entries.join(", ");
            return (
              <tr key={p.id}>
                <th scope="row"><a href={`/wheels/${p.id}/`}>{p.title}</a></th>
                <td data-label={t.presetsColLoads}>{loads}</td>
                <td data-label={t.presetsColFor}>{p.useCase}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}

/** The home's other instruments, one compact band apiece: the fairness audit
 *  runs here, the team splitter splits here, and the contact form sends here.
 *  Each is the page's own tool, mounted with ownsState={false} so the wheel
 *  stays the owner of the document state machine. */
function FairnessBand({ t }: { t: UiStrings }) {
  return (
    <div className="band">
      <h2>{t.fairnessTryTitle}</h2>
      <p className="section-lede">{t.fairnessTryLede}</p>
      <FairnessAudit t={t} ownsState={false} />
      <p className="band-more">
        <a className="quiet-link" href="/randomness/">
          {t.fairnessTryLink}
        </a>
      </p>
    </div>
  );
}

function TeamBand({ t }: { t: UiStrings }) {
  return (
    <div className="band">
      <h2>{t.teamBandTitle}</h2>
      <p className="section-lede">{t.teamBandLede}</p>
      <TeamSplitter t={t} ownsState={false} />
      <p className="band-more">
        <a className="quiet-link" href="/random-team-generator/">
          {t.teamBandLink}
        </a>
      </p>
    </div>
  );
}

function ContactBand({ t }: { t: UiStrings }) {
  return (
    <div className="band">
      <h2>{t.contactBandTitle}</h2>
      <p className="section-lede">{t.contactBandLede}</p>
      <ContactForm t={t} ownsState={false} />
    </div>
  );
}

export default async function HomePage() {
  const route = siteConfig.routes.find((r) => r.path === "/") ?? siteConfig.routes[0];
  const content = await loadPageContent(route.contentKey, route);
  const t = uiStringsFor(siteConfig.language || "en");
  const secondaryCta = content.ctas.find((c) => !c.primary) ?? content.ctas[1];
  const faqSection = content.sections.find((s) => s.id === "faq");
  const [ledeFirst, ledeRest] = splitLede(content.heroText);

  return (
    <PageDocument route={route} content={content}>
      <SiteHeader config={siteConfig} t={t} />
      <main id="main" className="page-main">
        <div className="headline">
          <h1>{content.h1}</h1>
          <p className="lede">{ledeFirst}</p>
          {secondaryCta ? (
            <div className="cta-row">
              <a className="quiet-link" href={secondaryCta.href}>
                {secondaryCta.label}
              </a>
            </div>
          ) : null}
        </div>

        <WheelSpinner t={t} />

        {ledeRest ? <p className="afterstage">{ledeRest}</p> : null}

        {content.sections.map((section) => {
          if (section.id === "faq") {
            return (
              <section className="section" id="faq" key="faq">
                <h2>{section.title}</h2>
                <div className="section-body">
                  <RichText text={section.body} />
                </div>
                <div className="faq-list">
                  {(content.faq ?? []).map((f) => (
                    <details key={f.question}>
                      <summary>{f.question}</summary>
                      <div className="faq-a">
                        <RichText text={f.answer} />
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            );
          }
          if (section.id === "how-it-works" && section.steps?.length) {
            return (
              <section className="section" id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                <div className="section-body">
                  <RichText text={section.body} />
                </div>
                <ol className="steps-list">
                  {section.steps.map((step, i) => (
                    <li key={step.title}>
                      <span className="step-no" aria-hidden="true">
                        {i + 1}.
                      </span>
                      <div>
                        <h3>{step.title}</h3>
                        <RichText text={step.body} />
                      </div>
                    </li>
                  ))}
                </ol>
                <WheelFigure t={t} />
              </section>
            );
          }
          if (section.items?.length && (section.id === "use-cases" || section.id === "features")) {
            const features = section.id === "features";
            return (
              <section className="section" id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                <div className="section-body">
                  <RichText text={section.body} />
                </div>
                <div className={features ? "feature-list" : "card-grid"}>
                  {section.items.map((item) => (
                    <div className={features ? undefined : "card"} key={item.title}>
                      <h3>{item.title}</h3>
                      <RichText text={item.body} />
                    </div>
                  ))}
                </div>
                {features ? <FairnessFigure t={t} /> : <PresetTable t={t} />}
                {features ? <FairnessBand t={t} /> : null}
                {!features ? <TeamBand t={t} /> : null}
              </section>
            );
          }
          return (
            <Fragment key={section.id}>
              <section className="section" id={section.id}>
                <div className="free-line">
                  <h2>{section.title}</h2>
                  <RichText text={section.body} />
                </div>
              </section>
            </Fragment>
          );
        })}

        <ContactBand t={t} />

        {faqSection && !content.sections.some((s) => s.id === "faq") ? (
          <section className="section" id="faq">
            <h2>{faqSection.title}</h2>
          </section>
        ) : null}
      </main>
      <SiteFooter config={siteConfig} t={t} />
    </PageDocument>
  );
}
