"use client";

import { useState } from "react";
import { Ico } from "../icons";
import { FAQS } from "@/lib/content";

export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="section bg-feed" id="faq">
      <div className="container">
        <div
          className="reveal center"
          style={{ maxWidth: 620, margin: "0 auto" }}
        >
          <span className="eyebrow muted">The FAQ</span>
          <h2 className="h2" style={{ marginTop: 14 }}>
            Actual answers. No &ldquo;great question!&rdquo;
          </h2>
        </div>
        <div className="faq reveal">
          {FAQS.map(([q, a], i) => (
            <div className={"faq-item" + (open === i ? " open" : "")} key={i}>
              <button
                className="faq-q"
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                {q}
                <span className="chev">
                  <Ico.down />
                </span>
              </button>
              <div className="faq-a">
                <div>
                  <p>{a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
