import { Ico } from "../icons";

export function CTA() {
  return (
    <section className="section-tight" id="install">
      <div className="container">
        <div className="cta reveal">
          <div
            className="cta-deco"
            style={{ top: 18, left: -10, fontSize: 70 }}
          >
            thrilled to announce
          </div>
          <div
            className="cta-deco"
            style={{ bottom: 10, right: -20, fontSize: 70 }}
          >
            humbled &amp; honored
          </div>
          <span
            className="eyebrow"
            style={{ color: "rgba(255,255,255,.85)", position: "relative" }}
          >
            <Ico.check /> Free forever
          </span>
          <h2 className="h2" style={{ marginTop: 16, position: "relative" }}>
            Stop reading
            <br />
            between the lines.
          </h2>
          <p className="cta-sub" style={{ position: "relative" }}>
            Add linkedn&rsquo;t to Chrome and let the feed finally say what it
            means.
          </p>
          <a
            className="btn btn-onblue btn-lg"
            href="#"
            style={{ position: "relative" }}
          >
            <Ico.puzzle /> Add to Chrome &mdash; it&rsquo;s free
          </a>
          <div
            style={{
              marginTop: 20,
              fontSize: 13.5,
              color: "rgba(255,255,255,.7)",
              position: "relative",
            }}
          >
            No account · Works offline · 4.9&#9733; from 2,180 reviews
          </div>
        </div>
      </div>
    </section>
  );
}
