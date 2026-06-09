"use client";

// CTA.tsx — the install banner. Easter egg: the giant ghost phrases can be
// clicked dead, the way the product kills them. Kill both and the page
// acknowledges your service.
import { useState } from "react";
import { Ico } from "../icons";

export function CTA() {
  const [dead, setDead] = useState<Record<string, boolean>>({});
  const kill = (k: string) => setDead((d) => ({ ...d, [k]: true }));
  const allDead = dead.a && dead.b;

  return (
    <section className="section-tight" id="install">
      <div className="container">
        <div className="cta reveal">
          <button
            type="button"
            className={"cta-deco" + (dead.a ? " dead" : "")}
            style={{ top: 18, left: -10, fontSize: 70 }}
            onClick={() => kill("a")}
            tabIndex={-1}
            aria-hidden="true"
          >
            thrilled to announce
          </button>
          <button
            type="button"
            className={"cta-deco" + (dead.b ? " dead" : "")}
            style={{ bottom: 10, right: -20, fontSize: 70 }}
            onClick={() => kill("b")}
            tabIndex={-1}
            aria-hidden="true"
          >
            humbled &amp; honored
          </button>
          <span
            className="eyebrow"
            style={{ color: "rgba(255,255,255,.85)", position: "relative" }}
          >
            <Ico.check /> 30 free rewrites
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
            {allDead
              ? "Feels good, doesn’t it?"
              : "30 free rewrites · No subscription · Bring your own key if you’d rather"}
          </div>
        </div>
      </div>
    </section>
  );
}
