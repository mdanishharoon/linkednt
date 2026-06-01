import { Ico } from "../icons";
import { PHRASES } from "@/lib/content";

export function Phrasebook() {
  return (
    <section className="section" id="phrasebook">
      <div className="container">
        <div className="reveal" style={{ maxWidth: 640 }}>
          <span className="eyebrow muted">The phrasebook</span>
          <h2 className="h2" style={{ marginTop: 14 }}>
            Corporate to English, the short version.
          </h2>
          <p className="lede" style={{ marginTop: 16 }}>
            A few translations linkedn&rsquo;t makes in its sleep. There are
            roughly nine thousand more.
          </p>
        </div>
        <div className="pb reveal">
          {PHRASES.map(([said, meant], i) => (
            <div className="pb-row" key={i}>
              <div className="pb-said strike">{said}</div>
              <div className="pb-arrow">
                <Ico.arrow />
              </div>
              <div className="pb-meant">{meant}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
